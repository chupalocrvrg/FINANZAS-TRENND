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
  Edit2,
  ArrowLeftRight,
  Search
} from 'lucide-react';
import { LedgerType, Wallet, LedgerEntry } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy, updateDoc, increment } from 'firebase/firestore';
import { ConfirmModal } from './ConfirmModal';

export function Treasury() {
  const { user, settings } = useAuth();
  const [activeType, setActiveType] = useState<LedgerType>('business');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  
  const [selectedWalletForDetail, setSelectedWalletForDetail] = useState<Wallet | null>(null);
  const [editingLedgerEntry, setEditingLedgerEntry] = useState<LedgerEntry | null>(null);

  // Confirmation state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModalState({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

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

  const [transferData, setTransferData] = useState({
    sourceWalletId: '',
    destinationWalletId: '',
    amount: '',
    comment: ''
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

    const cat = formData.category;
    const desc = formData.description;
    const isRec = formData.isRecurring;
    const isPend = formData.isPending;
    const dDate = formData.dueDate;
    const instls = parseInt(formData.installments) || 1;
    const isCcPaid = formData.isCreditCardPayment;
    const tWallId = formData.targetWalletId;

    const categoryLower = cat.toLowerCase();
    const isLoanFlag = categoryLower.includes('préstamo') || categoryLower.includes('prestamo');

    if (!isPend && !formData.walletId) {
      alert("Seleccione una billetera si no es un pago pendiente.");
      return;
    }
    if (isLoanFlag && !formData.walletId) {
      alert("Para registrar un préstamo, por favor seleccione la billetera u origen de fondos de donde se debitará de forma inmediata.");
      return;
    }

    setIsSubmitting(true);

    const amount = parseFloat(formData.amount) * (formData.isExpense ? -1 : 1);
    
    // Capture values into local scope before resetting form state to prevent race conditions
    const wallId = (isPend && !isLoanFlag) ? '' : formData.walletId;

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
            isLoan: isLoanFlag,
            dueDate: dDate,
            installments: instls,
            isCreditCardPayment: isCcPaid,
            targetWalletId: tWallId,
            updatedAt: new Date().toISOString()
         });
         // Revert old
         if ((!editingLedgerEntry.isPending || editingLedgerEntry.isLoan) && editingLedgerEntry.walletId) {
             await updateDoc(doc(db, 'wallets', editingLedgerEntry.walletId), { balance: increment(-editingLedgerEntry.amount) });
             if (editingLedgerEntry.isCreditCardPayment && editingLedgerEntry.targetWalletId) {
                 await updateDoc(doc(db, 'wallets', editingLedgerEntry.targetWalletId), { balance: increment(-Math.abs(editingLedgerEntry.amount)) });
             }
         }
         // Apply new
         if ((!isPend || isLoanFlag) && wallId) {
             await updateDoc(doc(db, 'wallets', wallId), { balance: increment(amount) });
             if (isCcPaid && tWallId) {
                 await updateDoc(doc(db, 'wallets', tWallId), { balance: increment(Math.abs(amount)) });
             }
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
          isLoan: isLoanFlag,
          dueDate: dDate,
          installments: instls,
          isCreditCardPayment: isCcPaid,
          targetWalletId: tWallId,
          createdAt: new Date().toISOString()
         });

        if ((!isPend || isLoanFlag) && wallId) {
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

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { sourceWalletId, destinationWalletId, amount, comment } = transferData;
    
    if (!sourceWalletId || !destinationWalletId) {
      alert("Por favor seleccione ambas billeteras.");
      return;
    }
    if (sourceWalletId === destinationWalletId) {
      alert("La billetera de origen y destino no pueden ser iguales.");
      return;
    }
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      alert("Por favor ingrese un monto válido mayor a 0.");
      return;
    }

    const sourceWallet = wallets.find(w => w.id === sourceWalletId);
    if (sourceWallet && sourceWallet.balance < transferAmount) {
      if (!confirm(`La billetera de origen tiene saldo insuficiente (${formatCurrency(sourceWallet.balance)}), pero el monto de transferencia es de ${formatCurrency(transferAmount)}. ¿Desea continuar de todos modos con un saldo negativo?`)) {
        return;
      }
    }

    setIsTransferring(true);

    try {
      const sourceWalletName = wallets.find(w => w.id === sourceWalletId)?.name || 'Origen';
      const destWalletName = wallets.find(w => w.id === destinationWalletId)?.name || 'Destino';

      // 1. Deduct from source wallet
      await updateDoc(doc(db, 'wallets', sourceWalletId), {
        balance: increment(-transferAmount)
      });

      // 2. Add to destination wallet
      await updateDoc(doc(db, 'wallets', destinationWalletId), {
        balance: increment(transferAmount)
      });

      // 3. Write Ledger Entry for source wallet (egress)
      await addDoc(collection(db, 'ledger'), {
        type: activeType,
        category: "Transferencia (Egreso)",
        amount: -transferAmount,
        description: `Traspaso a ${destWalletName}${comment ? `. Nota: ${comment}` : ''}`,
        walletId: sourceWalletId,
        date: new Date().toISOString().split('T')[0],
        ownerId: user.uid,
        isRecurring: false,
        isPending: false,
        createdAt: new Date().toISOString()
      });

      // 4. Write Ledger Entry for destination wallet (income)
      await addDoc(collection(db, 'ledger'), {
        type: activeType,
        category: "Transferencia (Ingreso)",
        amount: transferAmount,
        description: `Traspaso desde ${sourceWalletName}${comment ? `. Nota: ${comment}` : ''}`,
        walletId: destinationWalletId,
        date: new Date().toISOString().split('T')[0],
        ownerId: user.uid,
        isRecurring: false,
        isPending: false,
        createdAt: new Date().toISOString()
      });

      setIsTransferModalOpen(false);
      setTransferData({ sourceWalletId: '', destinationWalletId: '', amount: '', comment: '' });
    } catch (error: any) {
      console.error("Error al transferir fondos:", error);
      alert("Error al procesar la transferencia: " + error.message);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleDelete = (entry: LedgerEntry) => {
    triggerConfirm(
      entry.amount < 0 ? "¿Eliminar gasto de tesorería?" : "¿Eliminar ingreso de tesorería?",
      `¿Está seguro de que desea eliminar permanentemente esta transacción de ${formatCurrency(Math.abs(entry.amount))} (${entry.category || 'Varios'})? Se reajustará el balance de la billetera afectada de forma automática.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'ledger', entry.id));
          if (!entry.isPending && entry.walletId) {
            await updateDoc(doc(db, 'wallets', entry.walletId), {
              balance: increment(-entry.amount)
            });
          }
          if (entry.isCreditCardPayment && entry.targetWalletId) {
            await updateDoc(doc(db, 'wallets', entry.targetWalletId), {
              balance: increment(-Math.abs(entry.amount))
            });
          }
        } catch (error) {
          console.error(error);
          alert("Error al eliminar.");
        }
      }
    );
  };

  const filteredLedger = ledger.filter(l => {
    const matchesType = l.type === activeType;
    if (!matchesType) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (l.category?.toLowerCase().includes(term)) || 
           (l.description?.toLowerCase().includes(term)) || 
           (l.amount?.toString().includes(term));
  });

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

      {/* Centered Search Bar */}
      <div className="flex justify-center w-full">
        <div className="relative w-full max-w-xl">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <Search className="w-5 h-5 animate-pulse text-indigo-500" />
          </span>
          <input
            type="text"
            placeholder="🔍 Búsqueda general de transacciones de tesorería (por categoría, descripción, monto)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold shadow-inner text-center tracking-wide",
              isDark 
                ? "border-slate-850 bg-slate-900/45 text-white placeholder-slate-500 focus:bg-slate-900" 
                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:bg-slate-50"
            )}
          />
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
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">
                {wallet.name}
              </span>
              <span className={cn("text-[8px] font-bold uppercase tracking-wider mt-0.5", wallet.type === 'credit_card' ? 'text-violet-400' : 'text-slate-500')}>
                {wallet.type === 'credit_card' ? `Tarjeta (Cupo)` : wallet.type === 'bank' ? 'Banco' : wallet.type === 'cash' ? 'Efectivo' : 'Billetera Digital'}
              </span>
            </div>
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
        <div className={cn("p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", isDark ? "border-slate-800 bg-slate-800/30" : "border-slate-50 bg-slate-50/50")}>
          <h3 className={cn("font-extrabold uppercase tracking-widest text-[10px]", isDark ? "text-slate-500" : "text-slate-800")}>Libro de Auditoría de Registros</h3>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setIsTransferModalOpen(true)}
              className="flex-1 sm:flex-none text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center justify-center gap-1.5 active:scale-95 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100/30 cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Transferir Fondos
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center justify-center gap-1 active:scale-95 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100/30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Ingreso Manual
            </button>
          </div>
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
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 border-slate-100 focus:bg-white focus:border-indigo-500")}
                    placeholder="Ej. Sueldo, Internet, Netflix, etc."
                  />
                  
                  {formData.isExpense && (
                    <div className="pt-2 flex flex-wrap gap-1.5 px-0.5">
                      <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block w-full mb-0.5">Sugerencias de Gastos:</span>
                      {[
                        { label: '🌐 Pago de Internet', val: 'Pago de Internet / Wifi' },
                        { label: '🙋‍♂️ Préstamo', val: 'Préstamo (Cuenta por Cobrar)', isLoan: true },
                        { label: '💳 Pagos de Tarjetas de Créditos', val: 'Pago de Tarjeta de Crédito', isCard: true },
                        { label: '🏢 Arriendo de Local', val: 'Arriendo de Local' },
                        { label: '⚡ Plan Celular', val: 'Plan de Telefonía' },
                        { label: '🔌 Servicios Públicos', val: 'Servicios Básicos (Luz/Agua/Gas)' },
                        { label: '📺 Pago Proveedores', val: 'Pago de Proveedores Digitales' }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              category: item.val,
                              isRecurring: !item.isLoan,
                              isPending: !!item.isLoan || prev.isPending,
                              isCreditCardPayment: !!item.isCard
                            }));
                          }}
                          className={cn(
                            "px-2 py-1 text-[9px] font-black rounded-lg border transition-all cursor-pointer hover:scale-105 active:scale-95",
                            isDark 
                              ? "bg-slate-950/65 border-slate-800 text-slate-300 hover:text-white" 
                              : "bg-slate-100/80 border-slate-200/80 text-slate-600 hover:text-slate-900"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {!formData.isExpense && (
                    <div className="pt-2 flex flex-wrap gap-1.5 px-0.5">
                      <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block w-full mb-0.5">Sugerencias de Ingresos:</span>
                      {[
                        { label: '💰 Venta de Servicio', val: 'Venta de Servicio Digital' },
                        { label: '📈 Comisiones', val: 'Comisiones de Ventas' },
                        { label: '🙋‍♂️ Cobro de Préstamo', val: 'Cobras - Cobro de Préstamo' },
                        { label: '💵 Depósito / Capital', val: 'Aporte de Capital / Depósito' }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              category: item.val,
                              isRecurring: false,
                              isPending: false,
                              isCreditCardPayment: false
                            }));
                          }}
                          className={cn(
                            "px-2 py-1 text-[9px] font-black rounded-lg border transition-all cursor-pointer hover:scale-105 active:scale-95",
                            isDark 
                              ? "bg-slate-950/65 border-slate-800 text-slate-300 hover:text-white" 
                              : "bg-slate-100/80 border-slate-200/80 text-slate-600 hover:text-slate-900"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600">
                      <input type="checkbox" checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked})} />
                      {formData.isExpense ? 'Gasto Fijo/Recurrente' : 'Ingreso Fijo/Recurrente (Ej. Sueldo)'}
                    </label>
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600">
                      <input type="checkbox" checked={formData.isPending} onChange={e => setFormData({...formData, isPending: e.target.checked})} />
                      Pendiente ({formData.isExpense ? (formData.category.toLowerCase().includes('préstamo') || formData.category.toLowerCase().includes('prestamo') ? 'CxC / Préstamo' : 'CxP') : 'CxC'})
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
                            {wallets.filter(w => w.type === 'credit_card').map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
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
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.type === 'credit_card' ? 'Cupo Disp.' : 'Saldo'}: {formatCurrency(w.balance)})
                        </option>
                      ))}
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
                            onClick={() => handleDelete(entry)}
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

      {/* Modal Transferencia entre Billeteras */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTransferModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn("relative w-full max-w-md p-8 rounded-3xl border shadow-2xl text-left", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-emerald-500" />
                  <h3 className={cn("text-lg font-bold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    Transferir Fondos
                  </h3>
                </div>
                <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Billetera de Origen (Deducir)</label>
                  <select 
                    required
                    value={transferData.sourceWalletId}
                    onChange={(e) => setTransferData({...transferData, sourceWalletId: e.target.value})}
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                  >
                    <option value="">Seleccione Origen...</option>
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} (Saldo: {formatCurrency(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Billetera de Destino (Abonar)</label>
                  <select 
                    required
                    value={transferData.destinationWalletId}
                    onChange={(e) => setTransferData({...transferData, destinationWalletId: e.target.value})}
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                  >
                    <option value="">Seleccione Destino...</option>
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} (Saldo: {formatCurrency(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Monto a Transferir ($)</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={transferData.amount}
                    onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Comentario / Nota del Movimiento</label>
                  <textarea 
                    value={transferData.comment}
                    onChange={(e) => setTransferData({...transferData, comment: e.target.value})}
                    placeholder="Escriba el motivo de la transferencia..."
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none h-20 resize-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                  />
                </div>

                <button 
                  disabled={isTransferring}
                  type="submit"
                  className="w-full text-white bg-emerald-600 hover:bg-emerald-700 p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  {isTransferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
                  Confirmar Transferencia
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        isDark={isDark}
      />
    </div>
  );
}
