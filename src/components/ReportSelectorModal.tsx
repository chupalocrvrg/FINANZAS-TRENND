import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Calendar, Download, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ReportSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (type: 'general' | 'custom', startDate?: string, endDate?: string) => Promise<void>;
  isDark?: boolean;
}

export function ReportSelectorModal({
  isOpen,
  onClose,
  onGenerate,
  isDark = false
}: ReportSelectorModalProps) {
  const [reportType, setReportType] = useState<'general' | 'custom'>('general');
  // Initialize with some sensible dates (e.g., start of current month to today, or blank)
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonthStr = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  })();

  const [startDate, setStartDate] = useState(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGenerateClick = async () => {
    setErrorMessage('');
    if (reportType === 'custom') {
      if (!startDate) {
        setErrorMessage('Por favor seleccione una fecha de inicio.');
        return;
      }
      if (!endDate) {
        setErrorMessage('Por favor seleccione una fecha de fin.');
        return;
      }
      if (startDate > endDate) {
        setErrorMessage('La fecha de inicio no puede ser posterior a la fecha de fin.');
        return;
      }
    }

    setIsGenerating(true);
    try {
      if (reportType === 'general') {
        await onGenerate('general');
      } else {
        await onGenerate('custom', startDate, endDate);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage('Ocurrió un error al generar el reporte. Por favor intente nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.3 }}
            className={cn(
              "relative w-full max-w-lg overflow-hidden rounded-3xl border shadow-2xl p-6 text-left z-10",
              isDark 
                ? "bg-slate-900 border-slate-800 text-white shadow-black/40" 
                : "bg-white border-slate-100 text-slate-850 shadow-slate-100/40"
            )}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              disabled={isGenerating}
              className={cn(
                "absolute top-4 right-4 p-1 rounded-full transition-colors cursor-pointer disabled:opacity-50",
                isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
              )}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <div className="space-y-1 mb-6">
              <h3 className={cn("text-lg font-bold uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                Generar Estado de Cuenta
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Seleccione la modalidad del reporte financiero en PDF para descargar.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold leading-relaxed">
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Options Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Option 1: General Report */}
              <button
                type="button"
                onClick={() => setReportType('general')}
                disabled={isGenerating}
                className={cn(
                  "p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-40 cursor-pointer group active:scale-[0.98]",
                  reportType === 'general'
                    ? (isDark 
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 ring-2 ring-indigo-500/20" 
                        : "bg-indigo-50 border-indigo-600 text-indigo-700 ring-2 ring-indigo-600/15")
                    : (isDark 
                        ? "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700" 
                        : "bg-slate-50/50 border-slate-205 text-slate-600 hover:border-slate-300")
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
                  reportType === 'general'
                    ? "bg-indigo-600 text-white"
                    : (isDark ? "bg-slate-900 text-slate-400" : "bg-white border text-slate-500")
                )}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={cn("text-xs font-black uppercase tracking-wider", reportType === 'general' ? (isDark ? "text-indigo-400" : "text-indigo-900") : (isDark ? "text-slate-200" : "text-slate-800"))}>
                    Reporte General
                  </h4>
                  <p className="text-[10px] leading-relaxed opacity-80 mt-1 font-semibold">
                    Muestra todos los movimientos y saldos acumulados históricamente en el sistema.
                  </p>
                </div>
              </button>

              {/* Option 2: Custom Report */}
              <button
                type="button"
                onClick={() => setReportType('custom')}
                disabled={isGenerating}
                className={cn(
                  "p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-40 cursor-pointer group active:scale-[0.98]",
                  reportType === 'custom'
                    ? (isDark 
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 ring-2 ring-indigo-500/20" 
                        : "bg-indigo-50 border-indigo-600 text-indigo-700 ring-2 ring-indigo-600/15")
                    : (isDark 
                        ? "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700" 
                        : "bg-slate-50/50 border-slate-205 text-slate-600 hover:border-slate-300")
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
                  reportType === 'custom'
                    ? "bg-indigo-600 text-white"
                    : (isDark ? "bg-slate-900 text-slate-400" : "bg-white border text-slate-500")
                )}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={cn("text-xs font-black uppercase tracking-wider", reportType === 'custom' ? (isDark ? "text-indigo-400" : "text-indigo-900") : (isDark ? "text-slate-200" : "text-slate-800"))}>
                    Reporte Personalizado
                  </h4>
                  <p className="text-[10px] leading-relaxed opacity-80 mt-1 font-semibold">
                    Permite definir un rango de fechas específico para auditar solo los movimientos de ese período.
                  </p>
                </div>
              </button>
            </div>

            {/* Date Picker Drawer */}
            <AnimatePresence>
              {reportType === 'custom' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mb-6"
                >
                  <div className={cn(
                    "p-4 rounded-2xl border flex flex-col gap-3",
                    isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
                  )}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">intervalo de fechas</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Fecha Inicio</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          disabled={isGenerating}
                          className={cn(
                            "w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner",
                            isDark ? "bg-slate-900 border-slate-850 text-white" : "bg-white border-slate-205 text-slate-850"
                          )}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Fecha Fin</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          disabled={isGenerating}
                          className={cn(
                            "w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner",
                            isDark ? "bg-slate-900 border-slate-850 text-white" : "bg-white border-slate-205 text-slate-850"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end border-t pt-5 border-slate-500/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer text-center sm:min-w-[100px] disabled:opacity-50",
                  isDark 
                    ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-white" 
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerateClick}
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-lg shadow-indigo-600/15 text-center active:scale-95 cursor-pointer sm:min-w-[150px] flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Descargar PDF
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
