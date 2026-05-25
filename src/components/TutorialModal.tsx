import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Tv, Wallet, Sparkles, BrainCircuit, Play, CheckCircle2, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';

export function TutorialModal() {
  const { settings, updateSettings } = useAuth();
  
  // Show tutorial if they are onboarded but haven't completed the tutorial yet
  const showTutorial = settings?.isOnboarded && !settings?.hasCompletedTutorial;
  
  const [currentStep, setCurrentStep] = useState(1);
  const isDark = settings?.theme === 'dark';

  if (!showTutorial) return null;

  const steps = [
    {
      id: 1,
      title: "Tablero Principal (Dashboard)",
      subtitle: "Panel de Comando Diario",
      icon: <BookOpen className="w-8 h-8 text-indigo-500" />,
      desc: "Su panel central le brinda una radiografía financiera en tiempo real. Aquí podrá monitorear su balance neto consolidado, las ventas del día, el rendimiento acumulado de su capital y el control de cobros de deudas pendientes.",
      tip: "💡 Consejo: Puede colapsar el menú lateral en cualquier dispositivo móvil usando el icono superior de hamburguesa para maximizar su campo táctil de lectura."
    },
    {
      id: 2,
      title: "Suscripciones y Cuentas Digitales",
      subtitle: "Control de Pantallas y Streaming",
      icon: <Tv className="w-8 h-8 text-emerald-500" />,
      desc: "Gestione Netflix, Disney+, Max y cuentas de streaming sin esfuerzo. Coordine los correos, contraseñas, PINs de perfiles, costos de proveedores y tarifas de reventa. El sistema calcula dinámicamente las fechas de vencimiento y genera avisos periódicos de cobranza.",
      tip: "⏰ Alerta de Vencimiento: Recibirá una notificación local automática cuando un servicio digital esté a 7 días o menos de vencer."
    },
    {
      id: 3,
      title: "Tesorería, Bancos y Tarjetas",
      subtitle: "Gestión de Múltiples Monederos",
      icon: <Wallet className="w-8 h-8 text-violet-500" />,
      desc: "Organice su dinero real tal como fluye. Divida su saldo disponible en cuentas de banco virtuales, billeteras digitales y efectivo físico. Administre los cupos utilizados y los saldos por pagar de sus tarjetas de crédito de forma consolidada.",
      tip: "📊 Transacciones: Use el libro diario de ingresos y egresos rápidos para mantener sus múltiplos de caja actualizados al centavo."
    },
    {
      id: 4,
      title: "Asistente Inteligente con IA",
      subtitle: "Registros Automáticos por Imagen o Chat",
      icon: <BrainCircuit className="w-8 h-8 text-indigo-400" />,
      desc: "¡Su mayor herramienta de productividad! Suba capturas de pantalla de chats de WhatsApp con sus revendedores o planillas de cobro del distribuidor directamente al asistente por chat. La Inteligencia Artificial analizará el contenido, extraerá los nombres, cuentas y saldos, y le sugerirá registrarlos con un solo click.",
      tip: "🧠 Súper Poderes: Además de capturas, puede preguntarle al Asistente cómo usar cualquier funcionalidad del sistema o guiar su flujo."
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await updateSettings({ hasCompletedTutorial: true });
    } catch (err) {
      console.error("Error completing tutorial:", err);
    }
  };

  const stepInfo = steps[currentStep - 1];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        {/* Backdrop visual de enfoque */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
        />

        {/* Tarjeta del Tutorial */}
        <motion.div
          initial={{ scale: 0.9, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 10, opacity: 0 }}
          className={cn(
            "relative w-full max-w-lg p-6 sm:p-8 rounded-[2rem] border shadow-2xl flex flex-col text-left overflow-hidden",
            isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          )}
        >
          {/* Luces sutiles de fondo */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex justify-between items-center mb-6 shrink-0 relative z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 font-extrabold">
                Guía Rápida de Bienvenida
              </span>
            </div>
            <button
              onClick={handleComplete}
              title="Cerrar y omitir tutorial"
              className={cn(
                "p-1.5 rounded-full border transition-all cursor-pointer",
                isDark ? "text-slate-400 border-slate-800 hover:bg-slate-800" : "text-slate-500 border-slate-100 hover:bg-slate-50"
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-6 shrink-0">
            <div 
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 my-2 min-h-[160px] relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-slate-500/5 border border-indigo-500/10 shrink-0">
                {stepInfo.icon}
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">{stepInfo.subtitle}</span>
                <h3 className={cn("text-lg font-black tracking-tight", isDark ? "text-white" : "text-slate-950")}>
                  {stepInfo.title}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              {stepInfo.desc}
            </p>

            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold leading-relaxed">
              {stepInfo.tip}
            </div>
          </div>

          {/* Stepper Footer Controls */}
          <div className="mt-8 border-t border-slate-100 dark:border-slate-800/60 pt-4 flex items-center justify-between gap-3 shrink-0 relative z-10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Paso {currentStep} de {steps.length}
            </span>
            
            <div className="flex gap-2">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className={cn(
                    "px-4 py-3 border rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none",
                    isDark ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800" : "bg-white text-slate-550 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <ChevronLeft className="w-4 h-4" /> Atrás
                </button>
              )}
              
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none border border-indigo-500/25"
              >
                {currentStep === steps.length ? (
                  <>
                    ¡Entendido! <CheckCircle2 className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
