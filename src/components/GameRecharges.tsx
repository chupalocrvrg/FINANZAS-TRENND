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
import { GameRechargeItem, GameRechargePackage, Entity } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { 
  Gamepad2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Sparkles, 
  ShieldAlert, 
  Coins, 
  Layers, 
  Check, 
  X, 
  Users, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Tag
} from 'lucide-react';

const PRESET_GAMES = [
  {
    name: 'Free Fire',
    category: 'Battle Royale',
    requirements: 'ID de Jugador (UID) + Región (Sudamérica / EEUU / Europa) + Nickname',
    instructions: 'Las recargas se acreditan de forma inmediata (3 a 10 min) tras la confirmación de pago.',
    packages: [
      { id: 'p_ff_1', name: '100 + 10 Diamantes', cost: 0.90, pvp: 1.25, pvpReseller: 1.05 },
      { id: 'p_ff_2', name: '310 + 31 Diamantes', cost: 2.70, pvp: 3.50, pvpReseller: 3.00 },
      { id: 'p_ff_3', name: '520 + 52 Diamantes', cost: 4.45, pvp: 5.80, pvpReseller: 4.95 },
      { id: 'p_ff_4', name: 'Pase Semanal Booyah', cost: 1.80, pvp: 2.40, pvpReseller: 2.05 }
    ]
  },
  {
    name: 'Mobile Legends: Bang Bang',
    category: 'MOBA',
    requirements: 'User ID (UID) + Zone ID (entre paréntesis) + Nickname del juego',
    instructions: 'Asegúrate de proporcionar el Zone ID exacto que figura en tu perfil de juego.',
    packages: [
      { id: 'p_ml_1', name: '86 Diamantes', cost: 1.40, pvp: 1.90, pvpReseller: 1.60 },
      { id: 'p_ml_2', name: '172 Diamantes', cost: 2.75, pvp: 3.75, pvpReseller: 3.15 },
      { id: 'p_ml_3', name: '257 Diamantes', cost: 4.10, pvp: 5.50, pvpReseller: 4.65 },
      { id: 'p_ml_4', name: 'Pase del Crepúsculo', cost: 7.50, pvp: 9.99, pvpReseller: 8.50 }
    ]
  },
  {
    name: 'Roblox',
    category: 'Sandbox',
    requirements: 'Nombre de usuario exacto (Username) o Email de cuenta (Sin necesidad de contraseña si es vía Gamepass/Grupo)',
    instructions: 'Disponibles vía método seguro directo o código digital canjeable.',
    packages: [
      { id: 'p_rb_1', name: '80 Robux', cost: 0.95, pvp: 1.40, pvpReseller: 1.15 },
      { id: 'p_rb_2', name: '400 Robux', cost: 4.40, pvp: 5.99, pvpReseller: 5.00 },
      { id: 'p_rb_3', name: '800 Robux', cost: 8.70, pvp: 11.50, pvpReseller: 9.80 }
    ]
  },
  {
    name: 'Call of Duty: Mobile',
    category: 'Shooter',
    requirements: 'Player ID (UID) + Servidor / Región',
    instructions: 'Válido para cuentas vinculadas a Activision / Facebook.',
    packages: [
      { id: 'p_cod_1', name: '80 CP (Puntos COD)', cost: 0.90, pvp: 1.30, pvpReseller: 1.10 },
      { id: 'p_cod_2', name: '420 CP (Puntos COD)', cost: 4.50, pvp: 6.20, pvpReseller: 5.20 },
      { id: 'p_cod_3', name: '880 CP (Pase de Batalla)', cost: 8.90, pvp: 11.90, pvpReseller: 10.10 }
    ]
  }
];

export function GameRecharges() {
  const { user, settings } = useAuth();
  const isDark = settings?.theme === 'dark' || (settings?.theme === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [games, setGames] = useState<GameRechargeItem[]>([]);
  const [suppliers, setSuppliers] = useState<Entity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modal states for Game
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameRechargeItem | null>(null);
  const [gameFormData, setGameFormData] = useState({
    name: '',
    category: 'Battle Royale',
    supplierId: '',
    supplierName: '',
    requirements: '',
    instructions: ''
  });

  // Modal states for Package
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [targetGameForPackage, setTargetGameForPackage] = useState<GameRechargeItem | null>(null);
  const [editingPackage, setEditingPackage] = useState<GameRechargePackage | null>(null);
  const [packageFormData, setPackageFormData] = useState({
    name: '',
    cost: '',
    pvp: '',
    pvpReseller: ''
  });

  // Confirmation Modal
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

  // Real-time listener for Game Recharges Catalog
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'game_recharges_catalog'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      })) as GameRechargeItem[];
      setGames(list.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    }, (err) => {
      console.error('Error fetching game recharges:', err);
      setLoading(false);
    });

    // Fetch suppliers from entities
    const qEnt = query(
      collection(db, 'entities'),
      where('ownerId', '==', user.uid)
    );
    const unsubEnt = onSnapshot(qEnt, (snap) => {
      const ents = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Entity[];
      setSuppliers(ents.filter(e => e.types?.includes('supplier') || e.type === 'supplier'));
    });

    return () => {
      unsubscribe();
      unsubEnt();
    };
  }, [user]);

  // Handle open create/edit game
  const handleOpenGameModal = (game?: GameRechargeItem) => {
    if (game) {
      setEditingGame(game);
      setGameFormData({
        name: game.name,
        category: game.category || 'Battle Royale',
        supplierId: game.supplierId || '',
        supplierName: game.supplierName || '',
        requirements: game.requirements || '',
        instructions: game.instructions || ''
      });
    } else {
      setEditingGame(null);
      setGameFormData({
        name: '',
        category: 'Battle Royale',
        supplierId: '',
        supplierName: '',
        requirements: 'ID de Jugador (UID) + Región/Servidor + Nickname',
        instructions: 'Entrega estimada: 5 a 15 minutos tras verificar el pago.'
      });
    }
    setIsGameModalOpen(true);
  };

  // Save Game
  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !gameFormData.name.trim()) return;

    const supObj = suppliers.find(s => s.id === gameFormData.supplierId);
    const payload = {
      name: gameFormData.name.trim(),
      category: gameFormData.category.trim(),
      supplierId: gameFormData.supplierId || '',
      supplierName: supObj?.name || gameFormData.supplierName || '',
      requirements: gameFormData.requirements.trim(),
      instructions: gameFormData.instructions.trim(),
      ownerId: user.uid,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingGame) {
        await updateDoc(doc(db, 'game_recharges_catalog', editingGame.id), payload);
      } else {
        await addDoc(collection(db, 'game_recharges_catalog'), {
          ...payload,
          packages: [],
          active: true,
          createdAt: new Date().toISOString()
        });
      }
      setIsGameModalOpen(false);
    } catch (err) {
      console.error('Error saving game recharge:', err);
      alert('Error al guardar el juego. Intente nuevamente.');
    }
  };

  // Delete Game
  const handleDeleteGame = (game: GameRechargeItem) => {
    setConfirmModal({
      isOpen: true,
      title: `¿Eliminar juego: ${game.name}?`,
      message: 'Esta acción removerá el juego y todos sus paquetes de recarga asociados del catálogo general y del link público.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'game_recharges_catalog', game.id));
        } catch (err) {
          console.error('Error deleting game:', err);
        }
      }
    });
  };

  // Package Modal Open
  const handleOpenPackageModal = (game: GameRechargeItem, pkg?: GameRechargePackage) => {
    setTargetGameForPackage(game);
    if (pkg) {
      setEditingPackage(pkg);
      setPackageFormData({
        name: pkg.name,
        cost: String(pkg.cost || ''),
        pvp: String(pkg.pvp || ''),
        pvpReseller: String(pkg.pvpReseller || '')
      });
    } else {
      setEditingPackage(null);
      setPackageFormData({
        name: '',
        cost: '',
        pvp: '',
        pvpReseller: ''
      });
    }
    setIsPackageModalOpen(true);
  };

  // Save Package
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGameForPackage || !packageFormData.name.trim()) return;

    const costNum = parseFloat(packageFormData.cost) || 0;
    const pvpNum = parseFloat(packageFormData.pvp) || 0;
    const pvpResellerNum = parseFloat(packageFormData.pvpReseller) || 0;

    const currentPackages = targetGameForPackage.packages || [];
    let updatedPackages: GameRechargePackage[] = [];

    if (editingPackage) {
      updatedPackages = currentPackages.map(p => {
        if (p.id === editingPackage.id) {
          return {
            ...p,
            name: packageFormData.name.trim(),
            cost: costNum,
            pvp: pvpNum,
            pvpReseller: pvpResellerNum
          };
        }
        return p;
      });
    } else {
      const newPkg: GameRechargePackage = {
        id: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: packageFormData.name.trim(),
        cost: costNum,
        pvp: pvpNum,
        pvpReseller: pvpResellerNum
      };
      updatedPackages = [...currentPackages, newPkg];
    }

    try {
      await updateDoc(doc(db, 'game_recharges_catalog', targetGameForPackage.id), {
        packages: updatedPackages,
        updatedAt: new Date().toISOString()
      });
      setIsPackageModalOpen(false);
    } catch (err) {
      console.error('Error saving package:', err);
      alert('Error al guardar el paquete. Intente de nuevo.');
    }
  };

  // Delete Package
  const handleDeletePackage = (game: GameRechargeItem, pkgId: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar paquete de recarga?',
      message: 'Se eliminará esta denominación de precio del juego.',
      onConfirm: async () => {
        try {
          const updatedPackages = (game.packages || []).filter(p => p.id !== pkgId);
          await updateDoc(doc(db, 'game_recharges_catalog', game.id), {
            packages: updatedPackages,
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
          console.error('Error deleting package:', err);
        }
      }
    });
  };

  // Load Presets
  const handleLoadPresets = async () => {
    if (!user) return;
    setConfirmModal({
      isOpen: true,
      title: '¿Cargar catálogo de juegos sugeridos?',
      message: 'Se agregarán automáticamente títulos populares (Free Fire, Mobile Legends, Roblox, Call of Duty) con sus requisitos y paquetes de recarga iniciales.',
      onConfirm: async () => {
        try {
          for (const preset of PRESET_GAMES) {
            await addDoc(collection(db, 'game_recharges_catalog'), {
              name: preset.name,
              category: preset.category,
              requirements: preset.requirements,
              instructions: preset.instructions,
              packages: preset.packages,
              ownerId: user.uid,
              active: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error('Error adding presets:', err);
        }
      }
    });
  };

  // Filtering
  const categories = Array.from(new Set(games.map(g => g.category).filter(Boolean)));
  const filteredGames = games.filter(g => {
    const matchesCategory = selectedCategory === 'all' || g.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() || 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.requirements?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.packages?.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className={cn("p-4 lg:p-8 min-h-screen space-y-6", isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900")}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tight flex items-center gap-2">
                Catálogo de Recarga de Juegos
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-600 text-white font-bold">
                  {games.length} {games.length === 1 ? 'juego' : 'juegos'}
                </span>
              </h1>
              <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">
                Administre los videojuegos, requisitos de recarga (UID, Región, Nickname), proveedores y múltiples paquetes con precios PVP y Revendedor.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {games.length === 0 && (
            <button
              onClick={handleLoadPresets}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Cargar Juegos Populares
            </button>
          )}

          <button
            onClick={() => handleOpenGameModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo Juego
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por juego, requisito o paquete..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium border outline-none transition-all",
              isDark 
                ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:border-violet-500" 
                : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-500"
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
                  ? "bg-violet-600 text-white"
                  : isDark ? "bg-slate-900 text-slate-400 hover:text-white" : "bg-white text-slate-600 hover:text-slate-900 border"
              )}
            >
              Todos ({games.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                  selectedCategory === cat
                    ? "bg-violet-600 text-white"
                    : isDark ? "bg-slate-900 text-slate-400 hover:text-white" : "bg-white text-slate-600 hover:text-slate-900 border"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="py-20 text-center text-sm font-semibold text-slate-400 animate-pulse">
          Cargando catálogo de recargas de juegos...
        </div>
      ) : filteredGames.length === 0 ? (
        <div className={cn(
          "rounded-2xl border p-12 text-center flex flex-col items-center justify-center gap-3",
          isDark ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"
        )}>
          <div className="p-4 rounded-2xl bg-violet-600/10 text-violet-500">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold">No hay juegos en esta categoría</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {searchQuery ? "No se encontraron coincidencias para la búsqueda actual." : "Comienza agregando un videojuego o carga la plantilla sugerida con Free Fire, Mobile Legends y Roblox."}
          </p>
          <div className="flex gap-2 mt-2">
            {games.length === 0 ? (
              <button
                onClick={handleLoadPresets}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all cursor-pointer"
              >
                Cargar Plantilla Sugerida
              </button>
            ) : (
              <button
                onClick={() => handleOpenGameModal()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all cursor-pointer"
              >
                Agregar Juego
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredGames.map((game) => {
            const pkgs = game.packages || [];
            return (
              <div
                key={game.id}
                className={cn(
                  "rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group",
                  isDark ? "bg-slate-900 border-slate-800 hover:border-violet-500/40" : "bg-white border-slate-200 hover:border-violet-500/50 shadow-sm"
                )}
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                        <Gamepad2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black tracking-tight">{game.name}</h3>
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {game.category || 'Videojuego'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenGameModal(game)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Editar Juego"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGame(game)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Eliminar Juego"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Requirements Box */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black text-[11px] uppercase tracking-wider">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Requisitos de Recarga:</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] font-medium leading-relaxed">
                      {game.requirements || 'No especificados.'}
                    </p>
                  </div>

                  {/* Supplier info if assigned */}
                  {game.supplierName && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-violet-500" />
                        Proveedor asignado:
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {game.supplierName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Packages Section */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        Paquetes ({pkgs.length})
                      </span>
                      <button
                        onClick={() => handleOpenPackageModal(game)}
                        className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Añadir Paquete
                      </button>
                    </div>

                    {pkgs.length === 0 ? (
                      <div className="py-6 text-center border border-dashed rounded-xl border-slate-200 dark:border-slate-800 text-xs text-slate-400 space-y-1">
                        <p>No hay paquetes configurados para este juego.</p>
                        <button
                          onClick={() => handleOpenPackageModal(game)}
                          className="font-bold text-violet-500 underline"
                        >
                          Crear primer paquete
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {pkgs.map((pkg) => {
                          const margin = pkg.pvp > 0 && pkg.cost > 0 ? pkg.pvp - pkg.cost : 0;
                          return (
                            <div
                              key={pkg.id}
                              className={cn(
                                "p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 group/pkg transition-all",
                                isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50/90 border-slate-200"
                              )}
                            >
                              <div className="space-y-0.5 flex-1 min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white truncate">
                                  {pkg.name}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                                  <span>Costo: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(pkg.cost)}</strong></span>
                                  <span>•</span>
                                  <span>PVP: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(pkg.pvp)}</strong></span>
                                  {pkg.pvpReseller > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>Revendedor: <strong className="text-indigo-500 dark:text-indigo-400">{formatCurrency(pkg.pvpReseller)}</strong></span>
                                    </>
                                  )}
                                  {margin > 0 && (
                                    <span className="ml-auto text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-1 rounded">
                                      +{formatCurrency(margin)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover/pkg:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleOpenPackageModal(game, pkg)}
                                  className="p-1 text-slate-400 hover:text-violet-500 rounded cursor-pointer"
                                  title="Editar Paquete"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePackage(game, pkg.id)}
                                  className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                                  title="Eliminar Paquete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card Footer info */}
                  {game.instructions && (
                    <div className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{game.instructions}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GAME CREATE/EDIT MODAL */}
      {isGameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={cn(
            "w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150",
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          )}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-violet-500" />
                {editingGame ? 'Editar Videojuego' : 'Registrar Nuevo Videojuego'}
              </h3>
              <button 
                onClick={() => setIsGameModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGame} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Nombre del Juego *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Free Fire, Mobile Legends, Roblox"
                  value={gameFormData.name}
                  onChange={(e) => setGameFormData({ ...gameFormData, name: e.target.value })}
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-xs font-semibold outline-none",
                    isDark ? "bg-slate-950 border-slate-800 text-white focus:border-violet-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500"
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Categoría / Género
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Battle Royale, MOBA, Sandbox"
                    value={gameFormData.category}
                    onChange={(e) => setGameFormData({ ...gameFormData, category: e.target.value })}
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-xs font-semibold outline-none",
                      isDark ? "bg-slate-950 border-slate-800 text-white focus:border-violet-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500"
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Proveedor (Opcional)
                  </label>
                  <select
                    value={gameFormData.supplierId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const sup = suppliers.find(s => s.id === selId);
                      setGameFormData({
                        ...gameFormData,
                        supplierId: selId,
                        supplierName: sup?.name || ''
                      });
                    }}
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-xs font-semibold outline-none",
                      isDark ? "bg-slate-950 border-slate-800 text-white focus:border-violet-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500"
                    )}
                  >
                    <option value="">-- Sin proveedor vinculado --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Requisitos que debe proporcionar el cliente *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Se mostrarán en el portal web</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ej. ID de Jugador (UID) + Región (Sudamérica) + Nickname de la cuenta"
                  value={gameFormData.requirements}
                  onChange={(e) => setGameFormData({ ...gameFormData, requirements: e.target.value })}
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-xs font-medium outline-none resize-none",
                    isDark ? "bg-slate-950 border-slate-800 text-white focus:border-violet-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500"
                  )}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Instrucciones o Tiempo de Entrega
                </label>
                <input
                  type="text"
                  placeholder="Ej. Entrega inmediata en 5 a 15 minutos una vez confirmado el comprobante."
                  value={gameFormData.instructions}
                  onChange={(e) => setGameFormData({ ...gameFormData, instructions: e.target.value })}
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-xs font-medium outline-none",
                    isDark ? "bg-slate-950 border-slate-800 text-white focus:border-violet-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500"
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGameModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-slate-500 hover:text-slate-700 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold cursor-pointer"
                >
                  {editingGame ? 'Guardar Cambios' : 'Registrar Videojuego'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PACKAGE CREATE/EDIT MODAL */}
      {isPackageModalOpen && targetGameForPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={cn(
            "w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150",
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          )}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  {editingPackage ? 'Editar Paquete' : 'Nuevo Paquete de Recarga'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Para el juego: <strong className="text-violet-400">{targetGameForPackage.name}</strong>
                </p>
              </div>
              <button 
                onClick={() => setIsPackageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Nombre del Paquete o Denominación *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 100 + 10 Diamantes, 310 Diamantes, Pase Semanal"
                  value={packageFormData.name}
                  onChange={(e) => setPackageFormData({ ...packageFormData, name: e.target.value })}
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-xs font-semibold outline-none",
                    isDark ? "bg-slate-950 border-slate-800 text-white focus:border-violet-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500"
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Costo ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={packageFormData.cost}
                    onChange={(e) => setPackageFormData({ ...packageFormData, cost: e.target.value })}
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-xs font-bold outline-none",
                      isDark ? "bg-slate-950 border-slate-800 text-white focus:border-violet-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-violet-500"
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-emerald-600 dark:text-emerald-400">
                    PVP Público ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={packageFormData.pvp}
                    onChange={(e) => setPackageFormData({ ...packageFormData, pvp: e.target.value })}
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
                    value={packageFormData.pvpReseller}
                    onChange={(e) => setPackageFormData({ ...packageFormData, pvpReseller: e.target.value })}
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-xs font-bold outline-none",
                      isDark ? "bg-slate-950 border-slate-800 text-white focus:border-indigo-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
                    )}
                  />
                </div>
              </div>

              {/* Profit Preview */}
              {parseFloat(packageFormData.pvp) > 0 && parseFloat(packageFormData.cost) > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Ganancia estimada (PVP):
                  </span>
                  <strong className="font-black">
                    +{formatCurrency(parseFloat(packageFormData.pvp) - parseFloat(packageFormData.cost))}
                  </strong>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-slate-500 hover:text-slate-700 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold cursor-pointer"
                >
                  {editingPackage ? 'Actualizar Paquete' : 'Guardar Paquete'}
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
