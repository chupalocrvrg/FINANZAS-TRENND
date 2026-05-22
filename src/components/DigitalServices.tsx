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
  Search
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

interface Entity {
  id: string;
  name: string;
  type: string;
  rate: number;
}

interface DigitalServiceItem {
  id: string;
  name: string;
  category: string;
  revenue: number;
  cost?: number;
  supplierId?: string;
  supplierName?: string;
  ownerId: string;
}

export function DigitalServices() {
  const { user, settings } = useAuth();
  const [services, setServices] = useState<DigitalServiceItem[]>([]);
  const [suppliers, setSuppliers] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Streaming',
    revenue: '0',
    cost: '0',
    supplierId: ''
  });

  const isDark = settings?.theme === 'dark';

  useEffect(() => {
    if (!user) return;
    const qSer = query(collection(db, 'digital_services'), where('ownerId', '==', user.uid));
    const unsubSer = onSnapshot(qSer, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DigitalServiceItem)));
      setLoading(false);
    });

    const qSup = query(collection(db, 'entities'), where('ownerId', '==', user.uid), where('type', '==', 'supplier'));
    const unsubSup = onSnapshot(qSup, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entity)));
    });

    return () => { unsubSer(); unsubSup(); };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    
    const sup = suppliers.find(s => s.id === formData.supplierId);
    const name = formData.name;
    const category = formData.category;
    const revenue = parseFloat(formData.revenue);
    const cost = parseFloat(formData.cost);
    const supplierId = formData.supplierId;
    const supplierName = sup?.name || '';

    // Reset UI state immediately
    setIsModalOpen(false);
    setFormData({ name: '', category: 'Streaming', revenue: '0', cost: '0', supplierId: '' });
    setIsSubmitting(false);

    try {
      addDoc(collection(db, 'digital_services'), {
        name,
        category,
        revenue,
        cost,
        supplierId,
        supplierName,
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      }).catch(err => console.error("Error creating digital service:", err));
    } catch (error) {
      console.error(error);
      alert("Error al iniciar el guardado de datos.");
    }
  };

  const handleSupplierChange = (supId: string) => {
    const sup = suppliers.find(s => s.id === supId);
    setFormData(prev => ({
      ...prev,
      supplierId: supId,
      cost: sup ? sup.rate.toString() : '0'
    }));
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar este servicio?")) {
      await deleteDoc(doc(db, 'digital_services', id));
    }
  };

  const categories = ['Streaming', 'Música', 'Gaming', 'Software', 'Otros'];

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto p-4 lg:p-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="space-y-1">
          <h2 className={cn("text-2xl lg:text-3xl font-bold tracking-tight uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
            Servicios Digitales
          </h2>
          <p className="text-slate-500 font-medium">Línea de negocio secundaria: Reventa y gestión de suscripciones.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-500/10 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Añadir Servicio
        </button>
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="font-bold uppercase tracking-widest text-[10px]">Sincronizando Servicios...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <AnimatePresence mode="popLayout">
            {services.map((service) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={service.id}
                className={cn(
                  "p-6 rounded-3xl border transition-all group relative",
                  isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm hover:shadow-md"
                )}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", isDark ? "bg-slate-800 text-indigo-400" : "bg-indigo-50 text-indigo-600")}>
                    {service.category === 'Streaming' && <Tv className="w-6 h-6" />}
                    {service.category === 'Música' && <Smartphone className="w-6 h-6" />}
                    {service.category === 'Gaming' && <Gamepad2 className="w-6 h-6" />}
                    {['Software', 'Otros'].includes(service.category) && <ShoppingBag className="w-6 h-6" />}
                  </div>
                  <button 
                    onClick={() => handleDelete(service.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{service.category}</span>
                  <h4 className={cn("text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{service.name}</h4>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-800/10">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Costo</p>
                    <p className="text-sm font-black font-mono text-rose-500">{formatCurrency(service.cost || 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PVP</p>
                    <p className="text-sm font-black font-mono text-emerald-500">{formatCurrency(service.revenue)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {!loading && services.length === 0 && (
        <div className={cn("p-8 lg:p-12 border border-dashed rounded-3xl flex flex-col items-center justify-center text-center gap-4", isDark ? "border-slate-800" : "border-slate-200")}>
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-slate-300" />
          </div>
          <div className="space-y-1">
            <h3 className={cn("text-lg font-bold", isDark ? "text-slate-400" : "text-slate-700")}>Expanda su catálogo</h3>
            <p className="text-slate-500 text-sm max-w-xs">Introduzca nuevos productos digitales y comience a rastrear su rendimiento.</p>
          </div>
          <button 
            onClick={() => setShowCatalog(true)}
            className="text-indigo-500 font-bold uppercase text-[10px] tracking-widest hover:underline"
          >
            Ver Biblioteca de Catálogo
          </button>
        </div>
      )}

      {/* Modal Añadir */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              className={cn("relative w-full max-w-md p-8 rounded-3xl border shadow-2xl", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className={cn("text-xl font-bold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>Nuevo Producto Digital</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Nombre del Servicio</label>
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                    placeholder="Ej. Netflix 4 Pantallas"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Categoría</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white")}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Proveedor (Opcional)</label>
                  <select 
                    value={formData.supplierId}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white")}
                  >
                    <option value="">Seleccione un Proveedor...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (${s.rate})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Costo (USD)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({...formData, cost: e.target.value})}
                      className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">PVP (USD)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={formData.revenue}
                      onChange={(e) => setFormData({...formData, revenue: e.target.value})}
                      className={cn("w-full p-4 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                    />
                  </div>
                </div>

                <button 
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Servicio
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
              className={cn("relative w-full max-w-2xl p-8 rounded-3xl border shadow-2xl", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100")}
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className={cn("text-2xl font-bold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>Catálogo Global</h3>
                  <p className="text-slate-500 text-sm">Seleccione servicios predefinidos para su inventario.</p>
                </div>
                <button onClick={() => setShowCatalog(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                  <X />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {['Netflix', 'Disney+', 'Spotify', 'HBO Max', 'Prime Video', 'YouTube Prem.'].map(item => (
                  <button 
                    key={item}
                    onClick={() => {
                      setFormData({...formData, name: item});
                      setShowCatalog(false);
                      setIsModalOpen(true);
                    }}
                    className={cn("p-4 rounded-2xl border text-center font-bold text-sm transition-all hover:border-indigo-500 hover:bg-indigo-50/50", isDark ? "border-slate-800 text-slate-300" : "border-slate-100 text-slate-600")}
                  >
                    {item}
                  </button>
                ))}
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
    </div>
  );
}
