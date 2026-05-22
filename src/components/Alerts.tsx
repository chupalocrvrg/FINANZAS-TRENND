import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  ShieldAlert, 
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';

export function Alerts() {
  const { settings } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'expiration' | 'receivable'>('all');
  const isDark = settings?.theme === 'dark';

  // Mock data
  const upcomingAlerts = [
    { type: 'expiration', customer: 'Galo Peralta', item: 'Netflix Premium', date: '2026-05-25', status: 'expiring-soon', contact: '+593987654321' },
    { type: 'receivable', customer: 'Almacenes Juan', item: '4 Actualizaciones ANT', amount: 50.00, status: 'past-due', contact: '+593987654321' },
    { type: 'expiration', customer: 'Rosa Melano', item: 'Disney Plus', date: '2026-05-22', status: 'expired', contact: '+593987654322' },
  ];

  const filteredAlerts = upcomingAlerts.filter(a => activeFilter === 'all' || a.type === activeFilter);

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto p-4 lg:p-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="space-y-1">
          <h2 className={cn("text-2xl lg:text-3xl font-bold tracking-tight uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
            Alertas y Cobranza
          </h2>
          <p className="text-slate-500 font-medium">Monitoreo inteligente para cuentas expiradas y pagos pendientes.</p>
        </div>
        <div className={cn("flex gap-2 p-1 rounded-2xl w-full sm:w-auto", isDark ? "bg-slate-900 border border-slate-800" : "bg-slate-100")}>
          <button onClick={() => setActiveFilter('all')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all", activeFilter === 'all' ? (isDark ? "bg-white text-slate-950 shadow-sm" : "bg-white text-slate-900 shadow-sm") : "text-slate-500")}>Todo</button>
          <button onClick={() => setActiveFilter('expiration')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all", activeFilter === 'expiration' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}>Expiraciones</button>
          <button onClick={() => setActiveFilter('receivable')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all", activeFilter === 'receivable' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500")}>Cobros</button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.length > 0 ? filteredAlerts.map((alert, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05 }}
              key={`${alert.customer}-${alert.item}`}
              className={cn(
                "p-4 lg:p-6 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all group",
                isDark ? "bg-slate-900 border-slate-800 hover:border-indigo-900/50" : "bg-white border-slate-100 shadow-sm hover:shadow-md"
              )}
            >
              <div className="flex items-center gap-4 lg:gap-6 w-full sm:w-auto">
                <div className={cn(
                  "w-12 lg:w-14 h-12 lg:h-14 rounded-2xl flex items-center justify-center relative shrink-0",
                  alert.status === 'expired' ? (isDark ? "bg-rose-950/30 text-rose-500" : "bg-rose-50 text-rose-500") : 
                  alert.status === 'past-due' ? (isDark ? "bg-amber-950/30 text-amber-500" : "bg-amber-50 text-amber-500") : 
                  (isDark ? "bg-indigo-950/30 text-indigo-500" : "bg-indigo-50 text-indigo-500")
                )}>
                  {alert.type === 'expiration' ? <Calendar className="w-6 lg:w-7 h-6 lg:h-7" /> : <ShieldAlert className="w-6 lg:w-7 h-6 lg:h-7" />}
                  {alert.status === 'expired' && <div className="absolute -top-1 -right-1 w-3 lg:w-4 h-3 lg:h-4 bg-rose-500 rounded-full border-2 border-white animate-pulse" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {alert.type === 'expiration' ? 'Expiración' : 'Por Cobrar'}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                      alert.status === 'expired' ? "bg-rose-500/10 text-rose-500" :
                      alert.status === 'past-due' ? "bg-amber-500/10 text-amber-500" : "bg-indigo-500/10 text-indigo-500"
                    )}>
                      {alert.status === 'expired' ? 'Expirado' : alert.status === 'past-due' ? 'Vencido' : 'Por Vencer'}
                    </span>
                  </div>
                  <h4 className={cn("text-lg lg:text-xl font-bold tracking-tight truncate", isDark ? "text-slate-200" : "text-slate-900")}>{alert.customer}</h4>
                  <p className="text-slate-500 text-sm font-medium truncate">
                    {alert.item} {alert.amount ? ` - ${formatCurrency(alert.amount)}` : ` - Expira ${alert.date}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto shrink-0">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const text = `Hola ${alert.customer}, recordatorio sobre ${alert.item}: ${alert.type === 'expiration' ? 'está por expirar/expiró' : 'pago pendiente por ' + formatCurrency(alert.amount || 0)}. Favor regularizar.`;
                    window.open(`https://wa.me/${alert.contact.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="flex-1 sm:flex-none bg-emerald-500 text-white px-6 py-3 rounded-2xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 active:scale-95"
                >
                  <MessageCircle className="w-5 h-5 font-bold" />
                  <span className="text-xs font-bold uppercase tracking-widest">WhatsApp</span>
                </button>
                <div className="hidden lg:block p-1 text-slate-500 group-hover:text-slate-200 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px] border border-dashed rounded-3xl">No hay alertas para el filtro actual.</div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
