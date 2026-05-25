/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { 
  TrendingUp, 
  Users, 
  Clock,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  MessageCircle,
  X,
  FileText,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  CreditCard
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  variant?: 'default' | 'dark' | 'indigo';
  onClick?: () => void;
}

function StatCard({ label, value, icon: Icon, trend, trendUp, variant = 'default', onClick }: StatCardProps) {
  const { settings } = useAuth();
  const isDark = settings?.theme === 'dark';

  const themes = {
    default: isDark ? "bg-slate-900 border-slate-800 text-white hover:border-slate-700" : "bg-white border-slate-200 text-slate-900 shadow-sm hover:border-slate-300",
    dark: "bg-slate-900 border-slate-800 text-white shadow-sm hover:border-slate-700",
    indigo: "bg-indigo-600 border-indigo-500 text-white shadow-sm hover:bg-indigo-700"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        "p-5 rounded-xl border flex flex-col transition-all duration-300",
        onClick && "cursor-pointer",
        themes[variant]
      )}
    >
      <div className={cn(
        "text-[10px] font-black uppercase tracking-widest mb-1 flex items-center justify-between",
        variant === 'indigo' ? "text-indigo-200" : (isDark ? "text-slate-500" : "text-slate-400")
      )}>
        {label}
        <Icon className="w-4 h-4 opacity-50" />
      </div>
      <div className="text-xl lg:text-2xl font-bold tracking-tighter truncate">{value}</div>
      {trend && (
        <div className={cn(
          "text-[10px] font-bold mt-1",
          trendUp ? "text-emerald-500" : 
          variant === 'dark' ? "text-orange-400" : "text-indigo-400"
        )}>
          {trend}
        </div>
      )}
    </motion.div>
  );
}

export function Dashboard() {
  const { user, settings } = useAuth();
  const [wallets, setWallets] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [digitalServices, setDigitalServices] = useState<any[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [activeModal, setActiveModal] = useState<'wallets' | 'receivables' | 'payables' | 'entities' | null>(null);
  
  // Custom Filters and Categorization state
  const [filterType, setFilterType] = useState<'all' | 'client' | 'reseller' | 'intermediary' | 'supplier'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Payment/Collection flow state
  const [paymentTarget, setPaymentTarget] = useState<{ item: any; type: 'receivables' | 'payables' } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');

  const isDark = settings?.theme === 'dark';

  useEffect(() => {
    setFilterType('all');
    setViewMode('list');
    setExpandedGroups({});
    setPaymentTarget(null);
  }, [activeModal]);

  useEffect(() => {
    if (!user) return;
    
    // Wallets
    const unsubWallets = onSnapshot(query(collection(db, 'wallets'), where('ownerId', '==', user.uid)), (snap) => {
      setWallets(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    // Transactions
    const unsubTx = onSnapshot(query(collection(db, 'transactions'), where('ownerId', '==', user.uid)), (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    // Digital Services
    const unsubDs = onSnapshot(query(collection(db, 'digital_services'), where('ownerId', '==', user.uid)), (snap) => {
      setDigitalServices(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    // Ledger (pending payables)
    const unsubLedger = onSnapshot(query(collection(db, 'ledger'), where('ownerId', '==', user.uid), where('isPending', '==', true)), (snap) => {
      setLedgerEntries(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    // CRM Entities
    const unsubEntities = onSnapshot(query(collection(db, 'entities'), where('ownerId', '==', user.uid)), (snap) => {
      setEntities(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    return () => { 
      unsubWallets(); 
      unsubTx(); 
      unsubDs(); 
      unsubLedger(); 
      unsubEntities(); 
    };
  }, [user]);

  // Derived receivables
  const receivables = [
    ...transactions.filter(tx => !tx.isPaid).map(tx => ({
      ...tx,
      isTx: true,
      pendingAmount: (tx.chargedRate || 0) - (tx.amountPaid || 0)
    })),
    ...digitalServices.filter(ds => !ds.isPaid).map(ds => ({
      ...ds,
      isTx: false,
      chargedRate: ds.revenue,
      pendingAmount: (ds.revenue || 0) - (ds.amountPaid || 0),
      finalClientName: ds.clientName,
      warehouse: ds.name
    }))
  ];

  // Derived payables
  const payables = [
    ...ledgerEntries.filter(e => e.amount < 0).map(e => ({
      ...e,
      isLedger: true,
      category: e.category || 'Gasto General',
      description: e.description || 'Gasto',
      pendingAmount: Math.abs(e.amount)
    })),
    ...transactions.filter(tx => !tx.isCostPaid).map(tx => {
      const costVal = tx.baseCost !== undefined ? tx.baseCost : 5.0;
      return {
        ...tx,
        isTxCost: true,
        category: 'Proveedor ANT (Actualizaciones)',
        description: `Costo actualización de ${tx.finalClientName || 'Cliente'} (${tx.warehouse})`,
        pendingAmount: costVal - (tx.costPaid || 0)
      };
    }),
    ...digitalServices.filter(ds => !ds.isCostPaid).map(ds => ({
      ...ds,
      isDsCost: true,
      category: ds.supplierName || ds.supplier || 'Proveedor Digital',
      description: `Costo servicio digital: ${ds.name} - ${ds.clientName || 'Cliente'}`,
      pendingAmount: (ds.cost || 0) - (ds.costPaid || 0)
    }))
  ];

  const totalReceivables = receivables.reduce((sum, rx) => sum + (rx.pendingAmount || 0), 0);
  const totalPayables = payables.reduce((sum, px) => sum + (px.pendingAmount || 0), 0);
  const totalWallets = wallets.filter(w => w.type !== 'credit_card').reduce((sum, w) => sum + (w.balance || 0), 0);
  const totalCreditAvailable = wallets.filter(w => w.type === 'credit_card').reduce((sum, w) => sum + (w.balance || 0), 0);

  // Dynamic classification logic
  const resolveItemCategory = (item: any) => {
    if (item.clientType === 'reseller') return 'reseller';
    if (item.clientType === 'client') return 'client';

    const entityByIntermediary = entities.find(e => e.id === item.intermediaryId || e.name?.toLowerCase() === item.intermediaryName?.toLowerCase());
    if (entityByIntermediary) return entityByIntermediary.type;

    const entityByClient = entities.find(e => e.name?.toLowerCase() === item.finalClientName?.toLowerCase() || e.name?.toLowerCase() === item.clientName?.toLowerCase());
    if (entityByClient) return entityByClient.type;

    if (item.intermediaryName) return 'intermediary';
    if (item.clientName || item.finalClientName) return 'client';
    return 'client';
  };

  const resolvePayableCategory = (item: any) => {
    if (item.isTxCost || item.isDsCost) return 'supplier';
    const found = entities.find(e => e.name?.toLowerCase() === item.category?.toLowerCase() || e.name?.toLowerCase() === item.description?.toLowerCase());
    if (found) return found.type;
    return 'supplier';
  };

  const filteredReceivables = receivables.filter(rx => {
    if (filterType === 'all') return true;
    return resolveItemCategory(rx) === filterType;
  });

  const filteredPayables = payables.filter(px => {
    if (filterType === 'all') return true;
    return resolvePayableCategory(px) === filterType;
  });

  const filteredReceivablesTotal = filteredReceivables.reduce((sum, rx) => sum + (rx.pendingAmount || 0), 0);
  const filteredPayablesTotal = filteredPayables.reduce((sum, px) => sum + (px.pendingAmount || 0), 0);

  const exportToPDF = (type: 'receivables' | 'payables') => {
    const doc = new jsPDF();
    
    doc.setFillColor(30, 41, 59); // Slate 800 header background
    doc.rect(0, 0, 210, 36, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(settings?.companyName || 'Control Financiero - CRM', 15, 14);
    
    doc.setFontSize(9);
    doc.setFont('text', 'normal');
    const subtitle = type === 'receivables' ? 'Cuentas por Cobrar (AR) - Reporte Detallado' : 'Cuentas por Pagar (AP) - Reporte Detallado';
    doc.text(subtitle, 15, 21);
    doc.text(`Fecha del Reporte: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`, 15, 26);
    doc.text(`Filtro Activo de Relación: ${filterType.toUpperCase()}`, 15, 31);
    
    const items = type === 'receivables' ? filteredReceivables : filteredPayables;
    const bodyRows = items.map((item, index) => {
      const cat = type === 'receivables' ? resolveItemCategory(item) : resolvePayableCategory(item);
      let catLabel = 'Otro';
      if (cat === 'client') catLabel = 'Cliente Final';
      else if (cat === 'reseller') catLabel = 'Revendedor';
      else if (cat === 'intermediary') catLabel = 'Intermediario';
      else if (cat === 'supplier') catLabel = 'Proveedor';

      const name = type === 'receivables' 
        ? (item.intermediaryName || item.clientName || item.finalClientName || 'S/N')
        : (item.category || 'S/N');
        
      const detail = type === 'receivables'
        ? `${item.finalClientName ? `Cliente: ${item.finalClientName}` : ''} (${item.warehouse || item.name || 'Suscripción'})`
        : (item.description || 'Gasto General');
        
      const amount = formatCurrency(item.pendingAmount || 0);
      return [index + 1, catLabel, name, detail, amount];
    });

    const totalVal = type === 'receivables' ? filteredReceivablesTotal : filteredPayablesTotal;

    (doc as any).autoTable({
      startY: 42,
      head: [['#', 'Relación CRM', 'Entidad / Referencia', 'Detalles / Conceptos', 'Monto Pendiente']],
      body: bodyRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      foot: [['', '', '', 'TOTAL MOSTRADO:', formatCurrency(totalVal)]],
      footStyles: { fillColor: [241, 245, 249], textColor: [79, 70, 229], fontStyle: 'bold' },
      styles: { fontSize: 8.5 }
    });

    doc.save(`Reporte_${type === 'receivables' ? 'Cuentas_Cobrar' : 'Cuentas_Pagar'}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getGroupedItems = (type: 'receivables' | 'payables') => {
    const items = type === 'receivables' ? filteredReceivables : filteredPayables;
    const groups: Record<string, { total: number, items: any[] }> = {};

    items.forEach(item => {
      const name = type === 'receivables'
        ? (item.intermediaryName || item.clientName || item.finalClientName || 'S/N')
        : (item.category || 'S/N');

      if (!groups[name]) {
        groups[name] = { total: 0, items: [] };
      }
      
      const val = item.pendingAmount || 0;
      groups[name].total += val;
      groups[name].items.push(item);
    });

    return Object.entries(groups).map(([entityName, data]) => ({
      entityName,
      total: data.total,
      rawItems: data.items
    })).sort((a, b) => b.total - a.total);
  };

  const handleWhatsAppRedirect = (rx: any) => {
    let contactEntity = entities.find(e => e.id === rx.intermediaryId || e.name?.toLowerCase() === rx.intermediaryName?.toLowerCase());
    if (!contactEntity) {
      contactEntity = entities.find(e => e.name?.toLowerCase() === rx.finalClientName?.toLowerCase());
    }
    const phone = contactEntity?.contact || '';
    if (!phone) {
      alert(`No se encontró número de contacto registrado para "${rx.intermediaryName || rx.finalClientName || 'el cliente'}". Por favor ingrese su número en la sección de CRM.`);
      return;
    }
    const amountVal = rx.pendingAmount || rx.chargedRate || 0;
    const text = `Hola *${contactEntity?.name}*, te saludamos de *${settings?.companyName || 'Control Financiero'}*.\n\nTe recordamos amablemente un valor pendiente de pago en nuestro sistema por *${formatCurrency(amountVal)}* por concepto de servicio de actualizaciones ANT para el cliente *${rx.finalClientName || rx.clientName || 'Cliente'}* (${rx.warehouse || rx.name || 'Suscripción'}).\n\nPor favor, confirmamos cuando realices la transferencia. ¡Muchas gracias!`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleWhatsAppGroupRedirect = (group: { entityName: string; total: number; rawItems: any[] }) => {
    const sampleItem = group.rawItems[0];
    let contactEntity = entities.find(e => e.name?.toLowerCase() === group.entityName.toLowerCase() || e.id === sampleItem?.intermediaryId);
    
    const phone = contactEntity?.contact || '';
    if (!phone) {
      alert(`No se encontró número de contacto registrado para "${group.entityName}". Por favor ingrese su número en la sección de CRM.`);
      return;
    }

    let text = `Hola *${group.entityName}*, te saludamos de *${settings?.companyName || 'Control Financiero'}*.\n\n`;
    text += `Mi estimado, te recordamos que tenemos pendiente de cobro un total de *${formatCurrency(group.total)}* correspondiente a:\n\n`;
    
    group.rawItems.forEach((item, index) => {
      const typeLabel = item.isTx ? 'Actualización ANT' : 'Servicio Digital';
      const detail = item.isTx 
        ? `${item.finalClientName || 'Cliente'} (${item.warehouse || 'S/D'})` 
        : `${item.name}`;
      const amountPending = item.pendingAmount;
      text += `${index + 1}. *${typeLabel}*: ${detail} - Saldo: *${formatCurrency(amountPending)}*\n`;
    });
    
    text += `\n*TOTAL PENDIENTE: ${formatCurrency(group.total)}*\n\nPor favor, confírmanos cuando realices la transferencia. ¡Muchas gracias! 🙏🏼`;
    
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleConfirmPayment = async () => {
    if (!user) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Por favor, ingresa un monto válido mayor a 0.");
      return;
    }
    if (!selectedWalletId) {
      alert("Por favor, selecciona una billetera.");
      return;
    }

    const { item, type } = paymentTarget!;
    const remaining = item.pendingAmount;
    if (amount > remaining + 0.001) {
      alert(`El monto ingresado ($${amount}) supera el saldo pendiente de $${remaining}`);
      return;
    }

    const { doc, updateDoc, addDoc, collection, increment } = await import('firebase/firestore');

    try {
      const walletRef = doc(db, 'wallets', selectedWalletId);
      const isCollection = type === 'receivables';

      if (item.isMass) {
        let remainingPayment = amount;
        // Sort items so that we pay oldest first
        const sortedItems = [...item.items].sort((a, b) => {
          const dateA = a.createdAt || a.date || '';
          const dateB = b.createdAt || b.date || '';
          return dateA.localeCompare(dateB);
        });

        for (const singleItem of sortedItems) {
          if (remainingPayment <= 0.005) break;

          const itemPending = singleItem.pendingAmount || 0;
          if (itemPending <= 0) continue;

          const amountToPay = Math.min(remainingPayment, itemPending);
          remainingPayment -= amountToPay;

          if (singleItem.isTx) {
            const txRef = doc(db, 'transactions', singleItem.id);
            const newAmountPaid = (singleItem.amountPaid || 0) + amountToPay;
            const fullyPaid = newAmountPaid >= (singleItem.chargedRate || 0) - 0.005;
            await updateDoc(txRef, {
              amountPaid: newAmountPaid,
              isPaid: fullyPaid,
              updatedAt: new Date().toISOString()
            });
          } else if (singleItem.isTxCost) {
            const txRef = doc(db, 'transactions', singleItem.id);
            const newCostPaid = (singleItem.costPaid || 0) + amountToPay;
            const totalCost = singleItem.baseCost !== undefined ? singleItem.baseCost : 5;
            const fullyPaid = newCostPaid >= totalCost - 0.005;
            await updateDoc(txRef, {
              costPaid: newCostPaid,
              isCostPaid: fullyPaid,
              updatedAt: new Date().toISOString()
            });
          } else if (singleItem.isDsCost) {
            const serviceRef = doc(db, 'digital_services', singleItem.id);
            const newCostPaid = (singleItem.costPaid || 0) + amountToPay;
            const fullyPaid = newCostPaid >= (singleItem.cost || 0) - 0.005;
            await updateDoc(serviceRef, {
              costPaid: newCostPaid,
              isCostPaid: fullyPaid,
              updatedAt: new Date().toISOString()
            });
          } else if (singleItem.isLedger) {
            const ledgerRef = doc(db, 'ledger', singleItem.id);
            if (amountToPay >= itemPending - 0.005) {
              await updateDoc(ledgerRef, {
                isPending: false,
                walletId: selectedWalletId,
                description: `${singleItem.description || ''} (Saldado)`,
                updatedAt: new Date().toISOString()
              });
            } else {
              await updateDoc(ledgerRef, {
                amount: -(itemPending - amountToPay),
                updatedAt: new Date().toISOString()
              });
            }
          } else {
            const serviceRef = doc(db, 'digital_services', singleItem.id);
            const newAmountPaid = (singleItem.amountPaid || 0) + amountToPay;
            const fullyPaid = newAmountPaid >= (singleItem.revenue || singleItem.chargedRate || 0) - 0.005;
            await updateDoc(serviceRef, {
              amountPaid: newAmountPaid,
              isPaid: fullyPaid,
              updatedAt: new Date().toISOString()
            });
          }
        }

        const ledgerAmount = isCollection ? amount : -amount;
        const categoryLabel = isCollection ? 'Abono Masivo de Cartera' : 'Pago Masivo de Costos';
        const descriptionLabel = isCollection 
          ? `Registro de abono general de ${formatCurrency(amount)} de ${item.entityName} aplicado a saldos pendientes.`
          : `Registro de pago general de ${formatCurrency(amount)} de costo a ${item.entityName} aplicado a saldos pendientes.`;

        await addDoc(collection(db, 'ledger'), {
          amount: ledgerAmount,
          category: categoryLabel,
          description: descriptionLabel,
          date: new Date().toISOString().split('T')[0],
          walletId: selectedWalletId,
          isExpense: !isCollection,
          ownerId: user.uid,
          createdAt: new Date().toISOString()
        });

        await updateDoc(walletRef, {
          balance: increment(ledgerAmount)
        });

      } else {
        if (item.isTx) {
          const txRef = doc(db, 'transactions', item.id);
          const newAmountPaid = (item.amountPaid || 0) + amount;
          const fullyPaid = newAmountPaid >= (item.chargedRate || 0) - 0.005;
          await updateDoc(txRef, {
            amountPaid: newAmountPaid,
            isPaid: fullyPaid,
            updatedAt: new Date().toISOString()
          });
        } else if (item.isTxCost) {
          const txRef = doc(db, 'transactions', item.id);
          const newCostPaid = (item.costPaid || 0) + amount;
          const totalCost = item.baseCost !== undefined ? item.baseCost : 5;
          const fullyPaid = newCostPaid >= totalCost - 0.005;
          await updateDoc(txRef, {
            costPaid: newCostPaid,
            isCostPaid: fullyPaid,
            updatedAt: new Date().toISOString()
          });
        } else if (item.isDsCost) {
          const serviceRef = doc(db, 'digital_services', item.id);
          const newCostPaid = (item.costPaid || 0) + amount;
          const fullyPaid = newCostPaid >= (item.cost || 0) - 0.005;
          await updateDoc(serviceRef, {
            costPaid: newCostPaid,
            isCostPaid: fullyPaid,
            updatedAt: new Date().toISOString()
          });
        } else if (item.isLedger) {
          const ledgerRef = doc(db, 'ledger', item.id);
          await updateDoc(ledgerRef, {
            isPending: false,
            walletId: selectedWalletId,
            description: `${item.description || ''} (Saldado)`,
            updatedAt: new Date().toISOString()
          });
        } else {
          const serviceRef = doc(db, 'digital_services', item.id);
          const newAmountPaid = (item.amountPaid || 0) + amount;
          const fullyPaid = newAmountPaid >= (item.revenue || item.chargedRate || 0) - 0.005;
          await updateDoc(serviceRef, {
            amountPaid: newAmountPaid,
            isPaid: fullyPaid,
            updatedAt: new Date().toISOString()
          });
        }

        if (item.isLedger) {
          await updateDoc(walletRef, {
            balance: increment(item.amount) 
          });
        } else {
          const ledgerAmount = isCollection ? amount : -amount;
          const categoryLabel = isCollection 
            ? (item.isTx ? 'Abono Actualización ANT' : 'Abono Servicio Digital')
            : (item.isTxCost ? 'Costo Actualización ANT' : 'Costo Servicio Digital');
          const descriptionLabel = isCollection
            ? `Cobro parcial de ${formatCurrency(amount)}: de ${item.intermediaryName || item.clientName || 'Cliente'} (${item.warehouse || item.name || 'S/N'})`
            : `Pago parcial de ${formatCurrency(amount)}: a ${item.supplierName || item.supplier || 'Proveedor'} por ${item.name || 'S/N'}`;

          await addDoc(collection(db, 'ledger'), {
            amount: ledgerAmount,
            category: categoryLabel,
            description: descriptionLabel,
            date: new Date().toISOString().split('T')[0],
            walletId: selectedWalletId,
            isExpense: !isCollection,
            ownerId: user.uid,
            createdAt: new Date().toISOString()
          });

          await updateDoc(walletRef, {
            balance: increment(ledgerAmount)
          });
        }
      }

      alert("¡Transacción registrada y caja general actualizada con éxito! 🟢");
      setPaymentTarget(null);
    } catch (err) {
      console.error(err);
      alert("Error al procesar la transacción en Firebase.");
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto p-4 lg:p-8 text-left">
      <div className="flex flex-col gap-1 lg:gap-2">
        <h2 className={cn("text-2xl lg:text-3xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
          Resumen Financiero
        </h2>
        <p className="text-slate-500 text-sm lg:text-base font-medium">Métricas de rendimiento en tiempo real.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
        <StatCard 
          label="Caja General" 
          value={formatCurrency(totalWallets)} 
          icon={Wallet} 
          trend="Disponible (Líquido)" 
          trendUp={true} 
          onClick={() => setActiveModal('wallets')}
        />
        <StatCard 
          label="Cupo Disponible TC" 
          value={formatCurrency(totalCreditAvailable)} 
          icon={CreditCard} 
          trend="Cupo Tarjetas Crédito" 
          trendUp={true} 
          onClick={() => setActiveModal('wallets')}
        />
        <StatCard 
          label="Cuentas por Cobrar (AR)" 
          value={formatCurrency(totalReceivables)} 
          icon={TrendingUp} 
          trend={`${receivables.length} Pendientes`} 
          trendUp={true} 
          onClick={() => setActiveModal('receivables')}
        />
        <StatCard 
          label="Cuentas por Pagar (AP)" 
          value={formatCurrency(totalPayables)} 
          icon={Clock} 
          variant="dark"
          trend={`${payables.length} Obligaciones`} 
          onClick={() => setActiveModal('payables')}
        />
        <StatCard 
          label="Cuentas Registradas" 
          value={wallets.length} 
          icon={DollarSign} 
          variant="indigo"
          trend="En sincronización" 
          onClick={() => setActiveModal('wallets')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cuentas por Cobrar */}
        <div className={cn("border rounded-2xl shadow-sm flex flex-col", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
          <div className={cn("p-5 border-b flex items-center justify-between", isDark ? "border-slate-800 bg-slate-800/30" : "border-slate-100 bg-emerald-50")}>
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
              <h2 className={cn("font-bold tracking-tight text-sm uppercase tracking-widest", isDark ? "text-emerald-400" : "text-emerald-700")}>
                Cuentas por Cobrar
              </h2>
            </div>
            <span className="text-sm font-black font-mono text-emerald-600">{formatCurrency(totalReceivables)}</span>
          </div>
          <div className="p-5 overflow-y-auto max-h-[300px] divide-y divide-slate-100/10">
            {receivables.map(rx => (
              <div key={rx.id} className="py-3 flex justify-between items-center group">
                <div className="min-w-0 pr-4">
                  <p className={cn("text-sm font-bold truncate", isDark ? "text-slate-200" : "text-slate-800")}>{rx.intermediaryName || rx.clientName || 'S/N'}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate mt-0.5">Cliente: {rx.finalClientName || '-'}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-emerald-500 block">{formatCurrency(rx.pendingAmount)}</span>
                    {rx.amountPaid > 0 && (
                      <span className="text-[9px] text-slate-400 font-bold block">Abonado: {formatCurrency(rx.amountPaid)}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      setActiveModal('receivables');
                      setPaymentTarget({ item: rx, type: 'receivables' });
                      setPaymentAmount((rx.pendingAmount || 0).toString());
                      setSelectedWalletId(wallets[0]?.id || '');
                    }}
                    title="Registrar Abono en Billetera / Efectivo"
                    className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm cursor-pointer"
                  >
                    <Wallet className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleWhatsAppRedirect(rx)}
                    title="Enviar recordatorio por WhatsApp al número registrado"
                    className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {receivables.length === 0 && <div className="text-center text-slate-500 py-8 text-xs font-bold uppercase tracking-widest">No hay cuentas por cobrar</div>}
          </div>
        </div>

        {/* Cuentas por Pagar */}
        <div className={cn("border rounded-2xl shadow-sm flex flex-col", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
          <div className={cn("p-5 border-b flex items-center justify-between", isDark ? "border-slate-800 bg-slate-800/30" : "border-slate-100 bg-rose-50")}>
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-rose-500" />
              <h2 className={cn("font-bold tracking-tight text-sm uppercase tracking-widest", isDark ? "text-rose-400" : "text-rose-700")}>
                Cuentas por Pagar
              </h2>
            </div>
            <span className="text-sm font-black font-mono text-rose-600">{formatCurrency(totalPayables)}</span>
          </div>
          <div className="p-5 overflow-y-auto max-h-[300px] divide-y divide-slate-100/10">
            {payables.map(px => (
              <div key={px.id} className="py-3 flex justify-between items-center group">
                <div className="min-w-0 pr-4">
                  <p className={cn("text-sm font-bold truncate", isDark ? "text-slate-200" : "text-slate-800")}>{px.category}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate mt-0.5">{px.description || 'Sin detalles'}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 font-bold">
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-rose-500 block">{formatCurrency(px.pendingAmount)}</span>
                    {px.costPaid > 0 && (
                      <span className="text-[9px] text-slate-400 font-bold block">Pagado: {formatCurrency(px.costPaid)}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      setActiveModal('payables');
                      setPaymentTarget({ item: px, type: 'payables' });
                      setPaymentAmount((px.pendingAmount || 0).toString());
                      setSelectedWalletId(wallets[0]?.id || '');
                    }}
                    title="Registrar Pago a Proveedor / Gasto"
                    className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm cursor-pointer"
                  >
                    <Wallet className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {payables.length === 0 && <div className="text-center text-slate-500 py-8 text-xs font-bold uppercase tracking-widest">No hay cuentas por pagar</div>}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-2xl p-6 lg:p-8 rounded-3xl border shadow-2xl flex flex-col max-h-[85vh]", 
                isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h3 className={cn("text-xl font-bold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    {activeModal === 'wallets' && "Caja General (Detalle)"}
                    {activeModal === 'receivables' && "Cuentas por Cobrar (AR)"}
                    {activeModal === 'payables' && "Cuentas por Pagar (AP)"}
                  </h3>
                  <p className="text-slate-500 font-mono font-bold mt-1">
                    Total: {
                      activeModal === 'wallets' ? formatCurrency(totalWallets) :
                      activeModal === 'receivables' ? formatCurrency(totalReceivables) :
                      formatCurrency(totalPayables)
                    }
                  </p>
                </div>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors self-start p-1 cursor-pointer">
                  <X />
                </button>
              </div>

              {/* Controles de Filtros y Vistas (Solo Cobros y Pagos) */}
              {(activeModal === 'receivables' || activeModal === 'payables') && (
                <div className="space-y-4 mb-6 shrink-0">
                  {/* Selector de Filtro de Relación */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Filtrar por Ecosistema CRM</span>
                    <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 w-full">
                      <button
                        onClick={() => setFilterType('all')}
                        className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                          filterType === 'all'
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        )}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setFilterType('client')}
                        className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                          filterType === 'client'
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                        )}
                      >
                        Clientes Finales
                      </button>
                      <button
                        onClick={() => setFilterType('reseller')}
                        className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                          filterType === 'reseller'
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                        )}
                      >
                        Revendedores
                      </button>
                      <button
                        onClick={() => setFilterType('intermediary')}
                        className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                          filterType === 'intermediary'
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                        )}
                      >
                        Intermediarios
                      </button>
                      {activeModal === 'payables' && (
                        <button
                          onClick={() => setFilterType('supplier')}
                          className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                            filterType === 'supplier'
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                          )}
                        >
                          Proveedores
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Selector de Tipo de Vista y Botón de PDF */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Visualización:</span>
                      <button
                        onClick={() => setViewMode('list')}
                        title="Vista plana de movimientos"
                        className={cn("p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[10px] font-black uppercase cursor-pointer",
                          viewMode === 'list'
                            ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-slate-850/60 dark:border-slate-800 dark:text-indigo-400"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                        )}
                      >
                        <List className="w-3.5 h-3.5" />
                        Lista Plana
                      </button>
                      <button
                        onClick={() => setViewMode('grouped')}
                        title="Vista agrupada por Entidad"
                        className={cn("p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[10px] font-black uppercase cursor-pointer",
                          viewMode === 'grouped'
                            ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-slate-850/60 dark:border-slate-800 dark:text-indigo-400"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                        )}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Por Entidad (Masivo)
                      </button>
                    </div>

                    <button
                      onClick={() => exportToPDF(activeModal === 'receivables' ? 'receivables' : 'payables')}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/10 transition-all cursor-pointer self-start sm:self-auto"
                    >
                      <FileText className="w-4 h-4" />
                      Exportar PDF
                    </button>
                  </div>

                  {/* Resumen Total del Filtro */}
                  <div className="p-3.5 rounded-xl border border-dashed flex justify-between items-center text-xs font-bold leading-none bg-slate-50/50 dark:bg-slate-950/20 dark:border-slate-800 border-slate-200">
                    <span className="text-slate-400 uppercase tracking-widest text-[9px] font-black">Total en Selección Activa:</span>
                    <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                      {activeModal === 'receivables' ? formatCurrency(filteredReceivablesTotal) : formatCurrency(filteredPayablesTotal)}
                    </span>
                  </div>
                </div>
              )}

              {/* SECTION: Interactive Payment/Collection panel */}
              {paymentTarget && (
                <div className="shrink-0 mb-6 p-4 rounded-2xl border border-dashed border-indigo-200 dark:border-slate-800 bg-indigo-50/25 dark:bg-slate-950/30 text-left">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-[10.5px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Wallet className="w-4 h-4" />
                      {paymentTarget.item.isMass
                        ? (paymentTarget.type === 'receivables' ? 'Registrar Cobro General/Masivo (CRM)' : 'Registrar Pago General/Masivo (AP)')
                        : (paymentTarget.type === 'receivables' ? 'Registrar Abono del Cliente' : 'Registrar Pago al Proveedor')}
                    </h4>
                    <button 
                      onClick={() => setPaymentTarget(null)}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white uppercase cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1 mb-3.5 leading-tight text-left font-bold">
                    Movimiento: <strong className={isDark ? "text-slate-300" : "text-slate-700"}>
                      {paymentTarget.item.isMass 
                        ? 'ABONO/PAGO GENERAL MULTIPLE (Por Entidad)' 
                        : (paymentTarget.item.isTx ? 'Actualización ANT' : paymentTarget.item.isTxCost ? 'Costo Actualización Proveedor' : paymentTarget.item.isDsCost ? 'Costo de Servicio Digital (Proveedor)' : 'Servicio Digital')}
                    </strong> • {paymentTarget.item.isMass ? paymentTarget.item.entityName : (paymentTarget.item.intermediaryName || paymentTarget.item.supplierName || paymentTarget.item.category || 'S/N')} 
                    {!paymentTarget.item.isMass && paymentTarget.item.finalClientName ? ` por ${paymentTarget.item.finalClientName}` : ''} 
                    {!paymentTarget.item.isMass ? ` (${paymentTarget.item.warehouse || paymentTarget.item.name || paymentTarget.item.description})` : ` (${paymentTarget.item.items?.length || 0} movimientos pendientes)`}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                        Monto a Abonar (Saldo: {formatCurrency(paymentTarget.item.pendingAmount)})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        max={paymentTarget.item.pendingAmount}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full text-xs font-black p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                        Seleccionar Caja o Billetera
                      </label>
                      <select
                        value={selectedWalletId}
                        onChange={(e) => setSelectedWalletId(e.target.value)}
                        className="w-full text-xs font-black p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Elige una billetera --</option>
                        {wallets.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} (Saldo: {formatCurrency(w.balance)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmPayment}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
                  >
                    Confirmar Transacción y Sincronizar Caja
                  </button>
                </div>
              )}

              <div className="overflow-y-auto flex-1 pr-2 min-h-[300px]">
                <div className={cn("divide-y", isDark ? "divide-slate-800" : "divide-slate-100")}>
                  {activeModal === 'wallets' && (
                    <div className="space-y-6 pt-2">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 border-b border-indigo-500/10 pb-1 text-left">
                          Efectivo y Cuentas Bancarias
                        </div>
                        {wallets.filter(w => w.type !== 'credit_card').length === 0 ? (
                          <div className="p-4 text-center text-slate-500 font-bold uppercase tracking-widest text-[9px] border border-dashed border-slate-250 dark:border-slate-800 rounded-xl">No hay cuentas de efectivo registradas.</div>
                        ) : wallets.filter(w => w.type !== 'credit_card').map(w => (
                          <div key={w.id} className="py-2.5 flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 last:border-0">
                            <div className="min-w-0 pr-4 text-left font-bold">
                              <p className={cn("text-xs truncate", isDark ? "text-slate-200" : "text-slate-800")}>{w.name}</p>
                              <p className="text-[9px] uppercase font-black tracking-widest text-slate-500 truncate mt-0.5">
                                {w.type === 'bank' ? 'Banco' : w.type === 'cash' ? 'Efectivo' : 'Billetera Digital'} • {w.currency || 'USD'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={cn("text-xs font-black font-mono", w.balance < 0 ? "text-rose-500" : "text-indigo-500")}>
                                {formatCurrency(w.balance || 0)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-2 border-b border-violet-500/10 pb-1 text-left">
                          Tarjetas de Crédito (No sumado a efectivo)
                        </div>
                        {wallets.filter(w => w.type === 'credit_card').length === 0 ? (
                          <div className="p-4 text-center text-slate-500 font-bold uppercase tracking-widest text-[9px] border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No hay tarjetas de crédito registradas.</div>
                        ) : wallets.filter(w => w.type === 'credit_card').map(w => (
                          <div key={w.id} className="py-2.5 flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 last:border-0">
                            <div className="min-w-0 pr-4 text-left font-bold">
                              <p className={cn("text-xs truncate", isDark ? "text-slate-200" : "text-slate-800")}>{w.name}</p>
                              <p className="text-[9px] uppercase font-black tracking-widest text-slate-500 truncate mt-0.5">
                                Tarjeta de Crédito • Cupo Total: {formatCurrency(w.totalLimit || 0)}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[9px] text-slate-400 font-bold tracking-tight">Cupo Disponible:</p>
                              <span className="text-xs font-black font-mono text-emerald-500">
                                {formatCurrency(w.balance || 0)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeModal === 'receivables' && viewMode === 'list' && (
                    filteredReceivables.length === 0 ? (
                      <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">No hay cuentas por cobrar en esta selección.</div>
                    ) : filteredReceivables.map(rx => {
                      const calculatedCat = resolveItemCategory(rx);
                      const relativeLabel = calculatedCat === 'client' ? 'Cliente Final' : calculatedCat === 'reseller' ? 'Revendedor' : calculatedCat === 'intermediary' ? 'Intermediario' : 'Proveedor';
                      return (
                        <div key={rx.id} className="py-4 flex justify-between items-center group text-left">
                          <div className="min-w-0 pr-4 font-bold">
                            <p className={cn("text-sm truncate", isDark ? "text-slate-200" : "text-slate-800")}>
                              {rx.intermediaryName || rx.clientName || rx.finalClientName || 'S/N'}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate mt-0.5">
                              {relativeLabel} • {rx.finalClientName ? `Cliente: ${rx.finalClientName}` : 'S/N'} ({rx.warehouse || rx.name || 'Suscripción'})
                            </p>
                            {rx.amountPaid > 0 && (
                              <p className="text-[10px] text-indigo-500 font-mono font-bold mt-1">Saldo Abonado: {formatCurrency(rx.amountPaid)} / Total: {formatCurrency(rx.chargedRate)}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-sm font-black font-mono text-emerald-500 mr-1">{formatCurrency(rx.pendingAmount)}</span>
                            
                            <button
                              onClick={() => {
                                setPaymentTarget({ item: rx, type: 'receivables' });
                                setPaymentAmount((rx.pendingAmount || 0).toString());
                                setSelectedWalletId(wallets[0]?.id || '');
                              }}
                              title="Registrar Abono en Efectivo / Banco"
                              className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm cursor-pointer"
                            >
                              <Wallet className="w-4 h-4" />
                            </button>

                            <button 
                              onClick={() => handleWhatsAppRedirect(rx)}
                              title="Enviar recordatorio por WhatsApp al número registrado"
                              className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm cursor-pointer"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {activeModal === 'receivables' && viewMode === 'grouped' && (
                    getGroupedItems('receivables').length === 0 ? (
                      <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">No hay registros en esta selección.</div>
                    ) : getGroupedItems('receivables').map(({ entityName, total, rawItems }) => {
                      const isExpanded = !!expandedGroups[entityName];
                      return (
                        <div key={entityName} className="py-3 text-left border-b border-slate-100/10 dark:border-slate-800/50">
                          <div 
                            onClick={() => setExpandedGroups(prev => ({ ...prev, [entityName]: !isExpanded }))}
                            className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-850/40 hover:bg-slate-100 dark:hover:bg-slate-850/80 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              <p className={cn("text-sm font-black", isDark ? "text-slate-200" : "text-slate-800")}>{entityName}</p>
                              
                              {/* Unified Mass Reminder button for this reseller/intermediary */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWhatsAppGroupRedirect({ entityName, total, rawItems });
                                }}
                                title="Enviar reporte masivo unificado por WhatsApp"
                                className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition-colors flex items-center justify-center cursor-pointer ml-2"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>

                              {/* General mass payment registering/collecting button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPaymentTarget({
                                    item: {
                                      isMass: true,
                                      entityName,
                                      items: rawItems,
                                      pendingAmount: total
                                    },
                                    type: 'receivables'
                                  });
                                  setPaymentAmount(total.toString());
                                  setSelectedWalletId(wallets[0]?.id || '');
                                }}
                                title="Registrar Cobro/Abono General de esta Entidad"
                                className="p-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors flex items-center justify-center cursor-pointer ml-1.5 animate-pulse"
                              >
                                <Wallet className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400 leading-none">{formatCurrency(total)}</span>
                          </div>

                          {isExpanded && (
                            <div className="mt-2 ml-6 pl-3 border-l-2 border-indigo-500/20 space-y-2">
                              {rawItems.map(item => {
                                const calculatedCat = resolveItemCategory(item);
                                const relativeLabel = calculatedCat === 'client' ? 'Cliente Final' : calculatedCat === 'reseller' ? 'Revendedor' : calculatedCat === 'intermediary' ? 'Intermediario' : 'Proveedor';
                                return (
                                  <div key={item.id} className="py-2.5 flex justify-between items-center text-xs text-left group border-b border-slate-100/5 last:border-0">
                                    <div className="font-bold">
                                      <p className={cn(isDark ? "text-slate-300" : "text-slate-700")}>
                                        {item.name || item.warehouse || 'Suscripción / Renovación'}
                                      </p>
                                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                                        Relación: {relativeLabel} {item.finalClientName ? `| Cliente final: ${item.finalClientName}` : ''}
                                      </p>
                                      {item.amountPaid > 0 && (
                                        <p className="text-[9px] text-indigo-500 font-mono mt-0.5 font-bold">Abonado del total: {formatCurrency(item.amountPaid)}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0">
                                      <span className="font-mono font-bold text-emerald-500">{formatCurrency(item.pendingAmount || 0)}</span>
                                      
                                      <button
                                        onClick={() => {
                                          setPaymentTarget({ item, type: 'receivables' });
                                          setPaymentAmount((item.pendingAmount || 0).toString());
                                          setSelectedWalletId(wallets[0]?.id || '');
                                        }}
                                        title="Registrar Abono"
                                        className="p-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors flex items-center justify-center cursor-pointer"
                                      >
                                        <Wallet className="w-3.5 h-3.5" />
                                      </button>

                                      <button 
                                        onClick={() => handleWhatsAppRedirect(item)}
                                        title="Enviar recordatorio WhatsApp"
                                        className="p-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors flex items-center justify-center cursor-pointer"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {activeModal === 'payables' && viewMode === 'list' && (
                    filteredPayables.length === 0 ? (
                      <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">No hay cuentas por pagar en esta selección.</div>
                    ) : filteredPayables.map(px => {
                      const calculatedCat = resolvePayableCategory(px);
                      const relativeLabel = calculatedCat === 'supplier' ? 'Proveedor' : calculatedCat === 'intermediary' ? 'Intermediario' : calculatedCat === 'client' ? 'Cliente Final' : 'Revendedor';
                      return (
                        <div key={px.id} className="py-4 flex justify-between items-center group text-left">
                          <div className="min-w-0 pr-4 font-bold">
                            <p className={cn("text-sm truncate", isDark ? "text-slate-200" : "text-slate-800")}>{px.category}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate mt-0.5">{relativeLabel} • {px.description || 'Sin detalles'}</p>
                            {px.costPaid > 0 && (
                              <p className="text-[10px] text-rose-500 font-mono font-bold mt-1">Saldado parcial de costos: {formatCurrency(px.costPaid)}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-sm font-black font-mono text-rose-500 mr-2">{formatCurrency(px.pendingAmount)}</span>
                            
                            <button
                              onClick={() => {
                                setPaymentTarget({ item: px, type: 'payables' });
                                setPaymentAmount((px.pendingAmount || 0).toString());
                                setSelectedWalletId(wallets[0]?.id || '');
                              }}
                              title="Registrar Pago a Proveedor"
                              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm cursor-pointer"
                            >
                              <Wallet className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {activeModal === 'payables' && viewMode === 'grouped' && (
                    getGroupedItems('payables').length === 0 ? (
                      <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">No hay registros en esta selección.</div>
                    ) : getGroupedItems('payables').map(({ entityName, total, rawItems }) => {
                      const isExpanded = !!expandedGroups[entityName];
                      return (
                        <div key={entityName} className="py-3 text-left border-b border-slate-100/10 dark:border-slate-850/50">
                          <div 
                            onClick={() => setExpandedGroups(prev => ({ ...prev, [entityName]: !isExpanded }))}
                            className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-850/40 hover:bg-slate-100 dark:hover:bg-slate-850/80 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              <p className={cn("text-sm font-black", isDark ? "text-slate-200" : "text-slate-800")}>{entityName}</p>

                              {/* General mass cost payment registering button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPaymentTarget({
                                    item: {
                                      isMass: true,
                                      entityName,
                                      items: rawItems,
                                      pendingAmount: total
                                    },
                                    type: 'payables'
                                  });
                                  setPaymentAmount(total.toString());
                                  setSelectedWalletId(wallets[0]?.id || '');
                                }}
                                title="Registrar Pago General / Masivo a este Proveedor"
                                className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors flex items-center justify-center cursor-pointer ml-1.5 animate-pulse"
                              >
                                <Wallet className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-sm font-mono font-black text-rose-500 leading-none">{formatCurrency(total)}</span>
                          </div>

                          {isExpanded && (
                            <div className="mt-2 ml-6 pl-3 border-l-2 border-rose-500/20 space-y-2">
                              {rawItems.map(item => {
                                const calculatedCat = resolvePayableCategory(item);
                                const relativeLabel = calculatedCat === 'supplier' ? 'Proveedor' : calculatedCat === 'intermediary' ? 'Intermediario' : calculatedCat === 'client' ? 'Cliente Final' : 'Revendedor';
                                return (
                                  <div key={item.id} className="py-2.5 flex justify-between items-center text-xs text-left border-b border-slate-100/5 last:border-0">
                                    <div className="font-bold">
                                      <p className={cn(isDark ? "text-slate-300" : "text-slate-700")}>
                                        {item.description || 'Gasto General'}
                                      </p>
                                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">
                                        Relación: {relativeLabel} {item.createdAt ? `| Reg: ${new Date(item.createdAt).toLocaleDateString()}` : ''}
                                      </p>
                                      {item.costPaid > 0 && (
                                        <p className="text-[9px] text-rose-500 font-mono mt-0.5">Saldado parcial de costos: {formatCurrency(item.costPaid)}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0">
                                      <span className="font-mono font-bold text-rose-500 mr-1">{formatCurrency(item.pendingAmount || 0)}</span>
                                      
                                      <button
                                        onClick={() => {
                                          setPaymentTarget({ item, type: 'payables' });
                                          setPaymentAmount((item.pendingAmount || 0).toString());
                                          setSelectedWalletId(wallets[0]?.id || '');
                                        }}
                                        title="Registrar Pago"
                                        className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors flex items-center justify-center cursor-pointer"
                                      >
                                        <Wallet className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
