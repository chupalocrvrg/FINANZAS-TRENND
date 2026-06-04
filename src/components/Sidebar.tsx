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
import { SYSTEM_UPDATES } from '../data/updates';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  isDark: boolean;
}

function NavItem({ icon: Icon, label, active, onClick, isDark }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 group w-full text-left focus:outline-none cursor-pointer",
        active 
          ? "bg-indigo-600/10 text-indigo-500 dark:text-indigo-400 font-bold" 
          : isDark 
            ? "text-slate-405 hover:bg-slate-800/60 hover:text-slate-200"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <Icon className={cn(
        "w-4 h-4 shrink-0 transition-colors", 
        active 
          ? "text-indigo-500 dark:text-indigo-400" 
          : isDark 
            ? "text-slate-500 group-hover:text-slate-300" 
            : "text-slate-400 group-hover:text-slate-700"
      )} />
      <span className="text-xs font-semibold truncate leading-tight">{label}</span>
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
  const isDark = settings?.theme === 'dark';

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
    <aside className={cn(
      "w-60 flex flex-col h-[calc(100vh-2rem)] lg:h-screen lg:rounded-none rounded-2xl my-4 ml-4 lg:my-0 lg:ml-0 sticky top-4 lg:top-0 border lg:border-none lg:border-r overflow-y-auto scrollbar-hide text-left shadow-2xl lg:shadow-none z-50 transition-colors duration-200",
      isDark 
        ? "bg-slate-950/90 lg:bg-slate-900 border-slate-850 text-slate-300" 
        : "bg-white border-slate-200 text-slate-700"
    )}>
      <div className="p-4 flex-1 flex flex-col justify-between h-full min-h-0">
        <div>
          {/* Logo & Company Name */}
          <div className={cn(
            "flex items-center justify-between mb-6 pb-4 border-b",
            isDark ? "border-slate-800/60" : "border-slate-100"
          )}>
            <div className="flex items-center gap-2 px-1 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div className="overflow-hidden min-w-0">
                <h1 className={cn(
                  "font-black text-xs tracking-tight uppercase whitespace-nowrap truncate",
                  isDark ? "text-white" : "text-slate-900"
                )}>
                  {settings?.companyName || 'Control Financiero'}
                </h1>
              </div>
            </div>
          </div>

          <div className={cn(
            "text-[9px] font-black uppercase tracking-[0.2em] px-2.5 mb-3",
            isDark ? "text-indigo-400/80" : "text-indigo-600"
          )}>
            {t('nav.admin_modules', 'Módulos')}
          </div>
          
          <nav className="space-y-1">
            {/* Panel Principal */}
            <NavItem
              icon={LayoutDashboard}
              label={t('nav.dashboard', 'Panel Principal')}
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              isDark={isDark}
            />

            {/* Comercio Collapsible Menu Group */}
            <div className="space-y-0.5">
              <button
                onClick={() => setIsComercioOpen(!isComercioOpen)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 group w-full text-left focus:outline-none cursor-pointer",
                  ['crm', 'services', 'updates'].includes(activeTab)
                    ? "bg-indigo-600/10 text-indigo-500 dark:text-indigo-405 font-bold"
                    : isDark 
                      ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShoppingBag className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    ['crm', 'services', 'updates'].includes(activeTab)
                      ? "text-indigo-500 dark:text-indigo-405"
                      : isDark ? "text-slate-500 group-hover:text-slate-300" : "text-slate-400 group-hover:text-slate-700"
                  )} />
                  <span className="text-xs font-semibold leading-none truncate">{t('nav.commerce', 'Comercio')}</span>
                </div>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 shrink-0", 
                  isComercioOpen ? "rotate-0" : "-rotate-90"
                )} />
              </button>

              <AnimatePresence initial={false}>
                {isComercioOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className={cn(
                      "overflow-hidden pl-2.5 space-y-0.5 ml-3.5 py-0.5 border-l",
                      isDark ? "border-slate-800" : "border-slate-200"
                    )}
                  >
                    {!disabledFeatures.includes('crm') && (
                      <NavItem
                        icon={Users}
                        label={t('nav.crm', 'CRM Relaciones')}
                        active={activeTab === 'crm'}
                        onClick={() => setActiveTab('crm')}
                        isDark={isDark}
                      />
                    )}
                    {!disabledFeatures.includes('services') && (
                      <NavItem
                        icon={SettingsIcon}
                        label={t('nav.services', 'Servicios Digitales')}
                        active={activeTab === 'services'}
                        onClick={() => setActiveTab('services')}
                        isDark={isDark}
                      />
                    )}
                    {!disabledFeatures.includes('updates') && (
                      <NavItem
                        icon={Activity}
                        label={t('nav.updates', 'Actualizaciones ANT')}
                        active={activeTab === 'updates'}
                        onClick={() => setActiveTab('updates')}
                        isDark={isDark}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Finanzas Collapsible Menu Group */}
            <div className="space-y-0.5">
              <button
                onClick={() => setIsFinanzasOpen(!isFinanzasOpen)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 group w-full text-left focus:outline-none cursor-pointer",
                  ['treasury', 'reports', 'alerts'].includes(activeTab)
                    ? "bg-indigo-600/10 text-indigo-500 dark:text-indigo-405 font-bold"
                    : isDark 
                      ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Coins className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    ['treasury', 'reports', 'alerts'].includes(activeTab)
                      ? "text-indigo-500 dark:text-indigo-405"
                      : isDark ? "text-slate-500 group-hover:text-slate-300" : "text-slate-400 group-hover:text-slate-700"
                  )} />
                  <span className="text-xs font-semibold leading-none truncate">{t('nav.finance', 'Finanzas')}</span>
                </div>
                <ChevronDown className={cn(
                  "w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 shrink-0", 
                  isFinanzasOpen ? "rotate-0" : "-rotate-90"
                )} />
              </button>

              <AnimatePresence initial={false}>
                {isFinanzasOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className={cn(
                      "overflow-hidden pl-2.5 space-y-0.5 ml-3.5 py-0.5 border-l",
                      isDark ? "border-slate-800" : "border-slate-200"
                    )}
                  >
                    {!disabledFeatures.includes('treasury') && (
                      <NavItem
                        icon={Wallet}
                        label={t('nav.treasury', 'Tesorería')}
                        active={activeTab === 'treasury'}
                        onClick={() => setActiveTab('treasury')}
                        isDark={isDark}
                      />
                    )}
                    {!disabledFeatures.includes('reports') && (
                      <NavItem
                        icon={BarChart3}
                        label={t('nav.reports', 'Reportes y Balances')}
                        active={activeTab === 'reports'}
                        onClick={() => setActiveTab('reports')}
                        isDark={isDark}
                      />
                    )}
                    {!disabledFeatures.includes('alerts') && (
                      <NavItem
                        icon={AlertCircle}
                        label={t('nav.alerts', 'Alertas y Cobro')}
                        active={activeTab === 'alerts'}
                        onClick={() => setActiveTab('alerts')}
                        isDark={isDark}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>

        {/* User profile & Active version under */}
        <div className="mt-6 space-y-2">
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full text-left border rounded-xl p-2.5 flex items-center space-x-2.5 transition-all duration-200 cursor-pointer group",
              isDark 
                ? "bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700" 
                : "bg-slate-50 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 border transition-colors",
              isDark ? "border-slate-800 group-hover:border-indigo-400" : "border-slate-300 group-hover:border-indigo-500"
            )}>
              {settings?.useGoogleAvatar && user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : settings?.customProfilePic ? (
                <img src={settings.customProfilePic} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 shrink-0 capitalize text-xs">
                  {settings?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn(
                "text-xs font-bold truncate transition-colors",
                isDark ? "text-white group-hover:text-indigo-400" : "text-slate-800 group-hover:text-indigo-600"
              )}>
                {settings?.displayName || 'Usuario'}
              </div>
              <div className={cn(
                "text-[9px] font-bold uppercase tracking-wider truncate",
                isDark ? "text-slate-500" : "text-slate-400"
              )}>
                {settings?.companyName || 'Global Ops'}
              </div>
            </div>
          </button>
          
          {/* Active visible Version block instead of the absolute background text */}
          <div className={cn(
            "text-center text-[9px] font-black uppercase tracking-[0.22em] select-none py-1 border-t transition-colors",
            isDark 
              ? "text-slate-500 border-slate-850" 
              : "text-slate-400 border-slate-100"
          )}>
            {SYSTEM_UPDATES[0]?.version || 'V4.3.0'} • By Trennd
          </div>
        </div>
      </div>
    </aside>
  );
}
