/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Settings as SettingsIcon, 
  Activity, 
  Wallet, 
  AlertCircle,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';

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
  const disabledFeatures = settings?.disabledFeatures || [];
  
  const mainGroup = [
    { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
    { id: 'crm', label: 'CRM Relaciones', icon: Users, featureKey: 'crm' },
    { id: 'services', label: 'Servicios Digitales', icon: SettingsIcon, featureKey: 'services' },
    { id: 'updates', label: 'Actualizaciones ANT', icon: Activity, featureKey: 'updates' },
  ].filter(item => !item.featureKey || !disabledFeatures.includes(item.featureKey));

  const configGroup = [
    { id: 'treasury', label: 'Tesorería', icon: Wallet, featureKey: 'treasury' },
    { id: 'alerts', label: 'Alertas y Cobro', icon: AlertCircle, featureKey: 'alerts' },
    { id: 'settings', label: 'Configuración', icon: SettingsIcon },
  ].filter(item => !item.featureKey || !disabledFeatures.includes(item.featureKey));

  return (
    <aside className="w-72 bg-slate-950/90 lg:bg-slate-900 flex flex-col h-[calc(100vh-2rem)] lg:h-screen lg:rounded-none rounded-2xl my-4 ml-4 lg:my-0 lg:ml-0 sticky top-4 lg:top-0 border border-slate-800/80 lg:border-none lg:border-r text-slate-300 overflow-y-auto scrollbar-hide text-left shadow-2xl lg:shadow-none z-50">
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-8 border-b border-slate-800/50 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white"></div>
              </div>
              <div className="overflow-hidden">
                <h1 className="font-extrabold text-white text-base tracking-tighter uppercase whitespace-nowrap truncate">
                  {settings?.companyName || 'Control Financiero'}
                </h1>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400/80 px-3 mb-3.5">Módulos Administrativos</div>
          <nav className="space-y-1">
            {mainGroup.map((item) => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </nav>

          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400/80 px-3 mt-8 mb-3.5">Configuración y Alertas</div>
          <nav className="space-y-1">
            {configGroup.map((item) => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </nav>
        </div>

        <div className="mt-8">
          <div className="bg-slate-900 border border-slate-800/60 rounded-xl p-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-slate-700">
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
              <div className="text-sm font-semibold text-white truncate break-all">{settings?.displayName || 'User'}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{settings?.companyName || 'Global Ops'}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
