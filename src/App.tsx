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
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { Onboarding } from './components/Onboarding';
import { AIAssistant } from './components/AIAssistant';
import { QuickAddFAB } from './components/QuickAddFAB';
import { LockScreen } from './components/LockScreen';
import { WelcomeUpdateModal } from './components/WelcomeUpdateModal';
import { TutorialModal } from './components/TutorialModal';
import { useAuth } from './lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationsPopover } from './components/NotificationsPopover';
import { requestNotificationPermission, setupMessageListener, sendLocalPushNotification } from './lib/notifications';
import { 
  Bell, 
  Menu, 
  X, 
  ChevronDown, 
  LayoutDashboard, 
  ShoppingBag, 
  Coins, 
  Users, 
  Settings as SettingsIcon, 
  Activity, 
  Wallet, 
  AlertCircle, 
  BarChart3 
} from 'lucide-react';
import { cn } from './lib/utils';
import { db } from './lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { SYSTEM_UPDATES } from './data/updates';

export default function App() {
  const { user, settings, loading, onboarding } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [serAlertCount, setSerAlertCount] = useState(0);
  const [isLocked, setIsLocked] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<'comercio' | 'finanzas' | null>(null);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Monitor dynamic network connection state
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Combine counts for notifications
  useEffect(() => {
    setNotifCount(txCount + serAlertCount);
  }, [txCount, serAlertCount]);

  useEffect(() => {
    if (!loading) {
      setIsLoaded(true);
    }
  }, [loading]);

  // Redirigir a dashboard si la pestaña actual fue deshabilitada en la configuración
  useEffect(() => {
    const disabledFeatures = settings?.disabledFeatures || [];
    if (disabledFeatures.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [settings?.disabledFeatures, activeTab]);

  useEffect(() => {
    if (user) {
      requestNotificationPermission();
      setupMessageListener();
    }
  }, [user]);

  // Temporizador de inactividad que bloquea el sistema
  useEffect(() => {
    if (!user || onboarding || !settings) return;

    // Obtener los minutos del temporizador configurado (por defecto 5, 0 significa desactivado)
    const minutes = settings.autoLockTimer ?? 5;
    if (minutes === 0) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsLocked(true);
      }, minutes * 60 * 1000);
    };

    // Registrar detectores de eventos de actividad directos
    const userEvents = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    userEvents.forEach((ev) => window.addEventListener(ev, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      userEvents.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [user, onboarding, settings?.autoLockTimer, settings]);

  // Escuchar transacciones impagas
  useEffect(() => {
    if (!user) return;

    const qTxs = query(collection(db, 'transactions'), where('ownerId', '==', user.uid), where('isPaid', '==', false));
    const unsubTxs = onSnapshot(qTxs, (txSnap) => {
      setTxCount(txSnap.size);
    }, (error) => {
      console.error("Error listening transactions:", error);
    });

    return () => unsubTxs();
  }, [user]);

  // Escuchar servicios digitales
  useEffect(() => {
    if (!user) return;

    const qSer = query(collection(db, 'digital_services'), where('ownerId', '==', user.uid));
    const unsubSer = onSnapshot(qSer, (serSnap) => {
      const now = new Date();
      let count = 0;
      let approachingServices: string[] = [];

      serSnap.docs.forEach(doc => {
        const ser = doc.data();
        if (ser.status === 'expired') {
          count++;
        } else if (ser.expirationDate) {
          const expiry = new Date(ser.expirationDate);
          const diffTime = expiry.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 7) {
            count++;
            approachingServices.push(ser.name);
          }
        }
      });

      // Trigger push notification once per session if there are expirations approaching
      if (approachingServices.length > 0 && !sessionStorage.getItem('expiration_notified')) {
         sendLocalPushNotification(
           'Aviso de Vencimiento ⚠️', 
           `Tienes ${approachingServices.length} servicios por vencer pronto (Ej: ${approachingServices[0]}).`
         );
         sessionStorage.setItem('expiration_notified', 'true');
      }

      setSerAlertCount(count);
    }, (error) => {
      console.error("Error listening digital services:", error);
    });

    return () => unsubSer();
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
  if (isLocked) return <LockScreen settings={settings} onUnlock={() => setIsLocked(false)} />;

  const fontClass = settings?.fontFamily === 'outfit' ? 'font-outfit' :
                    settings?.fontFamily === 'mono' ? 'font-mono' :
                    settings?.fontFamily === 'space' ? 'font-space' :
                    settings?.fontFamily === 'playfair' ? 'font-playfair' : 'font-sans';

  const accent = settings?.accentColor || 'indigo';
  let accentStyles = '';
  if (accent === 'emerald') {
    accentStyles = `
      :root {
        --color-indigo-50: #ecfdf5 !important;
        --color-indigo-100: #d1fae5 !important;
        --color-indigo-500: #10b981 !important;
        --color-indigo-600: #059669 !important;
        --color-indigo-700: #047857 !important;
        --color-indigo-950: #022c22 !important;
      }
    `;
  } else if (accent === 'rose') {
    accentStyles = `
      :root {
        --color-indigo-50: #fff1f2 !important;
        --color-indigo-100: #ffe4e6 !important;
        --color-indigo-500: #f43f5e !important;
        --color-indigo-600: #e11d48 !important;
        --color-indigo-700: #be123c !important;
        --color-indigo-950: #4c0519 !important;
      }
    `;
  } else if (accent === 'amber') {
    accentStyles = `
      :root {
        --color-indigo-50: #fdfbeb !important;
        --color-indigo-100: #fef3c7 !important;
        --color-indigo-500: #f59e0b !important;
        --color-indigo-600: #d97706 !important;
        --color-indigo-700: #b45309 !important;
        --color-indigo-950: #451a03 !important;
      }
    `;
  } else if (accent === 'violet') {
    accentStyles = `
      :root {
        --color-indigo-50: #f5f3ff !important;
        --color-indigo-100: #ede9fe !important;
        --color-indigo-500: #8b5cf6 !important;
        --color-indigo-600: #7c3aed !important;
        --color-indigo-700: #6d28d9 !important;
        --color-indigo-950: #2e1065 !important;
      }
    `;
  } else if (accent === 'sky') {
    accentStyles = `
      :root {
        --color-indigo-50: #f0f9ff !important;
        --color-indigo-100: #e0f2fe !important;
        --color-indigo-500: #0ea5e9 !important;
        --color-indigo-600: #0284c7 !important;
        --color-indigo-700: #0369a1 !important;
        --color-indigo-950: #0c4a6e !important;
      }
    `;
  } else if (accent === 'slate') {
    accentStyles = `
      :root {
        --color-indigo-50: #f8fafc !important;
        --color-indigo-100: #f1f5f9 !important;
        --color-indigo-500: #64748b !important;
        --color-indigo-600: #475569 !important;
        --color-indigo-700: #334155 !important;
        --color-indigo-950: #0f172a !important;
      }
    `;
  }

  return (
    <div className={`flex min-h-screen ${settings?.theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} ${fontClass} overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900`}>
      {accentStyles && <style dangerouslySetInnerHTML={{ __html: accentStyles }} />}
      
      {/* Desktop Sidebar, hidden on mobile */}
      <div 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={cn(
          "hidden lg:block lg:relative shrink-0 border-r border-slate-800/20 dark:border-slate-800/80 transition-all duration-300 ease-in-out z-30",
          isSidebarHovered ? "w-60" : "w-16"
        )}
      >
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); }} isHovered={isSidebarHovered} />
      </div>
      
      <main className="flex-1 flex flex-col relative overflow-y-auto max-h-screen">
        {/* Top Navigation Bar */}
        <header className={cn(
          "h-16 border-b px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0",
          settings?.theme === 'dark' ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
        )}>
          <div className="flex items-center gap-4">
            <h1 className="text-lg lg:text-xl font-bold tracking-tight truncate max-w-[150px] lg:max-w-none">
              {settings?.companyName || 'Control Financiero'}
            </h1>
            {isOnline ? (
              <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-100/80 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Sincronizado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                Modo Offline Activo
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
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
                    <NotificationsPopover 
                      onClose={() => setIsNotificationsOpen(false)} 
                      onNavigate={(tab) => setActiveTab(tab)}
                    />
                  )}
                </AnimatePresence>
              </div>
              <div 
                onClick={() => setActiveTab('settings')}
                className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer border border-slate-200 dark:border-slate-800 hover:opacity-80 transition-opacity"
                title="Settings"
              >
                {settings?.useGoogleAvatar && user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : settings?.customProfilePic ? (
                  <img src={settings.customProfilePic} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold border border-indigo-100 uppercase text-xs">
                    {settings?.displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 pb-24 lg:pb-12">
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
              {activeTab === 'reports' && <Reports />}
              {activeTab === 'treasury' && <Treasury />}
              {activeTab === 'alerts' && <Alerts />}
              {activeTab === 'settings' && <Settings />}
            </motion.div>
          </AnimatePresence>
        </div>
        {!settings?.disabledFeatures?.includes('ai_assistant') && <AIAssistant />}
        <QuickAddFAB />
        <WelcomeUpdateModal theme={settings?.theme} />
        <TutorialModal />
      </main>

      {/* Mobile Floating Submenus */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Click-outside backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 lg:hidden"
            />
            
            {/* Submenu Drawer content */}
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "fixed bottom-18 left-4 right-4 rounded-2xl p-4 z-40 lg:hidden shadow-[0_-8px_32px_rgba(0,0,0,0.3)] border flex flex-col gap-1.5",
                settings?.theme === 'dark' 
                  ? "bg-slate-900 border-slate-800 text-slate-100" 
                  : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-800/10 dark:border-slate-800/80">
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500">
                  {mobileMenuOpen === 'comercio' ? 'Módulo Comercio' : 'Módulo Finanzas'}
                </h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Seleccionar</span>
              </div>
              
              {mobileMenuOpen === 'comercio' ? (
                <div className="grid grid-cols-1 gap-1">
                  {!settings?.disabledFeatures?.includes('crm') && (
                    <button
                      onClick={() => { setActiveTab('crm'); setMobileMenuOpen(null); }}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                        activeTab === 'crm' 
                          ? "bg-indigo-600/10 text-indigo-400 font-semibold" 
                          : "hover:bg-slate-800/10 dark:hover:bg-slate-800/40 text-slate-400 dark:text-slate-300"
                      )}
                    >
                      <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm">CRM Relaciones</span>
                        <span className="text-[10px] text-slate-400 truncate">Contactos y clientes registrados</span>
                      </div>
                    </button>
                  )}
                  {!settings?.disabledFeatures?.includes('services') && (
                    <button
                      onClick={() => { setActiveTab('services'); setMobileMenuOpen(null); }}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                        activeTab === 'services' 
                          ? "bg-indigo-600/10 text-indigo-400 font-semibold" 
                          : "hover:bg-slate-800/10 dark:hover:bg-slate-800/40 text-slate-400 dark:text-slate-300"
                      )}
                    >
                      <SettingsIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm">Servicios Digitales</span>
                        <span className="text-[10px] text-slate-400 truncate">Suscripciones, fechas y cortes</span>
                      </div>
                    </button>
                  )}
                  {!settings?.disabledFeatures?.includes('updates') && (
                    <button
                      onClick={() => { setActiveTab('updates'); setMobileMenuOpen(null); }}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                        activeTab === 'updates' 
                          ? "bg-indigo-600/10 text-indigo-400 font-semibold" 
                          : "hover:bg-slate-800/10 dark:hover:bg-slate-800/40 text-slate-400 dark:text-slate-300"
                      )}
                    >
                      <Activity className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm">Actualizaciones ANT</span>
                        <span className="text-[10px] text-slate-400 truncate">Movimientos de cuentas y cobros</span>
                      </div>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1">
                  {!settings?.disabledFeatures?.includes('treasury') && (
                    <button
                      onClick={() => { setActiveTab('treasury'); setMobileMenuOpen(null); }}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                        activeTab === 'treasury' 
                          ? "bg-indigo-600/10 text-indigo-400 font-semibold" 
                          : "hover:bg-slate-800/10 dark:hover:bg-slate-800/40 text-slate-400 dark:text-slate-300"
                      )}
                    >
                      <Wallet className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm">Tesorería</span>
                        <span className="text-[10px] text-slate-400 truncate">Caja general y billeteras</span>
                      </div>
                    </button>
                  )}
                  {!settings?.disabledFeatures?.includes('reports') && (
                    <button
                      onClick={() => { setActiveTab('reports'); setMobileMenuOpen(null); }}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                        activeTab === 'reports' 
                          ? "bg-indigo-600/10 text-indigo-400 font-semibold" 
                          : "hover:bg-slate-800/10 dark:hover:bg-slate-800/40 text-slate-400 dark:text-slate-300"
                      )}
                    >
                      <BarChart3 className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm">Reportes y Balances</span>
                        <span className="text-[10px] text-slate-400 truncate">Gráficos de pérdidas y balances</span>
                      </div>
                    </button>
                  )}
                  {!settings?.disabledFeatures?.includes('alerts') && (
                    <button
                      onClick={() => { setActiveTab('alerts'); setMobileMenuOpen(null); }}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                        activeTab === 'alerts' 
                          ? "bg-indigo-600/10 text-indigo-400 font-semibold" 
                          : "hover:bg-slate-800/10 dark:hover:bg-slate-800/40 text-slate-400 dark:text-slate-300"
                      )}
                    >
                      <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm">Alertas y Cobro</span>
                        <span className="text-[10px] text-slate-400 truncate">Cuentas por cobrar y notificaciones</span>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around px-2 z-40 lg:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.15)] pb-safe",
        settings?.theme === 'dark' ? "bg-slate-900/95 border-slate-800/80 text-slate-300" : "bg-white/95 border-slate-200 text-slate-600"
      )}>
        {/* Inicio Tab */}
        <button
          onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(null); }}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors focus:outline-none",
            activeTab === 'dashboard' ? "text-indigo-500 font-bold" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5 shrink-0" />
          <span className="text-[9px] font-bold tracking-tight">Inicio</span>
        </button>

        {/* Comercio Tab */}
        <button
          onClick={() => setMobileMenuOpen(mobileMenuOpen === 'comercio' ? null : 'comercio')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors relative focus:outline-none",
            ['crm', 'services', 'updates'].includes(activeTab) || mobileMenuOpen === 'comercio'
              ? "text-indigo-500 font-semibold" 
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          <ShoppingBag className="w-5 h-5 mb-0.5 shrink-0" />
          <span className="text-[9px] font-bold tracking-tight">Comercio</span>
          {['crm', 'services', 'updates'].includes(activeTab) && (
            <span className="absolute bottom-1 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
          )}
        </button>

        {/* Finanzas Tab */}
        <button
          onClick={() => setMobileMenuOpen(mobileMenuOpen === 'finanzas' ? null : 'finanzas')}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors relative focus:outline-none",
            ['treasury', 'reports', 'alerts'].includes(activeTab) || mobileMenuOpen === 'finanzas'
              ? "text-indigo-500 font-semibold" 
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          <Coins className="w-5 h-5 mb-0.5 shrink-0" />
          <span className="text-[9px] font-bold tracking-tight">Finanzas</span>
          {['treasury', 'reports', 'alerts'].includes(activeTab) && (
            <span className="absolute bottom-1 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
          )}
        </button>

        {/* Perfil Tab */}
        <button
          onClick={() => { setActiveTab('settings'); setMobileMenuOpen(null); }}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors focus:outline-none",
            activeTab === 'settings' ? "text-indigo-500 font-bold" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <div className={cn(
            "w-6 h-6 rounded-full overflow-hidden flex items-center justify-center border mb-0.5 shrink-0 transition-colors",
            activeTab === 'settings' ? "border-indigo-500" : "border-slate-700/60"
          )}>
            {settings?.useGoogleAvatar && user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : settings?.customProfilePic ? (
              <img src={settings.customProfilePic} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-700 shrink-0 capitalize">
                {settings?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <span className="text-[9px] font-bold tracking-tight">Perfil</span>
        </button>
      </div>
    </div>
  );
}
