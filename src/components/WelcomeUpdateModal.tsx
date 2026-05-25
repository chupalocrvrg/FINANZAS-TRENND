import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { SYSTEM_UPDATES } from '../data/updates';

interface WelcomeUpdateModalProps {
  theme?: 'light' | 'dark' | 'system';
}

export function WelcomeUpdateModal({ theme }: WelcomeUpdateModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useAuth();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Determinamos el ID de versión actual y la fecha de hoy para guardarlo en localStorage
  // Obtenido dinámicamente de la última actualización listada
  const CURRENT_VERSION_ID = SYSTEM_UPDATES[0]?.id || 'v_welcome_default';

  useEffect(() => {
    if (!settings) return;

    // Solo se debe activar si es el primer inicio de sesión del día para esta actualización
    const todayStr = new Date().toISOString().split('T')[0]; // "2026-05-25"
    const storageKey = `welcome_notified_${todayStr}_${CURRENT_VERSION_ID}`;

    const alreadyNotifiedToday = localStorage.getItem(storageKey);

    if (!alreadyNotifiedToday) {
      // Mostrar popup con retraso elegante de 1.2s
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [settings, CURRENT_VERSION_ID]);

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
                  "p-2 rounded-full transition-all border shrink-0 cursor-pointer",
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
              <h2 className={cn("text-xl font-black tracking-tight mt-1", isDark ? "text-white" : "text-slate-950")}>
                {SYSTEM_UPDATES[0]?.version || "Versión Reciente"} Aplicada 🎉
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                Compilación Segura del {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* List of changes */}
            <div className="space-y-4 my-2 overflow-y-auto max-h-[40vh] pr-1 scrollbar-hide flex-1">
              {SYSTEM_UPDATES.slice(0, 4).map((item) => {
                let badgeClass = "bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400";
                if (item.type === 'security') badgeClass = "bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-450";
                if (item.type === 'feature') badgeClass = "bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400";
                if (item.type === 'interface') badgeClass = "bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400";

                return (
                  <div key={item.id} className="flex gap-3 items-start">
                    <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center mt-0.5 shrink-0 text-xs font-black", badgeClass)}>
                      ✓
                    </div>
                    <div>
                      <h4 className={cn("text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200")}>
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed font-semibold">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Action Button */}
            <div className="mt-6 border-t border-slate-100 dark:border-slate-800/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest sm:block hidden">
                ¡Gracias por su confianza!
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
