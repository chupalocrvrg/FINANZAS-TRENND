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
  MessageCircle
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
  clientName?: string;
  clientContact?: string;
  expirationDate?: string;
  email?: string;
  password?: string;
  pin?: string;
  status?: 'active' | 'expired' | 'pending';
  createdAt?: string;
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
    id: '', // for edit mode
    name: '',
    category: 'Streaming',
    revenue: '0',
    cost: '0',
    supplierId: '',
    clientName: '',
    clientContact: '',
    expirationDate: '',
    email: '',
    password: '',
    pin: '',
    status: 'active' as 'active' | 'expired' | 'pending'
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
    const serviceData = {
      name: formData.name,
      category: formData.category,
      revenue: parseFloat(formData.revenue) || 0,
      cost: parseFloat(formData.cost) || 0,
      supplierId: formData.supplierId,
      supplierName: sup?.name || '',
      clientName: formData.clientName,
      clientContact: formData.clientContact,
      expirationDate: formData.expirationDate,
      email: formData.email,
      password: formData.password,
      pin: formData.pin,
      status: formData.status,
      ownerId: user.uid,
      updatedAt: new Date().toISOString()
    };

    try {
      if (formData.id) {
        // Edit Mode
        const { updateDoc, doc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'digital_services', formData.id), serviceData);
      } else {
        // Create Mode
        await addDoc(collection(db, 'digital_services'), {
          ...serviceData,
          createdAt: new Date().toISOString()
        });
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
      expirationDate: '',
      email: '',
      password: '',
      pin: '',
      status: 'active'
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
      expirationDate: service.expirationDate || '',
      email: service.email || '',
      password: service.password || '',
      pin: service.pin || '',
      status: service.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (service: DigitalServiceItem) => {
    try {
      const nextStatus = service.status === 'active' ? 'expired' : 'active';
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'digital_services', service.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error toggling status:", e);
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
    } catch (e) {
      console.error("Error renewing service:", e);
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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Eliminar este servicio definitivamente?")) {
      await deleteDoc(doc(db, 'digital_services', id));
    }
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

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="font-bold uppercase tracking-widest text-[10px]">Sincronizando Servicios...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          <AnimatePresence mode="popLayout">
            {services.map((service) => {
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
                    "p-5 rounded-3xl border transition-all flex flex-col justify-between group relative overflow-hidden",
                    expired 
                      ? (isDark ? "bg-rose-950/10 border-rose-900/40" : "bg-rose-50/30 border-rose-100") 
                      : expiring 
                        ? (isDark ? "bg-amber-950/10 border-amber-900/40" : "bg-amber-50/30 border-amber-100")
                        : (isDark ? "bg-slate-900 border-slate-800 hover:border-indigo-900/50" : "bg-white border-slate-100 shadow-sm hover:shadow-md")
                  )}
                >
                  <div>
                    {/* Header card info */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", 
                          expired ? "bg-rose-500/10 text-rose-500" :
                          expiring ? "bg-amber-500/10 text-amber-500" :
                          isDark ? "bg-slate-800 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                        )}>
                          {service.category === 'Streaming' && <Tv className="w-5 h-5" />}
                          {service.category === 'Música' && <Smartphone className="w-5 h-5" />}
                          {service.category === 'Gaming' && <Gamepad2 className="w-5 h-5" />}
                          {['Software', 'Otros'].includes(service.category) && <ShoppingBag className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">{service.category}</span>
                          <h4 className={cn("text-sm font-bold tracking-tight truncate", isDark ? "text-white" : "text-slate-900")} title={service.name}>
                            {service.name}
                          </h4>
                        </div>
                      </div>
                      
                      {/* Status badge */}
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0",
                        expired ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                        expiring ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                        "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      )}>
                        {expired ? 'Cortar / Vencido' : expiring ? 'Próximo Cortar' : 'Activo'}
                      </span>
                    </div>

                    {/* Cliente Info */}
                    {service.clientName && (
                      <div className={cn("p-2.5 rounded-xl text-xs mb-3 flex flex-col gap-0.5", isDark ? "bg-slate-950/40" : "bg-slate-50")}>
                        <p className={cn("font-bold truncate", isDark ? "text-slate-300" : "text-slate-800")}>
                          👤 {service.clientName}
                        </p>
                        {service.clientContact && (
                          <p className="text-[10px] text-slate-500 font-mono">
                            📞 {service.clientContact}
                          </p>
                        )}
                        {service.expirationDate && (
                          <p className={cn("text-[10px] font-bold mt-1", expired ? "text-rose-500" : expiring ? "text-amber-500" : "text-slate-500")}>
                            📅 Expira: {service.expirationDate}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Cuenta credenciales ocultas/visibles */}
                    {(service.email || service.password || service.pin) && (
                      <div className="border border-dashed border-slate-100/10 p-2.5 rounded-xl text-[10px] mb-4 space-y-1 font-medium bg-slate-950/10">
                        {service.email && (
                          <div className="flex justify-between items-center truncate">
                            <span className="text-slate-400">User:</span>
                            <span className={cn("font-bold select-all", isDark ? "text-indigo-200" : "text-slate-700")}>{service.email}</span>
                          </div>
                        )}
                        {service.password && (
                          <div className="flex justify-between items-center truncate">
                            <span className="text-slate-400">Clave:</span>
                            <span className={cn("font-bold select-all font-mono", isDark ? "text-indigo-300" : "text-slate-800")}>{service.password}</span>
                          </div>
                        )}
                        {service.pin && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">PIN / Pantalla:</span>
                            <span className="font-bold bg-indigo-500/10 text-indigo-500 px-1 py-0.2 rounded font-mono">{service.pin}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Profit margins */}
                  <div>
                    <div className="flex items-center justify-between py-2 border-t border-slate-800/10 mb-4">
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Costo</p>
                        <p className="text-xs font-black font-mono text-rose-500">{formatCurrency(service.cost || 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">PVP</p>
                        <p className="text-xs font-black font-mono text-emerald-500">{formatCurrency(service.revenue)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Rentabilidad</p>
                        <p className="text-xs font-black font-mono text-indigo-500">{formatCurrency(service.revenue - (service.cost || 0))}</p>
                      </div>
                    </div>

                    {/* Quick Core Actions row */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button 
                        onClick={() => handleEdit(service)}
                        title="Editar suscripción"
                        className={cn("flex-1 p-2 border rounded-xl hover:bg-slate-50 transition-colors flex justify-center text-slate-500 hover:text-indigo-600 cursor-pointer", isDark ? "border-slate-800 hover:bg-slate-800/40" : "border-slate-200 bg-white shadow-xs")}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest">Editar</span>
                      </button>
                      <button 
                        onClick={() => handleRenewService(service)}
                        title="Extender 30 días adicionales de renovación"
                        className="flex-1 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex justify-center cursor-pointer shadow-sm text-[10px] font-bold uppercase tracking-widest"
                      >
                        Renovar
                      </button>
                      {service.clientContact && (
                        <button 
                          onClick={(e) => handleWhatsAppAlert(service, e)}
                          title="Enviar cobro por WhatsApp"
                          className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => handleDelete(service.id, e)}
                        title="Eliminar registro"
                        className="p-2 border border-rose-200 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                    <input 
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={cn("w-full p-3.5 rounded-xl border text-sm font-bold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500")}
                      placeholder="Ej. Netflix Premium 1 Pantalla"
                    />
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
                <div className="p-3 bg-indigo-50/5 border border-dashed border-slate-100/10 rounded-2xl space-y-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 block">Credenciales y Acceso (Opcional)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase text-slate-400">Identificador / PIN de Pantalla</label>
                    <input 
                      type="text"
                      value={formData.pin}
                      placeholder="Ej. Pantalla 4 - PIN 4589"
                      onChange={(e) => setFormData({...formData, pin: e.target.value})}
                      className={cn("w-full p-3 rounded-xl border text-xs font-semibold outline-none", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 focus:bg-white")}
                    />
                  </div>
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
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (${s.rate})</option>)}
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
                <button onClick={() => setShowCatalog(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 cursor-pointer">
                  <X />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {['Netflix', 'Disney+', 'Spotify', 'HBO Max', 'Prime Video', 'YouTube Prem.'].map(item => (
                  <button 
                    key={item}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, name: item }));
                      setShowCatalog(false);
                      setIsModalOpen(true);
                    }}
                    className={cn("p-4 rounded-2xl border text-center font-bold text-sm transition-all hover:border-indigo-500 hover:bg-indigo-50/50 cursor-pointer", isDark ? "border-slate-800 text-slate-300" : "border-slate-100 text-slate-600")}
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
