const fs = require('fs');

const code = `
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Search, Plus, Trash2, Edit2, Check, X, Calendar, User, Tag, LayoutGrid, Package, CreditCard, Clock, ChevronDown, CheckCircle2, QrCode } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export function PhysicalCommerce({ user, isDark }: { user: any, isDark: boolean }) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'sales'>('inventory');

  return (
    <div className="flex flex-col h-full w-full">
      <div className={cn("px-4 pt-4 lg:px-8 lg:pt-8", isDark ? "bg-slate-900" : "bg-slate-50")}>
        <div className={cn("flex space-x-2 p-1 rounded-xl max-w-sm mx-auto", isDark ? "bg-slate-800" : "bg-white shadow-sm border border-slate-200")}>
          <button
            onClick={() => setActiveTab('inventory')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
              activeTab === 'inventory' 
                ? (isDark ? "bg-slate-700 text-white shadow" : "bg-slate-100 text-slate-900 shadow-sm") 
                : (isDark ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
            )}
          >
            <Package className="w-4 h-4" />
            Inventario
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
              activeTab === 'sales' 
                ? (isDark ? "bg-slate-700 text-white shadow" : "bg-slate-100 text-slate-900 shadow-sm") 
                : (isDark ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
            )}
          >
            <ShoppingBag className="w-4 h-4" />
            Ventas
          </button>
        </div>
      </div>
      <div className="flex-1 w-full overflow-y-auto p-4 lg:p-8">
        {activeTab === 'inventory' ? <InventoryTab user={user} isDark={isDark} /> : <SalesTab user={user} isDark={isDark} />}
      </div>
    </div>
  );
}

function InventoryTab({ user, isDark }: { user: any, isDark: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', price: '0', price3m: '0', price6m: '0', series: '' });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'commerce_inventory'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const docId = formData.id || Date.now().toString();
    const seriesArr = formData.series.split(',').map(s => s.trim()).filter(Boolean);
    const data = {
      name: formData.name,
      price: parseFloat(formData.price) || 0,
      price3m: parseFloat(formData.price3m) || 0,
      price6m: parseFloat(formData.price6m) || 0,
      series: seriesArr,
      qty: seriesArr.length,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', user.uid, 'commerce_inventory', docId), data, { merge: true });
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar producto?')) {
      await deleteDoc(doc(db, 'users', user.uid, 'commerce_inventory', id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Inventario de Productos</h2>
        <button onClick={() => { setFormData({ id: '', name: '', price: '0', price3m: '0', price6m: '0', series: '' }); setIsModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Agregar Producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className={cn("p-4 rounded-2xl border", isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
            <h3 className="font-bold text-lg">{item.name}</h3>
            <p className="text-sm opacity-70 mb-3">Stock: {item.qty} unid.</p>
            <div className="space-y-1 mb-4">
              <div className="flex justify-between text-sm"><span className="opacity-70">Contado:</span> <strong>{formatCurrency(item.price)}</strong></div>
              <div className="flex justify-between text-sm"><span className="opacity-70">3 Meses:</span> <strong>{formatCurrency(item.price3m)}</strong></div>
              <div className="flex justify-between text-sm"><span className="opacity-70">6 Meses:</span> <strong>{formatCurrency(item.price6m)}</strong></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setFormData({ id: item.id, name: item.name, price: item.price.toString(), price3m: (item.price3m||0).toString(), price6m: (item.price6m||0).toString(), series: (item.series||[]).join(', ') }); setIsModalOpen(true); }} className="flex-1 py-2 text-center border rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700">Editar</button>
              <button onClick={() => handleDelete(item.id)} className="py-2 px-3 text-rose-500 border border-rose-500/20 rounded-lg hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={cn("w-full max-w-md rounded-2xl p-6", isDark ? "bg-slate-800" : "bg-white")}>
            <h3 className="text-lg font-bold mb-4">{formData.id ? 'Editar' : 'Nuevo'} Producto</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Nombre</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1">PVP Contado</label>
                  <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">PVP 3 Meses</label>
                  <input type="number" step="0.01" required value={formData.price3m} onChange={e => setFormData({...formData, price3m: e.target.value})} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">PVP 6 Meses</label>
                  <input type="number" step="0.01" required value={formData.price6m} onChange={e => setFormData({...formData, price6m: e.target.value})} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Números de Serie (separados por coma)</label>
                <textarea required value={formData.series} onChange={e => setFormData({...formData, series: e.target.value})} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 h-24" placeholder="SN123, SN456..." />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded-lg font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SalesTab({ user, isDark }: { user: any, isDark: boolean }) {
  const [sales, setSales] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [clientId, setClientId] = useState('');
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [downPayment, setDownPayment] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [frequency, setFrequency] = useState('monthly');
  const [firstDueDate, setFirstDueDate] = useState('');
  
  // Para seleccionar serie
  const [currentInvSelection, setCurrentInvSelection] = useState('');
  const [currentSeriesSelection, setCurrentSeriesSelection] = useState<string[]>([]);
  
  useEffect(() => {
    if (!user) return;
    const qS = query(collection(db, 'users', user.uid, 'commerce_sales'));
    const unsubS = onSnapshot(qS, (snap) => setSales(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const qI = query(collection(db, 'users', user.uid, 'commerce_inventory'));
    const unsubI = onSnapshot(qI, (snap) => setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const qE = query(collection(db, 'entities'));
    const unsubE = onSnapshot(qE, (snap) => setEntities(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((e:any) => e.ownerId === user.uid)));
    
    return () => { unsubS(); unsubI(); unsubE(); };
  }, [user]);

  const handleAddItem = () => {
    if (!currentInvSelection) return;
    const invItem = inventory.find(i => i.id === currentInvSelection);
    if (!invItem) return;
    
    if (currentSeriesSelection.length === 0) return alert('Seleccione al menos una serie');
    
    setSelectedItems([...selectedItems, {
      itemId: invItem.id,
      name: invItem.name,
      series: currentSeriesSelection,
      qty: currentSeriesSelection.length,
      price: invItem.price // base price, could be adjusted
    }]);
    
    setCurrentInvSelection('');
    setCurrentSeriesSelection([]);
  };

  const handleRemoveItem = (idx: number) => {
    const newItems = [...selectedItems];
    newItems.splice(idx, 1);
    setSelectedItems(newItems);
  };

  const calculateTotal = () => selectedItems.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) return alert('Agregue productos');
    if (!clientId) return alert('Seleccione cliente');
    if (!firstDueDate) return alert('Seleccione fecha del primer pago');
    
    const total = calculateTotal();
    const dp = parseFloat(downPayment) || 0;
    const toFinance = total - dp;
    const count = parseInt(installmentsCount) || 1;
    const instAmount = toFinance / count;
    
    const installments = [];
    let currDate = new Date(firstDueDate);
    // Fix timezone offset issue
    currDate = new Date(currDate.getTime() + currDate.getTimezoneOffset() * 60000);
    
    for (let i = 0; i < count; i++) {
      installments.push({
        installmentNumber: i + 1,
        amount: instAmount,
        dueDate: currDate.toISOString(),
        status: 'pending',
        paidAmount: 0
      });
      
      // Calculate next date keeping the same day of week for weekly
      if (frequency === 'weekly') {
        currDate.setDate(currDate.getDate() + 7);
      } else if (frequency === 'biweekly') {
        currDate.setDate(currDate.getDate() + 14);
      } else {
        currDate.setMonth(currDate.getMonth() + 1);
      }
    }
    
    const saleData = {
      clientId,
      items: selectedItems,
      total,
      downPayment: dp,
      installmentsCount: count,
      frequency,
      status: 'active',
      installments,
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doc(collection(db, 'users', user.uid, 'commerce_sales')), saleData);
    
    // Deduct inventory
    for (const item of selectedItems) {
      const invRef = doc(db, 'users', user.uid, 'commerce_inventory', item.itemId);
      const invItem = inventory.find(i => i.id === item.itemId);
      if (invItem) {
        const newSeries = (invItem.series || []).filter((s: string) => !item.series.includes(s));
        await updateDoc(invRef, {
          series: newSeries,
          qty: newSeries.length
        });
      }
    }
    
    setIsModalOpen(false);
    setSelectedItems([]);
    setClientId('');
    setDownPayment('');
    setInstallmentsCount('1');
    setFirstDueDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Ventas Físicas y Créditos</h2>
        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Venta
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sales.map(sale => (
          <div key={sale.id} className={cn("p-4 rounded-2xl border", isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold">{entities.find(e => e.id === sale.clientId)?.name || 'Cliente'}</h3>
              <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", sale.status === 'completed' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                {sale.status === 'completed' ? 'Pagado' : 'Activo'}
              </span>
            </div>
            <p className="text-sm opacity-70 mb-2">Total: <strong>{formatCurrency(sale.total)}</strong></p>
            <div className="text-xs space-y-1 mb-3">
              {sale.items?.map((i:any, idx:number) => (
                <div key={idx}>- {i.qty}x {i.name}</div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <CreditCard className="w-4 h-4" /> 
              {sale.installmentsCount} cuotas ({sale.frequency})
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={cn("w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto", isDark ? "bg-slate-800" : "bg-white")}>
            <h3 className="text-lg font-bold mb-4">Nueva Venta</h3>
            <form onSubmit={handleSaveSale} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Cliente</label>
                <select required value={clientId} onChange={e => setClientId(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700">
                  <option value="">Seleccione un cliente...</option>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              
              <div className="p-4 rounded-xl border dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-sm">Productos</h4>
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <select value={currentInvSelection} onChange={e => { setCurrentInvSelection(e.target.value); setCurrentSeriesSelection([]); }} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700">
                      <option value="">Seleccione producto...</option>
                      {inventory.filter(i => i.qty > 0).map(i => <option key={i.id} value={i.id}>{i.name} ({i.qty} disp.)</option>)}
                    </select>
                    {currentInvSelection && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {inventory.find(i => i.id === currentInvSelection)?.series?.map((s:string) => (
                          <label key={s} className="flex items-center gap-2 text-xs p-1 border rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                            <input type="checkbox" checked={currentSeriesSelection.includes(s)} onChange={(e) => {
                              if (e.target.checked) setCurrentSeriesSelection([...currentSeriesSelection, s]);
                              else setCurrentSeriesSelection(currentSeriesSelection.filter(x => x !== s));
                            }} />
                            {s}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={handleAddItem} className="px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg font-bold">Agregar</button>
                </div>
                
                {selectedItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div>
                          <strong>{item.qty}x {item.name}</strong> 
                          <div className="text-xs opacity-70">Series: {item.series.join(', ')}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>{formatCurrency(item.price * item.qty)}</span>
                          <button type="button" onClick={() => handleRemoveItem(idx)} className="text-rose-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right font-black text-lg pt-2">
                      Total: {formatCurrency(calculateTotal())}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Cuota Inicial (Enganche)</label>
                  <input type="number" step="0.01" value={downPayment} onChange={e => setDownPayment(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Número de Cuotas</label>
                  <input type="number" required min="1" value={installmentsCount} onChange={e => setInstallmentsCount(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Frecuencia</label>
                  <select required value={frequency} onChange={e => setFrequency(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700">
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Fecha 1er Pago</label>
                  <input type="date" required value={firstDueDate} onChange={e => setFirstDueDate(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded-lg font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold">Crear Venta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
`
fs.writeFileSync('src/components/PhysicalCommerce.tsx', code);
