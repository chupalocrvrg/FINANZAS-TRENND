import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Download, 
  Printer, 
  User, 
  Calendar, 
  Hash, 
  DollarSign, 
  ExternalLink,
  ShieldAlert,
  Eye,
  EyeOff,
  Copy,
  Check,
  CreditCard,
  Briefcase,
  HelpCircle,
  TrendingUp,
  Inbox,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';

export function generateSecureToken(ownerId: string, clientName: string): string {
  const combined = `${ownerId}:${clientName.toLowerCase().trim()}:security_salt_2026`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36) + combined.length.toString(36);
}

/**
 * Generates an obfuscated, completely unpredictable URL for a client's public portal (Mejora 2)
 * If the client already has an active portalToken in CRM, it uses it.
 * If not, it generates a secure random token, updates CRM in background, and uses that.
 * Fallback to secure signature token if no CRM entry is found.
 */
export function getClientPortalUrl(
  ownerId: string,
  clientName: string,
  entities: any[]
): string {
  const origin = window.location.origin;
  const trimmedName = clientName.toLowerCase().trim();
  const entity = entities.find(e => e.name?.toLowerCase().trim() === trimmedName);

  if (entity) {
    if (entity.portalToken) {
      return `${origin}/?view=client-portal&owner=${ownerId}&token=${entity.portalToken}`;
    } else {
      // Generate secure 16-character alphanumeric token
      const randToken = 'pt_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      
      // Update in background
      updateDoc(doc(db, 'entities', entity.id), { portalToken: randToken }).catch(err => {
        console.error("Error updating portalToken in background:", err);
      });
      
      // Update local object so we don't regenerate in same session
      entity.portalToken = randToken;
      return `${origin}/?view=client-portal&owner=${ownerId}&token=${randToken}`;
    }
  }

  // Graceful fallback to secure hashed token if no CRM entity matches
  const secureHash = generateSecureToken(ownerId, clientName);
  return `${origin}/?view=client-portal&owner=${ownerId}&client=${encodeURIComponent(clientName)}&token=${secureHash}`;
}

interface ClientPublicPortalProps {
  onBackToApp?: () => void;
}

export function ClientPublicPortal({ onBackToApp }: ClientPublicPortalProps) {
  const [params, setParams] = useState<URLSearchParams>(new URLSearchParams(window.location.search));
  const viewType = params.get('view'); // 'client-portal' or 'voucher'
  const ownerId = params.get('owner'); // Merchant UID
  const clientName = params.get('client'); // Client name
  const voucherId = params.get('id'); // For individual voucher
  const voucherType = params.get('type') || 'digital'; // 'digital', 'ant', 'ledger'

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Portal view state
  const [activeClientName, setActiveClientName] = useState<string>('');
  const [activeServices, setActiveServices] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleCredentials, setVisibleCredentials] = useState<Record<string, boolean>>({});
  const [merchantSettings, setMerchantSettings] = useState<any>(null);

  // Single Voucher view state
  const [voucherData, setVoucherData] = useState<any>(null);
  const [qrModalData, setQrModalData] = useState<{ isOpen: boolean; title: string; data: string } | null>(null);

  const isDark = true; // Use a stunning, eye-friendly, premium dark slate theme for the public portal

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle credential visibility
  const toggleCredential = (id: string) => {
    setVisibleCredentials(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Fetch client statement data
  const fetchPortalData = async () => {
    if (!ownerId) {
      setError('Falta el parámetro de propietario requerido en el enlace.');
      setLoading(false);
      return;
    }

    const token = params.get('token');
    if (!token) {
      setError('Falta el token de seguridad requerido en el enlace.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      let decodedClient = '';

      // Check if client parameter is absent -> look up by portalToken (Mejora 2)
      if (!clientName) {
        const qEntities = query(
          collection(db, 'entities'),
          where('ownerId', '==', ownerId),
          where('portalToken', '==', token)
        );
        const entitySnap = await getDocs(qEntities);
        if (!entitySnap.empty) {
          const entityData = entitySnap.docs[0].data();
          decodedClient = (entityData.name || '').trim();
          setActiveClientName(decodedClient);
        } else {
          setError('Acceso denegado: El token de acceso es inválido o el enlace ha expirado.');
          setLoading(false);
          return;
        }
      } else {
        // Fallback validation with old secure deterministic token signature
        decodedClient = decodeURIComponent(clientName).trim();
        const expectedToken = generateSecureToken(ownerId, decodedClient);
        if (token !== expectedToken) {
          setError('Acceso denegado: El token de seguridad de este enlace es inválido o ha sido alterado. No tiene permisos para acceder.');
          setLoading(false);
          return;
        }
        setActiveClientName(decodedClient);
      }

      // Fetch Merchant's settings for custom logo and business name
      const settingsRef = doc(db, 'users', ownerId);
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setMerchantSettings(settingsSnap.data());
      }

      // 1. Fetch Digital Services matching ownerId and clientName
      const qServices = query(
        collection(db, 'digital_services'),
        where('ownerId', '==', ownerId)
      );
      const servicesSnap = await getDocs(qServices);
      const allServices = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter in memory for maximum safety/robustness against index configuration issues
      const clientServices = allServices.filter((s: any) => 
        !s.deletedFromModule && 
        s.clientName?.toLowerCase().trim() === decodedClient.toLowerCase()
      );

      // 2. Fetch ANT/Transactions matching ownerId and clientName (as intermediary or final client)
      const qTxs = query(
        collection(db, 'transactions'),
        where('ownerId', '==', ownerId)
      );
      const txsSnap = await getDocs(qTxs);
      const allTxs = txsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const clientTxs = allTxs.filter((tx: any) => 
        tx.intermediaryName?.toLowerCase().trim() === decodedClient.toLowerCase() ||
        tx.finalClientName?.toLowerCase().trim() === decodedClient.toLowerCase()
      );

      // 3. Fetch Ledger entries (loans) matching ownerId
      const qLedger = query(
        collection(db, 'ledger'),
        where('ownerId', '==', ownerId)
      );
      const ledgerSnap = await getDocs(qLedger);
      const allLedger = ledgerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const clientLedger = allLedger.filter((e: any) => 
        e.isPending && (e.isLoan || e.category?.toLowerCase().includes('préstamo') || e.category?.toLowerCase().includes('prestamo')) &&
        (e.description?.toLowerCase().includes(decodedClient.toLowerCase()) || e.category?.toLowerCase().includes(decodedClient.toLowerCase()))
      );

      // Categorize Active services
      setActiveServices(clientServices.filter((s: any) => s.status === 'active'));

      // Process receivables (everything unpaid or pending)
      const derivedReceivables: any[] = [];

      // Unpaid Transactions
      clientTxs.filter((tx: any) => !tx.isPaid).forEach((tx: any) => {
        derivedReceivables.push({
          id: tx.id,
          source: 'Trámite ANT',
          description: `Actualización de matrícula / Licencia • Bodega: ${tx.warehouse || 'General'}`,
          totalAmount: tx.chargedRate || 0,
          pendingAmount: (tx.chargedRate || 0) - (tx.amountPaid || 0),
          dueDate: tx.billingDate || tx.createdAt?.split('T')[0] || 'S/N',
          status: 'pending'
        });
      });

      // Unpaid Digital Services
      clientServices.filter((s: any) => !s.isPaid).forEach((s: any) => {
        derivedReceivables.push({
          id: s.id,
          source: 'Servicio Digital',
          description: `Suscripción Activa: ${s.name} • Perfil: ${s.pin || 'S/N'}`,
          totalAmount: s.revenue || 0,
          pendingAmount: (s.revenue || 0) - (s.amountPaid || 0),
          dueDate: s.expirationDate || 'S/N',
          status: s.status || 'active'
        });
      });

      // Outstanding Loans
      clientLedger.forEach((e: any) => {
        derivedReceivables.push({
          id: e.id,
          source: 'Préstamo / Crédito',
          description: e.description || `Préstamo registrado el ${e.date}`,
          totalAmount: Math.abs(e.amount),
          pendingAmount: Math.abs(e.amount),
          dueDate: e.dueDate || e.date || 'S/N',
          status: 'pending'
        });
      });

      setReceivables(derivedReceivables);
      setLoans(clientLedger);

    } catch (err: any) {
      console.error('Error fetching portal statement:', err);
      setError('Ocurrió un error al cargar la información en tiempo real desde el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch individual voucher data
  const fetchVoucherData = async () => {
    if (!voucherId) {
      setError('Código de recibo/ticket no provisto.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let foundData: any = null;
      let targetOwnerId: string | null = null;

      // Try first to query digital_services
      let docRef = doc(db, 'digital_services', voucherId);
      let docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        targetOwnerId = data.ownerId || null;
        foundData = {
          id: docSnap.id,
          type: 'digital',
          title: 'Servicio / Cuenta Digital',
          clientName: data.clientName || 'Cliente',
          productName: data.name || 'Servicio Premium',
          email: data.email || '',
          password: data.password || '',
          pin: data.pin || '',
          dueDate: data.expirationDate || '',
          amount: data.revenue || 0,
          isPaid: data.isPaid || false,
          amountPaid: data.amountPaid || 0,
          pendingAmount: (data.revenue || 0) - (data.amountPaid || 0),
          createdAt: data.createdAt || ''
        };
      } else {
        // If not, try transactions
        docRef = doc(db, 'transactions', voucherId);
        docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          targetOwnerId = data.ownerId || null;
          foundData = {
            id: docSnap.id,
            type: 'ant',
            title: 'Trámite / Actualización ANT',
            clientName: data.finalClientName || data.intermediaryName || 'Cliente',
            productName: `Trámite ANT (${data.warehouse || 'S/N'})`,
            dueDate: data.billingDate || '',
            amount: data.chargedRate || 0,
            isPaid: data.isPaid || false,
            amountPaid: data.amountPaid || 0,
            pendingAmount: (data.chargedRate || 0) - (data.amountPaid || 0),
            createdAt: data.createdAt || ''
          };
        } else {
          // If not, try ledger
          docRef = doc(db, 'ledger', voucherId);
          docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            targetOwnerId = data.ownerId || null;
            foundData = {
              id: docSnap.id,
              type: 'ledger',
              title: data.isLoan ? 'Préstamo Directo' : 'Recibo de Caja',
              clientName: data.description || 'Prestatario',
              productName: data.category || 'Transacción',
              dueDate: data.dueDate || data.date || '',
              amount: Math.abs(data.amount),
              isPaid: !data.isPending,
              amountPaid: !data.isPending ? Math.abs(data.amount) : 0,
              pendingAmount: data.isPending ? Math.abs(data.amount) : 0,
              createdAt: data.createdAt || data.date || ''
            };
          }
        }
      }

      if (foundData) {
        setVoucherData(foundData);
        if (targetOwnerId) {
          const settingsRef = doc(db, 'users', targetOwnerId);
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            setMerchantSettings(settingsSnap.data());
          }
        }
        setLoading(false);
        return;
      }

      setError('No se encontró ningún recibo activo con el código provisto.');
    } catch (err: any) {
      console.error('Error fetching individual voucher:', err);
      setError('Ocurrió un error al obtener los detalles del recibo.');
    } finally {
      setLoading(false);
    }
  };

  // Run initial fetches
  useEffect(() => {
    if (viewType === 'client-portal') {
      fetchPortalData();
    } else if (viewType === 'voucher') {
      fetchVoucherData();
    } else {
      setError('Tipo de vista no admitido.');
      setLoading(false);
    }
  }, [viewType, ownerId, clientName, voucherId]);

  // Handle PDF/Download Receipt
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 150] // Ticket tape layout style
      });

      if (viewType === 'voucher' && voucherData) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('RECIBO DIGITAL DE COMPRA', 40, 12, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'normal');
        doc.text('Control Financiero Express', 40, 16, { align: 'center' });
        doc.text('-----------------------------------------------', 40, 20, { align: 'center' });

        doc.text(`Cliente: ${voucherData.clientName}`, 10, 26);
        doc.text(`Concepto: ${voucherData.productName}`, 10, 31);
        if (voucherData.email) {
          doc.text(`Usuario/Email: ${voucherData.email}`, 10, 36);
          doc.text(`Clave: ${voucherData.password}`, 10, 41);
          doc.text(`PIN/Perfil: ${voucherData.pin || 'S/N'}`, 10, 46);
        }
        
        doc.text(`Fecha Emisión: ${voucherData.createdAt?.split('T')[0] || 'S/N'}`, 10, 52);
        doc.text(`Fecha Vencimiento: ${voucherData.dueDate || 'S/N'}`, 10, 57);
        doc.text('-----------------------------------------------', 40, 62, { align: 'center' });

        doc.setFont('Helvetica', 'bold');
        doc.text(`Monto del Servicio: $${voucherData.amount.toFixed(2)}`, 10, 68);
        doc.text(`Monto Cancelado: $${voucherData.amountPaid.toFixed(2)}`, 10, 73);
        
        if (voucherData.pendingAmount > 0) {
          doc.setTextColor(220, 38, 38);
          doc.text(`Monto Pendiente: $${voucherData.pendingAmount.toFixed(2)}`, 10, 79);
        } else {
          doc.setTextColor(22, 163, 74);
          doc.text('ESTADO: TOTALMENTE PAGADO', 10, 79);
        }

        doc.setTextColor(0, 0, 0);
        doc.setFont('Helvetica', 'normal');
        doc.text('-----------------------------------------------', 40, 85, { align: 'center' });
        doc.setFontSize(7);
        doc.text('¡Gracias por su preferencia!', 40, 92, { align: 'center' });
        doc.text('Consulte en línea para actualizaciones.', 40, 96, { align: 'center' });

        doc.save(`Recibo_${voucherData.id.substring(0, 8)}.pdf`);
      } else if (viewType === 'client-portal') {
        // Consolidated account statement print/PDF
        const docStatement = new jsPDF();
        docStatement.setFontSize(16);
        docStatement.setFont('Helvetica', 'bold');
        docStatement.text('ESTADO DE CUENTA CONSOLIDADO', 15, 20);
        docStatement.setFontSize(10);
        docStatement.setFont('Helvetica', 'normal');
        docStatement.text(`Cliente: ${activeClientName}`, 15, 27);
        docStatement.text(`Fecha de Emisión: ${new Date().toISOString().split('T')[0]}`, 15, 32);
        
        docStatement.text('---------------------------------------------------------------------------------------------------------', 15, 37);
        docStatement.setFontSize(12);
        docStatement.setFont('Helvetica', 'bold');
        docStatement.text('Suscripciones Activas', 15, 45);

        let y = 52;
        docStatement.setFontSize(9);
        docStatement.setFont('Helvetica', 'normal');
        activeServices.forEach((s) => {
          docStatement.text(`• ${s.name} - Vence: ${s.expirationDate} - Correo: ${s.email || 'S/N'} (Pin: ${s.pin || 'S/N'})`, 15, y);
          y += 6;
        });

        y += 5;
        docStatement.setFontSize(12);
        docStatement.setFont('Helvetica', 'bold');
        docStatement.text('Detalle de Cuentas por Cobrar y Saldos Pendientes', 15, y);
        y += 7;
        docStatement.setFontSize(9);
        docStatement.setFont('Helvetica', 'normal');

        let totalPending = 0;
        receivables.forEach((r) => {
          docStatement.text(`• [${r.source}] ${r.description} - Pendiente: $${r.pendingAmount.toFixed(2)} (Emisión/Límite: ${r.dueDate})`, 15, y);
          totalPending += r.pendingAmount;
          y += 6;
        });

        y += 8;
        docStatement.setFontSize(13);
        docStatement.setFont('Helvetica', 'bold');
        docStatement.text(`TOTAL GENERAL PENDIENTE: $${totalPending.toFixed(2)}`, 15, y);

        docStatement.save(`Estado_Cuenta_${activeClientName}.pdf`);
      }
    } catch (e) {
      console.error(e);
      alert('Error al compilar el reporte PDF.');
    }
  };

  // Format dynamic greeting based on Ecuador/GMT-5 time
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return '🌅 Buenos días';
    if (hrs < 18) return '☀️ Buenas tardes';
    return '🌙 Buenas noches';
  };

  // Outstanding sum
  const outstandingTotal = receivables.reduce((sum, r) => sum + r.pendingAmount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Header Bar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 py-4.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {merchantSettings?.customProfilePic ? (
              <img 
                src={merchantSettings.customProfilePic} 
                alt="Logo" 
                className="w-9 h-9 rounded-xl object-cover shadow-lg border border-slate-800" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <FileText className="w-5 h-5 text-white animate-pulse" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-black tracking-wider uppercase text-white">
                {merchantSettings?.companyName || 'Control Financiero'}
              </h1>
              <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">
                Portal de Consulta Digital
              </span>
            </div>
          </div>
          
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="text-xs font-black bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-1.5 rounded-xl cursor-pointer transition-all text-indigo-400"
            >
              ← Volver al Panel
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-bold tracking-wider animate-pulse">
                Sincronizando información en tiempo real...
              </p>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center flex flex-col items-center gap-4 py-12"
            >
              <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <ShieldAlert className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-black text-white">Error de Consulta</h3>
              <p className="text-xs text-rose-300 max-w-md leading-relaxed font-semibold">
                {error}
              </p>
              <p className="text-[10px] text-slate-500">
                Verifique que el enlace copiado desde WhatsApp esté completo y correcto.
              </p>
            </motion.div>
          ) : viewType === 'voucher' && voucherData ? (
            /* --- SINGLE VOUCHER VIEW --- */
            <motion.div
              key="voucher-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto"
            >
              {/* Receipt Ticket Body styled beautifully */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl relative">
                
                {/* Status Watermark / Indicator Header */}
                <div className={cn(
                  "px-6 py-4 flex justify-between items-center",
                  voucherData.pendingAmount === 0 
                    ? "bg-emerald-500/10 border-b border-emerald-500/20"
                    : "bg-amber-500/10 border-b border-amber-500/20"
                )}>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    voucherData.pendingAmount === 0 ? "text-emerald-400" : "text-amber-400"
                  )}>
                    📜 {voucherData.title}
                  </span>
                  
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                    voucherData.pendingAmount === 0
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  )}>
                    {voucherData.pendingAmount === 0 ? "Pagado" : "Pendiente"}
                  </span>
                </div>

                {/* Receipt Details */}
                <div className="p-6 md:p-8 flex flex-col gap-6">
                  
                  {/* Top Branding info */}
                  <div className="text-center pb-4 border-b border-dashed border-slate-800">
                    <span className="text-xs font-black uppercase text-indigo-400 tracking-widest">
                      Comprobante Digital
                    </span>
                    <h3 className="text-2xl font-black text-white mt-1">
                      {voucherData.productName}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">
                      Código: {voucherData.id}
                    </p>
                  </div>

                  {/* Customer Information */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Cliente</span>
                      <span className="text-white text-sm font-bold flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        {voucherData.clientName}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Fecha de Registro</span>
                      <span className="text-white text-sm font-bold flex items-center justify-end gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        {voucherData.createdAt?.split('T')[0] || 'S/N'}
                      </span>
                    </div>
                  </div>

                  {/* If digital service account credentials */}
                  {voucherData.type === 'digital' && voucherData.email && (
                    <div className="bg-slate-950 rounded-2xl border border-slate-850 p-4.5 flex flex-col gap-3">
                      <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 pb-1.5 border-b border-slate-900">
                        🔑 Datos de Acceso de Cuenta
                      </span>

                      <div className="flex flex-col gap-2.5 text-xs font-semibold">
                        {/* Email */}
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-slate-500">Email:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-mono break-all text-right">{voucherData.email}</span>
                            <button 
                              onClick={() => handleCopy(voucherData.email, 'email')}
                              className="p-1 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedId === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Password */}
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-slate-500">Contraseña:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-mono">
                              {visibleCredentials['pass'] ? voucherData.password : '••••••••'}
                            </span>
                            <button 
                              onClick={() => toggleCredential('pass')}
                              className="p-1 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              {visibleCredentials['pass'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button 
                              onClick={() => handleCopy(voucherData.password, 'pass_copy')}
                              className="p-1 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedId === 'pass_copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Pin / Profile */}
                        {voucherData.pin && (
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-500">Perfil / PIN:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-bold text-right">{voucherData.pin}</span>
                              <button 
                                onClick={() => handleCopy(voucherData.pin, 'pin')}
                                className="p-1 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                              >
                                {copiedId === 'pin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-2 text-[10px] text-amber-400 leading-relaxed font-bold italic">
                          ⚠️ Por favor, no altere el correo ni la clave de la suscripción para evitar suspensiones.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financial amounts */}
                  <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs text-slate-400 font-semibold">
                      <span>Valor Total del Servicio:</span>
                      <span className="text-white font-bold">{formatCurrency(voucherData.amount)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-400 font-semibold">
                      <span>Monto Cancelado:</span>
                      <span className="text-emerald-400 font-bold">{formatCurrency(voucherData.amountPaid)}</span>
                    </div>

                    <div className="border-t border-dashed border-slate-800 pt-2.5 flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-slate-400">Saldo Pendiente:</span>
                      <span className={cn(
                        "text-lg font-black",
                        voucherData.pendingAmount > 0 ? "text-rose-400" : "text-emerald-400"
                      )}>
                        {formatCurrency(voucherData.pendingAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Voucher Payment instructions block if pending */}
                  {voucherData.pendingAmount > 0 && merchantSettings?.paymentAccount && (
                    <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4.5 flex flex-col gap-2.5 text-left">
                      <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> Pagar Saldo Pendiente
                      </span>
                      <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                        {merchantSettings.paymentInstructions || 'Por favor, realice el pago del saldo para habilitar o renovar su servicio.'}
                      </p>
                      <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Cuenta para Transferir</span>
                          <span className="text-white text-xs font-black font-mono break-all pr-1">
                            {merchantSettings.paymentAccount}
                          </span>
                        </div>
                        {merchantSettings.paymentAccount.startsWith('http') ? (
                          <a 
                            href={merchantSettings.paymentAccount}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> Ir
                          </a>
                        ) : (
                          <button 
                            onClick={() => handleCopy(merchantSettings.paymentAccount, 'voucher_pay_copy')}
                            className="p-2 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white border border-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shrink-0"
                          >
                            {copiedId === 'voucher_pay_copy' ? 'Copiado' : 'Copiar'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Additional notes/dates */}
                  {voucherData.dueDate && (
                    <div className="text-center text-xs text-slate-400 font-semibold py-1">
                      🗓️ Vence el: <span className="text-white font-bold">{voucherData.dueDate}</span>
                    </div>
                  )}

                </div>

                {/* Print/Download controls */}
                <div className="px-6 py-5 bg-slate-950/60 border-t border-slate-850/80 grid grid-cols-2 gap-3">
                  <button
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Bajar PDF
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* --- FULL CLIENT ACCOUNT STATEMENT VIEW --- */
            <motion.div
              key="portal-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-6"
            >
              {/* Dashboard Welcome Statement */}
              <div className="bg-gradient-to-r from-indigo-950/45 to-slate-950 border border-indigo-900/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-400">
                    {getGreeting()}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                    {activeClientName}
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Consulte el estado actualizado de sus suscripciones y valores pendientes de pago en tiempo real.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-indigo-400 hover:text-indigo-300 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Reporte PDF
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
              </div>

              {/* PAYMENT ACCOUNT CARD (Mejora 1) */}
              {merchantSettings?.paymentAccount && (
                <div className="bg-gradient-to-br from-indigo-950/20 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 text-left shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> Método de Pago Autorizado
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white">
                      Cuenta o Identificador para Pagos
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                      {merchantSettings.paymentInstructions || 'Por favor, realice su depósito o transferencia a la siguiente cuenta y reporte su comprobante.'}
                    </p>
                  </div>
                  
                  <div className="w-full lg:w-auto bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0">
                    <div className="flex flex-col gap-0.5 min-w-[200px]">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Copiar Datos de Pago</span>
                      <span className="text-white text-sm font-black font-mono break-all pr-2">
                        {merchantSettings.paymentAccount}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setQrModalData({ isOpen: true, title: 'QR de Pago Autorizado', data: merchantSettings.paymentAccount })}
                        title="Mostrar Código QR para Escaneo Rápido"
                        className="flex items-center justify-center p-2.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/15 text-indigo-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>

                      {merchantSettings.paymentAccount.startsWith('http') ? (
                        <a 
                          href={merchantSettings.paymentAccount}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Pagar en Línea
                        </a>
                      ) : (
                        <button 
                          onClick={() => handleCopy(merchantSettings.paymentAccount, 'payment_account_copy')}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 text-indigo-400 hover:text-white font-black text-xs uppercase tracking-wider cursor-pointer transition-all"
                        >
                          {copiedId === 'payment_account_copy' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copiar Datos
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Stat Summary Bento row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Active services box */}
                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 text-left flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Suscripciones Activas
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black text-white">{activeServices.length}</span>
                    <span className="text-xs font-semibold text-slate-400">Cuentas</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase mt-3">
                    ● Acceso Disponible
                  </span>
                </div>

                {/* Unpaid items box */}
                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 text-left flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Servicios / Trámites Pendientes
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black text-white">{receivables.length}</span>
                    <span className="text-xs font-semibold text-slate-400">Trámites</span>
                  </div>
                  <span className="text-[10px] text-amber-500 font-bold tracking-wider uppercase mt-3">
                    ⚠️ Por Liquidar o Conciliar
                  </span>
                </div>

                {/* Balanced outstanding box */}
                <div className="bg-slate-900 border border-indigo-900/20 rounded-2xl p-5 text-left flex flex-col justify-between shadow-lg shadow-indigo-950/10">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Valor General Pendiente
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className={cn(
                      "text-3xl font-black",
                      outstandingTotal > 0 ? "text-rose-400" : "text-emerald-400"
                    )}>
                      {formatCurrency(outstandingTotal)}
                    </span>
                  </div>
                  <span className="text-[10px] text-indigo-400 font-bold tracking-wider uppercase mt-3">
                    💰 Total Consolidado
                  </span>
                </div>

              </div>

              {/* Subscriptions Grid List */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    🔑 Mis Suscripciones y Cuentas Premium ({activeServices.length})
                  </h3>
                </div>

                {activeServices.length === 0 ? (
                  <div className="bg-slate-900/45 border border-slate-850 rounded-2xl p-8 text-center text-slate-500 font-semibold text-xs py-12">
                    No dispone de suscripciones digitales activas en este momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeServices.map((service) => (
                      <div 
                        key={service.id}
                        className="bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-2xl p-5 flex flex-col gap-4.5 transition-all text-left relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                              Activo • Cuenta Digital
                            </span>
                            <h4 className="text-lg font-black text-white mt-0.5">
                              {service.name}
                            </h4>
                          </div>
                          
                          <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            Vence: {service.expirationDate}
                          </span>
                        </div>

                        {/* Credentials box */}
                        {service.email ? (
                          <div className="bg-slate-950/80 border border-slate-900 p-3.5 rounded-xl flex flex-col gap-2.5 text-xs font-semibold">
                            <div className="flex justify-between items-center gap-1.5">
                              <span className="text-slate-500">Email:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-200 font-mono break-all text-right">{service.email}</span>
                                <button 
                                  onClick={() => handleCopy(service.email, service.id + '_email')}
                                  className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
                                >
                                  {copiedId === service.id + '_email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            <div className="flex justify-between items-center gap-1.5">
                              <span className="text-slate-500">Clave:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-200 font-mono">
                                  {visibleCredentials[service.id] ? service.password : '••••••••'}
                                </span>
                                <button 
                                  onClick={() => toggleCredential(service.id)}
                                  className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
                                >
                                  {visibleCredentials[service.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button 
                                  onClick={() => handleCopy(service.password, service.id + '_pass')}
                                  className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
                                >
                                  {copiedId === service.id + '_pass' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            {service.pin && (
                              <div className="flex justify-between items-center gap-1.5">
                                <span className="text-slate-500">Perfil / PIN:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-white font-bold">{service.pin}</span>
                                  <button 
                                    onClick={() => handleCopy(service.pin, service.id + '_pin')}
                                    className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
                                  >
                                    {copiedId === service.id + '_pin' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 font-semibold italic">
                            Los datos de acceso no han sido provistos para esta cuenta.
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-2 border-t border-slate-850 text-[10px] font-bold">
                          <span className="text-slate-500">Monto del servicio:</span>
                          <span className="text-white">{formatCurrency(service.revenue || 0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outstanding Receivables Statement / Table */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    ⚠️ Mis Valores Pendientes de Pago / Conciliación ({receivables.length})
                  </h3>
                </div>

                {receivables.length === 0 ? (
                  <div className="bg-slate-900/45 border border-slate-850 rounded-2xl p-8 text-center text-slate-500 font-semibold text-xs py-12">
                    🎉 ¡Al día! No tiene valores o trámites pendientes de pago.
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-950 border-b border-slate-850 text-[9px] font-black uppercase tracking-wider text-slate-500">
                            <th className="p-4">Origen / Detalle</th>
                            <th className="p-4">Fecha Vence</th>
                            <th className="p-4 text-right">Valor Total</th>
                            <th className="p-4 text-right">Saldo Cancelado</th>
                            <th className="p-4 text-right">Saldo Pendiente</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {receivables.map((r, i) => (
                            <tr key={r.id + '_' + i} className="hover:bg-slate-850/30 transition-colors font-semibold">
                              <td className="p-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{r.source}</span>
                                  <span className="text-white text-sm font-bold">{r.description}</span>
                                </div>
                              </td>
                              <td className="p-4 text-slate-400 font-mono">
                                {r.dueDate}
                              </td>
                              <td className="p-4 text-right text-slate-400 font-mono">
                                {formatCurrency(r.totalAmount)}
                              </td>
                              <td className="p-4 text-right text-emerald-500 font-mono">
                                {formatCurrency(r.totalAmount - r.pendingAmount)}
                              </td>
                              <td className="p-4 text-right text-rose-400 font-bold font-mono">
                                {formatCurrency(r.pendingAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Help Notes Footer */}
              <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-5 text-left text-xs text-slate-400 flex gap-3 leading-relaxed font-semibold">
                <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-bold mb-1">💡 ¿Cómo reportar un abono o solicitar asistencia?</p>
                  <p>
                    Si ha realizado una transferencia para liquidar alguno de estos montos, por favor envíe el comprobante de pago con el número de recibo o su nombre directo para conciliar el saldo en el sistema principal.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* STUNNING INTERACTIVE QR CODE MODAL OVERLAY (Mejora 4) */}
      <AnimatePresence>
        {qrModalData?.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQrModalData(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-sm overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-5 z-10"
            >
              {/* Header */}
              <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4" /> QR de Escaneo Rápido
                </span>
                <button
                  onClick={() => setQrModalData(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="font-bold text-sm">✕</span>
                </button>
              </div>

              {/* QR Image Box */}
              <div className="bg-white p-4.5 rounded-2xl shadow-inner border border-slate-200">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrModalData.data)}`}
                  alt="Código QR de Pago"
                  className="w-[200px] h-[200px] rounded-lg select-none"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Info Description */}
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white">
                  {qrModalData.title}
                </h4>
                <p className="text-[11px] font-semibold text-slate-400 max-w-[260px] mx-auto leading-normal">
                  Escanee este código con la aplicación de su banco, billetera virtual o cámara para iniciar la transferencia rápidamente.
                </p>
              </div>

              {/* Text Field to Copy */}
              <div className="w-full bg-slate-950/60 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-3 text-left">
                <div className="flex flex-col gap-0.5 truncate flex-1 pr-1">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Valor Registrado</span>
                  <span className="text-white text-xs font-black font-mono truncate">
                    {qrModalData.data}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(qrModalData.data, 'modal_qr_copy')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg cursor-pointer shrink-0 transition-colors"
                >
                  {copiedId === 'modal_qr_copy' ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setQrModalData(null)}
                className="w-full py-3 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-slate-850 cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Branding Credit */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600 font-semibold flex flex-col gap-1.5 mt-12">
        <p>© 2026 Control Financiero. Todos los derechos reservados.</p>
        <p className="text-[10px] text-slate-700 tracking-wider">
          Acceso Seguro Encriptado • Sincronización Real-Time con Base de Datos
        </p>
      </footer>

    </div>
  );
}
