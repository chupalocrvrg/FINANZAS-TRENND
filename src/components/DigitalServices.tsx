import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Tv, 
  Smartphone, 
  Gamepad2, 
  MoreHorizontal,
  Plus,
  X,
  Save,
  Loader2,
  Trash2,
  Search,
  MessageCircle,
  CheckCircle2,
  Wallet,
  Receipt,
  FileText,
  TrendingUp,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { VoucherModal, VoucherData } from './VoucherModal';
import { formatCurrency, cn, getGMT5DateString, calculateServiceExpirationDate } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, increment, writeBatch } from 'firebase/firestore';
import { Wallet as WalletType } from '../types';
import { sendLocalPushNotification } from '../lib/notifications';
import { ConfirmModal } from './ConfirmModal';
import { ServiceRenewalModal } from './ServiceRenewalModal';

interface Entity {
  id: string;
  name: string;
  type: string;
  rate: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  pvp?: number;
  providers: {
    supplierId: string;
    cost: number;
    pvp?: number; // optionally per provider instead? let's do both or just per provider. The prompt says "el PVP", I can add it to provider, or to CatalogItem. Let's add it to the provider.
    pvpReseller?: number;
  }[];
  createdAt: string;
  ownerId: string;
}

export interface DigitalServiceItem {
  id: string;
  name: string;
  category: string;
  revenue: number;
  cost?: number;
  supplierId?: string;
  supplierName?: string;
  ownerId: string;
  clientName?: string;
  clientContact?: string;
  expirationDate?: string;
  email?: string;
  password?: string;
  pin?: string;
  status?: 'active' | 'expired' | 'pending';
  isPaid?: boolean;
  isCostPaid?: boolean;
  revenueWalletId?: string;
  costWalletId?: string;
  createdAt?: string;
  amountPaid?: number;
  costPaid?: number;
}

export function DigitalServices() {
  const { user, settings } = useAuth();
  const [services, setServices] = useState<DigitalServiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<Entity[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [allEntities, setAllEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showNewCatalogForm, setShowNewCatalogForm] = useState(false);
  const [newCatalogName, setNewCatalogName] = useState('');
  const [activeSupplierCatalogId, setActiveSupplierCatalogId] = useState<string | null>(null);
  const [newSupplierProv, setNewSupplierProv] = useState({ supplierId: '', cost: '', pvp: '', pvpReseller: '' });

  // Editing catalog item name states
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [editingCatalogName, setEditingCatalogName] = useState('');

  // Editing a specific provider's pricing state
  const [editingProviderKey, setEditingProviderKey] = useState<{catalogId: string, supplierId: string} | null>(null);
  const [editingProviderForm, setEditingProviderForm] = useState({ cost: '', pvp: '', pvpReseller: '' });

  // Voucher Modal States
  const [activeVoucher, setActiveVoucher] = useState<VoucherData | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  const handleOpenVoucher = (service: DigitalServiceItem) => {
    const voucherData: VoucherData = {
      title: `Venta: ${service.name}`,
      subtitle: `Suscripción ${service.category || 'Digital'}`,
      id: service.id,
      date: service.createdAt ? new Date(service.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
      clientName: service.clientName || 'Cliente Final',
      clientContact: service.clientContact,
      amount: service.revenue || 0,
      status: service.isPaid ? 'paid' : 'pending',
      details: [
        { label: 'E-mail Acceso', value: service.email || '-' },
        { label: 'Clave / Password', value: service.password || '-' },
        { label: 'Tipo Acceso', value: (service as any).serviceType === 'pantalla' ? 'Pantalla / Per Dispositivo' : 'Cuenta Completa' },
        ...((service as any).serviceType === 'pantalla' ? [
          { label: 'Nombre Perfil', value: (service as any).profileName || '-' },
          { label: 'PIN de Acceso', value: service.pin || 'Sin PIN' }
        ] : [
          { label: 'PIN / Pantalla', value: service.pin || 'General' }
        ]),
        { label: 'Fecha Vence', value: service.expirationDate || '-' },
        { label: 'Valor PVP', value: formatCurrency(service.revenue || 0) }
      ],
      paymentMethod: service.revenueWalletId ? 'Billetera Digital' : 'Efectivo/Directo'
    };
    setActiveVoucher(voucherData);
    setIsVoucherModalOpen(true);
  };

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

  // Payment processing state
  const [paymentService, setPaymentService] = useState<DigitalServiceItem | null>(null);
  const [renewalService, setRenewalService] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<'revenue' | 'cost'>('revenue');
  const [targetWalletId, setTargetWalletId] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Success Message
  const [successMsg, setSuccessMsg] = useState<{show: boolean, phone: string, text: string, service?: any}>({show: false, phone: '', text: ''});

  // Expiration / status filter for contract management
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');

  const [formData, setFormData] = useState({
    id: '', // for edit mode
    name: '',
    category: 'Streaming',
    revenue: '0',
    cost: '0',
    supplierId: '',
    clientName: '',
    clientContact: '',
    clientType: 'client' as 'client' | 'reseller',
    expirationDate: '',
    email: '',
    password: '',
    pin: '',
    serviceType: 'completa' as 'completa' | 'pantalla',
    profileName: '',
    status: 'active' as 'active' | 'expired' | 'pending',
    isPaid: true,
    isCostPaid: true,
    revenueWalletId: '',
    costWalletId: ''
  });

  const isDark = settings?.theme === 'dark';

  const [gridCols, setGridCols] = useState<1 | 2 | 3 | 4>(() => {
    const saved = localStorage.getItem('digital_services_grid_cols');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if ([1, 2, 3, 4].includes(parsed)) return parsed as any;
    }
    return 3; // default to a balanced 3 columns
  });

  useEffect(() => {
    localStorage.setItem('digital_services_grid_cols', gridCols.toString());
  }, [gridCols]);

  useEffect(() => {
    if (!user) return;
    const qSer = query(collection(db, 'digital_services'), where('ownerId', '==', user.uid));
    const unsubSer = onSnapshot(qSer, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DigitalServiceItem)));
      setLoading(false);
    });

    const qEnt = query(collection(db, 'entities'), where('ownerId', '==', user.uid));
    const unsubEnt = onSnapshot(qEnt, (snapshot) => {
      const allEnt = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setAllEntities(allEnt);
      setSuppliers(allEnt.filter(e => e.type === 'supplier') as Entity[]);
    });

    const qCat = query(collection(db, 'digital_catalog'), where('ownerId', '==', user.uid));
    const unsubCat = onSnapshot(qCat, (snapshot) => {
      setCatalogItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CatalogItem)));
    });

    const qWallets = query(collection(db, 'wallets'), where('ownerId', '==', user.uid));
    const unsubWallets = onSnapshot(qWallets, (snapshot) => {
      setWallets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletType)));
    });

    return () => { unsubSer(); unsubEnt(); unsubCat(); unsubWallets(); };
  }, [user]);

  // Dynamically set or update expiration date for new services based on service name and notes/PIN
  useEffect(() => {
    if (formData.id) return; // Only auto-set/calculate during creation
    
    const defaultDate = getGMT5DateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    if (!formData.expirationDate || formData.expirationDate === defaultDate) {
      const calculated = calculateServiceExpirationDate(formData.name, formData.pin);
      if (calculated !== formData.expirationDate) {
        setFormData(prev => ({ ...prev, expirationDate: calculated }));
      }
    }
  }, [formData.name, formData.pin, formData.id]);

  // Clean up expired digital service accounts that have been past their expiration date by more than 3 waiting days without being renewed
  useEffect(() => {
    if (!user || services.length === 0) return;

    const runExpiredCleanup = async () => {
      const today = new Date();
      const toDelete = services.filter(service => {
        if (!service.expirationDate) return false;
        
        const expiryDate = new Date(service.expirationDate);
        if (isNaN(expiryDate.getTime())) return false;

        // Calculate direct difference in milliseconds converted to decimal days
        const diffTime = today.getTime() - expiryDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        // Deletes if expired and more than 3 waiting days elapsed (meaning diffDays > 3)
        // EXCLUSION: If the subscription has pending accounts receivable (isPaid === false)
        // or pending accounts payable (isCostPaid === false), preserve it to avoid deleting debt logs.
        const isPendingReceivable = service.isPaid === false;
        const isPendingPayable = service.isCostPaid === false;

        return diffDays > 3 && !isPendingReceivable && !isPendingPayable;
      });

      if (toDelete.length === 0) return;

      console.log(`[Auto-Cleanup] Found ${toDelete.length} digital account(s) overdue by more than 3 waiting days. Initiating deletion...`);
      for (const service of toDelete) {
        try {
          await deleteDoc(doc(db, 'digital_services', service.id));
          console.log(`[Auto-Cleanup] Successfully deleted expired account: name="${service.name}" email="${service.email}"`);
        } catch (err) {
          console.error(`[Auto-Cleanup] Error executing deletion on doc ${service.id}:`, err);
        }
      }
    };

    const runTimer = setTimeout(() => {
      runExpiredCleanup();
    }, 2000);

    return () => clearTimeout(runTimer);
  }, [services, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    
    // Check duplicates if not editing
    if (!formData.id) {
      const isDuplicate = services.some(s => 
        s.email?.trim().toLowerCase() === formData.email.trim().toLowerCase() &&
        s.password === formData.password &&
        s.pin === formData.pin &&
        ((s as any).profileName || '') === formData.profileName &&
        s.name?.trim().toLowerCase() === formData.name.trim().toLowerCase()
      );

      if (isDuplicate) {
        alert("¡Error de duplicado! Ya existe una venta de servicio digital registrada exactamente con la misma cuenta, correo, clave, pin y nombre de perfil.");
        setIsSubmitting(false);
        return;
      }
    }
    
    const sup = suppliers.find(s => s.id === formData.supplierId);
    const serviceData = {
      name: formData.name,
      category: formData.category,
      revenue: parseFloat(formData.revenue) || 0,
      cost: parseFloat(formData.cost) || 0,
      supplierId: formData.supplierId,
      supplierName: sup?.name || '',
      clientName: formData.clientName,
      clientContact: formData.clientContact,
      clientType: formData.clientType,
      expirationDate: formData.expirationDate,
      email: formData.email,
      password: formData.password,
      pin: formData.pin,
      serviceType: formData.serviceType,
      profileName: formData.profileName,
      status: formData.status,
      isPaid: formData.isPaid,
      isCostPaid: formData.isCostPaid,
      revenueWalletId: formData.revenueWalletId || '',
      costWalletId: formData.costWalletId || '',
      ownerId: user.uid,
      updatedAt: new Date().toISOString()
    };

    try {
      if (formData.id) {
        // Edit Mode
        const { updateDoc, doc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'digital_services', formData.id), serviceData);
        await logServiceHistory(formData.id, 'updated', serviceData);
      } else {
        // Create Mode
        const docRef = await addDoc(collection(db, 'digital_services'), {
          ...serviceData,
          createdAt: new Date().toISOString()
        });
        await logServiceHistory(docRef.id, 'created', serviceData);

        // Revenue ledger & wallet balance increment if isPaid & revenueWalletId selected
        if (formData.isPaid && formData.revenueWalletId) {
          try {
            await addDoc(collection(db, 'ledger'), {
              amount: parseFloat(formData.revenue) || 0,
              category: 'Venta de Servicio Digital',
              description: `Cobro de ${formData.name} a ${formData.clientName || 'Cliente'}`,
              date: new Date().toISOString().split('T')[0],
              walletId: formData.revenueWalletId,
              isExpense: false,
              ownerId: user.uid,
              createdAt: new Date().toISOString()
            });
            const { doc, updateDoc, increment } = await import('firebase/firestore');
            await updateDoc(doc(db, 'wallets', formData.revenueWalletId), {
              balance: increment(parseFloat(formData.revenue) || 0)
            });
          } catch (revenueLedgErr) {
            console.error("Error creating manual revenue ledger entry:", revenueLedgErr);
          }
        }

        // Cost ledger & wallet balance decrement if isCostPaid & costWalletId selected
        if (formData.isCostPaid && formData.costWalletId) {
          try {
            await addDoc(collection(db, 'ledger'), {
              amount: -(parseFloat(formData.cost) || 0),
              category: 'Costo de Servicio Digital',
              description: `Pago de costo por ${formData.name} a proveedor`,
              date: new Date().toISOString().split('T')[0],
              walletId: formData.costWalletId,
              isExpense: true,
              ownerId: user.uid,
              createdAt: new Date().toISOString()
            });
            const { doc, updateDoc, increment } = await import('firebase/firestore');
            await updateDoc(doc(db, 'wallets', formData.costWalletId), {
              balance: increment(-(parseFloat(formData.cost) || 0))
            });
          } catch (costLedgErr) {
            console.error("Error creating manual cost ledger entry:", costLedgErr);
          }
        }
        
        // Show success modal for new sales
        const createdService: any = {
          id: docRef.id,
          ...serviceData,
          createdAt: new Date().toISOString()
        };
        const phone = serviceData.clientContact || '';
        const text = `Hola *${serviceData.clientName || 'Cliente'}*, te saludamos de *${settings?.companyName || 'Control Financiero'}*.\n\nConfirmamos la activación de tu servicio de *${serviceData.name}*.\n👤 Usuario: ${serviceData.email || 'N/A'}\n🔑 Clave: ${serviceData.password || 'N/A'}\n🔒 PIN/Mesa: ${serviceData.pin || 'N/A'}\n\nFecha de vencimiento: *${serviceData.expirationDate}*.\n\n¡Gracias por tu compra! 🎉`;
        setSuccessMsg({ show: true, phone, text, service: createdService });
      }
      
      // Reset UI state immediately
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      alert("Error al guardar los datos en Firebase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      category: 'Streaming',
      revenue: '0',
      cost: '0',
      supplierId: '',
      clientName: '',
      clientContact: '',
      clientType: 'client',
      expirationDate: '',
      email: '',
      password: '',
      pin: '',
      serviceType: 'completa',
      profileName: '',
      status: 'active',
      isPaid: true,
      isCostPaid: true,
      revenueWalletId: '',
      costWalletId: ''
    });
  };

  const handleEdit = (service: DigitalServiceItem) => {
    setFormData({
      id: service.id,
      name: service.name,
      category: service.category,
      revenue: (service.revenue || 0).toString(),
      cost: (service.cost || 0).toString(),
      supplierId: service.supplierId || '',
      clientName: service.clientName || '',
      clientContact: service.clientContact || '',
      clientType: (service as any).clientType || 'client',
      expirationDate: service.expirationDate || '',
      email: service.email || '',
      password: service.password || '',
      pin: service.pin || '',
      serviceType: (service as any).serviceType || 'completa',
      profileName: (service as any).profileName || '',
      status: service.status || 'active',
      isPaid: service.isPaid !== false, // default true if not false
      isCostPaid: service.isCostPaid !== false,
      revenueWalletId: service.revenueWalletId || '',
      costWalletId: service.costWalletId || ''
    });
    setIsModalOpen(true);
  };

  const logServiceHistory = async (serviceId: string, action: string, details: any) => {
    try {
      await addDoc(collection(db, 'digital_services', serviceId, 'service_history'), {
        action,
        details,
        userId: user?.uid,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error logging service history:", e);
    }
  };

  const handleToggleStatus = async (service: DigitalServiceItem) => {
    try {
      const nextStatus = service.status === 'active' ? 'expired' : 'active';
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'digital_services', service.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      await logServiceHistory(service.id, 'status_changed', { oldStatus: service.status, newStatus: nextStatus });
    } catch (e) {
      console.error("Error toggling status:", e);
    }
  };

  const processPayment = async () => {
    if (!paymentService || !targetWalletId) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Por favor, ingresa un monto válido mayor a 0.");
      return;
    }
    const currentPending = paymentType === 'revenue' 
      ? (paymentService.revenue - (paymentService.amountPaid || 0))
      : ((paymentService.cost || 0) - (paymentService.costPaid || 0));

    if (amount > currentPending + 0.005) {
      alert(`El monto ingresado ($${amount}) supera el saldo pendiente de $${currentPending}`);
      return;
    }

    setIsProcessingPayment(true);
    try {
      const { updateDoc, doc, addDoc, collection, increment } = await import('firebase/firestore');
      
      if (paymentType === 'revenue') {
        const newAmountPaid = (paymentService.amountPaid || 0) + amount;
        const fullyPaid = newAmountPaid >= paymentService.revenue - 0.005;
        
        await updateDoc(doc(db, 'digital_services', paymentService.id), { 
          amountPaid: newAmountPaid,
          isPaid: fullyPaid, 
          revenueWalletId: targetWalletId, 
          updatedAt: new Date().toISOString() 
        });
        await logServiceHistory(paymentService.id, 'payment_processed', { amount, targetWalletId });
        
        await addDoc(collection(db, 'ledger'), {
          amount: amount,
          category: 'Venta de Servicio Digital',
          description: `Cobro parcial de ${formatCurrency(amount)} por ${paymentService.name} a ${paymentService.clientName || 'Cliente'}`,
          date: new Date().toISOString().split('T')[0],
          walletId: targetWalletId,
          isExpense: false,
          ownerId: user!.uid,
          createdAt: new Date().toISOString()
        });

        await updateDoc(doc(db, 'wallets', targetWalletId), {
          balance: increment(amount)
        });
        
        await sendLocalPushNotification('Pago Registrado ✅', `Se registró un abono de ${formatCurrency(amount)} para ${paymentService.name}.`);
      } else {
        const newCostPaid = (paymentService.costPaid || 0) + amount;
        const fullyPaid = newCostPaid >= (paymentService.cost || 0) - 0.005;

        await updateDoc(doc(db, 'digital_services', paymentService.id), { 
          costPaid: newCostPaid,
          isCostPaid: fullyPaid, 
          costWalletId: targetWalletId, 
          updatedAt: new Date().toISOString() 
        });
        await logServiceHistory(paymentService.id, 'cost_payment_processed', { amount, targetWalletId });
        
        await addDoc(collection(db, 'ledger'), {
          amount: -amount,
          category: 'Costo de Servicio Digital',
          description: `Pago parcial de costo por ${formatCurrency(amount)}: de ${paymentService.name} a proveedor`,
          date: new Date().toISOString().split('T')[0],
          walletId: targetWalletId,
          isExpense: true,
          ownerId: user!.uid,
          createdAt: new Date().toISOString()
        });

        await updateDoc(doc(db, 'wallets', targetWalletId), {
          balance: increment(-amount)
        });
        
        await sendLocalPushNotification('Costo Pagado ✅', `Se registró el pago parcial de costo ${formatCurrency(amount)} de ${paymentService.name} al proveedor.`);
      }
      
      setPaymentService(null);
      setTargetWalletId('');
      setPaymentAmount('');
    } catch (e) {
      console.error("Error validando pago", e);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRenewService = async (service: DigitalServiceItem) => {
    try {
      // Renovar extiende 30 dias de vencimiento y pone activo
      let newDateStr = '';
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + 30);
      
      if (service.expirationDate) {
        const curr = new Date(service.expirationDate);
        // Si ya expiro o la fecha es invalida, tomamos hoy, sino sumamos 30 al vencimiento actual
        const start = isNaN(curr.getTime()) || curr < new Date() ? new Date() : curr;
        start.setDate(start.getDate() + 30);
        newDateStr = start.toISOString().split('T')[0];
      } else {
        newDateStr = fallbackDate.toISOString().split('T')[0];
      }

      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'digital_services', service.id), {
        status: 'active',
        expirationDate: newDateStr,
        updatedAt: new Date().toISOString()
      });
      await logServiceHistory(service.id, 'renewed', { oldExpiration: service.expirationDate, newExpiration: newDateStr });
    } catch (e) {
      console.error("Error renewing service:", e);
    }
  };

  const handleSupplierChange = (supId: string) => {
    const matchedCatalogItem = catalogItems.find(c => c.name === formData.name);
    let autoCost = formData.cost;
    let autoRevenue = formData.revenue;
    
    if (matchedCatalogItem) {
      const matchProv = matchedCatalogItem.providers.find(p => p.supplierId === supId);
      if (matchProv) {
         autoCost = matchProv.cost.toString();
         if (formData.clientType === 'reseller' && (matchProv as any).pvpReseller) {
           autoRevenue = (matchProv as any).pvpReseller.toString();
         } else if (matchProv.pvp) {
           autoRevenue = matchProv.pvp.toString();
         }
      }
    } else {
      const sup = suppliers.find(s => s.id === supId);
      if (sup) autoCost = sup.rate?.toString() || '0';
    }

    setFormData(prev => ({
      ...prev,
      supplierId: supId,
      cost: autoCost,
      revenue: autoRevenue
    }));
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerConfirm(
      "¿Eliminar venta de servicio?",
      "¿Está seguro de que desea eliminar permanentemente este registro de venta digital? Esta acción no se puede deshacer.",
      async () => {
        await deleteDoc(doc(db, 'digital_services', id));
      }
    );
  };

  const categories = ['Streaming', 'Música', 'Gaming', 'Software', 'Otros'];

  // Determinar si una suscripción está por expirar (en los próximos 5 días)
  const isExpiringSoon = (expDate?: string) => {
    if (!expDate) return false;
    const now = new Date();
    const expiry = new Date(expDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 5;
  };

  // Enviar mensaje de recordatorio de cobro/corte por WhatsApp
  const handleWhatsAppAlert = (service: DigitalServiceItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = service.clientContact || '';
    if (!phone) {
      alert(`No se encontró número registrado para "${service.clientName || 'el cliente'}". Por favor edite el servicio y guarde su número.`);
      return;
    }
    const msg = `Hola *${service.clientName || 'Cliente'}*, te saludamos de *${settings?.companyName || 'Control Financiero'}*.\n\nTe recordamos amablemente que tu servicio de *${service.name}* está por vencer o venció el *${service.expirationDate}*.\n\nEl valor de renovación es de *${formatCurrency(service.revenue)}*.\n\nPor favor, confírmanos si deseas renovarlo para coordinar el pago. ¡Muchas gracias!`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // ACCIONES MASIVAS (MEJORA 3)
  const handleBulkRenew = async () => {
    if (selectedItemIds.length === 0) return;
    triggerConfirm(
      "Renovación en lote",
      `¿Está seguro de que desea renovar (extender por 30 días) las ${selectedItemIds.length} suscripciones seleccionadas?`,
      async () => {
        try {
          const batch = writeBatch(db);
          selectedItemIds.forEach(id => {
            const service = services.find(s => s.id === id);
            if (service) {
              let newDateStr = '';
              const fallbackDate = new Date();
              fallbackDate.setDate(fallbackDate.getDate() + 30);
              
              if (service.expirationDate) {
                const curr = new Date(service.expirationDate);
                const start = isNaN(curr.getTime()) || curr < new Date() ? new Date() : curr;
                start.setDate(start.getDate() + 30);
                newDateStr = start.toISOString().split('T')[0];
              } else {
                newDateStr = fallbackDate.toISOString().split('T')[0];
              }
              
              batch.update(doc(db, 'digital_services', id), {
                status: 'active',
                expirationDate: newDateStr,
                updatedAt: new Date().toISOString()
              });
            }
          });
          await batch.commit();
          await sendLocalPushNotification('Renovaciones Listas ✅', `Se han renovado con éxito ${selectedItemIds.length} suscripciones.`);
          setSelectedItemIds([]);
        } catch (err) {
          console.error("Error renovando en lote:", err);
        }
      }
    );
  };

  const handleBulkMarkPaid = async () => {
    if (selectedItemIds.length === 0) return;
    const defaultWallet = wallets[0]?.id || '';
    
    triggerConfirm(
      "Cobrar seleccionadas",
      `¿Desea registrar el recaudo completo de las ${selectedItemIds.length} suscripciones seleccionadas como pagadas?`,
      async () => {
        try {
          const batch = writeBatch(db);
          for (const id of selectedItemIds) {
            const s = services.find(item => item.id === id);
            if (s && !s.isPaid) {
              const pendingAmt = s.revenue - (s.amountPaid || 0);
              
              batch.update(doc(db, 'digital_services', id), {
                isPaid: true,
                amountPaid: s.revenue,
                status: 'active',
                updatedAt: new Date().toISOString()
              });
              
              if (defaultWallet && pendingAmt > 0) {
                await addDoc(collection(db, 'ledger'), {
                  amount: pendingAmt,
                  category: 'Recaudo de Servicio Digital',
                  description: `Pago completo masivo de suscripción para ${s.clientName || 'Cliente'}: ${s.name}`,
                  date: new Date().toISOString().split('T')[0],
                  walletId: defaultWallet,
                  ownerId: user!.uid,
                  createdAt: new Date().toISOString()
                });
                
                await updateDoc(doc(db, 'wallets', defaultWallet), {
                  balance: increment(pendingAmt)
                });
              }
            }
          }
          await batch.commit();
          await sendLocalPushNotification('Cobros Registrados ✅', `Se marcaron como pagas ${selectedItemIds.length} suscripciones.`);
          setSelectedItemIds([]);
        } catch (err) {
          console.error("Error en cobro masivo:", err);
        }
      }
    );
  };

  const handleBulkDelete = async () => {
    if (selectedItemIds.length === 0) return;
    triggerConfirm(
      "¿Eliminar selección masiva?",
      `¿Está absolutamente seguro de que desea eliminar permanentemente las ${selectedItemIds.length} suscripciones seleccionadas? Esta acción es irreversible.`,
      async () => {
        try {
          const batch = writeBatch(db);
          selectedItemIds.forEach(id => {
            batch.delete(doc(db, 'digital_services', id));
          });
          await batch.commit();
          await sendLocalPushNotification('Borrado Exitoso 🗑️', 'Suscripciones eliminadas permanentemente.');
          setSelectedItemIds([]);
        } catch (err) {
          console.error("Error borrando en lote:", err);
        }
      }
    );
  };

  const handleBulkWhatsAppAlert = () => {
    if (selectedItemIds.length === 0) return;
    const groupedByClient: { [key: string]: { clientName: string; clientContact: string; services: any[] } } = {};
    
    selectedItemIds.forEach(id => {
      const s = services.find(item => item.id === id);
      if (s) {
        const key = s.clientContact || s.clientName || 'Cliente Temporal';
        if (!groupedByClient[key]) {
          groupedByClient[key] = {
            clientName: s.clientName || 'Cliente',
            clientContact: s.clientContact || '',
            services: []
          };
        }
        groupedByClient[key].services.push(s);
      }
    });

    const clientsWithPhones = Object.values(groupedByClient).filter(c => c.clientContact);
    
    if (clientsWithPhones.length === 0) {
      alert("No se encontraron números de teléfono registrados para las suscripciones seleccionadas.");
      return;
    }

    const client = clientsWithPhones[0];
    let msg = `Hola *${client.clientName}*, te saludamos de *${settings?.companyName || 'Control Financiero'}*.\n\nTe recordamos amablemente el estado de tus suscripciones digitales:\n`;
    let totalDue = 0;
    
    client.services.forEach(s => {
      const pending = s.revenue - (s.amountPaid || 0);
      msg += `\n• *${s.name}* \n  📅 Vence: *${s.expirationDate || 'N/A'}*\n  💵 Saldo: *${formatCurrency(pending)}* (${s.isPaid ? 'Pagado' : 'Pendiente'})\n`;
      totalDue += pending;
    });

    if (totalDue > 0) {
      msg += `\n*Suma Total Pendiente:* *${formatCurrency(totalDue)}*\n`;
    }
    msg += `\nPor favor, confírmanos si deseas renovar o realizar el pago correspondiente. ¡Muchas gracias!`;
    
    const phone = client.clientContact;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Filter digital services lists dynamically (Mejora: Status/Expiration tab categorization and Search combined)
  const filteredServices = services.filter(service => {
    // 1. Apply status filter
    const expiring = isExpiringSoon(service.expirationDate);
    const expired = service.status === 'expired' || (service.expirationDate && new Date(service.expirationDate) < new Date());
    const isActive = !expired && service.status === 'active';

    if (statusFilter === 'active' && !isActive) return false;
    if (statusFilter === 'expiring' && !expiring) return false;
    if (statusFilter === 'expired' && !expired) return false;

    // 2. Apply search filter
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (service.name?.toLowerCase().includes(term)) ||
           (service.clientName?.toLowerCase().includes(term)) ||
           (service.email?.toLowerCase().includes(term)) ||
           (service.category?.toLowerCase().includes(term)) ||
           (service.supplierName?.toLowerCase().includes(term)) ||
           (service.clientContact?.toLowerCase().includes(term));
  });

  // Calculate dynamic stats for metrics preview (Mejora: Predictabilidad de Rentabilidad)
  const activeServices = services.filter(s => {
    const expired = s.status === 'expired' || (s.expirationDate && new Date(s.expirationDate) < new Date());
    return !expired && s.status === 'active';
  });
  const activeRevenueMonth = activeServices.reduce((sum, s) => sum + (s.revenue || 0), 0);
  const activeCostMonth = activeServices.reduce((sum, s) => sum + (s.cost || 0), 0);
  const activeProfitMonth = activeRevenueMonth - activeCostMonth;
  const marginPercentDisplay = activeRevenueMonth > 0 ? Math.round((activeProfitMonth / activeRevenueMonth) * 100) : 0;

  // Calculate counts dynamically for tab pills
  const totalCounts = services.length;
  const activeCounts = services.filter(s => {
    const expired = s.status === 'expired' || (s.expirationDate && new Date(s.expirationDate) < new Date());
    return !expired && s.status === 'active';
  }).length;
  const expiringCounts = services.filter(s => isExpiringSoon(s.expirationDate)).length;
  const expiredCounts = services.filter(s => s.status === 'expired' || (s.expirationDate && new Date(s.expirationDate) < new Date())).length;

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto p-4 lg:p-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="space-y-1">
          <h2 className={cn("text-2xl lg:text-3xl font-bold tracking-tight uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
            Suscripciones y Servicios
          </h2>
          <p className="text-slate-500 font-medium">Control de clientes, vencimientos y credenciales de cuentas digitales.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowCatalog(true)}
            className={cn("flex-1 sm:flex-none border px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors cursor-pointer", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800/30" : "border-slate-200 text-slate-700 bg-white shadow-sm")}
          >
            Ver Catálogo
          </button>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none bg-indigo-600 text-white px-6 py-2.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-500/10 active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Vender Cuenta
          </button>
        </div>
      </div>

      {/* Metrics Row (Mejora: Predictive Profitability Analytics Row) */}
      {!loading && services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className={cn("p-4 rounded-3xl border flex flex-col justify-between shadow-sm", isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-200")}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Facturación Activa (MRR)</span>
              <div className="w-7 h-7 bg-indigo-500/10 text-indigo-500 flex items-center justify-center rounded-xl">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className={cn("text-lg lg:text-xl font-bold font-mono tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                {formatCurrency(activeRevenueMonth)}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">Ingreso total estimado por cuentas activas</p>
            </div>
          </div>

          <div className={cn("p-4 rounded-3xl border flex flex-col justify-between shadow-sm", isDark ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-200")}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Coste de Proveedores</span>
              <div className="w-7 h-7 bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-xl">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className={cn("text-lg lg:text-xl font-bold font-mono tracking-tight", isDark ? "text-rose-400" : "text-rose-600")}>
                {formatCurrency(activeCostMonth)}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">Costo invertido en las suscripciones activas</p>
            </div>
          </div>

          <div className={cn("p-4 rounded-3xl border flex flex-col justify-between shadow-sm ring-2 ring-indigo-500/10", isDark ? "bg-indigo-950/20 border-indigo-500/20" : "bg-indigo-50/50 border-indigo-150")}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 font-extrabold">Ganancia Estimada</span>
              <div className="w-7 h-7 bg-indigo-500 text-white flex items-center justify-center rounded-xl shadow-md">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className={cn("text-lg lg:text-xl font-bold font-mono tracking-tight text-indigo-600 dark:text-indigo-400")}>
                  {formatCurrency(activeProfitMonth)}
                </p>
                <p className="text-[9px] text-indigo-500/80 mt-0.5 font-black uppercase tracking-wider">Ganancia libre recurrente mensual</p>
              </div>
              <div className="bg-indigo-550 text-white font-extrabold uppercase tracking-widest text-[8px] px-2 py-1 rounded-lg shadow-sm">
                +{marginPercentDisplay}% Margen
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Centered Search & Expiration Tabs Controller */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center w-full">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <Search className="w-5 h-5 text-indigo-500" />
          </span>
          <input
            type="text"
            placeholder="🔍 Buscar por convenio, perfil de cliente, correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "w-full pl-11 pr-4 py-3 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold shadow-inner",
              isDark 
                ? "border-slate-850 bg-slate-900/45 text-white placeholder-slate-500 focus:bg-slate-900" 
                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:bg-slate-50"
            )}
          />
        </div>

        {/* Dynamic Categorization Filter Tabs */}
        {!loading && (
          <div className={cn("flex items-center gap-1.5 p-1 rounded-2xl border w-full md:w-auto overflow-x-auto", isDark ? "bg-slate-900/60 border-slate-850" : "bg-slate-100/70 border-slate-205")}>
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                statusFilter === 'all'
                  ? (isDark ? "bg-slate-800 text-white shadow-md font-extrabold" : "bg-white text-slate-900 shadow-sm border border-black/5")
                  : "text-slate-500 hover:text-slate-705"
              )}
            >
              Todos
              <span className={cn("px-1.5 py-0.5 rounded-md font-mono text-[8px] font-bold", statusFilter === 'all' ? "bg-indigo-500 text-white" : "bg-slate-200/50 text-slate-500 dark:bg-slate-800")}>
                {totalCounts}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('active')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                statusFilter === 'active'
                  ? (isDark ? "bg-slate-800 text-emerald-400 shadow-md font-extrabold" : "bg-white text-emerald-600 shadow-sm border border-emerald-500/10")
                  : "text-slate-500 hover:text-slate-705"
              )}
            >
              Activos
              <span className={cn("px-1.5 py-0.5 rounded-md font-mono text-[8px] font-bold", statusFilter === 'active' ? "bg-emerald-500 text-white" : "bg-slate-200/50 text-slate-505 dark:bg-slate-800")}>
                {activeCounts}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('expiring')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                statusFilter === 'expiring'
                  ? (isDark ? "bg-slate-800 text-amber-400 shadow-md font-extrabold" : "bg-white text-amber-600 shadow-sm border border-amber-500/10")
                  : "text-slate-500 hover:text-slate-705"
              )}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              Vencen Pronto
              <span className={cn("px-1.5 py-0.5 rounded-md font-mono text-[8px] font-bold", statusFilter === 'expiring' ? "bg-amber-500 text-white" : "bg-slate-200/50 text-slate-505 dark:bg-slate-800")}>
                {expiringCounts}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('expired')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                statusFilter === 'expired'
                  ? (isDark ? "bg-slate-800 text-rose-400 shadow-md font-extrabold" : "bg-white text-rose-600 shadow-sm border border-rose-500/10")
                  : "text-slate-500 hover:text-slate-705"
              )}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              Vencidos
              <span className={cn("px-1.5 py-0.5 rounded-md font-mono text-[8px] font-bold", statusFilter === 'expired' ? "bg-rose-500 text-white" : "bg-slate-200/50 text-slate-505 dark:bg-slate-800")}>
                {expiredCounts}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Selection Control Panel (Mejora 3) */}
      {!loading && filteredServices.length > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-2 py-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (selectedItemIds.length === filteredServices.length) {
                  setSelectedItemIds([]);
                } else {
                  setSelectedItemIds(filteredServices.map(s => s.id));
                }
              }}
              className={cn("px-3 py-1.5 rounded-xl border font-bold uppercase tracking-wider transition-all cursor-pointer text-[9px] select-none", 
                isDark ? "border-slate-800 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50")}
            >
              {selectedItemIds.length === filteredServices.length ? 'Desmarcar Todos' : 'Seleccionar Todos'}
            </button>
            {selectedItemIds.length > 0 && (
              <span className="text-indigo-500 font-extrabold uppercase tracking-widest text-[9px]">
                {selectedItemIds.length} Seleccionados
              </span>
            )}
          </div>

          {/* Grid columns selector for accessibility / visually impaired users */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className={cn("text-[9px] font-black uppercase tracking-widest hidden sm:inline-block", isDark ? "text-slate-400" : "text-slate-500")}>
              👁️ Ver por Fila:
            </span>
            <div className={cn("flex items-center gap-1 p-1 rounded-xl border w-full md:w-auto overflow-x-auto", isDark ? "bg-slate-900/80 border-slate-850" : "bg-slate-50 border-slate-200")}>
              {[1, 2, 3, 4].map((cols) => (
                <button
                  key={cols}
                  type="button"
                  onClick={() => setGridCols(cols as any)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-none",
                    gridCols === cols
                      ? (isDark ? "bg-indigo-650 text-white shadow font-black" : "bg-white text-indigo-600 shadow-sm border border-black/5 font-black")
                      : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                  )}
                  title={cols === 1 ? "1 Tarjeta Grande (ideal para problemas de vista)" : `${cols} Tarjetas`}
                >
                  {cols === 1 ? '1 Fila (Grande ♿)' : `${cols} Cols`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="font-bold uppercase tracking-widest text-[10px]">Sincronizando Servicios...</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-4 lg:gap-6",
          gridCols === 1 && "grid-cols-1 max-w-2xl mx-auto",
          gridCols === 2 && "grid-cols-1 md:grid-cols-2",
          gridCols === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          gridCols === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        )}>
          <AnimatePresence mode="popLayout">
            {filteredServices.map((service) => {
                const expiring = isExpiringSoon(service.expirationDate);
                const expired = service.status === 'expired' || (service.expirationDate && new Date(service.expirationDate) < new Date());
                
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={service.id}
                    className={cn(
                      "border transition-all flex flex-col justify-between group relative overflow-hidden",
                      gridCols === 1 ? "p-7 pt-10 rounded-[2rem]" : gridCols === 2 ? "p-6 pt-9 rounded-3xl" : "p-5 pt-8 rounded-3xl",
                      expired 
                        ? (isDark ? "bg-rose-950/10 border-rose-900/40" : "bg-rose-50/30 border-rose-100") 
                        : expiring 
                          ? (isDark ? "bg-amber-950/10 border-amber-900/40" : "bg-amber-50/30 border-amber-100")
                          : (isDark ? "bg-slate-900 border-slate-800 hover:border-indigo-900/50" : "bg-white border-slate-100 shadow-sm hover:shadow-md")
                    )}
                  >
                    {/* Checkbox for Bulk operations (Mejora 3) */}
                    <div className={cn("absolute z-10 flex items-center justify-center", gridCols === 1 ? "top-4.5 left-4.5" : "top-3 left-3")}>
                      <input 
                        type="checkbox"
                        checked={selectedItemIds.includes(service.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (selectedItemIds.includes(service.id)) {
                            setSelectedItemIds(prev => prev.filter(id => id !== service.id));
                          } else {
                            setSelectedItemIds(prev => [...prev, service.id]);
                          }
                        }}
                        className={cn("cursor-pointer accent-indigo-600 transition-transform hover:scale-110",
                          gridCols === 1 ? "w-6 h-6 rounded-xl border-indigo-400" : gridCols === 2 ? "w-5 h-5 rounded-lg border-indigo-400" : "w-4 h-4 rounded-lg border border-indigo-400"
                        )}
                      />
                    </div>

                    {/* Status badge - Absolutely positioned at top-right for premium alignment */}
                    <span className={cn(
                      "font-black uppercase tracking-widest absolute z-10 rounded-full",
                      gridCols === 1 ? "text-xs px-3.5 py-1.5 top-4.5 right-4.5" : gridCols === 2 ? "text-[10px] px-2.5 py-1 top-3.5 right-3.5" : "text-[8px] px-2 py-0.5 top-3 right-3",
                      expired ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                      expiring ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                      "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    )}>
                      {expired ? 'Cortar / Vencido' : expiring ? 'Próximo Cortar' : 'Activo'}
                    </span>

                    <div>
                      {/* Header card info */}
                      <div className={cn("flex items-center mb-4", gridCols === 1 ? "gap-4 mb-6" : gridCols === 2 ? "gap-3 mb-5" : "gap-2.5 mb-4")}>
                        <div className={cn("rounded-2xl flex items-center justify-center shrink-0 transition-all", 
                          gridCols === 1 ? "w-14 h-14 rounded-3xl" : gridCols === 2 ? "w-12 h-12 rounded-2xl" : "w-10 h-10 rounded-2xl",
                          expired ? "bg-rose-500/10 text-rose-500" :
                          expiring ? "bg-amber-500/10 text-amber-500" :
                          isDark ? "bg-slate-800 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                        )}>
                          {service.category === 'Streaming' && <Tv className={cn(gridCols === 1 ? "w-7 h-7" : gridCols === 2 ? "w-6 h-6" : "w-5 h-5")} />}
                          {service.category === 'Música' && <Smartphone className={cn(gridCols === 1 ? "w-7 h-7" : gridCols === 2 ? "w-6 h-6" : "w-5 h-5")} />}
                          {service.category === 'Gaming' && <Gamepad2 className={cn(gridCols === 1 ? "w-7 h-7" : gridCols === 2 ? "w-6 h-6" : "w-5 h-5")} />}
                          {['Software', 'Otros'].includes(service.category) && <ShoppingBag className={cn(gridCols === 1 ? "w-7 h-7" : gridCols === 2 ? "w-6 h-6" : "w-5 h-5")} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={cn("font-black uppercase tracking-widest text-slate-500 block",
                            gridCols === 1 ? "text-xs mb-0.5" : gridCols === 2 ? "text-[10px]" : "text-[9px]"
                          )}>{service.category}</span>
                          <h4 className={cn("font-bold tracking-tight truncate", 
                            gridCols === 1 ? "text-xl md:text-2xl font-black" : gridCols === 2 ? "text-base md:text-lg" : "text-sm",
                            isDark ? "text-white" : "text-slate-900"
                          )} title={service.name}>
                            {service.name}
                          </h4>
                        </div>
                      </div>

                    {/* Cliente Info */}
                    {service.clientName && (
                      <div className={cn(
                        "mb-3.5 flex flex-col gap-0.5", 
                        gridCols === 1 ? "p-5 rounded-2xl mb-5 text-sm md:text-base gap-2" : gridCols === 2 ? "p-3.5 rounded-xl mb-4 text-xs md:text-sm gap-1" : "p-2.5 rounded-xl text-xs mb-3 gap-0.5",
                        isDark ? "bg-slate-950/45" : "bg-slate-50"
                      )}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <p className={cn("font-bold truncate flex items-center gap-1.5", 
                            gridCols === 1 ? "text-base md:text-lg font-black" : gridCols === 2 ? "text-sm md:text-base" : "text-xs",
                            isDark ? "text-slate-250" : "text-slate-800"
                          )}>
                            <span>👤</span> <span>{service.clientName}</span>
                          </p>
                          <div className="flex flex-row sm:flex-col gap-1 items-start sm:items-end shrink-0">
                            <button 
                              onClick={(e) => {
                                 e.stopPropagation();
                                 if (!service.isPaid) {
                                   setPaymentType('revenue');
                                   setPaymentService(service);
                                   setPaymentAmount((service.revenue - (service.amountPaid || 0)).toString());
                                 }
                              }}
                              disabled={service.isPaid}
                              className={cn(
                                "font-black uppercase tracking-widest outline-none transition-colors",
                                gridCols === 1 ? "text-xs px-3 py-1.5 rounded-lg" : gridCols === 2 ? "text-[10px] px-2.5 py-1 rounded-md" : "text-[8px] px-2 py-0.5 rounded-full",
                                service.isPaid
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 cursor-pointer"
                              )}>
                              {service.isPaid ? 'Cobrado' : 'Cobrar (CxC)'}
                            </button>
                            <button 
                              onClick={(e) => {
                                 e.stopPropagation();
                                 if (service.isCostPaid === false) {
                                   setPaymentType('cost');
                                   setPaymentService(service);
                                   setPaymentAmount(((service.cost || 0) - (service.costPaid || 0)).toString());
                                 }
                              }}
                              disabled={service.isCostPaid !== false}
                              className={cn(
                                "font-black uppercase tracking-widest outline-none transition-colors",
                                gridCols === 1 ? "text-xs px-3 py-1.5 rounded-lg" : gridCols === 2 ? "text-[10px] px-2.5 py-1 rounded-md" : "text-[8px] px-2 py-0.5 rounded-full",
                                service.isCostPaid !== false
                                  ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer"
                              )}>
                              {service.isCostPaid !== false ? 'Costo Pago' : 'Pagar Costo'}
                            </button>
                          </div>
                        </div>
                        {service.clientContact && (
                          <p className={cn("font-mono text-slate-500 flex items-center gap-1.5", 
                            gridCols === 1 ? "text-sm mt-1" : gridCols === 2 ? "text-xs" : "text-[10px]"
                          )}>
                            <span>📞</span> <span>{service.clientContact}</span>
                          </p>
                        )}
                        {service.expirationDate && (
                          <p className={cn("font-bold flex items-center gap-1.5", 
                            gridCols === 1 ? "text-sm mt-2" : gridCols === 2 ? "text-xs mt-1" : "text-[10px]",
                            expired ? "text-rose-500" : expiring ? "text-amber-500" : "text-slate-500"
                          )}>
                            <span>📅 Expira:</span> <span>{service.expirationDate}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Cuenta credenciales ocultas/visibles */}
                    {(service.email || service.password || service.pin || (service as any).profileName) && (
                      <div className={cn(
                        "border border-dashed border-slate-500/10 font-medium bg-slate-950/10 tracking-wide",
                        gridCols === 1 ? "p-5 rounded-2xl text-base mb-6 space-y-2.5" : gridCols === 2 ? "p-3.5 rounded-xl text-sm mb-4 space-y-2" : "p-2.5 rounded-xl text-[10px] mb-4 space-y-1"
                      )}>
                        <div className="flex justify-between items-center gap-4 border-b border-dashed border-slate-500/10 pb-1.5 mb-1.5">
                          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[8px]">Acceso:</span>
                          <span className={cn(
                            "font-black uppercase tracking-widest text-[8px] px-1.5 py-0.5 rounded",
                            (service as any).serviceType === 'pantalla' ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          )}>
                            {(service as any).serviceType === 'pantalla' ? '📺 Pantalla' : '👤 Completa'}
                          </span>
                        </div>
                        {service.email && (
                          <div className="flex justify-between items-center gap-4 truncate">
                            <span className="text-slate-400 font-semibold font-mono uppercase text-[9px]">User:</span>
                            <span className={cn("font-bold select-all truncate", isDark ? "text-indigo-200" : "text-slate-700")}>{service.email}</span>
                          </div>
                        )}
                        {service.password && (
                          <div className="flex justify-between items-center gap-4 truncate">
                            <span className="text-slate-400 font-semibold font-mono uppercase text-[9px]">Clave:</span>
                            <span className={cn("font-black select-all font-mono tracking-wider", isDark ? "text-indigo-300" : "text-slate-800")}>{service.password}</span>
                          </div>
                        )}
                        {(service as any).profileName && (
                          <div className="flex justify-between items-center gap-4 truncate">
                            <span className="text-slate-400 font-semibold font-mono uppercase text-[9px]">Perfil:</span>
                            <span className="font-bold text-indigo-400">{(service as any).profileName}</span>
                          </div>
                        )}
                        {service.pin && (
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-slate-400 font-semibold font-mono uppercase text-[9px]">PIN / Acceso:</span>
                            <span className={cn("font-bold bg-indigo-500/10 text-indigo-500 rounded font-mono",
                              gridCols === 1 ? "px-2.5 py-0.5 text-base" : gridCols === 2 ? "px-1.5 py-0.3 text-sm" : "px-1 py-0.2"
                            )}>{service.pin}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Profit margins */}
                  <div>
                    <div className={cn(
                      "flex items-center justify-between border-t border-slate-800/10",
                      gridCols === 1 ? "py-4 mb-5" : gridCols === 2 ? "py-3 mb-4" : "py-2 mb-4"
                    )}>
                      <div>
                        <p className={cn("font-bold text-slate-500 uppercase tracking-widest",
                          gridCols === 1 ? "text-xs" : gridCols === 2 ? "text-[10px]" : "text-[9px]"
                        )}>Costo</p>
                        <p className={cn("font-black font-mono text-rose-500",
                          gridCols === 1 ? "text-base md:text-lg" : gridCols === 2 ? "text-sm" : "text-xs"
                        )}>{formatCurrency(service.cost || 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className={cn("font-bold text-slate-500 uppercase tracking-widest",
                          gridCols === 1 ? "text-xs" : gridCols === 2 ? "text-[10px]" : "text-[9px]"
                        )}>PVP</p>
                        <p className={cn("font-black font-mono text-emerald-500",
                          gridCols === 1 ? "text-base md:text-lg" : gridCols === 2 ? "text-sm" : "text-xs"
                        )}>{formatCurrency(service.revenue)}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-bold text-slate-500 uppercase tracking-widest",
                          gridCols === 1 ? "text-xs" : gridCols === 2 ? "text-[10px]" : "text-[9px]"
                        )}>Rentabilidad</p>
                        <p className={cn("font-black font-mono text-indigo-500",
                          gridCols === 1 ? "text-base md:text-lg" : gridCols === 2 ? "text-sm" : "text-xs"
                        )}>{formatCurrency(service.revenue - (service.cost || 0))}</p>
                      </div>
                    </div>

                    {/* Quick Core Actions row */}
                    <div className={cn("flex flex-col gap-2 pt-2 border-t border-slate-800/10", gridCols === 1 ? "mt-4 gap-3 pt-4" : "mt-3")}>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleEdit(service)}
                          title="Editar suscripción"
                          className={cn(
                            "flex-1 border hover:bg-slate-50 transition-colors flex justify-center text-slate-500 hover:text-indigo-600 cursor-pointer items-center", 
                            gridCols === 1 ? "p-3.5 rounded-2xl text-xs md:text-sm h-12" : gridCols === 2 ? "p-2.5 rounded-xl text-xs h-10" : "p-2 rounded-xl text-[10px] h-9",
                            isDark ? "border-slate-800 hover:bg-slate-800/40" : "border-slate-200 bg-white shadow-xs"
                          )}
                        >
                          <span className="font-bold uppercase tracking-widest">Editar</span>
                        </button>
                        <button 
                          onClick={() => setRenewalService(service)}
                          title="Extender y procesar renovación con ingresos y costes"
                          className={cn(
                            "flex-1 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center cursor-pointer shadow-sm font-bold uppercase tracking-widest",
                            gridCols === 1 ? "p-3.5 rounded-2xl text-xs sm:text-sm h-12" : gridCols === 2 ? "p-2.5 rounded-xl text-xs h-10" : "p-2 rounded-xl text-[10px] h-9"
                          )}
                        >
                          Renovar
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {service.clientContact && (
                          <button 
                            onClick={(e) => handleWhatsAppAlert(service, e)}
                            title="Enviar cobro por WhatsApp"
                            className={cn(
                              "bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors flex items-center justify-center cursor-pointer shadow-sm shrink-0",
                              gridCols === 1 ? "w-12 h-12" : gridCols === 2 ? "w-10 h-10" : "w-9 h-9"
                            )}
                          >
                            <MessageCircle className={cn(gridCols === 1 ? "w-5.5 h-5.5" : "w-4.5 h-4.5")} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenVoucher(service)}
                          title="Emitir Comprobante"
                          className={cn(
                            "border border-indigo-200 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center cursor-pointer shrink-0",
                            gridCols === 1 ? "w-12 h-12 rounded-2xl" : gridCols === 2 ? "w-10 h-10 rounded-xl" : "w-9 h-9 rounded-xl"
                          )}
                        >
                          <Receipt className={cn(gridCols === 1 ? "w-5.5 h-5.5" : "w-4.5 h-4.5")} />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(service.id, e)}
                          title="Eliminar suscripción"
                          className={cn(
                            "flex-1 border border-rose-200 text-rose-500 hover:bg-rose-500 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 font-black uppercase tracking-widest",
                            gridCols === 1 ? "p-3 rounded-2xl text-xs h-12" : gridCols === 2 ? "p-2.5 rounded-xl text-[10px] h-10" : "p-1.5 rounded-xl text-[10px] h-9"
                          )}
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      {!loading && services.length === 0 && (
        <div className={cn("p-8 lg:p-12 border border-dashed rounded-3xl flex flex-col items-center justify-center text-center gap-4", isDark ? "border-slate-800" : "border-slate-200")}>
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-slate-300" />
          </div>
          <div className="space-y-1">
            <h3 className={cn("text-lg font-bold", isDark ? "text-slate-400" : "text-slate-700")}>Venda su primer servicio</h3>
            <p className="text-slate-500 text-sm max-w-xs">Introduzca ventas de streaming para Galo Peralta, Disney Plus que vencen, etc.</p>
          </div>
          <button 
            onClick={() => setShowCatalog(true)}
            className="text-indigo-500 font-bold uppercase text-[10px] tracking-widest hover:underline cursor-pointer"
          >
            Ver Biblioteca de Catálogo
          </button>
        </div>
      )}

      {/* Modal Añadir / Editar */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
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
              className={cn("relative w-full max-w-lg p-6 sm:p-8 rounded-3xl border shadow-2xl z-10 max-h-[90vh] overflow-y-auto", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className={cn("text-lg font-bold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  {formData.id ? 'Modificar Suscripción' : 'Registrar Venta / Cuenta'}
                </h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Datos Cuenta/Catalogo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Servicio / Producto</label>
                    <select 
                      required
                      value={formData.name}
                      onChange={(e) => {
                         const pickedName = e.target.value;
                         let updateData: any = { name: pickedName };
                         
                         const cItem = catalogItems.find(c => c.name === pickedName);
                         if (cItem) {
                            updateData.category = cItem.category || 'Streaming';
                            if (cItem.providers && cItem.providers.length === 1) {
                               const p = cItem.providers[0];
                               updateData.supplierId = p.supplierId;
                               updateData.cost = p.cost.toString();
                               if (formData.clientType === 'reseller' && (p as any).pvpReseller) {
                                  updateData.revenue = (p as any).pvpReseller.toString();
                               } else if (p.pvp) {
                                  updateData.revenue = p.pvp.toString();
                                }
                            }
                         }
                         setFormData(prev => ({...prev, ...updateData}));
                      }}
                      className={cn("w-full p-3.5 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                    >
                      <option value="">Seleccionar del Catálogo...</option>
                      {catalogItems.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Categoría</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className={cn("w-full p-3.5 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white")}
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Tipo de Cliente y Selección desde CRM */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-indigo-50/5 p-4 rounded-2xl border border-indigo-500/10 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 px-1 block">Tipo de Cliente</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            const updated = { ...prev, clientType: 'client' as const };
                            if (prev.supplierId && prev.name) {
                              const cItem = catalogItems.find(c => c.name === prev.name);
                              if (cItem) {
                                const matchProv = cItem.providers.find(p => p.supplierId === prev.supplierId);
                                if (matchProv && matchProv.pvp) {
                                  updated.revenue = matchProv.pvp.toString();
                                }
                              }
                            }
                            return updated;
                          });
                        }}
                        className={cn("py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer",
                          formData.clientType === 'client'
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : (isDark ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-250 text-slate-500")
                        )}
                      >
                        Cliente Final
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            const updated = { ...prev, clientType: 'reseller' as const };
                            if (prev.supplierId && prev.name) {
                              const cItem = catalogItems.find(c => c.name === prev.name);
                              if (cItem) {
                                const matchProv = cItem.providers.find(p => p.supplierId === prev.supplierId);
                                if (matchProv && (matchProv as any).pvpReseller) {
                                  updated.revenue = (matchProv as any).pvpReseller.toString();
                                }
                              }
                            }
                            return updated;
                          });
                        }}
                        className={cn("py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer",
                          formData.clientType === 'reseller'
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : (isDark ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-250 text-slate-500")
                        )}
                      >
                        Revendedor
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 px-1 block">Vincular con CRM</label>
                    <select
                      onChange={(e) => {
                        const entityId = e.target.value;
                        if (!entityId) return;
                        const selected = allEntities.find(ent => ent.id === entityId);
                        if (selected) {
                          setFormData(prev => ({
                            ...prev,
                            clientName: selected.name,
                            clientContact: selected.contact || ''
                          }));
                        }
                      }}
                      className={cn("w-full p-3 rounded-xl border text-[11px] font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 focus:bg-white")}
                    >
                      <option value="">-- Seleccionar registrado --</option>
                      {allEntities
                        .filter(e => e.type === formData.clientType)
                        .map(ent => (
                          <option key={ent.id} value={ent.id}>{ent.name} {ent.contact ? `(${ent.contact})` : ''}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                {/* 2. Cliente y Numero de WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Nombre de Cliente</label>
                    <input 
                      required
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                      className={cn("w-full p-3.5 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                      placeholder="Ej. Galo Peralta"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">WhatsApp de Cliente</label>
                    <input 
                      type="text"
                      value={formData.clientContact}
                      onChange={(e) => setFormData({...formData, clientContact: e.target.value})}
                      className={cn("w-full p-3.5 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                      placeholder="Ej. +593987654321"
                    />
                  </div>
                </div>

                {/* 3. Credenciales de la Cuenta */}
                <div className="p-4 bg-indigo-50/5 border border-dashed border-slate-100/10 rounded-2xl space-y-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 block">Credenciales y Acceso (Opcional)</span>
                  
                  {/* Tipo de Acceso a la Cuenta */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 block">Tipo de Acceso de Venta</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, serviceType: 'completa' }))}
                        className={cn("py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          formData.serviceType === 'completa'
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : (isDark ? "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900")
                        )}
                      >
                        👤 Cuenta Completa
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, serviceType: 'pantalla' }))}
                        className={cn("py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          formData.serviceType === 'pantalla'
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : (isDark ? "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900")
                        )}
                      >
                        📺 Pantalla / Dispositivo
                      </button>
                    </div>
                    <p className="text-[9.5px] text-slate-500 italic font-medium">
                      {formData.serviceType === 'completa' 
                        ? '• El cliente compra la cuenta completa (los accesos son personales y únicos).' 
                        : '• El cliente compra un perfil individual. Se requiere especificar Perfil y PIN de Acceso.'
                      }
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase text-slate-400">Usuario / Correo</label>
                      <input 
                        type="text"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className={cn("w-full p-3 rounded-xl border text-xs font-semibold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white")}
                        placeholder="cuenta@correo.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase text-slate-400">Contraseña de acceso</label>
                      <input 
                        type="text"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className={cn("w-full p-3 rounded-xl border text-xs font-semibold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white")}
                        placeholder="Ej. Acceso777"
                      />
                    </div>
                  </div>

                  {formData.serviceType === 'pantalla' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase text-indigo-400">Nombre de Perfil</label>
                        <input 
                          type="text"
                          required={formData.serviceType === 'pantalla'}
                          value={formData.profileName}
                          placeholder="Ej. Perfil Carlos, Camilo 1"
                          onChange={(e) => setFormData({...formData, profileName: e.target.value})}
                          className={cn("w-full p-3 rounded-xl border text-xs font-semibold outline-none border-indigo-500/20", isDark ? "bg-slate-800 text-white" : "bg-indigo-50/20 focus:bg-white")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase text-indigo-400">PIN de Acceso</label>
                        <input 
                          type="text"
                          required={formData.serviceType === 'pantalla'}
                          value={formData.pin}
                          placeholder="Ej. 1290, 0000"
                          onChange={(e) => setFormData({...formData, pin: e.target.value})}
                          className={cn("w-full p-3 rounded-xl border text-xs font-semibold outline-none border-indigo-500/20", isDark ? "bg-slate-800 text-white" : "bg-indigo-50/20 focus:bg-white")}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                      <label className="text-[9px] font-bold uppercase text-slate-400">PIN de Acceso / Identificador (Opcional)</label>
                      <input 
                        type="text"
                        value={formData.pin}
                        placeholder="Ej. General, PIN de pantalla (Opcional)"
                        onChange={(e) => setFormData({...formData, pin: e.target.value})}
                        className={cn("w-full p-3 rounded-xl border text-xs font-semibold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white")}
                      />
                    </div>
                  )}
                </div>

                {/* 4. Fechas y Estado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Fecha de Expiración</label>
                    <input 
                      required
                      type="date"
                      value={formData.expirationDate}
                      onChange={(e) => setFormData({...formData, expirationDate: e.target.value})}
                      className={cn("w-full p-3.5 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Estado Inicial</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className={cn("w-full p-3.5 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white")}
                    >
                      <option value="active">Activo (Habilitado)</option>
                      <option value="expired">Expirado (Cortar)</option>
                      <option value="pending">En espera</option>
                    </select>
                  </div>
                </div>

                {/* 5. Proveedor, costos, PVP */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Proveedor (Opcional)</label>
                  <select 
                    value={formData.supplierId}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    className={cn("w-full p-3.5 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white")}
                  >
                    <option value="">Seleccione un Proveedor...</option>
                    {(() => {
                      const matchedItem = catalogItems.find(c => c.name === formData.name);
                      if (matchedItem && matchedItem.providers.length > 0) {
                        return matchedItem.providers.map(p => {
                          const sup = suppliers.find(s => s.id === p.supplierId);
                          return <option key={p.supplierId} value={p.supplierId}>{sup?.name || p.supplierId} (Costo Catálogo: ${p.cost})</option>;
                        });
                      }
                      return suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (${s.rate || 0})</option>);
                    })()}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Costo de Inversión ($)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({...formData, cost: e.target.value})}
                      className={cn("w-full p-3.5 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Precio Venta (PVP) ($)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={formData.revenue}
                      onChange={(e) => setFormData({...formData, revenue: e.target.value})}
                      className={cn("w-full p-3.5 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                    />
                  </div>
                </div>

                <div className={cn("p-4 border border-dashed rounded-2xl space-y-4", isDark ? "border-slate-800 bg-slate-950/20" : "border-slate-200 bg-slate-50/50")}>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 block">Flujo de Cobro (Cobranza Cliente)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, isPaid: true }))}
                        className={cn("py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer",
                          formData.isPaid
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                            : (isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500")
                        )}
                      >
                        Cobrado
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, isPaid: false, revenueWalletId: '' }))}
                        className={cn("py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer",
                          !formData.isPaid
                            ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                            : (isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500")
                        )}
                      >
                        Pendiente (CxC)
                      </button>
                    </div>

                    {formData.isPaid && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Billetera de Destino (Ingreso)</label>
                        <select 
                          required={formData.isPaid}
                          value={formData.revenueWalletId}
                          onChange={(e) => setFormData(prev => ({ ...prev, revenueWalletId: e.target.value }))}
                          className={cn("w-full p-3 rounded-xl border text-xs font-semibold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200")}
                        >
                          <option value="">Seleccione Billetera...</option>
                          {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-dashed border-slate-200/50 dark:border-slate-800">
                    <label className="text-[10px] font-black uppercase tracking-widest text-rose-500 block">Flujo de Inversión (Pago Proveedor)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, isCostPaid: true }))}
                        className={cn("py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer",
                          formData.isCostPaid
                            ? "bg-indigo-600 text-white border-indigo-650 shadow-sm"
                            : (isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500")
                        )}
                      >
                        Pagado
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, isCostPaid: false, costWalletId: '' }))}
                        className={cn("py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer",
                          !formData.isCostPaid
                            ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                            : (isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500")
                        )}
                      >
                        Pendiente (CxP)
                      </button>
                    </div>

                    {formData.isCostPaid && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase text-slate-400">Billetera de Origen (Egreso)</label>
                        <select 
                          required={formData.isCostPaid}
                          value={formData.costWalletId}
                          onChange={(e) => setFormData(prev => ({ ...prev, costWalletId: e.target.value }))}
                          className={cn("w-full p-3 rounded-xl border text-xs font-semibold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200")}
                        >
                          <option value="">Seleccione Billetera...</option>
                          {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {formData.id ? 'Guardar Cambios' : 'Guardar Compra/Venta'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Catálogo */}
      <AnimatePresence>
        {showCatalog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCatalog(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn("relative w-full max-w-2xl p-8 rounded-3xl border shadow-2xl z-10", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className={cn("text-2xl font-bold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>Catálogo Global</h3>
                  <p className="text-slate-500 text-sm">Seleccione servicios predefinidos para su inventario.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowNewCatalogForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase">
                    + Nuevo
                  </button>
                  <button onClick={() => setShowCatalog(false)} className="p-2 bg-slate-100/10 rounded-full text-slate-500 cursor-pointer hover:bg-slate-200/20 transition-colors">
                    <X />
                  </button>
                </div>
              </div>

              {showNewCatalogForm && (
                <div className={cn("p-4 mb-4 rounded-xl border flex items-center gap-3", isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100")}>
                  <input 
                    type="text"
                    autoFocus
                    placeholder="Nombre del nuevo producto/servicio"
                    value={newCatalogName}
                    onChange={(e) => setNewCatalogName(e.target.value)}
                    className={cn("flex-1 p-2 rounded-lg text-sm font-bold border outline-none", isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200")}
                  />
                  <button 
                    onClick={() => {
                      if (newCatalogName.trim()) {
                        addDoc(collection(db, 'digital_catalog'), {
                          name: newCatalogName.trim(), category: 'Streaming', providers: [], ownerId: user.uid, createdAt: new Date().toISOString()
                        });
                        setNewCatalogName('');
                        setShowNewCatalogForm(false);
                      }
                    }} 
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-emerald-700"
                  >
                    Guardar
                  </button>
                  <button onClick={() => setShowNewCatalogForm(false)} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 max-h-[60vh] overflow-y-auto">
                {catalogItems.length > 0 ? catalogItems.map(item => (
                  <div key={item.id} className={cn("p-4 rounded-2xl border transition-all relative flex flex-col group", isDark ? "border-slate-800 bg-slate-800/10" : "border-slate-200 bg-slate-50")}>
                    <div className="flex justify-between items-center mb-2">
                       {editingCatalogId !== item.id ? (
                         <div className="flex items-center gap-1.5 flex-1 mr-4">
                           <button 
                             onClick={() => {
                               setFormData(prev => ({ ...prev, name: item.name, category: item.category }));
                               setShowCatalog(false);
                               setIsModalOpen(true);
                             }}
                             className={cn("text-left font-bold text-sm hover:text-indigo-505 transition-colors", isDark ? "text-slate-200" : "text-slate-800")}
                           >
                             {item.name}
                           </button>
                           <button
                             type="button"
                             onClick={() => {
                               setEditingCatalogId(item.id);
                               setEditingCatalogName(item.name);
                             }}
                             className="text-slate-400 hover:text-indigo-600 p-1 text-xs"
                             title="Editar Nombre"
                           >
                             ✏️
                           </button>
                         </div>
                       ) : (
                         <div className="flex items-center gap-1.5 flex-1 mr-4">
                           <input
                             type="text"
                             value={editingCatalogName}
                             onChange={(e) => setEditingCatalogName(e.target.value)}
                             className={cn("flex-1 p-1 px-2 rounded border text-xs font-bold outline-none", isDark ? "bg-slate-900 border-slate-705 text-white" : "bg-white border-slate-250 text-slate-800")}
                           />
                           <button
                             onClick={async () => {
                               if (editingCatalogName.trim()) {
                                 await updateDoc(doc(db, 'digital_catalog', item.id), { name: editingCatalogName.trim() });
                                 setEditingCatalogId(null);
                               }
                             }}
                             className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded text-xs px-2 font-bold"
                           >
                             ✓
                           </button>
                           <button
                             onClick={() => setEditingCatalogId(null)}
                             className="bg-slate-600 hover:bg-slate-755 text-white p-1 rounded text-xs px-2 font-bold"
                           >
                             X
                           </button>
                         </div>
                       )}
                       
                       <button onClick={() => {
                         triggerConfirm(
                           `¿Eliminar de catálogo: ${item.name}?`,
                           "Esto eliminará el servicio y todos sus proveedores asociados del catálogo global de forma permanente.",
                           async () => {
                             await deleteDoc(doc(db, 'digital_catalog', item.id));
                           }
                         );
                       }} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                    <div className="space-y-2 mt-2">
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest flex items-center justify-between">
                        Proveedores y Costos
                      </p>
                      {item.providers.length === 0 ? (
                        <p className="text-[10px] text-slate-500">Sin proveedores</p>
                      ) : (
                         item.providers.map((p, idx) => {
                           const supplierInfo = suppliers.find(s => s.id === p.supplierId);
                           const isEditingProv = editingProviderKey?.catalogId === item.id && editingProviderKey?.supplierId === p.supplierId;
                           return (
                             <div key={idx} className="flex flex-col gap-1.5 bg-black/5 p-2 rounded relative group/prov">
                               {!isEditingProv ? (
                                 <div className="flex justify-between items-center w-full">
                                   <div className="flex flex-col">
                                     <span className="text-[10px] font-bold">{supplierInfo?.name || 'Desconocido'}</span>
                                     <span className="text-[10px] font-mono text-emerald-600">
                                       C:$ {p.cost} | V:$ {p.pvp || 0}{p.pvpReseller ? ` | Rev: $ ${p.pvpReseller}` : ''}
                                     </span>
                                   </div>
                                   <div className="flex gap-1.5 opacity-0 group-hover/prov:opacity-100 transition-opacity">
                                     <button
                                       type="button"
                                       onClick={() => {
                                         setEditingProviderKey({ catalogId: item.id, supplierId: p.supplierId });
                                         setEditingProviderForm({
                                           cost: p.cost.toString(),
                                           pvp: (p.pvp || 0).toString(),
                                           pvpReseller: (p.pvpReseller || 0).toString()
                                         });
                                       }}
                                       className="text-indigo-500 hover:text-indigo-700 p-0.5"
                                       title="Editar Valores"
                                     >
                                       ✏️
                                     </button>
                                     <button
                                       type="button"
                                       onClick={() => {
                                         triggerConfirm(
                                           `¿Quitar proveedor ${supplierInfo?.name || 'Desconocido'}?`,
                                           `¿Está seguro de que desea remover este de los costos del servicio ${item.name}? En caso de reajustar los precios use el icono del lápiz.`,
                                           async () => {
                                             const remainingProvs = item.providers.filter(prov => prov.supplierId !== p.supplierId);
                                             await updateDoc(doc(db, 'digital_catalog', item.id), { providers: remainingProvs });
                                           }
                                         );
                                       }}
                                       className="text-rose-500 hover:text-rose-700 p-0.5"
                                       title="Quitar Proveedor"
                                     >
                                       🗑️
                                     </button>
                                   </div>
                                 </div>
                               ) : (
                                 <div className="space-y-1.5 w-full">
                                   <span className="text-[10px] font-bold text-slate-400">{supplierInfo?.name || 'Desconocido'}</span>
                                   <div className="grid grid-cols-3 gap-1">
                                     <div>
                                       <span className="text-[8px] font-bold block uppercase text-slate-400">Costo</span>
                                       <input
                                         type="number"
                                         value={editingProviderForm.cost}
                                         onChange={e => setEditingProviderForm({...editingProviderForm, cost: e.target.value})}
                                         className="w-full text-[10px] p-1 rounded border outline-none bg-white dark:bg-slate-800"
                                       />
                                     </div>
                                     <div>
                                       <span className="text-[8px] font-bold block uppercase text-slate-400">PVP</span>
                                       <input
                                         type="number"
                                         value={editingProviderForm.pvp}
                                         onChange={e => setEditingProviderForm({...editingProviderForm, pvp: e.target.value})}
                                         className="w-full text-[10px] p-1 rounded border outline-none bg-white dark:bg-slate-800"
                                       />
                                     </div>
                                     <div>
                                       <span className="text-[8px] font-bold block uppercase text-slate-400">Rev.</span>
                                       <input
                                         type="number"
                                         value={editingProviderForm.pvpReseller}
                                         onChange={e => setEditingProviderForm({...editingProviderForm, pvpReseller: e.target.value})}
                                         className="w-full text-[10px] p-1 rounded border outline-none bg-white dark:bg-slate-800"
                                       />
                                     </div>
                                   </div>
                                   <div className="flex gap-2 justify-end mt-1">
                                     <button
                                       type="button"
                                       onClick={async () => {
                                         const pCost = parseFloat(editingProviderForm.cost);
                                         const pPvp = parseFloat(editingProviderForm.pvp || '0');
                                         const pPvpReseller = parseFloat(editingProviderForm.pvpReseller || '0');
                                         if (!isNaN(pCost)) {
                                           const updatedProvs = item.providers.map(prov => {
                                             if (prov.supplierId === p.supplierId) {
                                               return { ...prov, cost: pCost, pvp: pPvp, pvpReseller: pPvpReseller };
                                             }
                                             return prov;
                                           });
                                           await updateDoc(doc(db, 'digital_catalog', item.id), { providers: updatedProvs });
                                           setEditingProviderKey(null);
                                         }
                                       }}
                                       className="bg-indigo-600 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded hover:bg-indigo-700"
                                     >
                                       ✓
                                     </button>
                                     <button
                                       type="button"
                                       onClick={() => setEditingProviderKey(null)}
                                       className="bg-slate-200 dark:bg-slate-700 text-slate-650 dark:text-slate-300 text-[9px] font-bold uppercase px-2 py-0.5 rounded"
                                     >
                                       X
                                     </button>
                                   </div>
                                 </div>
                               )}
                             </div>
                           );
                         })
                      )}
                      
                      {activeSupplierCatalogId !== item.id ? (
                        <button 
                          onClick={() => setActiveSupplierCatalogId(item.id)}
                          className="text-[10px] text-indigo-500 hover:underline font-bold mt-2"
                        >
                          + Añadir Proveedor
                        </button>
                      ) : (
                        <div className="mt-2 space-y-2 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 rounded border border-indigo-100 dark:border-indigo-900/50">
                          <select 
                            value={newSupplierProv.supplierId}
                            onChange={(e) => setNewSupplierProv({...newSupplierProv, supplierId: e.target.value})}
                            className="w-full text-xs p-1.5 rounded border outline-none bg-white dark:bg-slate-800"
                          >
                            <option value="">Proveedor...</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <div className="grid grid-cols-3 gap-1">
                            <input 
                              type="number"
                              placeholder="Costo ($)"
                              value={newSupplierProv.cost}
                              onChange={(e) => setNewSupplierProv({...newSupplierProv, cost: e.target.value})}
                              className="w-full text-[10px] p-1.5 rounded border outline-none bg-white dark:bg-slate-800"
                            />
                            <input 
                              type="number"
                              placeholder="PVP ($)"
                              value={newSupplierProv.pvp}
                              onChange={(e) => setNewSupplierProv({...newSupplierProv, pvp: e.target.value})}
                              className="w-full text-[10px] p-1.5 rounded border outline-none bg-white dark:bg-slate-800"
                            />
                            <input 
                              type="number"
                              placeholder="Revendedor ($)"
                              value={newSupplierProv.pvpReseller || ''}
                              onChange={(e) => setNewSupplierProv({...newSupplierProv, pvpReseller: e.target.value})}
                              className="w-full text-[10px] p-1.5 rounded border outline-none bg-white dark:bg-slate-800"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button 
                               onClick={() => {
                                 if (newSupplierProv.supplierId && newSupplierProv.cost) {
                                    const pCost = parseFloat(newSupplierProv.cost);
                                    const pPvp = parseFloat(newSupplierProv.pvp || '0');
                                    const pPvpReseller = parseFloat(newSupplierProv.pvpReseller || '0');
                                    const dbImport = import('firebase/firestore');
                                    dbImport.then(({ updateDoc, doc }) => {
                                      const updatedProv = [...item.providers, { supplierId: newSupplierProv.supplierId, cost: pCost, pvp: pPvp, pvpReseller: pPvpReseller }];
                                      updateDoc(doc(db, 'digital_catalog', item.id), { providers: updatedProv });
                                    });
                                    setActiveSupplierCatalogId(null);
                                    setNewSupplierProv({supplierId: '', cost: '', pvp: '', pvpReseller: ''});
                                 }
                               }}
                               className="flex-1 bg-indigo-600 text-white text-[10px] font-bold uppercase py-1 rounded"
                            >
                              Guardar
                            </button>
                            <button 
                               onClick={() => setActiveSupplierCatalogId(null)}
                               className="px-2 bg-slate-200 dark:bg-slate-700 text-[10px] font-bold uppercase rounded"
                            >
                              <X className="w-3 h-3"/>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )) : (
                  <p className="text-slate-500 text-sm py-4 col-span-2 text-center">No hay productos en el catálogo.</p>
                )}
              </div>

              <div className={cn("p-4 rounded-2xl flex items-center gap-3", isDark ? "bg-slate-800/50" : "bg-slate-50")}>
                <Search className="w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar en el ecosistema global..." 
                  className="bg-transparent border-none outline-none text-sm font-bold w-full"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setPaymentService(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("relative w-full max-w-sm p-6 rounded-3xl border shadow-2xl z-10", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}>
              <div className="flex justify-between items-center mb-6">
                 <h3 className={cn("text-lg font-bold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                   {paymentType === 'revenue' ? 'Registrar Cobro de Venta' : 'Registrar Pago de Costo'}
                 </h3>
                 <button onClick={() => setPaymentService(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              <div className="space-y-4">
                 <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl">
                   <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1">
                     {paymentType === 'revenue' ? 'Valor Total (PVP)' : 'Costo Total'}
                   </p>
                   <p className="text-2xl font-black font-mono text-indigo-700 dark:text-indigo-400">
                     {formatCurrency(paymentType === 'revenue' ? paymentService.revenue : (paymentService.cost || 0))}
                   </p>
                   {((paymentType === 'revenue' && (paymentService.amountPaid || 0) > 0) || (paymentType === 'cost' && (paymentService.costPaid || 0) > 0)) && (
                     <p className="text-[10px] font-bold text-slate-400 mt-1">
                       Total Abonado/Saldado: {formatCurrency(paymentType === 'revenue' ? (paymentService.amountPaid || 0) : (paymentService.costPaid || 0))}
                     </p>
                   )}
                 </div>

                 {/* Input de Monto Parcial / Abono */}
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 flex justify-between">
                     <span>Monto a Registrar ({paymentType === 'revenue' ? 'Saldo pendiente' : 'Costo pendiente'})</span>
                     <span className="font-mono font-bold text-indigo-550 dark:text-indigo-400">
                       {formatCurrency(paymentType === 'revenue' ? (paymentService.revenue - (paymentService.amountPaid || 0)) : ((paymentService.cost || 0) - (paymentService.costPaid || 0)))}
                     </span>
                   </label>
                   <input
                     type="number"
                     step="0.01"
                     className={cn("w-full p-3.5 rounded-xl border text-sm font-black font-mono outline-none", isDark ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-505" : "bg-white border-slate-200 focus:border-indigo-505 shadow-sm")}
                     value={paymentAmount}
                     onChange={e => setPaymentAmount(e.target.value)}
                     max={paymentType === 'revenue' ? (paymentService.revenue - (paymentService.amountPaid || 0)) : ((paymentService.cost || 0) - (paymentService.costPaid || 0))}
                   />
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
                     {paymentType === 'revenue' ? 'Billetera de Destino (Ingreso)' : 'Billetera de Origen (Egreso)'}
                   </label>
                   <select 
                     value={targetWalletId}
                     onChange={e => setTargetWalletId(e.target.value)}
                     className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200")}
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
                   {paymentType === 'revenue' ? 'Confirmar Cobro' : 'Confirmar Pago'}
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successMsg.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} className={cn("relative w-full max-w-sm p-6 sm:p-8 rounded-3xl border shadow-2xl z-10 flex flex-col items-center text-center", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}>
              <div className="w-16 h-16 bg-emerald-105 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className={cn("text-xl font-bold uppercase tracking-tight mb-2", isDark ? "text-white" : "text-slate-900")}>Servicio Creado</h3>
              <p className="text-slate-500 text-sm mb-6">La venta digital se registró de manera exitosa. ¿Cómo deseas proceder sustentando el comprobante?</p>
              
              <div className="flex flex-col w-full gap-2.5">
                <button 
                  onClick={() => {
                    const svc = successMsg.service;
                    setSuccessMsg({show: false, phone: '', text: ''});
                    if (svc) {
                      handleOpenVoucher(svc);
                    }
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <FileText className="w-4 h-4"/> Ver/Emitir Recibo (PDF/PNG)
                </button>

                {successMsg.phone && (
                  <button 
                    onClick={() => {
                      const encoded = encodeURIComponent(successMsg.text);
                      window.open(`https://wa.me/${successMsg.phone.replace(/\D/g, '')}?text=${encoded}`, '_blank');
                      setSuccessMsg({show: false, phone: '', text: ''});
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <MessageCircle className="w-4 h-4"/> WhatsApp (Texto Rápido)
                  </button>
                )}

                <button 
                  onClick={() => setSuccessMsg({show: false, phone: '', text: ''})}
                  className={cn("w-full px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest border transition-all cursor-pointer", isDark ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200")}
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toolbar for Bulk Operations (Mejora 3) */}
      <AnimatePresence>
        {selectedItemIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 left-6 md:left-[270px] z-50 bg-slate-900 dark:bg-indigo-950 border border-slate-800 dark:border-indigo-900 text-slate-100 dark:text-indigo-100 rounded-3xl p-4 shadow-2xl flex flex-col sm:flex-row justify-between items-center gap-4 border-l-4 border-l-indigo-500 animate-pulse-slow"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-sm">
                {selectedItemIds.length}
              </div>
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-wider text-white">Acciones en Lote</p>
                <p className="text-[10px] text-slate-400 font-semibold">Aplique cambios masivos a las suscripciones seleccionadas.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
              <button
                onClick={handleBulkRenew}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border-none outline-none"
              >
                🔄 Renovar 30d
              </button>
              <button
                onClick={handleBulkMarkPaid}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border-none outline-none"
              >
                💵 Cobrar (Lote)
              </button>
              <button
                onClick={handleBulkWhatsAppAlert}
                className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border-none outline-none"
              >
                💬 WhatsApp (Lote)
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-705 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border-none outline-none"
              >
                🗑️ Eliminar
              </button>
              <button
                onClick={() => setSelectedItemIds([])}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border border-slate-700 outline-none"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
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

      <VoucherModal 
        isOpen={isVoucherModalOpen} 
        onClose={() => setIsVoucherModalOpen(false)} 
        voucher={activeVoucher} 
      />

      {renewalService && (
        <ServiceRenewalModal
          isOpen={!!renewalService}
          onClose={() => setRenewalService(null)}
          service={renewalService}
          wallets={wallets}
          user={user}
          onSuccess={() => {
            // Success handler
          }}
          isDark={isDark}
        />
      )}
    </div>
  );
}
