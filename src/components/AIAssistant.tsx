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
  Check,
  Calendar,
  Lock,
  Mail,
  User,
  ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { Entity } from '../types';

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
  clientType: 'client' | 'reseller';

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
  
  // Catalog options
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
  catalogItems: any[];
  wallets: any[];
  onConfirm: (data: ConfirmData) => void;
  isDark: boolean;
}

function DigitalServiceFormCard({ draft, clients, catalogItems, wallets, onConfirm, isDark }: DigitalServiceFormCardProps) {
  // Account details states
  const [serviceName, setServiceName] = useState(draft.name || '');
  const [email, setEmail] = useState(draft.email || '');
  const [password, setPassword] = useState(draft.password || '');
  const [pin, setPin] = useState(draft.pin || '');
  const [expirationDate, setExpirationDate] = useState(draft.expirationDate || '');

  // Financial parameters
  const [cost, setCost] = useState(Number(draft.cost) || 0);
  const [pvpClient, setPvpClient] = useState(Number(draft.revenue) || 0);
  const [pvpReseller, setPvpReseller] = useState(
    Number(draft.revenue) ? Math.max(0, Number(draft.revenue) - 1.5) : 0
  );
  
  // Selection States
  const [clientType, setClientType] = useState<'client' | 'reseller'>('client');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [clientPhone, setClientPhone] = useState(draft.clientContact || '');
  const [addToCatalog, setAddToCatalog] = useState(false);

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
        setCost(Number(matchedItem.providers[0].cost));
      }
    } else {
      setAddToCatalog(true);
    }
  }, [serviceName, catalogItems]);

  const handleSelectCatalogItem = (name: string) => {
    if (!name) return;
    setServiceName(name);
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId) {
      const match = clients.find(c => c.id === clientId);
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
      const match = clients.find(c => c.id === selectedClientId);
      finalClientName = match ? match.name : '';
    }

    onConfirm({
      clientEntityId: showCustomInput ? '' : selectedClientId,
      customClientName: showCustomInput ? finalClientName : '',
      clientContact: clientPhone.trim(),
      clientType,
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
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-250 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setClientType('client')}
              className={cn(
                "py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer",
                clientType === 'client'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-indigo-600")
              )}
            >
              👤 Cliente Final
            </button>
            <button
              onClick={() => setClientType('reseller')}
              className={cn(
                "py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer",
                clientType === 'reseller'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-indigo-600")
              )}
            >
              🏪 Revendedor
            </button>
          </div>
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
                <option value="">-- Seleccionar cliente --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.contact ? `(${c.contact})` : ''}</option>
                ))}
              </select>
              <button
                onClick={() => { setShowCustomInput(true); setSelectedClientId(''); }}
                title="Añadir nuevo cliente"
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
                placeholder="Nombre del nuevo cliente..."
                value={customNameInput}
                onChange={(e) => setCustomNameInput(e.target.value)}
                className={cn(
                  "flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none border focus:border-indigo-500",
                  isDark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-880"
                )}
              />
              <button
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
  finalClientName: string;
  warehouse: string;
  intermediaryId: string;
  intermediaryName: string;
  chargedRate: number;
}

interface AntUpdateFormCardProps {
  draft: any;
  intermediaries: Entity[];
  onConfirm: (data: AntUpdateConfirmData) => void;
  isDark: boolean;
}

function AntUpdateFormCard({ draft, intermediaries, onConfirm, isDark }: AntUpdateFormCardProps) {
  const [finalClientName, setFinalClientName] = useState(draft.finalClientName || '');
  const [warehouse, setWarehouse] = useState(draft.warehouse || '');
  const [intermediaryId, setIntermediaryId] = useState(draft.intermediaryId || '');
  const [isVerified, setIsVerified] = useState(false);

  const handleRegister = () => {
    if (!finalClientName.trim()) {
      alert("Ingrese por favor el socio comercial o cliente final.");
      return;
    }
    if (!warehouse.trim()) {
      alert("Ingrese por favor la bodega o establecimiento.");
      return;
    }

    const inter = intermediaries.find(i => i.id === intermediaryId);
    onConfirm({
      finalClientName: finalClientName.trim(),
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
        
        {/* finalClientName Input */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Socio Comercial / Cliente Final</label>
          <input
            type="text"
            value={finalClientName}
            onChange={(e) => setFinalClientName(e.target.value)}
            className={cn(
              "w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border outline-none focus:border-indigo-500",
              isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-800"
            )}
            placeholder="Ej. Juan Pérez / Empresa..."
          />
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

export function AIAssistant() {
  const { user, settings } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    { 
      role: 'model', 
      text: '¡Hola! Soy tu asistente financiero inteligente impulsado por Gemini.\n\n**✨ ¡MIS SÚPER PODERES MULTIMODALES!** ✨\n\n1. **Actualizaciones ANT:** Sube o pega la captura de una transferencia o planilla de ANT, y extraeré el cliente, establecimiento de depósito, guardándola de inmediato para el distribuidor adecuado.\n\n2. **🛍️ Ventas de Servicios Digitales:** ¿Activaste o compraste cuentas ? Sube o pega la captura del chat con el proveedor o mensaje de entrega (con correo, clave, pin, etc.). Extraeré toda la información al instante, ¡y solo tendrás que elegir al Cliente para crear y registrar la venta! ¡Pruébalo ahora!' 
    }
  ]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [intermediaries, setIntermediaries] = useState<Entity[]>([]);
  const [clients, setClients] = useState<Entity[]>([]);
  const [suppliers, setSuppliers] = useState<Entity[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  
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

    return () => {
      unsubEnt();
      unsubCat();
      unsubWallets();
    };
  }, [user]);

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
        throw new Error('Network response error');
      }

      const data = await response.json();
      const responseText = data.text || 'No recibí respuesta.';

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
            expirationDate: expirationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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

    let finalClient = data.customClientName.trim();
    let finalContact = data.clientContact.trim();

    if (data.clientEntityId) {
      const match = clients.find(c => c.id === data.clientEntityId);
      if (match) {
        finalClient = match.name;
        if (!finalContact) {
          finalContact = match.contact || '';
        }
      }
    }

    try {
      // 1. Create client entity record if custom name typed
      if (!data.clientEntityId && finalClient) {
        try {
          await addDoc(collection(db, 'entities'), {
            name: finalClient,
            type: 'client',
            contact: finalContact,
            createdAt: new Date().toISOString(),
            ownerId: user.uid
          });
        } catch (entityErr) {
          console.error("Error auto-registering client entity model:", entityErr);
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
                  supplierId: msg.actionParsed.supplierId || '',
                  supplierName: msg.actionParsed.supplierName || 'Proveedor',
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
        supplierId: msg.actionParsed.supplierId || '',
        supplierName: msg.actionParsed.supplierName || 'Asistente AI',
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

    try {
      await addDoc(collection(db, 'transactions'), {
        intermediaryId: data.intermediaryId || 'default_intermediary_id',
        intermediaryName: data.intermediaryName || 'Distribuidor General',
        finalClientName: data.finalClientName,
        warehouse: data.warehouse,
        billingDate: new Date().toISOString().split('T')[0],
        baseCost: 5.0,
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
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 hover:scale-105 transition-transform z-40 cursor-pointer"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed bottom-24 right-4 lg:bottom-28 lg:right-8 w-[calc(100vw-32px)] lg:w-98 h-[570px] max-h-[80vh] rounded-2xl flex flex-col shadow-2xl border z-50 overflow-hidden transition-all duration-300",
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
              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

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
                          catalogItems={catalogItems}
                          wallets={wallets}
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
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 max-h-32 shadow-sm w-fit max-w-full">
                    <img src={image} alt="Upload preview" className="h-20 object-contain rounded-lg" />
                  </div>
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
                  accept="image/*" 
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
                      ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-350" 
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500"
                  )}
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={image ? "Describir foto o enviar..." : "Pegar captura (Ctrl+V) o escribir..."}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-xl text-sm outline-none border transition-all duration-300", 
                    isDark 
                      ? "bg-slate-800 border-slate-750 text-white focus:border-indigo-500" 
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
