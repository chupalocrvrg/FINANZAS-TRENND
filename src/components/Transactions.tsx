import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  MessageCircle, 
  MoreHorizontal, 
  Filter,
  CheckCircle2,
  X,
  Save,
  Loader2,
  Trash2,
  Wallet,
  Edit2
} from 'lucide-react';
import { Transaction, Entity, Wallet as WalletType } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy, increment } from 'firebase/firestore';

export function Transactions() {
  const { user, settings } = useAuth();
  const [selectedIntermediary, setSelectedIntermediary] = useState<string>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [intermediaries, setIntermediaries] = useState<Entity[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Payment processing state
  const [paymentTx, setPaymentTx] = useState<Transaction | null>(null);
  const [targetWalletId, setTargetWalletId] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Success Message
  const [successMsg, setSuccessMsg] = useState({show: false, phone: '', text: ''});

  const [formData, setFormData] = useState({
    id: '',
    intermediaryId: '',
    finalClientName: '',
    warehouse: '',
    isPaid: false
  });

  const isDark = settings?.theme === 'dark';

  useEffect(() => {
    if (!user) return;
    
    // Fetch Intermediaries
    const qEnt = query(collection(db, 'entities'), where('ownerId', '==', user.uid), where('type', '==', 'intermediary'));
    const unsubEnt = onSnapshot(qEnt, (snapshot) => {
      setIntermediaries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entity)));
    });

    // Fetch Transactions
    const qTx = query(
      collection(db, 'transactions'), 
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(docs);
      setLoading(false);
    });

    const qWallets = query(collection(db, 'wallets'), where('ownerId', '==', user.uid));
    const unsubWallets = onSnapshot(qWallets, (snapshot) => {
      setWallets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletType)));
    });

    return () => {
      unsubEnt();
      unsubTx();
      unsubWallets();
    };
  }, [user]);

  const handleWhatsAppIntermediary = (intermediaryId: string) => {
    const intermediary = intermediaries.find(i => i.id === intermediaryId);
    if (!intermediary) return;

    const unpaid = transactions.filter(tx => tx.intermediaryId === intermediaryId && !tx.isPaid);
    const total = unpaid.reduce((sum, tx) => sum + tx.chargedRate, 0);

    if (unpaid.length === 0) {
      alert("No hay deudas pendientes para este intermediario.");
      return;
    }

    let text = `*ESTADO DE CUENTA - ${intermediary.name}*\n\n`;
    unpaid.forEach(tx => {
      text += `• ${tx.finalClientName} - ${tx.warehouse}: *${formatCurrency(tx.chargedRate)}*\n`;
    });
    text += `\n*TOTAL PENDIENTE: ${formatCurrency(total)}*\n\nFavor realizar el pago a la brevedad.`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${intermediary.contact?.replace(/\D/g, '')}?text=${encoded}`, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.intermediaryId) return;
    setIsSubmitting(true);

    const inter = intermediaries.find(i => i.id === formData.intermediaryId);
    
    const intermediaryId = formData.intermediaryId;
    const intermediaryName = inter?.name || 'Unknown';
    const finalClientName = formData.finalClientName;
    const warehouse = formData.warehouse;
    const chargedRate = inter?.rate || 0;

    // Reset UI state immediately
    setIsModalOpen(false);
    const editingId = formData.id;
    setFormData({ id: '', intermediaryId: '', finalClientName: '', warehouse: '', isPaid: false });
    setIsSubmitting(false);

    try {
      if (editingId) {
        await updateDoc(doc(db, 'transactions', editingId), {
          intermediaryId,
          intermediaryName,
          finalClientName,
          warehouse,
          chargedRate,
          isPaid: formData.isPaid,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'transactions'), {
          intermediaryId,
          intermediaryName,
          finalClientName,
          warehouse,
          billingDate: new Date().toISOString().split('T')[0],
          baseCost: 5.0,
          chargedRate,
          isPaid: formData.isPaid,
          status: 'pending',
          ownerId: user.uid,
          createdAt: new Date().toISOString()
        });
        
        const phone = inter?.contact || '';
        const text = `Hola *${inter?.name || 'Distribuidor'}*, confirmamos que la actualización ANT para el cliente *${finalClientName}* (${warehouse}) se ha procedido a registrar exitosamente ✅.\n\nValor a cancelar: *${formatCurrency(chargedRate)}*.\n\nGracias por confiar en nosotros.`;
        setSuccessMsg({ show: true, phone, text });
      }
    } catch (error) {
      console.error(error);
      alert("Error al iniciar el guardado de datos.");
    }
  };

  const processPayment = async () => {
    if (!paymentTx || !targetWalletId) return;
    setIsProcessingPayment(true);
    try {
      await updateDoc(doc(db, 'transactions', paymentTx.id), { isPaid: true, updatedAt: new Date().toISOString() });
      
      await addDoc(collection(db, 'ledger'), {
        amount: paymentTx.chargedRate,
        category: 'Cobro de Actualización ANT',
        description: `Cobro a ${paymentTx.intermediaryName} por ${paymentTx.finalClientName}`,
        date: new Date().toISOString().split('T')[0],
        walletId: targetWalletId,
        isExpense: false,
        ownerId: user!.uid,
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'wallets', targetWalletId), {
        balance: increment(paymentTx.chargedRate)
      });
      
      setPaymentTx(null);
      setTargetWalletId('');
    } catch (e) {
      console.error("Error validando pago", e);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleToggleRealized = async (tx: Transaction) => {
    const nextStatus = tx.status === 'realized' ? 'pending' : 'realized';
    await updateDoc(doc(db, 'transactions', tx.id), { status: nextStatus, updatedAt: new Date().toISOString() });
    
    if (nextStatus === 'realized') {
      const inter = intermediaries.find(i => i.id === tx.intermediaryId);
      const phone = inter?.contact || '';
      if (phone) {
        const text = `Hola *${inter?.name || tx.intermediaryName}*, confirmamos que la actualización ANT para el cliente *${tx.finalClientName}* (${tx.warehouse}) se ha realizado con ÉXITO ✅.\n\nGracias por confiar en nosotros.`;
        if (confirm("Actualización marcada como realizada. ¿Desea notificar al intermediario por WhatsApp ahora?")) {
          window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
        }
      }
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'transactions', id));
  };

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto p-4 lg:p-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-left">
        <div className="space-y-1">
          <h2 className={cn("text-2xl lg:text-3xl font-bold tracking-tight uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
            Modulo de Actualizaciones ANT
          </h2>
          <p className="text-slate-500 font-medium">Registro de datos transaccionales y liquidación de intermediarios.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ id: '', intermediaryId: '', finalClientName: '', warehouse: '', isPaid: false });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-500/10 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nueva Actualización
        </button>
      </div>

      <div className={cn("rounded-3xl border shadow-sm overflow-hidden", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm")}>
        <div className={cn("p-5 border-b flex flex-col sm:flex-row justify-between items-center gap-4", isDark ? "border-slate-800 bg-slate-800/30" : "border-slate-50 bg-slate-50/50")}>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={selectedIntermediary}
              onChange={(e) => setSelectedIntermediary(e.target.value)}
              className={cn("bg-transparent font-black outline-none uppercase text-[10px] tracking-[0.2em] cursor-pointer flex-1 sm:flex-none", isDark ? "text-slate-300" : "text-slate-500")}
            >
              <option value="all">Visión Global</option>
              {intermediaries.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <button 
            onClick={() => selectedIntermediary !== 'all' && handleWhatsAppIntermediary(selectedIntermediary)}
            disabled={selectedIntermediary === 'all'}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
          >
            <MessageCircle className="w-4 h-4" />
            Procesar Liquidación
          </button>
        </div>

        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className={cn("text-[10px] font-black uppercase tracking-widest border-b text-left", isDark ? "bg-slate-800/50 text-slate-500 border-slate-800" : "bg-slate-100 text-slate-400 border-slate-100")}>
                <th className="px-6 lg:px-8 py-4">Referencia / Origen</th>
                <th className="px-6 lg:px-8 py-4">Intermediario</th>
                <th className="px-6 lg:px-8 py-4">Fecha</th>
                <th className="px-6 lg:px-8 py-4 text-right">Tarifa</th>
                <th className="px-6 lg:px-8 py-4">Status Act.</th>
                <th className="px-6 lg:px-8 py-4 text-center">Pago</th>
                <th className="px-6 lg:px-8 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-slate-800" : "divide-slate-100")}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Cargando transacciones...</td>
                </tr>
              ) : transactions
                .filter(tx => selectedIntermediary === 'all' || tx.intermediaryId === selectedIntermediary)
                .map((tx) => (
                <tr key={tx.id} className={cn("hover:bg-slate-50/30 transition-colors group", isDark ? "hover:bg-slate-800/20 text-slate-400" : "text-slate-700")}>
                  <td className="px-6 lg:px-8 py-4">
                    <div className="flex flex-col">
                      <span className={cn("font-bold tracking-tight", isDark ? "text-slate-200" : "text-slate-800")}>{tx.finalClientName}</span>
                      <span className="text-slate-500 text-[10px] uppercase font-black tracking-widest">{tx.warehouse}</span>
                    </div>
                  </td>
                  <td className="px-6 lg:px-8 py-4">
                    <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border", isDark ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200")}>
                      {tx.intermediaryName}
                    </span>
                  </td>
                  <td className="px-6 lg:px-8 py-4 font-mono text-xs font-bold tracking-tighter text-slate-500">{tx.billingDate}</td>
                  <td className={cn("px-6 lg:px-8 py-4 text-right font-mono font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    {formatCurrency(tx.chargedRate)}
                  </td>
                  <td className="px-6 lg:px-8 py-4">
                    <button 
                      onClick={() => handleToggleRealized(tx)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1 mx-auto",
                        tx.status === 'realized'
                          ? (isDark ? "bg-indigo-950/30 text-indigo-500 border-indigo-900/50 hover:bg-indigo-900/50" : "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100") 
                          : (isDark ? "bg-amber-950/30 text-amber-500 border-amber-900/50 hover:bg-amber-900/50" : "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100")
                      )}
                    >
                      {tx.status === 'realized' ? <><CheckCircle2 className="w-3.5 h-3.5" /> Realizada</> : <><MoreHorizontal className="w-3.5 h-3.5" /> Pendiente</>}
                    </button>
                  </td>
                  <td className="px-6 lg:px-8 py-4 text-center">
                    <button 
                      onClick={() => {
                        if (!tx.isPaid) {
                          setPaymentTx(tx);
                        } else {
                          // Un-paying not fully supported with wallet deduction yet, just visual toggle initially
                          // But we disable it for simplicity or show alert. Let's do nothing on paid.
                          // Or we could revert it, but it gets complicated. Let's just alert.
                          if(confirm("El pago ya fue registrado en caja. No puede desmarcarlo desde aquí.")) return;
                        }
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1 mx-auto",
                        tx.isPaid 
                          ? (isDark ? "bg-emerald-950/30 text-emerald-500 border-emerald-900/50 hover:bg-emerald-900/50" : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100") 
                          : (isDark ? "bg-rose-950/30 text-rose-500 border-rose-900/50 hover:bg-rose-900/50" : "bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100")
                      )}
                    >
                      {tx.isPaid ? <><CheckCircle2 className="w-3.5 h-3.5" /> Pagado</> : <><MoreHorizontal className="w-3.5 h-3.5" /> Pendiente</>}
                    </button>
                  </td>
                  <td className="px-6 lg:px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!tx.isPaid && (
                        <button 
                          onClick={() => {
                            const inter = intermediaries.find(i => i.id === tx.intermediaryId);
                            const phone = inter?.contact || '';
                            if (!phone) {
                              alert(`No se encontró número registrado para el intermediario "${tx.intermediaryName}".`);
                              return;
                            }
                            const text = `Hola *${inter?.name || tx.intermediaryName}*, te saludamos de *${settings?.companyName || 'Control Financiero'}*.\n\nTe recordamos el cobro de la actualización ANT de *${tx.finalClientName}* (${tx.warehouse}) por valor de *${formatCurrency(tx.chargedRate)}*.\n\n¡Muchas gracias!`;
                            window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                          }}
                          title="Enviar cobro por WhatsApp"
                          className="p-2 text-emerald-500 hover:text-emerald-600 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setFormData({
                            id: tx.id,
                            intermediaryId: tx.intermediaryId,
                            finalClientName: tx.finalClientName,
                            warehouse: tx.warehouse,
                            isPaid: tx.isPaid
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                        title="Modificar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(tx.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && transactions.length === 0 && (
            <div className="py-24 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">No hay transacciones registradas.</div>
          )}
        </div>
      </div>

      {/* Modal Nueva Actualización */}
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
                  {formData.id ? "Modificar Actualización" : "Nueva Actualización ANT"}
                </h3>
                <button onClick={() => {
                  setIsModalOpen(false);
                  setFormData({ id: '', intermediaryId: '', finalClientName: '', warehouse: '', isPaid: false });
                }} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Intermediario</label>
                  <select 
                    required
                    value={formData.intermediaryId}
                    onChange={(e) => setFormData({...formData, intermediaryId: e.target.value})}
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white")}
                  >
                    <option value="">Seleccione Intermediario...</option>
                    {intermediaries.map(i => <option key={i.id} value={i.id}>{i.name} (${i.rate})</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Nombre del Cliente Final</label>
                  <input 
                    required
                    type="text"
                    value={formData.finalClientName}
                    onChange={(e) => setFormData({...formData, finalClientName: e.target.value})}
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                    placeholder="Ej. Galo Peralta"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Almacén / Origen</label>
                  <input 
                    required
                    type="text"
                    value={formData.warehouse}
                    onChange={(e) => setFormData({...formData, warehouse: e.target.value})}
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                    placeholder="Ej. Matrix"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-indigo-50/50 border border-dashed border-slate-200/50 rounded-xl">
                  <input 
                    type="checkbox"
                    id="isPaidCheck"
                    checked={formData.isPaid}
                    onChange={(e) => setFormData({...formData, isPaid: e.target.checked})}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="isPaidCheck" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                    Marcar como pagado (El cliente ya pagó o es en efectivo)
                  </label>
                </div>

                <button 
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Confirmar Actualización
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setPaymentTx(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("relative w-full max-w-sm p-6 rounded-3xl border shadow-2xl z-10", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}>
              <div className="flex justify-between items-center mb-6">
                 <h3 className={cn("text-lg font-bold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>Registrar Cobro</h3>
                 <button onClick={() => setPaymentTx(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              <div className="space-y-4">
                 <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl">
                   <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1">Valor a Cobrar</p>
                   <p className="text-2xl font-black font-mono text-indigo-700 dark:text-indigo-400">{formatCurrency(paymentTx.chargedRate)}</p>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Billetera de Destino</label>
                   <select 
                     value={targetWalletId}
                     onChange={e => setTargetWalletId(e.target.value)}
                     className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200")}
                   >
                     <option value="">Seleccione Billetera / Cuenta...</option>
                     {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                   </select>
                 </div>
                 <button 
                   disabled={isProcessingPayment || !targetWalletId}
                   onClick={processPayment}
                   className="w-full mt-4 bg-indigo-600 text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   {isProcessingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5"/>}
                   Confirmar Cobro
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Notification Modal with WhatsApp Action */}
      <AnimatePresence>
        {successMsg.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} className={cn("relative w-full max-w-sm p-6 sm:p-8 rounded-3xl border shadow-2xl z-10 flex flex-col items-center text-center", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}>
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className={cn("text-xl font-bold uppercase tracking-tight mb-2", isDark ? "text-white" : "text-slate-900")}>Actualización Creada</h3>
              <p className="text-slate-500 text-sm mb-6">El registro se guardó existosamente. ¿Desea notificar al intermediario vía WhatsApp?</p>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setSuccessMsg({show: false, phone: '', text: ''})}
                  className={cn("flex-1 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest", isDark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                >
                  Cerrar
                </button>
                <button 
                  onClick={() => {
                     const encoded = encodeURIComponent(successMsg.text);
                     window.open(`https://wa.me/${successMsg.phone.replace(/\D/g, '')}?text=${encoded}`, '_blank');
                     setSuccessMsg({show: false, phone: '', text: ''});
                  }}
                  className="flex-1 bg-emerald-500 text-white px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4"/> WhatsApp
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
