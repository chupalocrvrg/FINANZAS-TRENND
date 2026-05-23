/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  Clock,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  MessageCircle,
  X
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
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [activeModal, setActiveModal] = useState<'wallets' | 'receivables' | 'payables' | 'entities' | null>(null);
  
  const isDark = settings?.theme === 'dark';

  useEffect(() => {
    if (!user) return;
    
    // Wallets
    const unsubWallets = onSnapshot(query(collection(db, 'wallets'), where('ownerId', '==', user.uid)), (snap) => {
      setWallets(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    // Cuentas por Cobrar (Transactions + DigitalServices matches isPaid == false)
    const unsubReceivablesTx = onSnapshot(query(collection(db, 'transactions'), where('ownerId', '==', user.uid), where('isPaid', '==', false)), (snap) => {
      setReceivables(prev => {
        const others = prev.filter(p => !p.isTx);
        return [...others, ...snap.docs.map(d => ({ id: d.id, isTx: true, ...(d.data() as any) }))];
      });
    });

    const unsubReceivablesDs = onSnapshot(query(collection(db, 'digital_services'), where('ownerId', '==', user.uid), where('isPaid', '==', false)), (snap) => {
      setReceivables(prev => {
        const others = prev.filter(p => p.isTx);
        return [...others, ...snap.docs.map(d => ({ id: d.id, isTx: false, chargedRate: d.data().revenue, finalClientName: d.data().clientName, warehouse: d.data().name, ...(d.data() as any) }))];
      });
    });

    // Cuentas por Pagar (Ledger where isPending == true and amount < 0)
    const unsubPayables = onSnapshot(query(collection(db, 'ledger'), where('ownerId', '==', user.uid), where('isPending', '==', true)), (snap) => {
      setPayables(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })).filter((e: any) => e.amount < 0));
    });

    // CRM Entities
    const unsubEntities = onSnapshot(query(collection(db, 'entities'), where('ownerId', '==', user.uid)), (snap) => {
      setEntities(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    });

    return () => { unsubWallets(); unsubReceivablesTx(); unsubReceivablesDs(); unsubPayables(); unsubEntities(); };
  }, [user]);

  const totalReceivables = receivables.reduce((sum, tx) => sum + (tx.chargedRate || 0), 0);
  const totalPayables = Math.abs(payables.reduce((sum, entry) => sum + (entry.amount || 0), 0));
  const totalWallets = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

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
    const text = `Hola *${contactEntity?.name}*, te saludamos de *${settings?.companyName || 'Control Financiero'}*.\n\nTe recordamos amablemente un valor pendiente de pago en nuestro sistema por *${formatCurrency(rx.chargedRate)}* por concepto de servicio de actualizaciones ANT para el cliente *${rx.finalClientName}* (${rx.warehouse}).\n\nPor favor, confirmanos cuando realices la transferencia. ¡Muchas gracias!`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto p-4 lg:p-8 text-left">
      <div className="flex flex-col gap-1 lg:gap-2">
        <h2 className={cn("text-2xl lg:text-3xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
          Resumen Financiero
        </h2>
        <p className="text-slate-500 text-sm lg:text-base font-medium">Métricas de rendimiento en tiempo real.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard 
          label="Caja General" 
          value={formatCurrency(totalWallets)} 
          icon={Wallet} 
          trend="Disponible" 
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
          label="Cuentas Bancarias Active" 
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
                  <p className={cn("text-sm font-bold truncate", isDark ? "text-slate-200" : "text-slate-800")}>{rx.intermediaryName}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate mt-0.5">Cliente: {rx.finalClientName || '-'}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-black font-mono text-emerald-500">{formatCurrency(rx.chargedRate)}</span>
                  <button 
                    onClick={() => handleWhatsAppRedirect(rx)}
                    title="Enviar recordatorio por WhatsApp al número registrado"
                    className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm"
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
                <div className="text-right shrink-0">
                  <span className="text-sm font-black font-mono text-rose-500">{formatCurrency(Math.abs(px.amount))}</span>
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
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
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
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors self-start">
                  <X />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-2 min-h-[300px]">
                <div className={cn("divide-y", isDark ? "divide-slate-800" : "divide-slate-100")}>
                  {activeModal === 'wallets' && (
                    wallets.length === 0 ? (
                      <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">No hay cuentas bancarias activas.</div>
                    ) : wallets.map(w => (
                      <div key={w.id} className="py-4 flex justify-between items-center group">
                        <div className="min-w-0 pr-4">
                          <p className={cn("text-sm font-bold truncate", isDark ? "text-slate-200" : "text-slate-800")}>{w.name}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate mt-0.5">{w.type} • {w.currency || 'USD'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn("text-sm font-black font-mono", w.balance < 0 ? "text-rose-500" : "text-indigo-500")}>
                            {formatCurrency(w.balance || 0)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}

                  {activeModal === 'receivables' && (
                    receivables.length === 0 ? (
                      <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">No hay cuentas por cobrar.</div>
                    ) : receivables.map(rx => (
                      <div key={rx.id} className="py-4 flex justify-between items-center group">
                        <div className="min-w-0 pr-4">
                          <p className={cn("text-sm font-bold truncate", isDark ? "text-slate-200" : "text-slate-800")}>{rx.intermediaryName}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate mt-0.5">Cliente: {rx.finalClientName || '-'}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-black font-mono text-emerald-500">{formatCurrency(rx.chargedRate)}</span>
                          <button 
                            onClick={() => handleWhatsAppRedirect(rx)}
                            title="Enviar recordatorio por WhatsApp al número registrado"
                            className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {activeModal === 'payables' && (
                    payables.length === 0 ? (
                      <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">No hay cuentas por pagar.</div>
                    ) : payables.map(px => (
                      <div key={px.id} className="py-4 flex justify-between items-center group">
                        <div className="min-w-0 pr-4">
                          <p className={cn("text-sm font-bold truncate", isDark ? "text-slate-200" : "text-slate-800")}>{px.category}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate mt-0.5">{px.description || 'Sin detalles'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black font-mono text-rose-500">{formatCurrency(Math.abs(px.amount))}</span>
                        </div>
                      </div>
                    ))
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
