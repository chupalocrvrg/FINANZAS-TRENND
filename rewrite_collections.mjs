import fs from 'fs';

const code = `import React, { useState, useEffect, useMemo } from "react";
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Search, FileText, ChevronRight, CreditCard, ChevronLeft, Calendar, CheckCircle, History, User, Edit2, Printer } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function CollectionsTab({ user, isDark }: { user: any; isDark: boolean }) {
  const [sales, setSales] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentComment, setPaymentComment] = useState("");
  
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const [clientTab, setClientTab] = useState<"pending" | "history">("pending");
  const [editPaymentModalOpen, setEditPaymentModalOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<any>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentComment, setEditPaymentComment] = useState("");

  useEffect(() => {
    if (!user) return;
    const qS = query(collection(db, "users", user.uid, "commerce_sales"));
    const unsubS = onSnapshot(qS, (snap) => {
      setSales(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qE = query(collection(db, "entities"));
    const unsubE = onSnapshot(qE, (snap) => {
      setEntities(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((e: any) => e.ownerId === user.uid));
    });

    return () => {
      unsubS();
      unsubE();
    };
  }, [user]);

  const clientData = useMemo(() => {
    const data: Record<string, { clientName: string, clientId: string, cedula: string, totalPending: number, installments: any[] }> = {};
    
    sales.forEach(sale => {
      const cId = sale.clientId || sale.clientName;
      if (!cId) return;

      if (!data[cId]) {
        let cName = sale.clientName;
        let cCedula = sale.clientCedula || "";
        const entity = entities.find(e => e.id === sale.clientId);
        if (entity) {
          cName = entity.name;
          cCedula = entity.documentNumber || "";
        }
        data[cId] = {
          clientId: cId,
          clientName: cName,
          cedula: cCedula,
          totalPending: 0,
          installments: []
        };
      }

      (sale.installments || []).forEach((inst: any, idx: number) => {
        const pending = inst.amount - (inst.paidAmount || 0);
        if (inst.status !== 'paid') {
          data[cId].totalPending += pending;
        }
        data[cId].installments.push({
          ...inst,
          saleId: sale.id,
          saleItems: sale.items || [],
          installmentIndex: idx,
          pendingAmount: pending
        });
      });
    });

    Object.values(data).forEach(client => {
      client.installments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    });

    return Object.values(data);
  }, [sales, entities]);

  const filteredClients = useMemo(() => {
    let list = clientData;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(c => 
        c.clientName.toLowerCase().includes(s) || 
        c.cedula.toLowerCase().includes(s)
      );
    }
    // Only show clients with pending debts if no search, else show all matching
    if (!search.trim()) {
      list = list.filter(c => c.totalPending > 0);
    }
    return list;
  }, [clientData, search]);

  const selectedClient = useMemo(() => {
    return clientData.find(c => c.clientId === selectedClientId);
  }, [clientData, selectedClientId]);

  // Extract all payments for history
  const paymentHistory = useMemo(() => {
    if (!selectedClient) return [];
    const payments: any[] = [];
    selectedClient.installments.forEach(inst => {
      if (inst.payments && inst.payments.length > 0) {
        inst.payments.forEach((p: any, pIdx: number) => {
          payments.push({
            ...p,
            saleId: inst.saleId,
            installmentIndex: inst.installmentIndex,
            paymentIndex: pIdx,
            installmentNumber: inst.installmentNumber,
            saleItems: inst.saleItems
          });
        });
      }
    });
    return payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedClient]);

  const pendingInstallments = useMemo(() => {
    return selectedClient?.installments.filter(i => i.status !== 'paid') || [];
  }, [selectedClient]);

  const handleExportPDF = () => {
    if (!selectedClient) return;

    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text("Estado de Cuenta", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(\`Cliente: \${selectedClient.clientName}\`, 14, 30);
    doc.text(\`Fecha de Emisión: \${new Date().toLocaleDateString()}\`, 14, 36);
    doc.text(\`Total Pendiente: \${formatCurrency(selectedClient.totalPending)}\`, 14, 42);

    const tableData: any[] = [];
    
    selectedClient.installments.forEach((inst: any) => {
      const itemsStr = (inst.saleItems || []).map((i:any) => i.name).join(", ");
      
      if (inst.payments && inst.payments.length > 0) {
        inst.payments.forEach((p: any) => {
          tableData.push([
            new Date(p.date).toLocaleDateString(),
            itemsStr,
            \`Cuota #\${inst.installmentNumber}\`,
            formatCurrency(p.amount),
            p.comment || ""
          ]);
        });
      }
      
      if (inst.status !== 'paid') {
        const pending = inst.amount - (inst.paidAmount || 0);
        tableData.push([
          new Date(inst.dueDate).toLocaleDateString(),
          itemsStr,
          \`Cuota #\${inst.installmentNumber} (Pendiente)\`,
          formatCurrency(pending),
          "---"
        ]);
      }
    });

    tableData.sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    autoTable(doc, {
      startY: 50,
      head: [["Fecha", "Artículo", "Detalle", "Monto", "Comentarios"]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 }
    });

    doc.save(\`Estado_Cuenta_\${selectedClient.clientName.replace(/ /g, '_')}.pdf\`);
  };

  const confirmPayment = async () => {
    if (!selectedClient) return;
    
    let amountToApply = parseFloat(paymentAmount);
    if (isNaN(amountToApply) || amountToApply <= 0) return alert("Monto inválido");
    
    const updatesBySaleId: Record<string, any> = {};
    const receiptsGenerated: any[] = [];
    const nowIso = new Date().toISOString();

    for (const inst of pendingInstallments) {
      if (amountToApply <= 0.001) break;
      
      const saleId = inst.saleId;
      const sale = sales.find(s => s.id === saleId);
      if (!sale) continue;

      if (!updatesBySaleId[saleId]) {
        updatesBySaleId[saleId] = {
          installments: JSON.parse(JSON.stringify(sale.installments))
        };
      }

      const saleUpdates = updatesBySaleId[saleId];
      const targetInst = saleUpdates.installments[inst.installmentIndex];
      
      const pendingOnInst = targetInst.amount - (targetInst.paidAmount || 0);
      const appliedToInst = Math.min(pendingOnInst, amountToApply);
      
      targetInst.paidAmount = (targetInst.paidAmount || 0) + appliedToInst;
      targetInst.paidAt = nowIso;
      targetInst.payments = targetInst.payments || [];
      targetInst.payments.push({
        amount: appliedToInst,
        date: nowIso,
        comment: paymentComment
      });

      if (targetInst.paidAmount >= targetInst.amount - 0.01) {
        targetInst.status = "paid";
      } else {
        targetInst.status = "partial";
      }
      
      amountToApply -= appliedToInst;

      const dueDate = new Date(targetInst.dueDate);
      const today = new Date();
      let delayDays = 0;
      if (today > dueDate) {
         const diffTime = Math.abs(today.getTime() - dueDate.getTime());
         delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      }

      receiptsGenerated.push({
        clientName: selectedClient.clientName,
        installmentNumber: targetInst.installmentNumber,
        delayDays,
        amountPaid: appliedToInst,
        remainingBalance: targetInst.amount - targetInst.paidAmount,
        paymentDate: nowIso,
        comment: paymentComment,
        saleItems: inst.saleItems
      });
    }

    try {
      for (const [saleId, data] of Object.entries(updatesBySaleId)) {
        const allPaid = data.installments.every((i: any) => i.status === "paid");
        await updateDoc(doc(db, "users", user.uid, "commerce_sales", saleId), {
          installments: data.installments,
          status: allPaid ? "completed" : "active",
        });
      }
      
      setPaymentModalOpen(false);
      setPaymentAmount("");
      setPaymentComment("");
      
      if (receiptsGenerated.length > 0) {
        const totalPaid = receiptsGenerated.reduce((sum, r) => sum + r.amountPaid, 0);
        const maxDelay = Math.max(...receiptsGenerated.map(r => r.delayDays));
        
        setReceiptData({
          clientName: selectedClient.clientName,
          installmentNumber: receiptsGenerated.map(r => r.installmentNumber).join(", "),
          delayDays: maxDelay,
          amountPaid: totalPaid,
          remainingBalance: selectedClient.totalPending - totalPaid,
          paymentDate: nowIso,
          comment: paymentComment
        });
        setReceiptModalOpen(true);
      }
      
    } catch (err) {
      console.error(err);
      alert("Error al registrar el cobro");
    }
  };

  const handleEditPayment = async () => {
    if (!paymentToEdit) return;
    const newAmount = parseFloat(editPaymentAmount);
    if (isNaN(newAmount) || newAmount < 0) return alert("Monto inválido");

    const sale = sales.find(s => s.id === paymentToEdit.saleId);
    if (!sale) return;

    const newInstallments = JSON.parse(JSON.stringify(sale.installments));
    const targetInst = newInstallments[paymentToEdit.installmentIndex];
    const targetPayment = targetInst.payments[paymentToEdit.paymentIndex];

    // Adjust paid amount
    const oldAmount = targetPayment.amount;
    targetInst.paidAmount = (targetInst.paidAmount || 0) - oldAmount + newAmount;
    
    targetPayment.amount = newAmount;
    targetPayment.comment = editPaymentComment;

    if (targetInst.paidAmount >= targetInst.amount - 0.01) {
      targetInst.status = "paid";
    } else if (targetInst.paidAmount > 0) {
      targetInst.status = "partial";
    } else {
      targetInst.status = "pending";
    }

    const allPaid = newInstallments.every((i: any) => i.status === "paid");

    try {
      await updateDoc(doc(db, "users", user.uid, "commerce_sales", paymentToEdit.saleId), {
        installments: newInstallments,
        status: allPaid ? "completed" : "active",
      });
      setEditPaymentModalOpen(false);
      setPaymentToEdit(null);
    } catch (err) {
      console.error(err);
      alert("Error al editar el pago");
    }
  };

  const reprintReceipt = (payment: any) => {
    setReceiptData({
      clientName: selectedClient!.clientName,
      installmentNumber: payment.installmentNumber,
      delayDays: 0,
      amountPaid: payment.amount,
      remainingBalance: 0, // Simplified for reprint
      paymentDate: payment.date,
      comment: payment.comment
    });
    setReceiptModalOpen(true);
  };

  if (selectedClient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedClientId(null)}
            className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold">{selectedClient.clientName}</h2>
            <p className="text-sm opacity-70">CI: {selectedClient.cedula}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
          <div>
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Total por Cobrar</p>
            <p className="text-3xl font-black">{formatCurrency(selectedClient.totalPending)}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Estado de Cuenta
            </button>
            <button 
              onClick={() => setPaymentModalOpen(true)}
              disabled={selectedClient.totalPending <= 0}
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-xl font-bold shadow-lg transition-colors",
                selectedClient.totalPending > 0 
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20" 
                  : "bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400"
              )}
            >
              <CreditCard className="w-4 h-4" />
              Registrar Cobro
            </button>
          </div>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
          <button
            onClick={() => setClientTab("pending")}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
              clientTab === "pending" ? "bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400" : "opacity-70 hover:opacity-100"
            )}
          >
            Cuotas Pendientes
          </button>
          <button
            onClick={() => setClientTab("history")}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
              clientTab === "history" ? "bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400" : "opacity-70 hover:opacity-100"
            )}
          >
            Historial de Pagos
          </button>
        </div>

        {clientTab === "pending" && (
          <div className="space-y-4">
            <div className="grid gap-3">
              {pendingInstallments.length > 0 ? pendingInstallments.map((inst, idx) => {
                const dueDate = new Date(inst.dueDate);
                const isOverdue = dueDate < new Date();
                
                return (
                  <div key={\`\${inst.saleId}-\${idx}\`} className={cn(
                    "flex justify-between items-center p-4 rounded-xl border transition-colors",
                    isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200",
                    isOverdue && (isDark ? "border-red-900/50 bg-red-900/10" : "border-red-200 bg-red-50")
                  )}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-lg">Cuota #{inst.installmentNumber}</span>
                        {isOverdue && <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Mora</span>}
                      </div>
                      <p className="text-sm font-medium opacity-80 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        Vence: {dueDate.toLocaleDateString()}
                      </p>
                      <p className="text-xs opacity-60 mt-1 line-clamp-1">
                        {inst.saleItems?.map((i:any) => i.name).join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(inst.pendingAmount)}
                      </p>
                      {inst.paidAmount > 0 && (
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                          Abonado: {formatCurrency(inst.paidAmount)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8 opacity-50">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-30 text-emerald-500" />
                  <p>Este cliente no tiene cuotas pendientes.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {clientTab === "history" && (
          <div className="space-y-4">
            <div className="grid gap-3">
              {paymentHistory.length > 0 ? paymentHistory.map((payment, idx) => (
                <div key={idx} className={cn(
                  "flex justify-between items-center p-4 rounded-xl border transition-colors",
                  isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"
                )}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Pago Recibido</span>
                      <span className="text-xs opacity-50">• Cuota #{payment.installmentNumber}</span>
                    </div>
                    <p className="text-sm opacity-80">
                      {new Date(payment.date).toLocaleString()}
                    </p>
                    {payment.comment && (
                      <p className="text-xs italic opacity-60 mt-1">"{payment.comment}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xl font-black">
                      {formatCurrency(payment.amount)}
                    </p>
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => reprintReceipt(payment)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                        title="Reimprimir Recibo"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setPaymentToEdit(payment);
                          setEditPaymentAmount(payment.amount.toString());
                          setEditPaymentComment(payment.comment || "");
                          setEditPaymentModalOpen(true);
                        }}
                        className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400"
                        title="Editar Pago"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 opacity-50">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No hay historial de pagos registrado.</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Modals... */}
        <AnimatePresence>
          {paymentModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "w-full max-w-md rounded-2xl p-6 shadow-xl",
                  isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900"
                )}
              >
                <h3 className="text-xl font-bold mb-4">Registrar Cobro Global</h3>
                <p className="text-sm opacity-70 mb-4">
                  El sistema distribuirá el pago automáticamente empezando por la cuota más antigua.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 opacity-70 uppercase">Valor a Abonar</label>
                    <input
                      type="number" step="0.01"
                      className={cn(
                        "w-full p-3 rounded-xl border text-2xl font-black text-center text-indigo-600 dark:text-indigo-400",
                        isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"
                      )}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 opacity-70 uppercase">Comentarios (Opcional)</label>
                    <textarea
                      className={cn(
                        "w-full p-3 rounded-xl border",
                        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      )}
                      value={paymentComment}
                      onChange={(e) => setPaymentComment(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setPaymentModalOpen(false)}
                    className="flex-1 py-3 rounded-xl font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 transition-colors"
                  >Cancelar</button>
                  <button
                    onClick={confirmPayment}
                    className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                  >Confirmar Cobro</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editPaymentModalOpen && paymentToEdit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "w-full max-w-md rounded-2xl p-6 shadow-xl",
                  isDark ? "bg-slate-800 text-white border border-slate-700" : "bg-white text-slate-900"
                )}
              >
                <h3 className="text-xl font-bold mb-4">Editar Pago Realizado</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 opacity-70 uppercase">Nuevo Valor Abonado</label>
                    <input
                      type="number" step="0.01"
                      className={cn(
                        "w-full p-3 rounded-xl border text-2xl font-black text-center text-indigo-600 dark:text-indigo-400",
                        isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"
                      )}
                      value={editPaymentAmount}
                      onChange={(e) => setEditPaymentAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 opacity-70 uppercase">Modificar Comentarios</label>
                    <textarea
                      className={cn(
                        "w-full p-3 rounded-xl border",
                        isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      )}
                      value={editPaymentComment}
                      onChange={(e) => setEditPaymentComment(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setEditPaymentModalOpen(false)}
                    className="flex-1 py-3 rounded-xl font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 transition-colors"
                  >Cancelar</button>
                  <button
                    onClick={handleEditPayment}
                    className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                  >Guardar Cambios</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {receiptModalOpen && receiptData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={cn(
                  "w-full max-w-sm rounded-2xl p-6 shadow-xl",
                  isDark ? "bg-slate-800 text-white border border-slate-700" : "bg-white text-slate-900"
                )}
              >
                <div className="text-center mb-6 border-b pb-4 dark:border-slate-700">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-wider">Recibo de Cobro</h3>
                  <p className="text-sm opacity-70">{new Date(receiptData.paymentDate).toLocaleString()}</p>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b pb-2 dark:border-slate-700 border-dashed">
                    <span className="opacity-70 font-semibold">Cliente:</span>
                    <span className="font-bold text-right">{receiptData.clientName}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 dark:border-slate-700 border-dashed">
                    <span className="opacity-70 font-semibold">Cuotas Afectadas:</span>
                    <span className="font-bold text-right max-w-[150px] truncate" title={receiptData.installmentNumber}>#{receiptData.installmentNumber}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 dark:border-slate-700 border-dashed">
                    <span className="opacity-70 font-semibold">Valor Abonado:</span>
                    <span className="font-bold text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(receiptData.amountPaid)}
                    </span>
                  </div>
                  {receiptData.delayDays > 0 && (
                    <div className="flex justify-between border-b pb-2 dark:border-slate-700 border-dashed">
                      <span className="opacity-70 font-semibold">Días de Mora Máx:</span>
                      <span className="font-bold text-right text-red-500">
                        {receiptData.delayDays} días
                      </span>
                    </div>
                  )}
                  {receiptData.comment && (
                    <div className="pt-2">
                      <span className="block opacity-70 font-semibold mb-1">Comentarios:</span>
                      <span className="block text-xs italic bg-slate-100 dark:bg-slate-900 p-2 rounded">
                        {receiptData.comment}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="mt-8 flex gap-2">
                  <button
                    onClick={() => setReceiptModalOpen(false)}
                    className="flex-1 py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-black">Cobranza Inteligente</h2>
          <p className="text-sm opacity-70">Gestiona las cuentas por cobrar y el historial de pagos de tus clientes.</p>
        </div>
        <div className="w-full sm:w-auto flex-1 max-w-sm relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input 
            type="text"
            placeholder="Buscar por cliente o CI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-all focus:ring-2",
              isDark ? "bg-slate-800 border-slate-700 focus:ring-indigo-500/50" : "bg-white border-slate-200 focus:ring-indigo-500/30"
            )}
          />
        </div>
      </div>

      <div className="grid gap-3">
        {filteredClients.map(client => (
          <div 
            key={client.clientId}
            onClick={() => setSelectedClientId(client.clientId)}
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md",
              isDark ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800" : "bg-white border-slate-200 hover:bg-slate-50"
            )}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center font-bold">
                {client.clientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-base">{client.clientName}</h3>
                <p className="text-xs opacity-70">CI: {client.cedula} • {client.installments.filter(i => i.status !== 'paid').length} cuotas pendientes</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-bold opacity-70 uppercase tracking-wider mb-0.5">Deuda Total</p>
                <p className={cn("font-black", client.totalPending > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-500")}>
                  {formatCurrency(client.totalPending)}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 opacity-30" />
            </div>
          </div>
        ))}
        {filteredClients.length === 0 && (
          <div className="text-center py-12 opacity-50">
            <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No se encontraron clientes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/PhysicalCommerceCollections.tsx', code);
