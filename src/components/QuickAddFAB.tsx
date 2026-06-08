/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  User, 
  Users, 
  Briefcase, 
  Truck, 
  Tv, 
  Activity, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Loader2, 
  Save 
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { formatCurrency, cn } from '../lib/utils';

export function QuickAddFAB() {
  const { user, settings } = useAuth();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [fabSubmitting, setFabSubmitting] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'client' | 'reseller' | 'intermediary' | 'supplier' | 'digital_service' | 'ant_update' | 'income' | 'expense' | null>(null);

  const [wallets, setWallets] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);

  // CRM Form states
  const [fabEntityName, setFabEntityName] = useState('');
  const [fabEntityContact, setFabEntityContact] = useState('');
  const [fabEntityRate, setFabEntityRate] = useState('0');
  const [fabEntityIsAntUpdater, setFabEntityIsAntUpdater] = useState(false);
  const [fabEntityAntUpdateCost, setFabEntityAntUpdateCost] = useState('0');

  // Digital Service Form states
  const [fabDsName, setFabDsName] = useState('');
  const [fabDsCategory, setFabDsCategory] = useState('Streaming');
  const [fabDsClientName, setFabDsClientName] = useState('');
  const [fabDsClientContact, setFabDsClientContact] = useState('');
  const [fabDsCost, setFabDsCost] = useState('0');
  const [fabDsRevenue, setFabDsRevenue] = useState('0');
  const [fabDsWalletId, setFabDsWalletId] = useState('');
  const [fabDsDurationDays, setFabDsDurationDays] = useState('30');
  const [fabDsEmail, setFabDsEmail] = useState('');
  const [fabDsPassword, setFabDsPassword] = useState('');
  const [fabDsPin, setFabDsPin] = useState('');
  const [fabDsServiceType, setFabDsServiceType] = useState<'completa' | 'pantalla'>('completa');
  const [fabDsProfileName, setFabDsProfileName] = useState('');

  // ANT Update Form states
  const [fabAntIntermediaryId, setFabAntIntermediaryId] = useState('');
  const [fabAntUpdaterId, setFabAntUpdaterId] = useState('');
  const [fabAntFinalClientName, setFabAntFinalClientName] = useState('');
  const [fabAntWarehouse, setFabAntWarehouse] = useState('');
  const [fabAntChargedRate, setFabAntChargedRate] = useState('0');
  const [fabAntBaseCost, setFabAntBaseCost] = useState('0');

  // Ledger (Income/Expense) Form states
  const [fabLedgerAmount, setFabLedgerAmount] = useState('0');
  const [fabLedgerCategory, setFabLedgerCategory] = useState('');
  const [fabLedgerDescription, setFabLedgerDescription] = useState('');
  const [fabLedgerWalletId, setFabLedgerWalletId] = useState('');

  const isDark = settings?.theme === 'dark';

  useEffect(() => {
    if (!user) return;

    const unsubWallets = onSnapshot(query(collection(db, 'wallets'), where('ownerId', '==', user.uid)), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setWallets(list);
      if (list.length > 0 && !fabDsWalletId) {
        setFabDsWalletId(list[0].id);
      }
      if (list.length > 0 && !fabLedgerWalletId) {
        setFabLedgerWalletId(list[0].id);
      }
    });

    const unsubEntities = onSnapshot(query(collection(db, 'entities'), where('ownerId', '==', user.uid)), (snap) => {
      setEntities(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    return () => {
      unsubWallets();
      unsubEntities();
    };
  }, [user]);

  const resetFabForm = () => {
    setQuickAddType(null);
    setFabSubmitting(false);

    setFabEntityName('');
    setFabEntityContact('');
    setFabEntityRate('0');
    setFabEntityIsAntUpdater(false);
    setFabEntityAntUpdateCost('0');

    setFabDsName('');
    setFabDsCategory('Streaming');
    setFabDsClientName('');
    setFabDsClientContact('');
    setFabDsCost('0');
    setFabDsRevenue('0');
    setFabDsWalletId(wallets[0]?.id || '');
    setFabDsDurationDays('30');
    setFabDsEmail('');
    setFabDsPassword('');
    setFabDsPin('');
    setFabDsServiceType('completa');
    setFabDsProfileName('');

    setFabAntIntermediaryId('');
    setFabAntUpdaterId('');
    setFabAntFinalClientName('');
    setFabAntWarehouse('');
    const firstInter = entities.find(e => e.type === 'intermediary');
    const firstUpdater = entities.find(e => e.type === 'supplier');
    setFabAntChargedRate(firstInter ? String(firstInter.rate || 0) : '0');
    setFabAntBaseCost(firstUpdater ? String(firstUpdater.antUpdateCost || 0) : '0');

    setFabLedgerAmount('0');
    setFabLedgerCategory('');
    setFabLedgerDescription('');
    setFabLedgerWalletId(wallets[0]?.id || '');
  };

  const handleFabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || fabSubmitting || !quickAddType) return;
    setFabSubmitting(true);

    try {
      if (['client', 'reseller', 'intermediary', 'supplier'].includes(quickAddType)) {
        await addDoc(collection(db, 'entities'), {
          name: fabEntityName,
          contact: fabEntityContact,
          type: quickAddType,
          rate: quickAddType === 'intermediary' ? parseFloat(fabEntityRate) : 0,
          isAntUpdater: quickAddType === 'supplier' ? fabEntityIsAntUpdater : false,
          antUpdateCost: (quickAddType === 'supplier' && fabEntityIsAntUpdater) ? parseFloat(fabEntityAntUpdateCost) : 0,
          ownerId: user.uid,
          createdAt: new Date().toISOString()
        });
        alert("Entidad registrada correctamente ✓");
      }
      else if (quickAddType === 'digital_service') {
        const costVal = parseFloat(fabDsCost) || 0;
        const revVal = parseFloat(fabDsRevenue) || 0;
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + parseInt(fabDsDurationDays || '30'));

        // Check duplicates
        const { getDocs } = await import('firebase/firestore');
        const q = query(
          collection(db, 'digital_services'),
          where('ownerId', '==', user.uid),
          where('email', '==', fabDsEmail.trim())
        );
        const querySnapshot = await getDocs(q);
        const duplicate = querySnapshot.docs.find(docSnap => {
          const s = docSnap.data();
          return (
            s.email?.trim().toLowerCase() === fabDsEmail.trim().toLowerCase() &&
            s.password === fabDsPassword &&
            s.pin === fabDsPin &&
            (s.profileName || '') === fabDsProfileName &&
            s.name?.trim().toLowerCase() === fabDsName.trim().toLowerCase()
          );
        });

        if (duplicate) {
          alert("¡Error de duplicado! Ya existe una venta de servicio digital registrada exactamente con la misma cuenta, correo, clave, pin y nombre de perfil.");
          setFabSubmitting(false);
          return;
        }

        await addDoc(collection(db, 'digital_services'), {
          name: fabDsName,
          category: fabDsCategory,
          cost: costVal,
          revenue: revVal,
          clientName: fabDsClientName,
          clientContact: fabDsClientContact,
          email: fabDsEmail,
          password: fabDsPassword,
          pin: fabDsPin,
          serviceType: fabDsServiceType,
          profileName: fabDsProfileName,
          status: 'active',
          isPaid: false,
          isCostPaid: false,
          expirationDate: expDate.toISOString().split('T')[0],
          ownerId: user.uid,
          createdAt: new Date().toISOString()
        });
        alert("Servicio digital registrado correctamente ✓");
      }
      else if (quickAddType === 'ant_update') {
        const inter = entities.find(ent => ent.id === fabAntIntermediaryId);
        const upd = entities.find(ent => ent.id === fabAntUpdaterId);
        const costVal = parseFloat(fabAntBaseCost) || 0;
        const revVal = parseFloat(fabAntChargedRate) || 0;

        await addDoc(collection(db, 'transactions'), {
          intermediaryId: fabAntIntermediaryId,
          intermediaryName: inter?.name || 'Distribuidor',
          updaterId: fabAntUpdaterId,
          updaterName: upd?.name || 'Proveedor',
          finalClientName: fabAntFinalClientName,
          warehouse: fabAntWarehouse,
          billingDate: new Date().toISOString().split('T')[0],
          baseCost: costVal,
          chargedRate: revVal,
          isPaid: false,
          status: 'pending',
          ownerId: user.uid,
          createdAt: new Date().toISOString()
        });
        alert("Actualización de placa ANT registrada correctamente ✓");
      }
      else if (['income', 'expense'].includes(quickAddType)) {
        const numericAmount = parseFloat(fabLedgerAmount) || 0;
        const signedAmount = quickAddType === 'expense' ? -Math.abs(numericAmount) : Math.abs(numericAmount);

        // Update Wallet Balance
        if (fabLedgerWalletId) {
          await updateDoc(doc(db, 'wallets', fabLedgerWalletId), {
            balance: increment(signedAmount)
          });
        }

        // Add Ledger Entry
        await addDoc(collection(db, 'ledger'), {
          type: 'business',
          category: fabLedgerCategory || (quickAddType === 'income' ? 'Ingreso Adicional' : 'Egreso de Caja'),
          amount: signedAmount,
          description: fabLedgerDescription,
          walletId: fabLedgerWalletId,
          date: new Date().toISOString().split('T')[0],
          ownerId: user.uid,
          isRecurring: false,
          isPending: false,
          createdAt: new Date().toISOString()
        });
        alert("Transacción de Tesorería registrada correctamente ✓");
      }

      resetFabForm();
      setIsFabOpen(false);
    } catch (err) {
      console.error("Error Quick Add:", err);
      alert("Error al guardar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setFabSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-8 right-24 lg:right-28 z-40 flex flex-col items-end">
      <AnimatePresence>
        {isFabOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className={cn(
              "mb-4 w-80 sm:w-96 rounded-3xl border shadow-2xl overflow-hidden p-6 text-left",
              isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            <div className="flex justify-between items-center mb-4 border-b pb-3 border-slate-800/10 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500 animate-pulse shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Registro Rápido Directo</span>
              </div>
              <button
                onClick={() => { setIsFabOpen(false); resetFabForm(); }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickAddType === null ? (
              /* MENU DE SELECCION INICIAL */
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">¿Qué desea agregar?</div>
                
                {/* Categoría CRM */}
                <div className="space-y-2">
                  <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Contactos / CRM</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setQuickAddType('client'); setFabEntityName(''); setFabEntityContact(''); }}
                      className={cn("p-2.5 rounded-xl border text-[11px] font-bold uppercase transition-all flex items-center gap-2 text-left cursor-pointer", isDark ? "border-slate-800 bg-slate-800/40 hover:bg-slate-850" : "border-slate-100 bg-slate-50 hover:bg-slate-100")}
                    >
                      <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">Cliente</span>
                    </button>
                    <button
                      onClick={() => { setQuickAddType('reseller'); setFabEntityName(''); setFabEntityContact(''); }}
                      className={cn("p-2.5 rounded-xl border text-[11px] font-bold uppercase transition-all flex items-center gap-2 text-left cursor-pointer", isDark ? "border-slate-800 bg-slate-800/40 hover:bg-slate-850" : "border-slate-100 bg-slate-50 hover:bg-slate-100")}
                    >
                      <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">Revendedor</span>
                    </button>
                    <button
                      onClick={() => { setQuickAddType('intermediary'); setFabEntityName(''); setFabEntityContact(''); setFabEntityRate('0'); }}
                      className={cn("p-2.5 rounded-xl border text-[11px] font-bold uppercase transition-all flex items-center gap-2 text-left cursor-pointer", isDark ? "border-slate-800 bg-slate-800/40 hover:bg-slate-850" : "border-slate-100 bg-slate-50 hover:bg-slate-100")}
                    >
                      <Briefcase className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">Intermediario</span>
                    </button>
                    <button
                      onClick={() => { setQuickAddType('supplier'); setFabEntityName(''); setFabEntityContact(''); setFabEntityIsAntUpdater(false); setFabEntityAntUpdateCost('0'); }}
                      className={cn("p-2.5 rounded-xl border text-[11px] font-bold uppercase transition-all flex items-center gap-2 text-left cursor-pointer", isDark ? "border-slate-800 bg-slate-800/40 hover:bg-slate-850" : "border-slate-100 bg-slate-50 hover:bg-slate-100")}
                    >
                      <Truck className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">Proveedor</span>
                    </button>
                  </div>
                </div>

                {/* Operaciones */}
                <div className="space-y-2">
                  <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Ventas y Operaciones</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setQuickAddType('digital_service'); }}
                      className={cn("p-2.5 rounded-xl border text-[11px] font-bold uppercase transition-all flex items-center gap-2 text-left cursor-pointer", isDark ? "border-slate-800 bg-slate-800/40 hover:bg-slate-855" : "border-slate-100 bg-slate-50 hover:bg-slate-100")}
                    >
                      <Tv className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">Venta Cuenta</span>
                    </button>
                    <button
                      onClick={() => {
                        setQuickAddType('ant_update');
                        const firstInter = entities.find(e => e.type === 'intermediary');
                        const firstUpdater = entities.find(e => e.type === 'supplier');
                        setFabAntIntermediaryId(firstInter?.id || '');
                        setFabAntUpdaterId(firstUpdater?.id || '');
                        setFabAntChargedRate(firstInter ? String(firstInter.rate || 0) : '0');
                        setFabAntBaseCost(firstUpdater ? String(firstUpdater.antUpdateCost || 0) : '0');
                      }}
                      className={cn("p-2.5 rounded-xl border text-[11px] font-bold uppercase transition-all flex items-center gap-2 text-left cursor-pointer", isDark ? "border-slate-800 bg-slate-800/40 hover:bg-slate-855" : "border-slate-100 bg-slate-50 hover:bg-slate-100")}
                    >
                      <Activity className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">Placa ANT</span>
                    </button>
                  </div>
                </div>

                {/* Tesorería */}
                <div className="space-y-2">
                  <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Movimientos de Tesorería</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setQuickAddType('income'); setFabLedgerAmount(''); setFabLedgerCategory(''); setFabLedgerDescription(''); setFabLedgerWalletId(wallets[0]?.id || ''); }}
                      className={cn("p-2.5 rounded-xl border text-[11px] font-bold uppercase transition-all flex items-center gap-2 text-left cursor-pointer", isDark ? "border-slate-800 bg-slate-800/40 hover:bg-slate-855" : "border-slate-100 bg-slate-50 hover:bg-slate-100")}
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">Ingreso</span>
                    </button>
                    <button
                      onClick={() => { setQuickAddType('expense'); setFabLedgerAmount(''); setFabLedgerCategory(''); setFabLedgerDescription(''); setFabLedgerWalletId(wallets[0]?.id || ''); }}
                      className={cn("p-2.5 rounded-xl border text-[11px] font-bold uppercase transition-all flex items-center gap-2 text-left cursor-pointer", isDark ? "border-slate-800 bg-slate-800/40 hover:bg-slate-855" : "border-slate-100 bg-slate-50 hover:bg-slate-100")}
                    >
                      <ArrowDownCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">Egreso</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* FORMULARIO ACTIVO SEGÚN LO SELECCIONADO */
              <form onSubmit={handleFabSubmit} className="space-y-3.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuickAddType(null)}
                    className="text-[10px] font-bold text-indigo-500 hover:underline uppercase flex items-center gap-1 cursor-pointer"
                  >
                    ← Volver
                  </button>
                  <span className="text-[10px] text-slate-400">/ Nuevo Registro</span>
                </div>

                {/* 1. FORMULARIOS CRM (CLIENTE / REVENDEDOR / INTERMEDIARIO / PROVEEDOR) */}
                {['client', 'reseller', 'intermediary', 'supplier'].includes(quickAddType) && (
                  <div className="space-y-3">
                    <div className="text-xs font-black uppercase text-indigo-500">
                      {quickAddType === 'client' ? 'Nuevo Cliente' : quickAddType === 'reseller' ? 'Nuevo Revendedor' : quickAddType === 'intermediary' ? 'Nuevo Intermediario' : 'Nuevo Proveedor'}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Nombre / Razón Social</label>
                      <input
                        required
                        type="text"
                        value={fabEntityName}
                        onChange={(e) => setFabEntityName(e.target.value)}
                        className={cn("w-full p-3 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white focus:border-indigo-500")}
                        placeholder="Ej. Andrés Mendoza"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Celular (WhatsApp)</label>
                      <input
                        type="text"
                        value={fabEntityContact}
                        onChange={(e) => setFabEntityContact(e.target.value)}
                        className={cn("w-full p-3 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white focus:border-indigo-500")}
                        placeholder="Ej. +593987654321"
                      />
                    </div>
                    {quickAddType === 'intermediary' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Comisión / Tasa Cobrada por Placa (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={fabEntityRate}
                          onChange={(e) => setFabEntityRate(e.target.value)}
                          className={cn("w-full p-3 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white focus:border-indigo-500")}
                        />
                      </div>
                    )}
                    {quickAddType === 'supplier' && (
                      <div className="space-y-3 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <input
                            type="checkbox"
                            checked={fabEntityIsAntUpdater}
                            onChange={(e) => setFabEntityIsAntUpdater(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          />
                          <span className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">Es un Actualizador ANT</span>
                        </label>
                        {fabEntityIsAntUpdater && (
                          <div className="space-y-1 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900 bg-indigo-50/10">
                            <label className="text-[9px] font-bold uppercase text-indigo-500">Costo por Actualización (USD)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={fabEntityAntUpdateCost}
                              onChange={(e) => setFabEntityAntUpdateCost(e.target.value)}
                              className={cn("w-full p-2.5 rounded-md border text-xs font-bold transition-all outline-none text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200")}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. FORMULARIO SERVICIOS DIGITALES */}
                {quickAddType === 'digital_service' && (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    <div className="text-xs font-black uppercase text-indigo-500">Venta de Cuenta / Suscripción</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Cuenta / Servicio</label>
                        <input
                          required
                          type="text"
                          value={fabDsName}
                          onChange={(e) => setFabDsName(e.target.value)}
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white focus:border-indigo-500")}
                          placeholder="Ej. Netflix"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Categoría</label>
                        <select
                          value={fabDsCategory}
                          onChange={(e) => setFabDsCategory(e.target.value)}
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white")}
                        >
                          <option value="Streaming">Streaming</option>
                          <option value="Consolas">Consolas / Juegos</option>
                          <option value="Software">Software</option>
                          <option value="Servicios ANT">Servicios ANT</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Cliente</label>
                        <input
                          required
                          type="text"
                          value={fabDsClientName}
                          onChange={(e) => setFabDsClientName(e.target.value)}
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white focus:border-indigo-500")}
                          placeholder="Nombre cliente"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">WhatsApp</label>
                        <input
                          type="text"
                          value={fabDsClientContact}
                          onChange={(e) => setFabDsClientContact(e.target.value)}
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white focus:border-indigo-500")}
                          placeholder="WhatsApp"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Costo (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={fabDsCost}
                          onChange={(e) => setFabDsCost(e.target.value)}
                          className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">PVP (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={fabDsRevenue}
                          onChange={(e) => setFabDsRevenue(e.target.value)}
                          className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Días Validez</label>
                        <input
                          type="number"
                          value={fabDsDurationDays}
                          onChange={(e) => setFabDsDurationDays(e.target.value)}
                          className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                        />
                      </div>
                    </div>
                    
                    {/* Tipo de Acceso */}
                    <div className="space-y-1 pt-1.5 border-t border-slate-500/10">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-indigo-500">Tipo de Acceso de Venta</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFabDsServiceType('completa')}
                          className={cn("py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1",
                            fabDsServiceType === 'completa'
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : (isDark ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900")
                          )}
                        >
                          👤 Completa
                        </button>
                        <button
                          type="button"
                          onClick={() => setFabDsServiceType('pantalla')}
                          className={cn("py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1",
                            fabDsServiceType === 'pantalla'
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : (isDark ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900")
                          )}
                        >
                          📺 Pantalla
                        </button>
                      </div>
                    </div>

                    {/* Email y Contraseña */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Email Acceso</label>
                        <input
                          type="text"
                          value={fabDsEmail}
                          onChange={(e) => setFabDsEmail(e.target.value)}
                          className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white")}
                          placeholder="ejemplo@test.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Contraseña</label>
                        <input
                          type="text"
                          value={fabDsPassword}
                          onChange={(e) => setFabDsPassword(e.target.value)}
                          className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white")}
                          placeholder="Contraseña"
                        />
                      </div>
                    </div>

                    {/* Perfil y PIN */}
                    {fabDsServiceType === 'pantalla' ? (
                      <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-indigo-400 tracking-widest">Nombre Perfil</label>
                          <input
                            type="text"
                            required={fabDsServiceType === 'pantalla'}
                            value={fabDsProfileName}
                            placeholder="Ej. Perfil 1"
                            onChange={(e) => setFabDsProfileName(e.target.value)}
                            className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none border-indigo-500/20 shadow-inner text-left", isDark ? "bg-slate-800 text-white" : "bg-indigo-50/20 focus:bg-white")}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-indigo-400 tracking-widest">PIN Acceso</label>
                          <input
                            type="text"
                            required={fabDsServiceType === 'pantalla'}
                            value={fabDsPin}
                            placeholder="Ej. 1234"
                            onChange={(e) => setFabDsPin(e.target.value)}
                            className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none border-indigo-500/20 shadow-inner text-left", isDark ? "bg-slate-800 text-white" : "bg-indigo-50/20 focus:bg-white")}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 animate-in fade-in duration-200">
                        <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">PIN / Acceso (Opcional)</label>
                        <input
                          type="text"
                          value={fabDsPin}
                          placeholder="Ej. General, PIN (Opcional)"
                          onChange={(e) => setFabDsPin(e.target.value)}
                          className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white")}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 3. FORMULARIO ACTUALIZACIONES ANT */}
                {quickAddType === 'ant_update' && (
                  <div className="space-y-2.5">
                    <div className="text-xs font-black uppercase text-indigo-500">Nueva Actualización de Placa ANT</div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Intermediario / Distribuidor</label>
                      <select
                        value={fabAntIntermediaryId}
                        onChange={(e) => {
                          setFabAntIntermediaryId(e.target.value);
                          const inter = entities.find(ent => ent.id === e.target.value);
                          if (inter) setFabAntChargedRate(String(inter.rate || 0));
                        }}
                        className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                      >
                        <option value="">-- Seleccionar Intermediario --</option>
                        {entities.filter(ent => ent.type === 'intermediary').map(inter => (
                          <option key={inter.id} value={inter.id}>{inter.name} (Tasa: {formatCurrency(inter.rate || 0)})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Proveedor / Actualizador</label>
                      <select
                        value={fabAntUpdaterId}
                        onChange={(e) => {
                          setFabAntUpdaterId(e.target.value);
                          const upd = entities.find(ent => ent.id === e.target.value);
                          if (upd) setFabAntBaseCost(String(upd.antUpdateCost || 0));
                        }}
                        className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                      >
                        <option value="">-- Seleccionar Proveedor --</option>
                        {entities.filter(ent => ent.type === 'supplier').map(upd => (
                          <option key={upd.id} value={upd.id}>{upd.name} (Costo: {formatCurrency(upd.antUpdateCost || 0)})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Nombre Cliente Final</label>
                        <input
                          required
                          type="text"
                          value={fabAntFinalClientName}
                          onChange={(e) => setFabAntFinalClientName(e.target.value)}
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                          placeholder="Ej. Galo Peralta"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Detalle Placa / Trámite</label>
                        <input
                          required
                          type="text"
                          value={fabAntWarehouse}
                          onChange={(e) => setFabAntWarehouse(e.target.value)}
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                          placeholder="Ej. PCB-1234"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Costo Base Cobrado (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={fabAntBaseCost}
                          onChange={(e) => setFabAntBaseCost(e.target.value)}
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Tarifa Cobrada (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={fabAntChargedRate}
                          onChange={(e) => setFabAntChargedRate(e.target.value)}
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. FORMULARIO TESORERÍA (INGRESO / EGRESO) */}
                {['income', 'expense'].includes(quickAddType) && (
                  <div className="space-y-2.5">
                    <div className="text-xs font-black uppercase text-indigo-500">
                      {quickAddType === 'income' ? 'Nuevo Ingreso Adicional' : 'Nuevo Egreso de Caja'}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Monto del Movimiento (USD)</label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          value={fabLedgerAmount}
                          onChange={(e) => setFabLedgerAmount(e.target.value)}
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                          placeholder="Ej. 10.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Caja / Wallet destino</label>
                        <select
                          value={fabLedgerWalletId}
                          onChange={(e) => setFabLedgerWalletId(e.target.value)}
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                        >
                          {wallets.map(w => (
                            <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance || 0)})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Categoría</label>
                      <input
                        type="text"
                        value={fabLedgerCategory}
                        onChange={(e) => setFabLedgerCategory(e.target.value)}
                        className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                        placeholder={quickAddType === 'income' ? 'Ej. Intereses, Venta Equipos' : 'Ej. Compras, Viáticos'}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Detalle / Notas</label>
                      <input
                        required
                        type="text"
                        value={fabLedgerDescription}
                        onChange={(e) => setFabLedgerDescription(e.target.value)}
                        className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                        placeholder="Notas explicativas del movimiento"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={fabSubmitting}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20 cursor-pointer"
                >
                  {fabSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Guardar Registro</span>
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACTIVATOR FAB BUTTON */}
      <motion.button
        onClick={() => {
          setIsFabOpen(!isFabOpen);
          resetFabForm();
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "p-4 rounded-full text-white shadow-2xl flex items-center justify-center cursor-pointer transition-colors relative",
          isFabOpen ? "bg-rose-500 hover:bg-rose-600 rotate-45" : "bg-indigo-600 hover:bg-indigo-700"
        )}
        style={{ transformOrigin: 'center' }}
        title={isFabOpen ? "Cerrar menú rápido" : "Acceso rápido - Añadir registro"}
      >
        <Plus className="w-6 h-6 transition-transform duration-200" />
      </motion.button>
    </div>
  );
}
