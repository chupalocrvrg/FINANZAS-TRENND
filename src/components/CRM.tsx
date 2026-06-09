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
  Loader2,
  Search
} from 'lucide-react';
import { Entity, EntityType } from '../types';
import { formatCurrency, generateWhatsAppUrl, cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useTranslation } from '../lib/translations';
import { ConfirmModal } from './ConfirmModal';

export function CRM() {
  const { user, settings } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<EntityType>('client');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  // Confirmation state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModalState({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };
  
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    rate: '0',
    isAntUpdater: false,
    antUpdateCost: '0',
  });

  const [services, setServices] = useState<any[]>([]);
  const [entitiesLoaded, setEntitiesLoaded] = useState(false);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState<number | null>(null);
  const [autoSynced, setAutoSynced] = useState(false);

  const isDark = settings?.theme === 'dark';

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'entities'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entity));
      setEntities(docs);
      setEntitiesLoaded(true);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const qSer = query(collection(db, 'digital_services'), where('ownerId', '==', user.uid));
    const unsubscribeSer = onSnapshot(qSer, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServices(docs);
      setServicesLoaded(true);
    });
    return () => unsubscribeSer();
  }, [user]);

  const runCRMSync = async () => {
    if (!user || isSyncing) return;
    setIsSyncing(true);
    let itemsAdded = 0;

    const clientSales = services.filter(s => s.clientName && s.clientName.trim() !== '');
    const tempEntities = [...entities];

    for (const sale of clientSales) {
      const trimmedName = sale.clientName.trim();
      const clientType = sale.clientType || 'client'; // 'client' or 'reseller'

      const exists = tempEntities.some(ent => 
        ent.name?.trim().toLowerCase() === trimmedName.toLowerCase() &&
        ent.type === clientType
      );

      if (!exists) {
        try {
          const docRef = await addDoc(collection(db, 'entities'), {
            name: trimmedName,
            contact: sale.clientContact ? sale.clientContact.trim() : '',
            type: clientType,
            rate: 0,
            isAntUpdater: false,
            antUpdateCost: 0,
            ownerId: user.uid,
            createdAt: new Date().toISOString()
          });

          tempEntities.push({
            id: docRef.id,
            name: trimmedName,
            contact: sale.clientContact ? sale.clientContact.trim() : '',
            type: clientType as any,
            rate: 0,
            isAntUpdater: false,
            antUpdateCost: 0,
            createdAt: new Date().toISOString()
          });
          itemsAdded++;
        } catch (err) {
          console.error("Error auto-syncing entity to CRM:", err);
        }
      }
    }

    setSyncCount(itemsAdded);
    setIsSyncing(false);
    setAutoSynced(true);
  };

  useEffect(() => {
    if (user && entitiesLoaded && servicesLoaded && !autoSynced && !isSyncing) {
      runCRMSync();
    }
  }, [user, entitiesLoaded, servicesLoaded, autoSynced, isSyncing, services, entities]);

  const filteredEntities = entities.filter(e => {
    const matchesTab = e.type === activeTab;
    if (!matchesTab) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (e.name?.toLowerCase().includes(term)) || 
           (e.contact?.toLowerCase().includes(term));
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    const name = formData.name;
    const contact = formData.contact;
    const rate = activeTab === 'intermediary' ? parseFloat(formData.rate) : 0;
    const isAntUpdater = activeTab === 'supplier' ? formData.isAntUpdater : false;
    const antUpdateCost = (activeTab === 'supplier' && isAntUpdater) ? parseFloat(formData.antUpdateCost) : 0;
    const isEditing = !!editingEntity;
    const editingId = editingEntity?.id;

    // Reset UI state immediately
    setIsModalOpen(false);
    setEditingEntity(null);
    setFormData({ name: '', contact: '', rate: '0', isAntUpdater: false, antUpdateCost: '0' });
    setIsSubmitting(false);

    try {
      if (isEditing && editingId) {
        updateDoc(doc(db, 'entities', editingId), {
          name,
          contact,
          rate,
          isAntUpdater,
          antUpdateCost,
        }).catch(err => console.error("Error updates:", err));
      } else {
        addDoc(collection(db, 'entities'), {
          name,
          contact,
          type: activeTab,
          rate,
          isAntUpdater,
          antUpdateCost,
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
      isAntUpdater: entity.isAntUpdater || false,
      antUpdateCost: entity.antUpdateCost?.toString() || '0',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const entName = entities.find(e => e.id === id)?.name || "esta entidad";
    triggerConfirm(
      `¿Eliminar de CRM: ${entName}?`,
      "¿Está seguro de que desea eliminar permanentemente este contacto del CRM? Esta acción es definitiva.",
      async () => {
        try {
          await deleteDoc(doc(db, 'entities', id));
        } catch (error) {
          console.error("Error al eliminar:", error);
        }
      }
    );
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
            setFormData({ name: '', contact: '', rate: '0', isAntUpdater: false, antUpdateCost: '0' });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-500/10 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          {t('crm.add_client', 'Añadir Entidad')}
        </button>
      </div>

      {/* Indicador de Sincronización Automática con Ventas */}
      {(isSyncing || (autoSynced && syncCount !== null)) && (
        <div className={cn(
          "p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-semibold animate-in fade-in duration-300",
          isDark ? "bg-indigo-950/20 border-indigo-500/10 text-indigo-300" : "bg-indigo-50/50 border-indigo-100/80 text-indigo-700"
        )}>
          <div className="flex items-center gap-3">
            {isSyncing ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500 shrink-0" />
            ) : (
              <span className="text-emerald-500 text-lg shrink-0">✨</span>
            )}
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px] text-indigo-500 mb-0.5">Sincronización Automática de Ventas</p>
              <p className="opacity-90">
                {isSyncing 
                  ? "Sincronizando clientes registrados en ventas de servicios digitales con el CRM..."
                  : syncCount && syncCount > 0
                    ? `¡Sincronización completa! Se compararon todas las ventas registradas y se agregaron automáticamente ${syncCount} nuevos clientes detectados al CRM.`
                    : "El CRM ya se encuentra totalmente sincronizado con las ventas de servicios digitales."
                }
              </p>
            </div>
          </div>
          {autoSynced && (
            <button 
              onClick={() => {
                setAutoSynced(false);
                setSyncCount(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-[10px] uppercase font-black tracking-wider hover:bg-indigo-500/20 active:scale-95 transition-all text-indigo-400 cursor-pointer self-stretch sm:self-auto text-center"
            >
              Cerrar aviso
            </button>
          )}
        </div>
      )}

      {/* Centered Search Bar */}
      <div className="flex justify-center w-full">
        <div className="relative w-full max-w-xl">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <Search className="w-5 h-5 animate-pulse text-indigo-500" />
          </span>
          <input
            type="text"
            placeholder="🔍 Búsqueda general en CRM (por nombre o contacto)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold shadow-inner text-center tracking-wide",
              isDark 
                ? "border-slate-850 bg-slate-900/45 text-white placeholder-slate-500 focus:bg-slate-900" 
                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:bg-slate-50"
            )}
          />
        </div>
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
                {entity.type === 'supplier' && entity.isAntUpdater && (
                  <div className={cn("flex items-center justify-between p-4 rounded-lg border mb-6 font-bold tracking-tight", isDark ? "bg-indigo-900/20 border-indigo-800/30" : "bg-indigo-50 border-indigo-100")}>
                    <span className="text-indigo-600 dark:text-indigo-400 text-[10px] uppercase tracking-widest">Actualizador ANT (Costo)</span>
                    <span className={cn("text-lg font-mono", isDark ? "text-white" : "text-indigo-900")}>{formatCurrency(entity.antUpdateCost || 0)}</span>
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
                {activeTab === 'supplier' && (
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border text-sm font-bold transition-all outline-none hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <input
                        type="checkbox"
                        checked={formData.isAntUpdater}
                        onChange={(e) => setFormData({...formData, isAntUpdater: e.target.checked})}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Es un Actualizador ANT</span>
                    </label>
                    
                    {formData.isAntUpdater && (
                      <div className="space-y-1.5 p-4 rounded-xl border bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30">
                        <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 px-1">Costo por Actualización (USD) cobrado por este Proveedor</label>
                        <input 
                          type="number"
                          step="0.01"
                          value={formData.antUpdateCost}
                          onChange={(e) => setFormData({...formData, antUpdateCost: e.target.value})}
                          className={cn("w-full p-3 rounded-lg border text-sm font-bold transition-all outline-none", isDark ? "bg-slate-800 border-indigo-500/20 text-white focus:bg-slate-700" : "bg-white border-indigo-200 focus:border-indigo-500")}
                        />
                      </div>
                    )}
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

      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        isDark={isDark}
      />
    </div>
  );
}
