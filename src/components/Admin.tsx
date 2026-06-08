import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { 
  Users, 
  Shield, 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowRightLeft, 
  Check, 
  X, 
  Search, 
  UserPlus, 
  Building2, 
  Mail, 
  Phone, 
  FileText, 
  Clock, 
  UserCheck, 
  ShieldCheck,
  LogOut, 
  AlertCircle,
  HelpCircle,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminUserProfile {
  uid: string;
  email: string;
  displayName: string;
  companyName: string;
  language: 'es' | 'en';
  theme: 'light' | 'dark' | 'system';
  securityPin: string;
  ruc: string;
  phone: string;
  referral: string;
  isOnboarded: boolean;
  updatedAt: string;
}

export function Admin() {
  const { user, impersonatedUser, impersonateUser } = useAuth();
  const [usersList, setUsersList] = useState<AdminUserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserProfile | null>(null);
  
  // Forms state
  const [formEmail, setFormEmail] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formRuc, setFormRuc] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPin, setFormPin] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch all registered users
  useEffect(() => {
    setLoadingUsers(true);
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const list: AdminUserProfile[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as AdminUserProfile);
      });
      // Sort users by updatedAt or displayName
      list.sort((a, b) => b.updatedAt?.localeCompare(a.updatedAt || '') || a.displayName?.localeCompare(b.displayName || ''));
      setUsersList(list);
      setLoadingUsers(false);
    }, (error) => {
      console.error("Error fetching admin users list:", error);
      setErrorMsg("Error al cargar los usuarios. Verifica las reglas de seguridad.");
      setLoadingUsers(false);
    });

    return () => unsubscribe();
  }, []);

  const clearForm = () => {
    setFormEmail('');
    setFormDisplayName('');
    setFormCompanyName('');
    setFormRuc('');
    setFormPhone('');
    setFormPin('');
    setErrorMsg('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formEmail || !formDisplayName) {
      setErrorMsg('El Correo y Nombre Completo son requeridos.');
      return;
    }

    // Generate a unique client-side pseudo-UID
    const generatedUid = 'usr_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);

    const newUserPayload: AdminUserProfile = {
      uid: generatedUid,
      email: formEmail.trim().toLowerCase(),
      displayName: formDisplayName.trim(),
      companyName: formCompanyName.trim(),
      language: 'es',
      theme: 'system',
      securityPin: formPin.trim() || '1234',
      ruc: formRuc.trim(),
      phone: formPhone.trim(),
      referral: 'administrador',
      isOnboarded: true,
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', generatedUid), newUserPayload);
      setSuccessMsg(`Usuario "${formDisplayName}" registrado exitosamente.`);
      setIsCreateModalOpen(false);
      clearForm();
    } catch (err: any) {
      console.error("Failed to create user:", err);
      setErrorMsg(`Error al guardar: ${err.message || err}`);
    }
  };

  const handleEditUser = (u: AdminUserProfile) => {
    setEditingUser(u);
    setFormEmail(u.email);
    setFormDisplayName(u.displayName);
    setFormCompanyName(u.companyName || '');
    setFormRuc(u.ruc || '');
    setFormPhone(u.phone || '');
    setFormPin(u.securityPin || '');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const userRef = doc(db, 'users', editingUser.uid);
      await updateDoc(userRef, {
        email: formEmail.trim().toLowerCase(),
        displayName: formDisplayName.trim(),
        companyName: formCompanyName.trim(),
        ruc: formRuc.trim(),
        phone: formPhone.trim(),
        securityPin: formPin.trim(),
        updatedAt: new Date().toISOString(),
      });
      setSuccessMsg(`Cuenta "${formDisplayName}" actualizada exitosamente.`);
      setEditingUser(null);
      clearForm();
    } catch (err: any) {
      console.error("Failed to update user:", err);
      setErrorMsg(`Error al actualizar: ${err.message || err}`);
    }
  };

  const handleDeleteUser = async (u: AdminUserProfile) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la cuenta de "${u.displayName}"?\nEsta acción no se puede deshacer.`)) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await deleteDoc(doc(db, 'users', u.uid));
      setSuccessMsg(`Cuenta "${u.displayName}" eliminada correctamente.`);
      
      // If we are currently impersonating this deleted user, clear impersonation
      if (impersonatedUser?.uid === u.uid) {
        impersonateUser(null);
      }
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      setErrorMsg(`Error al eliminar: ${err.message || err}`);
    }
  };

  const handleImpersonate = (u: AdminUserProfile) => {
    impersonateUser({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName
    });
    setSuccessMsg(`Ahora interactúas como "${u.displayName}".`);
  };

  // Filter list
  const filteredUsers = usersList.filter(u => {
    const text = `${u.displayName} ${u.email} ${u.companyName} ${u.ruc} ${u.phone || ''}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6" id="super-admin-root">
      
      {/* Title & Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-indigo-500" />
            <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">
              Módulo de Super-Administración
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Cuentas Registradas al Proyecto</h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestión completa de perfiles, credenciales, y acceso directo a datos sin requerir Google Auth.
          </p>
        </div>

        <button
          onClick={() => { clearForm(); setIsCreateModalOpen(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Registrar Nueva Cuenta
        </button>
      </div>

      {/* Messaging banner */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-3 text-sm animate-fade-in">
          <Check className="w-5 h-5 shrink-0 text-emerald-500" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-3 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-5 bg-slate-900 border border-slate-800/80 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">{usersList.length}</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cuentas Prototipo</div>
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800/80 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {usersList.filter(u => u.isOnboarded).length}
            </div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Completó Onboarding</div>
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800/80 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {impersonatedUser ? "Activo" : "Ninguna"}
            </div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Sesión Simulada</div>
          </div>
        </div>
      </div>

      {/* Search & List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6">
        <div className="flex flex-col md:flex-row items-center gap-4 justify-between mb-6 pb-6 border-b border-slate-800/60">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Directorio de Clientes</h3>
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Buscar por nombre, correo, empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
          </div>
        </div>

        {loadingUsers ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Cargando directorio de cuentas...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-medium">
            No se encontraron cuentas registradas coincidentes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                  <th className="py-3 px-4">Usuario / Empresa</th>
                  <th className="py-3 px-4">Correo Electrónico</th>
                  <th className="py-3 px-4">RUC / Cédula</th>
                  <th className="py-3 px-4">PIN Acceso</th>
                  <th className="py-3 px-4">Último Cambio</th>
                  <th className="py-3 px-4 text-right">Acciones de Sistema</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {filteredUsers.map((u) => {
                  const isCurrentImpersonated = impersonatedUser?.uid === u.uid;
                  return (
                    <tr 
                      key={u.uid} 
                      className={`hover:bg-slate-850/40 transition-colors ${isCurrentImpersonated ? 'bg-indigo-950/20' : ''}`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold uppercase shrink-0">
                            {u.displayName?.substring(0, 2) || 'US'}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              {u.displayName}
                              {isCurrentImpersonated && (
                                <span className="text-[9px] font-black uppercase bg-indigo-600 text-white px-1.5 py-0.5 rounded-md tracking-wider">
                                  Activo
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              {u.companyName || 'Sin Razón Social'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          {u.email}
                        </div>
                        {u.phone && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3  h-3 text-slate-500" /> {u.phone}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-400">
                        {u.ruc || 'No Configurado'}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-indigo-400">
                        {u.securityPin || '1234'}
                      </td>
                      <td className="py-4 px-4 text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {u.updatedAt ? new Date(u.updatedAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Impersonation button */}
                          <button
                            onClick={() => handleImpersonate(u)}
                            title="Entrar a esta cuenta"
                            className={`flex items-center gap-1.5 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all border ${
                              isCurrentImpersonated 
                                ? 'bg-emerald-600 text-white border-emerald-500 cursor-default'
                                : 'bg-slate-950 text-indigo-400 border-indigo-500/20 hover:border-indigo-500/80 hover:bg-indigo-600/10 cursor-pointer'
                            }`}
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            {isCurrentImpersonated ? 'Interactuando' : 'Acceder'}
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => handleEditUser(u)}
                            title="Editar Datos"
                            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            title="Eliminar Cuenta"
                            className="p-1.5 rounded-lg bg-slate-950 border border-rose-950/40 text-rose-500 hover:text-white hover:bg-rose-600/50 hover:border-rose-500 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="create-modal">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-md font-bold text-white">Registrar nueva cuenta</h3>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1.5">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="Ej. Marcelo Gutama"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1.5">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Ej. marcelo@empresa.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1.5 font-bold">Razón Social / Empresa</label>
                  <input
                    type="text"
                    value={formCompanyName}
                    onChange={(e) => setFormCompanyName(e.target.value)}
                    placeholder="Ej. Comercial Trennd S.A."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1.5 font-bold">RUC / Cédula</label>
                    <input
                      type="text"
                      value={formRuc}
                      onChange={(e) => setFormRuc(e.target.value)}
                      placeholder="Ej. 1723456789001"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1.5 font-bold">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="Ej. +593987654321"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1.5 flex items-center gap-1 font-bold">
                    PIN de Seguridad
                    <span className="text-[9px] text-slate-500 normal-case font-normal">(Para desbloqueo de pantalla: p. ej. 1234)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-800 mt-6">
                  <button
                    type="button"
                    onClick={() => { setIsCreateModalOpen(false); clearForm(); }}
                    className="text-xs font-bold text-slate-400 hover:text-white px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Registrar Cuenta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="edit-modal">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-5">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-md font-bold text-white">Editar datos de cuenta</h3>
                </div>
                <button 
                  onClick={() => setEditingUser(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg animate-fade-in"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1.5">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1.5">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1.5">Razón Social / Empresa</label>
                  <input
                    type="text"
                    value={formCompanyName}
                    onChange={(e) => setFormCompanyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1.5">RUC / Cédula</label>
                    <input
                      type="text"
                      value={formRuc}
                      onChange={(e) => setFormRuc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1.5">Teléfono</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1.5">PIN de Seguridad (Desbloqueo)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-800 mt-6">
                  <button
                    type="button"
                    onClick={() => { setEditingUser(null); clearForm(); }}
                    className="text-xs font-bold text-slate-400 hover:text-white px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
