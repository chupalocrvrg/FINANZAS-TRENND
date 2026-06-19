/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  User, 
  Users, 
  Briefcase, 
  Truck, 
  Tv, 
  Activity, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Loader2, 
  Save,
  Sparkles,
  CheckCircle2,
  MessageCircle
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { formatCurrency, cn } from '../lib/utils';

export function QuickAddFAB() {
  const { user, settings } = useAuth();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [fabSubmitting, setFabSubmitting] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'client' | 'reseller' | 'intermediary' | 'supplier' | 'digital_service' | 'ant_update' | 'income' | 'expense' | null>(null);

  const [wallets, setWallets] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);

  // CRM Form states
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
  const [fabDsServiceType, setFabDsServiceType] = useState<'completa' | 'pantalla'>('completa');
  const [fabDsProfileName, setFabDsProfileName] = useState('');
  const [fabDsClientType, setFabDsClientType] = useState<'client' | 'reseller'>('client');
  const [fabDsFinalClientName, setFabDsFinalClientName] = useState('');
  const [fabDsFinalClientContact, setFabDsFinalClientContact] = useState('');
  const [fabDsSupplierId, setFabDsSupplierId] = useState('');
  const [showDsClientSuggestions, setShowDsClientSuggestions] = useState(false);
  const [showFinalClientSuggestions, setShowFinalClientSuggestions] = useState(false);

  // Modal de confirmación para añadir WhatsApp (Requirement #1)
  const [whatsappConfirmModal, setWhatsappConfirmModal] = useState<{
    isOpen: boolean;
    entityName: string;
    entityType: 'client' | 'reseller' | 'intermediary' | 'supplier' | 'ant_update' | 'digital_service';
    currentContact: string;
    onConfirm: (phone: string) => void;
  } | null>(null);

  // Diálogo elegante de éxito/error (Requirement #7)
  const [fabStatusMessage, setFabStatusMessage] = useState<{
    type: 'success' | 'error';
    title: string;
    description: string;
  } | null>(null);

  // Local quick client/reseller form inside the popover
  const [showFabNewClientForm, setShowFabNewClientForm] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityContact, setNewEntityContact] = useState('');
  const [newEntityType, setNewEntityType] = useState<'client' | 'reseller'>('client');

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
  const [fabLedgerIsRecurring, setFabLedgerIsRecurring] = useState(false);
  const [fabLedgerIsPending, setFabLedgerIsPending] = useState(false);
  const [fabLedgerDueDate, setFabLedgerDueDate] = useState('');
  const [fabLedgerInstallments, setFabLedgerInstallments] = useState('1');
  const [fabLedgerIsCreditCardPayment, setFabLedgerIsCreditCardPayment] = useState(false);
  const [fabLedgerTargetWalletId, setFabLedgerTargetWalletId] = useState('');

  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [quickPasteText, setQuickPasteText] = useState('');

  const isDark = settings?.theme === 'dark';

  useEffect(() => {
    if (!user) return;

    const unsubWallets = onSnapshot(query(collection(db, 'wallets'), where('ownerId', '==', user.uid)), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setWallets(list);
      if (list.length > 0 && !fabDsWalletId) {
        setFabDsWalletId(list[0].id);
      }
      if (list.length > 0 && !fabLedgerWalletId) {
        setFabLedgerWalletId(list[0].id);
      }
    });

    const unsubEntities = onSnapshot(query(collection(db, 'entities'), where('ownerId', '==', user.uid)), (snap) => {
      setEntities(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    const unsubCatalog = onSnapshot(query(collection(db, 'digital_catalog'), where('ownerId', '==', user.uid)), (snap) => {
      setCatalogItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    return () => {
      unsubWallets();
      unsubEntities();
      unsubCatalog();
    };
  }, [user]);

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
    setFabDsServiceType('completa');
    setFabDsProfileName('');
    setFabDsClientType('client');
    setFabDsFinalClientName('');
    setFabDsFinalClientContact('');
    setShowFabNewClientForm(false);
    setNewEntityName('');
    setNewEntityContact('');
    setNewEntityType('client');

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
    setFabLedgerIsRecurring(false);
    setFabLedgerIsPending(false);
    setFabLedgerDueDate('');
    setFabLedgerInstallments('1');
    setFabLedgerIsCreditCardPayment(false);
    setFabLedgerTargetWalletId('');
  };

  const handleQuickPasteParse = (text: string) => {
    setQuickPasteText(text);
    if (!text.trim()) return;

    const normalizedText = text.toLowerCase();

    // Decide if it is an ANT Update vs Digital Service
    const hasStreamingSignals = normalizedText.includes('@') ||
                                normalizedText.includes('correo') ||
                                normalizedText.includes('email') ||
                                normalizedText.includes('contraseña') ||
                                normalizedText.includes('contrasena') ||
                                normalizedText.includes('clave') ||
                                normalizedText.includes('password') ||
                                normalizedText.includes('pass') ||
                                normalizedText.includes('perfil') ||
                                normalizedText.includes('pin') ||
                                normalizedText.includes('netflix') ||
                                normalizedText.includes('disney') ||
                                normalizedText.includes('spotify') ||
                                normalizedText.includes('max') ||
                                normalizedText.includes('prime') ||
                                normalizedText.includes('crunchy') ||
                                normalizedText.includes('magis') ||
                                normalizedText.includes('canva') ||
                                normalizedText.includes('capcut') ||
                                normalizedText.includes('plex') ||
                                normalizedText.includes('combo') ||
                                normalizedText.includes('pantalla');

    const isAnt = !hasStreamingSignals && (
                  normalizedText.includes('ant') || 
                  normalizedText.includes('planilla') || 
                  normalizedText.includes('trámite') || 
                  normalizedText.includes('tramite') || 
                  normalizedText.includes('depósito') || 
                  normalizedText.includes('deposito') || 
                  normalizedText.includes('transferencia') || 
                  normalizedText.includes('bodega') ||
                  normalizedText.includes('establecimiento')
    );

    if (isAnt) {
      // 1. ANT Update
      let chargedRate = 0;
      const rateRegexes = [
        /(?:tasa|rate|monto|valor|costo|precio|cobro)[:\s]*\$?\s*(\d+(?:\.\d+)?)/i,
        /\$\s*(\d+(?:\.\d+)?)/i,
        /\b(\d+(?:\.\d+)?)\s*usd/i,
        /\b(\d+(?:\.\d+)?)\s*dolares/i
      ];
      for (const rx of rateRegexes) {
        const match = text.match(rx);
        if (match) {
          chargedRate = parseFloat(match[1]);
          if (!isNaN(chargedRate) && chargedRate > 0) break;
        }
      }

      let warehouse = "";
      const popularPlaces = [
        "Manta", "Guayaquil", "Quito", "Portoviejo", "Huaquillas", "Cuenca", 
        "Loja", "Ambato", "Riobamba", "Ibarra", "Esmeraldas", "Santo Domingo",
        "Machala", "Duran", "Quevedo", "Babahoyo", "Latacunga", "Tulcan"
      ];
      for (const place of popularPlaces) {
        if (normalizedText.includes(place.toLowerCase())) {
          warehouse = place;
          break;
        }
      }

      if (!warehouse) {
        const bRegex = /(?:bodega|establecimiento|agencia|banco|punto|lugar|oficina)[:\s]+([A-Za-z]+)/i;
        const bMatch = text.match(bRegex);
        if (bMatch) {
          warehouse = bMatch[1].trim();
        }
      }

      let finalClientName = "";
      const nameRegexes = [
        /(?:cliente final|persona|interesado|titular|para|nombre|cliente)[:\s]+([A-Za-z\s]{3,25})/i,
        /(?:ant|planilla|tramite)\s+(?:de|para)\s+([A-Za-z\s]{3,25})/i
      ];
      for (const rx of nameRegexes) {
        const match = text.match(rx);
        if (match) {
          finalClientName = match[1].trim();
          break;
        }
      }
      if (finalClientName) {
        finalClientName = finalClientName.replace(/\n.*/g, '').replace(/(?:vence|bodega|establecimiento|tasa|monto|valor).*/i, '').trim();
      }

      let intermediaryId = "";
      const matchedInter = entities.find(i => i.type === 'intermediary' && normalizedText.includes(i.name.toLowerCase()));
      if (matchedInter) {
        intermediaryId = matchedInter.id;
      } else {
        const firstInter = entities.find(i => i.type === 'intermediary');
        if (firstInter) intermediaryId = firstInter.id;
      }

      let updaterId = "";
      const matchedUpdater = entities.find(u => u.type === 'supplier' && normalizedText.includes(u.name.toLowerCase()));
      if (matchedUpdater) {
        updaterId = matchedUpdater.id;
      } else {
        const firstUpdater = entities.find(u => u.type === 'supplier');
        if (firstUpdater) updaterId = firstUpdater.id;
      }

      const activeInter = entities.find(e => e.id === intermediaryId);
      const activeUpdater = entities.find(e => e.id === updaterId);

      setQuickAddType('ant_update');
      setFabAntFinalClientName(finalClientName || 'Cliente Planilla');
      setFabAntWarehouse(warehouse || 'Establecimiento ANT');
      setFabAntIntermediaryId(intermediaryId);
      setFabAntUpdaterId(updaterId);
      setFabAntChargedRate(activeInter ? String(activeInter.rate || 0) : String(chargedRate || 0));
      setFabAntBaseCost(activeUpdater ? String(activeUpdater.antUpdateCost || 0) : '0');

    } else {
      // 2. Digital Service
      const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
      const email = emailMatch ? emailMatch[0].trim() : "";

      let password = "";
      const passRegexes = [
        /(?:contraseña|contrasena|clave|password|pass|clv|pw)[:\s]+([^\s,;]+)/i,
        /clave[:\s]+([^\s,;]+)/i,
        /password[:\s]+([^\s,;]+)/i,
        /pass[:\s]+([^\s,;]+)/i
      ];
      for (const rx of passRegexes) {
        const match = text.match(rx);
        if (match) {
          password = match[1].trim();
          break;
        }
      }
      if (!password && email) {
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.includes(email)) {
            const afterEmail = line.substring(line.indexOf(email) + email.length);
            const parts = afterEmail.split(/[:\s/|\-]+/);
            const filteredParts = parts.map(p => p.trim()).filter(p => p.length > 2 && p.toLowerCase() !== 'pin');
            if (filteredParts.length > 0) {
              password = filteredParts[0];
              break;
            }
          }
        }
      }

      let pin = "";
      const pinRegexes = [
        /(?:pin|perfil|pantalla|slot|perf|pl|combo)[:\s]+([^\s,;]+)/i,
        /pin[:\s]*(\d+)/i,
        /perfil[:\s]*(\d+|[A-Za-z0-9ñÑ]+)/i
      ];
      for (const rx of pinRegexes) {
        const match = text.match(rx);
        if (match) {
          pin = match[1].trim();
          break;
        }
      }

      let profileName = "";
      const profileMatch = text.match(/(?:perfil|pantalla|slot|perf|pl)[:\s]+([A-Za-z0-9ñÑ\s]+)/i);
      if (profileMatch) {
        profileName = profileMatch[1].trim();
      }

      let name = "";
      let cost = 0;
      let revenue = 0;

      for (const item of catalogItems) {
        if (normalizedText.includes(item.name.toLowerCase())) {
          name = item.name;
          cost = item.cost || item.costo || 0;
          revenue = item.pvp || item.precio || 0;
          break;
        }
      }

      if (!name) {
        const streamingMatch = ["netflix", "disney", "spotify", "max", "hbo", "prime", "crunchyroll", "youtube", "capcut", "canva", "magis", "plex"];
        for (const brand of streamingMatch) {
          if (normalizedText.includes(brand)) {
            const bestCatalogMatch = catalogItems.find(item => item.name.toLowerCase().includes(brand));
            if (bestCatalogMatch) {
              name = bestCatalogMatch.name;
              cost = bestCatalogMatch.cost || bestCatalogMatch.costo || 0;
              revenue = bestCatalogMatch.pvp || bestCatalogMatch.precio || 0;
            } else {
              name = brand.charAt(0).toUpperCase() + brand.slice(1);
            }
            break;
          }
        }
      }
      if (!name) {
        name = "Servicio Digital";
      }

      const costMatch = text.match(/(?:costo|cost|compra|prov)[:\s]*\$?\s*(\d+(?:\.\d+)?)/i);
      if (costMatch) {
        cost = parseFloat(costMatch[1]);
      }
      const priceMatch = text.match(/(?:precio|venta|cobro|pvp|ingreso)[:\s]*\$?\s*(\d+(?:\.\d+)?)/i);
      if (priceMatch) {
        revenue = parseFloat(priceMatch[1]);
      }

      let supplierId = "";
      const matchedSupplier = entities.find(s => s.type === 'supplier' && normalizedText.includes(s.name.toLowerCase()));
      if (matchedSupplier) {
        supplierId = matchedSupplier.id;
      } else {
        const firstSupplier = entities.find(s => s.type === 'supplier');
        if (firstSupplier) supplierId = firstSupplier.id;
      }

      let clientContact = "";
      const contactMatch = text.match(/(?:celular|telefono|contacto|telf|\+593)[:\s]*(\+?\d{9,15})/i) || text.match(/\b(09\d{8})\b/);
      if (contactMatch) {
        clientContact = contactMatch[1].trim();
      }

      let clientName = "";
      const clientNameMatch = text.match(/(?:cliente|para|comprador|nombre)[:\s]+([A-Za-z\s]{3,20})/i);
      if (clientNameMatch) {
        clientName = clientNameMatch[1].trim().replace(/\n.*/g, '');
      }

      setQuickAddType('digital_service');
      setFabDsName(name);
      setFabDsCategory('Streaming');
      setFabDsEmail(email);
      setFabDsPassword(password);
      setFabDsPin(pin);
      setFabDsProfileName(profileName || pin || '');
      setFabDsServiceType(profileName || pin ? 'pantalla' : 'completa');
      setFabDsCost(String(cost || 0));
      setFabDsRevenue(String(revenue || 0));
      setFabDsClientContact(clientContact);
      setFabDsClientName(clientName || 'Cliente Final');
      setFabDsDurationDays('30');
    }
  };

  const proceedSavingDigitalService = async (confirmedWhatsApp?: string) => {
    setFabSubmitting(true);
    try {
      const finalContact = confirmedWhatsApp !== undefined ? confirmedWhatsApp : fabDsClientContact;
      const costVal = parseFloat(fabDsCost) || 0;
      const revVal = parseFloat(fabDsRevenue) || 0;
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + parseInt(fabDsDurationDays || '30'));

      // 1. Duplicate check
      const { getDocs } = await import('firebase/firestore');
      const q = query(
        collection(db, 'digital_services'),
        where('ownerId', '==', user?.uid),
        where('email', '==', fabDsEmail.trim())
      );
      const querySnapshot = await getDocs(q);
      const duplicate = querySnapshot.docs.find(docSnap => {
        const s = docSnap.data();
        return (
          s.email?.trim().toLowerCase() === fabDsEmail.trim().toLowerCase() &&
          s.password === fabDsPassword &&
          s.pin === fabDsPin &&
          (s.profileName || '') === fabDsProfileName &&
          s.name?.trim().toLowerCase() === fabDsName.trim().toLowerCase()
        );
      });

      if (duplicate) {
        setFabStatusMessage({
          type: 'error',
          title: 'Venta Duplicada',
          description: 'Ya existe una venta de servicio digital con exactamente el mismo correo, contraseña, perfil y pin.'
        });
        setFabSubmitting(false);
        return;
      }

      // 2. CRM Auto-Registration for new client if not present in entities list
      if (fabDsClientName && fabDsClientName.trim() !== '') {
        const trimmedClientName = fabDsClientName.trim();
        const existingEntity = entities.find(
          (ent) =>
            ent.name?.trim().toLowerCase() === trimmedClientName.toLowerCase() &&
            ent.type === fabDsClientType
        );

        if (!existingEntity) {
          await addDoc(collection(db, 'entities'), {
            name: trimmedClientName,
            contact: finalContact ? finalContact.trim() : '',
            type: fabDsClientType,
            rate: 0,
            isAntUpdater: false,
            antUpdateCost: 0,
            ownerId: user?.uid,
            createdAt: new Date().toISOString()
          });
        }
      }

      // 3. CRM Auto-Registration for final client if provided under reseller mode
      if (fabDsClientType === 'reseller' && fabDsFinalClientName && fabDsFinalClientName.trim() !== '') {
        const trimmedFinalName = fabDsFinalClientName.trim();
        const existingFinalEntity = entities.find(
          (ent) =>
            ent.name?.trim().toLowerCase() === trimmedFinalName.toLowerCase() &&
            ent.type === 'client'
        );

        if (!existingFinalEntity) {
          await addDoc(collection(db, 'entities'), {
            name: trimmedFinalName,
            contact: fabDsFinalClientContact ? fabDsFinalClientContact.trim() : '',
            type: 'client',
            rate: 0,
            isAntUpdater: false,
            antUpdateCost: 0,
            ownerId: user?.uid,
            createdAt: new Date().toISOString()
          });
        }
      }

      // 4. Save actual service
      await addDoc(collection(db, 'digital_services'), {
        name: fabDsName,
        category: fabDsCategory,
        cost: costVal,
        revenue: revVal,
        clientName: fabDsClientName,
        clientContact: finalContact,
        clientType: fabDsClientType,
        finalClientName: fabDsClientType === 'reseller' ? fabDsFinalClientName : '',
        finalClientContact: fabDsClientType === 'reseller' ? fabDsFinalClientContact : '',
        email: fabDsEmail,
        password: fabDsPassword,
        pin: fabDsPin,
        serviceType: fabDsServiceType,
        profileName: fabDsProfileName,
        supplierId: fabDsSupplierId || '',
        supplierName: entities.find(e => e.id === fabDsSupplierId)?.name || '',
        status: 'active',
        isPaid: false,
        isCostPaid: false,
        expirationDate: expDate.toISOString().split('T')[0],
        ownerId: user?.uid,
        createdAt: new Date().toISOString()
      });

      // Show gorgeous custom dialog
      setFabStatusMessage({
        type: 'success',
        title: 'Servicio Cuenta Guardado',
        description: `La venta del servicio digital para "${fabDsClientName}" se ha registrado exitosamente. Se sincronizó de forma automática en su catálogo de CRM.`
      });

      // Clear states
      setFabDsName('');
      setFabDsEmail('');
      setFabDsPassword('');
      setFabDsPin('');
      setFabDsProfileName('');
      setFabDsClientName('');
      setFabDsClientContact('');
      setFabDsFinalClientName('');
      setFabDsFinalClientContact('');
      setFabDsSupplierId('');
      setIsFabOpen(false);
    } catch (err) {
      console.error(err);
      setFabStatusMessage({
        type: 'error',
        title: 'Error de Guardado',
        description: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setFabSubmitting(false);
    }
  };

  const proceedSavingAntUpdate = async () => {
    setFabSubmitting(true);
    try {
      const inter = entities.find(ent => ent.id === fabAntIntermediaryId);
      const upd = entities.find(ent => ent.id === fabAntUpdaterId);
      const costVal = parseFloat(fabAntBaseCost) || 0;
      const revVal = parseFloat(fabAntChargedRate) || 0;

      // CRM Auto-Registration for new final client if not present in entities list
      if (fabAntFinalClientName && fabAntFinalClientName.trim() !== '') {
        const trimmedClientName = fabAntFinalClientName.trim();
        const existingEntity = entities.find(
          (ent) =>
            ent.name?.trim().toLowerCase() === trimmedClientName.toLowerCase() &&
            ent.type === 'client'
        );

        if (!existingEntity) {
          await addDoc(collection(db, 'entities'), {
            name: trimmedClientName,
            contact: '',
            type: 'client',
            rate: 0,
            isAntUpdater: false,
            antUpdateCost: 0,
            ownerId: user?.uid,
            createdAt: new Date().toISOString()
          });
        }
      }

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
        ownerId: user?.uid,
        createdAt: new Date().toISOString()
      });

      // Show gorgeous custom dialog
      setFabStatusMessage({
        type: 'success',
        title: 'Trámite ANT Registrado',
        description: `El trámite de placa ANT para "${fabAntFinalClientName}" se ha guardado exitosamente de forma pendiente de cobranza.`
      });

      setFabAntFinalClientName('');
      setFabAntWarehouse('');
      setIsFabOpen(false);
    } catch (err) {
      console.error(err);
      setFabStatusMessage({
        type: 'error',
        title: 'Error ANT de Guardado',
        description: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setFabSubmitting(false);
    }
  };

  const handleFabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || fabSubmitting || !quickAddType) return;

    try {
      if (['client', 'reseller', 'intermediary', 'supplier'].includes(quickAddType)) {
        setFabSubmitting(true);
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

        setFabStatusMessage({
          type: 'success',
          title: 'Registro Exitoso en CRM',
          description: `La entidad "${fabEntityName}" ha sido agregada exitosamente como ${
            quickAddType === 'client' ? 'Cliente' :
            quickAddType === 'reseller' ? 'Revendedor' :
            quickAddType === 'intermediary' ? 'Intermediario' : 'Proveedor'
          }.`
        });
        resetFabForm();
        setIsFabOpen(false);
      }
      else if (quickAddType === 'digital_service') {
        const trimmedClientName = fabDsClientName.trim() || 'Cliente Final';
        const existingEntity = entities.find(
          (ent) =>
            ent.name?.trim().toLowerCase() === trimmedClientName.toLowerCase() &&
            ent.type === fabDsClientType
        );

        if (!existingEntity) {
          // Open WhatsApp confirm selector first
          setWhatsappConfirmModal({
            isOpen: true,
            entityName: trimmedClientName,
            entityType: 'digital_service',
            currentContact: fabDsClientContact || '',
            onConfirm: async (confirmedPhone) => {
              setWhatsappConfirmModal(null);
              await proceedSavingDigitalService(confirmedPhone);
            }
          });
        } else {
          await proceedSavingDigitalService(fabDsClientContact);
        }
      }
      else if (quickAddType === 'ant_update') {
        const trimmedClientName = fabAntFinalClientName.trim() || 'Cliente Planilla';
        const existingEntity = entities.find(
          (ent) =>
            ent.name?.trim().toLowerCase() === trimmedClientName.toLowerCase() &&
            ent.type === 'client'
        );

        if (!existingEntity) {
          // Open WhatsApp confirm selector first for new client
          setWhatsappConfirmModal({
            isOpen: true,
            entityName: trimmedClientName,
            entityType: 'ant_update',
            currentContact: '',
            onConfirm: async (confirmedPhone) => {
              setWhatsappConfirmModal(null);
              // Save
              await proceedSavingAntUpdate();
            }
          });
        } else {
          await proceedSavingAntUpdate();
        }
      }
      else if (['income', 'expense'].includes(quickAddType)) {
        setFabSubmitting(true);
        const numericAmount = parseFloat(fabLedgerAmount) || 0;
        const signedAmount = quickAddType === 'expense' ? -Math.abs(numericAmount) : Math.abs(numericAmount);

         const wallId = fabLedgerIsPending ? '' : fabLedgerWalletId;
         const isPend = fabLedgerIsPending;

         if (!isPend && wallId) {
           await updateDoc(doc(db, 'wallets', wallId), {
             balance: increment(signedAmount)
           });

           if (fabLedgerIsCreditCardPayment && fabLedgerTargetWalletId) {
             await updateDoc(doc(db, 'wallets', fabLedgerTargetWalletId), {
               balance: increment(Math.abs(signedAmount))
             });
           }
         }

         await addDoc(collection(db, 'ledger'), {
           type: 'business',
           category: fabLedgerCategory || (quickAddType === 'income' ? 'Ingreso Adicional' : 'Egreso de Caja'),
           amount: signedAmount,
           description: fabLedgerDescription,
           walletId: wallId,
           date: new Date().toISOString().split('T')[0],
           ownerId: user.uid,
           isRecurring: fabLedgerIsRecurring,
           isPending: isPend,
           dueDate: (fabLedgerIsRecurring || isPend) ? fabLedgerDueDate : '',
           installments: fabLedgerInstallments,
           isCreditCardPayment: fabLedgerIsCreditCardPayment,
           targetWalletId: fabLedgerIsCreditCardPayment ? fabLedgerTargetWalletId : '',
           createdAt: new Date().toISOString()
         });

         setFabStatusMessage({
           type: 'success',
           title: 'Movimiento Registrado',
           description: `La transacción de tesorería por ${formatCurrency(numericAmount)} se guardó con éxito.`
         });
         resetFabForm();
         setIsFabOpen(false);
      }
    } catch (err) {
      console.error("Error Quick Add:", err);
      setFabStatusMessage({
        type: 'error',
        title: 'Error de Servidor',
        description: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setFabSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-8 right-6 lg:right-8 z-40 flex flex-col items-end animate-in fade-in duration-300">
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
            <div className="flex justify-between items-center mb-4 border-b pb-3 border-slate-800/10 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500 animate-pulse shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Acceso Rápido Unificado</span>
              </div>
              <button
                onClick={() => { setIsFabOpen(false); resetFabForm(); }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickAddType === null ? (
              /* MENU DE SELECCION INICIAL */
              <div className="space-y-4">
                {/* BOTÓN UNIFICADO DEL ASISTENTE INTELIGENTE AI */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-550 dark:text-indigo-400">Soporte Inteligente</div>
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      setIsFabOpen(false);
                      window.dispatchEvent(new CustomEvent('open-ai-assistant'));
                    }}
                    className={cn(
                      "p-3.5 rounded-2xl border text-xs font-black uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2.5 shadow-md",
                      isDark 
                        ? "bg-gradient-to-r from-indigo-950 to-slate-900 border-indigo-500/30 text-indigo-300 hover:border-indigo-500/50" 
                        : "bg-gradient-to-r from-indigo-600 to-indigo-700 border-indigo-600 text-white hover:opacity-95 shadow-indigo-600/15"
                    )}
                  >
                    <Sparkles className={cn("w-5 h-5 shrink-0", isDark ? "text-indigo-405 animate-pulse" : "text-indigo-200 animate-bounce")} />
                    <span>Preguntar al Asistente AI</span>
                  </motion.div>
                </div>

                {/* ⚡ EXTRACTOR LOCAL AUTÓNOMO 100% SIN CLAVE API */}
                <div className="space-y-1.5 p-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-indigo-554 dark:text-indigo-400">
                    <span className="flex items-center gap-1">⚡ Autoprocesar Texto/Chat</span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-505/10 dark:bg-indigo-500/10 text-[8px] font-black tracking-widest text-indigo-500 dark:text-indigo-400">Cero Clave API</span>
                  </div>
                  <textarea
                    rows={2}
                    className={cn(
                      "w-full mt-1 p-2.5 rounded-xl border text-xs font-mono outline-none resize-none transition-all",
                      isDark 
                        ? "bg-slate-950 border-slate-800 text-slate-350 focus:border-indigo-500 placeholder-slate-650" 
                        : "bg-slate-50 border-slate-200 text-slate-700 focus:bg-white focus:border-indigo-500 placeholder-slate-400"
                    )}
                    placeholder="Pegue aquí el chat de WhatsApp o datos de la cuenta / planilla para auto-rellenar y abrir el formulario..."
                    value={quickPasteText}
                    onChange={(e) => handleQuickPasteParse(e.target.value)}
                  />
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                    Detecta de forma 100% autónoma cuentas streaming (correo, clave, perfil, pin, costo) o abonos y planillas de placas ANT.
                  </div>
                </div>

                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">¿Qué desea registrar de forma directa?</div>
                
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
                        className={cn("w-full p-3 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white focus:border-indigo-500")}
                        placeholder="Ej. Andrés Mendoza"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Celular (WhatsApp)</label>
                      <input
                        type="text"
                        value={fabEntityContact}
                        onChange={(e) => setFabEntityContact(e.target.value)}
                        className={cn("w-full p-3 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white focus:border-indigo-500")}
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
                          className={cn("w-full p-3 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white focus:border-indigo-500")}
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
                    <div className="text-xs font-black uppercase text-indigo-505">Venta de Cuenta / Suscripción</div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Producto (Catálogo)</label>
                        <select
                          value={fabDsName}
                          onChange={(e) => {
                            const pickedName = e.target.value;
                            setFabDsName(pickedName);
                            if (!pickedName) return;

                            const cItem = catalogItems.find(c => c.name === pickedName);
                            if (cItem) {
                              setFabDsCategory(cItem.category || 'Streaming');
                              if (cItem.providers && cItem.providers.length > 0) {
                                const p = cItem.providers[0];
                                setFabDsCost(String(p.cost || 0));
                                if (fabDsClientType === 'reseller' && (p as any).pvpReseller) {
                                  setFabDsRevenue(String((p as any).pvpReseller));
                                } else if (p.pvp) {
                                  setFabDsRevenue(String(p.pvp));
                                }
                              }
                            }
                          }}
                          className={cn("w-full p-2 rounded-lg border text-[11px] font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white")}
                        >
                          <option value="">-- Personalizado --</option>
                          {catalogItems.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Categoría</label>
                        <select
                          value={fabDsCategory}
                          onChange={(e) => setFabDsCategory(e.target.value)}
                          className={cn("w-full p-2 rounded-lg border text-[11px] font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white")}
                        >
                          <option value="Streaming">Streaming</option>
                          <option value="Consolas">Consolas / Juegos</option>
                          <option value="Software">Software</option>
                          <option value="Servicios ANT">Servicios ANT</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Nombre / Cuenta Manual</label>
                      <input
                        required
                        type="text"
                        value={fabDsName}
                        onChange={(e) => setFabDsName(e.target.value)}
                        className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white focus:border-indigo-500")}
                        placeholder="Ej. Netflix"
                      />
                    </div>

                    {/* CRM LINKING & CLIENT_TYPE BLOCK */}
                    <div className="p-2 rounded-xl border border-indigo-500/15 bg-indigo-50/5 text-left space-y-2 shadow-inner">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-indigo-500 block">Tipo de Cliente</label>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setFabDsClientType('client');
                              const cItem = catalogItems.find(c => c.name === fabDsName);
                              if (cItem && cItem.providers && cItem.providers.length > 0) {
                                const p = cItem.providers[0];
                                if (p.pvp) setFabDsRevenue(String(p.pvp));
                              }
                            }}
                            className={cn("py-1 text-[8.5px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1",
                              fabDsClientType === 'client'
                                ? "bg-indigo-650 dark:bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : (isDark ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500")
                            )}
                          >
                            👤 Cliente Final
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFabDsClientType('reseller');
                              const cItem = catalogItems.find(c => c.name === fabDsName);
                              if (cItem && cItem.providers && cItem.providers.length > 0) {
                                const p = cItem.providers[0];
                                if ((p as any).pvpReseller) {
                                  setFabDsRevenue(String((p as any).pvpReseller));
                                }
                              }
                            }}
                            className={cn("py-1 text-[8.5px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1",
                              fabDsClientType === 'reseller'
                                ? "bg-indigo-655 dark:bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : (isDark ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500")
                            )}
                          >
                            🤝 Revendedor
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 relative">
                        <div className="space-y-1 relative">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Nombre de Cliente</label>
                          <input
                            required
                            type="text"
                            value={fabDsClientName}
                            onFocus={() => setShowDsClientSuggestions(true)}
                            onBlur={() => {
                              setTimeout(() => setShowDsClientSuggestions(false), 200);
                            }}
                            onChange={(e) => {
                              setFabDsClientName(e.target.value);
                              setShowDsClientSuggestions(true);
                            }}
                            className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white focus:border-indigo-500")}
                            placeholder="Escriba para buscar o registrar..."
                          />
                          {/* Autocomplete list */}
                          {showDsClientSuggestions && fabDsClientName.trim() && (
                            <div className={cn(
                              "absolute left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto rounded-xl border shadow-xl z-50 text-left p-1 space-y-0.5 animate-in fade-in duration-150",
                              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                            )}>
                              {entities
                                .filter(e => e.type === fabDsClientType && e.name.toLowerCase().includes(fabDsClientName.toLowerCase()))
                                .map(ent => (
                                  <button
                                    key={ent.id}
                                    type="button"
                                    onMouseDown={() => {
                                      setFabDsClientName(ent.name);
                                      setFabDsClientContact(ent.contact || '');
                                      setShowDsClientSuggestions(false);
                                    }}
                                    className={cn(
                                      "w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex justify-between items-center",
                                      isDark ? "hover:bg-slate-800 text-slate-205" : "hover:bg-slate-100 text-slate-850"
                                    )}
                                  >
                                    <span>{ent.name}</span>
                                    {ent.contact && <span className="text-[10px] opacity-70">📞 {ent.contact}</span>}
                                  </button>
                                ))
                              }
                              {!entities.some(e => e.type === fabDsClientType && e.name.toLowerCase() === fabDsClientName.toLowerCase()) && (
                                <div className="p-1.5 text-[8.5px] font-black uppercase text-indigo-500 text-center tracking-wide">
                                  🆕 ¡Cliente Nuevo! Se guardará automáticamente en CRM
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">WhatsApp de Cliente (Opcional)</label>
                          <input
                            type="text"
                            value={fabDsClientContact}
                            onChange={(e) => setFabDsClientContact(e.target.value)}
                            className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white focus:border-indigo-500")}
                            placeholder="Ej. +593987654321"
                          />
                        </div>
                      </div>

                      {/* REGISTRAR CLIENTE / REVENDEDOR NUEVO EN CRM INSTANTÁNEAMENTE */}
                      {fabDsClientName && fabDsClientName.trim() !== '' && !entities.some(e => e.name?.trim().toLowerCase() === fabDsClientName.trim().toLowerCase() && e.type === fabDsClientType) && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const trimmed = fabDsClientName.trim();
                                await addDoc(collection(db, 'entities'), {
                                  name: trimmed,
                                  contact: fabDsClientContact ? fabDsClientContact.trim() : '',
                                  type: fabDsClientType,
                                  rate: 0,
                                  isAntUpdater: false,
                                  antUpdateCost: 0,
                                  ownerId: user.uid,
                                  createdAt: new Date().toISOString()
                                });
                                setFabStatusMessage({
                                  type: 'success',
                                  title: 'Contacto Guardado ✓',
                                  description: `Se registró a "${trimmed}" en CRM como ${fabDsClientType === 'client' ? 'Cliente' : 'Revendedor'}.`
                                });
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-[9px] uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all border border-indigo-550 focus:outline-none"
                          >
                            ➕ Guardar "{fabDsClientName}" en CRM ({fabDsClientType === 'client' ? 'Cliente' : 'Revendedor'})
                          </button>
                        </div>
                      )}

                      {/* PROVEEDOR SELECTOR (Requirement #6) */}
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Proveedor de la Cuenta (Opcional)</label>
                        <select
                          value={fabDsSupplierId}
                          onChange={(e) => {
                            const sId = e.target.value;
                            setFabDsSupplierId(sId);
                            // Auto-set cost if possible from the supplier's rate/cost
                            const matchingSupplier = entities.find(sup => sup.id === sId);
                            if (matchingSupplier && matchingSupplier.rate) {
                              setFabDsCost(String(matchingSupplier.rate));
                            }
                          }}
                          className={cn("w-full p-2 rounded-lg border text-[11px] font-bold outline-none cursor-pointer", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 focus:bg-white")}
                        >
                          <option value="">-- Seleccionar Proveedor --</option>
                          {entities
                            .filter(e => e.type === 'supplier')
                            .map(sup => (
                              <option key={sup.id} value={sup.id}>{sup.name}</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>

                    {/* INFO CLIENTE FINAL (OPCIONAL) PARA REVENDEDOR */}
                    {fabDsClientType === 'reseller' && (
                      <div className={cn("p-2 rounded-xl border space-y-1.5 animate-in fade-in duration-200 text-left", isDark ? "bg-slate-955/40 border-slate-800" : "bg-indigo-55/15 border-indigo-100/40")}>
                        <span className="text-[8.5px] font-black uppercase tracking-widest text-indigo-500 block">Información de Cliente Final (Opcional)</span>
                        
                        <div className="grid grid-cols-2 gap-2 relative">
                          <div className="space-y-1 relative">
                            <label className="text-[8px] font-bold text-slate-500">Nombre Cliente Final</label>
                            <input
                              type="text"
                              value={fabDsFinalClientName}
                              onFocus={() => setShowFinalClientSuggestions(true)}
                              onBlur={() => {
                                setTimeout(() => setShowFinalClientSuggestions(false), 200);
                              }}
                              onChange={(e) => {
                                setFabDsFinalClientName(e.target.value);
                                setShowFinalClientSuggestions(true);
                              }}
                              className={cn("w-full p-1.5 rounded-lg border text-xs font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white")}
                              placeholder="Buscar o registrar..."
                            />
                            {showFinalClientSuggestions && fabDsFinalClientName.trim() && (
                              <div className={cn(
                                "absolute left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto rounded-xl border shadow-xl z-50 text-left p-1 space-y-0.5",
                                isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                              )}>
                                {entities
                                  .filter(e => e.type === 'client' && e.name.toLowerCase().includes(fabDsFinalClientName.toLowerCase()))
                                  .map(ent => (
                                    <button
                                      key={ent.id}
                                      type="button"
                                      onMouseDown={() => {
                                        setFabDsFinalClientName(ent.name);
                                        setFabDsFinalClientContact(ent.contact || '');
                                        setShowFinalClientSuggestions(false);
                                      }}
                                      className={cn(
                                        "w-full text-left px-2 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex justify-between items-center",
                                        isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-slate-100 text-slate-850"
                                      )}
                                    >
                                      <span>{ent.name}</span>
                                      {ent.contact && <span className="text-[10px] opacity-70">📞 {ent.contact}</span>}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-500">WhatsApp Cliente Final</label>
                            <input
                              type="text"
                              value={fabDsFinalClientContact}
                              onChange={(e) => setFabDsFinalClientContact(e.target.value)}
                              className={cn("w-full p-1.5 rounded-lg border text-xs font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white")}
                              placeholder="Ej. +593..."
                            />
                          </div>
                        </div>

                        {/* REGISTRAR CLIENTE FINAL EN CRM INSTANTÁNEAMENTE */}
                        {fabDsFinalClientName && fabDsFinalClientName.trim() !== '' && !entities.some(e => e.name?.trim().toLowerCase() === fabDsFinalClientName.trim().toLowerCase() && e.type === 'client') && (
                          <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const trimmed = fabDsFinalClientName.trim();
                                  await addDoc(collection(db, 'entities'), {
                                    name: trimmed,
                                    contact: fabDsFinalClientContact ? fabDsFinalClientContact.trim() : '',
                                    type: 'client',
                                    rate: 0,
                                    isAntUpdater: false,
                                    antUpdateCost: 0,
                                    ownerId: user.uid,
                                    createdAt: new Date().toISOString()
                                  });
                                  setFabStatusMessage({
                                    type: 'success',
                                    title: 'Cliente Guardado ✓',
                                    description: `Se registró a "${trimmed}" como Cliente Final en su CRM de contactos.`
                                  });
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-[9px] uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all border border-indigo-550"
                            >
                              ➕ Guardar "{fabDsFinalClientName}" en CRM (Cliente Final)
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Costo (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={fabDsCost}
                          onChange={(e) => setFabDsCost(e.target.value)}
                          className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">PVP (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={fabDsRevenue}
                          onChange={(e) => setFabDsRevenue(e.target.value)}
                          className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Días Validez</label>
                        <input
                          type="number"
                          value={fabDsDurationDays}
                          onChange={(e) => setFabDsDurationDays(e.target.value)}
                          className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                        />
                      </div>
                    </div>
                    
                    {/* Tipo de Acceso */}
                    <div className="space-y-1 pt-1.5 border-t border-slate-500/10">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-indigo-500">Tipo de Acceso de Venta</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFabDsServiceType('completa')}
                          className={cn("py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1",
                            fabDsServiceType === 'completa'
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : (isDark ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900")
                          )}
                        >
                          👤 Completa
                        </button>
                        <button
                          type="button"
                          onClick={() => setFabDsServiceType('pantalla')}
                          className={cn("py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1",
                            fabDsServiceType === 'pantalla'
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : (isDark ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900")
                          )}
                        >
                          📺 Pantalla
                        </button>
                      </div>
                    </div>

                    {/* Email y Contraseña */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Email Acceso</label>
                        <input
                          type="text"
                          value={fabDsEmail}
                          onChange={(e) => setFabDsEmail(e.target.value)}
                          className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white")}
                          placeholder="ejemplo@test.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Contraseña</label>
                        <input
                          type="text"
                          value={fabDsPassword}
                          onChange={(e) => setFabDsPassword(e.target.value)}
                          className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white")}
                          placeholder="Contraseña"
                        />
                      </div>
                    </div>

                    {/* Perfil y PIN */}
                    {fabDsServiceType === 'pantalla' ? (
                      <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-indigo-400 tracking-widest">Nombre Perfil</label>
                          <input
                            type="text"
                            required={fabDsServiceType === 'pantalla'}
                            value={fabDsProfileName}
                            placeholder="Ej. Perfil 1"
                            onChange={(e) => setFabDsProfileName(e.target.value)}
                            className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none border-indigo-500/20 shadow-inner text-left", isDark ? "bg-slate-800 text-white" : "bg-indigo-50/20 focus:bg-white")}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-indigo-400 tracking-widest">PIN Acceso</label>
                          <input
                            type="text"
                            required={fabDsServiceType === 'pantalla'}
                            value={fabDsPin}
                            placeholder="Ej. 1234"
                            onChange={(e) => setFabDsPin(e.target.value)}
                            className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none border-indigo-500/20 shadow-inner text-left", isDark ? "bg-slate-800 text-white" : "bg-indigo-50/20 focus:bg-white")}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 animate-in fade-in duration-200">
                        <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">PIN / Acceso (Opcional)</label>
                        <input
                          type="text"
                          value={fabDsPin}
                          placeholder="Ej. General, PIN (Opcional)"
                          onChange={(e) => setFabDsPin(e.target.value)}
                          className={cn("w-full p-2 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55 focus:bg-white")}
                        />
                      </div>
                    )}
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
                        className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
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
                        className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
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
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
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
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
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
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Tarifa Cobrada (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={fabAntChargedRate}
                          onChange={(e) => setFabAntChargedRate(e.target.value)}
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
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
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                          placeholder="Ej. 10.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Caja / Wallet destino</label>
                        <select
                          value={fabLedgerWalletId}
                          onChange={(e) => setFabLedgerWalletId(e.target.value)}
                          className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
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
                        className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                        placeholder={quickAddType === 'income' ? 'Ej. Intereses, Venta Equipos' : 'Ej. Compras, Viáticos'}
                      />
                      {quickAddType === 'expense' && (
                        <div className="pt-1 flex flex-wrap gap-1 px-0.5">
                          {[
                            { label: '🌐 Internet', val: 'Pago de Internet / Wifi' },
                            { label: '💳 Tarjeta', val: 'Pago de Tarjeta de Crédito' },
                            { label: '🔌 Servicios', val: 'Servicios Básicos (Luz/Agua/Gas)' },
                            { label: '🏢 Arriendo', val: 'Arriendo de Local' }
                          ].map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setFabLedgerCategory(item.val);
                                setFabLedgerDescription(`Pago recurrente mensual de ${item.val}`);
                              }}
                              className={cn(
                                "px-2 py-1 text-[8px] font-bold rounded-lg border transition-all cursor-pointer",
                                isDark 
                                  ? "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white" 
                                  : "bg-slate-100/100 border-slate-200/80 text-slate-650 hover:text-slate-900"
                              )}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Detalle / Notas</label>
                      <input
                        required
                        type="text"
                        value={fabLedgerDescription}
                        onChange={(e) => setFabLedgerDescription(e.target.value)}
                        className={cn("w-full p-2.5 rounded-lg border text-xs font-bold transition-all outline-none shadow-inner text-left", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                        placeholder="Notas explicativas del movimiento"
                      />
                    </div>

                    {/* RECURRENT & PENDING SELECTIONS IN FAB */}
                    <div className="pt-2 flex items-center justify-between gap-4 border-t border-slate-150/15 dark:border-slate-800/60">
                      <label className="flex items-center gap-1.5 text-[8.5px] font-black uppercase text-slate-505 dark:text-slate-400 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={fabLedgerIsRecurring} 
                          onChange={e => {
                            setFabLedgerIsRecurring(e.target.checked);
                            if (e.target.checked && !fabLedgerDueDate) {
                              setFabLedgerDueDate(new Date().toISOString().split('T')[0]);
                            }
                          }} 
                        />
                        <span>¿Recurrente?</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[8.5px] font-black uppercase text-slate-505 dark:text-slate-400 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={fabLedgerIsPending} 
                          onChange={e => {
                            setFabLedgerIsPending(e.target.checked);
                            if (e.target.checked && !fabLedgerDueDate) {
                              setFabLedgerDueDate(new Date().toISOString().split('T')[0]);
                            }
                          }} 
                        />
                        <span>Pendiente {quickAddType === 'expense' ? '(CxP)' : '(CxC)'}</span>
                      </label>
                    </div>

                    {(fabLedgerIsRecurring || fabLedgerIsPending) && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-1">
                          <label className="text-[8.5px] font-black uppercase tracking-widest text-indigo-400">Fecha de Vencimiento</label>
                          <input 
                            required
                            type="date"
                            value={fabLedgerDueDate}
                            onChange={(e) => setFabLedgerDueDate(e.target.value)}
                            className={cn("w-full p-2 rounded-lg border text-xs font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 font-mono">N° Cuotas</label>
                          <input 
                            type="number"
                            min="1"
                            value={fabLedgerInstallments}
                            onChange={(e) => setFabLedgerInstallments(e.target.value)}
                            className={cn("w-full p-2 rounded-lg border text-xs font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                          />
                        </div>
                      </div>
                    )}

                    {/* CREDIT CARD PAYMENT ROUTINE */}
                    {quickAddType === 'expense' && (
                      <div className="pt-2 border-t border-slate-150/15 dark:border-slate-800/60">
                        <label className="flex items-center gap-1.5 text-[8.5px] font-black uppercase text-slate-505 dark:text-slate-400 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={fabLedgerIsCreditCardPayment} 
                            onChange={e => setFabLedgerIsCreditCardPayment(e.target.checked)} 
                          />
                          <span>Pago a Tarjeta de Crédito (Liberar cupo)</span>
                        </label>
                        {fabLedgerIsCreditCardPayment && (
                          <div className="space-y-1 mt-1.5">
                            <label className="text-[8.5px] font-black uppercase tracking-widest text-slate-400">Tarjeta Destinataria (Receptor)</label>
                            <select 
                              required={fabLedgerIsCreditCardPayment}
                              value={fabLedgerTargetWalletId}
                              onChange={(e) => setFabLedgerTargetWalletId(e.target.value)}
                              className={cn("w-full p-2 rounded-lg border text-xs font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-55")}
                            >
                              <option value="">Seleccione Tarjeta...</option>
                              {wallets.filter(w => w.type === 'credit_card').map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
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

      {/* WHATSAPP CONFIRM MODAL (Requirement #1) */}
      <AnimatePresence>
        {whatsappConfirmModal?.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWhatsappConfirmModal(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm shadow-xl"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className={cn(
                "w-full max-w-sm rounded-3xl border p-6 relative z-10 shadow-2xl space-y-4 text-center",
                isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-150 text-slate-900"
              )}
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/25 flex items-center justify-center text-indigo-500 scale-105 animate-pulse">
                <MessageCircle className="w-6 h-6" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="font-sans font-black text-sm tracking-tight text-slate-900 dark:text-white">📞 Confirmar / Añadir WhatsApp</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hemos detectado que estás guardando al cliente nuevo <strong className="text-indigo-550 dark:text-indigo-400">"{whatsappConfirmModal.entityName}"</strong>. ¿Deseas confirmar o agregar su número de WhatsApp/contacto? (Este paso es opcional)
                </p>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Número de WhatsApp</label>
                <input
                  type="text"
                  defaultValue={whatsappConfirmModal.currentContact}
                  id="whatsapp_modal_phone_input"
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-xs font-bold font-mono outline-none shadow-inner",
                    isDark ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500"
                  )}
                  placeholder="Ej. +593987654321"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const inputEl = document.getElementById('whatsapp_modal_phone_input') as HTMLInputElement;
                    whatsappConfirmModal.onConfirm(inputEl?.value || '');
                  }}
                  className="py-2.5 px-4 bg-indigo-650 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Confirmar ✓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    whatsappConfirmModal.onConfirm('');
                  }}
                  className={cn(
                    "py-2.5 px-4 border text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer",
                    isDark ? "border-slate-700 hover:bg-slate-800 text-slate-405" : "border-slate-200 hover:bg-slate-100 text-slate-500"
                  )}
                >
                  Omitir Paso
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM STATUS MESSAGE DIALOG (Requirement #7) */}
      <AnimatePresence>
        {fabStatusMessage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFabStatusMessage(null)}
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            />
            
            {/* Overlay Box */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className={cn(
                "w-full max-w-xs rounded-3xl border p-6 relative z-10 shadow-2xl space-y-4 text-center",
                isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-150 text-slate-900"
              )}
            >
              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center">
                {fabStatusMessage.type === 'success' ? (
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="w-6 h-6 animate-bounce" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500">
                    <X className="w-6 h-6 animate-pulse" />
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <h3 className="font-sans font-black text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  {fabStatusMessage.title}
                </h3>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {fabStatusMessage.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFabStatusMessage(null)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl cursor-pointer shadow-md transition-colors focus:outline-none"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
