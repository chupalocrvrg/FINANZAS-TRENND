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
  Bot,
  Eye,
  EyeOff,
  Copy,
  Check,
  CreditCard,
  Briefcase,
  HelpCircle,
  TrendingUp,
  Inbox,
  QrCode,
  MessageCircle,
  RefreshCw,
  LifeBuoy,
  Phone,
  Tv,
  Search,
  Sparkles,
  ShieldCheck,
  Tag,
  Layers,
  ChevronRight,
  Clock,
  Lock,
  Send,
  Gamepad2,
  Coins,
  Sun,
  Moon
} from 'lucide-react';
import { formatCurrency, cn, getGMT5DateString } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  encryptPortalPayload, 
  decryptPortalPayload, 
  DecryptedPortalData 
} from '../lib/portalCrypto';

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
 * Generates an encrypted, URL-safe, completely masked link for a client's public portal
 * Encrypts ownerId, clientName and portalToken into a single secure string (e.g. ?p=...)
 */
export function getClientPortalUrl(
  ownerId: string,
  clientName: string,
  entities: any[]
): string {
  const origin = window.location.origin;
  const trimmedName = clientName.toLowerCase().trim();
  const entity = entities.find(e => e.name?.toLowerCase().trim() === trimmedName);

  let token = '';
  if (entity) {
    if (entity.portalToken) {
      token = entity.portalToken;
    } else {
      // Generate secure 16-character alphanumeric token
      const randToken = 'pt_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      
      // Update in background
      updateDoc(doc(db, 'entities', entity.id), { portalToken: randToken }).catch(err => {
        console.error("Error updating portalToken in background:", err);
      });
      
      // Update local object so we don't regenerate in same session
      entity.portalToken = randToken;
      token = randToken;
    }
  } else {
    token = generateSecureToken(ownerId, clientName);
  }

  // Create masked, encrypted URL
  const cipherToken = encryptPortalPayload({
    view: 'client-portal',
    ownerId,
    clientName: entity ? undefined : clientName,
    token
  });

  return `${origin}/?p=${cipherToken}`;
}

/**
 * Generates an encrypted, URL-safe link for an individual public voucher / receipt
 */
export function getVoucherPublicUrl(
  ownerId: string,
  voucherId: string,
  voucherType: string = 'digital'
): string {
  const origin = window.location.origin;
  const cipherToken = encryptPortalPayload({
    view: 'voucher',
    ownerId,
    voucherId,
    voucherType
  });
  return `${origin}/?p=${cipherToken}`;
}

interface ClientPublicPortalProps {
  onBackToApp?: () => void;
}

export function ClientPublicPortal({ onBackToApp }: ClientPublicPortalProps) {
  // Parse either encrypted ?p=... or legacy URL parameters
  const [portalInfo] = useState<DecryptedPortalData | null>(() => {
    const rawSearch = window.location.search;
    const urlParams = new URLSearchParams(rawSearch);
    const pParam = urlParams.get('p') || urlParams.get('portal');
    
    if (pParam && pParam !== 'acceso-seguro' && pParam !== 'client') {
      const decrypted = decryptPortalPayload(pParam);
      if (decrypted) {
        // Immediate URL Bar Cloaking / Cleansing
        try {
          window.history.replaceState({}, document.title, window.location.pathname + '?portal=acceso-seguro');
        } catch (e) {
          // ignore
        }
        return decrypted;
      }
    }

    // Fallback to legacy plain-text parameters
    const view = (urlParams.get('view') as 'client-portal' | 'voucher') || (urlParams.get('portal') === 'client' ? 'client-portal' : null);
    if (view || urlParams.get('owner')) {
      const legacyData: DecryptedPortalData = {
        view: view || 'client-portal',
        ownerId: urlParams.get('owner') || '',
        clientName: urlParams.get('client') || undefined,
        token: urlParams.get('token') || undefined,
        voucherId: urlParams.get('id') || undefined,
        voucherType: urlParams.get('type') || 'digital'
      };
      try {
        window.history.replaceState({}, document.title, window.location.pathname + '?portal=acceso-seguro');
      } catch (e) {
        // ignore
      }
      return legacyData;
    }

    return null;
  });

  const viewType = portalInfo?.view || 'client-portal';
  const ownerId = portalInfo?.ownerId || '';
  const clientName = portalInfo?.clientName || '';
  const token = portalInfo?.token || '';
  const voucherId = portalInfo?.voucherId || '';
  const voucherType = portalInfo?.voucherType || 'digital';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Portal view state
  const [activeTab, setActiveTab] = useState<'active' | 'unpaid' | 'catalog' | 'payment_methods'>('active');
  const [activeClientName, setActiveClientName] = useState<string>('');
  const [activeServices, setActiveServices] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [unpaidExpiredAccounts, setUnpaidExpiredAccounts] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleCredentials, setVisibleCredentials] = useState<Record<string, boolean>>({});
  const [merchantSettings, setMerchantSettings] = useState<any>(null);
  const [merchantWallets, setMerchantWallets] = useState<any[]>([]);

  // Catalog state & client role
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [gameRecharges, setGameRecharges] = useState<any[]>([]);
  const [tramitesCatalog, setTramitesCatalog] = useState<any[]>([]);
  const [catalogSection, setCatalogSection] = useState<'all' | 'subscriptions' | 'games' | 'tramites'>('all');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [clientEntityType, setClientEntityType] = useState<'client' | 'reseller' | 'intermediary'>('client');

  // Single Voucher view state
  const [voucherData, setVoucherData] = useState<any>(null);
  const [qrModalData, setQrModalData] = useState<{ isOpen: boolean; title: string; data: string } | null>(null);

  // Theme Mode (Dark / Light with Glassmorphism)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portal_theme_mode');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const isDark = themeMode === 'dark';

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setThemeMode(next);
    try {
      localStorage.setItem('portal_theme_mode', next);
    } catch (e) {
      console.warn('Failed to save portal theme mode to localStorage:', e);
    }
  };

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

  // Helper to normalize phone numbers for WhatsApp
  const cleanPhoneNumber = (rawPhone?: string) => {
    if (!rawPhone) return '';
    const digits = rawPhone.replace(/\D/g, '');
    if (!digits) return '';
    // If it starts with 0 and has 10 digits (Ecuador standard e.g. 0991234567), prefix country code 593
    if (digits.startsWith('0') && digits.length === 10) {
      return `593${digits.substring(1)}`;
    }
    // If it already has 9 digits without 0 (e.g. 991234567), prefix 593
    if (digits.length === 9 && digits.startsWith('9')) {
      return `593${digits}`;
    }
    return digits;
  };

  // WhatsApp Action: Blank Chat with Business / Merchant
  const handleOpenBlankWhatsApp = () => {
    const phone = cleanPhoneNumber(merchantSettings?.phone);
    if (!phone) {
      alert("El número de WhatsApp del asesor no está configurado en el sistema.");
      return;
    }
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  // WhatsApp Action: Solicitar Renovación (Active Service)
  const handleRequestRenewal = (service: any) => {
    const phone = cleanPhoneNumber(merchantSettings?.phone);
    if (!phone) {
      alert("El número de WhatsApp del asesor no está configurado en el sistema.");
      return;
    }
    const emailUser = service.isBot && service.botUser ? service.botUser : (service.email || 'S/N');
    const profile = service.pin || 'Principal / Estándar';
    const password = service.isBot && service.botPassword ? service.botPassword : (service.password || 'S/N');
    
    const message = `Hola, deseo solicitar la renovación de mi servicio:\n\n` +
      `📌 *Servicio:* ${service.name}\n` +
      `👤 *Correo/Usuario:* ${emailUser}\n` +
      `🏷️ *Perfil:* ${profile}\n` +
      `🔑 *Contraseña:* ${password}\n\n` +
      `Quedo a la espera de su confirmación para proceder con el pago. ¡Muchas gracias!`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // WhatsApp Action: Solicitar Soporte (Active Service)
  const handleRequestSupport = (service: any) => {
    const phone = cleanPhoneNumber(merchantSettings?.phone);
    if (!phone) {
      alert("El número de WhatsApp del asesor no está configurado en el sistema.");
      return;
    }
    const emailUser = service.isBot && service.botUser ? service.botUser : (service.email || 'S/N');
    const profile = service.pin || 'Principal / Estándar';
    const password = service.isBot && service.botPassword ? service.botPassword : (service.password || 'S/N');

    const message = `Hola, la cuenta de *${service.name}* con datos de acceso:\n` +
      `👤 *Correo/Usuario:* ${emailUser}\n` +
      `🏷️ *Perfil:* ${profile}\n` +
      `🔑 *Contraseña:* ${password}\n\n` +
      `Tiene el siguiente problema: `;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // WhatsApp Action: Solicitar información de revendedor / generar ingresos
  const handleRequestResellerInfo = () => {
    const phone = cleanPhoneNumber(merchantSettings?.phone);
    if (!phone) {
      alert("El número de WhatsApp del asesor no está configurado en el sistema.");
      return;
    }
    const message = `Hola, revisé el catálogo de servicios digitales en mi portal y me gustaría recibir información sobre los precios preferenciales para generar ingresos como distribuidor / revendedor.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // WhatsApp Action: Solicitar servicio del catálogo
  const handleRequestCatalogService = (item: any, customPrice?: number) => {
    const phone = cleanPhoneNumber(merchantSettings?.phone);
    if (!phone) {
      alert("El número de WhatsApp del asesor no está configurado en el sistema.");
      return;
    }
    const price = customPrice ?? getCatalogItemPrice(item);
    const message = `Hola, me interesa adquirir el servicio *${item.name}* del catálogo por el valor de *${formatCurrency(price)}*. ¿Está disponible para entrega inmediata?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Helper to get Game Package price based on client profile
  const getGamePackagePrice = (pkg: any) => {
    if (clientEntityType === 'reseller' && typeof pkg.pvpReseller === 'number' && pkg.pvpReseller > 0) {
      return pkg.pvpReseller;
    }
    return pkg.pvp || 0;
  };

  // Helper to get Tramite price based on client profile
  const getTramitePrice = (item: any) => {
    if (clientEntityType === 'reseller' && typeof item.pvpReseller === 'number' && item.pvpReseller > 0) {
      return item.pvpReseller;
    }
    return item.pvp || 0;
  };

  // WhatsApp Action: Solicitar Recarga de Videojuego
  const handleRequestGameRecharge = (game: any, pkg: any) => {
    const phone = cleanPhoneNumber(merchantSettings?.phone);
    if (!phone) {
      alert("El número de WhatsApp del asesor no está configurado en el sistema.");
      return;
    }
    const price = getGamePackagePrice(pkg);
    const message = `🎮 *SOLICITUD DE RECARGA DE JUEGO*\n\n` +
      `🕹️ *Videojuego:* ${game.name}\n` +
      `💎 *Paquete:* ${pkg.name}\n` +
      `💰 *Valor Tarifa:* ${formatCurrency(price)}\n\n` +
      `📋 *Requisitos requeridos para la recarga:*\n${game.requirements || 'UID de Jugador / Nickname'}\n\n` +
      `✍️ *Mis Datos de Cuenta para Recargar:*\n- UID / ID de Jugador: \n- Nickname: \n- Región / Servidor: \n\n` +
      `Quedo atento a las instrucciones para enviar el comprobante de pago. ¡Muchas gracias!`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // WhatsApp Action: Solicitar Trámite o Pedir más información
  const handleRequestTramite = (tramite: any) => {
    const phone = cleanPhoneNumber(merchantSettings?.phone);
    if (!phone) {
      alert("El número de WhatsApp del asesor no está configurado en el sistema.");
      return;
    }
    const price = getTramitePrice(tramite);
    const hasPrice = price > 0;

    let message = '';
    if (hasPrice) {
      message = `📄 *SOLICITUD DE TRÁMITE / GESTIÓN*\n\n` +
        `📌 *Trámite:* ${tramite.name}\n` +
        `📂 *Categoría:* ${tramite.category || 'Trámite'}\n` +
        `💰 *Valor Tarifa:* ${formatCurrency(price)}\n` +
        `⏱️ *Tiempo Estimado de Entrega:* ${tramite.estimatedDelivery || 'Estándar'}\n\n` +
        `📋 *Requisitos señalados:*\n${tramite.requirements || 'Por favor indíqueme qué documentación enviar.'}\n\n` +
        `Deseo proceder con esta gestión. ¿Cuál es el procedimiento de entrega?`;
    } else {
      message = `📄 *CONSULTA E INFORMACIÓN DE TRÁMITE*\n\n` +
        `📌 *Trámite:* ${tramite.name}\n` +
        `📂 *Categoría:* ${tramite.category || 'Trámite'}\n` +
        `⏱️ *Tiempo Estimado:* ${tramite.estimatedDelivery || 'Estándar'}\n\n` +
        `Hola, deseo solicitar cotización, costos actualizados y la lista de requisitos para gestionar este trámite. ¡Muchas gracias!`;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // WhatsApp Action: Reportar pago o conciliar cuenta vencida
  const handleReportUnpaidAccount = (account: any) => {
    const phone = cleanPhoneNumber(merchantSettings?.phone);
    if (!phone) {
      alert("El número de WhatsApp del asesor no está configurado en el sistema.");
      return;
    }
    const userEmail = account.isBot && account.botUser ? account.botUser : (account.email || 'S/N');
    const profile = account.pin || account.profileName || 'Principal';
    const pendingVal = account.pendingAmount ?? account.revenue ?? 0;
    const message = `Hola, deseo reportar el pago de mi cuenta vencida:\n\n` +
      `📌 *Servicio:* ${account.name}\n` +
      `👤 *Correo/Usuario:* ${userEmail}\n` +
      `🏷️ *Perfil:* ${profile}\n` +
      `🗓️ *Fecha Vencimiento:* ${account.expirationDate || 'Registrada'}\n` +
      `💰 *Saldo Adeudado:* ${formatCurrency(pendingVal)}\n\n` +
      `Adjunto mi comprobante de pago para conciliar y reactivar el acceso. ¡Muchas gracias!`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Fetch client statement data
  const fetchPortalData = async () => {
    if (!ownerId) {
      setError('Enlace inválido o incompleto: Falta el parámetro de propietario.');
      setLoading(false);
      return;
    }

    if (!token) {
      setError('Falta el token de seguridad o firma de verificación en el enlace.');
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
      try {
        const settingsRef = doc(db, 'users', ownerId);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setMerchantSettings(settingsSnap.data());
        }
      } catch (err) {
        console.warn("Could not load merchant settings for portal header:", err);
      }

      // Fetch Client Entity Details from CRM (determine if reseller, intermediary, or final client)
      try {
        const qEntities = query(
          collection(db, 'entities'),
          where('ownerId', '==', ownerId)
        );
        const entitySnap = await getDocs(qEntities);
        const allEntities = entitySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const matchedEntity = allEntities.find((e: any) => 
          (token && e.portalToken === token) || 
          (e.name && e.name.toLowerCase().trim() === decodedClient.toLowerCase().trim())
        );

        if (matchedEntity) {
          const entityData = matchedEntity as any;
          const types: string[] = entityData.types || (entityData.type ? [entityData.type] : []);
          if (types.includes('reseller')) {
            setClientEntityType('reseller');
          } else if (types.includes('intermediary')) {
            setClientEntityType('intermediary');
          } else {
            setClientEntityType('client');
          }
        } else {
          setClientEntityType('client');
        }
      } catch (err) {
        console.warn("Could not determine client entity type:", err);
        setClientEntityType('client');
      }

      // 1. Fetch Digital Services matching ownerId
      const qServices = query(
        collection(db, 'digital_services'),
        where('ownerId', '==', ownerId)
      );
      const servicesSnap = await getDocs(qServices);
      const allServices = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch Available Catalog Items for the Catalog Tab (from explicit catalog and active offerings)
      let rawCatalog: any[] = [];
      try {
        const qCatalog = query(
          collection(db, 'digital_catalog'),
          where('ownerId', '==', ownerId)
        );
        const catSnap = await getDocs(qCatalog);
        rawCatalog = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.warn("Could not load catalog items for public portal:", err);
      }

      // Merge and synthesize full catalog: explicit catalog items take priority, 
      // supplemented dynamically with all unique digital services offered by the merchant
      const catalogMap = new Map<string, any>();

      // A. Explicit items in digital_catalog
      rawCatalog.forEach((item: any) => {
        if (item.name && item.name.trim()) {
          catalogMap.set(item.name.toLowerCase().trim(), item);
        }
      });

      // B. Supplement with unique services from merchant's active catalog
      allServices.forEach((serv: any) => {
        if (!serv.name || !serv.name.trim()) return;
        const key = serv.name.toLowerCase().trim();
        if (!catalogMap.has(key)) {
          const pvp = typeof serv.revenue === 'number' && serv.revenue > 0 
            ? serv.revenue 
            : (typeof serv.cost === 'number' && serv.cost > 0 ? Number((serv.cost * 1.3).toFixed(2)) : 0);
          const cost = typeof serv.cost === 'number' && serv.cost > 0 ? serv.cost : 0;
          const pvpReseller = cost > 0 && cost < pvp 
            ? Number((cost * 1.2).toFixed(2)) 
            : (pvp > 0 ? Number((pvp * 0.85).toFixed(2)) : 0);

          catalogMap.set(key, {
            id: `cat_serv_${serv.id || key}`,
            name: serv.name.trim(),
            category: serv.category || 'Streaming & Digital',
            pvp: pvp,
            pvpReseller: pvpReseller,
            cost: cost,
            profileType: serv.profileName || serv.pin || 'Cuenta / Perfil',
            duration: '30 días',
            description: `Suscripción digital oficial con entrega inmediata y garantía de soporte durante todo el período.`,
            providers: cost > 0 ? [{ supplierId: serv.supplierId || 'direct', cost, pvp, pvpReseller }] : []
          });
        }
      });

      const finalCatalogList = Array.from(catalogMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setCatalogItems(finalCatalogList);

      // Fetch Game Recharges Catalog
      try {
        const qGames = query(
          collection(db, 'game_recharges_catalog'),
          where('ownerId', '==', ownerId)
        );
        const gamesSnap = await getDocs(qGames);
        const rawGames = gamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGameRecharges(rawGames.filter((g: any) => g.active !== false).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')));
      } catch (err) {
        console.warn("Could not load game recharges for public portal:", err);
      }

      // Fetch Trámites Catalog
      try {
        const qTramites = query(
          collection(db, 'tramites_catalog'),
          where('ownerId', '==', ownerId)
        );
        const tramitesSnap = await getDocs(qTramites);
        const rawTramites = tramitesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTramitesCatalog(rawTramites.filter((t: any) => t.active !== false).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')));
      } catch (err) {
        console.warn("Could not load tramites catalog for public portal:", err);
      }

      // Fetch merchant's active payment accounts (registered wallets with account numbers)
      try {
        const qWallets = query(
          collection(db, 'wallets'),
          where('ownerId', '==', ownerId)
        );
        const walletsSnap = await getDocs(qWallets);
        const walletsData = walletsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMerchantWallets(walletsData.filter((w: any) => w.accountNumber && w.accountNumber.trim() !== ''));
      } catch (err) {
        console.error("Error fetching merchant wallets:", err);
      }
      
      // All services belonging to the client (including active, expired, and archived/deletedFromModule)
      const allClientServices = allServices.filter((s: any) => 
        s.clientName?.toLowerCase().trim() === decodedClient.toLowerCase()
      );

      // Active, non-archived services for the portal's active cards
      const clientServices = allClientServices.filter((s: any) => !s.deletedFromModule);

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

      // Date & Time checking for 15:00 UTC-5 cutoff
      const now = new Date();
      const ecuadorIso = now.toLocaleString("en-US", { timeZone: "America/Guayaquil" });
      const ecuadorDate = new Date(ecuadorIso);
      const ecY = ecuadorDate.getFullYear();
      const ecM = String(ecuadorDate.getMonth() + 1).padStart(2, '0');
      const ecD = String(ecuadorDate.getDate()).padStart(2, '0');
      const todayStr = `${ecY}-${ecM}-${ecD}`;

      // Helper to determine if a service is expired considering the 15:00 UTC-5 (Ecuador) cutoff
      const isServiceExpired = (expDate?: string) => {
        if (!expDate) return false;
        if (expDate < todayStr) return true;
        if (expDate > todayStr) return false;
        // Same day: active only until 15:00 (3:00 PM) UTC-5
        const currentHour = ecuadorDate.getHours();
        return currentHour >= 15;
      };

      // Categorize Active services: Only non-archived services where status is 'active' AND is not expired
      const nonExpiredActiveServices = clientServices.filter((s: any) => {
        if (s.status !== 'active') return false;
        return !isServiceExpired(s.expirationDate);
      });
      setActiveServices(nonExpiredActiveServices);

      // Explicitly extract Expired & Unpaid accounts for the prioritized control section (Mejora: Control exacto de cuentas vencidas)
      const unpaidExpiredList = allClientServices
        .filter((s: any) => {
          if (s.isPaid) return false;
          const isExpired = s.deletedFromModule || s.status === 'expired' || isServiceExpired(s.expirationDate);
          return isExpired;
        })
        .map((s: any) => ({
          id: s.id,
          name: s.name || 'Servicio Digital',
          category: s.category || 'Digital',
          email: s.isBot && s.botUser ? s.botUser : (s.email || ''),
          password: s.isBot && s.botPassword ? s.botPassword : (s.password || ''),
          pin: s.pin || s.profileName || '',
          profileName: s.profileName || s.pin || 'Principal',
          expirationDate: s.expirationDate || 'S/N',
          revenue: s.revenue || 0,
          amountPaid: s.amountPaid || 0,
          pendingAmount: (s.revenue || 0) - (s.amountPaid || 0),
          isBot: !!s.isBot,
          botUrl: s.botUrl || '',
          finalClientName: s.finalClientName || null,
          finalClientContact: s.finalClientContact || null
        }));
      setUnpaidExpiredAccounts(unpaidExpiredList);

      // Process receivables (everything unpaid or pending across all sources and states)
      const derivedReceivables: any[] = [];

      // Unpaid Transactions (ANT)
      clientTxs.filter((tx: any) => !tx.isPaid).forEach((tx: any) => {
        derivedReceivables.push({
          id: tx.id,
          source: 'Trámite ANT',
          description: `Actualización de matrícula / Licencia • Bodega: ${tx.warehouse || 'General'}`,
          totalAmount: tx.chargedRate || 0,
          pendingAmount: (tx.chargedRate || 0) - (tx.amountPaid || 0),
          dueDate: tx.billingDate || tx.createdAt?.split('T')[0] || 'S/N',
          status: 'pending',
          finalClientName: tx.finalClientName || null,
          finalClientContact: tx.finalClientContact || null
        });
      });

      // Unpaid Digital Services (Both Active and Expired/Archived accounts)
      allClientServices.filter((s: any) => !s.isPaid).forEach((s: any) => {
        const isExpired = s.deletedFromModule || s.status === 'expired' || isServiceExpired(s.expirationDate);
        const emailUser = s.isBot && s.botUser ? s.botUser : (s.email || '');
        const profilePin = s.pin || s.profileName || '';
        derivedReceivables.push({
          id: s.id,
          source: isExpired ? 'Servicio Vencido' : 'Servicio Digital',
          description: isExpired 
            ? `Servicio Vencido: ${s.name}${profilePin ? ` • Perfil: ${profilePin}` : ''}`
            : `Suscripción Activa: ${s.name}${profilePin ? ` • Perfil: ${profilePin}` : ''}`,
          totalAmount: s.revenue || 0,
          pendingAmount: (s.revenue || 0) - (s.amountPaid || 0),
          dueDate: s.expirationDate || 'S/N',
          status: isExpired ? 'expired' : (s.status || 'active'),
          finalClientName: s.finalClientName || null,
          finalClientContact: s.finalClientContact || null,
          email: emailUser,
          password: s.isBot && s.botPassword ? s.botPassword : (s.password || ''),
          pin: profilePin,
          isExpired
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

          // Fetch merchant wallets for payment methods on the voucher
          try {
            const qWallets = query(
              collection(db, 'wallets'),
              where('ownerId', '==', targetOwnerId)
            );
            const walletsSnap = await getDocs(qWallets);
            const walletsData = walletsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMerchantWallets(walletsData.filter((w: any) => w.accountNumber && w.accountNumber.trim() !== ''));
          } catch (err) {
            console.error("Error fetching merchant wallets for voucher:", err);
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
  }, [viewType, ownerId, clientName, token, voucherId]);

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

  // Helper to determine price for catalog item based on client entity type (PVP vs Reseller)
  const getCatalogItemPrice = (item: any) => {
    if (clientEntityType === 'reseller') {
      if (typeof item.pvpReseller === 'number' && item.pvpReseller > 0) return item.pvpReseller;
      if (typeof item.priceReseller === 'number' && item.priceReseller > 0) return item.priceReseller;
      if (item.providers && item.providers.length > 0) {
        const pRes = item.providers.find((p: any) => typeof p.pvpReseller === 'number' && p.pvpReseller > 0);
        if (pRes) return pRes.pvpReseller;
      }
      // Fallback for reseller: if item has cost, or discounted PVP/revenue
      if (typeof item.cost === 'number' && item.cost > 0) return item.cost;
      const baseVal = (typeof item.pvp === 'number' && item.pvp > 0) ? item.pvp : (typeof item.revenue === 'number' && item.revenue > 0 ? item.revenue : 0);
      if (baseVal > 0) return Number((baseVal * 0.85).toFixed(2));
    }
    // Final client or intermediary: standard PVP
    if (typeof item.pvp === 'number' && item.pvp > 0) return item.pvp;
    if (typeof item.revenue === 'number' && item.revenue > 0) return item.revenue;
    if (typeof item.precio === 'number' && item.precio > 0) return item.precio;
    if (item.providers && item.providers.length > 0) {
      const pPvp = item.providers.find((p: any) => typeof p.pvp === 'number' && p.pvp > 0);
      if (pPvp) return pPvp.pvp;
    }
    return 0;
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col justify-between font-sans transition-colors duration-300 relative",
      isDark 
        ? "bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white" 
        : "bg-slate-100/90 text-slate-800 selection:bg-indigo-600 selection:text-white"
    )}>
      {/* Frosted Ambient Orbs for Glassmorphism in Light Mode */}
      {!isDark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-300/35 blur-3xl" />
          <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-violet-300/30 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-emerald-300/30 blur-3xl" />
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-gradient-to-b from-indigo-100/60 to-transparent blur-2xl" />
        </div>
      )}
      
      {/* Header Bar */}
      <header className={cn(
        "border-b sticky top-0 z-40 px-4 py-4 backdrop-blur-xl transition-all duration-200",
        isDark 
          ? "border-slate-900 bg-slate-950/80 shadow-md shadow-black/20" 
          : "border-white/70 bg-white/75 shadow-sm shadow-slate-200/60"
      )}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {merchantSettings?.customProfilePic ? (
              <img 
                src={merchantSettings.customProfilePic} 
                alt="Logo" 
                className={cn(
                  "w-9 h-9 rounded-xl object-cover shadow-md shrink-0 border",
                  isDark ? "border-slate-800" : "border-white"
                )} 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
                <FileText className="w-5 h-5 text-white animate-pulse" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className={cn(
                "text-sm font-black tracking-wider uppercase truncate",
                isDark ? "text-white" : "text-slate-900"
              )}>
                {merchantSettings?.companyName || 'Control Financiero'}
              </h1>
              <span className={cn(
                "text-[10px] font-bold tracking-widest uppercase block truncate",
                isDark ? "text-indigo-400" : "text-indigo-600"
              )}>
                Portal de Consulta Digital
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme Toggle Button (Light Glassmorphism / Dark Mode) */}
            <button
              onClick={toggleTheme}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-sm",
                isDark
                  ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-amber-300 hover:text-amber-200"
                  : "bg-white/80 hover:bg-white border-white/90 text-slate-700 hover:text-slate-900 shadow-slate-200/50 backdrop-blur-md"
              )}
              title={isDark ? "Cambiar a Tema Claro (Efecto Glassmorphism)" : "Cambiar a Tema Oscuro"}
              aria-label="Alternar modo claro y oscuro"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold hidden sm:inline">Tema Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="text-[11px] font-bold hidden sm:inline text-slate-800">Tema Oscuro</span>
                </>
              )}
            </button>

            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className={cn(
                  "text-xs font-black border px-3 py-1.5 rounded-xl cursor-pointer transition-all shadow-sm",
                  isDark
                    ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-indigo-400 hover:text-indigo-300"
                    : "bg-white/80 hover:bg-white border-white/90 text-indigo-600 hover:text-indigo-700 shadow-slate-200/50 backdrop-blur-md"
                )}
              >
                ← <span className="hidden sm:inline">Volver al </span>Panel
              </button>
            )}
          </div>
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
              <div className={cn(
                "rounded-3xl overflow-hidden shadow-2xl relative border backdrop-blur-xl transition-all duration-200",
                isDark
                  ? "bg-slate-900 border-slate-800/80 shadow-black/40"
                  : "bg-white/85 border-white/90 shadow-xl shadow-slate-300/60 text-slate-800"
              )}>
                
                {/* Status Watermark / Indicator Header */}
                <div className={cn(
                  "px-6 py-4 flex justify-between items-center transition-colors",
                  voucherData.pendingAmount === 0 
                    ? (isDark ? "bg-emerald-500/10 border-b border-emerald-500/20" : "bg-emerald-50/90 border-b border-emerald-100")
                    : (isDark ? "bg-amber-500/10 border-b border-amber-500/20" : "bg-amber-50/90 border-b border-amber-100")
                )}>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    voucherData.pendingAmount === 0 
                      ? (isDark ? "text-emerald-400" : "text-emerald-700") 
                      : (isDark ? "text-amber-400" : "text-amber-700")
                  )}>
                    📜 {voucherData.title}
                  </span>
                  
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                    voucherData.pendingAmount === 0
                      ? (isDark ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-800 border border-emerald-200")
                      : (isDark ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-amber-100 text-amber-800 border border-amber-200")
                  )}>
                    {voucherData.pendingAmount === 0 ? "Pagado" : "Pendiente"}
                  </span>
                </div>

                {/* Receipt Details */}
                <div className="p-6 md:p-8 flex flex-col gap-6">
                  
                  {/* Top Branding info */}
                  <div className={cn(
                    "text-center pb-4 border-b border-dashed",
                    isDark ? "border-slate-800" : "border-slate-200"
                  )}>
                    <span className={cn(
                      "text-xs font-black uppercase tracking-widest",
                      isDark ? "text-indigo-400" : "text-indigo-600"
                    )}>
                      Comprobante Digital
                    </span>
                    <h3 className={cn(
                      "text-2xl font-black mt-1",
                      isDark ? "text-white" : "text-slate-900"
                    )}>
                      {voucherData.productName}
                    </h3>
                    <p className={cn(
                      "text-[10px] font-semibold mt-1",
                      isDark ? "text-slate-400" : "text-slate-500"
                    )}>
                      Código: {voucherData.id}
                    </p>
                  </div>

                  {/* Customer Information */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider",
                        isDark ? "text-slate-500" : "text-slate-500"
                      )}>Cliente</span>
                      <span className={cn(
                        "text-sm font-bold flex items-center gap-1.5",
                        isDark ? "text-white" : "text-slate-900"
                      )}>
                        <User className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-indigo-400" : "text-indigo-600")} />
                        {voucherData.clientName}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider",
                        isDark ? "text-slate-500" : "text-slate-500"
                      )}>Fecha de Registro</span>
                      <span className={cn(
                        "text-sm font-bold flex items-center justify-end gap-1.5",
                        isDark ? "text-white" : "text-slate-900"
                      )}>
                        <Calendar className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-indigo-400" : "text-indigo-600")} />
                        {voucherData.createdAt?.split('T')[0] || 'S/N'}
                      </span>
                    </div>
                  </div>

                  {/* If digital service account credentials */}
                  {voucherData.type === 'digital' && voucherData.email && (
                    <div className={cn(
                      "rounded-2xl border p-4.5 flex flex-col gap-3 transition-colors",
                      isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50/90 border-slate-200/90 shadow-inner"
                    )}>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider pb-1.5 border-b",
                        isDark ? "text-indigo-400 border-slate-900" : "text-indigo-600 border-slate-200"
                      )}>
                        🔑 Datos de Acceso de Cuenta
                      </span>

                      <div className="flex flex-col gap-2.5 text-xs font-semibold">
                        {/* Email */}
                        <div className="flex justify-between items-center gap-2">
                          <span className={isDark ? "text-slate-500" : "text-slate-600 font-bold"}>Email:</span>
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "font-mono break-all text-right font-bold",
                              isDark ? "text-white" : "text-slate-950"
                            )}>{voucherData.email}</span>
                            <button 
                              onClick={() => handleCopy(voucherData.email, 'email')}
                              className={cn(
                                "p-1 rounded-lg transition-colors cursor-pointer",
                                isDark ? "hover:bg-slate-900 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-500 hover:text-slate-900"
                              )}
                            >
                              {copiedId === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Password */}
                        <div className="flex justify-between items-center gap-2">
                          <span className={isDark ? "text-slate-500" : "text-slate-600 font-bold"}>Contraseña:</span>
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "font-mono font-bold",
                              isDark ? "text-white" : "text-slate-950"
                            )}>
                              {visibleCredentials['pass'] ? voucherData.password : '••••••••'}
                            </span>
                            <button 
                              onClick={() => toggleCredential('pass')}
                              className={cn(
                                "p-1 rounded-lg transition-colors cursor-pointer",
                                isDark ? "hover:bg-slate-900 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-500 hover:text-slate-900"
                              )}
                            >
                              {visibleCredentials['pass'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button 
                              onClick={() => handleCopy(voucherData.password, 'pass_copy')}
                              className={cn(
                                "p-1 rounded-lg transition-colors cursor-pointer",
                                isDark ? "hover:bg-slate-900 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-500 hover:text-slate-900"
                              )}
                            >
                              {copiedId === 'pass_copy' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Pin / Profile */}
                        {voucherData.pin && (
                          <div className="flex justify-between items-center gap-2">
                            <span className={isDark ? "text-slate-500" : "text-slate-600 font-bold"}>Perfil / PIN:</span>
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "font-bold text-right",
                                isDark ? "text-white" : "text-slate-950"
                              )}>{voucherData.pin}</span>
                              <button 
                                onClick={() => handleCopy(voucherData.pin, 'pin')}
                                className={cn(
                                  "p-1 rounded-lg transition-colors cursor-pointer",
                                  isDark ? "hover:bg-slate-900 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-500 hover:text-slate-900"
                                )}
                              >
                                {copiedId === 'pin' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                        
                        <div className={cn(
                          "pt-2 text-[10px] leading-relaxed font-bold italic",
                          isDark ? "text-amber-400" : "text-amber-700"
                        )}>
                          ⚠️ Por favor, no altere el correo ni la clave de la suscripción para evitar suspensiones.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financial amounts */}
                  <div className={cn(
                    "border rounded-2xl p-5 flex flex-col gap-3 transition-colors",
                    isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/80 border-slate-200 shadow-sm"
                  )}>
                    <div className={cn(
                      "flex justify-between items-center text-xs font-semibold",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>
                      <span>Valor Total del Servicio:</span>
                      <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>
                        {formatCurrency(voucherData.amount)}
                      </span>
                    </div>

                    <div className={cn(
                      "flex justify-between items-center text-xs font-semibold",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>
                      <span>Monto Cancelado:</span>
                      <span className="text-emerald-500 font-bold">{formatCurrency(voucherData.amountPaid)}</span>
                    </div>

                    <div className={cn(
                      "border-t border-dashed pt-2.5 flex justify-between items-center",
                      isDark ? "border-slate-800" : "border-slate-200"
                    )}>
                      <span className={cn(
                        "text-xs font-black uppercase",
                        isDark ? "text-slate-400" : "text-slate-700"
                      )}>Saldo Pendiente:</span>
                      <span className={cn(
                        "text-lg font-black",
                        voucherData.pendingAmount > 0 ? (isDark ? "text-rose-400" : "text-rose-600") : "text-emerald-500"
                      )}>
                        {formatCurrency(voucherData.pendingAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Voucher Payment instructions block if pending */}
                  {voucherData.pendingAmount > 0 && merchantWallets.length > 0 && (
                    <div className={cn(
                      "border rounded-2xl p-4.5 flex flex-col gap-3 text-left transition-colors",
                      isDark ? "bg-indigo-950/20 border-indigo-500/20" : "bg-indigo-50/70 border-indigo-200"
                    )}>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider flex items-center gap-1",
                        isDark ? "text-indigo-400" : "text-indigo-700"
                      )}>
                        <CreditCard className="w-3 h-3" /> Pagar Saldo Pendiente
                      </span>
                      <p className={cn(
                        "text-[10px] font-semibold leading-normal",
                        isDark ? "text-slate-400" : "text-slate-600"
                      )}>
                        Por favor, realice el pago a cualquiera de las siguientes cuentas bancarias para reportar su transferencia:
                      </p>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {merchantWallets.map((wallet) => (
                          <div 
                            key={wallet.id} 
                            className={cn(
                              "border p-3 rounded-xl flex items-center justify-between gap-3 transition-colors",
                              isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                            )}
                          >
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">
                                {wallet.name}
                              </span>
                              <span className={cn(
                                "text-xs font-black font-mono break-all pr-1",
                                isDark ? "text-white" : "text-slate-900"
                              )}>
                                {wallet.accountNumber}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button 
                                onClick={() => setQrModalData({ isOpen: true, title: `QR: ${wallet.name}`, data: wallet.accountNumber })}
                                className="p-1.5 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/15 text-indigo-500 hover:text-white rounded-md transition-colors cursor-pointer"
                              >
                                <QrCode className="w-3 h-3" />
                              </button>

                              {wallet.accountNumber.startsWith('http') ? (
                                <a 
                                  href={wallet.accountNumber}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors shrink-0 flex items-center justify-center"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <button 
                                  onClick={() => handleCopy(wallet.accountNumber, `voucher_copy_${wallet.id}`)}
                                  className="p-1.5 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-500 hover:text-white rounded-md text-[10px] font-bold transition-colors shrink-0 cursor-pointer"
                                >
                                  {copiedId === `voucher_copy_${wallet.id}` ? '✓' : 'Copiar'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional notes/dates */}
                  {voucherData.dueDate && (
                    <div className={cn(
                      "text-center text-xs font-semibold py-1",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>
                      🗓️ Vence el: <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{voucherData.dueDate}</span>
                    </div>
                  )}

                </div>

                {/* Print/Download controls */}
                <div className={cn(
                  "px-6 py-5 border-t grid grid-cols-2 gap-3 transition-colors",
                  isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50/90 border-slate-200"
                )}>
                  <button
                    onClick={handlePrint}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3.5 rounded-2xl border font-bold text-xs uppercase tracking-wider cursor-pointer transition-all",
                      isDark 
                        ? "border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300" 
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
                    )}
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
              <div className={cn(
                "rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl border backdrop-blur-xl transition-all duration-200",
                isDark
                  ? "bg-gradient-to-r from-indigo-950/45 to-slate-950 border-indigo-900/20 text-white"
                  : "bg-gradient-to-r from-white/90 via-white/80 to-indigo-50/70 border-white/90 shadow-slate-200/70 text-slate-900"
              )}>
                <div>
                  <span className={cn(
                    "text-xs font-black uppercase tracking-widest",
                    isDark ? "text-indigo-400" : "text-indigo-600"
                  )}>
                    {getGreeting()}
                  </span>
                  <h2 className={cn(
                    "text-2xl md:text-3xl font-black mt-1",
                    isDark ? "text-white" : "text-slate-900"
                  )}>
                    {activeClientName}
                  </h2>
                  <p className={cn(
                    "text-xs font-semibold mt-1",
                    isDark ? "text-slate-400" : "text-slate-600"
                  )}>
                    Consulte el estado actualizado de sus suscripciones y valores pendientes de pago en tiempo real.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider cursor-pointer transition-all shadow-sm",
                      isDark
                        ? "bg-slate-900 border-slate-800 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300"
                        : "bg-white/90 border-white hover:bg-white text-indigo-700 hover:text-indigo-800 shadow-slate-200/60"
                    )}
                  >
                    <Download className="w-4 h-4" />
                    Reporte PDF
                  </button>
                  <button
                    onClick={handlePrint}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider cursor-pointer transition-all shadow-sm",
                      isDark
                        ? "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "bg-white/90 border-white hover:bg-white text-slate-700 shadow-slate-200/60"
                    )}
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
              </div>

              {/* 1. Stat Summary Bento row (Interactive quick navigation to tabs) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Active services box */}
                <button
                  onClick={() => setActiveTab('active')}
                  className={cn(
                    "border rounded-2xl p-5 text-left flex flex-col justify-between transition-all cursor-pointer backdrop-blur-xl shadow-md",
                    isDark
                      ? (activeTab === 'active'
                          ? "bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-950/20 ring-1 ring-indigo-500/30"
                          : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900")
                      : (activeTab === 'active'
                          ? "bg-white/90 border-indigo-500/50 shadow-lg shadow-indigo-100 ring-2 ring-indigo-500/20"
                          : "bg-white/75 border-white/90 hover:border-indigo-200 hover:bg-white/90 shadow-slate-200/50")
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider flex items-center justify-between",
                    isDark ? "text-slate-500" : "text-slate-500"
                  )}>
                    <span>Suscripciones Activas</span>
                    <ChevronRight className={cn("w-3.5 h-3.5", isDark ? "text-slate-600" : "text-slate-400")} />
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className={cn(
                      "text-3xl font-black",
                      isDark ? "text-white" : "text-slate-900"
                    )}>{activeServices.length}</span>
                    <span className={cn("text-xs font-semibold", isDark ? "text-slate-400" : "text-slate-500")}>Cuentas</span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold tracking-wider uppercase mt-3 flex items-center gap-1.5",
                    isDark ? "text-emerald-400" : "text-emerald-600"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isDark ? "bg-emerald-400" : "bg-emerald-500")} />
                    Acceso Disponible
                  </span>
                </button>

                {/* Unpaid / Expired accounts box */}
                <button
                  onClick={() => setActiveTab('unpaid')}
                  className={cn(
                    "border rounded-2xl p-5 text-left flex flex-col justify-between transition-all cursor-pointer backdrop-blur-xl shadow-md",
                    isDark
                      ? (activeTab === 'unpaid'
                          ? "bg-slate-900 border-amber-500/60 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30"
                          : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900")
                      : (activeTab === 'unpaid'
                          ? "bg-white/90 border-amber-500/50 shadow-lg shadow-amber-100 ring-2 ring-amber-500/20"
                          : "bg-white/75 border-white/90 hover:border-amber-200 hover:bg-white/90 shadow-slate-200/50")
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider flex items-center justify-between",
                    isDark ? "text-slate-500" : "text-slate-500"
                  )}>
                    <span>Por Pagar / Vencidas</span>
                    <ChevronRight className={cn("w-3.5 h-3.5", isDark ? "text-slate-600" : "text-slate-400")} />
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className={cn(
                      "text-3xl font-black",
                      isDark ? "text-white" : "text-slate-900"
                    )}>{receivables.length}</span>
                    <span className={cn("text-xs font-semibold", isDark ? "text-slate-400" : "text-slate-500")}>
                      {unpaidExpiredAccounts.length > 0 ? `(${unpaidExpiredAccounts.length} vencidas)` : 'Registros'}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold tracking-wider uppercase mt-3 flex items-center gap-1.5",
                    receivables.length > 0 
                      ? (isDark ? "text-amber-400" : "text-amber-600") 
                      : (isDark ? "text-emerald-400" : "text-emerald-600")
                  )}>
                    {receivables.length > 0 ? '⚠️ Por Liquidar o Conciliar' : '🎉 Totalmente al Día'}
                  </span>
                </button>

                {/* Balanced outstanding box */}
                <button
                  onClick={() => setActiveTab('unpaid')}
                  className={cn(
                    "border rounded-2xl p-5 text-left flex flex-col justify-between transition-all cursor-pointer backdrop-blur-xl shadow-md",
                    isDark
                      ? (activeTab === 'unpaid'
                          ? "bg-slate-900 border-rose-500/50 ring-1 ring-rose-500/30"
                          : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900 shadow-lg shadow-indigo-950/10")
                      : (activeTab === 'unpaid'
                          ? "bg-white/90 border-rose-500/50 shadow-lg shadow-rose-100 ring-2 ring-rose-500/20"
                          : "bg-white/75 border-white/90 hover:border-rose-200 hover:bg-white/90 shadow-slate-200/50")
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider flex items-center justify-between",
                    isDark ? "text-slate-500" : "text-slate-500"
                  )}>
                    <span>Valor General Pendiente</span>
                    <ChevronRight className={cn("w-3.5 h-3.5", isDark ? "text-slate-600" : "text-slate-400")} />
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className={cn(
                      "text-3xl font-black font-mono",
                      outstandingTotal > 0 
                        ? (isDark ? "text-rose-400" : "text-rose-600") 
                        : (isDark ? "text-emerald-400" : "text-emerald-600")
                    )}>
                      {formatCurrency(outstandingTotal)}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold tracking-wider uppercase mt-3",
                    isDark ? "text-indigo-400" : "text-indigo-600"
                  )}>
                    💰 Total Consolidado
                  </span>
                </button>

              </div>

              {/* 2. TAB NAVIGATION BAR */}
              <div className={cn(
                "p-1.5 rounded-2xl flex flex-wrap gap-1.5 sticky top-20 z-30 backdrop-blur-xl shadow-xl border transition-all duration-200",
                isDark 
                  ? "bg-slate-900/90 border-slate-800 shadow-black/30" 
                  : "bg-white/80 border-white/90 shadow-slate-200/70"
              )}>
                
                {/* Tab 1: Cuentas Activas */}
                <button
                  onClick={() => setActiveTab('active')}
                  className={cn(
                    "flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTab === 'active'
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : (isDark ? "text-slate-400 hover:text-white hover:bg-slate-800/60" : "text-slate-600 hover:text-slate-900 hover:bg-white/80")
                  )}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Activas</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono",
                    activeTab === 'active' 
                      ? "bg-white/20 text-white" 
                      : (isDark ? "bg-slate-800 text-slate-400" : "bg-slate-200/70 text-slate-700")
                  )}>
                    {activeServices.length}
                  </span>
                </button>

                {/* Tab 2: Por Pagar / Vencidas */}
                <button
                  onClick={() => setActiveTab('unpaid')}
                  className={cn(
                    "flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer relative",
                    activeTab === 'unpaid'
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                      : (isDark ? "text-slate-400 hover:text-white hover:bg-slate-800/60" : "text-slate-600 hover:text-slate-900 hover:bg-white/80")
                  )}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Por Pagar / Vencidas</span>
                  {receivables.length > 0 && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono",
                      activeTab === 'unpaid' 
                        ? "bg-white/20 text-white" 
                        : (isDark ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-amber-100 text-amber-800 border border-amber-200")
                    )}>
                      {receivables.length}
                    </span>
                  )}
                </button>

                {/* Tab 3: Catálogo */}
                <button
                  onClick={() => setActiveTab('catalog')}
                  className={cn(
                    "flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTab === 'catalog'
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : (isDark ? "text-slate-400 hover:text-white hover:bg-slate-800/60" : "text-slate-600 hover:text-slate-900 hover:bg-white/80")
                  )}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Catálogo</span>
                  {catalogItems.length > 0 && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono",
                      activeTab === 'catalog' 
                        ? "bg-white/20 text-white" 
                        : (isDark ? "bg-slate-800 text-slate-400" : "bg-slate-200/70 text-slate-700")
                    )}>
                      {catalogItems.length}
                    </span>
                  )}
                </button>

                {/* Tab 4: Cuentas de Pago */}
                <button
                  onClick={() => setActiveTab('payment_methods')}
                  className={cn(
                    "flex-1 min-w-[150px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTab === 'payment_methods'
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : (isDark ? "text-slate-400 hover:text-white hover:bg-slate-800/60" : "text-slate-600 hover:text-slate-900 hover:bg-white/80")
                  )}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Cuentas de Pago</span>
                  {merchantWallets.length > 0 && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono",
                      activeTab === 'payment_methods' 
                        ? "bg-white/20 text-white" 
                        : (isDark ? "bg-slate-800 text-slate-400" : "bg-slate-200/70 text-slate-700")
                    )}>
                      {merchantWallets.length}
                    </span>
                  )}
                </button>

              </div>

              {/* TAB 1: MIS SUSCRIPCIONES Y CUENTAS ACTIVAS */}
              {activeTab === 'active' && (
                <div className="flex flex-col gap-4">
                  <div className={cn(
                    "flex items-center justify-between pb-2 border-b",
                    isDark ? "border-slate-900" : "border-slate-200/80"
                  )}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <h3 className={cn(
                        "text-sm font-black uppercase tracking-wider",
                        isDark ? "text-white" : "text-slate-900"
                      )}>
                        🔑 Mis Suscripciones y Cuentas Premium ({activeServices.length})
                      </h3>
                    </div>
                    {catalogItems.length > 0 && (
                      <button
                        onClick={() => setActiveTab('catalog')}
                        className={cn(
                          "text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors",
                          isDark ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-700"
                        )}
                      >
                        <Tv className="w-3 h-3" />
                        <span>Ver más servicios en Catálogo</span>
                      </button>
                    )}
                  </div>

                  {activeServices.length === 0 ? (
                    <div className={cn(
                      "border rounded-2xl p-8 text-center font-semibold text-xs py-12 flex flex-col items-center gap-3 backdrop-blur-xl",
                      isDark 
                        ? "bg-slate-900/45 border-slate-800 text-slate-500" 
                        : "bg-white/75 border-white/90 text-slate-600 shadow-slate-200/50 shadow-md"
                    )}>
                      <p>No dispone de suscripciones digitales activas en este momento.</p>
                      {catalogItems.length > 0 && (
                        <button
                          onClick={() => setActiveTab('catalog')}
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
                        >
                          Explorar Catálogo de Servicios Disponibles
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeServices.map((service) => (
                      <div 
                        key={service.id}
                        className={cn(
                          "border rounded-2xl p-5 flex flex-col gap-4.5 transition-all text-left relative overflow-hidden backdrop-blur-xl shadow-md",
                          isDark 
                            ? "bg-slate-900 border-slate-800 hover:border-slate-700" 
                            : "bg-white/80 border-white/90 shadow-slate-200/60 hover:border-indigo-200"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest",
                              isDark ? "text-indigo-400" : "text-indigo-600"
                            )}>
                              Activo • Cuenta Digital
                            </span>
                            <h4 className={cn(
                              "text-lg font-black mt-0.5",
                              isDark ? "text-white" : "text-slate-900"
                            )}>
                              {service.name}
                            </h4>
                          </div>
                          
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase border flex items-center gap-1 shrink-0",
                            isDark 
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          )}>
                            <Calendar className={cn("w-3 h-3", isDark ? "text-indigo-400" : "text-indigo-600")} />
                            <span>Corte: {service.expirationDate || 'S/F'}</span>
                          </span>
                        </div>

                        {/* If registered or linked for a reseller with final client data */}
                        {(service.finalClientName || service.finalClientContact) && (
                          <div className={cn(
                            "border p-3 rounded-xl flex items-center justify-between gap-3 text-xs",
                            isDark 
                              ? "bg-slate-950/60 border-slate-800/80" 
                              : "bg-slate-50/80 border-slate-200/80"
                          )}>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className={cn(
                                "text-[8px] font-black uppercase tracking-wider flex items-center gap-1",
                                isDark ? "text-indigo-400" : "text-indigo-600"
                              )}>
                                <User className="w-2.5 h-2.5" /> Cliente Vinculado / Final
                              </span>
                              <span className={cn(
                                "font-bold truncate",
                                isDark ? "text-white" : "text-slate-900"
                              )}>
                                {service.finalClientName || 'Cliente Asignado'}
                              </span>
                              {service.finalClientContact && (
                                <span className={cn(
                                  "text-[10px] font-mono",
                                  isDark ? "text-slate-400" : "text-slate-600"
                                )}>
                                  {service.finalClientContact}
                                </span>
                              )}
                            </div>
                            {service.finalClientContact && (
                              <a
                                href={`https://wa.me/${cleanPhoneNumber(service.finalClientContact)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "px-2.5 py-1.5 border rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer",
                                  isDark 
                                    ? "bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/30" 
                                    : "bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-300 shadow-sm"
                                )}
                                title="Contactar por WhatsApp al cliente"
                              >
                                <Phone className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Credentials box */}
                        {service.email && (
                          <div className={cn(
                            "border p-3.5 rounded-xl flex flex-col gap-2.5 text-xs font-semibold",
                            isDark 
                              ? "bg-slate-950/80 border-slate-900" 
                              : "bg-slate-50/90 border-slate-200/90"
                          )}>
                            <div className="flex justify-between items-center gap-1.5">
                              <span className={isDark ? "text-slate-500" : "text-slate-600"}>Email:</span>
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "font-mono break-all text-right font-bold",
                                  isDark ? "text-slate-200" : "text-slate-900"
                                )}>{service.email}</span>
                                <button 
                                  onClick={() => handleCopy(service.email, service.id + '_email')}
                                  className={cn(
                                    "p-1 transition-colors cursor-pointer",
                                    isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-800"
                                  )}
                                >
                                  {copiedId === service.id + '_email' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            <div className="flex justify-between items-center gap-1.5">
                              <span className={isDark ? "text-slate-500" : "text-slate-600"}>Clave:</span>
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "font-mono font-bold",
                                  isDark ? "text-slate-200" : "text-slate-900"
                                )}>
                                  {visibleCredentials[service.id] ? service.password : '••••••••'}
                                </span>
                                <button 
                                  onClick={() => toggleCredential(service.id)}
                                  className={cn(
                                    "p-1 transition-colors cursor-pointer",
                                    isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-800"
                                  )}
                                >
                                  {visibleCredentials[service.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button 
                                  onClick={() => handleCopy(service.password, service.id + '_pass')}
                                  className={cn(
                                    "p-1 transition-colors cursor-pointer",
                                    isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-800"
                                  )}
                                >
                                  {copiedId === service.id + '_pass' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            {service.pin && (
                              <div className="flex justify-between items-center gap-1.5">
                                <span className={isDark ? "text-slate-500" : "text-slate-600"}>Perfil / PIN:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    "font-bold",
                                    isDark ? "text-white" : "text-slate-900"
                                  )}>{service.pin}</span>
                                  <button 
                                    onClick={() => handleCopy(service.pin, service.id + '_pin')}
                                    className={cn(
                                      "p-1 transition-colors cursor-pointer",
                                      isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-800"
                                    )}
                                  >
                                    {copiedId === service.id + '_pin' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {/* BOT Access box */}
                        {service.isBot && service.botUrl && (
                          <div className={cn(
                            "border p-3.5 rounded-xl flex flex-col gap-2.5 text-xs font-semibold",
                            isDark 
                              ? "bg-slate-950/80 border-indigo-500/30" 
                              : "bg-indigo-50/60 border-indigo-200"
                          )}>
                            <div className={cn(
                              "flex justify-between items-center pb-1.5 border-b",
                              isDark ? "border-indigo-500/20" : "border-indigo-200/60"
                            )}>
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5",
                                isDark ? "text-indigo-400" : "text-indigo-700"
                              )}>
                                <Bot className="w-3.5 h-3.5" />
                                <span>Acceso por BOT / Plataforma</span>
                              </span>
                              <a 
                                href={service.botUrl.startsWith('http') ? service.botUrl : `https://${service.botUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all",
                                  isDark 
                                    ? "text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/40 border-indigo-500/30" 
                                    : "text-indigo-700 hover:text-white bg-indigo-100 hover:bg-indigo-600 border-indigo-300"
                                )}
                              >
                                <span>Ir a la Página</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>

                            <div className="flex justify-between items-center gap-1.5">
                              <span className={isDark ? "text-slate-500" : "text-slate-600"}>Página:</span>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={cn(
                                  "font-mono break-all text-right truncate font-bold",
                                  isDark ? "text-indigo-300" : "text-indigo-700"
                                )}>{service.botUrl}</span>
                                <button 
                                  onClick={() => handleCopy(service.botUrl, service.id + '_bot_url')}
                                  className={cn(
                                    "p-1 transition-colors cursor-pointer shrink-0",
                                    isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-800"
                                  )}
                                  title="Copiar URL"
                                >
                                  {copiedId === service.id + '_bot_url' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            {service.botUser && (
                              <div className="flex justify-between items-center gap-1.5">
                                <span className={isDark ? "text-slate-500" : "text-slate-600"}>Usuario BOT:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    "font-mono text-right font-bold",
                                    isDark ? "text-slate-200" : "text-slate-900"
                                  )}>{service.botUser}</span>
                                  <button 
                                    onClick={() => handleCopy(service.botUser, service.id + '_bot_user')}
                                    className={cn(
                                      "p-1 transition-colors cursor-pointer",
                                      isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-800"
                                    )}
                                    title="Copiar Usuario"
                                  >
                                    {copiedId === service.id + '_bot_user' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                            )}

                            {service.botPassword && (
                              <div className="flex justify-between items-center gap-1.5">
                                <span className={isDark ? "text-slate-500" : "text-slate-600"}>Clave BOT:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    "font-mono font-bold",
                                    isDark ? "text-slate-200" : "text-slate-900"
                                  )}>
                                    {visibleCredentials[service.id + '_bot_pass'] ? service.botPassword : '••••••••'}
                                  </span>
                                  <button 
                                    onClick={() => toggleCredential(service.id + '_bot_pass')}
                                    className={cn(
                                      "p-1 transition-colors cursor-pointer",
                                      isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-800"
                                    )}
                                    title={visibleCredentials[service.id + '_bot_pass'] ? "Ocultar" : "Mostrar"}
                                  >
                                    {visibleCredentials[service.id + '_bot_pass'] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                  <button 
                                    onClick={() => handleCopy(service.botPassword, service.id + '_bot_pass_copy')}
                                    className={cn(
                                      "p-1 transition-colors cursor-pointer",
                                      isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-800"
                                    )}
                                    title="Copiar Clave"
                                  >
                                    {copiedId === service.id + '_bot_pass_copy' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {!service.email && !service.isBot && (
                          <div className={cn(
                            "text-[10px] font-semibold italic",
                            isDark ? "text-slate-500" : "text-slate-500"
                          )}>
                            Los datos de acceso no han sido provistos para esta cuenta.
                          </div>
                        )}
                        
                        <div className={cn(
                          "flex justify-between items-center pt-2 border-t text-[10px] font-bold",
                          isDark ? "border-slate-800" : "border-slate-200"
                        )}>
                          <span className={isDark ? "text-slate-500" : "text-slate-600"}>Monto del servicio:</span>
                          <span className={cn("font-mono", isDark ? "text-white" : "text-slate-900")}>
                            {formatCurrency(service.revenue || 0)}
                          </span>
                        </div>

                        {/* Action buttons: Solicitar Renovación & Solicitar Soporte */}
                        <div className={cn(
                          "grid grid-cols-2 gap-2 pt-1 border-t",
                          isDark ? "border-slate-800/80" : "border-slate-200/80"
                        )}>
                          <button
                            onClick={() => handleRequestRenewal(service)}
                            className={cn(
                              "flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-[0.98] border",
                              isDark 
                                ? "bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border-indigo-500/30" 
                                : "bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border-indigo-200 shadow-sm"
                            )}
                            title="Solicitar renovación por WhatsApp"
                          >
                            <RefreshCw className="w-3 h-3 shrink-0" />
                            <span className="truncate">Solicitar Renovación</span>
                          </button>
                          <button
                            onClick={() => handleRequestSupport(service)}
                            className={cn(
                              "flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-[0.98] border",
                              isDark 
                                ? "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700" 
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200"
                            )}
                            title="Reportar problema o solicitar soporte por WhatsApp"
                          >
                            <LifeBuoy className="w-3 h-3 shrink-0" />
                            <span className="truncate">Solicitar Soporte</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: POR PAGAR / CUENTAS VENCIDAS */}
            {activeTab === 'unpaid' && (
              <div className="flex flex-col gap-6">
                
                {/* Header info & action */}
                <div className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b",
                  isDark ? "border-slate-900" : "border-slate-200/80"
                )}>
                  <div>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 mb-1 border",
                      isDark 
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                      <AlertTriangle className="w-3 h-3" /> Control de Cobranza & Vencimientos
                    </span>
                    <h3 className={cn(
                      "text-lg font-black",
                      isDark ? "text-white" : "text-slate-900"
                    )}>
                      Cuentas Vencidas y Pagos Pendientes
                    </h3>
                    <p className={cn(
                      "text-xs font-semibold mt-0.5",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>
                      Detalle exacto de credenciales de cuentas vencidas no liquidadas y trámites pendientes.
                    </p>
                  </div>

                  <button
                    onClick={handleOpenBlankWhatsApp}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Reportar Comprobante</span>
                  </button>
                </div>

                {/* Sub-block A: Cuentas Digitales Vencidas con Usuario / Correo y Vencimiento */}
                {unpaidExpiredAccounts.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <h4 className={cn(
                        "text-sm font-black uppercase tracking-wider flex items-center gap-2",
                        isDark ? "text-rose-300" : "text-rose-700"
                      )}>
                        <span>Cuentas Vencidas Pendientes de Pago ({unpaidExpiredAccounts.length})</span>
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {unpaidExpiredAccounts.map((account) => {
                        const emailUser = account.isBot && account.botUser ? account.botUser : (account.email || 'No provisto');
                        return (
                          <div 
                            key={account.id}
                            className={cn(
                              "border rounded-2xl p-5 flex flex-col justify-between gap-4 text-left relative overflow-hidden backdrop-blur-xl shadow-lg",
                              isDark 
                                ? "bg-rose-950/15 border-rose-500/30 shadow-rose-950/20" 
                                : "bg-white/85 border-rose-200/80 shadow-rose-100/50"
                            )}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
                                  isDark ? "text-rose-400" : "text-rose-600"
                                )}>
                                  <Clock className="w-3 h-3" /> Cuenta Vencida • Requiere Pago
                                </span>
                                <h5 className={cn(
                                  "text-lg font-black mt-0.5",
                                  isDark ? "text-white" : "text-slate-900"
                                )}>
                                  {account.name}
                                </h5>
                                {account.pin && (
                                  <span className={cn(
                                    "text-xs font-semibold",
                                    isDark ? "text-slate-400" : "text-slate-600"
                                  )}>
                                    Perfil / PIN: <strong className={isDark ? "text-white" : "text-slate-900"}>{account.pin}</strong>
                                  </span>
                                )}
                              </div>
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase border shrink-0",
                                isDark 
                                  ? "bg-rose-500/20 text-rose-300 border-rose-500/30" 
                                  : "bg-rose-100 text-rose-800 border-rose-200"
                              )}>
                                Vencida: {account.expirationDate || 'S/F'}
                              </span>
                            </div>

                            {/* Control exacto de Usuario / Correo asignado */}
                            <div className={cn(
                              "border p-3.5 rounded-xl flex flex-col gap-2 text-xs",
                              isDark 
                                ? "bg-slate-950/80 border-rose-500/20" 
                                : "bg-rose-50/60 border-rose-200/80"
                            )}>
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-wider flex items-center gap-1",
                                isDark ? "text-slate-400" : "text-slate-700"
                              )}>
                                <User className="w-3 h-3 text-rose-500" />
                                Usuario / Correo Asignado:
                              </span>
                              <div className={cn(
                                "flex items-center justify-between gap-2 px-3 py-2 rounded-lg border",
                                isDark 
                                  ? "bg-slate-900/90 border-slate-800" 
                                  : "bg-white border-rose-200 shadow-sm"
                              )}>
                                <span className={cn(
                                  "font-mono font-bold truncate text-xs select-all",
                                  isDark ? "text-rose-200" : "text-rose-800"
                                )}>
                                  {emailUser}
                                </span>
                                <button
                                  onClick={() => handleCopy(emailUser, account.id + '_unpaid_user')}
                                  className={cn(
                                    "p-1 transition-colors cursor-pointer shrink-0",
                                    isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                                  )}
                                  title="Copiar usuario o correo"
                                >
                                  {copiedId === account.id + '_unpaid_user' ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>

                              <div className={cn(
                                "flex justify-between items-center text-[11px] pt-1",
                                isDark ? "text-slate-400" : "text-slate-600"
                              )}>
                                <span>Fecha de corte registrada:</span>
                                <span className={cn(
                                  "font-mono font-bold",
                                  isDark ? "text-white" : "text-slate-900"
                                )}>{account.expirationDate || 'Sin fecha'}</span>
                              </div>
                            </div>

                            {/* Saldo y acción */}
                            <div className={cn(
                              "flex items-center justify-between pt-2 border-t",
                              isDark ? "border-rose-500/20" : "border-rose-200"
                            )}>
                              <div className="flex flex-col">
                                <span className={cn(
                                  "text-[9px] uppercase font-bold",
                                  isDark ? "text-slate-400" : "text-slate-500"
                                )}>Valor Pendiente</span>
                                <span className={cn(
                                  "text-xl font-black font-mono",
                                  isDark ? "text-rose-400" : "text-rose-600"
                                )}>
                                  {formatCurrency(account.revenue || 0)}
                                </span>
                              </div>

                              <button
                                onClick={() => handleReportUnpaidAccount(account)}
                                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                                title="Reportar pago o solicitar reactivación por WhatsApp"
                              >
                                <Send className="w-3 h-3" />
                                <span>Reportar Pago</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-block B: Outstanding Receivables Statement / Table (Trámites y Cuentas) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <h4 className={cn(
                      "text-sm font-black uppercase tracking-wider",
                      isDark ? "text-white" : "text-slate-900"
                    )}>
                      Consolidado General de Trámites y Servicios Pendientes ({receivables.length})
                    </h4>
                  </div>

                  {receivables.length === 0 ? (
                    <div className={cn(
                      "border rounded-2xl p-8 text-center font-semibold text-xs py-12 backdrop-blur-xl",
                      isDark 
                        ? "bg-slate-900/45 border-slate-800 text-slate-500" 
                        : "bg-white/75 border-white/90 text-slate-600 shadow-md shadow-slate-200/50"
                    )}>
                      🎉 ¡Todo al día! No registra valores o trámites pendientes de pago en este momento.
                    </div>
                  ) : (
                    <div className={cn(
                      "border rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl",
                      isDark ? "bg-slate-900 border-slate-800" : "bg-white/85 border-white/90 shadow-slate-200/60"
                    )}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className={cn(
                              "border-b text-[9px] font-black uppercase tracking-wider",
                              isDark ? "bg-slate-950 border-slate-800 text-slate-500" : "bg-slate-100/90 border-slate-200 text-slate-700"
                            )}>
                              <th className="p-4">Origen / Detalle</th>
                              <th className="p-4">Fecha Vence</th>
                              <th className="p-4 text-right">Valor Total</th>
                              <th className="p-4 text-right">Saldo Cancelado</th>
                              <th className="p-4 text-right">Saldo Pendiente</th>
                            </tr>
                          </thead>
                          <tbody className={cn("divide-y", isDark ? "divide-slate-800" : "divide-slate-200")}>
                            {receivables.map((r, i) => (
                              <tr key={r.id + '_' + i} className={cn(
                                "transition-colors font-semibold",
                                isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50/70"
                              )}>
                                <td className="p-4">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        isDark ? "text-indigo-400" : "text-indigo-700"
                                      )}>{r.source}</span>
                                      {r.status === 'active' && (
                                        <span className={cn(
                                          "px-1.5 py-0.5 rounded text-[8px] font-black border",
                                          isDark ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                        )}>Activa</span>
                                      )}
                                      {r.status === 'expired' && (
                                        <span className={cn(
                                          "px-1.5 py-0.5 rounded text-[8px] font-black border",
                                          isDark ? "bg-rose-500/10 text-rose-300 border-rose-500/20" : "bg-rose-50 text-rose-700 border-rose-200"
                                        )}>Vencida</span>
                                      )}
                                    </div>
                                    <span className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>
                                      {r.description}
                                    </span>
                                    
                                    {/* Reseller final client information if applicable */}
                                    {(r.finalClientName || r.finalClientContact) && (
                                      <div className={cn(
                                        "mt-1 flex flex-wrap items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg w-fit border",
                                        isDark ? "bg-slate-950/70 border-slate-800/80" : "bg-slate-100/90 border-slate-200"
                                      )}>
                                        <span className={cn("flex items-center gap-1 font-normal", isDark ? "text-slate-400" : "text-slate-600")}>
                                          <User className={cn("w-3 h-3", isDark ? "text-indigo-400" : "text-indigo-600")} />
                                          Cliente: <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{r.finalClientName || 'Asignado'}</strong>
                                        </span>
                                        {r.finalClientContact && (
                                          <a
                                            href={`https://wa.me/${cleanPhoneNumber(r.finalClientContact)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cn(
                                              "font-mono font-bold flex items-center gap-1 hover:underline ml-1",
                                              isDark ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-600 hover:text-emerald-700"
                                            )}
                                            title="Contactar al cliente final por WhatsApp"
                                          >
                                            <Phone className="w-3 h-3" />
                                            {r.finalClientContact}
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className={cn("p-4 font-mono whitespace-nowrap", isDark ? "text-slate-400" : "text-slate-600")}>
                                  {r.dueDate}
                                </td>
                                <td className={cn("p-4 text-right font-mono", isDark ? "text-slate-400" : "text-slate-600")}>
                                  {formatCurrency(r.totalAmount)}
                                </td>
                                <td className={cn("p-4 text-right font-mono", isDark ? "text-emerald-500" : "text-emerald-600 font-bold")}>
                                  {formatCurrency(r.totalAmount - r.pendingAmount)}
                                </td>
                                <td className={cn("p-4 text-right font-bold font-mono", isDark ? "text-rose-400" : "text-rose-600")}>
                                  {formatCurrency(r.pendingAmount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className={cn(
                              "border-t-2 text-xs font-black",
                              isDark ? "bg-slate-950/90 border-slate-800" : "bg-slate-100/95 border-slate-200"
                            )}>
                              <td className={cn("p-4 uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                  <span>Total General Pendiente de Cancelar</span>
                                </div>
                              </td>
                              <td className={cn("p-4 font-normal italic text-[11px]", isDark ? "text-slate-500" : "text-slate-500")}>
                                {receivables.length} registro(s)
                              </td>
                              <td className={cn("p-4 text-right font-mono", isDark ? "text-slate-300" : "text-slate-700")}>
                                {formatCurrency(receivables.reduce((sum, r) => sum + (r.totalAmount || 0), 0))}
                              </td>
                              <td className={cn("p-4 text-right font-mono", isDark ? "text-emerald-400" : "text-emerald-600")}>
                                {formatCurrency(receivables.reduce((sum, r) => sum + ((r.totalAmount || 0) - (r.pendingAmount || 0)), 0))}
                              </td>
                              <td className={cn("p-4 text-right text-sm font-black font-mono", isDark ? "text-rose-400" : "text-rose-600")}>
                                {formatCurrency(receivables.reduce((sum, r) => sum + (r.pendingAmount || 0), 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Help Notes Footer */}
                <div className={cn(
                  "border rounded-2xl p-5 text-left text-xs flex gap-3 leading-relaxed font-semibold backdrop-blur-xl",
                  isDark 
                    ? "bg-slate-900/30 border-slate-800 text-slate-400" 
                    : "bg-white/75 border-white/90 text-slate-600 shadow-md shadow-slate-200/50"
                )}>
                  <HelpCircle className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-indigo-400" : "text-indigo-600")} />
                  <div>
                    <p className={cn("font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>
                      💡 ¿Cómo reportar un abono o solicitar asistencia?
                    </p>
                    <p>
                      Si ha realizado una transferencia para liquidar alguno de estos montos o cuentas vencidas, envíe el comprobante de pago con el número de recibo o su nombre directo para conciliar el saldo y reactivar el servicio inmediatamente.
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: CATÁLOGO DE SERVICIOS, JUEGOS Y TRÁMITES */}
            {activeTab === 'catalog' && (
              <div className="flex flex-col gap-6">
                
                {/* 🌟 USER REQUESTED CTA: "PUEDES GENERAR INGRESOS CON LA VENTA DE ESTOS SERVICIOS CON PRECIOS PREFERENCIALES..." */}
                <div className={cn(
                  "border rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-5 backdrop-blur-xl",
                  isDark 
                    ? "bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border-emerald-500/30" 
                    : "bg-gradient-to-r from-emerald-500/10 via-white/80 to-indigo-500/10 border-emerald-500/30 shadow-emerald-900/5"
                )}>
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border inline-flex items-center gap-1",
                        isDark 
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                          : "bg-emerald-50 text-emerald-700 border-emerald-300"
                      )}>
                        <Sparkles className="w-3 h-3" /> Oportunidad de Negocio
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                        isDark 
                          ? "bg-slate-800 text-slate-300 border-transparent" 
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      )}>
                        {clientEntityType === 'reseller' ? 'Perfil Distribuidor' : clientEntityType === 'intermediary' ? 'Perfil Intermediario' : 'Cliente Final'}
                      </span>
                    </div>

                    <h3 className={cn(
                      "text-base sm:text-lg font-black leading-snug tracking-tight",
                      isDark ? "text-white" : "text-slate-900"
                    )}>
                      PUEDES GENERAR INGRESOS CON LA VENTA DE ESTOS SERVICIOS CON PRECIOS PREFERENCIALES, SOLICITA MÁS INFORMACIÓN AQUÍ
                    </h3>

                    <p className={cn(
                      "text-xs font-semibold leading-relaxed",
                      isDark ? "text-slate-300" : "text-slate-700"
                    )}>
                      Conviértase en distribuidor o revendedor autorizado de suscripciones, recargas de juegos y trámites. Obtenga márgenes de ganancia atractivos y atención prioritaria.
                    </p>
                  </div>

                  <button
                    onClick={handleRequestResellerInfo}
                    className="px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-600/30 hover:scale-105 active:scale-95 cursor-pointer shrink-0 w-full sm:w-auto"
                  >
                    <Send className="w-4 h-4" />
                    <span>Solicitar Información por WhatsApp</span>
                  </button>
                </div>

                {/* Sub-Category Navigation Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setCatalogSection('all')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                      catalogSection === 'all'
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                        : isDark
                        ? "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                        : "bg-white/80 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white shadow-sm"
                    )}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Todos</span>
                  </button>

                  <button
                    onClick={() => setCatalogSection('subscriptions')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                      catalogSection === 'subscriptions'
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                        : isDark
                        ? "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                        : "bg-white/80 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white shadow-sm"
                    )}
                  >
                    <Tv className={cn("w-3.5 h-3.5", isDark ? "text-emerald-400" : "text-emerald-600")} />
                    <span>Suscripciones ({catalogItems.length})</span>
                  </button>

                  <button
                    onClick={() => setCatalogSection('games')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                      catalogSection === 'games'
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-600/25"
                        : isDark
                        ? "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                        : "bg-white/80 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white shadow-sm"
                    )}
                  >
                    <Gamepad2 className={cn("w-3.5 h-3.5", isDark ? "text-violet-400" : "text-violet-600")} />
                    <span>Recarga de Juegos ({gameRecharges.length})</span>
                  </button>

                  <button
                    onClick={() => setCatalogSection('tramites')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
                      catalogSection === 'tramites'
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                        : isDark
                        ? "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                        : "bg-white/80 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white shadow-sm"
                    )}
                  >
                    <FileText className={cn("w-3.5 h-3.5", isDark ? "text-indigo-400" : "text-indigo-600")} />
                    <span>Trámites ({tramitesCatalog.length})</span>
                  </button>
                </div>

                {/* Filter and tariff info bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className={cn(
                      "w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2",
                      isDark ? "text-slate-500" : "text-slate-400"
                    )} />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Buscar por servicio, juego, paquete o trámite..."
                      className={cn(
                        "w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-all",
                        isDark 
                          ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500/50" 
                          : "bg-white/90 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 shadow-sm"
                      )}
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      "font-semibold",
                      isDark ? "text-slate-400" : "text-slate-600"
                    )}>Tarifa aplicada:</span>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full font-black text-[10px] uppercase tracking-wider border",
                      clientEntityType === 'reseller'
                        ? isDark ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : clientEntityType === 'intermediary'
                        ? isDark ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-amber-50 text-amber-700 border-amber-200"
                        : isDark ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200"
                    )}>
                      {clientEntityType === 'reseller' ? '💼 Precios Revendedor / Mayorista' : clientEntityType === 'intermediary' ? '🤝 Precios Intermediario' : '🛍️ Precios al Público (PVP)'}
                    </span>
                  </div>
                </div>

                {/* 1. SECCIÓN: RECARGA DE JUEGOS */}
                {(catalogSection === 'all' || catalogSection === 'games') && (
                  <div className="space-y-4">
                    <div className={cn(
                      "flex items-center justify-between border-b pb-2",
                      isDark ? "border-slate-800" : "border-slate-200"
                    )}>
                      <h4 className={cn(
                        "text-sm font-black uppercase tracking-wider flex items-center gap-2",
                        isDark ? "text-violet-300" : "text-violet-900"
                      )}>
                        <Gamepad2 className={cn("w-4 h-4", isDark ? "text-violet-400" : "text-violet-600")} />
                        <span>Recarga de Juegos y Monedas Digitales ({gameRecharges.length})</span>
                      </h4>
                      <span className={cn(
                        "text-[10px]",
                        isDark ? "text-slate-400" : "text-slate-600"
                      )}>Entrega rápida con UID directo</span>
                    </div>

                    {gameRecharges.length === 0 ? (
                      <div className={cn(
                        "border rounded-2xl p-8 text-center text-xs backdrop-blur-xl",
                        isDark ? "bg-slate-900/45 border-slate-800 text-slate-500" : "bg-white/80 border-slate-200 text-slate-600 shadow-sm"
                      )}>
                        No hay juegos disponibles en este momento.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {gameRecharges
                          .filter((game) => {
                            if (!catalogSearch.trim()) return true;
                            const q = catalogSearch.toLowerCase();
                            return (
                              game.name?.toLowerCase().includes(q) ||
                              game.category?.toLowerCase().includes(q) ||
                              game.requirements?.toLowerCase().includes(q) ||
                              game.packages?.some((p: any) => p.name?.toLowerCase().includes(q))
                            );
                          })
                          .map((game) => {
                            const pkgs = game.packages || [];
                            return (
                              <div
                                key={game.id}
                                className={cn(
                                  "border rounded-2xl p-5 flex flex-col justify-between gap-4 text-left transition-all shadow-lg backdrop-blur-xl",
                                  isDark 
                                    ? "bg-slate-900 border-slate-800 hover:border-violet-500/40 hover:shadow-violet-950/20" 
                                    : "bg-white/85 border-white/90 shadow-slate-200/60 hover:border-violet-300"
                                )}
                              >
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className={cn(
                                        "p-2 rounded-xl border",
                                        isDark ? "bg-violet-600/10 text-violet-400 border-violet-500/20" : "bg-violet-50 text-violet-700 border-violet-200"
                                      )}>
                                        <Gamepad2 className="w-5 h-5" />
                                      </div>
                                      <div>
                                        <h5 className={cn("text-base font-black", isDark ? "text-white" : "text-slate-900")}>
                                          {game.name}
                                        </h5>
                                        <span className={cn(
                                          "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                                          isDark ? "bg-slate-800 text-violet-300 border-transparent" : "bg-violet-50 text-violet-700 border-violet-200"
                                        )}>
                                          {game.category || 'Videojuego'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Requisitos para recargar */}
                                  <div className={cn(
                                    "p-3 rounded-xl border text-xs space-y-1",
                                    isDark ? "bg-slate-950/80 border-slate-800" : "bg-amber-50/60 border-amber-200/80"
                                  )}>
                                    <div className={cn(
                                      "flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider",
                                      isDark ? "text-amber-400" : "text-amber-700"
                                    )}>
                                      <ShieldAlert className="w-3 h-3" />
                                      <span>Requisitos para la Recarga:</span>
                                    </div>
                                    <p className={cn(
                                      "text-[11px] leading-relaxed",
                                      isDark ? "text-slate-300" : "text-slate-700"
                                    )}>
                                      {game.requirements || 'ID de Jugador (UID) + Nickname de la cuenta'}
                                    </p>
                                  </div>

                                  {game.instructions && (
                                    <div className={cn(
                                      "text-[10px] flex items-center gap-1",
                                      isDark ? "text-slate-400" : "text-slate-600"
                                    )}>
                                      <Clock className={cn("w-3 h-3 shrink-0", isDark ? "text-slate-500" : "text-slate-400")} />
                                      <span>{game.instructions}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Paquetes disponibles */}
                                <div className={cn(
                                  "space-y-2 pt-2 border-t",
                                  isDark ? "border-slate-800" : "border-slate-200"
                                )}>
                                  <span className={cn(
                                    "text-[10px] font-black uppercase tracking-wider flex items-center gap-1",
                                    isDark ? "text-slate-400" : "text-slate-600"
                                  )}>
                                    <Coins className={cn("w-3 h-3", isDark ? "text-amber-400" : "text-amber-600")} />
                                    Paquetes Disponibles:
                                  </span>

                                  {pkgs.length === 0 ? (
                                    <p className={cn("text-xs italic", isDark ? "text-slate-500" : "text-slate-500")}>
                                      Consulte precios por WhatsApp.
                                    </p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                      {pkgs.map((pkg: any) => {
                                        const price = getGamePackagePrice(pkg);
                                        return (
                                          <div
                                            key={pkg.id}
                                            className={cn(
                                              "p-2 rounded-xl border flex items-center justify-between gap-2 transition-colors",
                                              isDark 
                                                ? "bg-slate-950 border-slate-800/80 hover:border-slate-700" 
                                                : "bg-slate-50/90 border-slate-200/90 hover:border-slate-300"
                                            )}
                                          >
                                            <div className="min-w-0 flex-1">
                                              <div className={cn("text-xs font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
                                                {pkg.name}
                                              </div>
                                              <div className={cn(
                                                "text-[11px] font-mono font-black",
                                                isDark ? "text-emerald-400" : "text-emerald-600"
                                              )}>
                                                {formatCurrency(price)}
                                              </div>
                                            </div>

                                            <button
                                              onClick={() => handleRequestGameRecharge(game, pkg)}
                                              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow"
                                              title="Recargar este paquete vía WhatsApp"
                                            >
                                              <Send className="w-2.5 h-2.5" />
                                              <span>Recargar</span>
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. SECCIÓN: TRÁMITES */}
                {(catalogSection === 'all' || catalogSection === 'tramites') && (
                  <div className="space-y-4">
                    <div className={cn(
                      "flex items-center justify-between border-b pb-2",
                      isDark ? "border-slate-800" : "border-slate-200"
                    )}>
                      <h4 className={cn(
                        "text-sm font-black uppercase tracking-wider flex items-center gap-2",
                        isDark ? "text-indigo-300" : "text-indigo-900"
                      )}>
                        <FileText className={cn("w-4 h-4", isDark ? "text-indigo-400" : "text-indigo-600")} />
                        <span>Trámites, Gestiones ANT y Asesoría ({tramitesCatalog.length})</span>
                      </h4>
                      <span className={cn(
                        "text-[10px]",
                        isDark ? "text-slate-400" : "text-slate-600"
                      )}>Atención personalizada y segura</span>
                    </div>

                    {tramitesCatalog.length === 0 ? (
                      <div className={cn(
                        "border rounded-2xl p-8 text-center text-xs backdrop-blur-xl",
                        isDark ? "bg-slate-900/45 border-slate-800 text-slate-500" : "bg-white/80 border-slate-200 text-slate-600 shadow-sm"
                      )}>
                        No hay trámites catalogados en este momento.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {tramitesCatalog
                          .filter((tramite) => {
                            if (!catalogSearch.trim()) return true;
                            const q = catalogSearch.toLowerCase();
                            return (
                              tramite.name?.toLowerCase().includes(q) ||
                              tramite.category?.toLowerCase().includes(q) ||
                              tramite.requirements?.toLowerCase().includes(q) ||
                              tramite.notes?.toLowerCase().includes(q)
                            );
                          })
                          .map((tramite) => {
                            const price = getTramitePrice(tramite);
                            const hasPrice = price > 0;
                            return (
                              <div
                                key={tramite.id}
                                className={cn(
                                  "border rounded-2xl p-5 flex flex-col justify-between gap-4 text-left transition-all shadow-lg backdrop-blur-xl",
                                  isDark 
                                    ? "bg-slate-900 border-slate-800 hover:border-indigo-500/40 hover:shadow-indigo-950/20" 
                                    : "bg-white/85 border-white/90 shadow-slate-200/60 hover:border-indigo-200"
                                )}
                              >
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <span className={cn(
                                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border mb-1 inline-block",
                                        isDark ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                      )}>
                                        {tramite.category || 'Trámite'}
                                      </span>
                                      <h5 className={cn("text-base font-black leading-snug", isDark ? "text-white" : "text-slate-900")}>
                                        {tramite.name}
                                      </h5>
                                    </div>
                                  </div>

                                  {/* Requirements */}
                                  <div className={cn(
                                    "p-3 rounded-xl border text-xs space-y-1",
                                    isDark ? "bg-slate-950/80 border-slate-800" : "bg-indigo-50/60 border-indigo-200/80"
                                  )}>
                                    <div className={cn(
                                      "flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider",
                                      isDark ? "text-indigo-400" : "text-indigo-700"
                                    )}>
                                      <ShieldCheck className="w-3 h-3" />
                                      <span>Requisitos Documentales:</span>
                                    </div>
                                    <p className={cn(
                                      "text-[11px] leading-relaxed",
                                      isDark ? "text-slate-300" : "text-slate-700"
                                    )}>
                                      {tramite.requirements || 'Consulte los requisitos vigentes con su asesor por WhatsApp.'}
                                    </p>
                                  </div>

                                  {tramite.notes && (
                                    <p className={cn(
                                      "text-[11px] italic",
                                      isDark ? "text-slate-400" : "text-slate-600"
                                    )}>
                                      {tramite.notes}
                                    </p>
                                  )}
                                </div>

                                <div className={cn(
                                  "pt-3 border-t flex items-center justify-between gap-2",
                                  isDark ? "border-slate-800" : "border-slate-200"
                                )}>
                                  <div className="flex flex-col">
                                    <span className={cn(
                                      "text-[9px] font-bold uppercase",
                                      isDark ? "text-slate-500" : "text-slate-600"
                                    )}>
                                      {hasPrice ? (clientEntityType === 'reseller' ? 'Precio Revendedor' : 'Tarifa') : 'Cotización'}
                                    </span>
                                    {hasPrice ? (
                                      <span className={cn(
                                        "text-xl font-black font-mono",
                                        isDark ? "text-emerald-400" : "text-emerald-600"
                                      )}>
                                        {formatCurrency(price)}
                                      </span>
                                    ) : (
                                      <span className={cn(
                                        "text-xs font-bold",
                                        isDark ? "text-amber-400" : "text-amber-700"
                                      )}>
                                        Bajo Consulta
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => handleRequestTramite(tramite)}
                                    className={cn(
                                      "px-3.5 py-2.5 rounded-xl text-white font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer",
                                      hasPrice ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20" : "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
                                    )}
                                    title={hasPrice ? "Solicitar este trámite por WhatsApp" : "Pedir más información por WhatsApp"}
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>{hasPrice ? 'Solicitar' : 'Pedir más información'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. SECCIÓN: SUSCRIPCIONES DIGITALES */}
                {(catalogSection === 'all' || catalogSection === 'subscriptions') && (
                  <div className="space-y-4">
                    <div className={cn(
                      "flex items-center justify-between border-b pb-2",
                      isDark ? "border-slate-800" : "border-slate-200"
                    )}>
                      <h4 className={cn(
                        "text-sm font-black uppercase tracking-wider flex items-center gap-2",
                        isDark ? "text-emerald-300" : "text-emerald-900"
                      )}>
                        <Tv className={cn("w-4 h-4", isDark ? "text-emerald-400" : "text-emerald-600")} />
                        <span>Suscripciones Digitales & Streaming ({catalogItems.length})</span>
                      </h4>
                      <span className={cn(
                        "text-[10px]",
                        isDark ? "text-slate-400" : "text-slate-600"
                      )}>Cuentas completas y perfiles con garantía</span>
                    </div>

                    {catalogItems.length === 0 ? (
                      <div className={cn(
                        "border rounded-2xl p-12 text-center font-semibold text-xs flex flex-col items-center gap-3 backdrop-blur-xl",
                        isDark ? "bg-slate-900/45 border-slate-800 text-slate-500" : "bg-white/80 border-slate-200 text-slate-600 shadow-sm"
                      )}>
                        <Tv className={cn("w-8 h-8", isDark ? "text-slate-600" : "text-slate-400")} />
                        <p>El catálogo de servicios se encuentra en preparación o actualización.</p>
                        <button
                          onClick={handleRequestResellerInfo}
                          className={cn("text-xs hover:underline font-bold", isDark ? "text-indigo-400" : "text-indigo-600")}
                        >
                          Consultar lista de precios directamente por WhatsApp
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {catalogItems
                          .filter((item) => {
                            if (!catalogSearch.trim()) return true;
                            const q = catalogSearch.toLowerCase();
                            return (
                              item.name?.toLowerCase().includes(q) ||
                              item.category?.toLowerCase().includes(q) ||
                              item.description?.toLowerCase().includes(q)
                            );
                          })
                          .map((item) => {
                            const price = getCatalogItemPrice(item);
                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "border rounded-2xl p-5 flex flex-col justify-between gap-4 text-left transition-all group backdrop-blur-xl shadow-md",
                                  isDark 
                                    ? "bg-slate-900 border-slate-800 hover:border-indigo-500/40 hover:shadow-indigo-950/20" 
                                    : "bg-white/85 border-white/90 shadow-slate-200/60 hover:border-indigo-200"
                                )}
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border",
                                      isDark ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    )}>
                                      {item.category || 'Servicio Digital'}
                                    </span>
                                    {item.duration && (
                                      <span className={cn(
                                        "text-[10px] font-bold flex items-center gap-1",
                                        isDark ? "text-slate-400" : "text-slate-600"
                                      )}>
                                        <Clock className="w-2.5 h-2.5" /> {item.duration}
                                      </span>
                                    )}
                                  </div>

                                  <h4 className={cn(
                                    "text-base font-black transition-colors",
                                    isDark ? "text-white group-hover:text-indigo-300" : "text-slate-900 group-hover:text-indigo-600"
                                  )}>
                                    {item.name}
                                  </h4>

                                  {item.description && (
                                    <p className={cn(
                                      "text-xs font-semibold line-clamp-2 leading-relaxed",
                                      isDark ? "text-slate-400" : "text-slate-600"
                                    )}>
                                      {item.description}
                                    </p>
                                  )}

                                  {item.profileType && (
                                    <div className={cn(
                                      "text-[11px] font-semibold flex items-center gap-1.5",
                                      isDark ? "text-slate-400" : "text-slate-600"
                                    )}>
                                      <Tag className={cn("w-3 h-3", isDark ? "text-indigo-400" : "text-indigo-600")} />
                                      <span>Tipo: <strong className={isDark ? "text-slate-200" : "text-slate-900"}>{item.profileType}</strong></span>
                                    </div>
                                  )}
                                </div>

                                <div className={cn(
                                  "pt-3 border-t flex items-center justify-between gap-2",
                                  isDark ? "border-slate-800" : "border-slate-200"
                                )}>
                                  <div className="flex flex-col">
                                    <span className={cn(
                                      "text-[9px] font-bold uppercase",
                                      isDark ? "text-slate-500" : "text-slate-600"
                                    )}>
                                      {clientEntityType === 'reseller' ? 'Precio Revendedor' : 'Precio'}
                                    </span>
                                    <span className={cn(
                                      "text-xl font-black font-mono",
                                      isDark ? "text-emerald-400" : "text-emerald-600"
                                    )}>
                                      {formatCurrency(price)}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => handleRequestCatalogService(item)}
                                    className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                                    title="Solicitar este servicio por WhatsApp"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Adquirir</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* TAB 4: CUENTAS DE PAGO AUTORIZADAS */}
            {activeTab === 'payment_methods' && (
              <div className="flex flex-col gap-6">
                
                <div className={cn("space-y-1 text-left pb-2 border-b", isDark ? "border-slate-800" : "border-slate-200")}>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border inline-flex items-center gap-1",
                    isDark ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-50 text-indigo-700 border-indigo-200"
                  )}>
                    <CreditCard className="w-3 h-3" /> Canales Oficiales de Depósito
                  </span>
                  <h3 className={cn("text-lg font-black", isDark ? "text-white" : "text-slate-900")}>
                    Cuentas y Enlaces para Depósitos y Transferencias
                  </h3>
                  <p className={cn("text-xs font-semibold leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                    Realice su pago a cualquiera de las siguientes cuentas autorizadas y envíe el comprobante de transferencia con su nombre a su asesor.
                  </p>
                </div>

                {merchantWallets.length === 0 ? (
                  <div className={cn(
                    "border rounded-2xl p-8 text-center font-semibold text-xs py-12 flex flex-col items-center gap-3 backdrop-blur-xl",
                    isDark ? "bg-slate-900/45 border-slate-800 text-slate-500" : "bg-white/80 border-slate-200 text-slate-600 shadow-sm"
                  )}>
                    <p>No se encuentran cuentas de pago registradas públicamente en este momento.</p>
                    <button
                      onClick={handleOpenBlankWhatsApp}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      Solicitar Cuentas Bancarias por WhatsApp
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {merchantWallets.map((wallet) => (
                      <div 
                        key={wallet.id} 
                        className={cn(
                          "border rounded-2xl p-5 text-left shadow-lg flex flex-col justify-between gap-4 backdrop-blur-xl transition-all",
                          isDark 
                            ? "bg-gradient-to-br from-indigo-950/20 via-slate-900 to-slate-900 border-indigo-500/10 hover:border-indigo-500/30" 
                            : "bg-white/85 border-white/90 shadow-slate-200/60 hover:border-indigo-200"
                        )}
                      >
                        <div className="space-y-1">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-wider",
                            isDark ? "text-indigo-400" : "text-indigo-600"
                          )}>
                            {wallet.type === 'bank' ? '🏦 Banco / Transferencia' : wallet.type === 'digital_wallet' ? '📱 Billetera Digital' : wallet.type === 'credit_card' ? '💳 Tarjeta de Crédito' : '💵 Caja / Efectivo'}
                          </span>
                          <h4 className={cn("text-sm font-black", isDark ? "text-white" : "text-slate-900")}>{wallet.name}</h4>
                          {wallet.holderName && (
                            <p className={cn("text-xs font-semibold", isDark ? "text-slate-400" : "text-slate-600")}>
                              Titular: <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{wallet.holderName}</strong>
                            </p>
                          )}
                        </div>

                        <div className={cn(
                          "border p-3.5 rounded-xl flex items-center justify-between gap-3",
                          isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50/90 border-slate-200/90"
                        )}>
                          <div className="flex flex-col gap-0.5 overflow-hidden">
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-wider",
                              isDark ? "text-slate-500" : "text-slate-500"
                            )}>Número de Cuenta / ID</span>
                            <span className={cn(
                              "text-xs font-black font-mono break-all pr-2",
                              isDark ? "text-white" : "text-slate-900"
                            )}>
                              {wallet.accountNumber}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                              onClick={() => setQrModalData({ isOpen: true, title: `QR: ${wallet.name}`, data: wallet.accountNumber })}
                              title="Mostrar Código QR"
                              className={cn(
                                "flex items-center justify-center p-2 rounded-lg border transition-colors cursor-pointer",
                                isDark 
                                  ? "bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border-indigo-500/15" 
                                  : "bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border-indigo-200"
                              )}
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            {wallet.accountNumber.startsWith('http') ? (
                              <a 
                                href={wallet.accountNumber}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <button 
                                onClick={() => handleCopy(wallet.accountNumber, `wallet_copy_${wallet.id}`)}
                                className={cn(
                                  "flex items-center justify-center p-2 rounded-lg border transition-all cursor-pointer",
                                  isDark 
                                    ? "bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border-indigo-500/15" 
                                    : "bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border-indigo-200"
                                )}
                              >
                                {copiedId === `wallet_copy_${wallet.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Help Notes Footer */}
                <div className={cn(
                  "border rounded-2xl p-5 text-left text-xs flex gap-3 leading-relaxed font-semibold backdrop-blur-xl",
                  isDark 
                    ? "bg-slate-900/30 border-slate-800 text-slate-400" 
                    : "bg-white/75 border-white/90 text-slate-600 shadow-md shadow-slate-200/50"
                )}>
                  <HelpCircle className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-indigo-400" : "text-indigo-600")} />
                  <div>
                    <p className={cn("font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>
                      💡 ¿Cómo reportar un pago o transferencia?
                    </p>
                    <p>
                      Una vez realizada la transferencia o depósito, presione el botón de WhatsApp para adjuntar su comprobante de pago indicando el servicio o número de recibo correspondiente.
                    </p>
                  </div>
                </div>

              </div>
            )}
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
              className={cn("absolute inset-0", isDark ? "bg-slate-950/80" : "bg-slate-900/20", "backdrop-blur-md cursor-pointer")}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className={cn(
                "relative w-full max-w-sm overflow-hidden border rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-5 z-10 backdrop-blur-xl",
                isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50"
              )}
            >
              {/* Header */}
              <div className={cn("w-full flex items-center justify-between border-b pb-3", isDark ? "border-slate-800" : "border-slate-200")}>
                <span className={cn(
                  "text-xs font-black uppercase tracking-wider flex items-center gap-1.5",
                  isDark ? "text-indigo-400" : "text-indigo-600"
                )}>
                  <QrCode className="w-4 h-4" /> QR de Escaneo Rápido
                </span>
                <button
                  onClick={() => setQrModalData(null)}
                  className={cn(
                    "p-1 rounded-lg transition-colors cursor-pointer",
                    isDark ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                  )}
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
                <h4 className={cn("text-sm font-black", isDark ? "text-white" : "text-slate-900")}>
                  {qrModalData.title}
                </h4>
                <p className={cn("text-[11px] font-semibold max-w-[260px] mx-auto leading-normal", isDark ? "text-slate-400" : "text-slate-600")}>
                  Escanee este código con la aplicación de su banco, billetera virtual o cámara para iniciar la transferencia rápidamente.
                </p>
              </div>

              {/* Text Field to Copy */}
              <div className={cn(
                "w-full border p-3 rounded-xl flex items-center justify-between gap-3 text-left",
                isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
              )}>
                <div className="flex flex-col gap-0.5 truncate flex-1 pr-1">
                  <span className={cn("text-[8px] font-black uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-500")}>
                    Valor Registrado
                  </span>
                  <span className={cn("text-xs font-black font-mono truncate", isDark ? "text-white" : "text-slate-900")}>
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
                className={cn(
                  "w-full py-3 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border cursor-pointer",
                  isDark 
                    ? "bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800" 
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200"
                )}
              >
                Cerrar Ventana
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Branding Credit */}
      <footer className={cn(
        "border-t py-6 text-center text-xs font-semibold flex flex-col gap-1.5 mt-12 mb-14 md:mb-0 transition-colors",
        isDark ? "border-slate-900 bg-slate-950 text-slate-600" : "border-slate-200/80 bg-white/60 backdrop-blur-md text-slate-500 shadow-sm"
      )}>
        <p>© 2026 Control Financiero. Todos los derechos reservados.</p>
        <p className={cn("text-[10px] tracking-wider", isDark ? "text-slate-700" : "text-slate-400")}>
          Acceso Seguro Encriptado • Sincronización Real-Time con Base de Datos
        </p>
      </footer>

      {/* FLOATING WHATSAPP BUTTON (BOTTOM-RIGHT) */}
      {merchantSettings?.phone && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={handleOpenBlankWhatsApp}
            className="group flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 text-white pl-4 pr-5 py-3.5 rounded-full shadow-2xl hover:shadow-emerald-500/25 transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-emerald-400/40 cursor-pointer"
            title="Abrir chat de WhatsApp con asesor"
          >
            <div className="relative">
              <MessageCircle className="w-6 h-6 fill-white stroke-emerald-600" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-200"></span>
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-100 opacity-90 leading-tight">
                Atención Directa
              </span>
              <span className="text-xs font-black text-white leading-tight">
                WhatsApp
              </span>
            </div>
          </button>
        </div>
      )}

    </div>
  );
}
