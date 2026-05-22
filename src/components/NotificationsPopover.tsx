import React from 'react';
import { motion } from 'motion/react';
import { Bell, Calendar, ShieldAlert, MessageCircle, X } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';

interface NotificationsPopoverProps {
  onClose: () => void;
}

export function NotificationsPopover({ onClose }: NotificationsPopoverProps) {
  const { settings } = useAuth();
  const isDark = settings?.theme === 'dark';

  // Mock de alertas (similar a Alerts.tsx)
  const alerts = [
    { type: 'expiration', customer: 'Galo Peralta', item: 'Netflix Premium', status: 'expiring-soon' },
    { type: 'receivable', customer: 'Almacenes Juan', item: '4 Actualizaciones ANT', amount: 50.00, status: 'past-due' },
    { type: 'expiration', customer: 'Rosa Melano', item: 'Disney Plus', status: 'expired' },
  ];

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
          <Bell className="w-4 h-4 text-indigo-500" />
          <h3 className="text-xs font-black uppercase tracking-widest">Notificaciones</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100/10">
        {alerts.length > 0 ? (
          alerts.map((alert, idx) => (
            <div 
              key={idx} 
              className={cn(
                "p-4 hover:bg-indigo-500/5 transition-colors cursor-pointer",
                isDark ? "hover:bg-slate-800/50" : "hover:bg-slate-50"
              )}
            >
              <div className="flex gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  alert.status === 'expired' ? "bg-rose-500/10 text-rose-500" :
                  alert.status === 'past-due' ? "bg-amber-500/10 text-amber-500" : "bg-indigo-500/10 text-indigo-500"
                )}>
                  {alert.type === 'expiration' ? <Calendar className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <p className={cn("text-xs font-bold truncate", isDark ? "text-slate-200" : "text-slate-900")}>
                    {alert.customer}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {alert.item} {alert.amount ? ` - ${formatCurrency(alert.amount)}` : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded",
                      alert.status === 'expired' ? "bg-rose-500/10 text-rose-500" :
                      alert.status === 'past-due' ? "bg-amber-500/10 text-amber-500" : "bg-indigo-500/10 text-indigo-500"
                    )}>
                      {alert.status === 'expired' ? 'Expirado' : alert.status === 'past-due' ? 'Vencido' : 'Por Vencer'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            Sin notificaciones nuevas
          </div>
        )}
      </div>

      <div className={cn(
        "p-3 border-t text-center",
        isDark ? "border-slate-800" : "border-slate-100"
      )}>
        <button 
          onClick={onClose}
          className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          Ver todas las alertas
        </button>
      </div>
    </motion.div>
  );
}
