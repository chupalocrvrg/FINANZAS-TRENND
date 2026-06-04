/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Settings as SettingsIcon, 
  Activity, 
  Wallet, 
  AlertCircle,
  LayoutDashboard,
  BarChart3,
  ChevronDown,
  ShoppingBag,
  Coins
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { useTranslation } from '../lib/translations';

interface NavItemProps {
  key?: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200 group w-full text-left",
        active 
          ? "bg-indigo-600/10 text-indigo-400" 
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0", active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { settings, user } = useAuth();
  const { t } = useTranslation();
  const disabledFeatures = settings?.disabledFeatures || [];

  const [isComercioOpen, setIsComercioOpen] = useState(() => {
    return ['crm', 'services', 'updates'].includes(activeTab);
  });
  
  const [isFinanzasOpen, setIsFinanzasOpen] = useState(() => {
    return ['treasury', 'reports', 'alerts'].includes(activeTab);
  });

  useEffect(() => {
    if (['crm', 'services', 'updates'].includes(activeTab)) {
      setIsComercioOpen(true);
    }
    if (['treasury', 'reports', 'alerts'].includes(activeTab)) {
      setIsFinanzasOpen(true);
    }
  }, [activeTab]);

  return (
    <aside className="w-72 bg-slate-950/90 lg:bg-slate-900 flex flex-col h-[calc(100vh-2rem)] lg:h-screen lg:rounded-none rounded-2xl my-4 ml-4 lg:my-0 lg:ml-0 sticky top-4 lg:top-0 border border-slate-800/80 lg:border-none lg:border-r text-slate-300 overflow-y-auto scrollbar-hide text-left shadow-2xl lg:shadow-none z-50">
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-8 border-b border-slate-800/50 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div className="overflow-hidden">
                <h1 className="font-extrabold text-white text-base tracking-tighter uppercase whitespace-nowrap truncate">
                  {settings?.companyName || 'Control Financiero'}
                </h1>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400/80 px-3 mb-3.5">{t('nav.admin_modules', 'Módulos Administrativos')}</div>
          <nav className="space-y-2">
            {/* Panel Principal */}
            <NavItem
              icon={LayoutDashboard}
              label={t('nav.dashboard', 'Panel Principal')}
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
            />

            {/* Comercio Collapsible Menu Group */}
            <div className="space-y-1">
              <button
                onClick={() => setIsComercioOpen(!isComercioOpen)}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded transition-all duration-200 group w-full text-left focus:outline-none",
                  ['crm', 'services', 'updates'].includes(activeTab)
                    ? "bg-indigo-600/10 text-indigo-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-sm font-semibold">{t('nav.commerce', 'Comercio')}</span>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 shrink-0", isComercioOpen ? "rotate-0" : "-rotate-90")} />
              </button>

              <AnimatePresence initial={false}>
                {isComercioOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden pl-3 space-y-1 border-l border-slate-800 ml-4 py-1"
                  >
                    {!disabledFeatures.includes('crm') && (
                      <NavItem
                        icon={Users}
                        label={t('nav.crm', 'CRM Relaciones')}
                        active={activeTab === 'crm'}
                        onClick={() => setActiveTab('crm')}
                      />
                    )}
                    {!disabledFeatures.includes('services') && (
                      <NavItem
                        icon={SettingsIcon}
                        label={t('nav.services', 'Servicios Digitales')}
                        active={activeTab === 'services'}
                        onClick={() => setActiveTab('services')}
                      />
                    )}
                    {!disabledFeatures.includes('updates') && (
                      <NavItem
                        icon={Activity}
                        label={t('nav.updates', 'Actualizaciones ANT')}
                        active={activeTab === 'updates'}
                        onClick={() => setActiveTab('updates')}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Finanzas Collapsible Menu Group */}
            <div className="space-y-1">
              <button
                onClick={() => setIsFinanzasOpen(!isFinanzasOpen)}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded transition-all duration-200 group w-full text-left focus:outline-none",
                  ['treasury', 'reports', 'alerts'].includes(activeTab)
                    ? "bg-indigo-600/10 text-indigo-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <Coins className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-sm font-semibold">{t('nav.finance', 'Finanzas')}</span>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 shrink-0", isFinanzasOpen ? "rotate-0" : "-rotate-90")} />
              </button>

              <AnimatePresence initial={false}>
                {isFinanzasOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden pl-3 space-y-1 border-l border-slate-800 ml-4 py-1"
                  >
                    {!disabledFeatures.includes('treasury') && (
                      <NavItem
                        icon={Wallet}
                        label={t('nav.treasury', 'Tesorería')}
                        active={activeTab === 'treasury'}
                        onClick={() => setActiveTab('treasury')}
                      />
                    )}
                    {!disabledFeatures.includes('reports') && (
                      <NavItem
                        icon={BarChart3}
                        label={t('nav.reports', 'Reportes y Balances')}
                        active={activeTab === 'reports'}
                        onClick={() => setActiveTab('reports')}
                      />
                    )}
                    {!disabledFeatures.includes('alerts') && (
                      <NavItem
                        icon={AlertCircle}
                        label={t('nav.alerts', 'Alertas y Cobro')}
                        active={activeTab === 'alerts'}
                        onClick={() => setActiveTab('alerts')}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>

        <div className="mt-8">
          <button 
            onClick={() => setActiveTab('settings')}
            className="w-full text-left bg-slate-900 border border-slate-800/60 rounded-xl p-3 flex items-center space-x-3 hover:bg-slate-800 transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-slate-700/60 group-hover:border-indigo-500 transition-colors">
              {settings?.useGoogleAvatar && user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : settings?.customProfilePic ? (
                <img src={settings.customProfilePic} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 shrink-0 capitalize text-sm">
                  {settings?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate break-all group-hover:text-indigo-400 transition-colors">{settings?.displayName || 'User'}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{settings?.companyName || 'Global Ops'}</div>
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
}
