import React, { useState } from 'react';
import { DigitalServices } from './DigitalServices';
import { Transactions } from './Transactions';
import { PhysicalCommerce } from './PhysicalCommerce';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { ShoppingBag, Activity, Package } from 'lucide-react';

export function Ecommerce({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'suscripciones' | 'tramites' | 'fisico'>('suscripciones');
  const { settings } = useAuth();
  const isDark = settings?.theme === 'dark' || (settings?.theme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="flex flex-col h-full w-full">
      <div className={cn("px-4 pt-4 lg:px-8 lg:pt-8", isDark ? "bg-slate-900" : "bg-slate-50")}>
        <div className={cn("flex space-x-2 p-1 rounded-xl max-w-lg mx-auto overflow-x-auto", isDark ? "bg-slate-800" : "bg-white shadow-sm border border-slate-200")}>
          <button
            onClick={() => setActiveTab('suscripciones')}
            className={cn(
              "flex-1 whitespace-nowrap min-w-[120px] flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
              activeTab === 'suscripciones' 
                ? (isDark ? "bg-slate-700 text-white shadow" : "bg-slate-100 text-slate-900 shadow-sm") 
                : (isDark ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
            )}
          >
            <ShoppingBag className="w-4 h-4" />
            Suscripciones
          </button>
          <button
            onClick={() => setActiveTab('fisico')}
            className={cn(
              "flex-1 whitespace-nowrap min-w-[120px] flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
              activeTab === 'fisico' 
                ? (isDark ? "bg-slate-700 text-white shadow" : "bg-slate-100 text-slate-900 shadow-sm") 
                : (isDark ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
            )}
          >
            <Package className="w-4 h-4" />
            Físico/Inventario
          </button>
          <button
            onClick={() => setActiveTab('tramites')}
            className={cn(
              "flex-1 whitespace-nowrap min-w-[120px] flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
              activeTab === 'tramites' 
                ? (isDark ? "bg-slate-700 text-white shadow" : "bg-slate-100 text-slate-900 shadow-sm") 
                : (isDark ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
            )}
          >
            <Activity className="w-4 h-4" />
            Trámites
          </button>
        </div>
      </div>
      <div className="flex-1 w-full overflow-y-auto">
        {activeTab === 'suscripciones' && <DigitalServices />}
        {activeTab === 'fisico' && <PhysicalCommerce user={user} isDark={isDark} />}
        {activeTab === 'tramites' && <Transactions />}
      </div>
    </div>
  );
}
