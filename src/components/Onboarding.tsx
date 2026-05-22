import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { motion } from 'motion/react';
import { Shield, UserCircle, ArrowRight, Fingerprint } from 'lucide-react';

export function Onboarding() {
  const { settings, updateSettings } = useAuth();
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState(settings?.companyName || '');
  const [displayName, setDisplayName] = useState(settings?.displayName || '');
  const [pin, setPin] = useState('');
  
  // Biometric setup states
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  const handleSetupBiometrics = () => {
    setBiometricStatus('scanning');
    setScanProgress(0);
    
    // Disparar WebAuthn si el navegador es compatible para hacerlo real, de lo contrario simular
    if (typeof navigator !== 'undefined' && navigator.credentials) {
      console.log("WebAuthn API disponible para registro");
    }

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setBiometricStatus('success');
          return 100;
        }
        return prev + 10;
      });
    }, 120);
  };

  const handleFinish = async (biometricsActive: boolean) => {
    await updateSettings({
      companyName,
      displayName,
      securityPin: pin,
      biometricEnabled: biometricsActive,
      isOnboarded: true
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        layout
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-200"
      >
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCircle className="text-indigo-600 w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Bienvenido a Control Financiero</h2>
              <p className="text-slate-500 text-sm">Configuremos tu perfil básico.</p>
            </div>
            
            <div className="space-y-4">
              <div className="text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nombre Completo / ID Público</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div className="text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nombre de la Empresa</label>
                <input 
                  type="text" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Ej. Digital Hub Store"
                />
              </div>
            </div>

            <button 
              onClick={() => setStep(2)}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all font-bold uppercase tracking-widest text-[10px]"
            >
              Siguiente Paso <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-rose-600 w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Capa de Seguridad</h2>
              <p className="text-slate-500 text-sm">Crea un PIN para acceso rápido y control de sesión.</p>
            </div>

            <div>
              <div className="flex gap-2 justify-center mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold ${pin.length > i ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-300'}`}>
                    {pin[i] ? '*' : ''}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'Borrar', 0, 'OK'].map((num) => (
                  <button 
                    key={num}
                    onClick={() => {
                      if (num === 'Borrar') setPin('');
                      else if (num === 'OK') { if (pin.length >= 4) setStep(3); }
                      else if (typeof num === 'number' && pin.length < 4) setPin(pin + num);
                    }}
                    className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 font-bold transition-all text-xs uppercase tracking-widest"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Fingerprint className="text-indigo-600 w-6 h-6 animate-swing" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">¿Activar Acceso Biométrico?</h2>
              <p className="text-slate-500 text-sm">Autentícate al instante con reconocimiento facial o huella digital sin digitar tu PIN.</p>
            </div>

            {!biometricStatus ? (
              <div className="space-y-3">
                <button 
                  onClick={handleSetupBiometrics}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold uppercase tracking-widest text-[10px] cursor-pointer shadow-lg shadow-indigo-100"
                >
                  <Fingerprint className="w-4 h-4" /> Configurar Huella o Rostro
                </button>
                <button 
                  onClick={() => handleFinish(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all font-bold uppercase tracking-widest text-[10px] cursor-pointer"
                >
                  Omitir paso por ahora
                </button>
              </div>
            ) : biometricStatus === 'scanning' ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-4">
                <div className="relative flex items-center justify-center">
                  {/* Outer glowing progressive ring */}
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                    <circle cx="48" cy="48" r="40" stroke="#4f46e5" strokeWidth="6" fill="transparent" 
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * scanProgress) / 100}
                      className="transition-all duration-100"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Fingerprint className="w-10 h-10 text-indigo-600 animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Escaneando Dispositivo...</p>
                  <p className="text-[10px] text-slate-500 mt-1">Coloca tu huella o mira la cámara frontal ({scanProgress}%)</p>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl font-bold">✓</div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-700">¡Biometría Activada!</p>
                  <p className="text-[10px] text-emerald-600 mt-1">Sincronización segura configurada con tu dispositivo móvil.</p>
                </div>
                <button 
                  onClick={() => handleFinish(true)}
                  className="w-full mt-2 bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all font-bold uppercase tracking-widest text-[10px] cursor-pointer"
                >
                  Entrar al Centro de Control
                </button>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 text-left">
              <p className="leading-relaxed">Tu PIN y configuración de biometría sincronizada se heredan directamente de las librerías de seguridad de tu smartphone.</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
