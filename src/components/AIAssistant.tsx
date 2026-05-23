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

interface DigitalServiceFormCardProps {
  draft: any;
  clients: Entity[];
  onConfirm: (clientEntityId: string, customClientName: string) => void;
  isDark: boolean;
}

function DigitalServiceFormCard({ draft, clients, onConfirm, isDark }: DigitalServiceFormCardProps) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleRegister = () => {
    if (showCustomInput) {
      if (!customNameInput.trim()) {
        alert("Escriba por favor el nombre del nuevo cliente.");
        return;
      }
      onConfirm('', customNameInput.trim());
    } else {
      if (!selectedClientId) {
        alert("Selecciona un cliente de la lista o crea uno nuevo con el botón de añadir (+).");
        return;
      }
      onConfirm(selectedClientId, '');
    }
  };

  return (
    <div className={cn(
      "mt-3 p-3.5 rounded-xl border flex flex-col gap-3 shadow-md",
      isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-indigo-50/40 border-indigo-100 text-slate-800"
    )}>
      <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[10px] text-indigo-500">
        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
        Cuenta Digital Detectada
      </div>
      
      {/* Readonly Account extraction grid */}
      <div className={cn(
        "grid grid-cols-2 gap-y-1.5 gap-x-3 p-3 rounded-lg font-mono text-[11px] leading-relaxed",
        isDark ? "bg-slate-950 text-slate-350" : "bg-slate-100/80 text-slate-700"
      )}>
        <div className="text-slate-400 dark:text-slate-550 font-bold">Servicio:</div>
        <div className="font-extrabold truncate text-indigo-600 dark:text-indigo-400">{draft.name}</div>
        
        <div className="text-slate-400 dark:text-slate-550 font-bold">Correo:</div>
        <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{draft.email || '—'}</div>
        
        <div className="text-slate-400 dark:text-slate-550 font-bold">Contraseña:</div>
        <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{draft.password || '—'}</div>
        
        {draft.pin && (
          <>
            <div className="text-slate-400 dark:text-slate-550 font-bold">PIN / Perfil:</div>
            <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{draft.pin}</div>
          </>
        )}
        
        <div className="text-slate-400 dark:text-slate-550 font-bold">Vencimiento:</div>
        <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{draft.expirationDate || '—'}</div>
        
        <div className="text-slate-400 dark:text-slate-550 font-bold">Finanzas:</div>
        <div className="font-bold">
          Costo: <span className="text-rose-500 font-black">${Number(draft.cost).toFixed(2)}</span> • 
          Venta: <span className="text-emerald-500 font-black">${Number(draft.revenue).toFixed(2)}</span>
        </div>
      </div>

      {/* Select Client Selector Section */}
      <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-800/60 text-left">
        <label className="text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-550 flex items-center gap-1">
          <User className="w-3.5 h-3.5 text-indigo-500" />
          ¿A qué cliente se le vendió?
        </label>
        
        {!showCustomInput ? (
          <div className="flex gap-2">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className={cn(
                "flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none border focus:border-indigo-500 transition-colors",
                isDark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-800"
              )}
            >
              <option value="">-- Seleccionar cliente --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.contact ? `(${c.contact})` : ''}</option>
              ))}
            </select>
            <button
              onClick={() => { setShowCustomInput(true); setSelectedClientId(''); }}
              title="Añadir nuevo cliente directamente"
              className={cn(
                "p-2 rounded-lg border flex items-center justify-center cursor-pointer hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-95",
                isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
              )}
            >
              <PlusCircle className="w-4.5 h-4.5" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Ej. Juan Pérez..."
              value={customNameInput}
              onChange={(e) => setCustomNameInput(e.target.value)}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold outline-none border focus:border-indigo-500",
                isDark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-800"
              )}
            />
            <button
              onClick={() => { setShowCustomInput(false); setCustomNameInput(''); }}
              className="px-2 text-xs font-bold text-slate-400 hover:text-indigo-500 cursor-pointer"
            >
              Volver
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleRegister}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl font-bold uppercase text-[9px] tracking-wider transition-all shadow-md shadow-indigo-650/15 flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Check className="w-4 h-4" /> Registrar Cuenta y Venta
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

    return () => {
      unsubEnt();
      unsubCat();
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

    // Reset input fields instantly
    setInput('');
    setImage(null);
    setImageType(null);

    setMessages(prev => [...prev, { 
      role: 'user', 
      text: userMessageText, 
      image: currentImage || undefined 
    }]);
    setIsTyping(true);

    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(m => ({ 
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
          // Case 1: ANT Update registration in the background
          const { finalClientName, warehouse, intermediaryId } = parsedAction;
          if (user && finalClientName && warehouse) {
            try {
              let inter = intermediaries.find(i => i.id === intermediaryId);
              if (!inter && intermediaries.length > 0) {
                inter = intermediaries.find(i => i.name.toLowerCase().includes(finalClientName.toLowerCase())) || intermediaries[0];
              }

              const activeInterId = inter?.id || 'default_intermediary_id';
              const activeInterName = inter?.name || 'Distribuidor General';
              const chargedRate = inter?.rate || 10;

              await addDoc(collection(db, 'transactions'), {
                intermediaryId: activeInterId,
                intermediaryName: activeInterName,
                finalClientName,
                warehouse,
                billingDate: new Date().toISOString().split('T')[0],
                baseCost: 5.0,
                chargedRate,
                isPaid: false,
                status: 'pending',
                ownerId: user.uid,
                createdAt: new Date().toISOString()
              });

              actionResult = {
                type: 'add_transaction',
                success: true,
                finalClientName,
                warehouse,
                intermediaryName: activeInterName
              };
            } catch (dbErr) {
              console.error("Error saving automatic parsed ANT transaction:", dbErr);
            }
          }
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

  const handleConfirmDigitalService = async (msgIndex: number, clientEntityId: string, customClientName: string) => {
    if (!user) return;
    const msg = messages[msgIndex];
    if (!msg || !msg.actionParsed || msg.actionParsed.type !== 'add_digital_service') return;

    let finalClient = customClientName.trim();
    let finalContact = '';

    if (clientEntityId) {
      const match = clients.find(c => c.id === clientEntityId);
      if (match) {
        finalClient = match.name;
        finalContact = match.contact || '';
      }
    }

    const { name, email, password, pin, expirationDate, cost, revenue, supplierId, supplierName } = msg.actionParsed;

    try {
      const serviceData = {
        name: name || 'Servicio Digital',
        category: 'Streaming',
        revenue: Number(revenue) || 0,
        cost: Number(cost) || 0,
        supplierId: supplierId || '',
        supplierName: supplierName || '',
        clientName: finalClient,
        clientContact: finalContact,
        expirationDate: expirationDate || '',
        email: email || '',
        password: password || '',
        pin: pin || '',
        status: 'active' as const,
        isPaid: false,
        ownerId: user.uid,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      // Create new client if custom name was typed so it gets saved to entities too
      if (!clientEntityId && finalClient) {
        try {
          await addDoc(collection(db, 'entities'), {
            name: finalClient,
            type: 'client',
            createdAt: new Date().toISOString(),
            ownerId: user.uid
          });
        } catch (entityErr) {
          console.error("Error auto-registering client entity model:", entityErr);
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

      // Update state
      setMessages(prev => {
        const copy = [...prev];
        if (copy[msgIndex] && copy[msgIndex].actionParsed) {
          copy[msgIndex].actionParsed = {
            ...copy[msgIndex].actionParsed!,
            isSaved: true,
            customClientName: finalClient
          };
        }
        return copy;
      });

    } catch (err) {
      console.error("Error creating digital service document:", err);
      alert("No se pudo completar el registro de la venta en Firestore.");
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
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold leading-relaxed shadow-xs flex flex-col gap-1.5"
                      >
                        <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[9px] text-emerald-500">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
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
                          isDark={isDark} 
                          onConfirm={(clientId, customName) => handleConfirmDigitalService(i, clientId, customName)}
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
