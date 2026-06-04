/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { NoticeShareModal } from './NoticeShareModal';
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
  CreditCard,
  ChevronLeft,
  ChevronRight,
  User,
  Briefcase,
  Truck,
  Tv,
  Activity,
  Plus,
  ArrowRight,
  Save,
  Loader2
} from 'lucide-react';
import { formatCurrency, cn, getGMT5DateString } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTranslation } from '../lib/translations';

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
  const { t } = useTranslation();
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
  const [noticeShareData, setNoticeShareData] = useState<any | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // --- STATE FOR QUICK ADD FAB CONTEXT MENU ---
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'client' | 'reseller' | 'intermediary' | 'supplier' | 'digital_service' | 'ant_update' | 'income' | 'expense' | null>(null);
  const [fabSubmitting, setFabSubmitting] = useState(false);

  // Form states (Entities)
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

    // Ledger (all entries for calendar & payables)
    const unsubLedger = onSnapshot(query(collection(db, 'ledger'), where('ownerId', '==', user.uid)), (snap) => {
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
    ...ledgerEntries.filter(e => e.isPending && e.amount < 0).map(e => ({
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
    
    // Set Notice Data
    setNoticeShareData({
      recipientName: contactEntity?.name || rx.intermediaryName || rx.finalClientName || 'Cliente Pendiente',
      recipientPhone: phone,
      title: "Notificación de Saldo Pendiente",
      subtitle: rx.isTx ? `Trámite ANT: ${rx.finalClientName}` : `Servicio Digital: ${rx.name}`,
      items: [{
        concept: rx.isTx ? `Trámite ANT (${rx.warehouse})` : `Servicio Digital (${rx.name})`,
        reference: rx.isTx ? `Cliente: ${rx.finalClientName}` : undefined,
        amount: amountVal
      }],
      totalAmount: amountVal,
      statusLabel: "PENDIENTE",
      paymentInstructions: "Por favor, confírmanos con un comprobante de transferencia al verificar este saldo.",
      type: "receivable"
    });
  };

  const handleWhatsAppGroupRedirect = (group: { entityName: string; total: number; rawItems: any[] }) => {
    const sampleItem = group.rawItems[0];
    let contactEntity = entities.find(e => e.name?.toLowerCase() === group.entityName.toLowerCase() || e.id === sampleItem?.intermediaryId);
    
    const phone = contactEntity?.contact || '';
    if (!phone) {
      alert(`No se encontró número de contacto registrado para "${group.entityName}". Por favor ingrese su número en la sección de CRM.`);
      return;
    }

    // Set Notice Data for mass selection
    setNoticeShareData({
      recipientName: group.entityName,
      recipientPhone: phone,
      title: "Estado de Cuenta Consolidado",
      subtitle: `Resumen de movimientos y saldos pendientes`,
      items: group.rawItems.map(item => ({
        concept: item.isTx ? `Trámite ANT: ${item.finalClientName}` : `Servicio: ${item.name}`,
        reference: item.warehouse ? `Almacén: ${item.warehouse}` : undefined,
        amount: item.pendingAmount || 0
      })),
      totalAmount: group.total,
      statusLabel: "PENDIENTE",
      paymentInstructions: "Por favor, confírmanos cuando realices la transferencia. ¡Muchas gracias!",
      type: "receivable"
    });
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

      // Automatically construct and prompt the user to download or share the digital transaction voucher
      const isCollectionGroup = type === 'receivables';
      setNoticeShareData({
        recipientName: item.entityName || item.intermediaryName || item.clientName || 'Cliente / Intermediario',
        recipientPhone: '', 
        title: isCollectionGroup ? "COMPROBANTE DE COBRO" : "COMPROBANTE DE PAGO",
        subtitle: `Registro de caja - Estado: Procesado`,
        items: [{
          concept: item.isMass ? `Abono Masivo de Cartera: ${item.entityName}` : (item.isTx ? `Trámite ANT: ${item.finalClientName || 'Cliente'}` : `${item.name || item.description || 'Movimiento de Caja'}`),
          reference: `Billetera: ${selectedWalletId}`,
          amount: amount
        }],
        totalAmount: amount,
        statusLabel: "COMPLETADO",
        paymentInstructions: isCollectionGroup ? "Le agradecemos enormemente el saldo abonado a su cuenta." : "Comprobante de egreso y pago de valores de servicio.",
        type: isCollectionGroup ? "receivable" : "payable"
      });

      setPaymentTarget(null);
    } catch (err) {
      console.error(err);
      alert("Error al procesar la transacción en Firebase.");
    }
  };

  // Calendar helper calculations
  const calendarMonths = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  // Build the array of days to display in the grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // First day of the month
  const firstDay = new Date(year, month, 1);
  const firstDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();

  const daysGrid: { dateStr: string; dayNum: number; isCurrent: boolean }[] = [];

  // Prev month filler
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = prevTotalDays - i;
    const dateObj = new Date(year, month - 1, day);
    daysGrid.push({
      dateStr: getGMT5DateString(dateObj),
      dayNum: day,
      isCurrent: false
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    const dateObj = new Date(year, month, i);
    daysGrid.push({
      dateStr: getGMT5DateString(dateObj),
      dayNum: i,
      isCurrent: true
    });
  }

  // Next month filler to complete full weeks
  const totalOffsetDays = daysGrid.length;
  const remainingOffsetCells = totalOffsetDays % 7;
  if (remainingOffsetCells > 0) {
    const extraCells = 7 - remainingOffsetCells;
    for (let i = 1; i <= extraCells; i++) {
      const dateObj = new Date(year, month + 1, i);
      daysGrid.push({
        dateStr: getGMT5DateString(dateObj),
        dayNum: i,
        isCurrent: false
      });
    }
  }

  const getDayFinancials = (dateStr: string) => {
    const dayEntries = ledgerEntries.filter(e => {
      return e.date === dateStr || e.dueDate === dateStr;
    });

    let realIncome = 0;
    let realExpense = 0;
    let pendingPaymentsCount = 0;
    let pendingPaymentsTotal = 0;

    dayEntries.forEach(e => {
      if (e.isPending) {
        pendingPaymentsCount++;
        pendingPaymentsTotal += Math.abs(e.amount);
      } else {
        if (e.amount > 0) {
          realIncome += e.amount;
        } else {
          realExpense += Math.abs(e.amount);
        }
      }
    });

    return {
      realIncome,
      realExpense,
      pendingPaymentsCount,
      pendingPaymentsTotal,
      entries: dayEntries
    };
  };

  const selectedDayData = selectedDay ? getDayFinancials(selectedDay) : null;

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto p-4 lg:p-8 text-left">
      <div className="flex flex-col gap-1 lg:gap-2">
        <h2 className={cn("text-2xl lg:text-3xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
          {t('dash.title', 'Resumen Financiero')}
        </h2>
        <p className="text-slate-500 text-sm lg:text-base font-medium">{t('dash.subtitle', 'Métricas de rendimiento en tiempo real.')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
        <StatCard 
          label={t('dash.cash_balance', 'Caja General')} 
          value={formatCurrency(totalWallets)} 
          icon={Wallet} 
          trend={t('dash.available_liquid', 'Disponible (Líquido)')} 
          trendUp={true} 
          onClick={() => setActiveModal('wallets')}
        />
        <StatCard 
          label={t('dash.available_cc', 'Cupo Disponible TC')} 
          value={formatCurrency(totalCreditAvailable)} 
          icon={CreditCard} 
          trend={t('dash.cc_details', 'Cupo Tarjetas Crédito')} 
          trendUp={true} 
          onClick={() => setActiveModal('wallets')}
        />
        <StatCard 
          label={t('dash.receivables', 'Cuentas por Cobrar (AR)')} 
          value={formatCurrency(totalReceivables)} 
          icon={TrendingUp} 
          trend={`${receivables.length} ${t('dash.pending', 'Pendientes')}`} 
          trendUp={true} 
          onClick={() => setActiveModal('receivables')}
        />
        <StatCard 
          label={t('dash.payables', 'Cuentas por Pagar (AP)')} 
          value={formatCurrency(totalPayables)} 
          icon={Clock} 
          variant="dark" 
          trend={`${payables.length} ${t('dash.obligations', 'Obligaciones')}`} 
          onClick={() => setActiveModal('payables')}
        />
        <StatCard 
          label={t('dash.registered_wallets', 'Cuentas Registradas')} 
          value={wallets.length} 
          icon={DollarSign} 
          variant="indigo" 
          trend={t('dash.syncing', 'En sincronización')} 
          onClick={() => setActiveModal('wallets')}
        />
      </div>

      {/* Interactive Calendar Segment */}
      <div className={cn("p-6 rounded-3xl border text-left", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm")}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className={cn("text-lg font-black uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
              📅 Calendario de Control de Caja y Gastos Programados
            </h3>
            <p className="text-slate-550 dark:text-slate-400 text-xs font-semibold mt-1">
              Monitoreo diario de ingresos reales, egresos y vencimientos de tarjetas de crédito o fijos.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevMonth}
              className={cn("p-2 rounded-xl border transition-colors cursor-pointer", isDark ? "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900")}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={cn("text-sm font-black uppercase tracking-widest min-w-[150px] text-center", isDark ? "text-white" : "text-slate-800")}>
              {calendarMonths[month]} {year}
            </span>
            <button 
              onClick={handleNextMonth}
              className={cn("p-2 rounded-xl border transition-colors cursor-pointer", isDark ? "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900")}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100/10 pb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Ingresos Reales
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Egresos Reales
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Pagos Programados (Tarjetas / Fijos)
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Weekday headers */}
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((weekday) => (
            <div key={weekday} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500 py-1">
              {weekday}
            </div>
          ))}

          {/* Days */}
          {daysGrid.map(({ dateStr, dayNum, isCurrent }, idx) => {
            const dayFin = getDayFinancials(dateStr);
            const isToday = dateStr === getGMT5DateString(new Date());
            const isSelected = selectedDay === dateStr;

            return (
              <motion.div
                whileHover={{ y: -1, scale: 1.01 }}
                onClick={() => setSelectedDay(dateStr)}
                key={`${dateStr}-${idx}`}
                className={cn(
                  "min-h-[85px] p-2 border rounded-2xl cursor-pointer flex flex-col justify-between transition-all duration-300 relative",
                  isCurrent 
                    ? (isDark ? "bg-slate-950/45 border-slate-850" : "bg-slate-50/50 border-slate-200/50")
                    : (isDark ? "bg-slate-950/10 border-slate-900 opacity-40" : "bg-slate-100/30 border-slate-100 opacity-45"),
                  isToday && (isDark ? "ring-2 ring-indigo-500/50 bg-indigo-950/20" : "ring-2 ring-indigo-500 bg-indigo-50/50"),
                  isSelected && (isDark ? "border-indigo-500 bg-slate-900" : "border-indigo-600 bg-indigo-50/20")
                )}
              >
                <div className="flex justify-between items-center">
                  <span className={cn(
                    "text-xs font-black",
                    isCurrent 
                      ? (isDark ? "text-slate-300" : "text-slate-700") 
                      : "text-slate-500",
                    isToday && "text-indigo-500 font-extrabold"
                  )}>
                    {dayNum}
                  </span>
                  {dayFin.pendingPaymentsCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" title={`${dayFin.pendingPaymentsCount} programados`} />
                  )}
                </div>

                {/* Values stack */}
                <div className="space-y-0.5 mt-2 text-[8.5px] font-bold font-mono tracking-tighter">
                  {dayFin.realIncome > 0 && (
                    <div className="text-emerald-500 truncate" title="Ingreso Real">
                      +{formatCurrency(dayFin.realIncome)}
                    </div>
                  )}
                  {dayFin.realExpense > 0 && (
                    <div className="text-rose-500 truncate" title="Egreso Real">
                      -{formatCurrency(dayFin.realExpense)}
                    </div>
                  )}
                  {dayFin.pendingPaymentsTotal > 0 && (
                    <div className="text-amber-500 truncate border-t border-dashed border-slate-500/10 pt-0.5 block" title="Programado">
                      P: {formatCurrency(dayFin.pendingPaymentsTotal)}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Selected Day Details Panel */}
        <AnimatePresence mode="wait">
          {selectedDay && selectedDayData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={cn("mt-6 p-5 rounded-2xl border text-left", isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50/70 border-slate-100")}
            >
              <div className="flex justify-between items-center mb-4 border-b border-dashed border-slate-500/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full", isDark ? "bg-slate-800 text-slate-300" : "bg-indigo-50 text-indigo-700")}>
                    Detalles para: {selectedDay}
                  </span>
                  {selectedDay === getGMT5DateString(new Date()) && (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-500 text-white px-2 py-0.5 rounded-full">Hoy</span>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedDay(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-black uppercase tracking-widest cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              {selectedDayData.entries.length === 0 ? (
                <div className="text-center py-6 text-slate-550 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  No hay transacciones guardadas ni pagos programados para este día.
                </div>
              ) : (
                <div className="space-y-3 max-h-[250px] overflow-y-auto">
                  {selectedDayData.entries.map((entry) => (
                    <div 
                      key={entry.id} 
                      className={cn(
                        "p-3 rounded-xl border flex justify-between items-center gap-4 transition-all hover:translate-x-0.5",
                        entry.isPending 
                          ? (isDark ? "bg-amber-950/15 border-amber-900/30 text-amber-500" : "bg-amber-50 border-amber-100 text-amber-700")
                          : entry.amount > 0
                            ? (isDark ? "bg-emerald-950/15 border-emerald-900/30 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-700")
                            : (isDark ? "bg-rose-950/15 border-rose-900/30 text-rose-400" : "bg-rose-50 border-rose-100 text-rose-700")
                      )}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black uppercase tracking-widest block truncate">
                          {entry.category}
                        </span>
                        <span className={cn("text-[10px] uppercase font-bold text-slate-400 mt-0.5 block truncate", isDark ? "text-slate-500" : "text-slate-400")}>
                          {entry.description || "Sin descripción"}
                        </span>
                        {entry.isPending && entry.dueDate && (
                          <span className="text-[9px] font-black tracking-widest text-amber-600 block mt-0.5 uppercase">
                            ⚠️ Programado para Vencer: {entry.dueDate}
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black font-mono tracking-tight block">
                          {entry.amount > 0 ? "+" : ""}{formatCurrency(entry.amount)}
                        </span>
                        <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">
                          {entry.isPending ? "Pendiente" : "Asentado"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
                    <div className={cn(
                      "flex flex-wrap gap-1.5 p-1 rounded-xl w-full border",
                      isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200/50"
                    )}>
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
                  <div className={cn(
                    "p-3.5 rounded-xl border border-dashed flex justify-between items-center text-xs font-bold leading-none",
                    isDark ? "bg-slate-950/45 border-slate-800" : "bg-slate-50 border-slate-200"
                  )}>
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
                            className={cn(
                              "flex justify-between items-center p-3 rounded-xl cursor-pointer transition-colors border",
                              isDark 
                                ? "bg-slate-800/60 border-slate-700/60 hover:bg-slate-800" 
                                : "bg-slate-50 border-slate-200/50 hover:bg-slate-100"
                            )}
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
                            className={cn(
                              "flex justify-between items-center p-3 rounded-xl cursor-pointer transition-colors border",
                              isDark 
                                ? "bg-slate-800/60 border-slate-700/60 hover:bg-slate-800" 
                                : "bg-slate-50 border-slate-200/50 hover:bg-slate-100"
                            )}
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

      {noticeShareData && (
        <NoticeShareModal
          isOpen={!!noticeShareData}
          onClose={() => setNoticeShareData(null)}
          recipientName={noticeShareData.recipientName}
          recipientPhone={noticeShareData.recipientPhone}
          title={noticeShareData.title}
          subtitle={noticeShareData.subtitle}
          items={noticeShareData.items}
          totalAmount={noticeShareData.totalAmount}
          statusLabel={noticeShareData.statusLabel}
          paymentInstructions={noticeShareData.paymentInstructions}
          type={noticeShareData.type}
        />
      )}

      {/* BOTÓN FLOTANTE REGISTRO RÁPIDO */}
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
              <div className="flex justify-between items-center mb-4 border-b pb-3 border-slate-800/10">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Registro Rápido Directo</span>
                </div>
                <button
                  onClick={() => { setIsFabOpen(false); resetFabForm(); }}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-slate-400"
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
                          className={cn("w-full p-3 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                          placeholder="Ej. Andrés Mendoza"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Celular (WhatsApp)</label>
                        <input
                          type="text"
                          value={fabEntityContact}
                          onChange={(e) => setFabEntityContact(e.target.value)}
                          className={cn("w-full p-3 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
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
                            className={cn("w-full p-3 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
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
                            className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                            placeholder="Ej. Netflix"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Categoría</label>
                          <select
                            value={fabDsCategory}
                            onChange={(e) => setFabDsCategory(e.target.value)}
                            className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
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
                            className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                            placeholder="Nombre cliente"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">WhatsApp</label>
                          <input
                            type="text"
                            value={fabDsClientContact}
                            onChange={(e) => setFabDsClientContact(e.target.value)}
                            className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
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
                            className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">PVP (USD)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={fabDsRevenue}
                            onChange={(e) => setFabDsRevenue(e.target.value)}
                            className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Días Validez</label>
                          <input
                            type="number"
                            value={fabDsDurationDays}
                            onChange={(e) => setFabDsDurationDays(e.target.value)}
                            className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800/5">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase tracking-tight text-slate-400">Email Acceso</label>
                          <input
                            type="text"
                            value={fabDsEmail}
                            onChange={(e) => setFabDsEmail(e.target.value)}
                            className={cn("w-full p-2 rounded-lg border text-[11px] font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
                            placeholder="ejemplo@test.com"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase tracking-tight text-slate-400">Contraseña</label>
                          <input
                            type="text"
                            value={fabDsPassword}
                            onChange={(e) => setFabDsPassword(e.target.value)}
                            className={cn("w-full p-2 rounded-lg border text-[11px] font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
                            placeholder="password"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold uppercase tracking-tight text-slate-400">Pines / Perfil</label>
                          <input
                            type="text"
                            value={fabDsPin}
                            onChange={(e) => setFabDsPin(e.target.value)}
                            className={cn("w-full p-2 rounded-lg border text-[11px] font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
                            placeholder="Pines"
                          />
                        </div>
                      </div>
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
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
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
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
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
                            className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
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
                            className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
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
                            className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Tarifa Cobrada (USD)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={fabAntChargedRate}
                            onChange={(e) => setFabAntChargedRate(e.target.value)}
                            className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
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
                            className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
                            placeholder="Ej. 10.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Caja / Wallet destino</label>
                          <select
                            value={fabLedgerWalletId}
                            onChange={(e) => setFabLedgerWalletId(e.target.value)}
                            className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
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
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
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
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100")}
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
    </div>
  );
}
