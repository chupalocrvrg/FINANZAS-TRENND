import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { logout, db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Settings as SettingsIcon, Globe, Palette, Shield, LogOut, Smartphone, Building2, Plus, Trash2, X, Save, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Wallet } from '../types';

export function Settings() {
  const { user, settings, updateSettings } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletForm, setWalletForm] = useState({ name: '', type: 'bank', balance: '0' });

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
      await addDoc(collection(db, 'wallets'), {
        name: walletForm.name,
        type: walletForm.type,
        balance: parseFloat(walletForm.balance),
        ownerId: user.uid
      });
      setIsWalletModalOpen(false);
      setWalletForm({ name: '', type: 'bank', balance: '0' });
    } catch (e) {
      alert("Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWallet = async (id: string) => {
    if (confirm("¿Eliminar esta cuenta?")) {
      await deleteDoc(doc(db, 'wallets', id));
    }
  };

  const sections = [
    {
      id: 'personal',
      title: 'Identidad Global',
      icon: Smartphone,
      items: [
        { label: 'Nombre de la Empresa', field: 'companyName', type: 'text', value: settings?.companyName },
        { label: 'Nombre Completo del Propietario', field: 'displayName', type: 'text', value: settings?.displayName },
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
      title: 'Núcleo de Seguridad',
      icon: Shield,
      items: [
        { label: 'PIN de Seguridad', field: 'securityPin', type: 'password', value: settings?.securityPin },
      ]
    }
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto pb-24 text-left">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
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
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cuentas Bancarias y Billeteras</h2>
            </div>
            <button 
              onClick={() => setIsWalletModalOpen(true)}
              className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Cuenta
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {wallets.map(w => (
              <div key={w.id} className="p-4 border rounded-2xl flex items-center justify-between bg-white shadow-sm">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{w.type === 'bank' ? 'Banco' : w.type === 'cash' ? 'Efectivo' : 'Digital'}</span>
                  <p className="font-bold text-slate-800">{w.name}</p>
                </div>
                <button onClick={() => handleDeleteWallet(w.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
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
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <section.icon className="w-4 h-4 text-slate-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{section.title}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {section.items.map((item) => (
                <div key={item.field} className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block">{item.label}</label>
                  {item.type === 'text' || item.type === 'password' ? (
                    <input 
                      type={item.type}
                      value={item.value || ''}
                      onChange={(e) => updateSettings({ [item.field]: e.target.value })}
                      className="w-full bg-white border border-slate-200 p-3 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors shadow-sm text-slate-800"
                    />
                  ) : (
                    <div className="flex gap-2">
                      {item.options?.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => updateSettings({ [item.field]: opt.id })}
                          className={cn(
                            "flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all",
                            item.value === opt.id 
                              ? "bg-indigo-600 text-white border-indigo-600" 
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
          className="pt-12 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4"
        >
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Última Sincronización: {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Nunca'}
            </span>
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-1">
              Control Financiero • Versión Beta 1.0.0
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
            <motion.div onClick={() => setIsWalletModalOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div className="relative w-full max-w-sm p-8 rounded-3xl bg-white border border-slate-100 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900">Nueva Cuenta</h3>
                <button onClick={() => setIsWalletModalOpen(false)} className="text-slate-400"><X /></button>
              </div>
              <form onSubmit={handleAddWallet} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Nombre del Banco/Cuenta</label>
                  <input required type="text" value={walletForm.name} onChange={e => setWalletForm({...walletForm, name: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-bold text-slate-800" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Tipo</label>
                  <select required value={walletForm.type} onChange={e => setWalletForm({...walletForm, type: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-slate-200 outline-none text-sm font-bold text-slate-800">
                    <option value="bank">Banco / Transferencia</option>
                    <option value="cash">Efectivo</option>
                    <option value="digital_wallet">Billetera Digital/App</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Saldo Inicial ($)</label>
                  <input required type="number" step="0.01" value={walletForm.balance} onChange={e => setWalletForm({...walletForm, balance: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm font-bold text-slate-800" />
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full mt-4 bg-indigo-600 text-white p-4 rounded-2xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-indigo-700">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Cuenta
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
