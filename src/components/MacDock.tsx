import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Users, Settings, Activity, Wallet, BarChart3, AlertCircle, ShoppingBag, Coins, User, Gamepad2, Bell, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';

// Simple tooltip component
const Tooltip = ({ children, text, isDark }: { children: React.ReactNode, text: string, isDark: boolean }) => {
  const [show, setShow] = useState(false);
  return (
    <div 
      className="relative flex items-center justify-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className={cn(
              "absolute -top-10 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide whitespace-nowrap z-50 pointer-events-none shadow-xl",
              isDark ? "bg-slate-800 text-white border border-slate-700" : "bg-white text-slate-900 border border-slate-200"
            )}
          >
            {text}
            <div className={cn(
              "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b",
              isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
            )} />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
};

export function MacDock({ activeTab, setActiveTab, onOpenReports, onToggleNotifications, notifCount }: { activeTab: string, setActiveTab: (tab: string) => void, onOpenReports: () => void, onToggleNotifications: () => void, notifCount: number }) {
  const { settings, user } = useAuth();
  const isDark = settings?.theme === 'dark' || (settings?.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const disabledFeatures = settings?.disabledFeatures || [];

  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio', category: 'main' },
    ...(!disabledFeatures.includes('crm') ? [{ id: 'crm', icon: Users, label: 'Cartera de Clientes', category: 'comercio' }] : []),
    ...(!disabledFeatures.includes('ecommerce') ? [{ id: 'ecommerce', icon: ShoppingBag, label: 'E-commerce', category: 'comercio' }] : []),
    ...(!disabledFeatures.includes('treasury') ? [{ id: 'treasury', icon: Wallet, label: 'Tesorería', category: 'finanzas' }] : []),
    ...(!disabledFeatures.includes('reports') ? [{ id: 'reports', icon: BarChart3, label: 'Reportes y Balances', category: 'finanzas' }] : []),
    ...(!disabledFeatures.includes('alerts') ? [{ id: 'alerts', icon: AlertCircle, label: 'Alertas y Cobro', category: 'finanzas' }] : []),
    { id: 'account_status', icon: FileText, label: 'Generar Estado', category: 'tools', isAction: true, action: onOpenReports },
    { id: 'notifications', icon: Bell, label: 'Notificaciones', category: 'tools', isAction: true, action: onToggleNotifications, count: notifCount },
    { id: 'settings', icon: Settings, label: 'Ajustes', category: 'main' },
  ];

  return (
    <div className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-end h-[140px] max-w-[100vw] overflow-x-auto px-4 pb-2 scrollbar-hide pointer-events-none">
      <div 
        className={cn(
          "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-16 sm:h-20 rounded-3xl shadow-2xl border backdrop-blur-xl transition-all pointer-events-auto",
          isDark 
            ? "bg-slate-900/80 border-slate-700/50 shadow-black/50" 
            : "bg-white/80 border-slate-200/60 shadow-slate-300/50"
        )}
      >
        {items.map((item, index) => {
          const isActive = activeTab === item.id;
          const isDividerAfter = 
            (item.id === 'dashboard') || 
            (item.id === 'updates' && items.find(i => i.category === 'finanzas')) ||
            (item.id === 'alerts' && items.find(i => i.id === 'settings'));

          return (
            <React.Fragment key={item.id}>
              <Tooltip text={item.label} isDark={isDark}>
                <motion.button
                  whileHover={{ scale: 1.4, y: -10 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => item.isAction ? item.action() : setActiveTab(item.id)}
                  className={cn(
                    "relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-colors cursor-pointer outline-none",
                    isActive 
                      ? isDark ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-100 text-indigo-600"
                      : isDark ? "text-slate-600 dark:text-slate-300 hover:bg-slate-800/80 hover:text-slate-200" : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  )}
                  style={{ transformOrigin: 'bottom' }}
                >
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  {(item as any).count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-mono text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border-2 border-white shrink-0 animate-bounce">
                      {(item as any).count}
                    </span>
                  )}
                  {isActive && !item.isAction && (
                    <motion.div 
                      layoutId="dock-indicator"
                      className="absolute -bottom-1 w-1 h-1 rounded-full bg-indigo-500"
                    />
                  )}
                </motion.button>
              </Tooltip>
              {isDividerAfter && index < items.length - 1 && (
                <div className={cn(
                  "w-px h-8 mx-1 opacity-50",
                  isDark ? "bg-slate-700" : "bg-slate-300"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
