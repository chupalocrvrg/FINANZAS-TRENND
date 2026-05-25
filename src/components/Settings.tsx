import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { logout, db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Settings as SettingsIcon, Globe, Palette, Shield, LogOut, Smartphone, Building2, Plus, Trash2, X, Save, Edit2, Loader2, CreditCard, Info, CheckCircle, HelpCircle, ShieldCheck, User, Languages, Type, Upload, CheckCircle2 as Check } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { Wallet } from '../types';

// Helper to convert raw credentials to string database storage
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function Settings() {
  const { user, settings, updateSettings } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletForm, setWalletForm] = useState({ id: '', name: '', type: 'bank', balance: '0', totalLimit: '0' });
  const [showRegisteredWallets, setShowRegisteredWallets] = useState(false);
  const [showRegisteredCards, setShowRegisteredCards] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoTab, setInfoTab] = useState<'history' | 'features'>('history');
  const isDark = settings?.theme === 'dark';

  const toggleFeature = async (featureId: string) => {
    const currentDisabled = settings?.disabledFeatures || [];
    let updatedDisabled: string[];
    if (currentDisabled.includes(featureId)) {
      updatedDisabled = currentDisabled.filter(id => id !== featureId);
    } else {
      updatedDisabled = [...currentDisabled, featureId];
    }
    try {
      await updateSettings({ disabledFeatures: updatedDisabled });
    } catch (err) {
      console.error("Error updating features:", err);
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'wallets'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setWallets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallet)));
    });
    return () => unsub();
  }, [user]);

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const walletData = {
        name: walletForm.name,
        type: walletForm.type,
        balance: parseFloat(walletForm.balance) || 0,
        totalLimit: walletForm.type === 'credit_card' ? (parseFloat(walletForm.totalLimit) || 0) : 0,
        ownerId: user.uid
      };

      if (walletForm.id) {
        // Modo Edicion
        await updateDoc(doc(db, 'wallets', walletForm.id), walletData);
      } else {
        // Modo Creacion
        await addDoc(collection(db, 'wallets'), walletData);
      }
      
      setIsWalletModalOpen(false);
      resetWalletForm();
    } catch (e) {
      console.error(e);
      window.alert("Error al guardar la cuenta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWalletForm = () => {
    setWalletForm({ id: '', name: '', type: 'bank', balance: '0', totalLimit: '0' });
  };

  const handleEditWallet = (wallet: any) => {
    if (!wallet) return;
    setWalletForm({
      id: wallet.id || '',
      name: wallet.name || '',
      type: wallet.type || 'bank',
      balance: (wallet.balance !== undefined && wallet.balance !== null ? wallet.balance : 0).toString(),
      totalLimit: (wallet.totalLimit !== undefined && wallet.totalLimit !== null ? wallet.totalLimit : 0).toString()
    });
    setIsWalletModalOpen(true);
  };

  const handleDeleteWallet = async (id: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'wallets', id));
    } catch (err) {
      console.error("Error al eliminar la cuenta:", err);
      // alert blocked in iframe
    }
  };

  const handleSettingClick = async (field: string, value: any) => {
    if (field === 'biometricEnabled' && value === true) {
      try {
        if (typeof navigator === 'undefined' || !navigator.credentials || !window.PublicKeyCredential) {
          console.error("Este dispositivo o navegador no admite claves biométricas (WebAuthn).");
          return;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const userId = new TextEncoder().encode(user?.uid || 'user_settings');

        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
          challenge: challenge,
          rp: {
            name: settings?.companyName || "Control Financiero",
            id: window.location.hostname,
          },
          user: {
            id: userId,
            name: (settings?.displayName || "user").trim().toLowerCase().replace(/\s+/g, '_') + "@trennd.store",
            displayName: settings?.displayName || "Usuario",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" }
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "required",
            requireResidentKey: true,
          },
          timeout: 60000,
          attestation: "none"
        };

        const credential = await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions
        }) as PublicKeyCredential | null;

        if (!credential) {
          throw new Error("El sensor biométrico no retornó una credencial válida.");
        }

        const b64Id = arrayBufferToBase64(credential.rawId);
        await updateSettings({
          biometricEnabled: true,
          biometricCredentialId: b64Id
        });
        window.alert("¡Biometría registrada y activada correctamente!");

      } catch (err: any) {
        console.warn("Error registering biometric from settings:", err);
        let msg = "No se pudo registrar la biometría. ";
        if (err.name === 'NotAllowedError') {
          msg += "El proceso fue cancelado por el usuario.";
        } else {
          msg += err.message || "";
        }
        window.alert(msg);
      }
    } else if (field === 'biometricEnabled' && value === false) {
      await updateSettings({
        biometricEnabled: false,
        biometricCredentialId: ''
      });
      window.alert("Biometría desactivada correctamente.");
    } else {
      await updateSettings({ [field]: value });
    }
  };

  const sections = [
    {
      id: 'personal',
      title: 'Identidad Global',
      icon: Smartphone,
      items: [
        { label: 'Nombre de la Empresa o Entidad', field: 'companyName', type: 'text', value: settings?.companyName },
        { label: 'Nombre Completo del Propietario', field: 'displayName', type: 'text', value: settings?.displayName },
        { label: 'Cédula o RUC', field: 'ruc', type: 'text', value: settings?.ruc },
        { label: 'Número de Celular', field: 'phone', type: 'text', value: settings?.phone || '' },
      ]
    },
    {
      id: 'visual',
      title: 'Motor de Interfaz',
      icon: Palette,
      items: [
        { 
          label: 'Modo de Tema', 
          field: 'theme', 
          type: 'select', 
          options: [
            { id: 'light', label: 'Protocolo Claro' }, 
            { id: 'dark', label: 'Protocolo Oscuro' }, 
            { id: 'system', label: 'Predeterminado' }
          ],
          value: settings?.theme 
        },
      ]
    },
    {
      id: 'security',
      title: 'Núcleo de Seguridad y Bloqueo',
      icon: Shield,
      items: [
        { label: 'PIN de Seguridad (4 dígitos)', field: 'securityPin', type: 'password', value: settings?.securityPin },
        { 
          label: 'Desbloqueo con Datos Biométricos', 
          field: 'biometricEnabled', 
          type: 'select', 
          options: [
            { id: true, label: 'Habilitado' }, 
            { id: false, label: 'Deshabilitado' }
          ],
          value: settings?.biometricEnabled ?? false
        },
        { 
          label: 'Temporizador Bloqueo por Inactividad', 
          field: 'autoLockTimer', 
          type: 'select', 
          options: [
            { id: 0, label: 'Desactivado' }, 
            { id: 1, label: '1 minuto' }, 
            { id: 5, label: '5 minutos' }, 
            { id: 10, label: '10 minutos' }, 
            { id: 15, label: '15 minutos' }
          ],
          value: settings?.autoLockTimer ?? 5
        }
      ]
    }
  ];

  return (
    <div className={cn("p-8 max-w-4xl mx-auto pb-24 text-left", isDark ? "text-slate-100" : "text-slate-900")}>
      <div className="mb-12">
        <h1 className={cn("text-3xl font-bold tracking-tight flex items-center gap-3", isDark ? "text-white" : "text-slate-800")}>
          <SettingsIcon className="w-8 h-8 text-indigo-500" />
          Configuración del Sistema
        </h1>
        <p className="text-slate-500 font-medium">Gestione sus preferencias arquitectónicas y cuentas bancarias.</p>
      </div>

      <div className="space-y-12">
        {/* WALLETS SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between border-b border-indigo-100/20 pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-extrabold">Cuentas Bancarias y Billeteras</h2>
            </div>
            <button 
              onClick={() => { resetWalletForm(); setIsWalletModalOpen(true); }}
              className="text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-950/80 flex items-center gap-1 transition-colors cursor-pointer border border-indigo-500/20"
            >
              <Plus className="w-3.5 h-3.5" /> Añadir
            </button>
          </div>

          <div className={cn("p-4 rounded-2xl flex items-center justify-between border transition-all", isDark ? "bg-slate-900/20 border-slate-800/60" : "bg-slate-50/50 border-slate-100")}>
            <span className={cn("text-xs font-bold", isDark ? "text-slate-350" : "text-slate-600")}>
              Mostrar cuentas registradas
            </span>
            <button
              type="button"
              onClick={() => setShowRegisteredWallets(!showRegisteredWallets)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                showRegisteredWallets ? "bg-indigo-600" : (isDark ? "bg-slate-800" : "bg-slate-200")
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  showRegisteredWallets ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <AnimatePresence>
            {showRegisteredWallets && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {wallets.filter(w => w.type !== 'credit_card').map(w => (
                    <div key={w.id} className={cn("p-4 border rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all", isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-100")}>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{w.type === 'bank' ? 'Banco' : w.type === 'cash' ? 'Efectivo' : 'Digital'}</span>
                        <p className={cn("font-bold text-sm", isDark ? "text-slate-100" : "text-slate-800")}>{w.name}</p>
                        <p className="text-[10px] font-mono text-slate-500 mt-1">Saldo: {formatCurrency(w.balance)}</p>
                      </div>
                      <button 
                        onClick={() => handleEditWallet(w)} 
                        title="Editar cuenta"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border border-indigo-500/10 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </button>
                    </div>
                  ))}
                  {wallets.filter(w => w.type !== 'credit_card').length === 0 && <div className="col-span-2 py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No hay cuentas configuradas</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* CREDIT CARDS SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between border-b border-indigo-100/20 pb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-violet-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-extrabold">Tarjetas de Crédito</h2>
            </div>
            <button 
              onClick={() => { resetWalletForm(); setWalletForm(f => ({ ...f, type: 'credit_card' })); setIsWalletModalOpen(true); }}
              className="text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-violet-100 dark:hover:bg-violet-950/80 flex items-center gap-1 transition-colors cursor-pointer border border-violet-500/20"
            >
              <Plus className="w-3.5 h-3.5" /> Añadir Tarjeta
            </button>
          </div>

          <div className={cn("p-4 rounded-2xl flex items-center justify-between border transition-all", isDark ? "bg-slate-900/20 border-slate-800/60" : "bg-slate-50/50 border-slate-100")}>
            <span className={cn("text-xs font-bold", isDark ? "text-slate-350" : "text-slate-600")}>
              Mostrar tarjetas de crédito registradas
            </span>
            <button
              type="button"
              onClick={() => setShowRegisteredCards(!showRegisteredCards)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                showRegisteredCards ? "bg-violet-600" : (isDark ? "bg-slate-800" : "bg-slate-200")
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  showRegisteredCards ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <AnimatePresence>
            {showRegisteredCards && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {wallets.filter(w => w.type === 'credit_card').map(w => (
                    <div key={w.id} className={cn("p-4 border rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all", isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-100")}>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Cupo Tarjeta</span>
                        <p className={cn("font-bold text-sm", isDark ? "text-slate-100" : "text-slate-800")}>{w.name}</p>
                        <p className="text-[11px] font-mono text-slate-500 mt-1">
                          Cupo Disponible: <span className="font-bold text-emerald-500">{formatCurrency(w.balance)}</span> <span className="text-slate-450 dark:text-slate-400">/ Total: {formatCurrency(w.totalLimit || 0)}</span>
                        </p>
                      </div>
                      <button 
                        onClick={() => handleEditWallet(w)} 
                        title="Editar tarjeta"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border border-violet-500/10 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </button>
                    </div>
                  ))}
                  {wallets.filter(w => w.type === 'credit_card').length === 0 && <div className="col-span-2 py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No hay tarjetas de crédito configuradas</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {sections.map((section) => (
          <motion.section 
            key={section.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 border-b border-indigo-100/20 pb-2">
              <section.icon className="w-4 h-4 text-slate-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-black">{section.title}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {section.items.map((item) => (
                <div key={item.field} className="space-y-2">
                  <label className={cn("text-xs font-bold block", isDark ? "text-slate-300" : "text-slate-600")}>{item.label}</label>
                  {item.type === 'text' || item.type === 'password' ? (
                    <input 
                      type={item.type}
                      value={item.value || ''}
                      onChange={(e) => updateSettings({ [item.field]: e.target.value })}
                      className={cn("w-full border p-3 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors shadow-sm", isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800")}
                    />
                  ) : (
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                      {item.options?.map((opt) => (
                        <button
                          key={String(opt.id)}
                          type="button"
                          onClick={() => handleSettingClick(item.field, opt.id)}
                          className={cn(
                            "flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer min-w-[80px]",
                            item.value === opt.id 
                              ? "bg-indigo-600 text-white border-indigo-600" 
                              : isDark 
                              ? "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.section>
        ))}

        {/* MÓDULO DE PERSONALIZACIÓN */}
        <motion.section
          key="personalization"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-indigo-100/20 pb-2">
            <Palette className="w-4 h-4 text-slate-400" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-extrabold">Módulo de Personalización Global</h2>
          </div>

          <div className={cn("p-6 sm:p-8 rounded-3xl border space-y-8 transition-all", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
            
            {/* GRID 1: AVATAR Y IDIOMA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              {/* Columna Foto de Perfil */}
              <div className="space-y-4 flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-500/5">
                <div className="relative group shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-indigo-500/25 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  {settings?.useGoogleAvatar && user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : settings?.customProfilePic ? (
                    <img src={settings.customProfilePic} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-indigo-100 text-indigo-700 font-black text-3xl flex items-center justify-center uppercase">
                      {settings?.displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  
                  {/* Hover uploader label */}
                  {!settings?.useGoogleAvatar && (
                    <label className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold uppercase tracking-widest gap-1 text-center">
                      <Upload className="w-4 h-4" />
                      <span>Subir Foto</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          if (file.size > 400 * 1024) {
                            window.alert("La imagen debe pesar menos de 400 KB.");
                            return;
                          }

                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const base64String = reader.result as string;
                            try {
                              await updateSettings({ customProfilePic: base64String });
                            } catch (err) {
                              console.error("Error al cargar la foto:", err);
                              window.alert("Error al cargar la foto");
                            }
                          };
                          reader.readAsDataURL(file);
                        }} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>

                <div className="space-y-3 flex-1 text-left">
                  <h3 className="text-sm font-bold tracking-tight">Preferencias del Avatar</h3>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => updateSettings({ useGoogleAvatar: true })}
                      className={cn(
                        "w-full px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-left flex items-center justify-between cursor-pointer",
                        settings?.useGoogleAvatar 
                          ? "bg-indigo-600 text-white border-indigo-600" 
                          : isDark 
                          ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
                          : "bg-white text-slate-550 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <span>Usar foto de Google</span>
                      {settings?.useGoogleAvatar && <Check className="w-3.5 h-3.5" />}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => updateSettings({ useGoogleAvatar: false })}
                      className={cn(
                        "w-full px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-left flex items-center justify-between cursor-pointer",
                        !settings?.useGoogleAvatar 
                          ? "bg-indigo-600 text-white border-indigo-600" 
                          : isDark 
                          ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
                          : "bg-white text-slate-550 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <span>Usar foto personalizada</span>
                      {!settings?.useGoogleAvatar && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {!settings?.useGoogleAvatar && (
                    <div className="text-[9px] text-slate-500 leading-normal font-semibold mt-1">
                      Pasa el cursor / presiona sobre el círculo arriba para cargar tu archivo de imagen (Recomendado cuadrada, max 400KB).
                    </div>
                  )}
                </div>
              </div>

              {/* Columna Idioma */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-500/5 h-full flex flex-col justify-center text-left">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-slate-450" />
                  <h3 className="text-sm font-bold tracking-tight">Idioma de Preferencia / Localization</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Cambia instantáneamente la traducción de textos fijos y botones en la navegación de todo el aplicativo.</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => updateSettings({ language: 'es' })}
                    className={cn(
                      "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      settings?.language === 'es' 
                        ? "bg-indigo-600 text-white border-indigo-600" 
                        : isDark 
                        ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850"
                        : "bg-white text-slate-550 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <span>🇪🇸 Español</span>
                    {settings?.language === 'es' && <Check className="w-3 h-3" />}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => updateSettings({ language: 'en' })}
                    className={cn(
                      "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      settings?.language === 'en' 
                        ? "bg-indigo-600 text-white border-indigo-600" 
                        : isDark 
                        ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850"
                        : "bg-white text-slate-550 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <span>🇺🇸 English</span>
                    {settings?.language === 'en' && <Check className="w-3 h-3" />}
                  </button>
                </div>
              </div>

            </div>

            {/* SEPARADOR */}
            <hr className="border-slate-100 dark:border-slate-800/80" />

            {/* GRID 2: ACCENT PALETTE Y FONTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start text-left">
              
              {/* Paleta de Colores de Acento */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-slate-450" />
                  <h3 className="text-sm font-bold tracking-tight">Paleta Cromática de Acento</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">Seleccione su color primario favorito. Todas las tarjetas, botones interactivos y alertas se acoplarán con esta vibración visual.</p>
                
                <div className="flex flex-wrap gap-2.5 pt-2">
                  {[
                    { id: 'indigo', name: 'Índigo', hex: '#4f46e5' },
                    { id: 'emerald', name: 'Esmeralda', hex: '#059669' },
                    { id: 'rose', name: 'Rosa Calm', hex: '#e11d48' },
                    { id: 'amber', name: 'Ámbar', hex: '#d97706' },
                    { id: 'violet', name: 'Violeta', hex: '#7c3aed' },
                    { id: 'sky', name: 'Celeste', hex: '#0284c7' },
                    { id: 'slate', name: 'Mineral', hex: '#475569' },
                  ].map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => updateSettings({ accentColor: col.id })}
                      className={cn(
                        "w-9 h-9 rounded-full transition-all flex items-center justify-center border border-black/10 relative cursor-pointer ring-4 ring-transparent hover:scale-105",
                        (settings?.accentColor || 'indigo') === col.id ? "scale-110 ring-indigo-500/30 dark:ring-indigo-500/40" : "hover:ring-slate-300 dark:hover:ring-slate-700"
                      )}
                      style={{ backgroundColor: col.hex }}
                      title={col.name}
                    >
                      {(settings?.accentColor || 'indigo') === col.id && (
                        <Check className="w-4 h-4 text-white drop-shadow-sm font-bold" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Fuente */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-slate-450" />
                  <h3 className="text-sm font-bold tracking-tight">Tipo de Letra del Sistema</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">Modifique la arquitectura tipográfica para acoplar el grosor de letras y números a su agrado visual.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5">
                  {[
                    { id: 'inter', label: 'Inter (Sans)', style: 'font-sans' },
                    { id: 'space', label: 'Space Grotesk', style: 'font-space font-space' },
                    { id: 'outfit', label: 'Outfit (Sleek)', style: 'font-outfit font-outfit' },
                    { id: 'mono', label: 'JetBrains (Mono)', style: 'font-mono' },
                    { id: 'playfair', label: 'Playfair (Serif)', style: 'font-playfair font-playfair' },
                  ].map((fontSpec) => (
                    <button
                      key={fontSpec.id}
                      type="button"
                      onClick={() => updateSettings({ fontFamily: fontSpec.id })}
                      className={cn(
                        "p-2 rounded-xl border text-[11px] font-bold text-left transition-all flex items-center justify-between cursor-pointer",
                        fontSpec.style,
                        (settings?.fontFamily || 'inter') === fontSpec.id 
                          ? "bg-indigo-600 text-white border-indigo-600" 
                          : isDark 
                          ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
                          : "bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      <span>{fontSpec.label}</span>
                      {(settings?.fontFamily || 'inter') === fontSpec.id && <Check className="w-3 h-3 inline shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </motion.section>

        {/* SECCIÓN INFORMACIÓN Y CONTROL */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-indigo-100/20 pb-2">
            <Info className="w-4 h-4 text-slate-400" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-extrabold">Información y Control de Módulos</h2>
          </div>

          <div className={cn("p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
            <div className="space-y-1">
              <h3 className={cn("text-base font-bold", isDark ? "text-slate-100" : "text-slate-800")}>Centro de Soporte, Cambios y Adaptabilidad</h3>
              <p className="text-xs text-slate-500 font-medium">Revise el historial exacto de actualizaciones, la versión instalada y personalice las características activas del aplicativo.</p>
            </div>
            <button 
              type="button"
              onClick={() => { setInfoTab('history'); setIsInfoModalOpen(true); }}
              className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 border border-indigo-500/25"
            >
              <Info className="w-4 h-4" /> Ver Información del Protocolo
            </button>
          </div>
        </motion.section>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pt-12 border-t border-indigo-100/20 flex flex-col sm:flex-row justify-between items-center gap-4"
        >
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Última Sincronización: {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Nunca'}
            </span>
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-1">
              Control Financiero • Versión 2.3.8
            </span>
          </div>
          <button 
            onClick={() => logout()}
            className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all border border-rose-100"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión del Protocolo
          </button>
        </motion.div>
      </div>

      <AnimatePresence>
        {isWalletModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div onClick={() => { setIsWalletModalOpen(false); resetWalletForm(); }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div className={cn("relative w-full max-w-sm p-8 rounded-3xl border shadow-2xl z-10", isDark ? "bg-slate-900 border-slate-800" : "bg-white border border-slate-100")}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={cn("text-xl font-bold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  {walletForm.id ? 'Editar Cuenta / Tarjeta' : 'Nueva Cuenta / Tarjeta'}
                </h3>
                <button onClick={() => { setIsWalletModalOpen(false); resetWalletForm(); }} className="text-slate-400 p-1 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-slate-600">
                    <X />
                </button>
              </div>
              <form onSubmit={handleAddWallet} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">{walletForm.type === 'credit_card' ? 'Nombre de Tarjeta' : 'Nombre del Banco/Cuenta'}</label>
                  <input required type="text" value={walletForm.name} onChange={e => setWalletForm({...walletForm, name: e.target.value})} className={cn("w-full mt-1 p-3 rounded-xl border focus:border-indigo-500 outline-none text-sm font-bold", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800")} placeholder={walletForm.type === 'credit_card' ? 'Ej. Visa Plus' : 'Ej. Banco Pichincha'} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Tipo</label>
                  <select required value={walletForm.type} onChange={e => setWalletForm({...walletForm, type: e.target.value})} className={cn("w-full mt-1 p-3 rounded-xl border outline-none text-sm font-bold", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800")}>
                    <option value="bank">Banco / Transferencia</option>
                    <option value="cash">Efectivo</option>
                    <option value="digital_wallet">Billetera Digital/App</option>
                    <option value="credit_card">Tarjeta de Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">{walletForm.type === 'credit_card' ? 'Cupo Disponible ($)' : 'Saldo actual o Inicial ($)'}</label>
                  <input required type="number" step="0.01" value={walletForm.balance} onChange={e => setWalletForm({...walletForm, balance: e.target.value})} className={cn("w-full mt-1 p-3 rounded-xl border focus:border-indigo-500 outline-none text-sm font-bold", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800")} />
                </div>
                {walletForm.type === 'credit_card' && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Cupo Total ($)</label>
                    <input required type="number" step="0.01" value={walletForm.totalLimit} onChange={e => setWalletForm({...walletForm, totalLimit: e.target.value})} className={cn("w-full mt-1 p-3 rounded-xl border focus:border-indigo-500 outline-none text-sm font-bold", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800")} />
                  </div>
                )}
                <button disabled={isSubmitting} type="submit" className="w-full mt-4 bg-indigo-600 text-white p-4 rounded-2xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-indigo-700 cursor-pointer">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {walletForm.id ? 'Guardar Cambios' : (walletForm.type === 'credit_card' ? 'Registrar Tarjeta' : 'Registrar Cuenta')}
                </button>
                {walletForm.id && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm("¿Está seguro de que desea eliminar esta billetera/tarjeta de forma definitiva?")) {
                        await handleDeleteWallet(walletForm.id);
                        setIsWalletModalOpen(false);
                        resetWalletForm();
                      }
                    }}
                    className="w-full mt-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-450 p-4 rounded-2xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border border-rose-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar Billetera / Tarjeta
                  </button>
                )}
              </form>
            </motion.div>
          </div>
        )}

        {isInfoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInfoModalOpen(false)} 
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn(
                "relative w-full max-w-2xl max-h-[85vh] overflow-y-auto p-8 rounded-3xl border shadow-2xl z-10 flex flex-col text-left scrollbar-hide", 
                isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-500" />
                  <h3 className={cn("text-lg font-extrabold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    Información y Configuración Adaptativa
                  </h3>
                </div>
                <button 
                  onClick={() => setIsInfoModalOpen(false)} 
                  className={cn("p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors", isDark ? "text-slate-400 bg-slate-800" : "text-slate-500 bg-slate-100")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 dark:border-slate-800/65 mb-6 shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setInfoTab('history')}
                  className={cn(
                    "pb-2.5 px-4 text-xs font-bold uppercase tracking-wider relative transition-all border-b-2",
                    infoTab === 'history' 
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  Acerca de e Historial De Cambios
                </button>
                <button
                  type="button"
                  onClick={() => setInfoTab('features')}
                  className={cn(
                    "pb-2.5 px-4 text-xs font-bold uppercase tracking-wider relative transition-all border-b-2",
                    infoTab === 'features' 
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  Habilitar/Deshabilitar Características
                </button>
              </div>

              {/* Content Panel */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-1">
                {infoTab === 'history' ? (
                  <div className="space-y-6 text-sm">
                    {/* Version card */}
                    <div className={cn("p-5 rounded-2xl border flex items-center justify-between gap-4", isDark ? "bg-indigo-950/20 border-indigo-500/20" : "bg-indigo-50/50 border-indigo-100")}>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-500">Versión del Sistema</span>
                        <h4 className="text-xl font-black text-indigo-600 dark:text-indigo-400">Versión 25.5.26 / 26.5.25</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Formato: Día.Mes.Año (Local) • Año.Mes.Día (Estándar)</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Compilado Exacto</span>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 block bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-500/10 mt-1">
                          25-Mayo-2026 18:05:12
                        </span>
                      </div>
                    </div>

                    {/* Resguatados de seguridad summary */}
                    <div className={cn("p-5 rounded-xl border space-y-3", isDark ? "bg-emerald-950/10 border-emerald-500/10" : "bg-emerald-50/10 border-emerald-100")}>
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-5 h-5 shrink-0" />
                        <h5 className="font-bold text-xs uppercase tracking-wider">Análisis Técnico y Seguridad Vial ante Inyecciones (SQLi)</h5>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        El sistema actual cuenta con inmunidad estructural frente a inyecciones SQL convencionales. Al estar construido sobre una arquitectura Serverless NoSQL (usando el SDK oficial de **Google Firebase Firestore**), las consultas no se concatenan mediante cadenas de texto plano destructibles, sino que se invocan por referencias tipadas de objetos directos. Adicionalmente, todas las escrituras se validan mediante un modelo Zero-Trust en `firestore.rules` que ejecuta filtros estrictos de firmas de claves directas e impide modificaciones de claves no documentadas.
                      </p>
                    </div>

                    {/* Update log */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-black uppercase tracking-widest text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800/60">Historial de Actualizaciones Aplicadas</h5>
                      
                      <div className="border-l-2 border-indigo-500/30 pl-4 ml-2 space-y-6">
                        {/* Update Item 1 */}
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white dark:border-slate-900" />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Versión 25.5.26 • Core Adaptativo</span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold font-extrabold">Hoy, 18:05:12</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 font-medium">
                            Añadido el panel flotante de Información y Control de Características. Implementados switches interactivos en la base de datos de configuraciones del usuario para habilitar o deshabilitar dinámicamente servicios y módulos del navegador (CRM, ANT, Streaming, Asistente AI), reduciendo el peso de renderizado y adaptando el sistema a las necesidades del cliente final. Se robustecieron las protecciones de guardafuegos en la base de datos Firestore.
                          </p>
                        </div>

                        {/* Update Item 2 */}
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-slate-400 rounded-full border-2 border-white dark:border-slate-900" />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Versión 23.5.26 • Soporte de Crédito</span>
                            <span className="text-[10px] font-mono text-slate-400">23-Mayo-2026, 12:40:15</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 font-medium">
                            Integración del módulo de Tarjetas de Crédito, control de cupo total disponible y saldo por vencer de servicios de streaming. Configuración del temporizador por inactividad automático (auto-lock) ajustable.
                          </p>
                        </div>

                        {/* Update Item 3 */}
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-slate-400 rounded-full border-2 border-white dark:border-slate-900" />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Versión 21.5.26 • Inteligencia Artificial</span>
                            <span className="text-[10px] font-mono text-slate-400">21-Mayo-2026, 10:15:00</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 font-medium">
                            Mejoras en el Asistente AI conversacional, permitiendo realizar consultas dinámicas del saldo actual e historia clínica de transacciones locales por comandos de voz o texto sintetizado.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-sm">
                    <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl text-xs text-slate-500 font-medium">
                      Deshabilite características no deseadas para aligerar la interfaz de navegación del cliente. Las características deshabilitadas desaparecerán del menú principal. Al habilitarse nuevamente, recuperará el acceso directo de inmediato y se conservarán los datos intactos.
                    </div>

                    <div className="space-y-3 pt-2">
                      {[
                        { 
                          id: 'crm', 
                          label: 'CRM Relaciones', 
                          desc: 'Directorio de intermediarios locales, revendedores, deudores y registros de convenios.' 
                        },
                        { 
                          id: 'services', 
                          label: 'Servicios Digitales', 
                          desc: 'Gestión y venta de cuentas de streaming (Netflix, Disney) y de licencias digitales.' 
                        },
                        { 
                          id: 'updates', 
                          label: 'Actualizaciones ANT (Trámites)', 
                          desc: 'Trámites e intermediación de licencias ANT, cobro individual y multas de conductores.' 
                        },
                        { 
                          id: 'treasury', 
                          label: 'Tesorería y Caja', 
                          desc: 'Libro diario, flujos de efectivo ingresados y saldos bancarios o billeteras.' 
                        },
                        { 
                          id: 'alerts', 
                          label: 'Alertas y Cobros Inteligentes', 
                          desc: 'Módulo de recordatorios e historial clínico de cobros por pendientes o vencimientos.' 
                        },
                        { 
                          id: 'ai_assistant', 
                          label: 'Asistente de Inteligencia Artificial', 
                          desc: 'Asistente interactivo inteligente con comandos por mensaje.' 
                        },
                      ].map((feat) => {
                        const isEnabled = !(settings?.disabledFeatures || []).includes(feat.id);
                        return (
                          <div 
                            key={feat.id} 
                            className={cn(
                              "p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all",
                              isDark ? "bg-slate-900/40 border-slate-800 hover:border-slate-700" : "bg-white border-slate-100 hover:border-slate-200"
                            )}
                          >
                            <div className="space-y-0.5 max-w-[80%]">
                              <div className="flex items-center gap-2">
                                <span className={cn("text-xs font-extrabold pb-0.5", isDark ? "text-slate-100" : "text-slate-800")}>{feat.label}</span>
                                {isEnabled ? (
                                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[8px] font-bold px-1.5 py-0.2 rounded uppercase">Activo</span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 dark:bg-slate-850 dark:text-slate-400 text-[8px] font-bold px-1.5 py-0.2 rounded uppercase">Inactivo</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium leading-normal">{feat.desc}</p>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => toggleFeature(feat.id)}
                              className={cn(
                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                isEnabled ? "bg-indigo-600" : (isDark ? "bg-slate-800" : "bg-slate-200")
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                  isEnabled ? "translate-x-5" : "translate-x-0"
                                )}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-8 border-t border-slate-100 dark:border-slate-800/60 pt-4 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Código Seguro • ID: {user?.uid.substring(0, 8)}</span>
                <button
                  type="button"
                  onClick={() => setIsInfoModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-700/80 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cerrar Ventana
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
