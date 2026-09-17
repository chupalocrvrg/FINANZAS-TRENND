import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { TramiteCatalogItem, Entity } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Users, 
  DollarSign, 
  X,
  MessageCircle,
  Tag
} from 'lucide-react';

const PRESET_TRAMITES = [
  {
    name: 'Renovación de Licencia de Conducir (ANT)',
    category: 'ANT & Tránsito',
    requirements: 'Cédula de ciudadanía, comprobante de pago de especie, examen psicosensométrico aprobado y turno digital.',
    cost: 15.00,
    pvp: 25.00,
    pvpReseller: 20.00,
    estimatedDelivery: '24 a 48 horas laborables',
    notes: 'Verificar previamente que no existan multas pendientes en el sistema de la ANT.'
  },
  {
    name: 'Bloqueo Vehicular por Inactividad / Venta',
    category: 'Vehicular',
    requirements: 'Cédula del propietario, contrato de compraventa notariado o denuncia juramentada de pérdida de posesión.',
    cost: 20.00,
    pvp: 35.00,
    pvpReseller: 28.00,
    estimatedDelivery: '2 a 4 días laborables',
    notes: 'Exonera al propietario original de cobro acumulado de matrículas futuras.'
  },
  {
    name: 'Levantamiento de Gravamen / Prenda',
    category: 'Legal / Vehicular',
    requirements: 'Carta de finiquito original de la entidad bancaria o cooperativa con firma autorizada y sello.',
    cost: 25.00,
    pvp: 45.00,
    pvpReseller: 35.00,
    estimatedDelivery: '3 a 5 días laborables',
    notes: 'Habilita al vehículo para venta, transferencia o gravamen posterior sin restricciones.'
  },
  {
    name: 'Certificado Único Vehicular (CUV)',
    category: 'ANT & Tránsito',
    requirements: 'Número de placa vehicular o número de chasis (VIN) y cédula del solicitante.',
    cost: 5.00,
    pvp: 12.00,
    pvpReseller: 9.00,
    estimatedDelivery: 'Entrega en 1 a 3 horas',
    notes: 'Documento oficial con firma electrónica y código QR para trámites de compra y venta.'
  },
  {
    name: 'Consulta y Descuento / Gestión de Multas de Tránsito',
    category: 'ANT & Tránsito',
    requirements: 'Número de cédula o placa para inspección en sistemas ANT, CTE y Municipales (ATM/AMT).',
    cost: 0,
    pvp: 0,
    pvpReseller: 0,
    estimatedDelivery: 'Mismo día',
    notes: 'Requiere análisis previo del historial de infracciones para cotizar la gestión correspondiente.'
  }
];

export function TramitesCatalog() {
  const { user, settings } = useAuth();
  const isDark = settings?.theme === 'dark' || (settings?.theme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [tramites, setTramites] = useState<TramiteCatalogItem[]>([]);
  const [suppliers, setSuppliers] = useState<Entity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTramite, setEditingTramite] = useState<TramiteCatalogItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'ANT & Tránsito',
    requirements: '',
    cost: '',
    pvp: '',
    pvpReseller: '',
    estimatedDelivery: '24 a 48 horas',
    supplierId: '',
    supplierName: '',
    notes: ''
  });

  // Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Real-time listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'tramites_catalog'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as TramiteCatalogItem[];
      setTramites(list.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    }, (err) => {
      console.error('Error loading tramites catalog:', err);
      setLoading(false);
    });

    // Suppliers listener
    const qEnt = query(
      collection(db, 'entities'),
      where('ownerId', '==', user.uid)
    );
    const unsubEnt = onSnapshot(qEnt, (snap) => {
      const ents = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Entity[];
      setSuppliers(ents.filter(e => e.types?.includes('supplier') || e.type === 'supplier'));
    });

    return () => {
      unsubscribe();
      unsubEnt();
    };
  }, [user]);

  const handleOpenModal = (item?: TramiteCatalogItem) => {
    if (item) {
      setEditingTramite(item);
      setFormData({
        name: item.name,
        category: item.category || 'ANT & Tránsito',
        requirements: item.requirements || '',
        cost: item.cost !== undefined && item.cost > 0 ? String(item.cost) : '',
        pvp: item.pvp !== undefined && item.pvp > 0 ? String(item.pvp) : '',
        pvpReseller: item.pvpReseller !== undefined && item.pvpReseller > 0 ? String(item.pvpReseller) : '',
        estimatedDelivery: item.estimatedDelivery || '24 a 48 horas',
        supplierId: item.supplierId || '',
        supplierName: item.supplierName || '',
        notes: item.notes || ''
      });
    } else {
      setEditingTramite(null);
      setFormData({
        name: '',
        category: 'ANT & Tránsito',
        requirements: '',
        cost: '',
        pvp: '',
        pvpReseller: '',
        estimatedDelivery: '24 a 48 horas',
        supplierId: '',
        supplierName: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    const supObj = suppliers.find(s => s.id === formData.supplierId);
    const costVal = parseFloat(formData.cost) || 0;
    const pvpVal = parseFloat(formData.pvp) || 0;
    const pvpResellerVal = parseFloat(formData.pvpReseller) || 0;

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim() || 'General',
      requirements: formData.requirements.trim(),
      cost: costVal,
      pvp: pvpVal,
      pvpReseller: pvpResellerVal,
      estimatedDelivery: formData.estimatedDelivery.trim(),
      supplierId: formData.supplierId || '',
      supplierName: supObj?.name || formData.supplierName || '',
      notes: formData.notes.trim(),
      ownerId: user.uid,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingTramite) {
        await updateDoc(doc(db, 'tramites_catalog', editingTramite.id), payload);
      } else {
        await addDoc(collection(db, 'tramites_catalog'), {
          ...payload,
          active: true,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving tramite catalog item:', err);
      alert('Error al guardar el trámite en el catálogo.');
    }
  };

  const handleDelete = (item: TramiteCatalogItem) => {
    setConfirmModal({
      isOpen: true,
      title: `¿Eliminar trámite: ${item.name}?`,
      message: 'Se removerá este trámite de la oferta de servicios y del link personalizado del cliente.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'tramites_catalog', item.id));
        } catch (err) {
          console.error('Error deleting tramite:', err);
        }
      }
    });
  };

  const handleLoadPresets = async () => {
    if (!user) return;
    setConfirmModal({
      isOpen: true,
      title: '¿Cargar catálogo sugerido de trámites?',
      message: 'Se agregarán automáticamente trámites frecuentes de ANT, Tránsito y Vehicular con sus requisitos y tiempos de entrega sugeridos.',
      onConfirm: async () => {
        try {
          for (const preset of PRESET_TRAMITES) {
            await addDoc(collection(db, 'tramites_catalog'), {
              ...preset,
              ownerId: user.uid,
              active: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error('Error adding preset tramites:', err);
        }
      }
    });
  };

  // Filter
  const categories = Array.from(new Set(tramites.map(t => t.category).filter(Boolean)));
  const filteredTramites = tramites.filter(t => {
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q.trim() || 
      t.name.toLowerCase().includes(q) ||
      t.requirements?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base lg:text-lg font-black tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Catálogo de Trámites Ofrecidos
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold">
              {tramites.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure los trámites disponibles, requisitos para los clientes, tiempos de entrega y precios (o cotización directa por WhatsApp).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {tramites.length === 0 && (
            <button
              onClick={handleLoadPresets}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Cargar Trámites ANT Sugeridos
            </button>
          )}
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo Trámite
          </button>
        </div>
      </div>

      {/* Search & Categories */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar trámite o requisito..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium border outline-none transition-all",
              isDark 
                ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500" 
                : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500"
            )}
          />
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                selectedCategory === 'all'
                  ? "bg-indigo-600 text-white"
                  : isDark ? "bg-slate-900 text-slate-400 hover:text-white" : "bg-white text-slate-600 hover:text-slate-900 border"
              )}
            >
              Todos ({tramites.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white"
                    : isDark ? "bg-slate-900 text-slate-400 hover:text-white" : "bg-white text-slate-600 hover:text-slate-900 border"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400 animate-pulse">
          Cargando catálogo de trámites...
        </div>
      ) : filteredTramites.length === 0 ? (
        <div className={cn(
          "rounded-2xl border p-12 text-center flex flex-col items-center justify-center gap-3",
          isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200"
        )}>
          <div className="p-4 rounded-2xl bg-indigo-600/10 text-indigo-500">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold">No hay trámites configurados</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {searchQuery ? "No se hallaron trámites para la búsqueda." : "Crea tu primer trámite o carga el catálogo sugerido de licencias, bloqueos y CUV."}
          </p>
          <div className="mt-2">
            {tramites.length === 0 ? (
              <button
                onClick={handleLoadPresets}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer"
              >
                Cargar Trámites Sugeridos
              </button>
            ) : (
              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer"
              >
                Registrar Trámite
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTramites.map((item) => {
            const hasPrice = typeof item.pvp === 'number' && item.pvp > 0;
            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all group",
                  isDark ? "bg-slate-900 border-slate-800 hover:border-indigo-500/40" : "bg-white border-slate-200 hover:border-indigo-500/50 shadow-sm"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-1.5">
                        {item.category || 'Trámite'}
                      </span>
                      <h3 className="text-sm font-black tracking-tight leading-snug">{item.name}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Editar Trámite"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Eliminar Trámite"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Requirements */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-black text-[11px] uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Requisitos Necesarios:</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] font-medium leading-relaxed">
                      {item.requirements ? item.requirements : (
                        <span className="italic text-slate-400">Sin requisitos cargados. Se solicita asesoría vía WhatsApp.</span>
                      )}
                    </p>
                  </div>

                  {/* Pricing / Cost Grid */}
                  <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/40 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Tarifa Pública (PVP):</span>
                      {hasPrice ? (
                        <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(item.pvp!)}
                        </strong>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <MessageCircle className="w-3 h-3" />
                          Bajo Cotización / WhatsApp
                        </span>
                      )}
                    </div>

                    {(item.pvpReseller || item.cost) ? (
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                        {item.cost ? <span>Costo: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(item.cost)}</strong></span> : <span />}
                        {item.pvpReseller ? <span>Revendedor: <strong className="text-indigo-400">{formatCurrency(item.pvpReseller)}</strong></span> : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {item.estimatedDelivery || 'Entrega estándar'}
                  </span>
                  {item.supplierName && (
                    <span className="flex items-center gap-1 font-bold text-slate-500 truncate max-w-[120px]">
                      <Users className="w-3 h-3" />
                      {item.supplierName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={cn(
            "w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150",
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          )}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                {editingTramite ? 'Editar Trámite del Catálogo' : 'Registrar Nuevo Trámite'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Nombre del Trámite o Gestión *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Renovación de Licencia, Bloqueo de Vehículo, CUV"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-xs font-semibold outline-none",
                    isDark ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Categoría
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. ANT & Tránsito, Vehicular, Legal"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-xs font-semibold outline-none",
                      isDark ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Tiempo de Entrega / Resolución
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 24 a 48 horas, Mismo día"
                    value={formData.estimatedDelivery}
                    onChange={(e) => setFormData({ ...formData, estimatedDelivery: e.target.value })}
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-xs font-semibold outline-none",
                      isDark ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Requisitos y Documentación Requerida</span>
                  <span className="text-[10px] text-slate-400 font-normal">Si se deja vacío, el portal guiará a pedir informe por WhatsApp</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Cédula escaneada, matrícula vigente, comprobante de pago de especie..."
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-xs font-medium outline-none resize-none",
                    isDark ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                  )}
                />
              </div>

              {/* Prices */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Costo Base ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-xs font-bold outline-none",
                      isDark ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-emerald-600 dark:text-emerald-400">
                    PVP Público ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Vacío = Por WhatsApp"
                    value={formData.pvp}
                    onChange={(e) => setFormData({ ...formData, pvp: e.target.value })}
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-xs font-bold outline-none",
                      isDark ? "bg-slate-950 border-slate-800 text-white focus:border-emerald-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500"
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-indigo-500 dark:text-indigo-400">
                    PVP Revendedor ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.pvpReseller}
                    onChange={(e) => setFormData({ ...formData, pvpReseller: e.target.value })}
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-xs font-bold outline-none",
                      isDark ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Notas u Observaciones Adicionales
                </label>
                <input
                  type="text"
                  placeholder="Ej. Precios no incluyen recargos bancarios o multas pendientes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-xs font-medium outline-none",
                    isDark ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-slate-500 hover:text-slate-700 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  {editingTramite ? 'Guardar Cambios' : 'Registrar Trámite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={cn(
            "w-full max-w-sm rounded-2xl border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center",
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          )}>
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black">{confirmModal.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{confirmModal.message}</p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
