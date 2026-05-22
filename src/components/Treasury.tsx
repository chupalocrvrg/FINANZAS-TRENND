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
  Trash2
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

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    walletId: '',
    isExpense: false,
    isRecurring: false,
    isPending: false
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

    // Reset UI state immediately (optimistic offline-first pattern)
    setIsModalOpen(false);
    setFormData({ category: '', amount: '', description: '', walletId: '', isExpense: false, isRecurring: false, isPending: false });
    setIsSubmitting(false);

    try {
      // Create Ledger Entry and update balance in background
      // Firebase Firestore automatically queues these writes offline and applies them locally instantly
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
        createdAt: new Date().toISOString()
      });

      if (!isPend && wallId) {
        ledgerPromise.then(async () => {
          await updateDoc(doc(db, 'wallets', wallId), {
            balance: increment(amount)
          });
        }).catch(err => {
          console.error("Firestore background update error:", err);
        });
      }
    } catch (error) {
      console.error(error);
      alert("Error al iniciar el registro de datos.");
    }
  };

  const handleDelete = async (entry: LedgerEntry) => {
    if (confirm("¿Eliminar registro? Esto revertirá el saldo en la billetera.")) {
      try {
        await deleteDoc(doc(db, 'ledger', entry.id));
        await updateDoc(doc(db, 'wallets', entry.walletId), {
          balance: increment(-entry.amount)
        });
      } catch (error) {
        console.error(error);
        alert("Error al eliminar.");
      }
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {wallets.length > 0 ? wallets.map(wallet => (
          <motion.div 
            whileHover={{ y: -2 }}
            key={wallet.id}
            className={cn(
              "p-6 rounded-3xl border relative overflow-hidden group transition-all duration-300",
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
            )}
          >
            <div className="relative z-10 text-left">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-xl border transition-colors", isDark ? "bg-slate-800 text-slate-500 group-hover:text-indigo-400 border-slate-700" : "bg-slate-50 text-slate-400 group-hover:text-indigo-500 border-slate-100")}>
                  {wallet.type === 'cash' && <WalletIcon className="w-5 h-5" />}
                  {wallet.type === 'bank' && <Building2 className="w-5 h-5" />}
                  {wallet.type === 'digital_wallet' && <CreditCard className="w-5 h-5" />}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {wallet.type === 'digital_wallet' ? 'Virtual' : wallet.type === 'cash' ? 'Efectivo' : 'Banco'}
                </div>
              </div>
              <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-1">{wallet.name}</p>
              <h4 className={cn("text-xl lg:text-2xl font-bold tracking-tighter font-mono", isDark ? "text-white" : "text-slate-900")}>{formatCurrency(wallet.balance)}</h4>
            </div>
          </motion.div>
        )) : (
          <div className="lg:col-span-3 py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px] border border-dashed rounded-3xl">
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
                  <h5 className={cn("font-bold tracking-tight text-sm truncate", isDark ? "text-slate-200" : "text-slate-800")}>{entry.category}</h5>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider truncate">{entry.description}</p>
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
                    placeholder="Ej. Proveedor Internet, Netflix, etc."
                  />
                </div>
                
                {formData.isExpense && (
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600">
                      <input type="checkbox" checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked})} />
                      Pago Recurrente (Tarjeta, Internet)
                    </label>
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600">
                      <input type="checkbox" checked={formData.isPending} onChange={e => setFormData({...formData, isPending: e.target.checked})} />
                      Pendiente de Pago (CxP)
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
