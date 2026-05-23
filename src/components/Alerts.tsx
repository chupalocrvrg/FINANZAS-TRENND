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
  XCircle
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface RealAlertItem {
  id: string;
  type: 'expiration' | 'receivable';
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'expiration' | 'receivable'>('all');
  const [alerts, setAlerts] = useState<RealAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isDark = settings?.theme === 'dark';

  useEffect(() => {
    if (!user) return;

    let unsubTxs = () => {};
    let unsubServices = () => {};
    let unsubEntities = () => {};

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

    const triggerSync = () => {
      // 2. Suscribirse a Transacciones Impagas (Cuentas por cobrar)
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

        // 3. Suscribirse a Servicios Digitales expirando o expirados
        const qSer = query(collection(db, 'digital_services'), where('ownerId', '==', user.uid));
        unsubServices = onSnapshot(qSer, (serSnap) => {
          const rawServices = serSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          
          const now = new Date();
          const serAlerts = rawServices.filter(ser => {
            // Un servicio califica como alerta si:
            // a) Su status es explicitamente 'expired'
            // b) Su fecha de expiracion ya pasó
            // c) Su fecha de expiracion está próxima (próximos 7 días)
            if (ser.status === 'expired') return true;
            if (!ser.expirationDate) return false;
            
            const expiry = new Date(ser.expirationDate);
            const diffTime = expiry.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return diffDays <= 7; // Expira pronto o ya expiró
          }).map(ser => {
            const expDate = new Date(ser.expirationDate);
            const isOverdu = expDate < now || ser.status === 'expired';
            
            return {
              id: ser.id,
              type: 'expiration' as const,
              customer: ser.clientName || 'Cliente Digital',
              item: `${ser.name} (${ser.category})`,
              amount: ser.revenue || 0,
              date: ser.expirationDate,
              status: isOverdu ? ('expired' as const) : ('expiring-soon' as const),
              contact: ser.clientContact || '',
              rawRef: ser
            };
          });

          // Combinar alertas y setear el estado
          const combined = [...txAlerts, ...serAlerts].sort((a, b) => {
            if (a.status === 'expired' && b.status !== 'expired') return -1;
            if (a.status !== 'expired' && b.status === 'expired') return 1;
            return (b.amount || 0) - (a.amount || 0);
          });

          setAlerts(combined);
          setLoading(false);
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
      await deleteDoc(doc(db, 'digital_services', alertItem.id));
    } catch (err) {
      console.error("Error al eliminar servicio:", err);
      alert("No se pudo dar de baja.");
    }
  };

  const filteredAlerts = alerts.filter(a => activeFilter === 'all' || a.type === activeFilter);

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto p-4 lg:p-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="space-y-1">
          <h2 className={cn("text-2xl lg:text-3xl font-bold tracking-tight uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
            Alertas y Cobranza
          </h2>
          <p className="text-slate-500 font-medium font-sans">Monitoreo inteligente en tiempo real para cuentas expiradas, servicios caídos y pagos ANT impagos.</p>
        </div>
        <div className={cn("flex gap-2 p-1 rounded-2xl w-full sm:w-auto shrink-0 border", isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200")}>
          <button onClick={() => setActiveFilter('all')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer", activeFilter === 'all' ? (isDark ? "bg-white text-slate-950 shadow-sm" : "bg-white text-slate-900 shadow-sm") : "text-slate-500")}>Todo</button>
          <button onClick={() => setActiveFilter('expiration')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer", activeFilter === 'expiration' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}>Expiraciones ({alerts.filter(a => a.type === 'expiration').length})</button>
          <button onClick={() => setActiveFilter('receivable')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer", activeFilter === 'receivable' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500")}>Cobros ANT ({alerts.filter(a => a.type === 'receivable').length})</button>
        </div>
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
                    {alert.type === 'expiration' ? <Calendar className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                    {alert.status === 'expired' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />}
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {alert.type === 'expiration' ? 'Expiración Digital' : 'Cobranza Trámite ANT'}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                        alert.status === 'expired' ? "bg-rose-500/10 text-rose-500" :
                        alert.status === 'past-due' ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        {alert.status === 'expired' ? 'Expirado / Cortar' : alert.status === 'past-due' ? 'Pendiente' : 'Por Vencer'}
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
                  {/* Boton Cobrado / Marcar como Pagado */}
                  {alert.type === 'receivable' ? (
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
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const text = alert.type === 'expiration' 
                        ? `Hola ${alert.customer}, te recordamos que tu servicio de ${alert.item} venció/vence el ${alert.date}. Valor de renovación: ${formatCurrency(alert.amount || 0)}. Confírmanos si deseas conservarlo.`
                        : `Hola ${alert.customer}, cordial saludo. Tenemos pendiente de pago tu trámite de ${alert.item} por valor de ${formatCurrency(alert.amount || 0)}. Favor ayudarnos con el depósito para regularizar.`;
                      
                      const cleanPhone = alert.contact.replace(/\D/g, '');
                      if (!cleanPhone) {
                        alert("No hay teléfono de WhatsApp válido guardado para este cliente. Por favor regístrelo en CRM o en el Servicio Digital para automatizar.");
                        return;
                      }
                      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="bg-emerald-500 text-white px-4 py-2.5 rounded-2xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 font-bold" />
                    <span className="text-xs font-bold uppercase tracking-widest">Avisar</span>
                  </button>
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
    </div>
  );
}
