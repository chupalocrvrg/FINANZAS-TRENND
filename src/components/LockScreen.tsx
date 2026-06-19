import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Fingerprint, Lock, CheckCircle, AlertOctagon, LogOut, KeyRound, Check } from 'lucide-react';
import { logout, signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { addSecurityAuditLog } from '../lib/utils';

interface LockScreenProps {
  settings: any;
  onUnlock: () => void;
}

export function LockScreen({ settings, onUnlock }: LockScreenProps) {
  const { updateSettings } = useAuth();
  const [pin, setPin] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scanProgress, setScanProgress] = useState(0);

  // Recovery States
  const [isRecovering, setIsRecovering] = useState(false);
  const [newPinStep, setNewPinStep] = useState(false);
  const [tempPin, setTempPin] = useState('');

  // Auto trigger biometrics on mount if enabled
  useEffect(() => {
    if (settings?.biometricEnabled) {
      handleBiometricUnlock();
    }
  }, [settings]);

  const handleBiometricUnlock = async () => {
    if (!settings?.biometricEnabled) return;
    setBiometricStatus('scanning');
    setScanProgress(0);
    setErrorMessage('');

    // Start a progress bar for visual feedback
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress = Math.min(currentProgress + 8, 90);
      setScanProgress(currentProgress);
    }, 80);

    try {
      // Use the standard Web Authentication (WebAuthn) Credential API if supported by browsers
      if (typeof navigator !== 'undefined' && navigator.credentials && window.PublicKeyCredential) {
        
        // Cryptographic challenge to execute verification securely
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        // Secure credential assertion call utilizing device credential hardware (TouchID/FaceID)
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge: challenge,
            userVerification: 'required', // Demands biometric identification
            timeout: 15000, // Safe 15 seconds scan threshold
          }
        });

        clearInterval(interval);

        if (credential) {
          setScanProgress(100);
          setBiometricStatus('success');
          setErrorMessage('');
          addSecurityAuditLog('unlock_success', 'Acceso biométrico concedido (desbloqueado con hardware biométrico WebAuthn/FIDO).');
          setTimeout(() => {
            onUnlock();
          }, 450);
        } else {
          throw new Error("No se pudo confirmar la identidad biométrica.");
        }
      } else {
        throw new Error("Lector biométrico no soportado en este dispositivo o navegador.");
      }
    } catch (err: any) {
      clearInterval(interval);
      console.warn("Autenticación biométrica fallida o no soportada:", err);
      setScanProgress(0);
      setBiometricStatus('error');

      // Check for user cancel or device sensor error
      if (err.name === 'NotAllowedError') {
        setErrorMessage("Verificación denegada. Coloca tu huella o destapa la cámara.");
      } else if (err.name === 'SecurityError' || err.name === 'NotSupportedError') {
        setErrorMessage("Entorno seguro restringido. Por favor, usa tu PIN de respaldo.");
      } else {
        setErrorMessage(err.message || "Error al autenticar datos biométricos.");
      }
    }
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
          addSecurityAuditLog('unlock_success', 'Acceso concedido al panel mediante el uso correcto del PIN de 4 dígitos.');
          onUnlock();
        } else {
          addSecurityAuditLog('unlock_failed', 'Intento denegado de desbloqueo: se introdujo un PIN de seguridad incorrecto.');
          setTimeout(() => {
            setErrorCount((prev) => prev + 1);
            setErrorMessage('PIN Incorrecto. Reinte de nuevo.');
            setPin('');
          }, 200);
        }
      }
    }
  };

  const handleRecoverPin = async () => {
    setIsRecovering(true);
    setErrorMessage('');
    try {
      const result = await signInWithGoogle();
      if (result && result.user) {
        if (result.user.uid === settings?.uid) {
          setNewPinStep(true);
        } else {
          setErrorMessage("Google Auth: La cuenta no corresponde al dueño actual.");
        }
      }
    } catch (e: any) {
      console.error("Error durante recuperación de PIN:", e);
      setErrorMessage("No se pudo verificar tu cuenta de Google.");
    } finally {
      setIsRecovering(false);
    }
  };

  const handleNewPinSubmit = async (newPinVal: string) => {
    try {
      await updateSettings({ securityPin: newPinVal });
      addSecurityAuditLog('settings_changed', 'PIN de seguridad restablecido y guardado correctamente tras la verificación federada con Google Auth.');
      onUnlock();
    } catch (err) {
      console.error("Error al guardar nuevo PIN:", err);
      setErrorMessage("Error al guardar el nuevo PIN.");
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (newPinStep) return;
    if (e.key >= '0' && e.key <= '9') {
      handlePinInput(parseInt(e.key));
    } else if (e.key === 'Backspace') {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const handleTempKeyPress = (e: KeyboardEvent) => {
    if (!newPinStep) return;
    if (e.key >= '0' && e.key <= '9') {
      if (tempPin.length < 4) {
        const nextPin = tempPin + e.key;
        setTempPin(nextPin);
        if (nextPin.length === 4) {
          setTimeout(() => handleNewPinSubmit(nextPin), 300);
        }
      }
    } else if (e.key === 'Backspace') {
      setTempPin((prev) => prev.slice(0, -1));
    }
  };

  useEffect(() => {
    if (newPinStep) return;
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pin, newPinStep]);

  useEffect(() => {
    if (!newPinStep) return;
    window.addEventListener('keydown', handleTempKeyPress);
    return () => window.removeEventListener('keydown', handleTempKeyPress);
  }, [tempPin, newPinStep]);

  const isDark = settings?.theme === 'dark';

  if (newPinStep) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-slate-950 text-white select-none">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-30" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-sm flex flex-col items-center justify-center"
        >
          <div className="relative mb-6">
            <div className="w-16 h-16 bg-slate-900 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-xl text-emerald-400">
              <KeyRound className="w-7 h-7" />
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full animate-ping" />
          </div>

          <h2 className="text-xl font-extrabold uppercase tracking-tight text-white mb-1">
            Nuevo PIN de Seguridad
          </h2>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 block mb-6 text-center">
            Verificación exitosa • Configura tu PIN
          </span>

          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 text-center max-w-xs mb-6">
            Ingresa un nuevo PIN de 4 dígitos para acceder en este dispositivo.
          </p>

          <div className="flex gap-4 justify-center mb-8">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center text-lg font-bold transition-all ${
                  tempPin.length > i 
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'border-slate-800 bg-slate-900 text-slate-500'
                }`}
              >
                {tempPin[i] ? '*' : ''}
              </div>
            ))}
          </div>

          {/* Interactive Numeric Keypad for setting new PIN */}
          <div className="grid grid-cols-3 gap-3 w-full px-4 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button 
                key={num}
                type="button"
                onClick={() => {
                  if (tempPin.length < 4) {
                    const nextPin = tempPin + num;
                    setTempPin(nextPin);
                    if (nextPin.length === 4) {
                      setTimeout(() => handleNewPinSubmit(nextPin), 300);
                    }
                  }
                }}
                className="h-14 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60 active:scale-95 rounded-2xl font-bold transition-all text-sm tracking-widest flex items-center justify-center cursor-pointer"
              >
                {num}
              </button>
            ))}
            
            <div className="h-14" />

            <button 
              type="button"
              onClick={() => {
                if (tempPin.length < 4) {
                  const nextPin = tempPin + '0';
                  setTempPin(nextPin);
                  if (nextPin.length === 4) {
                    setTimeout(() => handleNewPinSubmit(nextPin), 300);
                  }
                }
              }}
              className="h-14 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60 rounded-2xl font-bold transition-all text-sm tracking-widest flex items-center justify-center cursor-pointer"
            >
              0
            </button>

            <button 
              type="button"
              onClick={() => setTempPin((prev) => prev.slice(0, -1))}
              className="h-14 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/60 rounded-2xl font-bold tracking-widest text-[9px] uppercase hover:text-rose-450 transition-colors cursor-pointer flex items-center justify-center"
            >
              Borrar
            </button>
          </div>

          <button
            onClick={() => {
              setNewPinStep(false);
              setTempPin('');
            }}
            className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-400 transition-colors mx-auto cursor-pointer"
          >
            Cancelar y volver
          </button>
        </motion.div>
      </div>
    );
  }

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
        <div className="mt-8 text-center space-y-3.5">
          <p className="text-[9px] text-slate-500 uppercase tracking-widest">
            {settings?.biometricEnabled ? 'Desbloqueo Biométrico Habilitado' : 'PIN requerido obligatoriamente'}
          </p>
          
          <div className="flex flex-col items-center gap-2">
            <button 
              type="button"
              onClick={handleRecoverPin}
              disabled={isRecovering}
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer bg-indigo-500/5 hover:bg-indigo-500/10 px-4 py-1.5 border border-indigo-500/10 rounded-xl"
            >
              {isRecovering ? 'Iniciando Google Auth...' : '¿Olvidaste tu PIN? Recuperar con Google'}
            </button>

            <button 
              onClick={() => logout()}
              className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-400 transition-colors cursor-pointer pt-1"
            >
              <LogOut className="w-3 h-3" /> Cerrar sesión actual
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
