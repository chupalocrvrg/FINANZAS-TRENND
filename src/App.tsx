/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CRM } from './components/CRM';
import { Transactions } from './components/Transactions';
import { Treasury } from './components/Treasury';
import { Alerts } from './components/Alerts';
import { Settings } from './components/Settings';
import { DigitalServices } from './components/DigitalServices';
import { Login } from './components/Login';
import { Onboarding } from './components/Onboarding';
import { AIAssistant } from './components/AIAssistant';
import { useAuth } from './lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationsPopover } from './components/NotificationsPopover';
import { Bell, Menu, X, ChevronDown } from 'lucide-react';
import { cn } from './lib/utils';
import { db } from './lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function App() {
  const { user, settings, loading, onboarding } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!loading) {
      setIsLoaded(true);
    }
  }, [loading]);

  useEffect(() => {
    if (!user) return;

    // Escuchar transacciones impagas
    const qTxs = query(collection(db, 'transactions'), where('ownerId', '==', user.uid), where('isPaid', '==', false));
    const unsubTxs = onSnapshot(qTxs, (txSnap) => {
      const txCount = txSnap.size;

      // Escuchar servicios digitales
      const qSer = query(collection(db, 'digital_services'), where('ownerId', '==', user.uid));
      const unsubSer = onSnapshot(qSer, (serSnap) => {
        const now = new Date();
        let serAlertCount = 0;
        serSnap.docs.forEach(doc => {
          const ser = doc.data();
          if (ser.status === 'expired') {
            serAlertCount++;
          } else if (ser.expirationDate) {
            const expiry = new Date(ser.expirationDate);
            const diffTime = expiry.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 7) {
              serAlertCount++;
            }
          }
        });

        setNotifCount(txCount + serAlertCount);
      });

      return () => unsubSer();
    });

    return () => unsubTxs();
  }, [user]);

  if (!isLoaded) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"
      />
    </div>
  );

  if (!user) return <Login />;
  if (onboarding) return <Onboarding />;

  return (
    <div className={`flex min-h-screen ${settings?.theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900`}>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setIsMobileMenuOpen(false); }} />
      </div>
      
      <main className="flex-1 flex flex-col relative overflow-y-auto max-h-screen">
        {/* Top Navigation Bar */}
        <header className={cn(
          "h-16 border-b px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0",
          settings?.theme === 'dark' ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
        )}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg lg:text-xl font-bold tracking-tight truncate max-w-[150px] lg:max-w-none">
              {settings?.companyName || 'Control Financiero'}
            </h1>
            <span className="hidden sm:inline-block bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Live</span>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate:</span>
              <span className="text-sm font-mono font-bold tracking-tighter">$5.00</span>
            </div>
            <button 
              onClick={async () => {
                try {
                  const { generateBalanceSheetPDF } = await import('./lib/pdf');
                  await generateBalanceSheetPDF(user.uid, settings?.companyName || 'Empresa');
                } catch (error) {
                  alert("Error generando PDF");
                  console.error(error);
                }
              }}
              className="bg-indigo-600 text-white px-3 lg:px-4 py-1.5 lg:py-2 rounded text-[10px] lg:text-sm font-bold uppercase tracking-wider shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <span className="hidden sm:inline">Generar Estado de Cuenta</span>
              <span className="sm:hidden">Reporte</span>
            </button>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={cn(
                    "relative p-2 rounded-lg transition-colors",
                    isNotificationsOpen ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-indigo-600"
                  )}
                >
                  <Bell className="w-5 h-5" />
                  {notifCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-mono text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border-2 border-white shrink-0 animate-bounce">
                      {notifCount}
                    </span>
                  )}
                </button>
                
                <AnimatePresence>
                  {isNotificationsOpen && (
                    <NotificationsPopover onClose={() => setIsNotificationsOpen(false)} />
                  )}
                </AnimatePresence>
              </div>
              <div 
                onClick={() => setActiveTab('settings')}
                className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-colors"
                title="Settings"
              >
                {settings?.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="p-4 lg:p-0"
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'crm' && <CRM />}
              {activeTab === 'transactions' && <Transactions />} 
              {activeTab === 'updates' && <Transactions />}
              {activeTab === 'services' && <DigitalServices />}
              {activeTab === 'treasury' && <Treasury />}
              {activeTab === 'alerts' && <Alerts />}
              {activeTab === 'settings' && <Settings />}
            </motion.div>
          </AnimatePresence>
        </div>
        <AIAssistant />
      </main>
    </div>
  );
}
