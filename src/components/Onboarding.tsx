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

  const handleFinish = async () => {
    await updateSettings({
      companyName,
      displayName,
      securityPin: pin,
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
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Fingerprint className="text-emerald-600 w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Acceso Biométrico</h2>
              <p className="text-slate-500 text-sm">Sistema listo. Los datos biométricos se solicitarán según la configuración del dispositivo.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 text-left">
              <p>Tu PIN y configuración de seguridad se pueden modificar más tarde en el Centro de Control.</p>
            </div>

            <button 
              onClick={handleFinish}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all font-bold uppercase tracking-widest text-[10px]"
            >
              Entrar al Centro de Control
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
