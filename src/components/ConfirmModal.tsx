import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDark?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar acción de eliminación",
  message = "¿Está seguro de que desea eliminar este registro? Esta acción es definitiva.",
  confirmText = "Eliminar de todos modos",
  cancelText = "Cancelar",
  isDark = false
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.3 }}
            className={cn(
              "relative w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl p-6 text-left z-10",
              isDark 
                ? "bg-slate-900 border-slate-800 text-white shadow-black/40" 
                : "bg-white border-slate-100 text-slate-800 shadow-slate-100/40"
            )}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className={cn(
                "absolute top-4 right-4 p-1 rounded-full transition-colors cursor-pointer",
                isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
              )}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header / Icon */}
            <div className="flex items-start gap-4 mt-1">
              <div className="flex-shrink-0 p-3 rounded-2xl bg-rose-500/10 text-rose-500">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className={cn("text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  {title}
                </h3>
                <p className={cn("text-xs leading-relaxed font-semibold", isDark ? "text-slate-400" : "text-slate-500")}>
                  {message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 mt-6 sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer text-center sm:min-w-[100px]",
                  isDark 
                    ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-white" 
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-lg shadow-rose-600/15 text-center active:scale-95 cursor-pointer sm:min-w-[120px] flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
