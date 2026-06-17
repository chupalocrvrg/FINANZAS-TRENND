import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { motion } from 'motion/react';
import { Shield, UserCircle, ArrowRight, Fingerprint, Coins, Smartphone, HelpCircle } from 'lucide-react';

// Helper to convert raw credentials to string database storage
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function Onboarding() {
  const { settings, updateSettings } = useAuth();
  const [step, setStep] = useState(1);
  
  // Registration data fields
  const [displayName, setDisplayName] = useState(settings?.displayName || '');
  const [companyName, setCompanyName] = useState(settings?.companyName || '');
  const [ruc, setRuc] = useState(settings?.ruc || '');
  const [phone, setPhone] = useState(settings?.phone || '');
  const [referral, setReferral] = useState(settings?.referral || 'redes');
  const [pin, setPin] = useState('');
  
  // Biometric setup states
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [registeredCredId, setRegisteredCredId] = useState<string>('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(true);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSupported = !!(navigator.credentials && window.PublicKeyCredential && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable);
      setIsBiometricSupported(isSupported);
    }
  }, []);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!displayName.trim()) {
      newErrors.displayName = 'El nombre completo es obligatorio.';
    }
    if (!companyName.trim()) {
      newErrors.companyName = 'La empresa o entidad es obligatoria.';
    }
    if (!ruc.trim()) {
      newErrors.ruc = 'La cédula o RUC es obligatorio.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep1 = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSetupBiometrics = async () => {
    setBiometricStatus('scanning');
    setScanProgress(0);
    setErrors({});
    
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress = Math.min(currentProgress + 10, 90);
      setScanProgress(currentProgress);
    }, 100);

    try {
      if (typeof navigator === 'undefined' || !navigator.credentials || !window.PublicKeyCredential) {
        throw new Error("Este dispositivo o navegador no admite claves de acceso biométricas (WebAuthn). Elige la opción de usar solo PIN.");
      }

      // Generar desafío criptográfico aleatorio
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // ID único de usuario convertido a bytes
      const userId = new TextEncoder().encode(settings?.uid || 'user_onboarding');

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: companyName ? companyName.trim() : "Control Financiero",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: displayName ? displayName.trim().toLowerCase().replace(/\s+/g, '_') + "@trennd.store" : "user@trennd.store",
          displayName: displayName || "Usuario",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256 (Algoritmo estándar de criptografía de curva elíptica)
          { alg: -257, type: "public-key" } // RS255 (Algoritmo alterno)
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // FaceID / Huella digital local del dispositivo
          userVerification: "required",        // Exige validación obligatoria
          residentKey: "required",
          requireResidentKey: true,
        },
        timeout: 60000,
        attestation: "none"
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential | null;

      clearInterval(progressInterval);

      if (!credential) {
        throw new Error("El sistema biométrico del dispositivo no retornó una firma válida.");
      }

      // Convertir rawId a Base64 para guardarlo de manera persistente en Firestore
      const b64Id = arrayBufferToBase64(credential.rawId);
      setRegisteredCredId(b64Id);
      setScanProgress(100);
      setBiometricStatus('success');

    } catch (err: any) {
      clearInterval(progressInterval);
      console.warn("Biometric registration failure:", err);
      setScanProgress(0);
      setBiometricStatus(null);

      let msg = "No se pudo registrar la huella o rostro. ";
      if (err.name === 'NotAllowedError') {
        msg += "Proceso cancelado o huella/rostro no reconocidos. Intenta de nuevo.";
      } else if (err.name === 'SecurityError' || err.name === 'NotSupportedError') {
        msg += "Restricción de seguridad del navegador para WebAuthn en este dominio.";
      } else {
        msg += err.message || "Por favor intenta de nuevo o usa solo PIN.";
      }
      setErrors({ biometric: msg });
    }
  };

  const handleFinish = async (biometricsActive: boolean) => {
    await updateSettings({
      displayName: displayName.trim(),
      companyName: companyName.trim(),
      ruc: ruc.trim(),
      phone: phone.trim(),
      referral: referral,
      securityPin: pin,
      biometricEnabled: biometricsActive,
      biometricCredentialId: biometricsActive ? registeredCredId : '',
      autoLockTimer: 5, // Default auto-lock timer to 5 minutes
      isOnboarded: true
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        layout
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-200"
      >
        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progreso de Registro</span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s 
                    ? 'w-6 bg-indigo-600' 
                    : step > s 
                    ? 'w-2 bg-indigo-300' 
                    : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCircle className="text-indigo-600 w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">Configura tu Perfil</h2>
              <p className="text-slate-500 text-xs mt-1">Completa los datos esenciales para personalizar el Centro de Control.</p>
            </div>
            
            <div className="space-y-4">
              <div className="text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Nombre Completo <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (errors.displayName) setErrors(prev => ({ ...prev, displayName: '' }));
                  }}
                  className={`w-full bg-slate-50 border p-3 rounded-xl outline-none text-sm font-bold text-slate-850 transition-colors focus:border-indigo-500 ${
                    errors.displayName ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'
                  }`}
                  placeholder="Ej. Juan Carlos Peralta"
                  required
                />
                {errors.displayName && (
                  <p className="text-rose-500 text-[10px] font-bold mt-1 text-left uppercase tracking-wider">{errors.displayName}</p>
                )}
              </div>

              <div className="text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Empresa o Entidad <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (errors.companyName) setErrors(prev => ({ ...prev, companyName: '' }));
                  }}
                  className={`w-full bg-slate-50 border p-3 rounded-xl outline-none text-sm font-bold text-slate-850 transition-colors focus:border-indigo-500 ${
                    errors.companyName ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'
                  }`}
                  placeholder="Ej. Comercial o Distribuidora Peralta"
                  required
                />
                
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[8px] font-black uppercase text-slate-400 self-center mr-1">⚡ Autocompletar:</span>
                  {['Store', 'Digital', 'Servicios', 'Streaming'].map((suffix) => {
                    const firstName = displayName.split(' ')[0] || 'Mi';
                    const suggested = `${suffix === 'Servicios' ? 'Servicios ' : ''}${firstName}${suffix !== 'Servicios' ? ' ' + suffix : ''}`;
                    return (
                      <button
                        key={suffix}
                        type="button"
                        onClick={() => {
                          setCompanyName(suggested);
                          if (errors.companyName) setErrors(prev => ({ ...prev, companyName: '' }));
                        }}
                        className="text-[9px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full transition-all border border-indigo-100 cursor-pointer"
                      >
                        {suggested}
                      </button>
                    );
                  })}
                </div>

                {errors.companyName && (
                  <p className="text-rose-500 text-[10px] font-bold mt-1 text-left uppercase tracking-wider">{errors.companyName}</p>
                )}
              </div>

              <div className="text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Cédula o RUC <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  value={ruc}
                  onChange={(e) => {
                    setRuc(e.target.value);
                    if (errors.ruc) setErrors(prev => ({ ...prev, ruc: '' }));
                  }}
                  className={`w-full bg-slate-50 border p-3 rounded-xl outline-none text-sm font-bold text-slate-850 transition-colors focus:border-indigo-500 ${
                    errors.ruc ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200'
                  }`}
                  placeholder="Ej. 1726485930001 o 0928374829"
                  required
                />
                {errors.ruc && (
                  <p className="text-rose-500 text-[10px] font-bold mt-1 text-left uppercase tracking-wider">{errors.ruc}</p>
                )}
              </div>

              <div className="text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Número Celular (Opcional)</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none text-sm font-bold text-slate-850 focus:border-indigo-500"
                  placeholder="Ej. +593 99 999 9999"
                />
              </div>

              <div className="text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">¿Cómo te enteraste de nosotros?</label>
                <select 
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none text-sm font-bold text-slate-800 focus:border-indigo-500"
                >
                  <option value="redes">Redes Sociales (TikTok, Facebook, Instagram)</option>
                  <option value="amistades">Amistades / Amigos</option>
                  <option value="referencias">Referencias Personales</option>
                  <option value="otro">Otro medio de publicidad</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleNextStep1}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all font-black uppercase tracking-widest text-[10px] cursor-pointer shadow-lg shadow-indigo-100"
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
              <h2 className="text-xl font-bold text-slate-900 leading-tight">PIN de Seguridad (Obligatorio)</h2>
              <p className="text-slate-500 text-xs mt-1">Digita un PIN de 4 dígitos para proteger tu acceso y actuar como PIN de respaldo.</p>
            </div>

            <div>
              <div className="flex gap-2 justify-center mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all ${pin.length > i ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-300'}`}>
                    {pin[i] ? '•' : ''}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'Borrar', 0, 'Siguiente'].map((num) => (
                  <button 
                    key={num}
                    type="button"
                    onClick={() => {
                      if (num === 'Borrar') {
                        setPin('');
                      } else if (num === 'Siguiente') { 
                        if (pin.length === 4) setStep(3); 
                      } else if (typeof num === 'number' && pin.length < 4) {
                        setPin(pin + num);
                      }
                    }}
                    className={`p-4 rounded-xl font-bold transition-all text-xs uppercase tracking-widest flex items-center justify-center cursor-pointer ${
                      num === 'Siguiente' 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                    disabled={num === 'Siguiente' && pin.length < 4}
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
                <Fingerprint className="text-indigo-600 w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">Configurar Datos Biométricos</h2>
              <p className="text-slate-500 text-xs mt-1">Vincula tu huella dactilar o reconocimiento facial (FaceID) para desbloqueo ágil.</p>
            </div>

            {!isBiometricSupported ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left space-y-1.5 animate-in fade-in duration-300">
                  <span className="text-[9px] font-black uppercase text-amber-700 block gap-1 flex items-center">⚠️ Dispositivo no compatible o sin biometría activa</span>
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    Este dispositivo o navegador no tiene activo o no admite el registro biométrico (WebAuthn / FaceID). ¡No te preocupes! El sistema ha optimizado tu inicio de sesión configurando el <strong>PIN de Seguridad de 4 dígitos</strong> como método exclusivo.
                  </p>
                </div>
                
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-left space-y-1 text-emerald-800">
                  <span className="text-[9px] font-black uppercase block">✓ PIN de Respaldo Configurado</span>
                  <p className="text-[10px] font-bold">Tu clave secreta: <strong className="font-mono bg-white px-1.5 py-0.5 border border-emerald-200 rounded text-emerald-950 font-black tracking-widest text-xs">{pin}</strong></p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-[10px] text-slate-500 text-left">
                  <p className="leading-relaxed">Tus credenciales y datos se guardarán de forma interna y privada en la plataforma de forma encriptada para futuros accesos.</p>
                </div>

                <button 
                  onClick={() => handleFinish(false)}
                  className="w-full bg-slate-900 text-white hover:bg-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-[10px] cursor-pointer shadow-lg"
                >
                  Registar PIN y Entrar al Centro de Control
                </button>
              </div>
            ) : !biometricStatus ? (
              <div className="space-y-3">
                <button 
                  onClick={handleSetupBiometrics}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all font-bold uppercase tracking-widest text-[10px] cursor-pointer shadow-lg shadow-indigo-100"
                >
                  <Fingerprint className="w-4 h-4" /> Registrar Huella o Rostro
                </button>
                
                {errors.biometric && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[10px] text-rose-600 text-left leading-relaxed font-bold uppercase">
                    ⚠️ {errors.biometric}
                  </div>
                )}

                <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-[10px] text-indigo-700 text-left leading-relaxed">
                  💡 <strong>Nota del Protocolo de Seguridad</strong>: Al activar datos biométricos, tu PIN de respaldo automático obligatorio será el PIN del Paso 2 (<strong>{pin}</strong>).
                </div>
                <button 
                  onClick={() => handleFinish(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl transition-all font-bold uppercase tracking-widest text-[10px] cursor-pointer"
                >
                  Omitir Biometría (Usar solo PIN)
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
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Sincronizando Sensor...</p>
                  <p className="text-[10px] text-slate-500 mt-1">Presiona tu sensor o mira la cámara ({scanProgress}%)</p>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl font-bold">✓</div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-700">¡Biometría Activada!</p>
                  <p className="text-[10px] text-emerald-600 mt-1">Los datos biométricos se han registrado y el PIN <strong>{pin}</strong> se guardó como respaldo.</p>
                </div>
                <button 
                  onClick={() => handleFinish(true)}
                  className="w-full mt-2 bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all font-bold uppercase tracking-widest text-[10px] cursor-pointer"
                >
                  Entrar al Centro de Control
                </button>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-[10px] text-slate-500 text-left">
              <p className="leading-relaxed">Tus credenciales y datos se guardarán de forma interna y privada en la plataforma de forma encriptada para futuros accesos.</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
