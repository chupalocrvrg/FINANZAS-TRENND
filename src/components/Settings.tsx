import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { logout, db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Settings as SettingsIcon, Globe, Palette, Shield, LogOut, Smartphone, Building2, Plus, Trash2, X, Save, Edit2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
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
  const [walletForm, setWalletForm] = useState({ id: '', name: '', type: 'bank', balance: '0' });
  const isDark = settings?.theme === 'dark';

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
    setWalletForm({ id: '', name: '', type: 'bank', balance: '0' });
  };

  const handleEditWallet = (wallet: any) => {
    if (!wallet) return;
    setWalletForm({
      id: wallet.id || '',
      name: wallet.name || '',
      type: wallet.type || 'bank',
      balance: (wallet.balance !== undefined && wallet.balance !== null ? wallet.balance : 0).toString()
    });
    setIsWalletModalOpen(true);
  };

  const handleDeleteWallet = async (id: string) => {
    if (!id) return;
    if (window.confirm("¿Eliminar esta cuenta definitivamente?")) {
      try {
        await deleteDoc(doc(db, 'wallets', id));
      } catch (err) {
        console.error("Error al eliminar la cuenta:", err);
        window.alert("No se pudo eliminar la cuenta bancaria.");
      }
    }
  };

  const handleSettingClick = async (field: string, value: any) => {
    if (field === 'biometricEnabled' && value === true) {
      try {
        if (typeof navigator === 'undefined' || !navigator.credentials || !window.PublicKeyCredential) {
          window.alert("Este dispositivo o navegador no admite claves biométricas (WebAuthn).");
          return;
        }

        const confirmReg = window.confirm("Para habilitar el desbloqueo por biometría, registre su huella o rostro a continuación. Pulse Aceptar para iniciar:");
        if (!confirmReg) return;

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
          className="space-y-6"
        >
          <div className="flex items-center justify-between border-b border-indigo-100/20 pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-black">Cuentas Bancarias y Billeteras</h2>
            </div>
            <button 
              onClick={() => { resetWalletForm(); setIsWalletModalOpen(true); }}
              className="text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-950/80 flex items-center gap-1 transition-colors cursor-pointer border border-indigo-500/20"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Cuenta
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {wallets.map(w => (
              <div key={w.id} className={cn("p-4 border rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all", isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-100")}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{w.type === 'bank' ? 'Banco' : w.type === 'cash' ? 'Efectivo' : 'Digital'}</span>
                  <p className={cn("font-bold", isDark ? "text-slate-100" : "text-slate-800")}>{w.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleEditWallet(w)} 
                    title="Editar cuenta"
                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteWallet(w.id)} 
                    title="Eliminar de forma definitiva"
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            ))}
            {wallets.length === 0 && <div className="col-span-2 py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No hay cuentas configuradas</div>}
          </div>
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
              Control Financiero • Versión 1.1.3
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
                  {walletForm.id ? 'Editar Cuenta' : 'Nueva Cuenta'}
                </h3>
                <button onClick={() => { setIsWalletModalOpen(false); resetWalletForm(); }} className="text-slate-400 p-1 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-slate-600"><X /></button>
              </div>
              <form onSubmit={handleAddWallet} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Nombre del Banco/Cuenta</label>
                  <input required type="text" value={walletForm.name} onChange={e => setWalletForm({...walletForm, name: e.target.value})} className={cn("w-full mt-1 p-3 rounded-xl border focus:border-indigo-500 outline-none text-sm font-bold", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800")} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Tipo</label>
                  <select required value={walletForm.type} onChange={e => setWalletForm({...walletForm, type: e.target.value})} className={cn("w-full mt-1 p-3 rounded-xl border outline-none text-sm font-bold", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800")}>
                    <option value="bank">Banco / Transferencia</option>
                    <option value="cash">Efectivo</option>
                    <option value="digital_wallet">Billetera Digital/App</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Saldo actual o Inicial ($)</label>
                  <input required type="number" step="0.01" value={walletForm.balance} onChange={e => setWalletForm({...walletForm, balance: e.target.value})} className={cn("w-full mt-1 p-3 rounded-xl border focus:border-indigo-500 outline-none text-sm font-bold", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800")} />
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full mt-4 bg-indigo-600 text-white p-4 rounded-2xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-indigo-700 cursor-pointer">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {walletForm.id ? 'Guardar Cambios' : 'Registrar Cuenta'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
