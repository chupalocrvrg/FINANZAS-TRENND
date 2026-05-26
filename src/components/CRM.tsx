import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  User, 
  Users,
  Briefcase, 
  Truck, 
  Edit3, 
  Trash2,
  ExternalLink,
  X,
  Save,
  Loader2
} from 'lucide-react';
import { Entity, EntityType } from '../types';
import { formatCurrency, generateWhatsAppUrl, cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useTranslation } from '../lib/translations';

export function CRM() {
  const { user, settings } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<EntityType>('client');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    rate: '0',
  });

  const isDark = settings?.theme === 'dark';

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'entities'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entity));
      setEntities(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const filteredEntities = entities.filter(e => e.type === activeTab);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    const name = formData.name;
    const contact = formData.contact;
    const rate = activeTab === 'intermediary' ? parseFloat(formData.rate) : 0;
    const isEditing = !!editingEntity;
    const editingId = editingEntity?.id;

    // Reset UI state immediately
    setIsModalOpen(false);
    setEditingEntity(null);
    setFormData({ name: '', contact: '', rate: '0' });
    setIsSubmitting(false);

    try {
      if (isEditing && editingId) {
        updateDoc(doc(db, 'entities', editingId), {
          name,
          contact,
          rate,
        }).catch(err => console.error("Error updates:", err));
      } else {
        addDoc(collection(db, 'entities'), {
          name,
          contact,
          type: activeTab,
          rate,
          ownerId: user.uid,
          createdAt: new Date().toISOString()
        }).catch(err => console.error("Error creating:", err));
      }
    } catch (error) {
      console.error("Error al guardar entidad:", error);
      alert("Error al iniciar el guardado de datos.");
    }
  };

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name,
      contact: entity.contact || '',
      rate: entity.rate?.toString() || '0',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'entities', id));
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto p-4 lg:p-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="space-y-1">
          <h2 className={cn("text-2xl lg:text-3xl font-bold tracking-tight uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
            {t('crm.title', 'CRM de Relaciones')}
          </h2>
          <p className="text-slate-500 font-medium">{t('crm.subtitle', 'Gestione su ecosistema de clientes, intermediarios y proveedores.')}</p>
        </div>
        <button 
          onClick={() => {
            setEditingEntity(null);
            setFormData({ name: '', contact: '', rate: '0' });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-500/10 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          {t('crm.add_client', 'Añadir Entidad')}
        </button>
      </div>

      <div className={cn("flex flex-wrap gap-2 p-1 rounded-2xl w-fit", isDark ? "bg-slate-900 border border-slate-800" : "bg-slate-100")}>
        {(['client', 'reseller', 'intermediary', 'supplier'] as EntityType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
               "px-4 lg:px-8 py-2.5 rounded-xl font-bold transition-all text-xs uppercase tracking-widest",
              activeTab === tab 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
            )}
          >
            {tab === 'client' 
              ? t('crm.tab_clients', 'Clientes') 
              : tab === 'reseller' 
              ? t('crm.tab_resellers', 'Revendedores') 
              : tab === 'intermediary' 
              ? t('crm.tab_intermediaries', 'Intermediarios') 
              : t('crm.tab_suppliers', 'Proveedores')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="font-bold uppercase tracking-widest text-[10px]">Cargando Entidades...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredEntities.map((entity) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={entity.id}
                className={cn(
                  "p-6 rounded-2xl border flex flex-col transition-all duration-300 group",
                  isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-4 mb-6 text-left">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100")}>
                    {entity.type === 'client' && <User className={isDark ? "text-indigo-400" : "text-slate-400"} />}
                    {entity.type === 'reseller' && <Users className="text-amber-500" />}
                    {entity.type === 'intermediary' && <Briefcase className="text-indigo-500" />}
                    {entity.type === 'supplier' && <Truck className={isDark ? "text-slate-500" : "text-slate-400"} />}
                  </div>
                  <div className="min-w-0">
                    <h4 className={cn("font-bold uppercase tracking-tight truncate", isDark ? "text-white" : "text-slate-900")}>{entity.name}</h4>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest truncate">{entity.contact || 'Sin contacto'}</p>
                  </div>
                </div>

                {entity.type === 'intermediary' && (
                  <div className={cn("flex items-center justify-between p-4 rounded-lg border mb-6 font-bold tracking-tight", isDark ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-100")}>
                    <span className="text-slate-500 text-[10px] uppercase tracking-widest">Tasa de Actualización</span>
                    <span className={cn("text-lg font-mono", isDark ? "text-white" : "text-slate-900")}>{formatCurrency(entity.rate || 0)}</span>
                  </div>
                )}

                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => handleEdit(entity)}
                    className={cn("flex-1 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2", isDark ? "border-slate-800 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  {entity.contact && (
                    <a 
                      href={generateWhatsAppUrl(entity.contact, `Hola ${entity.name}, le escribe Control Financiero.`)}
                      target="_blank"
                      rel="noreferrer"
                      className={cn("p-2.5 rounded-xl transition-colors border", isDark ? "bg-emerald-950/20 text-emerald-500 border-emerald-900/50" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100 shadow-sm shadow-emerald-500/10")}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button 
                    onClick={() => handleDelete(entity.id)}
                    className="p-2.5 rounded-xl text-rose-400 hover:text-rose-600 transition-colors hover:bg-rose-50 border border-transparent hover:border-rose-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredEntities.length === 0 && (
            <div className={cn("col-span-full py-24 text-center rounded-3xl border border-dashed", isDark ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400")}>
              No se encontraron registros en esta categoría.
            </div>
          )}
        </div>
      )}

      {/* Modal Formulario */}
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
              <div className="flex justify-between items-center mb-6 text-left">
                <h3 className={cn("text-xl font-bold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  {editingEntity ? 'Editar' : 'Añadir'} {activeTab === 'client' ? 'Cliente' : activeTab === 'reseller' ? 'Revendedor' : activeTab === 'intermediary' ? 'Intermediario' : 'Proveedor'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Nombre Completo / Razón Social</label>
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white focus:bg-slate-700" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500 shadow-inner")}
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Contacto (WhatsApp)</label>
                  <input 
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    className={cn("w-full p-4 rounded-xl border text-sm font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white focus:bg-slate-700" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500 shadow-inner")}
                    placeholder="Ej. +593987654321"
                  />
                </div>
                {activeTab === 'intermediary' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Tasa por Actualización (USD)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={formData.rate}
                      onChange={(e) => setFormData({...formData, rate: e.target.value})}
                      className={cn("w-full p-4 rounded-xl border text-sm font-bold transition-all outline-none", isDark ? "bg-slate-800 border-slate-700 text-white focus:bg-slate-700" : "bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-500 shadow-inner")}
                    />
                  </div>
                )}

                <button 
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingEntity ? 'Guardar Cambios' : 'Confirmar Registro'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
