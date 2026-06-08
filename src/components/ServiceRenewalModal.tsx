import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Wallet, Check, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { cn, formatCurrency, getGMT5DateString } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, doc, updateDoc, addDoc, increment } from 'firebase/firestore';

interface ServiceRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: any;
  wallets: any[];
  user: any;
  onSuccess: () => void | Promise<void>;
  isDark?: boolean;
}

export function ServiceRenewalModal({
  isOpen,
  onClose,
  service,
  wallets,
  user,
  onSuccess,
  isDark = false
}: ServiceRenewalModalProps) {
  // Duration values: 30 days (1 month), 90 days (3 months), 180 days (6 months), 365 days (12 months)
  const [selectedMonths, setSelectedMonths] = useState<30 | 90 | 180 | 365>(30);
  const [clientPrice, setClientPrice] = useState<string>('');
  const [supplierCost, setSupplierCost] = useState<string>('');
  const [clientPaymentType, setClientPaymentType] = useState<'paid' | 'pending'>('paid');
  const [clientWalletId, setClientWalletId] = useState<string>('');
  const [supplierPaymentType, setSupplierPaymentType] = useState<'paid' | 'pending'>('paid');
  const [supplierWalletId, setSupplierWalletId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto-calculate default prices when duration or service changes
  useEffect(() => {
    if (service) {
      let multiplier = 1;
      if (selectedMonths === 90) multiplier = 3;
      else if (selectedMonths === 180) multiplier = 6;
      else if (selectedMonths === 365) multiplier = 12;

      // Grab current base prices (per single month)
      // Usually, service.revenue is the standard monthly price.
      // However, sometimes it has a cumulative historical price. We can look at what the original or calculated monthly rate is.
      // Usually, we can take the current single-cycle rate if stored, or allow edit. Let's take (service.revenue / (historical_cycles || 1)) or service.revenue itself as the rate.
      // Wait, is there a standard base fee? Yes, we can just take what is currently stored since the user can edit it.
      // But let's check: if historical revenue is already accumulated, service.revenue itself might be the single monthly rate or the full accumulated rate.
      // Normally, `revenue` of the digital_service represents the current retail price. Let's multiply this.
      const baseRevenue = service.revenue || 0;
      const baseCost = service.cost || 0;

      // We allow users to modify it, but we calculate default:
      setClientPrice((baseRevenue * multiplier).toString());
      setSupplierCost((baseCost * multiplier).toString());
    }
  }, [service, selectedMonths]);

  // Set default wallets when opened
  useEffect(() => {
    if (wallets && wallets.length > 0) {
      const firstWalletId = wallets[0].id;
      setClientWalletId(firstWalletId);
      setSupplierWalletId(firstWalletId);
    }
  }, [wallets]);

  const handleConfirm = async () => {
    if (!service || !user) return;
    
    const parsedPrice = parseFloat(clientPrice) || 0;
    const parsedCost = parseFloat(supplierCost) || 0;

    if (clientPaymentType === 'paid' && !clientWalletId) {
      alert("Por favor, selecciona la cuenta donde ingresa el cobro del cliente.");
      return;
    }
    if (supplierPaymentType === 'paid' && !supplierWalletId) {
      alert("Por favor, selecciona la cuenta desde donde se paga el costo al proveedor.");
      return;
    }

    setIsSubmitting(true);
    try {
      const daysToAdd = selectedMonths;
      const todayStr = getGMT5DateString();
      let newDateStr = '';
      
      // Calculate new expiration date starting from the current expiration date (if in the future/today) or from today
      if (service.expirationDate) {
        const curr = new Date(service.expirationDate + "T00:00:00");
        const start = isNaN(curr.getTime()) || curr < new Date(todayStr + "T00:00:00") ? new Date(todayStr + "T00:00:00") : curr;
        start.setDate(start.getDate() + daysToAdd);
        newDateStr = getGMT5DateString(start);
      } else {
        const start = new Date(todayStr + "T00:00:00");
        start.setDate(start.getDate() + daysToAdd);
        newDateStr = getGMT5DateString(start);
      }

      // Add prices/costs to service metrics
      const updatedRevenue = (service.revenue || 0) + parsedPrice;
      const updatedCost = (service.cost || 0) + parsedCost;
      
      const addedAmountPaid = clientPaymentType === 'paid' ? parsedPrice : 0;
      const addedCostPaid = supplierPaymentType === 'paid' ? parsedCost : 0;

      const updatedAmountPaid = (service.amountPaid || 0) + addedAmountPaid;
      const updatedCostPaid = (service.costPaid || 0) + addedCostPaid;

      // Determine payment statuses based on complete balance sheets of the service item
      const isPaid = updatedAmountPaid >= (updatedRevenue - 0.005);
      const isCostPaid = updatedCostPaid >= (updatedCost - 0.005);

      const serviceDocRef = doc(db, 'digital_services', service.id);
      
      const updatePayload: any = {
        expirationDate: newDateStr,
        revenue: updatedRevenue,
        cost: updatedCost,
        amountPaid: updatedAmountPaid,
        costPaid: updatedCostPaid,
        isPaid,
        isCostPaid,
        status: 'active',
        updatedAt: new Date().toISOString()
      };

      // Write to Firebase
      await updateDoc(serviceDocRef, updatePayload);

      // Log service history function
      const logServiceHistory = async (serviceId: string, action: string, details: any) => {
        try {
          await addDoc(collection(db, 'digital_services', serviceId, 'service_history'), {
            action,
            details,
            userId: user.uid,
            createdAt: new Date().toISOString()
          });
        } catch (e) {
          console.error("Error logging service history:", e);
        }
      };

      await logServiceHistory(service.id, 'renewed_with_financials', {
        selectedMonths,
        priceCharged: parsedPrice,
        costPaid: parsedCost,
        clientPaymentType,
        supplierPaymentType,
        newExpirationDate: newDateStr
      });

      // Handle client cash movement (Ledger & Wallet)
      if (clientPaymentType === 'paid' && clientWalletId) {
        await addDoc(collection(db, 'ledger'), {
          amount: parsedPrice,
          category: 'Venta de Servicio Digital',
          description: `Cobro Renovación ${selectedMonths / 30} mes(es): ${service.name} de ${service.clientName || 'Cliente'}`,
          date: getGMT5DateString(),
          walletId: clientWalletId,
          isExpense: false,
          ownerId: user.uid,
          createdAt: new Date().toISOString()
        });

        await updateDoc(doc(db, 'wallets', clientWalletId), {
          balance: increment(parsedPrice)
        });
      }

      // Handle supplier cash movement (Ledger & Wallet)
      if (supplierPaymentType === 'paid' && supplierWalletId) {
        await addDoc(collection(db, 'ledger'), {
          amount: -parsedCost,
          category: 'Costo de Servicio Digital',
          description: `Pago Costo Renovación ${selectedMonths / 30} mes(es) a proveedor: ${service.name} de ${service.clientName || 'Cliente'}`,
          date: getGMT5DateString(),
          walletId: supplierWalletId,
          isExpense: true,
          ownerId: user.uid,
          createdAt: new Date().toISOString()
        });

        await updateDoc(doc(db, 'wallets', supplierWalletId), {
          balance: increment(-parsedCost)
        });
      }

      // Trigger local push notification
      const { sendLocalPushNotification } = await import('../lib/notifications');
      await sendLocalPushNotification(
        'Renovación Exitosa ✅',
        `Se extendió la cuenta de ${service.clientName || 'Cliente'} (${service.name}) por +${selectedMonths / 30} meses.`
      );

      if (onSuccess) {
        await onSuccess();
      }
      onClose();
    } catch (e) {
      console.error("Error executing custom renewal:", e);
      alert("Ocurrió un error al registrar la renovación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && service && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className={cn(
              "relative w-full max-w-lg overflow-hidden rounded-3xl border shadow-2xl z-10 flex flex-col max-h-[90vh]",
              isDark 
                ? "bg-slate-900 border-slate-800 text-white shadow-black/50" 
                : "bg-white border-slate-100 text-slate-800 shadow-slate-200/40"
            )}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className={cn(
                "absolute top-4 right-4 p-1.5 rounded-full transition-colors cursor-pointer",
                isDark ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
              )}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="p-6 border-b border-slate-800/10 dark:border-slate-800/40 text-left">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 shrink-0">
                  <RefreshCw className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h3 className={cn("text-base font-black uppercase tracking-wider", isDark ? "text-slate-100" : "text-slate-950")}>
                    Renovar Servicio Digital
                  </h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    {service.name} • Client: {service.clientName}
                  </p>
                </div>
              </div>
            </div>

            {/* Content (Scrollable) */}
            <div className="p-6 space-y-5 overflow-y-auto text-left">
              
              {/* 1. SELECCIÓN DE TIEMPO */}
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Tiempo de renovación (Meses)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { label: '1 Mes (30d)', value: 30 },
                    { label: '3 Meses (90d)', value: 90 },
                    { label: '6 Meses (180d)', value: 180 },
                    { label: '12 Meses (365d)', value: 365 }
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedMonths(opt.value)}
                      className={cn(
                        "py-3 px-1 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-1",
                        selectedMonths === opt.value
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15 scale-[1.02]"
                          : isDark
                            ? "bg-slate-950/55 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Calendar className="w-3.5 h-3.5 mb-0.5 shrink-0" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. DETALLE DE COBRO CLIENTE */}
              <div className={cn("p-4 rounded-2xl border", isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/50 border-slate-200/60")}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                    💰 Cobro al cliente (Venta)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setClientPaymentType('paid')}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer",
                        clientPaymentType === 'paid'
                          ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                          : "text-slate-400"
                      )}
                    >
                      Cobrado
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClientPaymentType('pending');
                        setClientWalletId('');
                      }}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer",
                        clientPaymentType === 'pending'
                          ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                          : "text-slate-400"
                      )}
                    >
                      Pendiente
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Monto Cobrado (Total)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={clientPrice}
                      onChange={(e) => setClientPrice(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Destino de Cobro
                    </label>
                    {clientPaymentType === 'paid' ? (
                      <select
                        value={clientWalletId}
                        onChange={(e) => setClientWalletId(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                      >
                        <option value="">-- Seleccionar Caja --</option>
                        {wallets.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({formatCurrency(w.balance || 0)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 text-xs text-amber-500 font-bold uppercase tracking-widest border border-dashed border-amber-500/20 rounded-xl bg-amber-500/5 text-center">
                        ⏳ Cuentas por Cobrar (AR)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. DETALLE DE PAGO PROVEEDOR */}
              <div className={cn("p-4 rounded-2xl border", isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/50 border-slate-200/60")}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-450">
                    💸 Coste de proveedor
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSupplierPaymentType('paid')}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer",
                        supplierPaymentType === 'paid'
                          ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                          : "text-slate-400"
                      )}
                    >
                      Pagar Proveedor
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSupplierPaymentType('pending');
                        setSupplierWalletId('');
                      }}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer",
                        supplierPaymentType === 'pending'
                          ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                          : "text-slate-400"
                      )}
                    >
                      Pendiente
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Monto Costo (Total)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={supplierCost}
                      onChange={(e) => setSupplierCost(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Origen de Pago
                    </label>
                    {supplierPaymentType === 'paid' ? (
                      <select
                        value={supplierWalletId}
                        onChange={(e) => setSupplierWalletId(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                      >
                        <option value="">-- Seleccionar Caja --</option>
                        {wallets.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({formatCurrency(w.balance || 0)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 text-xs text-amber-500 font-bold uppercase tracking-widest border border-dashed border-amber-500/20 rounded-xl bg-amber-500/5 text-center">
                        ⏳ Cuentas por Pagar (AP)
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800/10 dark:border-slate-800/40 flex flex-col sm:flex-row gap-2.5 text-left shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center transition-all cursor-pointer",
                  isDark
                    ? "bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                )}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-[2] py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-center transition-all shadow-lg shadow-indigo-600/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar Renovación e Integrar Financiera
                  </>
                )}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
