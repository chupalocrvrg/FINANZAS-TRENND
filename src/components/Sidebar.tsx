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
  
  const menuItems = [
    { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
    { id: 'crm', label: 'CRM Relaciones', icon: Users },
    { id: 'services', label: 'Servicios Digitales', icon: SettingsIcon },
    { id: 'updates', label: 'Actualizaciones ANT', icon: Activity },
    { id: 'treasury', label: 'Tesorería', icon: Wallet },
    { id: 'alerts', label: 'Alertas y Cobro', icon: AlertCircle },
    { id: 'settings', label: 'Configuración', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-slate-900 flex flex-col h-screen sticky top-0 border-r border-slate-800 text-slate-300 overflow-y-auto scrollbar-hide text-left">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-6">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white"></div>
          </div>
          <div className="overflow-hidden">
            <h1 className="font-extrabold text-white text-base tracking-tighter uppercase whitespace-nowrap truncate">
              {settings?.companyName || 'Control Financiero'}
            </h1>
          </div>
        </div>

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-3 mb-4">Control Financiero</div>
        <nav className="space-y-1">
          {menuItems.slice(0, 4).map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
            />
          ))}
        </nav>

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-3 mt-8 mb-4">Registro Personal</div>
        <nav className="space-y-1">
          {menuItems.slice(4).map((item) => (
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

      <div className="mt-auto p-4 border-t border-slate-800 bg-slate-900/50 sticky bottom-0">
        <div className="bg-slate-800/50 rounded-lg p-3 flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-700 shrink-0 capitalize">
            {settings?.displayName?.charAt(0) || user?.email?.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate break-all">{settings?.displayName || 'User'}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{settings?.companyName || 'Global Ops'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
