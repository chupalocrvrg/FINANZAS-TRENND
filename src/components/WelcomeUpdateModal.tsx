import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, ChevronRight, CheckCircle2, ShieldAlert, Sparkle, LayoutDashboard } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';

interface WelcomeUpdateModalProps {
  theme?: 'light' | 'dark' | 'system';
}

export function WelcomeUpdateModal({ theme }: WelcomeUpdateModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useAuth();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Determinamos el ID de versión actual y la fecha de hoy para guardarlo en localStorage
  // Formato de Versión: 25.5.26 (Año 2026, mes 5, día 25)
  const CURRENT_VERSION_ID = 'v_25_5_26_welcome';

  useEffect(() => {
    if (!settings) return;

    // Solo se debe activar si es el primer inicio de sesión del día para esta actualización
    const todayStr = new Date().toISOString().split('T')[0]; // "2026-05-25"
    const storageKey = `welcome_notified_${todayStr}_${CURRENT_VERSION_ID}`;

    const alreadyNotifiedToday = localStorage.getItem(storageKey);

    if (!alreadyNotifiedToday) {
      // Mostrar popup con retraso elegante de 1.5s
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [settings]);

  const handleClose = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const storageKey = `welcome_notified_${todayStr}_${CURRENT_VERSION_ID}`;
    localStorage.setItem(storageKey, 'true');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop con desenfoque de fondo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className={cn(
              "relative w-full max-w-lg p-6 sm:p-8 rounded-[2rem] border shadow-2xl flex flex-col text-left overflow-hidden",
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            {/* Decora Glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Icon & Close */}
            <div className="flex justify-between items-start mb-6 position-relative shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/25">
                <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              </div>
              <button
                onClick={handleClose}
                className={cn(
                  "p-2 rounded-full transition-all border shrink-0",
                  isDark ? "text-slate-400 border-slate-800 hover:bg-slate-800" : "text-slate-500 border-slate-100 hover:bg-slate-50"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title / Version */}
            <div className="mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400">
                ¡Actualizaciones del Sistema Listas!
              </span>
              <h2 className={cn("text-2xl font-black tracking-tight mt-1", isDark ? "text-white" : "text-slate-950")}>
                Versión 25.5.26 Aplicada 🎉
              </h2>
              <p className="text-xs text-slate-450 dark:text-slate-400 font-medium">
                Compilación Segura del {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* List of changes */}
            <div className="space-y-4 my-2 overflow-y-auto max-h-[40vh] pr-1 scrollbar-hide flex-1">
              {/* Highlight 1 */}
              <div className="flex gap-3 items-start">
                <div className="h-6 w-6 rounded-lg bg-emerald-500/15 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className={cn("text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200")}>
                    Módulos Adaptativos (Habilitar/Deshabilitar)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                    Ahora puede encender o apagar de forma instantánea cualquier vista o funcionalidad del sistema. Si solo vende streaming, desactive la sección ANT de trámites en el apartado de **Configuración &gt; Información** para optimizar visualmente su panel de navegación.
                  </p>
                </div>
              </div>

              {/* Highlight 2 */}
              <div className="flex gap-3 items-start">
                <div className="h-6 w-6 rounded-lg bg-indigo-500/15 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0">
                  <Sparkle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className={cn("text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200")}>
                    Asistente IA Todo Terreno 🧠
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-semibold">
                    El Asistente Virtual ahora también es tu manual interactivo. Además de registrar transacciones escribiendo por chat, puedes consultarle acerca del funcionamiento, navegación y flujos del sistema si alguna vez te sientes perdido.
                  </p>
                </div>
              </div>

              {/* Highlight 3 */}
              <div className="flex gap-3 items-start">
                <div className="h-6 w-6 rounded-lg bg-pink-500/15 dark:bg-pink-500/20 flex items-center justify-center text-pink-600 dark:text-pink-400 mt-0.5 shrink-0">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className={cn("text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200")}>
                    Inmunidad contra Inyecciones (SQLi)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                    Hemos reforzado el protocolo de base de datos con reglas estrictas de Google Firebase Firestore. El procesamiento de tus ventas está totalmente a salvo de hackeos por inyección de código ordinaria.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="mt-6 border-t border-slate-100 dark:border-slate-800/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest sm:block hidden">
                ¡Gracias por usar nuestro sistema!
              </span>
              <button
                onClick={handleClose}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer select-none border border-indigo-500/25"
              >
                Comenzar Jornada <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
