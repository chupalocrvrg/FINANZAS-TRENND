import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  Sparkles, 
  Image as ImageIcon, 
  Paperclip, 
  Trash2,
  CheckCircle2,
  PlusCircle,
  FileText,
  Check,
  Calendar,
  Lock,
  Mail,
  User,
  ExternalLink,
  Key,
  Camera
} from 'lucide-react';
import { cn, calculateServiceExpirationDate, getGMT5DateString } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { Entity } from '../types';
import { GoogleGenAI } from '@google/genai';

interface AIMessage {
  role: 'user' | 'model';
  text: string;
  image?: string; // base64 / data URL
  actionParsed?: {
    type: 'add_transaction' | 'add_digital_service';
    success?: boolean;
    // Transaction ANT fields:
    finalClientName?: string;
    warehouse?: string;
    intermediaryId?: string;
    intermediaryName?: string;
    
    // Digital Service fields:
    name?: string;
    email?: string;
    password?: string;
    pin?: string;
    expirationDate?: string;
    cost?: number;
    revenue?: number;
    supplierId?: string;
    supplierName?: string;

    // UI selection state
    selectedClientEntityId?: string;
    customClientName?: string;
    isSaved?: boolean;
  };
}

interface ConfirmData {
  clientEntityId: string;
  customClientName: string;
  clientContact: string;
  clientType: 'client' | 'reseller' | 'intermediary';

  // Supplier
  supplierId?: string;
  customSupplierName?: string;

  // Account details
  name: string;
  email?: string;
  password?: string;
  pin?: string;
  expirationDate?: string;
  cost: number;
  revenue: number; // Selected corresponding revenue based on clientType
  
  // Custom prices
  pvpClient: number;
  pvpReseller: number;
  addToCatalog: boolean;

  // Wallet parameters
  isPaid: boolean;
  revenueWalletId: string;
  isCostPaid: boolean;
  costWalletId: string;
}

interface DigitalServiceFormCardProps {
  draft: any;
  clients: Entity[];
  resellers: Entity[];
  intermediaries: Entity[];
  catalogItems: any[];
  wallets: any[];
  suppliers: Entity[];
  onConfirm: (data: ConfirmData) => void;
  isDark: boolean;
}

function DigitalServiceFormCard({ draft, clients, resellers, intermediaries, catalogItems, wallets, suppliers, onConfirm, isDark }: DigitalServiceFormCardProps) {
  // Account details states
  const [serviceName, setServiceName] = useState(draft.name || '');
  const [email, setEmail] = useState(draft.email || '');
  const [password, setPassword] = useState(draft.password || '');
  const [pin, setPin] = useState(draft.pin || '');
  const [expirationDate, setExpirationDate] = useState(() => {
    if (draft.expirationDate) return draft.expirationDate;
    return calculateServiceExpirationDate(draft.name || '', draft.pin || '');
  });

  // Financial parameters
  const [cost, setCost] = useState(Number(draft.cost) || 0);
  const [pvpClient, setPvpClient] = useState(Number(draft.revenue) || 0);
  const [pvpReseller, setPvpReseller] = useState(
    Number(draft.revenue) ? Math.max(0, Number(draft.revenue) - 1.5) : 0
  );
  
  // Selection States
  const [clientType, setClientType] = useState<'client' | 'reseller' | 'intermediary'>('client');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [clientPhone, setClientPhone] = useState(draft.clientContact || '');
  const [addToCatalog, setAddToCatalog] = useState(false);

  // Supplier Selection States
  const [supplierId, setSupplierId] = useState(draft.supplierId || '');
  const [customSupplierInput, setCustomSupplierInput] = useState(draft.supplierName || '');
  const [showCustomSupplier, setShowCustomSupplier] = useState(false);

  // Wallet and payment states
  const [isPaid, setIsPaid] = useState(true);
  const [isCostPaid, setIsCostPaid] = useState(true);
  const [revenueWalletId, setRevenueWalletId] = useState('');
  const [costWalletId, setCostWalletId] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  // Auto-detect compatibility with existing Catalog, prefill values, set AddToCatalog flag
  useEffect(() => {
    if (!serviceName) return;
    const matchedItem = catalogItems.find(c => c.name.toLowerCase() === serviceName.toLowerCase());
    
    if (matchedItem) {
      setAddToCatalog(false);
      if (matchedItem.pvp) {
        setPvpClient(Number(matchedItem.pvp));
      }
      if (matchedItem.pvpReseller) {
        setPvpReseller(Number(matchedItem.pvpReseller));
      }
      if (matchedItem.providers && matchedItem.providers.length > 0) {
        const foundSupp = matchedItem.providers[0];
        setCost(Number(foundSupp.cost));
        if (foundSupp.supplierId) {
          setSupplierId(foundSupp.supplierId);
          setShowCustomSupplier(false);
        }
      }
    } else {
      setAddToCatalog(true);
    }
  }, [serviceName, catalogItems]);

  // Real-time cost updates when supplier dropdown changes
  useEffect(() => {
    if (!serviceName || !supplierId) return;
    const matchedItem = catalogItems.find(c => c.name.toLowerCase() === serviceName.toLowerCase());
    if (matchedItem && matchedItem.providers) {
      const matchProvider = matchedItem.providers.find((p: any) => p.supplierId === supplierId);
      if (matchProvider && matchProvider.cost) {
        setCost(Number(matchProvider.cost));
      }
    }
  }, [supplierId, serviceName, catalogItems]);

  // Auto-fill client states if matching client name exists in CRM
  useEffect(() => {
    const draftName = draft.customClientName || draft.clientName || '';
    if (draftName) {
      const match = [...clients, ...resellers, ...intermediaries].find(
        c => c.name.toLowerCase() === draftName.toLowerCase()
      );
      if (match) {
        setSelectedClientId(match.id);
        setClientType(match.type as 'client' | 'reseller' | 'intermediary' || 'client');
        setShowCustomInput(false);
      } else {
        setCustomNameInput(draftName);
        setShowCustomInput(true);
      }
    }
  }, [draft.customClientName, draft.clientName, clients, resellers, intermediaries]);

  // Auto-fill supplier states if matching supplier name exists in CRM
  useEffect(() => {
    const draftSupp = draft.supplierName || '';
    if (draftSupp) {
      const match = suppliers.find(
        s => s.name.toLowerCase() === draftSupp.toLowerCase()
      );
      if (match) {
        setSupplierId(match.id);
        setShowCustomSupplier(false);
      } else {
        setCustomSupplierInput(draftSupp);
        setShowCustomSupplier(true);
      }
    }
  }, [draft.supplierName, suppliers]);

  const handleSelectCatalogItem = (name: string) => {
    if (!name) return;
    setServiceName(name);
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId) {
      const match = [...clients, ...resellers, ...intermediaries].find(c => c.id === clientId);
      if (match) {
        if (match.contact) {
          setClientPhone(match.contact);
        }
      }
    }
  };

  const activePVP = clientType === 'client' ? pvpClient : pvpReseller;
  const netUtility = activePVP - cost;
  const marginPercent = activePVP > 0 ? Math.round((netUtility / activePVP) * 100) : 0;

  const handleRegister = () => {
    if (!serviceName.trim()) {
      alert("Ingrese por favor el nombre del servicio / producto.");
      return;
    }

    let finalClientName = '';
    if (showCustomInput) {
      if (!customNameInput.trim()) {
        alert("Escriba por favor el nombre del nuevo cliente.");
        return;
      }
      finalClientName = customNameInput.trim();
    } else {
      if (!selectedClientId) {
        alert("Selecciona un cliente de la lista o añade uno nuevo (+).");
        return;
      }
      const match = [...clients, ...resellers, ...intermediaries].find(c => c.id === selectedClientId);
      finalClientName = match ? match.name : '';
    }

    let finalSupplierId = '';
    let finalSupplierName = '';
    if (showCustomSupplier) {
      if (!customSupplierInput.trim()) {
        alert("Escriba por favor el nombre del nuevo proveedor.");
        return;
      }
      finalSupplierName = customSupplierInput.trim();
    } else {
      if (!supplierId) {
        alert("Selecciona un proveedor de la lista o añade uno nuevo (+).");
        return;
      }
      const matchSupp = suppliers.find(s => s.id === supplierId);
      finalSupplierName = matchSupp ? matchSupp.name : '';
      finalSupplierId = supplierId;
    }

    onConfirm({
      clientEntityId: showCustomInput ? '' : selectedClientId,
      customClientName: showCustomInput ? finalClientName : '',
      clientContact: clientPhone.trim(),
      clientType,
      supplierId: finalSupplierId,
      customSupplierName: finalSupplierName,
      name: serviceName.trim(),
      email: email.trim(),
      password: password.trim(),
      pin: pin.trim(),
      expirationDate,
      cost,
      revenue: activePVP,
      pvpClient,
      pvpReseller,
      addToCatalog,
      isPaid,
      revenueWalletId,
      isCostPaid,
      costWalletId
    });
  };

  return (
    <div className={cn(
      "mt-3 p-3.5 rounded-xl border flex flex-col gap-3.5 shadow-md text-left transition-all",
      isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-indigo-50/40 border-indigo-100 text-slate-800"
    )}>
      
      {/* Title block */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[10px] text-indigo-500">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
          Configurador de Venta Digital
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide",
          addToCatalog 
            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
            : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10"
        )}>
          {addToCatalog ? 'NUEVO SERVICIO' : 'SINCRO CATÁLOGO'}
        </div>
      </div>

      {/* 1. Account / Product details Block */}
      <div className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800 bg-white/40 dark:bg-slate-950/20">
        
        {/* Product / Service Name Input */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Servicio / Producto</label>
          <div className="flex flex-col gap-1.5">
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className={cn(
                "w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border outline-none focus:border-indigo-500",
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-800"
              )}
              placeholder="Ej. Netflix 1 Pantalla HD..."
            />
            {catalogItems.length > 0 && (
              <select
                onChange={(e) => handleSelectCatalogItem(e.target.value)}
                value=""
                className={cn(
                  "w-full px-2 py-1 rounded border text-[10px] text-slate-500 dark:text-slate-400 outline-none",
                  isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                )}
              >
                <option value="">-- O elegir del catálogo --</option>
                {catalogItems.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Credentials form fields */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] font-bold uppercase text-slate-400">Correo</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "px-2 py-1 rounded border text-xs outline-none focus:border-indigo-500",
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-700"
              )}
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] font-bold uppercase text-slate-400">Contraseña</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                "px-2 py-1 rounded border text-xs outline-none focus:border-indigo-500",
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-700"
              )}
              placeholder="Clave acceso"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] font-bold uppercase text-slate-400">PIN / Perfil</label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={cn(
                "px-2 py-1 rounded border text-xs outline-none focus:border-indigo-500",
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-700"
              )}
              placeholder="Perfil o PIN"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] font-bold uppercase text-slate-400">Fecha Vencimiento</label>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className={cn(
                "px-2 py-1 rounded border text-xs outline-none focus:border-indigo-500 font-mono",
                isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 text-slate-700"
              )}
            />
          </div>
        </div>
      </div>

      {/* 2. Client and Reseller classification & contact Block */}
      <div className="flex flex-col gap-2.5 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800 bg-white/40 dark:bg-slate-950/20">
        
        {/* Toggle between End Client & Reseller */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tipo de Cliente / Comprador</label>
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-250 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => { setClientType('client'); setSelectedClientId(''); }}
              className={cn(
                "py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center",
                clientType === 'client'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-indigo-600")
              )}
            >
              👤 Cliente
            </button>
            <button
              type="button"
              onClick={() => { setClientType('reseller'); setSelectedClientId(''); }}
              className={cn(
                "py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center",
                clientType === 'reseller'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-indigo-600")
              )}
            >
              🏪 Revend.
            </button>
            <button
              type="button"
              onClick={() => { setClientType('intermediary'); setSelectedClientId(''); }}
              className={cn(
                "py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center",
                clientType === 'intermediary'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-indigo-600")
              )}
            >
              🏢 Intermed.
            </button>
          </div>
        </div>

        {/* Supplier / Provider Selection */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">¿Quién es el Proveedor?</label>
          
          {!showCustomSupplier ? (
            <div className="flex gap-1.5 flex-row">
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className={cn(
                  "flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none border focus:border-indigo-500",
                  isDark ? "bg-slate-800 border-slate-750 text-slate-100" : "bg-white border-slate-200 text-slate-850"
                )}
              >
                <option value="">-- Seleccionar Proveedor --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { setShowCustomSupplier(true); setSupplierId(''); }}
                title="Añadir nuevo proveedor"
                className={cn(
                  "p-1.5 rounded-lg border flex items-center justify-center cursor-pointer hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors",
                  isDark ? "bg-slate-850 border-slate-700" : "bg-white border-slate-200"
                )}
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5 items-center flex-row">
              <input
                type="text"
                placeholder="Nombre del nuevo proveedor..."
                value={customSupplierInput}
                onChange={(e) => setCustomSupplierInput(e.target.value)}
                className={cn(
                  "flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none border focus:border-indigo-500",
                  isDark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-880"
                )}
              />
              <button
                type="button"
                onClick={() => { setShowCustomSupplier(false); setCustomSupplierInput(''); }}
                className="text-[10px] font-extrabold text-slate-450 hover:text-indigo-500 cursor-pointer"
              >
                Volver
              </button>
            </div>
          )}
        </div>

        {/* Client Selection */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">¿A quién se le vende?</label>
          
          {!showCustomInput ? (
            <div className="flex gap-1.5">
              <select
                value={selectedClientId}
                onChange={(e) => handleSelectClient(e.target.value)}
                className={cn(
                  "flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none border focus:border-indigo-500",
                  isDark ? "bg-slate-800 border-slate-750 text-slate-100" : "bg-white border-slate-200 text-slate-850"
                )}
              >
                <option value="">-- Seleccionar --</option>
                {clientType === 'client' && clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.contact ? `(${c.contact})` : ''}</option>
                ))}
                {clientType === 'reseller' && resellers.map(r => (
                  <option key={r.id} value={r.id}>{r.name} {r.contact ? `(${r.contact})` : ''}</option>
                ))}
                {clientType === 'intermediary' && intermediaries.map(i => (
                  <option key={i.id} value={i.id}>{i.name} {i.contact ? `(${i.contact})` : ''}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { setShowCustomInput(true); setSelectedClientId(''); }}
                title="Añadir nuevo cliente/socio"
                className={cn(
                  "p-1.5 rounded-lg border flex items-center justify-center cursor-pointer hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors",
                  isDark ? "bg-slate-850 border-slate-700" : "bg-white border-slate-200"
                )}
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5 items-center">
              <input
                type="text"
                placeholder="Nombre del nuevo..."
                value={customNameInput}
                onChange={(e) => setCustomNameInput(e.target.value)}
                className={cn(
                  "flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none border focus:border-indigo-500",
                  isDark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-880"
                )}
              />
              <button
                type="button"
                onClick={() => { setShowCustomInput(false); setCustomNameInput(''); }}
                className="text-[10px] font-extrabold text-slate-400 hover:text-indigo-500 cursor-pointer"
              >
                Volver
              </button>
            </div>
          )}
        </div>

        {/* Client Contact Phone Number / WhatsApp */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Teléfono / WhatsApp Cliente</label>
          <input
            type="text"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className={cn(
              "px-2.5 py-1.5 rounded-lg border text-xs font-semibold outline-none focus:border-indigo-500",
              isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-700"
            )}
            placeholder="Ej. +593987654321..."
          />
        </div>
      </div>

      {/* 3. Detailed Financials row (Cost, PVP Cliente, PVP Revendedor) */}
      <div className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800 bg-white/40 dark:bg-slate-950/20">
        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Dimensiones de Precios ($)</label>
        
        <div className="grid grid-cols-3 gap-1.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-tight">Costo Compra</span>
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
              className={cn(
                "px-2 py-1 rounded text-xs text-center font-bold font-mono outline-none border focus:border-indigo-500",
                isDark ? "bg-slate-800 border-slate-700 text-rose-350" : "bg-white border-slate-200 text-rose-600"
              )}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-tight">PVP Cliente</span>
            <input
              type="number"
              step="0.01"
              value={pvpClient}
              onChange={(e) => setPvpClient(parseFloat(e.target.value) || 0)}
              className={cn(
                "px-2 py-1 rounded text-xs text-center font-bold font-mono outline-none border focus:border-indigo-500",
                isDark ? "bg-slate-800 border-slate-700 text-emerald-350" : "bg-white border-slate-200 text-emerald-600"
              )}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-tight">PVP Revendedor</span>
            <input
              type="number"
              step="0.01"
              value={pvpReseller}
              onChange={(e) => setPvpReseller(parseFloat(e.target.value) || 0)}
              className={cn(
                "px-2 py-1 rounded text-xs text-center font-bold font-mono outline-none border focus:border-indigo-500",
                isDark ? "bg-slate-800 border-slate-700 text-sky-350" : "bg-white border-slate-200 text-sky-600"
              )}
            />
          </div>
        </div>

        {/* Live Margins calculations block */}
        <div className={cn(
          "mt-1 flex justify-between items-center p-2 rounded-lg font-mono text-[10px] border border-slate-200/50 dark:border-slate-800 bg-slate-500/5",
          isDark ? "text-slate-300" : "text-slate-600"
        )}>
          <span className="font-bold flex items-center gap-1">
            Utilidad: 
            <span className={cn("font-black text-[11px]", netUtility >= 0 ? "text-emerald-500" : "text-rose-500")}>
              ${netUtility.toFixed(2)}
            </span>
          </span>
          <span className="font-bold">
            Margen: <span className="text-indigo-500 font-extrabold">{marginPercent}%</span>
          </span>
        </div>
      </div>

      {/* 4. Payment & Wallets Selection Toggles */}
      <div className="flex flex-col gap-2.5 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800 bg-white/40 dark:bg-slate-950/20">
        <div className="space-y-1 text-left">
          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Estado de Cobro de Venta</label>
          <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setIsPaid(true)}
              className={cn("py-1 rounded text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer",
                isPaid ? "bg-emerald-500 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
              )}
            >
              Cobrado
            </button>
            <button
              type="button"
              onClick={() => { setIsPaid(false); setRevenueWalletId(''); }}
              className={cn("py-1 rounded text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer",
                !isPaid ? "bg-amber-500 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
              )}
            >
              Pendiente (CxC)
            </button>
          </div>
          {isPaid && (
            <select
              value={revenueWalletId}
              required={isPaid}
              onChange={(e) => setRevenueWalletId(e.target.value)}
              className={cn("w-full px-2 py-1.5 rounded border text-[10px] font-bold outline-none mt-1",
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-700"
              )}
            >
              <option value="">Seleccione Cuenta Cobro...</option>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
        </div>

        <div className="space-y-1 text-left pt-2 border-t border-dashed border-slate-200/30">
          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Estado de Costo (Inversión)</label>
          <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setIsCostPaid(true)}
              className={cn("py-1 rounded text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer",
                isCostPaid ? "bg-indigo-650 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
              )}
            >
              Pagado
            </button>
            <button
              type="button"
              onClick={() => { setIsCostPaid(false); setCostWalletId(''); }}
              className={cn("py-1 rounded text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer",
                !isCostPaid ? "bg-amber-500 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
              )}
            >
              Pendiente (CxP)
            </button>
          </div>
          {isCostPaid && (
            <select
              value={costWalletId}
              required={isCostPaid}
              onChange={(e) => setCostWalletId(e.target.value)}
              className={cn("w-full px-2 py-1.5 rounded border text-[10px] font-bold outline-none mt-1",
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-700"
              )}
            >
              <option value="">Seleccione Cuenta Pago...</option>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* 4. Auto save to digital catalog checkbox trigger */}
      {addToCatalog ? (
        <div className="flex items-center gap-2 px-1 text-left">
          <input
            id="chk-add-cat"
            type="checkbox"
            checked={addToCatalog}
            onChange={(e) => setAddToCatalog(e.target.checked)}
            className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
          />
          <label htmlFor="chk-add-cat" className="text-[10px] font-black uppercase text-amber-500 tracking-wide cursor-pointer flex items-center gap-1 leading-none select-none">
            ✨ Guardar este nuevo servicio en el catálogo
          </label>
        </div>
      ) : (
        <div className="px-1 text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest text-left flex items-center gap-1 select-none">
          ✓ Vinculado con digital_catalog
        </div>
      )}

      {/* 5. Verification Checkbox (Mandatory Intervention) */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-500/10 bg-rose-500/5 dark:bg-rose-500/5 text-left">
        <input
          id="chk-verify-save"
          type="checkbox"
          checked={isVerified}
          onChange={(e) => setIsVerified(e.target.checked)}
          className="w-4 h-4 text-emerald-650 border-slate-300 rounded focus:ring-emerald-500 mt-0.5 cursor-pointer accent-emerald-500"
        />
        <label htmlFor="chk-verify-save" className={cn("text-[10px] font-bold cursor-pointer select-none leading-snug", isDark ? "text-slate-300" : "text-slate-750")}>
          He verificado y confirmo que los nombres de cliente final, revendedores, intermediarios y proveedores son correctos y deseo guardar la venta.
        </label>
      </div>

      {/* Trigger Register */}
      <button
        disabled={!isVerified}
        onClick={handleRegister}
        className={cn(
          "w-full p-2.5 rounded-xl font-bold uppercase text-[9px] tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer",
          isVerified 
            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-650/15" 
            : "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed opacity-50"
        )}
      >
        <Check className="w-4 h-4" /> Registrar Cuenta y Venta
      </button>
    </div>
  );
}

interface AntUpdateConfirmData {
  clientEntityId?: string;
  customClientName?: string;
  clientType?: 'client' | 'reseller' | 'intermediary';
  finalClientName: string;
  warehouse: string;
  intermediaryId: string;
  intermediaryName: string;
  chargedRate: number;
}

interface AntUpdateFormCardProps {
  draft: any;
  clients: Entity[];
  resellers: Entity[];
  intermediaries: Entity[];
  onConfirm: (data: AntUpdateConfirmData) => void;
  isDark: boolean;
}

function AntUpdateFormCard({ draft, clients, resellers, intermediaries, onConfirm, isDark }: AntUpdateFormCardProps) {
  const [warehouse, setWarehouse] = useState(draft.warehouse || '');
  const [intermediaryId, setIntermediaryId] = useState(draft.intermediaryId || '');
  const [isVerified, setIsVerified] = useState(false);

  // Selection States
  const [clientType, setClientType] = useState<'client' | 'reseller' | 'intermediary'>('client');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customNameInput, setCustomNameInput] = useState(draft.finalClientName || '');
  const [showCustomInput, setShowCustomInput] = useState(!draft.finalClientName);

  // Auto-fill states if matching name exists
  useEffect(() => {
    if (draft.finalClientName) {
      const match = [...clients, ...resellers, ...intermediaries].find(
        c => c.name.toLowerCase() === draft.finalClientName.toLowerCase()
      );
      if (match) {
        setSelectedClientId(match.id);
        setClientType(match.type as 'client' | 'reseller' | 'intermediary' || 'client');
        setShowCustomInput(false);
      } else {
        setCustomNameInput(draft.finalClientName);
        setShowCustomInput(true);
      }
    }
  }, [draft.finalClientName, clients, resellers, intermediaries]);

  const handleRegister = () => {
    let finalClient = '';
    if (showCustomInput) {
      if (!customNameInput.trim()) {
        alert("Escriba por favor el nombre del nuevo socio comercial.");
        return;
      }
      finalClient = customNameInput.trim();
    } else {
      if (!selectedClientId) {
        alert("Selecciona un socio comercial de la lista o añade uno nuevo (+).");
        return;
      }
      const match = [...clients, ...resellers, ...intermediaries].find(c => c.id === selectedClientId);
      finalClient = match ? match.name : '';
    }

    if (!warehouse.trim()) {
      alert("Ingrese por favor la bodega o establecimiento.");
      return;
    }

    const inter = intermediaries.find(i => i.id === intermediaryId);
    onConfirm({
      clientEntityId: showCustomInput ? '' : selectedClientId,
      customClientName: showCustomInput ? finalClient : '',
      clientType: clientType,
      finalClientName: finalClient,
      warehouse: warehouse.trim(),
      intermediaryId: intermediaryId || '',
      intermediaryName: inter ? inter.name : 'Distribuidor General',
      chargedRate: inter?.rate || 10
    });
  };

  return (
    <div className={cn(
      "mt-3 p-3.5 rounded-xl border flex flex-col gap-3.5 shadow-md text-left transition-all",
      isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-indigo-50/40 border-indigo-100 text-slate-800"
    )}>
      
      {/* Title block */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[10px] text-indigo-500">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
          Configurador de Actualización ANT
        </div>
      </div>

      {/* 1. Account / Product details Block */}
      <div className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800 bg-white/40 dark:bg-slate-950/20">
        
        {/* Toggle between End Client, Reseller & Intermediary */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tipo de Socio Comercial</label>
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-250 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => { setClientType('client'); setSelectedClientId(''); }}
              className={cn(
                "py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center",
                clientType === 'client'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-indigo-600")
              )}
            >
              👥 Cliente
            </button>
            <button
              type="button"
              onClick={() => { setClientType('reseller'); setSelectedClientId(''); }}
              className={cn(
                "py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center",
                clientType === 'reseller'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-indigo-600")
              )}
            >
              🏪 Revend.
            </button>
            <button
              type="button"
              onClick={() => { setClientType('intermediary'); setSelectedClientId(''); }}
              className={cn(
                "py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center",
                clientType === 'intermediary'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-indigo-600")
              )}
            >
              🏢 Intermed.
            </button>
          </div>
        </div>

        {/* Client Selection */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Seleccionar Socio Comercial</label>
          
          {!showCustomInput ? (
            <div className="flex gap-1.5">
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className={cn(
                  "flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none border focus:border-indigo-500",
                  isDark ? "bg-slate-800 border-slate-750 text-slate-100" : "bg-white border-slate-200 text-slate-850"
                )}
              >
                <option value="">-- Seleccionar socio --</option>
                {clientType === 'client' && clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                {clientType === 'reseller' && resellers.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
                {clientType === 'intermediary' && intermediaries.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { setShowCustomInput(true); setSelectedClientId(''); }}
                title="Añadir nuevo socio"
                className={cn(
                  "p-1.5 rounded-lg border flex items-center justify-center cursor-pointer hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors",
                  isDark ? "bg-slate-850 border-slate-700" : "bg-white border-slate-200"
                )}
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5 items-center">
              <input
                type="text"
                placeholder="Nombre del nuevo socio..."
                value={customNameInput}
                onChange={(e) => setCustomNameInput(e.target.value)}
                className={cn(
                  "flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none border focus:border-indigo-500",
                  isDark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-880"
                )}
              />
              <button
                type="button"
                onClick={() => { setShowCustomInput(false); setCustomNameInput(''); }}
                className="text-[10px] font-extrabold text-slate-400 hover:text-indigo-500 cursor-pointer"
              >
                Volver
              </button>
            </div>
          )}
        </div>

        {/* warehouse Input */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Bodega / Establecimiento</label>
          <input
            type="text"
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
            className={cn(
              "w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border outline-none focus:border-indigo-500",
              isDark ? "bg-slate-800 border-slate-705 text-white" : "bg-white border-slate-200 text-slate-880"
            )}
            placeholder="Ej. Bodega Principal / Terminal..."
          />
        </div>

        {/* Intermediary Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Distribuidor Intermediario (Revendedor)</label>
          <select
            value={intermediaryId}
            onChange={(e) => setIntermediaryId(e.target.value)}
            className={cn(
              "w-full px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none border focus:border-indigo-500",
              isDark ? "bg-slate-800 border-slate-750 text-slate-100" : "bg-white border-slate-200 text-slate-850"
            )}
          >
            <option value="">-- No asignado / Seleccione revendedor --</option>
            {intermediaries.map(i => (
              <option key={i.id} value={i.id}>{i.name} (Tasa: ${i.rate || 0})</option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Verification Checkbox (Mandatory Intervention) */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-500/10 bg-rose-500/5 dark:bg-rose-500/5 text-left">
        <input
          id="chk-verify-save-ant"
          type="checkbox"
          checked={isVerified}
          onChange={(e) => setIsVerified(e.target.checked)}
          className="w-4 h-4 text-emerald-650 border-slate-300 rounded focus:ring-emerald-500 mt-0.5 cursor-pointer accent-emerald-500"
        />
        <label htmlFor="chk-verify-save-ant" className={cn("text-[10px] font-bold cursor-pointer select-none leading-snug", isDark ? "text-slate-300" : "text-slate-750")}>
          He verificado y confirmo que los nombres de cliente final, revendedores, intermediarios y establecimientos son correctos y deseo guardar la actualización.
        </label>
      </div>

      {/* Trigger Register */}
      <button
        disabled={!isVerified}
        onClick={handleRegister}
        className={cn(
          "w-full p-2.5 rounded-xl font-bold uppercase text-[9px] tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer",
          isVerified 
            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-650/15" 
            : "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed opacity-50"
        )}
      >
        <Check className="w-4 h-4" /> Registrar Actualización
      </button>
    </div>
  );
}

function runLocalStructuredExtractor(
  text: string, 
  catalogItems: any[], 
  suppliers: any[], 
  intermediaries: any[]
) {
  const normalizedText = text.toLowerCase();
  
  // Decide if it is an ANT Update vs Digital Service
  const isAnt = normalizedText.includes('ant') || 
                normalizedText.includes('planilla') || 
                normalizedText.includes('trámite') || 
                normalizedText.includes('tramite') || 
                normalizedText.includes('depósito') || 
                normalizedText.includes('deposito') || 
                normalizedText.includes('transferencia') || 
                normalizedText.includes('bodega') ||
                normalizedText.includes('establecimiento');
                
  if (isAnt) {
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
    let intermediaryName = "";
    for (const i of intermediaries) {
      if (normalizedText.includes(i.name.toLowerCase())) {
        intermediaryId = i.id;
        intermediaryName = i.name;
        break;
      }
    }
    if (!intermediaryId && intermediaries.length > 0) {
      intermediaryId = intermediaries[0].id;
      intermediaryName = intermediaries[0].name;
    }
    
    return {
      type: "add_transaction",
      success: true,
      finalClientName: finalClientName || "Cliente Planilla",
      warehouse: warehouse || "Establecimiento ANT",
      intermediaryId: intermediaryId || "",
      intermediaryName: intermediaryName || "",
      chargedRate: chargedRate || 0
    };
  } else {
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
    
    const expirationDate = calculateServiceExpirationDate(name, text);
    
    let supplierId = "";
    let supplierName = "";
    for (const s of suppliers) {
      if (normalizedText.includes(s.name.toLowerCase())) {
        supplierId = s.id;
        supplierName = s.name;
        break;
      }
    }
    if (!supplierId && suppliers.length > 0) {
      supplierId = suppliers[0].id;
      supplierName = suppliers[0].name;
    }
    
    let clientContact = "";
    const contactMatch = text.match(/(?:celular|telefono|contacto|telf|\+593)[:\s]*(\+?\d{9,15})/i) || text.match(/\b(09\d{8})\b/);
    if (contactMatch) {
      clientContact = contactMatch[1].trim();
    }
    
    return {
      type: "add_digital_service" as const,
      success: true,
      name,
      email,
      password,
      pin,
      expirationDate,
      cost,
      revenue,
      supplierId,
      supplierName,
      clientContact
    };
  }
}

async function callGeminiClientSide(
  apiKey: string,
  updatedMessages: any[],
  currentImage: string | null,
  currentImageType: string | null,
  intermediaries: any[],
  suppliers: any[],
  catalogItems: any[]
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  
  // Structure chat messages correctly for @google/genai
  const contents: any[] = updatedMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : m.role,
    parts: [{ text: m.text }]
  }));

  if (currentImage) {
    const base64Data = currentImage.split(",")[1] || currentImage;
    const imagePart = {
      inlineData: {
        mimeType: currentImageType || "image/png",
        data: base64Data
      }
    };
    const lastIndex = contents.length - 1;
    if (lastIndex >= 0 && contents[lastIndex].role === 'user') {
      contents[lastIndex].parts.push(imagePart);
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: "Analiza y extrae la información de esta transacción o servicio digital." }, imagePart]
      });
    }
  }

  // Ensure turn order correctness (skip leading 'model' nodes, merge adjacent same-role messages)
  let normalizedContents: any[] = [];
  let foundUser = false;
  for (const m of contents) {
    if (m.role === 'user') {
      foundUser = true;
    }
    if (foundUser) {
      if (normalizedContents.length > 0 && normalizedContents[normalizedContents.length - 1].role === m.role) {
        normalizedContents[normalizedContents.length - 1].parts = [
          ...normalizedContents[normalizedContents.length - 1].parts,
          ...m.parts
        ];
      } else {
        normalizedContents.push({
          role: m.role,
          parts: m.parts
        });
      }
    }
  }

  // Fallback if empty after filtering
  if (normalizedContents.length === 0) {
    normalizedContents = [{ role: 'user', parts: [{ text: "Hola" }] }];
  }

  const todayStr = getGMT5DateString();

  const systemInstruction = `Eres un asistente experto para este sistema financiero llamado Control Financiero. Tu objetivo es ayudar al usuario a registrar transacciones, productos digitales y ver balances.

REGLA CRÍTICA PRIMORDIAL DE NO-ASUNCIÓN (MUY IMPORTANTE):
- Si en la imagen, captura o texto de chat compartida NO se muestra, menciona ni se hace referencia explícita al nombre o existencia de un proveedor, revendedor, distribuidor, intermediario o cliente final, el sistema NO DEBE asumir ningún nombre automáticamente.
- No debes inventar, suponer, ni asumir nombres ni de ejemplo para 'finalClientName', 'warehouse', 'intermediaryId', 'supplierId' o 'supplierName'.
- En caso de que no lo indique la captura, pon estrictamente una cadena de texto vacía ("") para esos campos.
- NUNCA crees o asignes valores automáticamente a menos que estén claramente visibles o escritos en el archivo adjunto.

¡TIENES DOS SÚPER PODERES INCREÍBLES!:
1. PROCESAR IMÁGENES/CAPTURAS DE ACTUALIZACIONES ANT:
   - Extraer: Cliente Final ("finalClientName"), Bodega/Establecimiento ("warehouse") y asociarlo con la lista de Distribuidores.
2. PROCESAR IMÁGENES/CHAT CON PROVEEDORES DE CUENTAS DIGITALES (Netflix, Disney+, etc.):
   - Puedes analizar capturas de chats, mensajes de WhatsApp o recibos con proveedores que te entregan cuentas activadas.
   - Extraerá los datos claves:
     * Nombre del Producto / Servicio (ej. Netflix 1 Pantalla, Disney+, Max)
     * Correo electrónico de la cuenta ("email")
     * Contraseña ("password")
     * PIN o perfil registrado ("pin")
     * Fecha de vencimiento ("expirationDate" en formato YYYY-MM-DD. Si se indica "30 días" o similar, calcúlala sumando 30 días a la fecha de hoy, que es ${todayStr})
     * Costo del proveedor ("cost")
     * Precio sugerido o real de venta ("revenue" / precio de venta)
     * Nombre e ID del Proveedor ("supplierId" y "supplierName")
     * Número de teléfono, celular o contacto del cliente si se menciona o se ve en la captura ("clientContact")

CONTEXTO DEL USUARIO:
- Distribuidores/Intermediarios de ANT: ${JSON.stringify(intermediaries || [], null, 2)}
- Proveedores de Cuentas Digitales: ${JSON.stringify(suppliers || [], null, 2)}
- Catálogo de Servicios Digitales del usuario: ${JSON.stringify(catalogItems || [], null, 2)}

INSTRUCCIÓN DE TRABAJO:
Si es un caso de Actualización ANT:
- Presenta qué datos lograste extraer (Socio Comercial, Bodega).
- DEBES incluir al final un bloque \`\`\`json-action con el formato exacto. Si no se puede extraer con certeza, pon "":
\`\`\`json-action
{
  "type": "add_transaction",
  "finalClientName": "NOMBRE_CLIENTE_EXTRAIDO_O_VACIO",
  "warehouse": "BODEGA_O_ESTABLECIMIENTO_EXTRAIDA_O_VACIO",
  "intermediaryId": "ID_INTERMEDIARIO_EXTRAIDO_O_VACIO"
}
\`\`\`

Si es un caso de Venta de Cuenta/Servicio Digital (de proveedor o chat de entrega):
- Indica amablemente que has detectado una cuenta digital y enumera los campos extraídos: Producto, Correo, Clave, PIN, Fecha de Vencimiento, Costo, y Venta.
- Intenta emparejar el producto con la lista del 'Catálogo' suministrado. Si coincide, usa ese nombre exacto de producto, su costo y su precio de venta sugerido.
- Intenta emparejar el proveedor con la lista de 'Proveedores' (por nombre o aproximación).
- DEBES incluir al final un bloque \`\`\`json-action con el siguiente formato EXACTO, calculando la fecha de vencimiento adecuadamente si es relativa (la fecha actual es ${todayStr}):
\`\`\`json-action
{
  "type": "add_digital_service",
  "name": "NOMBRE_DEL_PRODUCTO_SOCIADO_O_CONFIGURADO",
  "email": "CORREO_EXTRAIDO_O_VACIO",
  "password": "CONTRASEÑA_EXTRAIDA_O_VACIO",
  "pin": "PIN_O_PERFIL_EXTRAIDO_O_VACIO",
  "expirationDate": "YYYY-MM-DD_FECHA_EXTRAIDA_O_CALCULADA",
  "cost": COSTO_NUMERICO_EXTRAIDO_O_POR_CATALOGO,
  "revenue": INGRESO_VENTA_NUMERICO_O_POR_CATALOGO,
  "supplierId": "ID_PROVEEDOR_COINCIDENTE_O_VACIO",
  "supplierName": "NOMBRE_PROVEEDOR_COINCIDENTE_O_VACIO",
  "clientContact": "NUMERO_TELEFONO_CLIENTE_O_VACIO"
}
\`\`\`

IMPORTANTE: El bloque JSON-action debe estructurarse de forma impecable sin errores de formato para que no falle la integración. Saboriza tu respuesta con un tono profesional, claro, empático y estructurado en español fluido.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.1,
    },
    contents: normalizedContents
  });

  return response.text || "No obtuve una respuesta válida de Gemini.";
}

export function AIAssistant() {
  const { user, settings } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [messages, setMessages] = useState<AIMessage[]>([
    { 
      role: 'model', 
      text: '¡Hola! Soy tu asistente financiero inteligente, ahora equipado con un **Extractor Local Súper Rápido Autónomo**.\n\n**¡YA NO NECESITAS CLAVE API DE GEMINI PARA EMPEZAR!** 🎉\nSi deseas registrar tus ventas o trámites de manera instantánea y sin configurar ninguna clave o internet, simplemente copia y pega el texto de las entregas o planillas aquí en el chat. El sistema procesará y extraerá:\n\n1. **🛍️ Ventas de Servicios Digitales:** Copia/pega el chat con el proveedor o los datos de la cuenta (correo, clave, pin/perfil, costo/precio, etc.). El extractor local creará la tarjeta de venta de inmediato.\n2. **📝 Actualizaciones ANT:** Coloca o pega detalles de la planilla/depósito de ANT y se formulará la tarjeta de abonos/trámites automáticamente.\n\n*Nota:* Si tienes una clave Gemini API activa (puedes configurarla en 🔑 arriba), también podrás subir capturas e imágenes (OCR multimodal) y conversar de forma libre.' 
    }
  ]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [intermediaries, setIntermediaries] = useState<Entity[]>([]);
  const [clients, setClients] = useState<Entity[]>([]);
  const [resellers, setResellers] = useState<Entity[]>([]);
  const [suppliers, setSuppliers] = useState<Entity[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);

  const [localApiKey, setLocalApiKey] = useState(() => localStorage.getItem('LOCAL_GEMINI_API_KEY') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const handleSaveLocalKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = tempKey.trim();
    if (cleanKey) {
      localStorage.setItem('LOCAL_GEMINI_API_KEY', cleanKey);
      setLocalApiKey(cleanKey);
      setShowKeyInput(false);
      setTempKey('');
      window.dispatchEvent(new Event('local-api-key-updated'));
    }
  };

  const handleClearLocalKey = () => {
    localStorage.removeItem('LOCAL_GEMINI_API_KEY');
    setLocalApiKey('');
    window.dispatchEvent(new Event('local-api-key-updated'));
  };

  useEffect(() => {
    const handleSyncKey = () => {
      setLocalApiKey(localStorage.getItem('LOCAL_GEMINI_API_KEY') || '');
    };
    window.addEventListener('local-api-key-updated', handleSyncKey);
    return () => {
      window.removeEventListener('local-api-key-updated', handleSyncKey);
    };
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isDark = settings?.theme === 'dark';

  // Fetch all entities & catalog context info in real-time
  useEffect(() => {
    if (!user) return;
    
    // All relevant financial entities in a single real-time query
    const qEnt = query(
      collection(db, 'entities'),
      where('ownerId', '==', user.uid)
    );
    const unsubEnt = onSnapshot(qEnt, (snapshot) => {
      const allEnt = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entity));
      setIntermediaries(allEnt.filter(e => e.type === 'intermediary'));
      setClients(allEnt.filter(e => e.type === 'client'));
      setSuppliers(allEnt.filter(e => e.type === 'supplier'));
      setResellers(allEnt.filter(e => e.type === 'reseller'));
    }, (error) => {
      console.error("Error fetching context for AI assistant:", error);
    });

    // Digital catalog items for smart matching
    const qCat = query(
      collection(db, 'digital_catalog'), 
      where('ownerId', '==', user.uid)
    );
    const unsubCat = onSnapshot(qCat, (snapshot) => {
      setCatalogItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching digital catalog context:", error);
    });

    // Wallets for immediate payment resolution
    const qWallets = query(
      collection(db, 'wallets'),
      where('ownerId', '==', user.uid)
    );
    const unsubWallets = onSnapshot(qWallets, (snapshot) => {
      setWallets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching wallets:", error);
    });

    // Digital services for duplicate checking
    const qSer = query(collection(db, 'digital_services'), where('ownerId', '==', user.uid));
    const unsubSer = onSnapshot(qSer, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Transactions for duplicate checking
    const qTx = query(collection(db, 'transactions'), where('ownerId', '==', user.uid));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubEnt();
      unsubCat();
      unsubWallets();
      unsubSer();
      unsubTx();
    };
  }, [user]);

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("No se pudo acceder a la cámara. Asegúrese de otorgar permisos de cámara en su navegador.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setImage(dataUrl);
        setImageType('image/png');
      }
    }
    stopCamera();
  };

  // Stop camera stream on unmount, and support unified FAB event triggers
  useEffect(() => {
    const handleOpenE = () => setIsOpen(true);
    const handleToggleE = () => setIsOpen(prev => !prev);
    window.addEventListener('open-ai-assistant', handleOpenE);
    window.addEventListener('toggle-ai-assistant', handleToggleE);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      window.removeEventListener('open-ai-assistant', handleOpenE);
      window.removeEventListener('toggle-ai-assistant', handleToggleE);
    };
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Support paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (!file) continue;
          
          const reader = new FileReader();
          reader.onloadend = () => {
            setImage(reader.result as string);
            setImageType(file.type);
          };
          reader.readAsDataURL(file);
          break; 
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setImageType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !image) || isTyping) return;
    
    const userMessageText = input.trim() || 'Analiza esta imagen y regístrala por favor';
    const currentImage = image;
    const currentImageType = imageType;

    const updatedMessages: AIMessage[] = [
      ...messages,
      { 
        role: 'user', 
        text: userMessageText, 
        image: currentImage || undefined 
      }
    ];

    // Reset input fields instantly
    setInput('');
    setImage(null);
    setImageType(null);

    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      let apiUrl = (import.meta as any).env.VITE_API_URL || '';
      
      // In a normal browser preview (like AI Studio or web tabs), we are on the same origin as the backend
      // and must use a relative '/api/assistant' path. This protects against CORS / Mixed Content browser blocks
      // if VITE_API_URL is configured to an insecure localhost protocol or a stale domain.
      const isMobileApp = window.location.protocol.startsWith('capacitor') || 
                          window.location.protocol.startsWith('chrome-extension') || 
                          window.location.protocol.startsWith('file');
      if (!isMobileApp) {
        apiUrl = '';
      }

      let responseText = '';

      try {
        const response = await fetch(`${apiUrl}/api/assistant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: updatedMessages.map(m => ({ 
              role: m.role, 
              parts: [{ text: m.text }] 
            })),
            image: currentImage ? {
              mimeType: currentImageType || 'image/png',
              data: currentImage
            } : null,
            intermediaries: intermediaries.map(i => ({ id: i.id, name: i.name, rate: i.rate || 0 })),
            suppliers: suppliers.map(s => ({ id: s.id, name: s.name })),
            catalog: catalogItems.map(c => ({ 
              id: c.id, 
              name: c.name, 
              category: c.category || 'Streaming',
              pvp: c.pvp || 0,
              providers: c.providers || []
            }))
          })
        });

        if (!response.ok) {
          let errMsg = `Error de red (Status: ${response.status})`;
          try {
            const errData = await response.json();
            if (errData && errData.error) {
              errMsg = errData.error;
            }
          } catch (_) {}
          throw new Error(errMsg);
        }

        const data = await response.json();
        responseText = data.text || 'No recibí respuesta.';
      } catch (backendErr: any) {
        console.warn("Express Backend API failed (likely static hosting/Vercel), falling back to client-side Gemini...", backendErr);
        
        // Define the API Key to use on the client-side
        // We prioritize the secure localStorage api key first, then custom environments.
        const clientApiKey = localApiKey || (import.meta as any).env.VITE_GEMINI_API_KEY || "";
        
        if (!clientApiKey) {
          const localParsedResult = runLocalStructuredExtractor(userMessageText, catalogItems, suppliers, intermediaries);
          if (localParsedResult) {
            let descStr = "";
            let actionParsedObj: any = null;
            if (localParsedResult.type === "add_digital_service") {
              const formattedExp = localParsedResult.expirationDate || "";
              descStr = `🚀 **¡Procesador Automático Local Activado!** (Sin Clave API de Gemini)\n\nHe extraído una **Venta de Cuenta Digital** al instante de manera offline:\n\n* **Producto:** ${localParsedResult.name}\n* **Correo:** \`${localParsedResult.email || 'No detectado'}\`\n* **Clave:** \`${localParsedResult.password || 'No detectada'}\`\n* **PIN/Perfil:** ${localParsedResult.pin || 'No detectado'}\n* **Fecha Vto (Estimada):** ${formattedExp}\n* **Costo:** $${localParsedResult.cost.toFixed(2)}\n* **Precio:** $${localParsedResult.revenue.toFixed(2)}\n\nPuedes ajustar cualquier detalle o asignarle el cliente final en la tarjeta de abajo para registrarla oficialmente en Firestore:`;
              
              actionParsedObj = {
                type: 'add_digital_service' as const,
                success: true,
                name: localParsedResult.name,
                email: localParsedResult.email,
                password: localParsedResult.password,
                pin: localParsedResult.pin,
                expirationDate: formattedExp,
                cost: localParsedResult.cost,
                revenue: localParsedResult.revenue,
                supplierId: localParsedResult.supplierId,
                supplierName: localParsedResult.supplierName,
                isSaved: false
              };
            } else {
              descStr = `🚀 **¡Procesador Automático Local Activado!** (Sin Clave API de Gemini)\n\nHe extraído un **Trámite de ANT** al instante de manera offline:\n\n* **Socio / Cliente Final:** ${localParsedResult.finalClientName}\n* **Bodega:** ${localParsedResult.warehouse || 'No detectada'}\n\nPuedes ajustar o verificar los campos en la tarjeta de confirmación de abajo para registrar la actualización en Firestore:`;
              
              actionParsedObj = {
                type: 'add_transaction' as const,
                success: true,
                finalClientName: localParsedResult.finalClientName,
                warehouse: localParsedResult.warehouse,
                intermediaryId: localParsedResult.intermediaryId,
                intermediaryName: localParsedResult.intermediaryName,
                chargedRate: localParsedResult.chargedRate,
                isSaved: false
              };
            }

            setMessages(prev => [...prev, {
              role: 'model',
              text: descStr,
              actionParsed: actionParsedObj
            }]);
            setIsTyping(false);
            return;
          } else {
            setMessages(prev => [...prev, {
              role: 'model',
              text: `⚠️ **Modo Local Sin Clave API**\n\nNo se detectaron datos estructurados suficientes en el texto para realizar una extracción offline. Por favor, asegúrate de escribir los detalles relevantes, como correo, contraseña, PIN, o ANT. Si deseas usar el reconocimiento avanzado de lenguaje, puedes configurar una Clave API Gemini pulsando el botón 🔑 situado arriba.`
            }]);
            setIsTyping(false);
            return;
          }
        }

        try {
          responseText = await callGeminiClientSide(
            clientApiKey,
            updatedMessages,
            currentImage,
            currentImageType,
            intermediaries,
            suppliers,
            catalogItems
          );
        } catch (clientGeminiErr: any) {
          console.error("Client fallback also failed, falling back to local extractor:", clientGeminiErr);
          const localParsedResult = runLocalStructuredExtractor(userMessageText, catalogItems, suppliers, intermediaries);
          if (localParsedResult) {
            let descStr = "";
            let actionParsedObj: any = null;
            if (localParsedResult.type === "add_digital_service") {
              const formattedExp = localParsedResult.expirationDate || "";
              descStr = `⚠️ **Conexión con Gemini falló (Clave API inválida o expirada)**, sin embargo, he activado el **Extractor Local de Respaldo** y obtuve:\n\n* **Producto:** ${localParsedResult.name}\n* **Correo:** \`${localParsedResult.email || 'No detectado'}\`\n* **Clave:** \`${localParsedResult.password || 'No detectada'}\`\n* **PIN/Perfil:** ${localParsedResult.pin || 'No detectado'}\n* **Fecha Vto (Estimada):** ${formattedExp}\n* **Costo:** $${localParsedResult.cost.toFixed(2)}\n* **Precio:** $${localParsedResult.revenue.toFixed(2)}\n\nPuedes ajustar cualquier detalle o asignarle el cliente final en la tarjeta de abajo para registrarla oficialmente en Firestore:`;
              
              actionParsedObj = {
                type: 'add_digital_service' as const,
                success: true,
                name: localParsedResult.name,
                email: localParsedResult.email,
                password: localParsedResult.password,
                pin: localParsedResult.pin,
                expirationDate: formattedExp,
                cost: localParsedResult.cost,
                revenue: localParsedResult.revenue,
                supplierId: localParsedResult.supplierId,
                supplierName: localParsedResult.supplierName,
                isSaved: false
              };
            } else {
              descStr = `⚠️ **Conexión con Gemini falló (Clave API inválida o expirada)**, sin embargo, he activado el **Extractor Local de Respaldo** y obtuve:\n\n* **Titular / Cliente Final:** ${localParsedResult.finalClientName}\n* **Bodega:** ${localParsedResult.warehouse || 'No detectada'}\n\nPuedes ajustar o verificar los campos en la tarjeta de confirmación de abajo para registrar la actualización en Firestore:`;
              
              actionParsedObj = {
                type: 'add_transaction' as const,
                success: true,
                finalClientName: localParsedResult.finalClientName,
                warehouse: localParsedResult.warehouse,
                intermediaryId: localParsedResult.intermediaryId,
                intermediaryName: localParsedResult.intermediaryName,
                chargedRate: localParsedResult.chargedRate,
                isSaved: false
              };
            }

            setMessages(prev => [...prev, {
              role: 'model',
              text: descStr,
              actionParsed: actionParsedObj
            }]);
            setIsTyping(false);
            return;
          } else {
            setMessages(prev => [...prev, { 
              role: 'model', 
              text: `⚠️ **Error de API Gemini Directa y Extracción Local Falló**\n\nLa conexión directa con la API de Gemini falló (${clientGeminiErr.message || "desconocido"}) y el texto suministrado no cuenta con datos estructurados legibles para una extracción automática fuera de línea.` 
            }]);
            setIsTyping(false);
            return;
          }
        }
      }

      // Parse structured JSON matches inside backend markdown codeblock
      let actionMatch = responseText.match(/```json-action\s*([\s\S]*?)\s*```/);
      let parsedAction = null;
      let cleanedText = responseText;

      if (actionMatch && actionMatch[1]) {
        try {
          parsedAction = JSON.parse(actionMatch[1].trim());
          // Strip codeblock so it doesn't show raw text to the user
          cleanedText = responseText.replace(/```json-action\s*[\s\S]*?\s*```/g, '').trim();
        } catch (err) {
          console.error("Error parsing AI action JSON:", err);
        }
      }

      let actionResult: any = null;

      if (parsedAction) {
        if (parsedAction.type === 'add_transaction') {
          // Case 1: ANT Update draft creation for manual confirmation
          const { finalClientName, warehouse, intermediaryId } = parsedAction;
          actionResult = {
            type: 'add_transaction',
            success: true,
            finalClientName: finalClientName || '',
            warehouse: warehouse || '',
            intermediaryId: intermediaryId || '',
            isSaved: false
          };
        } else if (parsedAction.type === 'add_digital_service') {
          // Case 2: Digital account extraction sale
          const { name, email, password, pin, expirationDate, cost, revenue, supplierId, supplierName } = parsedAction;
          
          actionResult = {
            type: 'add_digital_service',
            success: true,
            name: name || 'Servicio Digital',
            email: email || '',
            password: password || '',
            pin: pin || '',
            expirationDate: expirationDate || calculateServiceExpirationDate(name || '', pin || ''),
            cost: Number(cost) || 0,
            revenue: Number(revenue) || 0,
            supplierId: supplierId || '',
            supplierName: supplierName || '',
            isSaved: false
          };
        }
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: cleanedText || '¡Completado exitosamente!',
        actionParsed: actionResult || undefined
      }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: 'Error al conectar con el asistente de inteligencia artificial Gemini.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleConfirmDigitalService = async (msgIndex: number, data: ConfirmData) => {
    if (!user) return;
    const msg = messages[msgIndex];
    if (!msg || !msg.actionParsed || msg.actionParsed.type !== 'add_digital_service') return;

    // Check duplicates before continuing
    const isDuplicate = services.some(s => 
      s.email?.trim().toLowerCase() === data.email?.trim().toLowerCase() &&
      s.password === data.password &&
      s.pin === data.pin &&
      s.name?.trim().toLowerCase() === data.name.trim().toLowerCase()
    );

    if (isDuplicate) {
      alert("¡Error de duplicado! Ya existe una venta de servicio digital registrada exactamente con la misma cuenta, correo, clave y pin.");
      return;
    }

    let finalClient = data.customClientName.trim();
    let finalContact = data.clientContact.trim();

    if (data.clientEntityId) {
      const match = [...clients, ...resellers, ...intermediaries].find(c => c.id === data.clientEntityId);
      if (match) {
        finalClient = match.name;
        if (!finalContact) {
          finalContact = match.contact || '';
        }
      }
    }

    let finalSupplierId = data.supplierId || '';
    let finalSupplierName = data.customSupplierName?.trim() || '';

    if (data.supplierId) {
      const matchSupp = suppliers.find(s => s.id === data.supplierId);
      if (matchSupp) {
        finalSupplierName = matchSupp.name;
      }
    }

    try {
      // 1. Create client entity record if custom name typed
      if (!data.clientEntityId && finalClient) {
        try {
          const clientRef = await addDoc(collection(db, 'entities'), {
            name: finalClient,
            type: data.clientType,
            contact: finalContact,
            createdAt: new Date().toISOString(),
            ownerId: user.uid
          });
          data.clientEntityId = clientRef.id;
        } catch (entityErr) {
          console.error("Error auto-registering client entity model:", entityErr);
        }
      }

      // 1b. Create supplier entity record if custom name typed
      if (!data.supplierId && finalSupplierName) {
        try {
          const supplierRef = await addDoc(collection(db, 'entities'), {
            name: finalSupplierName,
            type: 'supplier',
            createdAt: new Date().toISOString(),
            ownerId: user.uid
          });
          finalSupplierId = supplierRef.id;
        } catch (suppErr) {
          console.error("Error auto-registering supplier entity model:", suppErr);
        }
      }

      // 2. Add to digital catalog if chosen & not present
      if (data.addToCatalog) {
        const productExists = catalogItems.some(c => c.name.toLowerCase() === data.name.toLowerCase());
        if (!productExists) {
          try {
            await addDoc(collection(db, 'digital_catalog'), {
              name: data.name,
              category: 'Streaming',
              ownerId: user.uid,
              createdAt: new Date().toISOString(),
              pvp: Number(data.pvpClient) || 0,
              pvpReseller: Number(data.pvpReseller) || 0,
              providers: [
                {
                  supplierId: finalSupplierId || '',
                  supplierName: finalSupplierName || 'Proveedor',
                  cost: Number(data.cost) || 0,
                  pvp: Number(data.pvpClient) || 0,
                  pvpReseller: Number(data.pvpReseller) || 0
                }
              ]
            });
          } catch (catErr) {
            console.error("Error adding to digital catalog:", catErr);
          }
        }
      }

      // 3. Populate final active digital service
      const serviceData = {
        name: data.name,
        category: 'Streaming',
        revenue: Number(data.revenue),
        cost: Number(data.cost),
        supplierId: finalSupplierId,
        supplierName: finalSupplierName || 'Asistente AI',
        clientName: finalClient,
        clientContact: finalContact,
        clientType: data.clientType, // 'client' | 'reseller'
        expirationDate: data.expirationDate || '',
        email: data.email || '',
        password: data.password || '',
        pin: data.pin || '',
        status: 'active' as const,
        isPaid: data.isPaid === true,
        isCostPaid: data.isCostPaid !== false,
        revenueWalletId: data.revenueWalletId || '',
        costWalletId: data.costWalletId || '',
        ownerId: user.uid,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      // CRM Auto-Registration for new client if not present in entities database
      const trimmedClientName = finalClient?.trim() || '';
      const entityType = data.clientType || 'client';
      if (trimmedClientName) {
        try {
          const entityQuery = query(
            collection(db, 'entities'),
            where('ownerId', '==', user.uid),
            where('type', '==', entityType)
          );
          const qSnap = await getDocs(entityQuery);
          const exists = qSnap.docs.some(
            dSnap => dSnap.data().name?.trim().toLowerCase() === trimmedClientName.toLowerCase()
          );
          if (!exists) {
            await addDoc(collection(db, 'entities'), {
              name: trimmedClientName,
              contact: finalContact ? finalContact.trim() : '',
              type: entityType,
              rate: 0,
              isAntUpdater: false,
              antUpdateCost: 0,
              ownerId: user.uid,
              createdAt: new Date().toISOString()
            });
            console.log(`Cliente "${trimmedClientName}" registrado automáticamente desde Asistente AI`);
          }
        } catch (crmErr) {
          console.error("Error al registrar cliente automáticamente en CRM (AI):", crmErr);
        }
      }

      const docRef = await addDoc(collection(db, 'digital_services'), serviceData);
      
      // Save logs history subcollection
      await addDoc(collection(db, 'digital_services', docRef.id, 'service_history'), {
        action: 'created_via_assistant',
        details: serviceData,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });

      const { updateDoc, doc, increment } = await import('firebase/firestore');

      // 4. Ledger entry & Wallet update for Revenue Cobro (Client) if isPaid was toggled
      if (data.isPaid && data.revenueWalletId) {
        await addDoc(collection(db, 'ledger'), {
          amount: Number(data.revenue),
          category: 'Venta de Servicio Digital',
          description: `Cobro de ${data.name} a ${finalClient} (Vía Asistente AI)`,
          date: new Date().toISOString().split('T')[0],
          walletId: data.revenueWalletId,
          isExpense: false,
          ownerId: user.uid,
          createdAt: new Date().toISOString()
        });

        await updateDoc(doc(db, 'wallets', data.revenueWalletId), {
          balance: increment(Number(data.revenue))
        });
      }

      // 5. Ledger entry & Wallet update for Cost Pago (Provider) if isCostPaid was toggled
      if (data.isCostPaid && data.costWalletId) {
        await addDoc(collection(db, 'ledger'), {
          amount: -Number(data.cost),
          category: 'Costo de Servicio Digital',
          description: `Pago de costo por ${data.name} a proveedor (Vía Asistente AI)`,
          date: new Date().toISOString().split('T')[0],
          walletId: data.costWalletId,
          isExpense: true,
          ownerId: user.uid,
          createdAt: new Date().toISOString()
        });

        await updateDoc(doc(db, 'wallets', data.costWalletId), {
          balance: increment(-Number(data.cost))
        });
      }

      // Update message state inside chatbot to render nice green confirmation box
      setMessages(prev => {
        const copy = [...prev];
        if (copy[msgIndex] && copy[msgIndex].actionParsed) {
          copy[msgIndex].actionParsed = {
            ...copy[msgIndex].actionParsed!,
            isSaved: true,
            customClientName: finalClient,
            name: data.name,
            email: data.email,
            pin: data.pin,
            cost: data.cost,
            revenue: data.revenue
          };
        }
        return copy;
      });

    } catch (err) {
      console.error("Error creating digital service document:", err);
      alert("No se pudo completar el registro de la venta en Firestore.");
    }
  };

  const handleConfirmAntUpdate = async (msgIndex: number, data: AntUpdateConfirmData) => {
    if (!user) return;
    const msg = messages[msgIndex];
    if (!msg || !msg.actionParsed || msg.actionParsed.type !== 'add_transaction') return;

    // Check duplicates before continuing
    const isDuplicate = transactions.some(tx => 
      tx.intermediaryId === data.intermediaryId &&
      tx.finalClientName?.trim().toLowerCase() === data.finalClientName.trim().toLowerCase() &&
      tx.warehouse?.trim().toLowerCase() === data.warehouse.trim().toLowerCase()
    );

    if (isDuplicate) {
      alert("¡Error de duplicado! Ya existe una actualización ANT registrada con el mismo distribuidor, de la misma persona y bodega.");
      return;
    }

    try {
      // Create companion entity record if custom name typed
      if (data.customClientName && data.clientType) {
        try {
          await addDoc(collection(db, 'entities'), {
            name: data.customClientName.trim(),
            type: data.clientType,
            createdAt: new Date().toISOString(),
            ownerId: user.uid
          });
        } catch (entityErr) {
          console.error("Error auto-registering client entity model inside ANT update handler:", entityErr);
        }
      }

      await addDoc(collection(db, 'transactions'), {
        intermediaryId: data.intermediaryId || 'default_intermediary_id',
        intermediaryName: data.intermediaryName || 'Distribuidor General',
        finalClientName: data.finalClientName,
        warehouse: data.warehouse,
        billingDate: new Date().toISOString().split('T')[0],
        baseCost: 0,
        chargedRate: data.chargedRate,
        isPaid: false,
        status: 'pending',
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      });

      // Update message state inside chatbot to render nice green confirmation box
      setMessages(prev => {
        const copy = [...prev];
        if (copy[msgIndex] && copy[msgIndex].actionParsed) {
          copy[msgIndex].actionParsed = {
            ...copy[msgIndex].actionParsed!,
            isSaved: true,
            finalClientName: data.finalClientName,
            warehouse: data.warehouse,
            intermediaryName: data.intermediaryName
          };
        }
        return copy;
      });

    } catch (err) {
      console.error("Error confirming ANT transaction:", err);
      alert("Hubo un error al registrar la actualización.");
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed bottom-36 lg:bottom-28 right-4 lg:right-8 w-[calc(100vw-32px)] lg:w-98 h-[570px] max-h-[70vh] lg:max-h-[80vh] rounded-2xl flex flex-col shadow-2xl border z-50 overflow-hidden transition-all duration-300",
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            )}
          >
            {/* Header */}
            <div className={cn("p-4 border-b flex justify-between items-center", isDark ? "bg-slate-800 border-slate-700" : "bg-indigo-600 border-indigo-700")}>
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-indigo-200" />
                <div>
                  <h3 className="font-bold text-sm leading-none">Asistente Inteligente</h3>
                  <span className="text-[9px] text-indigo-200 font-bold tracking-wider uppercase">Multimodal • Gemini AI</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => {
                    setTempKey(localApiKey);
                    setShowKeyInput(!showKeyInput);
                  }}
                  title="Configurar Clave API de Gemini"
                  className={cn(
                    "text-white/70 hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/10",
                    showKeyInput && "text-white bg-white/15"
                  )}
                >
                  <Key className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showKeyInput ? (
              <div className={cn("flex-1 p-6 flex flex-col justify-center space-y-4", isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-100 text-slate-800")}>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
                    <Key className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm">Clave API de Gemini Personal</h4>
                  <p className="text-[10px] leading-relaxed text-slate-500 max-w-sm mx-auto">
                    Si tu Control Financiero está hospedado en un ambiente estático (como Vercel o GitHub Pages), puedes configurar tu propia Clave API de Gemini aquí. Se guardará de forma segura en la memoria local de tu navegador y nunca se filtrará.
                  </p>
                </div>
                
                <form onSubmit={handleSaveLocalKey} className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Tu Gemini API Key</label>
                    <input 
                      type="password"
                      value={tempKey}
                      onChange={(e) => setTempKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className={cn(
                        "w-full px-4 py-2 rounded-xl text-sm outline-none border transition-all duration-300", 
                        isDark 
                          ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" 
                          : "bg-white border-slate-200 focus:border-indigo-500 text-slate-800"
                      )}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      Guardar Clave
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowKeyInput(false);
                      }}
                      className={cn(
                        "px-4 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer",
                        isDark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      Volver
                    </button>
                  </div>
                </form>
                
                {localApiKey && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px]">
                    <span className="text-emerald-505 text-emerald-500 flex items-center gap-1 font-bold uppercase">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Clave Guardada
                    </span>
                    <button
                      type="button"
                      onClick={handleClearLocalKey}
                      className="text-rose-500 hover:underline hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      Eliminar clave
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Chat Messages list */}
                <div className={cn("flex-1 p-4 overflow-y-auto space-y-4 class-message-scroller", isDark ? "bg-slate-950" : "bg-slate-50/50")}>
                  {messages.map((m, i) => (
                    <div key={i} className={cn("flex w-full mb-2", m.role === 'user' ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[85%] p-3.5 rounded-2xl text-sm font-medium transition-all shadow-xs",
                        m.role === 'user' 
                          ? "bg-indigo-600 text-white rounded-tr-none" 
                          : (isDark ? "bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800" : "bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-sm")
                      )}>
                        {m.image && (
                          <div className="mb-2 max-w-full overflow-hidden rounded-lg border border-indigo-500/20 shadow-sm">
                            <img src={m.image} alt="Adjunto" className="w-full max-h-40 object-cover" />
                          </div>
                        )}
                        
                        {m.role === 'model' ? (
                          <div className={cn(
                            "prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-950 prose-pre:text-slate-50",
                            isDark ? "prose-invert prose-p:text-slate-300 prose-li:text-slate-300 prose-headings:text-slate-100 prose-strong:text-slate-200" : "prose-slate"
                          )}>
                            <Markdown>{m.text}</Markdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{m.text}</p>
                        )}

                        {/* Check which parsed action rendering layout to display */}
                        {m.actionParsed && m.actionParsed.type === 'add_transaction' && (
                          m.actionParsed.isSaved ? (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold leading-relaxed shadow-xs flex flex-col gap-1.5"
                            >
                              <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[9px] text-emerald-500">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-bounce" />
                                Sincronización de Actualización ANT Exitosa
                              </div>
                              <div className="grid grid-cols-2 gap-y-1 gap-x-2 pt-1 border-t border-emerald-500/10 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                <div>Socio Comercial:</div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{m.actionParsed.finalClientName}</div>
                                <div>Bodega/Establec:</div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{m.actionParsed.warehouse}</div>
                                <div>Intermediario:</div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{m.actionParsed.intermediaryName}</div>
                              </div>
                            </motion.div>
                          ) : (
                            <AntUpdateFormCard
                              draft={m.actionParsed}
                              clients={clients}
                              resellers={resellers}
                              intermediaries={intermediaries}
                              isDark={isDark}
                              onConfirm={(data) => handleConfirmAntUpdate(i, data)}
                            />
                          )
                        )}

                        {m.actionParsed && m.actionParsed.type === 'add_digital_service' && (
                          m.actionParsed.isSaved ? (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="mt-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 text-xs font-bold leading-relaxed shadow-xs flex flex-col gap-1.5"
                            >
                              <div className="text-[9px] font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-bounce" />
                                Venta Digital Registrada Exitosamente
                              </div>
                              <div className="grid grid-cols-2 gap-y-1 gap-x-2 pt-1 border-t border-emerald-500/10 font-mono text-[10px] text-slate-500 dark:text-slate-405">
                                <div>Socio/Cliente:</div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{m.actionParsed.customClientName}</div>
                                <div>Producto:</div>
                                <div className="font-bold text-indigo-600 dark:text-indigo-400 truncate">{m.actionParsed.name}</div>
                                <div>Correo:</div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 truncate font-mono text-[9px]">{m.actionParsed.email}</div>
                                {m.actionParsed.pin && (
                                  <>
                                    <div>PIN / Perfil:</div>
                                    <div className="font-bold text-slate-800 dark:text-slate-200">{m.actionParsed.pin}</div>
                                  </>
                                )}
                                <div>Finanzas:</div>
                                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                  Costo: ${Number(m.actionParsed.cost).toFixed(2)} • Venta: ${Number(m.actionParsed.revenue).toFixed(2)}
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            <DigitalServiceFormCard 
                              draft={m.actionParsed} 
                              clients={clients} 
                              resellers={resellers}
                              intermediaries={intermediaries}
                              catalogItems={catalogItems}
                              wallets={wallets}
                              suppliers={suppliers}
                              isDark={isDark} 
                              onConfirm={(data) => handleConfirmDigitalService(i, data)}
                            />
                          )
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex w-full justify-start">
                      <div className={cn("p-4 rounded-2xl rounded-tl-none border flex items-center gap-2", isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-100 shadow-sm text-slate-500")}>
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        <span className="text-xs font-bold tracking-wide uppercase text-[10px]">Analizando datos...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attachment Preview Box */}
                <AnimatePresence>
                  {image && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn("p-2 border-t flex flex-col gap-1.5", isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-100")}
                    >
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-500" /> Adjunto para análisis
                        </span>
                        <button 
                          onClick={() => { setImage(null); setImageType(null); }}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 p-1.5 shadow-sm w-fit max-w-full flex items-center">
                        {imageType?.includes('image') ? (
                          <img src={image} alt="Upload preview" className="h-20 object-contain rounded-lg" />
                        ) : (
                          <div className="flex items-center gap-2.5 px-3 py-2 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl border border-indigo-200/20">
                            <FileText className="w-5 h-5 shrink-0" />
                            <div className="text-left leading-3">
                              <span className="text-[10px] uppercase font-black tracking-widest block text-indigo-600 dark:text-indigo-400">Documento</span>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {imageType?.includes('pdf') ? 'Factura_Soporte.pdf' : 'Factura_Pago.xml'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Camera Live Preview Box */}
                <AnimatePresence>
                  {isCameraActive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn("p-3 border-t flex flex-col gap-2", isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200")}
                    >
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5 animate-pulse">
                          <Camera className="w-3.5 h-3.5" /> Cámara en vivo activa
                        </span>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          Apagar
                        </button>
                      </div>
                      <div className="relative rounded-xl overflow-hidden border border-slate-705 bg-black aspect-video max-h-48 shadow-inner">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          Capturar captura de pantalla / foto
                        </button>
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input Form Bar */}
                <div className={cn("p-4 border-t", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}>
                  <form onSubmit={handleSend} className="flex gap-2 items-center">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*,application/pdf,text/xml,.xml" 
                      className="hidden" 
                    />
                    
                    {/* Image Attach Button */}
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      title="Adjuntar Imagen o Captura"
                      className={cn(
                        "p-2.5 rounded-xl border transition-colors cursor-pointer",
                        isDark 
                          ? "bg-slate-800 hover:bg-slate-700 border-slate-705 text-slate-350" 
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500"
                      )}
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Camera Button */}
                    <button 
                      type="button" 
                      onClick={isCameraActive ? stopCamera : startCamera}
                      title="Tomar Foto con Cámara"
                      className={cn(
                        "p-2.5 rounded-xl border transition-colors cursor-pointer",
                        isCameraActive
                          ? "bg-rose-600 hover:bg-rose-700 border-rose-600 text-white animate-pulse"
                          : isDark 
                          ? "bg-slate-800 hover:bg-slate-700 border-slate-705 text-slate-350" 
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500"
                      )}
                    >
                      <Camera className="w-4 h-4" />
                    </button>

                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={image ? "Describir foto o enviar..." : "Pegar captura (Ctrl+V) o escribir..."}
                      className={cn(
                        "flex-1 px-4 py-2.5 rounded-xl text-sm outline-none border transition-all duration-300", 
                        isDark 
                          ? "bg-slate-800 border-slate-750 text-white focus:border-indigo-505 focus:border-indigo-500" 
                          : "bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-800"
                      )}
                    />
                    
                    <button 
                      type="submit" 
                      disabled={(!input.trim() && !image) || isTyping}
                      className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                  <div className="text-[9px] text-center text-slate-450 mt-2 tracking-wide font-medium">
                    Tip: Toma una captura de pantalla y presiona <kbd className="px-1 py-0.5 border border-slate-300 dark:border-slate-700 bg-slate-150 dark:bg-slate-800 rounded mx-0.5 font-sans">Ctrl</kbd> + <kbd className="px-1 py-0.5 border border-slate-300 dark:border-slate-700 bg-slate-150 dark:bg-slate-800 rounded mx-0.5 font-sans">V</kbd> para pegarla al instante.
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
