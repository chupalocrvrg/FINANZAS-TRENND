/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MacDock } from './components/MacDock';
import { Dashboard } from './components/Dashboard';
import { CRM } from './components/CRM';
import { Transactions } from './components/Transactions';
import { Treasury } from './components/Treasury';
import { Alerts } from './components/Alerts';
import { Settings } from './components/Settings';
import { DigitalServices } from './components/DigitalServices';
import { Ecommerce } from './components/Ecommerce';
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { Onboarding } from './components/Onboarding';
import { AIAssistant } from './components/AIAssistant';
import { LockScreen } from './components/LockScreen';
import { WelcomeUpdateModal } from './components/WelcomeUpdateModal';
import { TutorialModal } from './components/TutorialModal';
import { ReportSelectorModal } from './components/ReportSelectorModal';
import { ClientPublicPortal } from './components/ClientPublicPortal';
import { FixDb } from './fixDb';
import { AsyncRunner } from './lib/asyncRunner';
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
  Settings as SettingsIcon, Gamepad2, 
  Activity, 
  Wallet, 
  AlertCircle, 
  BarChart3 
} from 'lucide-react';
import { cn } from './lib/utils';
import { db } from './lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { SYSTEM_UPDATES } from './data/updates';
import { Admin } from './components/Admin';

export default function App() {
  const { user, settings, loading, onboarding, impersonatedUser, impersonatedBy, impersonateUser } = useAuth();
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
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleGenerateReport = async (type: 'general' | 'custom', startDate?: string, endDate?: string) => {
    try {
      if (!user) return;
      const { generateBalanceSheetPDF } = await import('./lib/pdf');
      await generateBalanceSheetPDF(user.uid, settings?.companyName || 'Empresa', startDate, endDate);
    } catch (error) {
      alert("Error generando PDF: " + (error instanceof Error ? error.message : String(error)));
      console.error(error);
    }
  };

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
    // Close notifications when navigating via dock/tabs
    setIsNotificationsOpen(false);
  }, [settings?.disabledFeatures, activeTab]);  useEffect(() => {
    if (user) {
      requestNotificationPermission();
      setupMessageListener();
    }
  }, [user]);

  // Escuchar parámetros url (deep linking de notificaciones)
  useEffect(() => {
    const handleUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const searchParam = params.get('search');
      
      if (tabParam) {
        setActiveTab(tabParam);
        if (searchParam) {
          const decodedSearch = decodeURIComponent(searchParam);
          setTimeout(() => {
            const eventName = tabParam === 'services' ? 'app-search-filter' : 'app-alerts-filter';
            window.dispatchEvent(new CustomEvent(eventName, { detail: { search: decodedSearch } }));
          }, 400);
        }
        // Limpiar parámetros para no repetirlos al refrescar
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    };

    // Manejar eventos de navegación personalizados (notificaciones fallback)
    const handleCustomNav = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.tab) {
        setActiveTab(detail.tab);
        if (detail.search) {
          const decodedSearch = decodeURIComponent(detail.search);
          setTimeout(() => {
            const eventName = detail.tab === 'services' ? 'app-search-filter' : 'app-alerts-filter';
            window.dispatchEvent(new CustomEvent(eventName, { detail: { search: decodedSearch } }));
          }, 400);
        }
      }
    };

    // Manejar mensajes del Service Worker (Deep link clicks del Service Worker activo)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
        const targetUrl = event.data.url;
        const queryIdx = targetUrl.indexOf('?');
        if (queryIdx !== -1) {
          const query = targetUrl.substring(queryIdx + 1);
          const params = new URLSearchParams(query);
          const tabParam = params.get('tab');
          const searchParam = params.get('search');
          if (tabParam) {
            setActiveTab(tabParam);
            if (searchParam) {
              const decodedSearch = decodeURIComponent(searchParam);
              setTimeout(() => {
                const eventName = tabParam === 'services' ? 'app-search-filter' : 'app-alerts-filter';
                window.dispatchEvent(new CustomEvent(eventName, { detail: { search: decodedSearch } }));
              }, 400);
            }
          }
        }
      }
    };

    handleUrlParams();
    window.addEventListener('popstate', handleUrlParams);
    window.addEventListener('app-tab-navigation', handleCustomNav);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      window.removeEventListener('popstate', handleUrlParams);
      window.removeEventListener('app-tab-navigation', handleCustomNav);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

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

      AsyncRunner.runInBackground('tx_non_blocking_evaluation', () => {
        txSnap.docs.forEach(doc => {
          const tx = doc.data();
          const customerName = tx.intermediaryName || tx.finalClientName || 'Cliente';
          const description = `ANT: ${tx.finalClientName || 'Cliente Final'} (${tx.warehouse || 'Generico'})`;
          const sessionNotifKey = `notified_tx_${doc.id}`;

          if (!sessionStorage.getItem(sessionNotifKey)) {
            sendLocalPushNotification(
              'Cobranza ANT Pendiente 📈',
              `Recordatorio Pago: Trámite ${description} de ${customerName} por ${tx.chargedRate || 0} USD sigue impago.`,
              `/?tab=alerts&search=${encodeURIComponent(customerName)}`
            );
            sessionStorage.setItem(sessionNotifKey, 'true');
          }
        });
      });
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

      AsyncRunner.runInBackground('digital_services_notifications_check', () => {
        let count = 0;

        serSnap.docs.forEach(doc => {
          const ser = { id: doc.id, ...doc.data() } as any;
          if (ser.deletedFromModule) return;

          const nowAtStartOfDay = new Date();
          nowAtStartOfDay.setHours(0, 0, 0, 0);

          let isToday = false;
          let diffDays = -999;

          if (ser.expirationDate) {
            const expiry = new Date(ser.expirationDate);
            const diffTime = expiry.getTime() - now.getTime();
            diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const expDay = new Date(ser.expirationDate);
            expDay.setHours(0, 0, 0, 0);
            isToday = expDay.getTime() === nowAtStartOfDay.getTime();
          }

          const isOverduOrExp = ser.status === 'expired' || (diffDays !== -999 && diffDays < 0);

          if (isOverduOrExp || (diffDays !== -999 && diffDays <= 2)) {
            count++;

            const sessionNotifKey = `notified_expired_${ser.id}`;
            if (!sessionStorage.getItem(sessionNotifKey)) {
              const customerName = ser.clientName || 'Cliente';
              const serviceName = ser.name || 'Servicio';
              const extraEmail = ser.email || '';
              const searchKey = ser.email || ser.profileName || customerName;

              let title = 'Recordatorio Vencimiento ⚠️';
              let message = '';

              if (isToday) {
                title = 'Cuenta por Vencerse Hoy ⚠️';
                message = `Cuenta de cliente ${customerName} del servicio ${serviceName}${extraEmail ? `, con correo ${extraEmail},` : ''} vence el día de hoy.`;
              } else if (isOverduOrExp) {
                title = 'Servicio Expirado ❌';
                message = `Cuenta vencida de cliente ${customerName} del servicio ${serviceName}${extraEmail ? `, con correo ${extraEmail},` : ''} venció o expiró.`;
              } else {
                message = `Cuenta de cliente ${customerName} del servicio ${serviceName}${extraEmail ? `, con correo ${extraEmail},` : ''} vence pronto (en ${diffDays} días).`;
              }

              sendLocalPushNotification(
                title,
                message,
                `/?tab=services&search=${encodeURIComponent(searchKey)}`
              );
              sessionStorage.setItem(sessionNotifKey, 'true');
            }
          }
        });

        // Set state on main thread cleanly
        setSerAlertCount(count);
      });
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

  // Bypasess authentication checks for the public Customer Consultation Portal and individual vouchers
  const urlParams = new URLSearchParams(window.location.search);
  const portalView = urlParams.get('view');
  if (portalView === 'client-portal' || portalView === 'voucher') {
    return (
      <ClientPublicPortal 
        onBackToApp={user ? () => {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
          window.location.reload();
        } : undefined} 
      />
    );
  }

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
        --color-indigo-200: #a7f3d0 !important;
        --color-indigo-300: #6ee7b7 !important;
        --color-indigo-400: #34d399 !important;
        --color-indigo-500: #10b981 !important;
        --color-indigo-600: #059669 !important;
        --color-indigo-700: #047857 !important;
        --color-indigo-800: #065f46 !important;
        --color-indigo-900: #064e3b !important;
        --color-indigo-950: #022c22 !important;
      }
    `;
  } else if (accent === 'rose') {
    accentStyles = `
      :root {
        --color-indigo-50: #fff1f2 !important;
        --color-indigo-100: #ffe4e6 !important;
        --color-indigo-200: #fecdd3 !important;
        --color-indigo-300: #fda4af !important;
        --color-indigo-400: #fb7185 !important;
        --color-indigo-500: #f43f5e !important;
        --color-indigo-600: #e11d48 !important;
        --color-indigo-700: #be123c !important;
        --color-indigo-800: #9f1239 !important;
        --color-indigo-900: #881337 !important;
        --color-indigo-950: #4c0519 !important;
      }
    `;
  } else if (accent === 'amber') {
    accentStyles = `
      :root {
        --color-indigo-50: #fdfbeb !important;
        --color-indigo-100: #fef3c7 !important;
        --color-indigo-200: #fde68a !important;
        --color-indigo-300: #fcd34d !important;
        --color-indigo-400: #fbbf24 !important;
        --color-indigo-500: #f59e0b !important;
        --color-indigo-600: #d97706 !important;
        --color-indigo-700: #b45309 !important;
        --color-indigo-800: #92400e !important;
        --color-indigo-900: #78350f !important;
        --color-indigo-950: #451a03 !important;
      }
    `;
  } else if (accent === 'violet') {
    accentStyles = `
      :root {
        --color-indigo-50: #f5f3ff !important;
        --color-indigo-100: #ede9fe !important;
        --color-indigo-200: #ddd6fe !important;
        --color-indigo-300: #c4b5fd !important;
        --color-indigo-400: #a78bfa !important;
        --color-indigo-500: #8b5cf6 !important;
        --color-indigo-600: #7c3aed !important;
        --color-indigo-700: #6d28d9 !important;
        --color-indigo-800: #5b21b6 !important;
        --color-indigo-900: #4c1d95 !important;
        --color-indigo-950: #2e1065 !important;
      }
    `;
  } else if (accent === 'sky') {
    accentStyles = `
      :root {
        --color-indigo-50: #f0f9ff !important;
        --color-indigo-100: #e0f2fe !important;
        --color-indigo-200: #bae6fd !important;
        --color-indigo-300: #7dd3fc !important;
        --color-indigo-400: #38bdf8 !important;
        --color-indigo-500: #0ea5e9 !important;
        --color-indigo-600: #0284c7 !important;
        --color-indigo-700: #0369a1 !important;
        --color-indigo-800: #075985 !important;
        --color-indigo-900: #0c4a6e !important;
        --color-indigo-950: #0c4a6e !important;
      }
    `;
  } else if (accent === 'slate') {
    accentStyles = `
      :root {
        --color-indigo-50: #f8fafc !important;
        --color-indigo-100: #f1f5f9 !important;
        --color-indigo-200: #e2e8f0 !important;
        --color-indigo-300: #cbd5e1 !important;
        --color-indigo-400: #94a3b8 !important;
        --color-indigo-500: #64748b !important;
        --color-indigo-600: #475569 !important;
        --color-indigo-700: #334155 !important;
        --color-indigo-800: #1e293b !important;
        --color-indigo-900: #0f172a !important;
        --color-indigo-950: #0f172a !important;
      }
    `;
  }

  const uiStyle = settings?.uiStyle || 'plastic';
  const liquidGlassColor = settings?.liquidGlassColor || 'default';
  const isDarkMode = settings?.theme === 'dark' || (settings?.theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  let bgClass = '';
  if (uiStyle === 'liquid_glass') {
    const colorSuffix = liquidGlassColor === 'default' ? '' : `-${liquidGlassColor}`;
    bgClass = isDarkMode ? `bg-gradient-flow-dark${colorSuffix} text-slate-100` : `bg-gradient-flow-light${colorSuffix} text-slate-900`;
  } else {
    bgClass = isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  }

  // Inject dark class if in dark mode
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  if (uiStyle) {
    document.body.setAttribute('data-ui-style', uiStyle);
  }

  return (
    <div className={`flex min-h-screen ${bgClass} ${fontClass} overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900`}>
      {accentStyles && <style dangerouslySetInnerHTML={{ __html: accentStyles }} />}
      
      {/* Mac-style Desktop Dock, hidden on mobile */}
      <MacDock activeTab={activeTab} setActiveTab={setActiveTab} onOpenReports={() => setIsReportModalOpen(true)} onToggleNotifications={() => setIsNotificationsOpen(!isNotificationsOpen)} notifCount={notifCount} />
      
      <main className="flex-1 flex flex-col relative overflow-y-auto max-h-screen pb-32">
        {impersonatedUser && (
          <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs flex items-center justify-between shadow-md shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-slate-950 animate-ping"></span>
              <span>
                Simulación Activa: Interactuando con los datos de <strong className="underline">{impersonatedUser.displayName}</strong> ({impersonatedUser.email})
              </span>
            </div>
            <button
              onClick={() => impersonateUser(null)}
              className="bg-slate-950 hover:bg-slate-900 text-white font-black px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
            >
              Salir de Cuenta
            </button>
          </div>
        )}
        
        <AnimatePresence>
        {isNotificationsOpen && (
          <>
          <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsNotificationsOpen(false)} />
          <div className="fixed bottom-20 lg:bottom-32 right-4 lg:left-1/2 lg:-translate-x-1/2 lg:right-auto z-50 pointer-events-auto">
            <NotificationsPopover 
              onClose={() => setIsNotificationsOpen(false)} 
              onNavigate={(tab) => setActiveTab(tab)}
            />
          </div>
          </>
        )}
      </AnimatePresence>

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
              
              {activeTab === 'ecommerce' && <Ecommerce user={user} />}
              {activeTab === 'reports' && <Reports />}
              {activeTab === 'treasury' && <Treasury />}
              {activeTab === 'alerts' && <Alerts />}
              {activeTab === 'settings' && <Settings />}
              {activeTab === 'admin' && <Admin />}
            </motion.div>
          </AnimatePresence>
        </div>
        {!settings?.disabledFeatures?.includes('ai_assistant') && <AIAssistant />}
        <WelcomeUpdateModal theme={settings?.theme} />
        <FixDb user={user} />
        <TutorialModal />
        <ReportSelectorModal 
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onGenerate={handleGenerateReport}
          isDark={settings?.theme === 'dark' || (settings?.theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)}
        />
      </main>

          </div>
  );
}
