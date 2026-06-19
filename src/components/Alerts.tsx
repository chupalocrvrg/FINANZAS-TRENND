import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  ShieldAlert, 
  ChevronRight,
  MessageCircle,
  Loader2,
  CheckCircle,
  Trash2,
  XCircle,
  Search,
  Wallet as WalletIcon,
  CreditCard
} from 'lucide-react';
import { NoticeShareModal } from './NoticeShareModal';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, increment } from 'firebase/firestore';
import { SYSTEM_UPDATES } from '../data/updates';

interface RealAlertItem {
  id: string;
  type: 'expiration' | 'receivable' | 'scheduled_payment';
  customer: string;
  item: string;
  amount?: number;
  date?: string;
  status: 'expired' | 'past-due' | 'expiring-soon';
  contact: string;
  rawRef: any;
}

export function Alerts() {
  const { user, settings } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'expiration' | 'receivable' | 'scheduled_payment'>('all');
  const [alerts, setAlerts] = useState<RealAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<any[]>([]);
  const [settleLedgerItem, setSettleLedgerItem] = useState<RealAlertItem | null>(null);
  const [settleSourceWalletId, setSettleSourceWalletId] = useState('');
  const [settleSubmitting, setSettleSubmitting] = useState(false);
  const [noticeShareData, setNoticeShareData] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('search') || '';
  });
  const isDark = settings?.theme === 'dark';

  useEffect(() => {
    const handleFilter = (e: any) => {
      if (e.detail?.search !== undefined) {
        setSearchTerm(e.detail.search);
      }
    };
    window.addEventListener('app-alerts-filter', handleFilter);
    return () => {
      window.removeEventListener('app-alerts-filter', handleFilter);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    let unsubTxs = () => {};
    let unsubServices = () => {};
    let unsubEntities = () => {};
    let unsubWallets = () => {};
    let unsubLedger = () => {};

    let entitiesMap: Record<string, string> = {};

    // 1. Obtener teléfonos de intermediarios / clientes
    const qEnt = query(collection(db, 'entities'), where('ownerId', '==', user.uid));
    unsubEntities = onSnapshot(qEnt, (snap) => {
      snap.forEach(doc => {
        const entData = doc.data();
        if (entData.name) {
          entitiesMap[doc.id] = entData.contact || '';
          entitiesMap[entData.name.toLowerCase().trim()] = entData.contact || '';
        }
      });
    });

    // 2. Obtener lista de billeteras para la vista de saldos
    const qWallets = query(collection(db, 'wallets'), where('ownerId', '==', user.uid));
    unsubWallets = onSnapshot(qWallets, (snap) => {
      setWallets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const triggerSync = () => {
      // 3. Suscribirse a Transacciones Impagas (Cuentas por cobrar)
      const qTxs = query(collection(db, 'transactions'), where('ownerId', '==', user.uid), where('isPaid', '==', false));
      unsubTxs = onSnapshot(qTxs, (txSnap) => {
        const txAlerts = txSnap.docs.map(d => {
          const tx = d.data();
          const intermediaryId = tx.intermediaryId || '';
          const intermediaryName = tx.intermediaryName || '';
          const contactPhone = entitiesMap[intermediaryId] || entitiesMap[intermediaryName.toLowerCase().trim()] || '';
          
          return {
            id: d.id,
            type: 'receivable' as const,
            customer: intermediaryName || tx.finalClientName || 'Intermediario',
            item: `ANT: ${tx.finalClientName || 'Cliente Final'} (${tx.warehouse || 'Generico'})`,
            amount: tx.chargedRate || 0,
            date: tx.billingDate || tx.createdAt?.substring(0, 10) || '',
            status: 'past-due' as const,
            contact: contactPhone,
            rawRef: tx
          };
        });

        // 4. Suscribirse a Servicios Digitales expirando o expirados
        const qSer = query(collection(db, 'digital_services'), where('ownerId', '==', user.uid));
        unsubServices = onSnapshot(qSer, (serSnap) => {
          const rawServices = serSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          
          const now = new Date();
          const serAlerts = rawServices.filter(ser => {
            if (ser.deletedFromModule) return false;
            if (ser.status === 'expired') return true;
            if (!ser.expirationDate) return false;
            
            const expiry = new Date(ser.expirationDate);
            const diffTime = expiry.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return diffDays <= 3; // Expira pronto o ya expiró
          }).map(ser => {
            const expDate = new Date(ser.expirationDate);
            const isOverdu = expDate < now || ser.status === 'expired';
            
            const extraDetail = ser.email || ser.profileName || ser.category || '';
            const itemLabel = `${ser.name} (${extraDetail})`;
            
            return {
              id: ser.id,
              type: 'expiration' as const,
              customer: ser.clientName || 'Cliente Digital',
              item: itemLabel,
              amount: ser.revenue || 0,
              date: ser.expirationDate,
              status: isOverdu ? ('expired' as const) : ('expiring-soon' as const),
              contact: ser.clientContact || '',
              rawRef: ser
            };
          });

          // 5. Suscribirse a egresos programados pendientes de pago
          const qLedger = query(collection(db, 'ledger'), where('ownerId', '==', user.uid), where('isPending', '==', true));
          unsubLedger = onSnapshot(qLedger, (ledgerSnap) => {
            const todayStr = new Date().toISOString().substring(0, 10);
            
            const ledgerAlerts = ledgerSnap.docs.map(d => {
              const leg = d.data();
              // Determina si está vencido/por pagar (hoy o fecha pasada)
              const legDueDate = leg.dueDate || '';
              const isExpired = legDueDate && legDueDate <= todayStr;
              
              return {
                id: d.id,
                type: 'scheduled_payment' as const,
                customer: leg.category || 'Gasto Programado',
                item: leg.description || 'Sin concepto detallado',
                amount: Math.abs(leg.amount) || 0,
                date: leg.dueDate || '',
                status: isExpired ? ('expired' as const) : ('expiring-soon' as const),
                contact: '',
                rawRef: { id: d.id, ...leg }
              };
            });

            // Combinar alertas y setear el estado de alertas
            const combined = [...txAlerts, ...serAlerts, ...ledgerAlerts].sort((a, b) => {
              if (a.status === 'expired' && b.status !== 'expired') return -1;
              if (a.status !== 'expired' && b.status === 'expired') return 1;
              return (b.amount || 0) - (a.amount || 0);
            });

            setAlerts(combined);
            setLoading(false);
          });
        });
      });
    };

    // Dar una ligera espera para que se pueble el entitiesMap
    const timer = setTimeout(triggerSync, 300);

    return () => {
      clearTimeout(timer);
      unsubTxs();
      unsubServices();
      unsubEntities();
      unsubWallets();
      unsubLedger();
    };
  }, [user]);

  // Acción: Marcar una Transacción impaga como Cobrada (PVP ingresado)
  const handleMarkAsPaid = async (alertItem: RealAlertItem) => {
    try {
      const txDocRef = doc(db, 'transactions', alertItem.id);
      await updateDoc(txDocRef, {
        isPaid: true,
        updatedAt: new Date().toISOString()
      });
      // Opcionalmente podemos sugerir crear una entrada en ledger automática,
      // pero actualizando isPaid = true la transacción desaparece de las alertas del usuario
    } catch (err) {
      console.error("Error al marcar como pagada:", err);
      alert("Error al actualizar la transacción.");
    }
  };

  // Acción: Eliminar servicio digital de forma definitiva por no renovación o fin de suscripción
  const handleCancelService = async (alertItem: RealAlertItem) => {
    try {
      const s = alertItem.rawRef;
      if (s && (s.isPaid === false || s.isCostPaid === false)) {
        await updateDoc(doc(db, 'digital_services', alertItem.id), {
          deletedFromModule: true,
          updatedAt: new Date().toISOString()
        });
      } else {
        await deleteDoc(doc(db, 'digital_services', alertItem.id));
      }
    } catch (err) {
      console.error("Error al eliminar servicio:", err);
      alert("No se pudo dar de baja.");
    }
  };

  // Acción: Amortizar/Saldar un pago programado/gasto fijo pendiente
  const handleSettlePayment = async () => {
    if (!settleLedgerItem) return;
    if (!settleSourceWalletId) {
      alert("Por favor seleccione una billetera de origen para realizar el pago.");
      return;
    }

    setSettleSubmitting(true);
    try {
      const leg = settleLedgerItem.rawRef;
      const amount = Math.abs(leg.amount || 0);

      // 1. Convertir entrada programada pendiente a saldada
      const ledgerDocRef = doc(db, 'ledger', leg.id);
      await updateDoc(ledgerDocRef, {
        isPending: false,
        walletId: settleSourceWalletId,
        updatedAt: new Date().toISOString()
      });

      // 2. Descontar el dinero de la billetera de origen seleccionada
      const sourceWalletRef = doc(db, 'wallets', settleSourceWalletId);
      await updateDoc(sourceWalletRef, {
        balance: increment(-amount)
      });

      // 3. Si era pago de tarjeta de crédito, aumentar el cupo disponible de la tarjeta
      if (leg.isCreditCardPayment && leg.targetWalletId) {
        const destWalletRef = doc(db, 'wallets', leg.targetWalletId);
        await updateDoc(destWalletRef, {
          balance: increment(amount)
        });
      }

      setSettleLedgerItem(null);
      setSettleSourceWalletId('');
    } catch (err) {
      console.error("Error al saldar pago programado:", err);
      alert("No se pudo amortizar la deuda programada.");
    } finally {
      setSettleSubmitting(false);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const matchesFilter = activeFilter === 'all' || a.type === activeFilter;
    if (!searchTerm) return matchesFilter;
    const term = searchTerm.toLowerCase();
    return matchesFilter && (
      (a.customer && a.customer.toLowerCase().includes(term)) ||
      (a.item && a.item.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto p-4 lg:p-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="space-y-1">
          <h2 className={cn("text-2xl lg:text-3xl font-bold tracking-tight uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
            Alertas y Cobranza
          </h2>
          <p className="text-slate-500 font-medium font-sans flex flex-col sm:flex-row sm:items-center gap-2 gap-y-1">
            <span>
              Monitoreo inteligente en tiempo real para cuentas expiradas, servicios caídos y pagos ANT impagos.
            </span>
            <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-indigo-100/50 dark:border-indigo-900/30 shrink-0 w-fit select-none">
              Versión {SYSTEM_UPDATES[0]?.version || 'V6.2.2'}
            </span>
          </p>
        </div>
        <div className={cn("flex flex-wrap gap-2 p-1 rounded-2xl w-full sm:w-auto shrink-0 border", isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200")}>
          <button onClick={() => setActiveFilter('all')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer", activeFilter === 'all' ? (isDark ? "bg-white text-slate-950 shadow-sm" : "bg-white text-slate-900 shadow-sm") : "text-slate-500")}>Todo</button>
          <button onClick={() => setActiveFilter('expiration')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer", activeFilter === 'expiration' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}>Expiraciones ({alerts.filter(a => a.type === 'expiration').length})</button>
          <button onClick={() => setActiveFilter('receivable')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer", activeFilter === 'receivable' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500")}>Cobros ANT ({alerts.filter(a => a.type === 'receivable').length})</button>
          <button onClick={() => setActiveFilter('scheduled_payment')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer", activeFilter === 'scheduled_payment' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500")}>Programados ({alerts.filter(a => a.type === 'scheduled_payment').length})</button>
        </div>
      </div>

      {/* Modern Search Input */}
      <div className="relative w-full">
        <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
          <Search className="w-5 h-5 text-indigo-500" />
        </span>
        <input
          type="text"
          placeholder="🔍 Buscar por cliente de cobranza, convenio, servicio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={cn(
            "w-full pl-11 pr-4 py-3 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold shadow-inner",
            isDark 
              ? "border-slate-850 bg-slate-900/45 text-white placeholder-slate-500 focus:bg-slate-900" 
              : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:bg-slate-50"
          )}
        />
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-4 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="font-bold uppercase tracking-widest text-[10px]">Calculando vencimientos del protocolo...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {filteredAlerts.length > 0 ? filteredAlerts.map((alert, idx) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.03 }}
                key={alert.id}
                className={cn(
                  "p-4 lg:p-6 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all group",
                  isDark ? "bg-slate-900 border-slate-800 hover:border-indigo-900/50" : "bg-white border-slate-100 shadow-sm hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-4 lg:gap-6 w-full sm:w-auto">
                  <div className={cn(
                    "w-12 lg:w-14 h-12 lg:h-14 rounded-2xl flex items-center justify-center relative shrink-0",
                    alert.status === 'expired' ? (isDark ? "bg-rose-950/30 text-rose-500" : "bg-rose-50 text-rose-500") : 
                    alert.status === 'past-due' ? (isDark ? "bg-rose-950/30 text-rose-500" : "bg-rose-50 text-rose-500") : 
                    (isDark ? "bg-amber-950/30 text-amber-500" : "bg-amber-50 text-amber-500")
                  )}>
                    {alert.type === 'expiration' ? (
                      <Calendar className="w-6 h-6" />
                    ) : alert.type === 'receivable' ? (
                      <ShieldAlert className="w-6 h-6" />
                    ) : alert.rawRef?.isCreditCardPayment ? (
                      <CreditCard className="w-6 h-6" />
                    ) : (
                      <WalletIcon className="w-6 h-6" />
                    )}
                    {alert.status === 'expired' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />}
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {alert.type === 'expiration' ? 'Expiración Digital' : alert.type === 'receivable' ? 'Cobranza Trámite ANT' : 'Pago Programado Egreso'}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                        alert.status === 'expired' ? "bg-rose-500/10 text-rose-500" :
                        alert.status === 'past-due' ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        {alert.status === 'expired' ? (alert.type === 'scheduled_payment' ? 'Toca Pago Hoy' : 'Expirado / Cortar') : alert.status === 'past-due' ? 'Pendiente' : 'Por Vencer'}
                      </span>
                    </div>
                    <h4 className={cn("text-base lg:text-lg font-bold tracking-tight truncate", isDark ? "text-slate-100" : "text-slate-900")}>
                      {alert.customer}
                    </h4>
                    <p className="text-slate-500 text-xs font-semibold truncate leading-relaxed">
                      {alert.item} {alert.amount ? ` - ${formatCurrency(alert.amount)}` : ''} 
                      {alert.date ? ` (Límite: ${alert.date})` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  {/* Boton Cobrado / Marcar como Pagado o Saldar Gasto */}
                  {alert.type === 'scheduled_payment' ? (
                    <button 
                      onClick={() => {
                        setSettleLedgerItem(alert);
                        const firstDebitWallet = wallets.find(w => w.type !== 'credit_card');
                        setSettleSourceWalletId(firstDebitWallet?.id || wallets[0]?.id || '');
                      }}
                      className="flex-1 sm:flex-none border border-amber-200/50 hover:bg-amber-600 hover:text-white text-amber-600 px-4 py-2.5 rounded-2xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer text-xs font-bold uppercase tracking-widest"
                    >
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      Saldar Pago
                    </button>
                  ) : alert.type === 'receivable' ? (
                    <button 
                      onClick={() => handleMarkAsPaid(alert)}
                      className="flex-1 sm:flex-none border border-emerald-200/50 hover:bg-emerald-500 hover:text-white text-emerald-600 px-4 py-2.5 rounded-2xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer text-xs font-bold uppercase tracking-widest"
                    >
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      Marcar Cobrado
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleCancelService(alert)}
                      className="flex-1 sm:flex-none border border-rose-200/50 hover:bg-rose-500 hover:text-white text-rose-500 px-4 py-2.5 rounded-2xl transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer text-xs font-bold uppercase tracking-widest"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      Eliminar / Baja
                    </button>
                  )}

                  {/* Accion Enviar Recordatorio por WhatsApp */}
                  {alert.type !== 'scheduled_payment' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const cleanPhone = alert.contact.replace(/\D/g, '');
                      if (!cleanPhone) {
                        window.alert("No hay teléfono de WhatsApp válido guardado para este cliente. Por favor regístrelo en CRM o en el Servicio Digital para automatizar.");
                        return;
                      }

                      const amt = alert.amount || 0;
                      setNoticeShareData({
                        recipientName: alert.customer,
                        recipientPhone: alert.contact,
                        title: alert.type === 'expiration' ? "Aviso de Vencimiento de Suscripción" : "Notificación de Pago de Trámite",
                        subtitle: alert.type === 'expiration' ? `Renovación de Servicio: ${alert.item}` : `Regulación de Trámite ANT: ${alert.item}`,
                        items: [{
                          concept: alert.item,
                          reference: alert.date ? `Vence: ${alert.date}` : undefined,
                          amount: amt
                        }],
                        totalAmount: amt,
                        statusLabel: alert.type === 'expiration' ? "EXPIRA PRONTO" : "VENCIDO / MOROSO",
                        paymentInstructions: alert.type === 'expiration' ? "Confírmanos si deseas conservar tu servicio de manera ininterrumpida." : "Por favor ayúdanos con el depósito para regularizar tus trámites.",
                        type: alert.type === 'expiration' ? 'payable' : 'receivable'
                      });
                    }}
                    className="bg-emerald-500 text-white px-4 py-2.5 rounded-2xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 font-bold" />
                    <span className="text-xs font-bold uppercase tracking-widest">Avisar</span>
                  </button>
                )}
                </div>
              </motion.div>
            )) : (
              <div className="p-16 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px] border border-dashed rounded-3xl">
                ✨ ¡Protocolo limpio! No hay alertas ni moribundos por cortar.
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {settleLedgerItem && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <motion.div
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className={cn(
              "w-full max-w-md p-6 rounded-3xl border shadow-2xl relative space-y-5",
              isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"
            )}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 font-bold uppercase tracking-wider text-[9px] rounded">
                  Amortización de Egreso
                </span>
                <h3 className="text-lg lg:text-xl font-bold tracking-tight mt-1">Saldar Pago Programado</h3>
                <p className="text-slate-500 text-xs font-semibold font-sans mt-0.5">Autoriza el débito financiero de este egreso recurrente.</p>
              </div>
              <button
                onClick={() => setSettleLedgerItem(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/10 cursor-pointer"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className={cn("p-4 rounded-2xl border space-y-2", isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-100")}>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500 font-bold">Concepto:</span>
                <span className="text-xs font-black truncate max-w-[200px]">{settleLedgerItem.customer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500 font-bold">Detalle/Notas:</span>
                <span className="text-xs font-semibold truncate max-w-[200px]">{settleLedgerItem.item}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500 font-bold">Fecha Límite:</span>
                <span className="text-xs font-mono font-black">{settleLedgerItem.date || 'Sin fecha'}</span>
              </div>
              {settleLedgerItem.rawRef?.isCreditCardPayment && (
                <div className="flex items-center gap-1.5 p-2 bg-emerald-500/10 border border-emerald-500/10 rounded-xl text-emerald-500 text-[10px] font-black uppercase tracking-wider">
                  <CreditCard className="w-3.5 h-3.5" />
                  Gasto con Tarjeta: Libera Cupo Disponible
                </div>
              )}
              <div className="pt-2 border-t border-slate-800/10 flex justify-between items-baseline">
                <span className="text-sm font-bold">Total a Saldar:</span>
                <span className="text-xl font-black text-rose-500">{formatCurrency(settleLedgerItem.amount || 0)}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 pl-1">
                🏦 Seleccionar Billetera de Origen (Débito)
              </label>
              <select
                value={settleSourceWalletId}
                onChange={(e) => setSettleSourceWalletId(e.target.value)}
                className={cn(
                  "w-full px-3 py-2.5 rounded-xl border text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer",
                  isDark 
                    ? "border-slate-800 bg-slate-950 text-white focus:bg-slate-950" 
                    : "border-slate-200 bg-white text-slate-950 focus:bg-slate-50"
                )}
              >
                <option value="" disabled>-- Seleccionar Cuenta / Baja --</option>
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatCurrency(w.balance || 0)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettleLedgerItem(null)}
                className={cn(
                  "flex-1 py-3 rounded-2xl cursor-pointer text-xs font-bold uppercase tracking-widest border transition-all text-center",
                  isDark 
                    ? "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850" 
                    : "border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={settleSubmitting}
                onClick={handleSettlePayment}
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black uppercase tracking-widest text-xs py-3 rounded-2xl shadow-md hover:from-amber-600 hover:to-amber-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {settleSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <WalletIcon className="w-4 h-4 shrink-0" />
                    Proceder Pago
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {noticeShareData && (
        <NoticeShareModal
          isOpen={!!noticeShareData}
          onClose={() => setNoticeShareData(null)}
          recipientName={noticeShareData.recipientName}
          recipientPhone={noticeShareData.recipientPhone}
          title={noticeShareData.title}
          subtitle={noticeShareData.subtitle}
          items={noticeShareData.items}
          totalAmount={noticeShareData.totalAmount}
          statusLabel={noticeShareData.statusLabel}
          paymentInstructions={noticeShareData.paymentInstructions}
          type={noticeShareData.type}
        />
      )}
    </div>
  );
}
