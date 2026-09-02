import { useAuth } from '../lib/AuthContext';
import { CollectionsTab } from "./PhysicalCommerceCollections";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingBag,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Calendar,
  User,
  Tag,
  LayoutGrid,
  Package,
  CreditCard,
  Clock,
  ChevronDown,
  CheckCircle2,
  QrCode,
} from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";

export function PhysicalCommerce({
  user,
  isDark,
}: {
  user: any;
  isDark: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"inventory" | "sales" | "collections">(
    "inventory",
  );

  return (
    <div className="flex flex-col h-full w-full">
      <div
        className={cn(
          "px-4 pt-4 lg:px-8 lg:pt-8",
          isDark ? "bg-slate-900" : "bg-slate-50",
        )}
      >
        <div
          className={cn(
            "flex space-x-2 p-1 rounded-xl max-w-sm mx-auto",
            isDark
              ? "bg-slate-800"
              : "bg-white shadow-sm border border-slate-200",
          )}
        >
          <button
            onClick={() => setActiveTab("inventory")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
              activeTab === "inventory"
                ? isDark
                  ? "bg-slate-700 text-white shadow"
                  : "bg-slate-100 text-black shadow-sm"
                : isDark
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-700 hover:text-black",
            )}
          >
            <Package className="w-4 h-4" />
            Inventario
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
              activeTab === "sales"
                ? isDark
                  ? "bg-slate-700 text-white shadow"
                  : "bg-slate-100 text-black shadow-sm"
                : isDark
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-700 hover:text-black",
            )}
          >
            <ShoppingBag className="w-4 h-4" />
            Ventas
          </button>

          <button
            onClick={() => setActiveTab("collections")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
              activeTab === "collections"
                ? isDark
                  ? "bg-slate-700 text-white shadow"
                  : "bg-slate-100 text-black shadow-sm"
                : isDark
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-700 hover:text-black",
            )}
          >
            <CreditCard className="w-4 h-4" />
            Cobranzas
          </button>
        </div>
      </div>
      <div className="flex-1 w-full overflow-y-auto p-4 lg:p-8">
                {activeTab === "inventory" && <InventoryTab user={user} isDark={isDark} />}
        {activeTab === "sales" && <SalesTab user={user} isDark={isDark} />}
        {activeTab === "collections" && <CollectionsTab user={user} isDark={isDark} />}
      </div>

    </div>
  );
}

function InventoryTab({ user, isDark }: { user: any; isDark: boolean }) {
  const { settings } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    cost: "0",
    price: "0",
    price3m: "0",
    price6m: "0",
    series: "",
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "commerce_inventory"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const docId = formData.id || Date.now().toString();
    const seriesArr = formData.series
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const cost = parseFloat(formData.cost) || 0;
    const marginPVP = settings?.commerceMarginPVP || 0;
    const margin3M = settings?.commerceMargin3M || 0;
    const margin6M = settings?.commerceMargin6M || 0;

    const pvp = cost + (cost * marginPVP / 100);
    const price3m = pvp + (pvp * margin3M / 100);
    const price6m = price3m + (price3m * margin6M / 100);

    const data = {
      name: formData.name,
      cost: cost,
      price: pvp,
      price3m: price3m,
      price6m: price6m,
      series: seriesArr,
      qty: seriesArr.length,
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(
        doc(db, "users", user.uid, "commerce_inventory", docId),
        data,
        { merge: true },
      );
      setIsModalOpen(false);
    } catch(err) {
      console.error("Error saving product:", err);
      alert("Error guardando producto: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar producto?")) {
      await deleteDoc(doc(db, "users", user.uid, "commerce_inventory", id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Inventario de Productos</h2>
        <button
          onClick={() => {
            setFormData({
              id: "",
              name: "",
              cost: "0",
              price: "0",
              price3m: "0",
              price6m: "0",
              series: "",
            });
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Agregar Producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "p-4 rounded-2xl border",
              isDark
                ? "bg-slate-800 border-slate-700 text-white"
                : "bg-white border-slate-200 text-black",
            )}
          >
            <h3 className={cn("font-bold text-lg", isDark ? "text-white" : "text-black")}>{item.name}</h3>
            <p className={cn("text-sm font-semibold mb-3", isDark ? "text-white" : "text-black")}>Stock: {item.qty} unid.</p>
            <div className="space-y-1 mb-4">
              <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                <span className={cn("font-semibold", isDark ? "text-white" : "text-black")}>Costo:</span>{" "}
                <strong>{formatCurrency(item.cost || 0)}</strong>
              </div>
              <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
                <span className={cn("font-semibold", isDark ? "text-white" : "text-black")}>PVP Contado:</span>{" "}
                <strong>{formatCurrency(item.price)}</strong>
              </div>
              <div className={cn("flex justify-between text-sm", isDark ? "text-white" : "text-black")}>
                <span className={cn("font-semibold", isDark ? "text-white" : "text-black")}>3 Meses:</span>{" "}
                <strong>{formatCurrency(item.price3m)}</strong>
              </div>
              <div className={cn("flex justify-between text-sm", isDark ? "text-white" : "text-black")}>
                <span className={cn("font-semibold", isDark ? "text-white" : "text-black")}>6 Meses:</span>{" "}
                <strong>{formatCurrency(item.price6m)}</strong>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFormData({
                    id: item.id,
                    name: item.name,
                    cost: (item.cost || 0).toString(),
                    price: item.price.toString(),
                    price3m: (item.price3m || 0).toString(),
                    price6m: (item.price6m || 0).toString(),
                    series: (item.series || []).join(", "),
                  });
                  setIsModalOpen(true);
                }}
                className="flex-1 py-2 text-center border rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="py-2 px-3 text-rose-500 border border-rose-500/20 rounded-lg hover:bg-rose-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4", isDark ? "bg-black/50" : "bg-slate-900/20")}>
          <div
            className={cn(
              "w-full max-w-md rounded-2xl p-6",
              isDark ? "bg-slate-800" : "bg-white",
            )}
          >
            <h3 className="text-lg font-bold mb-4">
              {formData.id ? "Editar" : "Nuevo"} Producto
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Nombre</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                />
              </div>
              <div>
                  <label className="block text-xs font-bold mb-1">
                    Costo de Compra
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                  />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  Números de Serie (separados por coma)
                </label>
                <textarea
                  required
                  value={formData.series}
                  onChange={(e) =>
                    setFormData({ ...formData, series: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 h-24"
                  placeholder="SN123, SN456..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 border rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SalesTab({ user, isDark }: { user: any; isDark: boolean }) {
  const [sales, setSales] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientCedula, setClientCedula] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientNeighborhood, setClientNeighborhood] = useState("");
  const [clientReference, setClientReference] = useState("");

  const [saleType, setSaleType] = useState<"cash" | "3m" | "6m">("cash");

  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSaleId, setPaymentSaleId] = useState("");
  const [paymentInstallmentIndex, setPaymentInstallmentIndex] = useState(-1);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentComment, setPaymentComment] = useState("");
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const [downPayment, setDownPayment] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("1");
  const [frequency, setFrequency] = useState("monthly");
  const [firstDueDate, setFirstDueDate] = useState("");

  // Para seleccionar serie
  const [currentInvSelection, setCurrentInvSelection] = useState("");
  const [currentSeriesSelection, setCurrentSeriesSelection] = useState<
    string[]
  >([]);



  useEffect(() => {
    if (!user) return;
    const qS = query(collection(db, "users", user.uid, "commerce_sales"));
    const unsubS = onSnapshot(qS, (snap) =>
      setSales(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );

    const qI = query(collection(db, "users", user.uid, "commerce_inventory"));
    const unsubI = onSnapshot(qI, (snap) =>
      setInventory(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );

    const qE = query(collection(db, "entities"));
    const unsubE = onSnapshot(qE, (snap) =>
      setEntities(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((e: any) => e.ownerId === user.uid),
      ),
    );

    return () => {
      unsubS();
      unsubI();
      unsubE();
    };
  }, [user]);

  const handleAddItem = () => {
    if (!currentInvSelection) return;
    const invItem = inventory.find((i) => i.id === currentInvSelection);
    if (!invItem) return;

    if (currentSeriesSelection.length === 0)
      return alert("Seleccione al menos una serie");

    setSelectedItems([
      ...selectedItems,
      {
        itemId: invItem.id,
        name: invItem.name,
        series: currentSeriesSelection,
        qty: currentSeriesSelection.length,
        price: invItem.price, // base price
        price3m: invItem.price3m,
        price6m: invItem.price6m,
      },
    ]);

    setCurrentInvSelection("");
    setCurrentSeriesSelection([]);
  };

  const handleRemoveItem = (idx: number) => {
    const newItems = [...selectedItems];
    newItems.splice(idx, 1);
    setSelectedItems(newItems);
  };


  const handlePayInstallment = (saleId: string, idx: number) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    const installment = sale.installments[idx];
    const pendingAmount = installment.amount - (installment.paidAmount || 0);
    setPaymentSaleId(saleId);
    setPaymentInstallmentIndex(idx);
    setPaymentAmount(pendingAmount.toFixed(2));
    setPaymentComment("");
    setPaymentModalOpen(true);
  };

  const confirmPayment = async () => {
    if (!paymentSaleId || paymentInstallmentIndex < 0) return;
    const sale = sales.find((s) => s.id === paymentSaleId);
    if (!sale) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return alert("Monto inválido");
    
    const newInstallments = [...sale.installments];
    const installment = newInstallments[paymentInstallmentIndex];
    const newPaidAmount = (installment.paidAmount || 0) + amount;
    const nowIso = new Date().toISOString();
    
    installment.paidAmount = newPaidAmount;
    installment.paidAt = nowIso;
    
    if (!installment.payments) {
       installment.payments = [];
    }
    installment.payments.push({
       amount,
       date: nowIso,
       comment: paymentComment
    });

    if (newPaidAmount >= installment.amount - 0.01) { 
       installment.status = "paid";
    } else { 
       installment.status = "partial";
    }
    
    const allPaid = newInstallments.every((i) => i.status === "paid");
    
    try {
      await updateDoc(doc(db, "users", user.uid, "commerce_sales", paymentSaleId), {
        installments: newInstallments,
        status: allPaid ? "completed" : "active",
      });
      setPaymentModalOpen(false);
      
      const dueDate = new Date(installment.dueDate);
      const today = new Date();
      let delayDays = 0;
      if (today > dueDate) {
         const diffTime = Math.abs(today.getTime() - dueDate.getTime());
         delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      }
      
      const receipt = {
        saleId: paymentSaleId,
        clientName: sale.clientName || entities.find((e: any) => e.id === sale.clientId)?.name || "Cliente sin nombre",
        installmentNumber: installment.installmentNumber,
        delayDays,
        amountPaid: amount,
        remainingBalance: installment.amount - newPaidAmount,
        paymentDate: nowIso,
        comment: paymentComment,
        totalAmount: installment.amount
      };
      setReceiptData(receipt);
      setReceiptModalOpen(true);
      
    } catch (err) {
      console.error(err);
      alert("Error al registrar el pago");
    }
  };

  const calculateTotal = () =>
    selectedItems.reduce((acc, item) => {
       let p = item.price;
       if (saleType === "3m") p = item.price3m || item.price;
       if (saleType === "6m") p = item.price6m || item.price;
       return acc + (p * item.qty);
    }, 0);

  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) return alert("Agregue productos");
    if (!clientId) return alert("Seleccione cliente");
    if (!firstDueDate) return alert("Seleccione fecha del primer pago");
    if (clientId === "NEW" && (!clientName || !clientCedula || !clientPhone || !clientCity || !clientNeighborhood || !clientReference)) {
      return alert("Complete todos los campos del nuevo cliente");
    }

    let finalClientId = clientId;
    try {
      if (clientId === "NEW") {
        finalClientId = Date.now().toString();
        await setDoc(doc(db, "entities", finalClientId), {
          name: clientName,
          cedula: clientCedula,
          phone: clientPhone,
          city: clientCity,
          neighborhood: clientNeighborhood,
          reference: clientReference,
          type: "client",
          ownerId: user.uid,
          contact: clientPhone,
        });
      }
    } catch(err: any) {
      return alert("Error al guardar cliente: " + err.message);
    }

    const total = calculateTotal();
    const dp = parseFloat(downPayment) || 0;
    const toFinance = total - dp;
    const count = parseInt(installmentsCount) || 1;
    const instAmount = toFinance / count;

    const installments = [];
    let currDate = new Date(firstDueDate);
    // Fix timezone offset issue
    currDate = new Date(
      currDate.getTime() + currDate.getTimezoneOffset() * 60000,
    );

    for (let i = 0; i < count; i++) {
      installments.push({
        installmentNumber: i + 1,
        amount: instAmount,
        dueDate: currDate.toISOString(),
        status: "pending",
        paidAmount: 0,
      });

      // Calculate next date keeping the same day of week for weekly
      if (frequency === "weekly") {
        currDate.setDate(currDate.getDate() + 7);
      } else if (frequency === "biweekly") {
        currDate.setDate(currDate.getDate() + 14);
      } else {
        currDate.setMonth(currDate.getMonth() + 1);
      }
    }

    const saleData = {
      clientId: finalClientId,
      clientName: finalClientId === clientId ? (entities.find(e => e.id === clientId)?.name || "") : clientName,
      items: selectedItems.map(item => ({
         ...item,
         finalPrice: saleType === 'cash' ? item.price : (saleType === '3m' ? (item.price3m || item.price) : (item.price6m || item.price))
      })),
      saleType,
      total,
      downPayment: dp,
      installmentsCount: count,
      frequency,
      status: "active",
      installments,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(
        collection(db, "users", user.uid, "commerce_sales"),
        saleData
      );

      // Deduct inventory
      for (const item of selectedItems) {
        const invRef = doc(
          db,
          "users",
          user.uid,
          "commerce_inventory",
          item.itemId,
        );
        const invItem = inventory.find((i) => i.id === item.itemId);
        if (invItem) {
          const newSeries = (invItem.series || []).filter(
            (s: string) => !item.series.includes(s),
          );
          await updateDoc(invRef, {
            series: newSeries,
            qty: newSeries.length,
          });
        }
      }

      setIsModalOpen(false);
      setSelectedItems([]);
      setClientId("");
      setClientName("");
      setClientCedula("");
      setClientPhone("");
      setClientCity("");
      setClientNeighborhood("");
      setClientReference("");
      setDownPayment("");
      setInstallmentsCount("1");
      setFirstDueDate("");
      
      alert("Venta guardada exitosamente");
    } catch(err: any) {
      console.error("Error saving sale:", err);
      alert("Error al guardar la venta: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Ventas Físicas y Créditos</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nueva Venta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sales.map((sale) => (
          <div
            key={sale.id}
            className={cn(
              "p-4 rounded-2xl border",
              isDark
                ? "bg-slate-800 border-slate-700 text-white"
                : "bg-white border-slate-200 text-black",
            )}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className={cn("font-bold text-base", isDark ? "text-white" : "text-black")}>
                {sale.clientName || entities.find((e) => e.id === sale.clientId)?.name || "Cliente sin nombre"}
              </h3>
              <span
                className={cn(
                  "px-2 py-1 rounded text-[10px] font-bold uppercase",
                  sale.status === "completed"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700",
                )}
              >
                {sale.status === "completed" ? "Pagado" : "Activo"}
              </span>
            </div>
            <p className={cn("text-sm font-semibold mb-2", isDark ? "text-white" : "text-black")}>
              Total: <strong>{formatCurrency(sale.total)}</strong>
            </p>
            <div className={cn("text-xs space-y-1 mb-3 font-medium", isDark ? "text-white" : "text-black")}>
              {sale.items?.map((i: any, idx: number) => (
                <div key={idx}>
                  - {i.qty}x {i.name}
                </div>
              ))}
            </div>
            <div className={cn("flex items-center gap-2 text-xs font-bold mb-2", isDark ? "text-white" : "text-black")}>
              <CreditCard className="w-4 h-4" />
              {sale.installmentsCount} cuotas ({sale.frequency})
            </div>
            
            {sale.installments && sale.installments.length > 0 && (
              <div className={cn("mt-3 rounded-lg p-3", isDark ? "bg-slate-900 border border-slate-700/50" : "bg-slate-50 border border-slate-200")}>
                <h4 className={cn("text-xs font-black mb-2 uppercase tracking-wider", isDark ? "text-white" : "text-black")}>Calendario de Pagos</h4>
                <div className="space-y-1">
                  {sale.installments.map((inst: any, idx: number) => (
                    <div key={idx} className={cn("flex justify-between items-center text-xs p-1.5 border-b last:border-0", isDark ? "border-slate-800" : "border-slate-200")}>
                      <div className={cn("font-medium", isDark ? "text-white" : "text-black")}>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2">#{inst.installmentNumber}</span>
                        {new Date(inst.dueDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                           <span className={cn("font-bold", isDark ? "text-white" : "text-black")}>{formatCurrency(inst.amount)}</span>
                           {inst.paidAmount > 0 && inst.status !== "paid" && (
                             <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Abonado: {formatCurrency(inst.paidAmount)}</span>
                           )}
                        </div>
                        {inst.status === "paid" ? (
                          <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400")}>
                            Pagado
                          </span>
                        ) : (
                          <button onClick={() => handlePayInstallment(sale.id, idx)} className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase cursor-pointer transition-colors shadow-sm", inst.status === 'partial' ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 hover:bg-indigo-200")}>
                            {inst.status === 'partial' ? 'Completar' : 'Cobrar'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4", isDark ? "bg-black/50" : "bg-slate-900/20")}>
          <div
            className={cn(
              "w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto",
              isDark ? "bg-slate-800" : "bg-white",
            )}
          >
            <h3 className="text-lg font-bold mb-4">Nueva Venta</h3>
            <form onSubmit={handleSaveSale} className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-black text-indigo-600 dark:text-indigo-400">Datos del Cliente</label>
                  <button type="button" onClick={() => { setClientId('NEW'); setClientName(''); setClientCedula(''); setClientPhone(''); setClientCity(''); setClientNeighborhood(''); setClientReference(''); }} className="text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-1 rounded">
                    + Nuevo Cliente
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border dark:border-slate-700">
                   <div className="col-span-1 md:col-span-2 relative">
                     <label className="block text-xs font-bold mb-1">Buscar por Cédula (Predictivo)</label>
                     <input 
                       required 
                       type="text" 
                       maxLength={13} 
                       list="crm-cedulas"
                       value={clientCedula} 
                       onChange={(e) => {
                         const val = e.target.value.replace(/\D/g, '');
                         setClientCedula(val);
                         const found = entities.find(x => x.type === 'client' && x.cedula === val);
                         if (found) {
                           setClientId(found.id);
                           setClientName(found.name || "");
                           setClientPhone(found.phone || found.contact || "");
                           setClientCity(found.city || "");
                           setClientNeighborhood(found.neighborhood || "");
                           setClientReference(found.reference || "");
                         } else {
                           setClientId("NEW");
                         }
                       }} 
                       className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" 
                       placeholder="Escriba la cédula..." 
                     />
                     <datalist id="crm-cedulas">
                        {entities.filter(e => e.type === 'client' && e.cedula).map(e => (
                          <option key={e.id} value={e.cedula}>{e.name}</option>
                        ))}
                     </datalist>
                   </div>
                   <div className="col-span-1 md:col-span-2 relative">
                     <label className="block text-xs font-bold mb-1">Nombre Completo (Predictivo)</label>
                     <input 
                       required 
                       type="text" 
                       list="crm-names"
                       value={clientName} 
                       onChange={(e) => {
                         const val = e.target.value;
                         setClientName(val);
                         const found = entities.find(x => x.type === 'client' && x.name === val);
                         if (found) {
                           setClientId(found.id);
                           setClientCedula(found.cedula || "");
                           setClientPhone(found.phone || found.contact || "");
                           setClientCity(found.city || "");
                           setClientNeighborhood(found.neighborhood || "");
                           setClientReference(found.reference || "");
                         } else {
                           setClientId("NEW");
                         }
                       }} 
                       className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" 
                       placeholder="Escriba el nombre..."
                     />
                     <datalist id="crm-names">
                        {entities.filter(e => e.type === 'client').map(e => (
                          <option key={e.id} value={e.name}>{e.cedula}</option>
                        ))}
                     </datalist>
                   </div>
                   
                   <div>
                     <label className="block text-xs font-bold mb-1">Celular</label>
                     <input required type="text" value={clientPhone} onChange={e => setClientPhone(e.target.value)} disabled={clientId !== 'NEW'} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 disabled:opacity-70" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold mb-1">Ciudad</label>
                     <input required type="text" value={clientCity} onChange={e => setClientCity(e.target.value)} disabled={clientId !== 'NEW'} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 disabled:opacity-70" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold mb-1">Barrio</label>
                     <input required type="text" value={clientNeighborhood} onChange={e => setClientNeighborhood(e.target.value)} disabled={clientId !== 'NEW'} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 disabled:opacity-70" />
                   </div>
                   <div className="col-span-1 md:col-span-2">
                     <label className="block text-xs font-bold mb-1">Referencia de Dirección</label>
                     <input required type="text" value={clientReference} onChange={e => setClientReference(e.target.value)} disabled={clientId !== 'NEW'} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 disabled:opacity-70" />
                   </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-sm">Productos</h4>
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <select
                      value={currentInvSelection}
                      onChange={(e) => {
                        setCurrentInvSelection(e.target.value);
                        setCurrentSeriesSelection([]);
                      }}
                      className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                    >
                      <option value="">Seleccione producto...</option>
                      {inventory
                        .filter((i) => i.qty > 0)
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.qty} disp.)
                          </option>
                        ))}
                    </select>
                    {currentInvSelection && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {inventory
                          .find((i) => i.id === currentInvSelection)
                          ?.series?.map((s: string) => (
                            <label
                              key={s}
                              className="flex items-center gap-2 text-xs p-1 border rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              <input
                                type="checkbox"
                                checked={currentSeriesSelection.includes(s)}
                                onChange={(e) => {
                                  if (e.target.checked)
                                    setCurrentSeriesSelection([
                                      ...currentSeriesSelection,
                                      s,
                                    ]);
                                  else
                                    setCurrentSeriesSelection(
                                      currentSeriesSelection.filter(
                                        (x) => x !== s,
                                      ),
                                    );
                                }}
                              />
                              {s}
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg font-bold"
                  >
                    Agregar
                  </button>
                </div>

                {selectedItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-900 rounded-lg"
                      >
                        <div>
                          <strong>
                            {item.qty}x {item.name}
                          </strong>
                          <div className="text-xs opacity-70">
                            Series: {item.series.join(", ")}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>{formatCurrency((saleType === 'cash' ? item.price : (saleType === '3m' ? (item.price3m || item.price) : (item.price6m || item.price))) * item.qty)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right font-black text-lg pt-2">
                      Total: {formatCurrency(calculateTotal())}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1">
                    Tipo de Venta (Tiempo de venta)
                  </label>
                  <select
                    value={saleType}
                    onChange={(e) => setSaleType(e.target.value as any)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                  >
                    <option value="cash">Contado</option>
                    <option value="3m">Crédito a 3 Meses</option>
                    <option value="6m">Crédito a 6 Meses</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Cuota Inicial (Enganche)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Número de Cuotas
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Frecuencia
                  </label>
                  <select
                    required
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                  >
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Fecha 1er Pago
                  </label>
                  <input
                    type="date"
                    required
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                    className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
              </div>


              {/* Payment Schedule Preview */}
              {selectedItems.length > 0 && installmentsCount && firstDueDate && parseInt(installmentsCount) > 0 && (
                <div className="p-4 rounded-xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                  <h4 className="font-bold text-sm mb-3">Calendario de Pagos Estimado</h4>
                  <div className="space-y-2">
                    {Array.from({ length: parseInt(installmentsCount) }).map((_, i) => {
                      const total = calculateTotal();
                      const dp = parseFloat(downPayment) || 0;
                      const instAmount = (total - dp) / parseInt(installmentsCount);
                      
                      let currDate = new Date(firstDueDate);
                      currDate = new Date(currDate.getTime() + currDate.getTimezoneOffset() * 60000);
                      
                      for (let step = 0; step < i; step++) {
                        if (frequency === "weekly") {
                          currDate.setDate(currDate.getDate() + 7);
                        } else if (frequency === "biweekly") {
                          currDate.setDate(currDate.getDate() + 14);
                        } else {
                          currDate.setMonth(currDate.getMonth() + 1);
                        }
                      }
                      
                      return (
                        <div key={i} className="flex justify-between items-center text-xs p-2 border-b dark:border-slate-700 last:border-0">
                          <div>
                            <span className="font-bold text-indigo-600 mr-2">#{i + 1}</span>
                            {currDate.toLocaleDateString()}
                          </div>
                          <div className="font-bold">{formatCurrency(instAmount)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 border rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  Crear Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      {/* Payment Modal */}
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
              <h3 className="text-xl font-bold mb-4">Registrar Cobro</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1 opacity-70 uppercase">
                    Valor a Abonar
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className={cn(
                      "w-full p-3 rounded-xl border text-lg font-bold text-center",
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-slate-50 border-slate-200"
                    )}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 opacity-70 uppercase">
                    Comentarios (Opcional)
                  </label>
                  <textarea
                    className={cn(
                      "w-full p-3 rounded-xl border",
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-slate-50 border-slate-200"
                    )}
                    value={paymentComment}
                    onChange={(e) => setPaymentComment(e.target.value)}
                    rows={2}
                    placeholder="Ej. Transferencia Banco Pichincha, Efectivo..."
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmPayment}
                  className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  Registrar Cobro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
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
                  <CreditCard className="w-6 h-6" />
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
                  <span className="opacity-70 font-semibold">Cuota Cobrada:</span>
                  <span className="font-bold text-right">#{receiptData.installmentNumber}</span>
                </div>
                <div className="flex justify-between border-b pb-2 dark:border-slate-700 border-dashed">
                  <span className="opacity-70 font-semibold">Valor Abonado:</span>
                  <span className="font-bold text-right text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(receiptData.amountPaid)}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2 dark:border-slate-700 border-dashed">
                  <span className="opacity-70 font-semibold">Días de Mora:</span>
                  <span className={cn("font-bold text-right", receiptData.delayDays > 0 ? "text-red-500" : "")}>
                    {receiptData.delayDays} días
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2 dark:border-slate-700 border-dashed">
                  <span className="opacity-70 font-semibold">Saldo Pendiente (Cuota):</span>
                  <span className="font-bold text-right">
                    {formatCurrency(Math.max(0, receiptData.remainingBalance))}
                  </span>
                </div>
                {receiptData.comment && (
                  <div className="pt-2">
                    <span className="block opacity-70 font-semibold mb-1">Comentarios:</span>
                    <span className="block text-xs italic bg-slate-100 dark:bg-slate-900 p-2 rounded">
                      {receiptData.comment}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="mt-8">
                <button
                  onClick={() => setReceiptModalOpen(false)}
                  className="w-full py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
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
