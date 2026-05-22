import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Fingerprint, Lock, CheckCircle, AlertOctagon, LogOut } from 'lucide-react';
import { logout } from '../lib/firebase';

interface LockScreenProps {
  settings: any;
  onUnlock: () => void;
}

export function LockScreen({ settings, onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scanProgress, setScanProgress] = useState(0);

  // Auto trigger biometrics on mount if enabled
  useEffect(() => {
    if (settings?.biometricEnabled) {
      handleBiometricUnlock();
    }
  }, [settings]);

  const handleBiometricUnlock = () => {
    if (!settings?.biometricEnabled) return;
    setBiometricStatus('scanning');
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setBiometricStatus('success');
          setTimeout(() => {
            onUnlock();
          }, 450);
          return 100;
        }
        return prev + 15;
      });
    }, 100);
  };

  const handlePinInput = (num: number) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMessage('');

      // Auto-submit once 4 digits are entered
      if (nextPin.length === 4) {
        const expectedPin = settings?.securityPin || '0000';
        if (nextPin === expectedPin) {
          onUnlock();
        } else {
          setTimeout(() => {
            setErrorCount((prev) => prev + 1);
            setErrorMessage('PIN Incorrecto. Reinte de nuevo.');
            setPin('');
          }, 200);
        }
      }
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      handlePinInput(parseInt(e.key));
    } else if (e.key === 'Backspace') {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pin]);

  const isDark = settings?.theme === 'dark';

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-slate-950 text-white select-none">
      {/* Top Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-72 h-72 bg-purple-500 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-sm flex flex-col items-center justify-center"
      >
        {/* Core Shield Header */}
        <div className="relative mb-6">
          <div className="w-16 h-16 bg-slate-900 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-xl">
            {biometricStatus === 'scanning' ? (
              <Fingerprint className="w-8 h-8 text-indigo-400 animate-pulse" />
            ) : errorMessage ? (
              <AlertOctagon className="w-8 h-8 text-rose-500 animate-bounce" />
            ) : (
              <Lock className="w-7 h-7 text-indigo-400" />
            )}
          </div>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-slate-950 rounded-full animate-ping" />
        </div>

        {/* Corporate Title */}
        <h2 className="text-xl font-extrabold uppercase tracking-tight text-white mb-1">
          {settings?.companyName || 'Control Financiero'}
        </h2>
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 block mb-6">
          Bloqueo de Seguridad Activo
        </span>

        {/* PIN Indicators */}
        <div className="flex gap-4 justify-center mb-8">
          {[...Array(4)].map((_, i) => (
            <motion.div 
              key={i} 
              animate={errorMessage ? { x: [0, -4, 4, -4, 4, 0] } : {}}
              transition={{ duration: 0.3 }}
              className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center text-lg font-bold transition-all ${
                pin.length > i 
                  ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'border-slate-800 bg-slate-900 text-slate-500'
              }`}
            >
              {pin[i] ? '*' : ''}
            </motion.div>
          ))}
        </div>

        {/* Status Error Messages */}
        <AnimatePresence mode="wait">
          {errorMessage ? (
            <motion.p 
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className="text-rose-500 text-xs font-bold uppercase tracking-wider mb-6"
            >
              {errorMessage}
            </motion.p>
          ) : (
            <div className="h-6 mb-6" />
          )}
        </AnimatePresence>

        {/* Interactive Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full px-4 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button 
              key={num}
              type="button"
              onClick={() => handlePinInput(num)}
              className="h-14 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60 active:scale-95 rounded-2xl font-bold transition-all text-sm tracking-widest flex items-center justify-center cursor-pointer"
            >
              {num}
            </button>
          ))}
          
          {/* Action Left Button */}
          {settings?.biometricEnabled ? (
            <button 
              type="button"
              onClick={handleBiometricUnlock}
              title="Autenticar por Huella / FaceID"
              className="h-14 bg-indigo-950/40 hover:bg-indigo-950 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 flex flex-col gap-1 transition-all cursor-pointer active:scale-95"
            >
              <Fingerprint className="w-5 h-5" />
              <span className="text-[7px] font-black uppercase tracking-tighter">Biometría</span>
            </button>
          ) : (
            <div className="h-14" />
          )}

          {/* Zero Button */}
          <button 
            type="button"
            onClick={() => handlePinInput(0)}
            className="h-14 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60 rounded-2xl font-bold transition-all text-sm tracking-widest flex items-center justify-center cursor-pointer"
          >
            0
          </button>

          {/* Delete Button */}
          <button 
            type="button"
            onClick={() => setPin((prev) => prev.slice(0, -1))}
            className="h-14 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/60 rounded-2xl font-bold tracking-widest text-[9px] uppercase hover:text-rose-400 transition-colors cursor-pointer flex items-center justify-center"
          >
            Borrar
          </button>
        </div>

        {/* Biometrics Pulse scanning overlay modal */}
        <AnimatePresence>
          {biometricStatus === 'scanning' && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-slate-950/95 z-[1000] flex flex-col items-center justify-center"
            >
              <div className="relative flex items-center justify-center mb-6">
                {/* Outer pulsing scanning ring */}
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle cx="56" cy="56" r="48" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                  <circle cx="56" cy="56" r="48" stroke="#4338ca" strokeWidth="8" fill="transparent" 
                    strokeDasharray="301.6"
                    strokeDashoffset={301.6 - (301.6 * scanProgress) / 100}
                    className="transition-all duration-100"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Fingerprint className="w-12 h-12 text-indigo-500 animate-pulse" />
                </div>
              </div>

              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">AUTENTICANDO BIOMETRÍA</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1.5 font-bold">Iniciando protocolo FaceID / Sensor dactilar del navegador...</p>
              
              <button 
                type="button"
                onClick={() => setBiometricStatus('idle')}
                className="mt-8 text-[10px] font-black uppercase tracking-widest text-rose-500 border border-rose-500/20 px-4 py-2 rounded-xl bg-rose-500/5 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
              >
                Cancelar y usar PIN de respaldo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Disclaimers / Recover options */}
        <div className="mt-8 text-center">
          <p className="text-[9px] text-slate-500 uppercase tracking-widest">
            {settings?.biometricEnabled ? 'Desbloqueo Biométrico Habilitado' : 'PIN requerido obligatoriamente'}
          </p>
          
          <button 
            onClick={() => logout()}
            className="mt-4 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-400 transition-colors mx-auto cursor-pointer"
          >
            <LogOut className="w-3 h-3" /> Cerrar sesión actual
          </button>
        </div>
      </motion.div>
    </div>
  );
}
