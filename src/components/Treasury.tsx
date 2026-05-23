import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  User, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus, 
  Wallet as WalletIcon,
  CreditCard,
  Briefcase,
  X,
  Save,
  Loader2,
  Trash2,
  Edit2
} from 'lucide-react';
import { LedgerType, Wallet, LedgerEntry } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy, updateDoc, increment } from 'firebase/firestore';

export function Treasury() {
  const { user, settings } = useAuth();
  const [activeType, setActiveType] = useState<LedgerType>('business');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedWalletForDetail, setSelectedWalletForDetail] = useState<Wallet | null>(null);
  const [editingLedgerEntry, setEditingLedgerEntry] = useState<LedgerEntry | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    category: '',
    amount: '',
    description: '',
    walletId: '',
    isExpense: false,
    isRecurring: false,
    isPending: false,
    dueDate: '',
    installments: '1',
    isCreditCardPayment: false,
    targetWalletId: ''
  });

  const isDark = settings?.theme === 'dark';

  useEffect(() => {
    if (!user) return;

    // Fetch Wallets
    const qWallets = query(collection(db, 'wallets'), where('ownerId', '==', user.uid));
    const unsubWallets = onSnapshot(qWallets, (snapshot) => {
      setWallets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallet)));
    });

    // Fetch Ledger
    const qLedger = query(
      collection(db, 'ledger'), 
      where('ownerId', '==', user.uid),
      orderBy('date', 'desc'),
      orderBy('createdAt', 'desc')
    );
    const unsubLedger = onSnapshot(qLedger, (snapshot) => {
      setLedger(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LedgerEntry)));
      setLoading(false);
    });

    return () => {
      unsubWallets();
      unsubLedger();
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.isPending && !formData.walletId) {
      alert("Seleccione una billetera si no es un pago pendiente.");
      return;
    }
    setIsSubmitting(true);

    const amount = parseFloat(formData.amount) * (formData.isExpense ? -1 : 1);
    
    // Capture values into local scope before resetting form state to prevent race conditions
    const cat = formData.category;
    const desc = formData.description;
    const wallId = formData.isPending ? '' : formData.walletId;
    const isRec = formData.isRecurring;
    const isPend = formData.isPending;
    const dDate = formData.dueDate;
    const instls = parseInt(formData.installments) || 1;
    const isCcPaid = formData.isCreditCardPayment;
    const tWallId = formData.targetWalletId;

    const editingId = formData.id;
    // Reset UI state immediately (optimistic offline-first pattern)
    setIsModalOpen(false);
    setFormData({ id: '', category: '', amount: '', description: '', walletId: '', isExpense: false, isRecurring: false, isPending: false, dueDate: '', installments: '1', isCreditCardPayment: false, targetWalletId: '' });
    setIsSubmitting(false);

    try {
      if (editingId && editingLedgerEntry) {
         await updateDoc(doc(db, 'ledger', editingId), {
            category: cat,
            amount: amount,
            description: desc,
            walletId: wallId,
            isRecurring: isRec,
            isPending: isPend,
            dueDate: dDate,
            installments: instls,
            isCreditCardPayment: isCcPaid,
            targetWalletId: tWallId,
            updatedAt: new Date().toISOString()
         });
         // Revert old
         if (!editingLedgerEntry.isPending && editingLedgerEntry.walletId) {
             await updateDoc(doc(db, 'wallets', editingLedgerEntry.walletId), { balance: increment(-editingLedgerEntry.amount) });
         }
         // Apply new
         if (!isPend && wallId) {
             await updateDoc(doc(db, 'wallets', wallId), { balance: increment(amount) });
         }
         setEditingLedgerEntry(null);
      } else {
        const ledgerPromise = addDoc(collection(db, 'ledger'), {
          type: activeType,
          category: cat,
          amount: amount,
          description: desc,
          walletId: wallId,
          date: new Date().toISOString().split('T')[0],
          ownerId: user.uid,
          isRecurring: isRec,
          isPending: isPend,
          dueDate: dDate,
          installments: instls,
          isCreditCardPayment: isCcPaid,
          targetWalletId: tWallId,
          createdAt: new Date().toISOString()
        });

        if (!isPend && wallId) {
          ledgerPromise.then(async () => {
            await updateDoc(doc(db, 'wallets', wallId), {
              balance: increment(amount)
            });
            
            if (isCcPaid && tWallId) {
               await updateDoc(doc(db, 'wallets', tWallId), {
                 balance: increment(Math.abs(amount))
               });
            }
          }).catch(err => {
            console.error("Firestore background update error:", err);
          });
        }
      }
    } catch (error) {
      console.error(error);
      alert("Error al iniciar el registro de datos.");
    }
  };

  const handleDelete = async (entry: LedgerEntry) => {
    try {
      await deleteDoc(doc(db, 'ledger', entry.id));
      if (!entry.isPending && entry.walletId) {
        await updateDoc(doc(db, 'wallets', entry.walletId), {
          balance: increment(-entry.amount)
        });
      }
    } catch (error) {
      console.error(error);
      alert("Error al eliminar.");
    }
  };

  const filteredLedger = ledger.filter(l => l.type === activeType);

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto p-4 lg:p-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="space-y-1">
          <h2 className={cn("text-2xl lg:text-3xl font-bold tracking-tight uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
            Tesorería Dual
          </h2>
          <p className="text-slate-500 font-medium">Aislar operaciones comerciales de los flujos financieros personales.</p>
        </div>
        <div className={cn("flex gap-2 p-1 rounded-2xl w-full sm:w-auto", isDark ? "bg-slate-900 border border-slate-800" : "bg-slate-100")}>
          <button
            onClick={() => setActiveType('business')}
            className={cn(
              "flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-widest flex items-center justify-center gap-2",
              activeType === 'business' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : (isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-900")
            )}
          >
            <Briefcase className="w-4 h-4" />
            Negocio
          </button>
          <button
            onClick={() => setActiveType('personal')}
            className={cn(
              "flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-widest flex items-center justify-center gap-2",
              activeType === 'personal' ? (isDark ? "bg-white text-slate-950 shadow-lg shadow-black/5" : "bg-slate-900 text-white shadow-lg shadow-black/20") : (isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-900")
            )}
          >
            <User className="w-4 h-4" />
            Personal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 animate-fade-in">
        {wallets.length > 0 ? wallets.map(wallet => (
          <motion.div 
            whileHover={{ y: -1, scale: 1.01 }}
            key={wallet.id}
            onClick={() => setSelectedWalletForDetail(wallet)}
            className={cn(
              "p-3 rounded-2xl border transition-all duration-300 cursor-pointer text-left flex flex-col justify-between min-h-[72px]",
              isDark ? "bg-slate-900/60 border-slate-800/80 hover:border-indigo-500/40" : "bg-white border-slate-200/80 shadow-xs hover:border-indigo-500/30 hover:shadow-sm"
            )}
          >
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">
              {wallet.name}
            </span>
            <div className={cn("text-base font-extrabold tracking-tight font-sans mt-0.5", isDark ? "text-white" : "text-slate-900")}>
              {formatCurrency(wallet.balance)}
            </div>
          </motion.div>
        )) : (
          <div className="col-span-full py-6 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] border border-dashed rounded-2xl">
            No hay billeteras configuradas.
          </div>
        )}
      </div>

      <div className={cn("rounded-3xl border shadow-sm overflow-hidden", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm")}>
        <div className={cn("p-6 border-b flex justify-between items-center", isDark ? "border-slate-800 bg-slate-800/30" : "border-slate-50 bg-slate-50/50")}>
          <h3 className={cn("font-extrabold uppercase tracking-widest text-[10px]", isDark ? "text-slate-500" : "text-slate-800")}>Libro de Auditoría de Registros</h3>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1 active:scale-95 px-3 py-1 bg-indigo-50 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Ingreso Manual
          </button>
        </div>
        <div className={cn("divide-y", isDark ? "divide-slate-800" : "divide-slate-100")}>
          {loading ? (
            <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">Actualizando registros...</div>
          ) : filteredLedger.map(entry => (
            <div key={entry.id} className={cn("p-4 lg:p-5 flex items-center justify-between transition-colors group", isDark ? "hover:bg-slate-800/20" : "hover:bg-slate-50/30")}>
              <div className="flex items-center gap-4 min-w-0">
                <div className={cn(
                  "p-2.5 rounded-xl border shrink-0",
                  entry.amount > 0 
                    ? (isDark ? "bg-emerald-950/20 text-emerald-500 border-emerald-900/50" : "bg-emerald-50 text-emerald-500 border-emerald-100")
                    : (isDark ? "bg-rose-950/20 text-rose-500 border-rose-900/50" : "bg-rose-50 text-rose-500 border-rose-100")
                )}>
                  {entry.amount > 0 ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h5 className={cn("font-bold tracking-tight text-sm truncate flex items-center gap-2", isDark ? "text-slate-200" : "text-slate-800")}>
                    {entry.category}
                    {entry.isRecurring && <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 text-[8px] uppercase tracking-widest rounded">Recurrente</span>}
                    {entry.isPending && <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] uppercase tracking-widest rounded">Pendiente</span>}
                  </h5>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider truncate">{entry.description}</p>
                  {(entry.dueDate || entry.installments) && (
                    <p className="text-slate-400 text-[10px] font-bold mt-1">
                      {entry.dueDate && <span>Vence/Cobro: {entry.dueDate}</span>}
                      {entry.installments && <span className="ml-2">Cuotas: {entry.installments}</span>}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 ml-4">
                <div className="text-right shrink-0">
                  <p className={cn(
                    "text-sm lg:text-base font-black tracking-tighter font-mono",
                    entry.amount > 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {entry.amount > 0 ? '+' : ''}{formatCurrency(entry.amount)}
                  </p>
                  <p className="text-slate-500 font-mono text-[10px] font-bold uppercase">{entry.date}</p>
                </div>
                <button 
                  onClick={() => handleDelete(entry)}
                  className="p-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {!loading && filteredLedger.length === 0 && (
            <div className="p-12 text-center text-slate-500 font-medium font-bold uppercase tracking-widest text-[10px]">No se encontraron registros en este libro.</div>
          )}
        </div>
      </div>

      {/* Modal Ingreso Manual */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn("relative w-full max-w-md p-8 rounded-3xl border shadow-2xl", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className={cn("text-xl font-bold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  {formData.isExpense ? 'Nuevo Egreso' : 'Nuevo Ingreso'} - {activeType === 'business' ? 'Negocio' : 'Personal'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, isExpense: false})}
                    className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", !formData.isExpense ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500")}
                  >
                    Ingreso
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, isExpense: true})}
                    className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", formData.isExpense ? "bg-rose-500 text-white shadow-sm" : "text-slate-500")}
                  >
                    Egreso (CxP)
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Categoría / Concepto</label>
                  <input 
                    required
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                    placeholder="Ej. Sueldo, Internet, Netflix, etc."
                  />
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600">
                      <input type="checkbox" checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked})} />
                      {formData.isExpense ? 'Gasto Fijo/Recurrente' : 'Ingreso Fijo/Recurrente (Ej. Sueldo)'}
                    </label>
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600">
                      <input type="checkbox" checked={formData.isPending} onChange={e => setFormData({...formData, isPending: e.target.checked})} />
                      Pendiente ({formData.isExpense ? 'CxP' : 'CxC'})
                    </label>
                  </div>

                  {(formData.isRecurring || formData.isPending) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Fecha de Cobro/Pago</label>
                        <input 
                          required
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                          className={cn("w-full p-3.5 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Cuotas/Veces (Opcial)</label>
                        <input 
                          type="number"
                          min="1"
                          value={formData.installments}
                          onChange={(e) => setFormData({...formData, installments: e.target.value})}
                          className={cn("w-full p-3.5 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                        />
                      </div>
                    </div>
                  )}

                  {formData.isExpense && (
                    <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                      <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600">
                        <input type="checkbox" checked={formData.isCreditCardPayment} onChange={e => setFormData({...formData, isCreditCardPayment: e.target.checked})} />
                        Es un pago a Tarjeta de Crédito (Liberar cupo)
                      </label>
                      {formData.isCreditCardPayment && (
                        <div className="space-y-1.5 mt-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Tarjeta de Crédito a Pagar (Receptor)</label>
                          <select 
                            required={formData.isCreditCardPayment}
                            value={formData.targetWalletId}
                            onChange={(e) => setFormData({...formData, targetWalletId: e.target.value})}
                            className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white")}
                          >
                            <option value="">Seleccione Tarjeta...</option>
                            {wallets.filter(w => w.type === 'digital_wallet').map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Monto ($)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Billetera {formData.isPending && '(Para pago futuro)'}</label>
                    <select 
                      required={!formData.isPending}
                      value={formData.walletId}
                      onChange={(e) => setFormData({...formData, walletId: e.target.value})}
                      className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white")}
                    >
                      <option value="">Seleccione...</option>
                      {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Descripción</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none h-24 resize-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                    placeholder="Detalles adicionales..."
                  />
                </div>

                <button 
                  disabled={isSubmitting}
                  type="submit"
                  className={cn(
                    "w-full text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-lg",
                    formData.isExpense ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                  )}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Registrar Movimiento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedWalletForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWalletForDetail(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn("relative w-full max-w-2xl p-6 lg:p-8 rounded-3xl border shadow-2xl flex flex-col max-h-[85vh]", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h3 className={cn("text-xl font-bold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>Movimientos - {selectedWalletForDetail.name}</h3>
                  <p className="text-slate-500 font-mono font-bold mt-1">Saldo Actual: {formatCurrency(selectedWalletForDetail.balance)}</p>
                </div>
                <button onClick={() => setSelectedWalletForDetail(null)} className="text-slate-400 hover:text-slate-600 transition-colors self-start">
                  <X />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-2 min-h-[300px]">
                <div className={cn("divide-y", isDark ? "divide-slate-800" : "divide-slate-100")}>
                  {ledger.filter(l => l.walletId === selectedWalletForDetail.id).length === 0 ? (
                    <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">No hay movimientos registrados en esta billetera.</div>
                  ) : ledger.filter(l => l.walletId === selectedWalletForDetail.id).map(entry => (
                    <div key={entry.id} className="py-4 flex items-center justify-between group">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn(
                          "p-2.5 rounded-xl border shrink-0",
                          entry.amount > 0 
                            ? (isDark ? "bg-emerald-950/20 text-emerald-500 border-emerald-900/50" : "bg-emerald-50 text-emerald-500 border-emerald-100")
                            : (isDark ? "bg-rose-950/20 text-rose-500 border-rose-900/50" : "bg-rose-50 text-rose-500 border-rose-100")
                        )}>
                          {entry.amount > 0 ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <h5 className={cn("font-bold tracking-tight text-sm truncate", isDark ? "text-slate-200" : "text-slate-800")}>{entry.category}</h5>
                          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider truncate">{entry.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right shrink-0">
                          <p className={cn(
                            "text-sm font-black tracking-tighter font-mono",
                            entry.amount > 0 ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {entry.amount > 0 ? '+' : ''}{formatCurrency(entry.amount)}
                          </p>
                          <p className="text-slate-500 font-mono text-[10px] font-bold uppercase">{entry.date}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingLedgerEntry(entry);
                              setFormData({
                                id: entry.id,
                                category: entry.category,
                                amount: Math.abs(entry.amount).toString(),
                                description: entry.description || '',
                                walletId: entry.walletId || '',
                                isExpense: entry.amount < 0,
                                isRecurring: entry.isRecurring || false,
                                isPending: entry.isPending || false,
                                dueDate: entry.dueDate || '',
                                installments: String(entry.installments || 1),
                                isCreditCardPayment: entry.isCreditCardPayment || false,
                                targetWalletId: entry.targetWalletId || ''
                              });
                              setSelectedWalletForDetail(null);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-500"
                            title="Modificar/Mover"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              await deleteDoc(doc(db, 'ledger', entry.id));
                              if (!entry.isPending && entry.walletId) {
                                 await updateDoc(doc(db, 'wallets', entry.walletId), { balance: increment(-entry.amount) });
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
