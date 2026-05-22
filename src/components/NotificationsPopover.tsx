import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, Calendar, ShieldAlert, MessageCircle, X, Check, Trash2, Loader2 } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface NotificationsPopoverProps {
  onClose: () => void;
}

interface RealNotifItem {
  id: string;
  type: 'expiration' | 'receivable';
  customer: string;
  item: string;
  amount?: number;
  date?: string;
  status: 'expired' | 'past-due' | 'expiring-soon';
  contact: string;
}

export function NotificationsPopover({ onClose }: NotificationsPopoverProps) {
  const { user, settings } = useAuth();
  const [alerts, setAlerts] = useState<RealNotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isDark = settings?.theme === 'dark';

  useEffect(() => {
    if (!user) return;

    let unsubTxs = () => {};
    let unsubServices = () => {};
    let unsubEntities = () => {};

    let entitiesMap: Record<string, string> = {};

    // Obtener teléfonos de intermediarios / clientes
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
      // 1. Cuentas impagas de ANT
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
            contact: contactPhone
          };
        });

        // 2. Servicios Digitales expirados / prontos a expirar
        const qSer = query(collection(db, 'digital_services'), where('ownerId', '==', user.uid));
        unsubServices = onSnapshot(qSer, (serSnap) => {
          const rawServices = serSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          
          const now = new Date();
          const serAlerts = rawServices.filter(ser => {
            if (ser.status === 'expired') return true;
            if (!ser.expirationDate) return false;
            const expiry = new Date(ser.expirationDate);
            const diffTime = expiry.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 7;
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
              contact: ser.clientContact || ''
            };
          });

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

    const timer = setTimeout(triggerSync, 200);

    return () => {
      clearTimeout(timer);
      unsubTxs();
      unsubServices();
      unsubEntities();
    };
  }, [user]);

  const handleAction = async (alert: RealNotifItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (alert.type === 'receivable') {
        const docRef = doc(db, 'transactions', alert.id);
        await updateDoc(docRef, { isPaid: true, updatedAt: new Date().toISOString() });
      } else {
        if (confirm(`¿Dar de baja definitivamente el servicio de "${alert.customer}" porque el cliente no renovó?`)) {
          await deleteDoc(doc(db, 'digital_services', alert.id));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWhatsApp = (alert: RealNotifItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = alert.contact.replace(/\D/g, '');
    if (!phone) {
      window.alert("No hay número guardado para este cliente.");
      return;
    }
    const text = alert.type === 'expiration'
      ? `Hola *${alert.customer}*, te recordamos amablemente que tu renovación de *${alert.item}* por valor de *${formatCurrency(alert.amount || 0)}* vence el *${alert.date}*. ¿Deseas renovar?`
      : `Hola *${alert.customer}*, te saludamos para recordarte el pago pendiente por *${alert.item}* de *${formatCurrency(alert.amount || 0)}*. ¡Muchas gracias!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className={cn(
        "absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border shadow-xl z-50 overflow-hidden",
        isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      )}
    >
      <div className={cn(
        "p-4 border-b flex items-center justify-between",
        isDark ? "border-slate-800 bg-slate-800/50" : "border-slate-100 bg-slate-50"
      )}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-500 animate-swing" />
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Notificaciones en tiempo real</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100/10">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Buscando alertas de cobros...</span>
          </div>
        ) : alerts.length > 0 ? (
          alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={cn(
                "p-4 hover:bg-indigo-500/5 transition-colors group/item relative text-left",
                isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50/50"
              )}
            >
              <div className="flex gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  alert.status === 'expired' ? "bg-rose-500/10 text-rose-500" :
                  alert.status === 'past-due' ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                )}>
                  {alert.type === 'expiration' ? <Calendar className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start gap-1">
                    <p className={cn("text-xs font-bold truncate", isDark ? "text-slate-200" : "text-slate-900")}>
                      {alert.customer}
                    </p>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded shrink-0",
                      alert.status === 'expired' ? "bg-rose-500/10 text-rose-500" :
                      alert.status === 'past-due' ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                      {alert.status === 'expired' ? 'Expiró' : alert.status === 'past-due' ? 'Vencido' : 'Próximo'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed break-words">
                    {alert.item} {alert.amount ? ` - ${formatCurrency(alert.amount)}` : ''}
                  </p>
                  
                  {/* Inline quick buttons */}
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <button 
                      onClick={(e) => handleAction(alert, e)}
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer",
                        alert.type === 'receivable'
                          ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500 hover:text-white"
                          : "border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-500 hover:text-white"
                      )}
                    >
                      {alert.type === 'receivable' ? <Check className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                      {alert.type === 'receivable' ? 'Cobrado' : 'Baja'}
                    </button>
                    {alert.contact && (
                      <button 
                        onClick={(e) => handleWhatsApp(alert, e)}
                        className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <MessageCircle className="w-3 h-3" />
                        Avisar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest bg-slate-50/10">
            ✨ ¡Felicidades! Todo está cobrado y al día.
          </div>
        )}
      </div>

      <div className={cn(
        "p-3 border-t text-center",
        isDark ? "border-slate-800" : "border-slate-100"
      )}>
        <button 
          onClick={onClose}
          className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          Cerrar popover
        </button>
      </div>
    </motion.div>
  );
}
