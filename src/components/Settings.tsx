import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { logout, db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Settings as SettingsIcon, Globe, Palette, Shield, LogOut, Smartphone, Building2, Plus, Trash2, X, Save, Edit2, Loader2, CreditCard, Info, CheckCircle, HelpCircle, ShieldCheck, User, Languages, Type, Upload, CheckCircle2 as Check, Database, Download, Sparkles, Key, ChevronLeft, ChevronRight, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { Wallet } from '../types';
import { SYSTEM_UPDATES } from '../data/updates';
import { ConfirmModal } from './ConfirmModal';
import * as XLSX from 'xlsx';

// Helper to convert raw credentials to string database storage
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function Settings() {
  const { user, settings, updateSettings } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletForm, setWalletForm] = useState({ id: '', name: '', type: 'bank', balance: '0', totalLimit: '0' });
  const [showRegisteredWallets, setShowRegisteredWallets] = useState(false);
  const [showRegisteredCards, setShowRegisteredCards] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoTab, setInfoTab] = useState<'history' | 'features' | 'support'>('history');
  const [localApiKey, setLocalApiKey] = useState(() => localStorage.getItem('LOCAL_GEMINI_API_KEY') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeGuide, setActiveGuide] = useState(0);
  const isDark = settings?.theme === 'dark';

  // Cascading/collapsible accordion states for Privacy & Security
  const [isIdentityExpanded, setIsIdentityExpanded] = useState(false);
  const [isSecurityExpanded, setIsSecurityExpanded] = useState(false);
  const [isAssistantExpanded, setIsAssistantExpanded] = useState(false);
  const [isPurgeExpanded, setIsPurgeExpanded] = useState(false);
  const [isBackupExpanded, setIsBackupExpanded] = useState(false);

  // Modular personalization visual toggle
  const [showPersonalizationModule, setShowPersonalizationModule] = useState(() => localStorage.getItem('SHOW_PERSONALIZATION_MODULE') === 'true');

  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgePinInput, setPurgePinInput] = useState('');
  const [purgeError, setPurgeError] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);

  // Backup / Restore states
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importFeedback, setImportFeedback] = useState({ success: false, text: '' });

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

  const handleOpenPurgeModal = () => {
    if (!settings?.securityPin || settings.securityPin.trim().length !== 4) {
      window.alert("Por favor, configure primero su PIN de seguridad de 4 dígitos en la sección 'Núcleo de Seguridad y Bloqueo' para poder habilitar el borrado de datos.");
      return;
    }
    setPurgePinInput('');
    setPurgeError('');
    setPurgeSuccess(false);
    setIsPurgeModalOpen(true);
  };

  const executeDataPurge = async () => {
    if (purgePinInput !== settings?.securityPin) {
      setPurgeError('El PIN de seguridad de confirmación ingresado es incorrecto.');
      return;
    }

    if (!user) return;

    setIsPurging(true);
    setPurgeError('');

    try {
      const batchDeleter = async (collectionName: string) => {
        const qSnap = await getDocs(query(collection(db, collectionName), where('ownerId', '==', user.uid)));
        const deletePromises = qSnap.docs.map(async (docRef) => {
          if (collectionName === 'digital_services') {
            const histSnap = await getDocs(collection(db, 'digital_services', docRef.id, 'service_history'));
            const subPromises = histSnap.docs.map(hDoc => deleteDoc(doc(db, 'digital_services', docRef.id, 'service_history', hDoc.id)));
            await Promise.all(subPromises);
          }
          await deleteDoc(doc(db, collectionName, docRef.id));
        });
        await Promise.all(deletePromises);
      };

      await batchDeleter('wallets');
      await batchDeleter('entities');
      await batchDeleter('transactions');
      await batchDeleter('ledger');
      await batchDeleter('digital_catalog');
      await batchDeleter('digital_services');

      setPurgeSuccess(true);
      setTimeout(() => {
        setIsPurgeModalOpen(false);
        setPurgeSuccess(false);
        setPurgePinInput('');
      }, 3500);

    } catch (err: any) {
      console.error("Error al purgar los datos:", err);
      setPurgeError("Ocurrió un error al purgar la información: " + (err.message || err));
    } finally {
      setIsPurging(false);
    }
  };

  // Export backup file handler
  const handleExportData = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const collectionsToExport = ['wallets', 'entities', 'transactions', 'ledger', 'digital_catalog', 'digital_services'];
      const exportedData: Record<string, any[]> = {};

      for (const colName of collectionsToExport) {
        const qSnap = await getDocs(query(collection(db, colName), where('ownerId', '==', user.uid)));
        exportedData[colName] = qSnap.docs.map(docRef => ({
          id: docRef.id,
          ...docRef.data()
        }));
      }

      const backupObj = {
        version: "v3.0.4_full",
        exportedAt: new Date().toISOString(),
        ownerId: user.uid,
        data: exportedData
      };

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Copia_Seguridad_ControlFinanciero_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error exporting backup:", err);
      alert("Error al exportar la copia de seguridad: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Export backup excel file handler
  const handleExportExcel = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const collectionsToExport = ['wallets', 'entities', 'transactions', 'ledger', 'digital_catalog', 'digital_services'];
      const exportedData: Record<string, any[]> = {};

      for (const colName of collectionsToExport) {
        const qSnap = await getDocs(query(collection(db, colName), where('ownerId', '==', user.uid)));
        exportedData[colName] = qSnap.docs.map(docRef => ({
          id: docRef.id,
          ...docRef.data()
        }));
      }

      const wb = XLSX.utils.book_new();

      for (const colName of collectionsToExport) {
        const items = exportedData[colName] || [];
        // Flatten nested structures to string for readability in xlsx
        const rows = items.map(item => {
          const flatItem: Record<string, any> = {};
          for (const [key, val] of Object.entries(item)) {
            if (val && typeof val === 'object') {
              flatItem[key] = JSON.stringify(val);
            } else {
              flatItem[key] = val;
            }
          }
          return flatItem;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, colName.substring(0, 31));
      }

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
      const s2ab = (s: string) => {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
      };

      const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Copia_Seguridad_ControlFinanciero_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error exporting excel backup:", err);
      alert("Error al exportar la copia de seguridad en Excel: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Import backup file handler
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    setImportStatus('Leyendo archivo de copia de seguridad...');
    setImportFeedback({ success: false, text: '' });

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const reader = new FileReader();

    if (isExcel) {
      reader.onload = async (event) => {
        try {
          const data = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
          const dataObj: Record<string, any[]> = {};
          const collectionsToImport = ['wallets', 'entities', 'transactions', 'ledger', 'digital_catalog', 'digital_services'];

          for (const sheetName of workbook.SheetNames) {
            const matchedCol = collectionsToImport.find(c => c.toLowerCase() === sheetName.toLowerCase());
            if (matchedCol) {
              const sheet = workbook.Sheets[sheetName];
              const rows: any[] = XLSX.utils.sheet_to_json(sheet);
              dataObj[matchedCol] = rows.map((row: any) => {
                const parsedRow: Record<string, any> = {};
                for (const [key, val] of Object.entries(row)) {
                  if (typeof val === 'string' && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
                    try {
                      parsedRow[key] = JSON.parse(val);
                    } catch {
                      parsedRow[key] = val;
                    }
                  } else {
                    parsedRow[key] = val;
                  }
                }
                return parsedRow;
              });
            }
          }

          let importedTotal = 0;
          for (const colName of collectionsToImport) {
            const items = dataObj[colName];
            if (Array.isArray(items)) {
              setImportStatus(`Importando '${colName}' (${items.length} registros desde Excel)...`);
              for (const item of items) {
                const { id, ...itemData } = item;
                if (id) {
                  itemData.ownerId = user.uid;
                  await setDoc(doc(db, colName, id), itemData);
                  importedTotal++;
                }
              }
            }
          }

          setImportFeedback({
            success: true,
            text: `¡Restauración Excel Completada Con Éxito! Se cargaron ${importedTotal} registros desde las hojas de cálculo.`
          });
          setImportStatus('');
        } catch (err: any) {
          console.error("Error importing Excel file:", err);
          setImportFeedback({
            success: false,
            text: "Fallo de restauración Excel: " + (err.message || "No se pudo leer el archivo Excel.")
          });
          setImportStatus('');
        } finally {
          setIsImporting(false);
          e.target.value = '';
        }
      };

      reader.onerror = () => {
        setImportFeedback({ success: false, text: "No se pudo leer el archivo Excel seleccionado." });
        setIsImporting(false);
        setImportStatus('');
      };

      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (!parsed.data || typeof parsed.data !== 'object') {
            throw new Error("El formato del archivo no contiene la estructura de datos obligatorios.");
          }

          const dataObj = parsed.data;
          const collectionsToImport = ['wallets', 'entities', 'transactions', 'ledger', 'digital_catalog', 'digital_services'];
          let importedTotal = 0;

          for (const colName of collectionsToImport) {
            const items = dataObj[colName];
            if (Array.isArray(items)) {
              setImportStatus(`Importando '${colName}' (${items.length} registros)...`);
              for (const item of items) {
                const { id, ...itemData } = item;
                if (id) {
                  itemData.ownerId = user.uid;
                  await setDoc(doc(db, colName, id), itemData);
                  importedTotal++;
                }
              }
            }
          }

          setImportFeedback({
            success: true,
            text: `¡Restauración Completada Exitosamente! Se cargaron ${importedTotal} registros correctamente en su base de datos comercial.`
          });
          setImportStatus('');
        } catch (err: any) {
          console.error("Error importing backup file:", err);
          setImportFeedback({
            success: false,
            text: "Fallo de restauración: " + (err.message || "Estructura corrupta o incompatible.")
          });
          setImportStatus('');
        } finally {
          setIsImporting(false);
          e.target.value = '';
        }
      };

      reader.onerror = () => {
        setImportFeedback({ success: false, text: "No se pudo leer el archivo seleccionado." });
        setIsImporting(false);
        setImportStatus('');
      };

      reader.readAsText(file);
    }
  };

  const toggleFeature = async (featureId: string) => {
    const currentDisabled = settings?.disabledFeatures || [];
    let updatedDisabled: string[];
    if (currentDisabled.includes(featureId)) {
      updatedDisabled = currentDisabled.filter(id => id !== featureId);
    } else {
      updatedDisabled = [...currentDisabled, featureId];
    }
    try {
      await updateSettings({ disabledFeatures: updatedDisabled });
    } catch (err) {
      console.error("Error updating features:", err);
    }
  };

  const handleSaveAssistantKey = (keyVal: string) => {
    const cleanKey = keyVal.trim();
    localStorage.setItem('LOCAL_GEMINI_API_KEY', cleanKey);
    setLocalApiKey(cleanKey);
    window.dispatchEvent(new Event('local-api-key-updated'));
  };

  const handleClearAssistantKey = () => {
    localStorage.removeItem('LOCAL_GEMINI_API_KEY');
    setLocalApiKey('');
    window.dispatchEvent(new Event('local-api-key-updated'));
  };

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'wallets'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setWallets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallet)));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const handleSync = () => {
      setLocalApiKey(localStorage.getItem('LOCAL_GEMINI_API_KEY') || '');
    };
    window.addEventListener('local-api-key-updated', handleSync);
    return () => {
      window.removeEventListener('local-api-key-updated', handleSync);
    };
  }, []);

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const walletData = {
        name: walletForm.name,
        type: walletForm.type,
        balance: parseFloat(walletForm.balance) || 0,
        totalLimit: walletForm.type === 'credit_card' ? (parseFloat(walletForm.totalLimit) || 0) : 0,
        ownerId: user.uid
      };

      if (walletForm.id) {
        // Modo Edicion
        await updateDoc(doc(db, 'wallets', walletForm.id), walletData);
      } else {
        // Modo Creacion
        await addDoc(collection(db, 'wallets'), walletData);
      }
      
      setIsWalletModalOpen(false);
      resetWalletForm();
    } catch (e) {
      console.error(e);
      window.alert("Error al guardar la cuenta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWalletForm = () => {
    setWalletForm({ id: '', name: '', type: 'bank', balance: '0', totalLimit: '0' });
  };

  const handleEditWallet = (wallet: any) => {
    if (!wallet) return;
    setWalletForm({
      id: wallet.id || '',
      name: wallet.name || '',
      type: wallet.type || 'bank',
      balance: (wallet.balance !== undefined && wallet.balance !== null ? wallet.balance : 0).toString(),
      totalLimit: (wallet.totalLimit !== undefined && wallet.totalLimit !== null ? wallet.totalLimit : 0).toString()
    });
    setIsWalletModalOpen(true);
  };

  const handleDeleteWallet = (id: string) => {
    if (!id) return;
    const walletName = wallets.find(w => w.id === id)?.name || "esta billetera";
    triggerConfirm(
      `¿Eliminar cuenta: ${walletName}?`,
      "¿Está seguro de que desea eliminar permanentemente esta billetera o tarjeta? Los saldos y transacciones quedarán sin billetera de referencia, lo cual puede descuadrar su tesorería general.",
      async () => {
        try {
          await deleteDoc(doc(db, 'wallets', id));
        } catch (err) {
          console.error("Error al eliminar la cuenta:", err);
        }
      }
    );
  };

  const handleSettingClick = async (field: string, value: any) => {
    if (field === 'biometricEnabled' && value === true) {
      try {
        if (typeof navigator === 'undefined' || !navigator.credentials || !window.PublicKeyCredential) {
          console.error("Este dispositivo o navegador no admite claves biométricas (WebAuthn).");
          return;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const userId = new TextEncoder().encode(user?.uid || 'user_settings');

        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
          challenge: challenge,
          rp: {
            name: settings?.companyName || "Control Financiero",
            id: window.location.hostname,
          },
          user: {
            id: userId,
            name: (settings?.displayName || "user").trim().toLowerCase().replace(/\s+/g, '_') + "@trennd.store",
            displayName: settings?.displayName || "Usuario",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" }
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "required",
            requireResidentKey: true,
          },
          timeout: 60000,
          attestation: "none"
        };

        const credential = await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions
        }) as PublicKeyCredential | null;

        if (!credential) {
          throw new Error("El sensor biométrico no retornó una credencial válida.");
        }

        const b64Id = arrayBufferToBase64(credential.rawId);
        await updateSettings({
          biometricEnabled: true,
          biometricCredentialId: b64Id
        });
        window.alert("¡Biometría registrada y activada correctamente!");

      } catch (err: any) {
        console.warn("Error registering biometric from settings:", err);
        let msg = "No se pudo registrar la biometría. ";
        if (err.name === 'NotAllowedError') {
          msg += "El proceso fue cancelado por el usuario.";
        } else {
          msg += err.message || "";
        }
        window.alert(msg);
      }
    } else if (field === 'biometricEnabled' && value === false) {
      await updateSettings({
        biometricEnabled: false,
        biometricCredentialId: ''
      });
      window.alert("Biometría desactivada correctamente.");
    } else {
      await updateSettings({ [field]: value });
    }
  };

  return (
    <div className={cn("p-8 max-w-4xl mx-auto pb-24 text-left", isDark ? "text-slate-100" : "text-slate-900")}>
      <div className="mb-12">
        <h1 className={cn("text-3xl font-bold tracking-tight flex items-center gap-3", isDark ? "text-white" : "text-slate-800")}>
          <SettingsIcon className="w-8 h-8 text-indigo-500" />
          Configuración del Sistema
        </h1>
        <p className="text-slate-500 font-medium">Gestione sus preferencias arquitectónicas y cuentas bancarias.</p>
      </div>

      <div className="space-y-12">
        {/* WALLETS SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between border-b border-indigo-100/20 pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-extrabold">Cuentas Bancarias y Billeteras</h2>
            </div>
            <button 
              onClick={() => { resetWalletForm(); setIsWalletModalOpen(true); }}
              className="text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-950/80 flex items-center gap-1 transition-colors cursor-pointer border border-indigo-500/20"
            >
              <Plus className="w-3.5 h-3.5" /> Añadir
            </button>
          </div>

          <div className={cn("p-4 rounded-2xl flex items-center justify-between border transition-all", isDark ? "bg-slate-900/20 border-slate-800/60" : "bg-slate-50/50 border-slate-100")}>
            <span className={cn("text-xs font-bold", isDark ? "text-slate-350" : "text-slate-600")}>
              Mostrar cuentas registradas
            </span>
            <button
              type="button"
              onClick={() => setShowRegisteredWallets(!showRegisteredWallets)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                showRegisteredWallets ? "bg-indigo-600" : (isDark ? "bg-slate-800" : "bg-slate-200")
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  showRegisteredWallets ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <AnimatePresence>
            {showRegisteredWallets && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {wallets.filter(w => w.type !== 'credit_card').map(w => (
                    <div key={w.id} className={cn("p-4 border rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all", isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-100")}>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{w.type === 'bank' ? 'Banco' : w.type === 'cash' ? 'Efectivo' : 'Digital'}</span>
                        <p className={cn("font-bold text-sm", isDark ? "text-slate-100" : "text-slate-800")}>{w.name}</p>
                        <p className="text-[10px] font-mono text-slate-500 mt-1">Saldo: {formatCurrency(w.balance)}</p>
                      </div>
                      <button 
                        onClick={() => handleEditWallet(w)} 
                        title="Editar cuenta"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border border-indigo-500/10 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </button>
                    </div>
                  ))}
                  {wallets.filter(w => w.type !== 'credit_card').length === 0 && <div className="col-span-2 py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No hay cuentas configuradas</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* CREDIT CARDS SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between border-b border-indigo-100/20 pb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-violet-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-extrabold">Tarjetas de Crédito</h2>
            </div>
            <button 
              onClick={() => { resetWalletForm(); setWalletForm(f => ({ ...f, type: 'credit_card' })); setIsWalletModalOpen(true); }}
              className="text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-violet-100 dark:hover:bg-violet-950/80 flex items-center gap-1 transition-colors cursor-pointer border border-violet-500/20"
            >
              <Plus className="w-3.5 h-3.5" /> Añadir Tarjeta
            </button>
          </div>

          <div className={cn("p-4 rounded-2xl flex items-center justify-between border transition-all", isDark ? "bg-slate-900/20 border-slate-800/60" : "bg-slate-50/50 border-slate-100")}>
            <span className={cn("text-xs font-bold", isDark ? "text-slate-350" : "text-slate-600")}>
              Mostrar tarjetas de crédito registradas
            </span>
            <button
              type="button"
              onClick={() => setShowRegisteredCards(!showRegisteredCards)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                showRegisteredCards ? "bg-violet-600" : (isDark ? "bg-slate-800" : "bg-slate-200")
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  showRegisteredCards ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <AnimatePresence>
            {showRegisteredCards && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {wallets.filter(w => w.type === 'credit_card').map(w => (
                    <div key={w.id} className={cn("p-4 border rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all", isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-100")}>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Cupo Tarjeta</span>
                        <p className={cn("font-bold text-sm", isDark ? "text-slate-100" : "text-slate-800")}>{w.name}</p>
                        <p className="text-[11px] font-mono text-slate-500 mt-1">
                          Cupo Disponible: <span className="font-bold text-emerald-500">{formatCurrency(w.balance)}</span> <span className="text-slate-450 dark:text-slate-400">/ Total: {formatCurrency(w.totalLimit || 0)}</span>
                        </p>
                      </div>
                      <button 
                        onClick={() => handleEditWallet(w)} 
                        title="Editar tarjeta"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border border-violet-500/10 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </button>
                    </div>
                  ))}
                  {wallets.filter(w => w.type === 'credit_card').length === 0 && <div className="col-span-2 py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No hay tarjetas de crédito configuradas</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* SECCIÓN UNIFICADA: PRIVACIDAD Y SEGURIDAD */}
        <motion.section
          key="unifiedPrivacySecurity"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-indigo-100/20 pb-2">
            <Shield className="w-4 h-4 text-indigo-505 text-indigo-500 font-extrabold" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 font-extrabold">Privacidad y Seguridad</h2>
          </div>

          <div className="space-y-3">
            
            {/* PANEL CASCADA 1: IDENTIDAD GLOBAL */}
            <div className={cn("rounded-2xl border overflow-hidden transition-all duration-300", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
              <button
                type="button"
                onClick={() => setIsIdentityExpanded(!isIdentityExpanded)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-500/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[9px] font-black uppercase tracking-[0.05em] text-slate-400">Identificación</h3>
                    <p className={cn("text-xs font-bold sm:text-sm", isDark ? "text-slate-100" : "text-slate-800")}>Identidad Global del Sistema</p>
                  </div>
                </div>
                {isIdentityExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence initial={false}>
                {isIdentityExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-slate-100/10"
                  >
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Company Name */}
                      <div className="space-y-2">
                        <label className={cn("text-xs font-bold block", isDark ? "text-slate-300" : "text-slate-650")}>
                          Nombre de la Empresa o Entidad
                        </label>
                        <input 
                          type="text"
                          value={settings?.companyName || ''}
                          onChange={(e) => updateSettings({ companyName: e.target.value })}
                          className={cn("w-full border p-3 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors shadow-sm font-semibold", isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-205 text-slate-800")}
                          placeholder="Ej. Mi Control Financiero"
                        />
                      </div>

                      {/* Propietario */}
                      <div className="space-y-2">
                        <label className={cn("text-xs font-bold block", isDark ? "text-slate-300" : "text-slate-655")}>
                          Nombre Completo del Propietario
                        </label>
                        <input 
                          type="text"
                          value={settings?.displayName || ''}
                          onChange={(e) => updateSettings({ displayName: e.target.value })}
                          className={cn("w-full border p-3 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors shadow-sm font-semibold", isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-205 text-slate-800")}
                          placeholder="Ej. Marcelo Gutama"
                        />
                      </div>

                      {/* RUC / Cédula */}
                      <div className="space-y-2">
                        <label className={cn("text-xs font-bold block", isDark ? "text-slate-300" : "text-slate-655")}>
                          Cédula o RUC
                        </label>
                        <input 
                          type="text"
                          value={settings?.ruc || ''}
                          onChange={(e) => updateSettings({ ruc: e.target.value })}
                          className={cn("w-full border p-3 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors shadow-sm font-semibold font-mono", isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-205 text-slate-800")}
                          placeholder="Ej. 0102030405001"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-2">
                        <label className={cn("text-xs font-bold block", isDark ? "text-slate-300" : "text-slate-655")}>
                          Número de Celular
                        </label>
                        <input 
                          type="text"
                          value={settings?.phone || ''}
                          onChange={(e) => updateSettings({ phone: e.target.value })}
                          className={cn("w-full border p-3 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors shadow-sm font-semibold", isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-205 text-slate-800")}
                          placeholder="Ej. +593987654321"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* PANEL CASCADA 2: PROTECCIÓN Y BLOQUEO DE CUENTA */}
            <div className={cn("rounded-2xl border overflow-hidden transition-all duration-300", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
              <button
                type="button"
                onClick={() => setIsSecurityExpanded(!isSecurityExpanded)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-500/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[9px] font-black uppercase tracking-[0.05em] text-slate-400">Protección</h3>
                    <p className={cn("text-xs font-bold sm:text-sm", isDark ? "text-slate-100" : "text-slate-800")}>Seguridad y Filtros de Bloqueo</p>
                  </div>
                </div>
                {isSecurityExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence initial={false}>
                {isSecurityExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-slate-100/10"
                  >
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Security Pin */}
                      <div className="space-y-2">
                        <label className={cn("text-xs font-bold block", isDark ? "text-slate-300" : "text-slate-655")}>
                          PIN de Seguridad (4 dígitos de acceso)
                        </label>
                        <input 
                          type="password"
                          maxLength={4}
                          value={settings?.securityPin || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            updateSettings({ securityPin: val });
                          }}
                          className={cn("w-full border p-3 rounded-xl text-center text-lg tracking-[0.5em] font-mono outline-none focus:border-indigo-505 transition-colors shadow-sm", isDark ? "bg-slate-950 border-slate-850 text-slate-100" : "bg-slate-50 border-slate-205 text-slate-800")}
                          placeholder="****"
                        />
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">Requerido para purgar datos y autorizar cambios de seguridad críticos.</p>
                      </div>

                      {/* Biometrics */}
                      <div className="space-y-2">
                        <label className={cn("text-xs font-bold block", isDark ? "text-slate-300" : "text-slate-655")}>
                          Desbloqueo Biométrico (Face ID/Touch ID)
                        </label>
                        <div className="flex gap-2 pt-1">
                          {[
                            { id: true, label: "Habilitado" },
                            { id: false, label: "Deshabilitado" }
                          ].map((opt) => (
                            <button
                              key={String(opt.id)}
                              type="button"
                              onClick={() => handleSettingClick('biometricEnabled', opt.id)}
                              className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer",
                                (settings?.biometricEnabled ?? false) === opt.id 
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                                  : isDark 
                                  ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
                                  : "bg-slate-100 text-slate-600 border-slate-205 hover:bg-slate-200"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">Utiliza la autenticación WebAuthn nativa de su dispositivo móvil o PC.</p>
                      </div>

                      {/* Custom Inactivity Timer */}
                      <div className="space-y-2 md:col-span-2">
                        <label className={cn("text-xs font-bold block", isDark ? "text-slate-300" : "text-slate-655")}>
                          Temporizador de Bloqueo Automático por Inactividad
                        </label>
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-1">
                          {[
                            { id: 0, label: 'Desactivado' }, 
                            { id: 1, label: '1 min' }, 
                            { id: 5, label: '5 min' }, 
                            { id: 10, label: '10 min' }, 
                            { id: 15, label: '15 min' }
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleSettingClick('autoLockTimer', opt.id)}
                              className={cn(
                                "flex-1 py-2.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer min-w-[70px]",
                                (settings?.autoLockTimer ?? 5) === opt.id 
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                                  : isDark 
                                  ? "bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-800"
                                  : "bg-slate-100 text-slate-600 border-slate-205 hover:bg-slate-200"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">El sistema solicitará el PIN o biometría después de transcurrido este tiempo sin registrar pulsaciones.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* PANEL CASCADA 3: CONFIGURACIÓN SMART DEL ASISTENTE DE IA */}
            <div className={cn("rounded-2xl border overflow-hidden transition-all duration-300", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
              <button
                type="button"
                onClick={() => setIsAssistantExpanded(!isAssistantExpanded)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-500/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[9px] font-black uppercase tracking-[0.05em] text-slate-400">Inteligencia Conversacional</h3>
                    <p className={cn("text-xs font-bold sm:text-sm", isDark ? "text-slate-100" : "text-slate-800")}>Asistente Inteligente IA (Clave API Gemini)</p>
                  </div>
                </div>
                {isAssistantExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence initial={false}>
                {isAssistantExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-slate-100/10"
                  >
                    <div className="p-5 flex flex-col md:flex-row gap-6">
                      
                      {/* Explicación / Estado */}
                      <div className="flex-1 space-y-3 border-b md:border-b-0 md:border-r border-slate-100/10 pb-6 md:pb-0 md:pr-6 text-left">
                        <h4 className="text-sm font-bold flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                          <Sparkles className="w-4 h-4 animate-pulse" /> Inteligencia Conversacional Gemini
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                          La clave Gemini API habilita el análisis avanzado con lenguaje inteligente e imágenes. Si no tiene clave o prefiere rapidez absoluta, **¡no se preocupe!** El sistema ahora incluye un **Extractor Local Autónomo** que analiza automáticamente textos y chats con cuentas o trámites ANT de manera instantánea sin requerir de configuraciones de API ni internet.
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs font-bold pt-1">
                          <span className={cn("text-[8px] uppercase px-2 py-0.5 rounded font-black tracking-wider", 
                            localApiKey ? "bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-amber-100 text-amber-850 dark:bg-amber-950/40 dark:text-amber-400"
                          )}>
                            {localApiKey ? "● ASISTENTE EN ÓPTIMO ESTADO" : "● EN ESPERA DE CONFIGURAR CLAVE"}
                          </span>
                        </div>
                      </div>

                      {/* Formulario */}
                      <div className="flex-1 space-y-4 text-left flex flex-col justify-between">
                        <div className="space-y-2">
                          <label className={cn("text-xs font-bold block", isDark ? "text-slate-300" : "text-slate-655")}>
                            Clave de API de Gemini (Google AI Studio)
                          </label>
                          <div className="relative flex items-center font-mono">
                            <span className="absolute left-3.5 text-slate-400">
                              <Key className="w-4 h-4" />
                            </span>
                            <input
                              type={showApiKey ? "text" : "password"}
                              value={localApiKey}
                              onChange={(e) => handleSaveAssistantKey(e.target.value)}
                              placeholder="AIzaSy..."
                              className={cn(
                                "w-full pl-10 pr-12 py-3 rounded-xl text-sm font-bold outline-none border transition-colors shadow-sm focus:border-indigo-500", 
                                isDark 
                                  ? "bg-slate-950 border-slate-800 text-slate-100" 
                                  : "bg-slate-50 border-slate-205 text-slate-800"
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                            >
                              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal font-medium mt-1">
                            Su clave se almacena exclusivamente en la memoria local de su navegador, garantizando total privacidad y seguridad "Zero-Server".
                          </p>
                        </div>

                        {localApiKey && (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100/10">
                            <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold uppercase">
                              <Check className="w-4 h-4" /> Clave Guardada en Navegador
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm("¿Desea eliminar de forma definitiva la clave de Gemini en su navegador?")) {
                                  handleClearAssistantKey();
                                }
                              }}
                              className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                            >
                              Eliminar clave
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* PANEL CASCADA 4: PROVISIÓN DE ELIMINACIÓN SEGURA */}
            <div className={cn("rounded-2xl border overflow-hidden transition-all duration-300", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
              <button
                type="button"
                onClick={() => setIsPurgeExpanded(!isPurgeExpanded)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-500/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/45 text-rose-650 dark:text-rose-400 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[9px] font-black uppercase tracking-[0.05em] text-slate-400">Desmantelamiento</h3>
                    <p className={cn("text-xs font-bold sm:text-sm", isDark ? "text-slate-100" : "text-slate-800")}>Provisión de Eliminación Segura (Purga Total)</p>
                  </div>
                </div>
                {isPurgeExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence initial={false}>
                {isPurgeExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-slate-100/10"
                  >
                    <div className="p-5 space-y-4 text-left">
                      <div className="rounded-xl bg-rose-500/10 p-4 border border-rose-500/20 text-rose-600 dark:text-rose-405">
                        <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 mb-1.5 font-bold">
                          <Shield className="w-4 h-4 animate-pulse" /> Advertencia de Destrucción Irreversible
                        </h4>
                        <p className="text-xs font-semibold leading-relaxed">
                          La purga del sistema borrará permanentemente todas sus cuentas de banco, transacciones registradas de ANT, catálogo de proveedores, servicios activos, asientos contables e histórico del CRM en la base de datos de la nube. Esta acción **no se puede deshacer**.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-550 dark:text-slate-400 font-semibold">
                            Para iniciar la destrucción, presione el botón lateral e ingrese su PIN de seguridad de 4 dígitos.
                          </p>
                        </div>
                        <button 
                          type="button"
                          onClick={handleOpenPurgeModal}
                          className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 border border-rose-500/25 animate-pulse"
                        >
                          <Trash2 className="w-4 h-4" /> Ejecutar Purga Total
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </motion.section>

        {/* MODULO DE PERSONALIZACION DEL SISTEMA */}
        <motion.section
          key="personalizationSectionZone"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-indigo-100/20 pb-2">
            <Palette className="w-4 h-4 text-slate-400" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-extrabold">Módulo de Personalización Global</h2>
          </div>

          <div className={cn("p-5 rounded-2xl border transition-all duration-300", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
            {/* Visual selector toggle switch */}
            <div className="flex items-center justify-between">
              <div className="space-y-1 text-left">
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500">Suite de Apariencia</span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-150">Habilitar módulo de personalización</h3>
                <p className="text-xs text-slate-400 font-medium">Configure fotos, temas de interfaz, idioma, colores de acento y tipografías arquitectónicas a medida.</p>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  const val = !showPersonalizationModule;
                  setShowPersonalizationModule(val);
                  localStorage.setItem('SHOW_PERSONALIZATION_MODULE', String(val));
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  showPersonalizationModule ? "bg-indigo-600" : (isDark ? "bg-slate-800" : "bg-slate-200")
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    showPersonalizationModule ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {showPersonalizationModule && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 space-y-8"
                >
                  {/* GRID 1: AVATAR, TEMA E IDIOMA */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    
                    {/* Columna Foto de Perfil */}
                    <div className="space-y-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-500/5 text-center">
                      <div className="relative group shrink-0 w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-500/25 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        {settings?.useGoogleAvatar && user?.photoURL ? (
                          <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : settings?.customProfilePic ? (
                          <img src={settings.customProfilePic} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-indigo-100 text-indigo-700 font-black text-3xl flex items-center justify-center uppercase">
                            {settings?.displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        
                        {/* Hover uploader label */}
                        {!settings?.useGoogleAvatar && (
                          <label className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold uppercase tracking-widest gap-1 text-center">
                            <Upload className="w-4 h-4" />
                            <span>Subir Foto</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                
                                if (file.size > 400 * 1024) {
                                  window.alert("La imagen debe pesar menos de 400 KB.");
                                  return;
                                }

                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const base64String = reader.result as string;
                                  try {
                                    await updateSettings({ customProfilePic: base64String });
                                  } catch (err) {
                                    console.error("Error al cargar la foto:", err);
                                    window.alert("Error al cargar la foto");
                                  }
                                };
                                reader.readAsDataURL(file);
                              }} 
                              className="hidden" 
                            />
                          </label>
                        )}
                      </div>

                      <div className="space-y-3 flex-1 text-center w-full">
                        <h3 className="text-xs font-bold tracking-tight">Preferencias del Avatar</h3>
                        <div className="flex flex-col gap-1.5 w-full">
                          <button
                            type="button"
                            onClick={() => updateSettings({ useGoogleAvatar: true })}
                            className={cn(
                              "w-full px-3 py-1.5 border rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-left flex items-center justify-between cursor-pointer",
                              settings?.useGoogleAvatar 
                                ? "bg-indigo-600 text-white border-indigo-600" 
                                : isDark 
                                ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850"
                                : "bg-white text-slate-550 border-slate-200 hover:bg-slate-50"
                            )}
                          >
                            <span>Usar foto de Google</span>
                            {settings?.useGoogleAvatar && <Check className="w-3 h-3" />}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => updateSettings({ useGoogleAvatar: false })}
                            className={cn(
                              "w-full px-3 py-1.5 border rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-left flex items-center justify-between cursor-pointer",
                              !settings?.useGoogleAvatar 
                                ? "bg-indigo-600 text-white border-indigo-600" 
                                : isDark 
                                ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850"
                                : "bg-white text-slate-550 border-slate-200 hover:bg-slate-50"
                            )}
                          >
                            <span>Foto personalizada</span>
                            {!settings?.useGoogleAvatar && <Check className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Columna Modo de Tema */}
                    <div className="space-y-3 p-4 rounded-2xl bg-slate-500/5 h-full flex flex-col justify-between text-left">
                      <div>
                        <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-indigo-500" />
                          <h3 className="text-sm font-bold tracking-tight">Motor de Interfaz / Tema</h3>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">Defina el protocolo cromático global de la aplicación.</p>
                      </div>
                      <div className="flex flex-col gap-1.5 mt-2">
                        {[
                          { id: 'light', label: '☀️ Protocolo Claro' },
                          { id: 'dark', label: '🌙 Protocolo Oscuro' },
                          { id: 'system', label: '💻 Predeterminado' }
                        ].map((themeOpt) => (
                          <button
                            key={themeOpt.id}
                            type="button"
                            onClick={() => handleSettingClick('theme', themeOpt.id)}
                            className={cn(
                              "w-full px-3 py-2 border rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-left flex items-center justify-between cursor-pointer",
                              settings?.theme === themeOpt.id 
                                ? "bg-indigo-600 text-white border-indigo-600" 
                                : isDark 
                                ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850"
                                : "bg-white text-slate-550 border-slate-200 hover:bg-slate-50"
                            )}
                          >
                            <span>{themeOpt.label}</span>
                            {settings?.theme === themeOpt.id && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Columna Idioma */}
                    <div className="space-y-3 p-4 rounded-2xl bg-slate-500/5 h-full flex flex-col justify-between text-left">
                      <div>
                        <div className="flex items-center gap-2">
                          <Languages className="w-4 h-4 text-slate-450" />
                          <h3 className="text-sm font-bold tracking-tight">Idioma de Preferencia / Localization</h3>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">Cambia instantáneamente la traducción de textos fijos en la navegación.</p>
                      </div>
                      <div className="flex flex-col gap-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => updateSettings({ language: 'es' })}
                          className={cn(
                            "py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all flex items-center justify-between cursor-pointer",
                            settings?.language === 'es' 
                              ? "bg-indigo-600 text-white border-indigo-600" 
                              : isDark 
                              ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850"
                              : "bg-white text-slate-550 border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          <span>🇪🇸 Español</span>
                          {settings?.language === 'es' && <Check className="w-3 h-3" />}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => updateSettings({ language: 'en' })}
                          className={cn(
                            "py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all flex items-center justify-between cursor-pointer",
                            settings?.language === 'en' 
                              ? "bg-indigo-600 text-white border-indigo-600" 
                              : isDark 
                              ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850"
                              : "bg-white text-slate-550 border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          <span>🇺🇸 English</span>
                          {settings?.language === 'en' && <Check className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* SEPARADOR */}
                  <hr className="border-slate-100 dark:border-slate-800/80" />

                  {/* GRID 2: ACCENT PALETTE Y FONTS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start text-left">
                    
                    {/* Paleta de Colores de Acento */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-slate-450" />
                        <h3 className="text-sm font-bold tracking-tight">Paleta Cromática de Acento</h3>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">Seleccione su color primario favorito. Todas las tarjetas, botones interactivos y alertas se acoplarán con esta vibración visual.</p>
                      
                      <div className="flex flex-wrap gap-2.5 pt-2">
                        {[
                          { id: 'indigo', name: 'Índigo', hex: '#4f46e5' },
                          { id: 'emerald', name: 'Esmeralda', hex: '#059669' },
                          { id: 'rose', name: 'Rosa Calm', hex: '#e11d48' },
                          { id: 'amber', name: 'Ámbar', hex: '#d97706' },
                          { id: 'violet', name: 'Violeta', hex: '#7c3aed' },
                          { id: 'sky', name: 'Celeste', hex: '#0284c7' },
                          { id: 'slate', name: 'Mineral', hex: '#475569' },
                        ].map((col) => (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => updateSettings({ accentColor: col.id })}
                            className={cn(
                              "w-9 h-9 rounded-full transition-all flex items-center justify-center border border-black/10 relative cursor-pointer ring-4 ring-transparent hover:scale-105",
                              (settings?.accentColor || 'indigo') === col.id ? "scale-110 ring-indigo-505 dark:ring-indigo-500/40" : "hover:ring-slate-300 dark:hover:ring-slate-700"
                            )}
                            style={{ backgroundColor: col.hex }}
                            title={col.name}
                          >
                            {(settings?.accentColor || 'indigo') === col.id && (
                              <Check className="w-4 h-4 text-white drop-shadow-sm font-bold" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selector de Fuente */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Type className="w-4 h-4 text-slate-450" />
                        <h3 className="text-sm font-bold tracking-tight">Tipo de Letra del Sistema</h3>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">Modifique la arquitectura tipográfica para acoplar el grosor de letras y números a su agrado visual.</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5">
                        {[
                          { id: 'inter', label: 'Inter (Sans)', style: 'font-sans' },
                          { id: 'space', label: 'Space Grotesk', style: 'font-space font-space' },
                          { id: 'outfit', label: 'Outfit (Sleek)', style: 'font-outfit font-outfit' },
                          { id: 'mono', label: 'JetBrains (Mono)', style: 'font-mono' },
                          { id: 'playfair', label: 'Playfair (Serif)', style: 'font-playfair font-playfair' },
                        ].map((fontSpec) => (
                          <button
                            key={fontSpec.id}
                            type="button"
                            onClick={() => updateSettings({ fontFamily: fontSpec.id })}
                            className={cn(
                              "p-2 rounded-xl border text-[11px] font-bold text-left transition-all flex items-center justify-between cursor-pointer",
                              fontSpec.style,
                              (settings?.fontFamily || 'inter') === fontSpec.id 
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                                : isDark 
                                ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
                                : "bg-slate-50 text-slate-650 border-slate-205 hover:bg-slate-100"
                            )}
                          >
                            <span>{fontSpec.label}</span>
                            {(settings?.fontFamily || 'inter') === fontSpec.id && <Check className="w-3 h-3 inline shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* SECCIÓN COPIAS DE SEGURIDAD Y RESPALDOS (COMPACTABLE EN CASCADA) */}
        <motion.section
          key="backupRestoreZone"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-indigo-100/20 pb-2">
            <Database className="w-4 h-4 text-indigo-550 text-indigo-500 font-black" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 font-extrabold">Copias de Seguridad y Migración</h2>
          </div>

          <div className={cn("rounded-2xl border overflow-hidden transition-all duration-300", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
            <button
              type="button"
              onClick={() => setIsBackupExpanded(!isBackupExpanded)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-500/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[9px] font-black uppercase tracking-[0.05em] text-slate-400">Migración</h3>
                  <p className={cn("text-xs font-bold sm:text-sm", isDark ? "text-slate-100" : "text-slate-800")}>Administración de Copias y Respaldos (JSON y Excel)</p>
                </div>
              </div>
              {isBackupExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            <AnimatePresence initial={false}>
              {isBackupExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden border-t border-slate-100/10"
                >
                  <div className="p-5 flex flex-col md:flex-row gap-6">
                    {/* Export block */}
                    <div className="flex-1 space-y-3 border-b md:border-b-0 md:border-r border-slate-100/10 pb-6 md:pb-0 md:pr-6 text-left">
                      <h3 className="text-sm font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Download className="w-4 h-4" /> Respaldar Todo el Sistema
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        Descargue una copia de seguridad local que incluye la totalidad de sus cuentas bancarias, transacciones, catálogo de proveedores, servicios activos, CRM e historial en un solo archivo.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleExportData}
                          disabled={isExporting}
                          className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer border border-emerald-500/20"
                        >
                          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          {isExporting ? 'Procesando...' : 'Formato JSON'}
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleExportExcel}
                          disabled={isExporting}
                          className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer border border-emerald-600/20 whitespace-nowrap"
                        >
                          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          {isExporting ? 'Procesando...' : 'Formato Excel (XLSX)'}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal font-semibold mt-1">
                        El formato Excel genera un libro con múltiples hojas de cálculo (una por cada colección de datos), facilitando la depuración, control y auditoría manual de registros.
                      </p>
                    </div>

                    {/* Import block */}
                    <div className="flex-1 space-y-3 text-left">
                      <h3 className="text-sm font-bold flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                        <Upload className="w-4 h-4" /> Restaurar Copia de Seguridad
                      </h3>
                      <p className="text-xs text-slate-505 leading-relaxed font-semibold">
                        ¿Cambió de navegador o dispositivo? Seleccione su archivo de respaldo en formato de texto JSON (.json) o libro de cálculo de Microsoft Excel (.xlsx, .xls) para re-establecer sus bases de datos comerciales en la nube de forma transparente y segura.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                        <label className="w-full sm:w-auto relative cursor-pointer px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-indigo-505/20">
                          <Upload className="w-4 h-4" />
                          {isImporting ? 'Cargando...' : 'Seleccionar Archivo'}
                          <input
                            type="file"
                            accept=".json,.xlsx,.xls"
                            onChange={handleImportData}
                            disabled={isImporting}
                            className="hidden"
                          />
                        </label>
                        {importStatus && (
                          <span className="text-[10px] font-bold text-indigo-500 animate-pulse">
                            {importStatus}
                          </span>
                        )}
                      </div>

                      {/* Feedback Alert */}
                      {importFeedback.text && (
                        <div className={cn(
                          "p-3 rounded-xl border text-xs font-bold transition-all mt-2",
                          importFeedback.success 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-650 dark:text-emerald-400" 
                            : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                        )}>
                          {importFeedback.text}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* SECCIÓN INFORMACIÓN Y CONTROL (ULTIMA OPCIÓN CONFIGURABLE) */}
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-indigo-100/20 pb-2">
            <Info className="w-4 h-4 text-slate-400" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-extrabold">Información y Control de Módulos</h2>
          </div>

          <div className={cn("p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all", isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
            <div className="space-y-1 text-left">
              <h3 className={cn("text-base font-bold", isDark ? "text-slate-100" : "text-slate-805")}>Centro de Soporte, Cambios y Adaptabilidad</h3>
              <p className="text-xs text-slate-500 font-semibold">Revise el historial exacto de actualizaciones, la versión instalada y personalice las características activas del aplicativo.</p>
            </div>
            <button 
              type="button"
              onClick={() => { setInfoTab('history'); setIsInfoModalOpen(true); }}
              className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 border border-indigo-500/25"
            >
              <Info className="w-4 h-4" /> Ver Información del Protocolo
            </button>
          </div>
        </motion.section>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pt-12 border-t border-indigo-100/20 flex flex-col sm:flex-row justify-between items-center gap-4"
        >
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Última Sincronización: {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Nunca'}
            </span>
          </div>
          <button 
            onClick={() => logout()}
            className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all border border-rose-100"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión del Protocolo
          </button>
        </motion.div>
      </div>

      <AnimatePresence>
        {isPurgeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isPurging) setIsPurgeModalOpen(false); }} 
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn(
                "relative w-full max-w-md p-8 rounded-3xl border shadow-2xl z-10 flex flex-col text-left", 
                isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-450">
                  <Shield className="w-5 h-5 shrink-0" />
                  <h3 className="text-sm font-extrabold uppercase tracking-widest font-black">
                    Confirmación de Seguridad
                  </h3>
                </div>
                {!isPurging && (
                  <button 
                    onClick={() => setIsPurgeModalOpen(false)} 
                    className={cn("p-1 rounded-full transition-colors", isDark ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {purgeSuccess ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                    <Check className="w-8 h-8 animate-pulse" />
                  </div>
                  <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">¡Purga Completada!</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto font-medium">
                    Todos los datos del cliente se han eliminado de forma definitiva. El sistema se refrescará para reflejar la limpieza.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-450 font-semibold leading-relaxed">
                    ⚠️ ALERTA EXTREMA: Esta acción purgará de manera irreversible todas sus cuentas bancarias, transacciones, registros de CRM, libros diarios de caja y servicios de streaming guardados.
                  </div>
                  
                  <div className="space-y-2">
                    <label className={cn("text-xs font-bold block", isDark ? "text-slate-300" : "text-slate-600")}>
                      Ingrese su PIN de Seguridad de Acceso (4 dígitos):
                    </label>
                    <input 
                      type="password"
                      maxLength={4}
                      pattern="[0-9]*"
                      value={purgePinInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setPurgePinInput(val);
                        setPurgeError('');
                      }}
                      placeholder="****"
                      disabled={isPurging}
                      className={cn(
                        "w-full border p-3 rounded-xl text-center text-xl tracking-[0.5em] font-mono outline-none focus:border-rose-500 transition-colors shadow-sm", 
                        isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-800"
                      )}
                    />
                  </div>

                  {purgeError && (
                    <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 text-center animate-shake">
                      {purgeError}
                    </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isPurging}
                      onClick={() => setIsPurgeModalOpen(false)}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all text-center shrink-0 cursor-pointer",
                        isDark ? "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850" : "bg-white text-slate-550 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isPurging || purgePinInput.length !== 4}
                      onClick={executeDataPurge}
                      className="flex-1 py-3 px-4 rounded-xl text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-wider text-center shrink-0 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                    >
                      {isPurging ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Purgando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          Confirmar Purga
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {isWalletModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div onClick={() => { setIsWalletModalOpen(false); resetWalletForm(); }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div className={cn("relative w-full max-w-sm p-8 rounded-3xl border shadow-2xl z-10", isDark ? "bg-slate-900 border-slate-800" : "bg-white border border-slate-100")}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={cn("text-xl font-bold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  {walletForm.id ? 'Editar Cuenta / Tarjeta' : 'Nueva Cuenta / Tarjeta'}
                </h3>
                <button onClick={() => { setIsWalletModalOpen(false); resetWalletForm(); }} className="text-slate-400 p-1 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-slate-600">
                    <X />
                </button>
              </div>
              <form onSubmit={handleAddWallet} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">{walletForm.type === 'credit_card' ? 'Nombre de Tarjeta' : 'Nombre del Banco/Cuenta'}</label>
                  <input required type="text" value={walletForm.name} onChange={e => setWalletForm({...walletForm, name: e.target.value})} className={cn("w-full mt-1 p-3 rounded-xl border focus:border-indigo-500 outline-none text-sm font-bold", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800")} placeholder={walletForm.type === 'credit_card' ? 'Ej. Visa Plus' : 'Ej. Banco Pichincha'} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Tipo</label>
                  <select required value={walletForm.type} onChange={e => setWalletForm({...walletForm, type: e.target.value})} className={cn("w-full mt-1 p-3 rounded-xl border outline-none text-sm font-bold", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800")}>
                    <option value="bank">Banco / Transferencia</option>
                    <option value="cash">Efectivo</option>
                    <option value="digital_wallet">Billetera Digital/App</option>
                    <option value="credit_card">Tarjeta de Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">{walletForm.type === 'credit_card' ? 'Cupo Disponible ($)' : 'Saldo actual o Inicial ($)'}</label>
                  <input required type="number" step="0.01" value={walletForm.balance} onChange={e => setWalletForm({...walletForm, balance: e.target.value})} className={cn("w-full mt-1 p-3 rounded-xl border focus:border-indigo-500 outline-none text-sm font-bold", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800")} />
                </div>
                {walletForm.type === 'credit_card' && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500">Cupo Total ($)</label>
                    <input required type="number" step="0.01" value={walletForm.totalLimit} onChange={e => setWalletForm({...walletForm, totalLimit: e.target.value})} className={cn("w-full mt-1 p-3 rounded-xl border focus:border-indigo-500 outline-none text-sm font-bold", isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800")} />
                  </div>
                )}
                <button disabled={isSubmitting} type="submit" className="w-full mt-4 bg-indigo-600 text-white p-4 rounded-2xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-indigo-700 cursor-pointer">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {walletForm.id ? 'Guardar Cambios' : (walletForm.type === 'credit_card' ? 'Registrar Tarjeta' : 'Registrar Cuenta')}
                </button>
                {walletForm.id && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm("¿Está seguro de que desea eliminar esta billetera/tarjeta de forma definitiva?")) {
                        await handleDeleteWallet(walletForm.id);
                        setIsWalletModalOpen(false);
                        resetWalletForm();
                      }
                    }}
                    className="w-full mt-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-450 p-4 rounded-2xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border border-rose-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar Billetera / Tarjeta
                  </button>
                )}
              </form>
            </motion.div>
          </div>
        )}

        {isInfoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInfoModalOpen(false)} 
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn(
                "relative w-full max-w-2xl max-h-[85vh] overflow-y-auto p-8 rounded-3xl border shadow-2xl z-10 flex flex-col text-left scrollbar-hide", 
                isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-500" />
                  <h3 className={cn("text-lg font-extrabold uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    Información y Configuración Adaptativa
                  </h3>
                </div>
                <button 
                  onClick={() => setIsInfoModalOpen(false)} 
                  className={cn("p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors", isDark ? "text-slate-400 bg-slate-800" : "text-slate-500 bg-slate-100")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 dark:border-slate-800/65 mb-6 shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setInfoTab('history')}
                  className={cn(
                    "pb-2.5 px-4 text-xs font-bold uppercase tracking-wider relative transition-all border-b-2",
                    infoTab === 'history' 
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  Acerca de e Historial De Cambios
                </button>
                <button
                  type="button"
                  onClick={() => setInfoTab('features')}
                  className={cn(
                    "pb-2.5 px-4 text-xs font-bold uppercase tracking-wider relative transition-all border-b-2",
                    infoTab === 'features' 
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  Habilitar/Deshabilitar Características
                </button>
                <button
                  type="button"
                  onClick={() => setInfoTab('support')}
                  className={cn(
                    "pb-2.5 px-4 text-xs font-bold uppercase tracking-wider relative transition-all border-b-2",
                    infoTab === 'support' 
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  Soporte y Guías
                </button>
              </div>

              {/* Content Panel */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-1">
                {infoTab === 'history' ? (
                  <div className="space-y-6 text-sm">
                    {/* Version card */}
                    <div className={cn("p-5 rounded-2xl border flex items-center justify-between gap-4", isDark ? "bg-indigo-950/20 border-indigo-500/20" : "bg-indigo-50/50 border-indigo-100")}>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-500">Versión del Sistema</span>
                        <h4 className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                          {SYSTEM_UPDATES[0]?.version || "Versión Reciente"} • Estable
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Formato: Día.Mes.Año (Local) • Código de Compilación</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Compilado Exacto</span>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 block bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-500/10 mt-1">
                          {SYSTEM_UPDATES[0]?.date || "Reciente"}
                        </span>
                      </div>
                    </div>

                    {/* Resguatados de seguridad summary */}
                    <div className={cn("p-5 rounded-xl border space-y-3", isDark ? "bg-emerald-950/10 border-emerald-500/10" : "bg-emerald-50/10 border-emerald-100")}>
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-5 h-5 shrink-0" />
                        <h5 className="font-bold text-xs uppercase tracking-wider">Análisis Técnico y Seguridad Vial ante Inyecciones (SQLi)</h5>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        El sistema actual cuenta con inmunidad estructural frente a inyecciones SQL convencionales. Al estar construido sobre una arquitectura Serverless NoSQL (usando el SDK oficial de **Google Firebase Firestore**), las consultas no se concatenan mediante cadenas de texto plano destructibles, sino que se invocan por referencias tipadas de objetos directos. Adicionalmente, todas las escrituras se validan mediante un modelo Zero-Trust en `firestore.rules` que ejecuta filtros estrictos de firmas de claves directas e impide modificaciones de claves no documentadas.
                      </p>
                    </div>

                    {/* Update log */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-black uppercase tracking-widest text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800/60">Historial de Actualizaciones Aplicadas</h5>
                      
                      <div className="border-l-2 border-indigo-500/30 pl-4 ml-2 space-y-6">
                        {SYSTEM_UPDATES.map((item, idx) => (
                          <div key={item.id} className="relative">
                            <div className={cn(
                              "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900",
                              idx === 0 ? "bg-indigo-500" : "bg-slate-400"
                            )} />
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                              <span className="text-xs font-black text-slate-850 dark:text-slate-200">
                                {item.version} • {item.title}
                              </span>
                              <span className="text-[9px] font-mono text-slate-400 font-bold">
                                {item.date}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : infoTab === 'support' ? (
                  <div className="space-y-6 text-sm">
                    {/* Selector de Guías tipo Slider / Carrusel */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="text-left">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Manuales Interactivos</span>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {activeGuide === 0 ? "1. Verificación de Trámites & Placas ANT" : "2. Activación Inteligente del Asistente IA"}
                        </h4>
                      </div>
                      
                      {/* Controladores de Slider */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveGuide(activeGuide === 0 ? 1 : 0)}
                          className={cn(
                            "p-2 rounded-xl border transition-all cursor-pointer",
                            isDark ? "border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-400" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                          )}
                          title="Guía Anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        {/* Indicadores Visuales en Barra */}
                        <div className="flex items-center gap-1 px-2.5">
                          <button 
                            type="button"
                            onClick={() => setActiveGuide(0)} 
                            className={cn("h-1.5 rounded-full transition-all duration-300 cursor-pointer", activeGuide === 0 ? "bg-indigo-600 w-6" : "bg-slate-300 dark:bg-slate-800 w-2")} 
                          />
                          <button 
                            type="button"
                            onClick={() => setActiveGuide(1)} 
                            className={cn("h-1.5 rounded-full transition-all duration-300 cursor-pointer", activeGuide === 1 ? "bg-indigo-600 w-6" : "bg-slate-300 dark:bg-slate-800 w-2")} 
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveGuide(activeGuide === 1 ? 0 : 1)}
                          className={cn(
                            "p-2 rounded-xl border transition-all cursor-pointer",
                            isDark ? "border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-400" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                          )}
                          title="Guía Siguiente"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="relative overflow-hidden min-h-[460px] sm:min-h-[420px]">
                      <AnimatePresence mode="wait">
                        {activeGuide === 0 ? (
                          <motion.div
                            key="guide_ant"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-4"
                          >
                            <div className="bg-indigo-50 dark:bg-indigo-950/10 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-505/10 text-xs text-slate-500 font-semibold leading-relaxed text-left">
                              Guía paso a paso y herramientas de diagnóstico para verificar si una factura está lista o si el trámite requiere una actualización de datos obligatoria en los portales del SRI y la Agencia Nacional de Tránsito (ANT).
                            </div>

                            <div className="space-y-4">
                              {/* Paso 1 */}
                              <div className={cn("p-5 rounded-2xl border flex gap-4 transition-all text-left", isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm")}>
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-550 font-extrabold flex items-center justify-center shrink-0">1</div>
                                <div className="space-y-1">
                                  <label className="text-xs font-black uppercase text-indigo-500 block">Paso 1: Dirigirse al portal oficial de la ANT</label>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    Vaya a la página de solicitudes de servicios de la <strong>Agencia Nacional de Tránsito (ANT)</strong>:
                                  </p>
                                  <a 
                                    href="https://consultaweb.ant.gob.ec/svt/paginas/portal/svf_solicitar_servicio.jsp?ps_param_tip_serv=otr" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs font-bold text-indigo-500 hover:text-indigo-600 hover:underline flex items-center gap-1 mt-2 break-all"
                                  >
                                    🔗 https://consultaweb.ant.gob.ec/svt/paginas/portal/...
                                  </a>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-2 text-slate-400 dark:text-slate-505">
                                    Y busque la opción llamada: <strong className="text-slate-700 dark:text-slate-350">EXPEDICIÓN DE SERIES NUEVAS DE PLACAS DE IDENTIFICACIÓN DE MOTOCICLETAS</strong>.
                                  </p>
                                </div>
                              </div>

                              {/* Paso 2 */}
                              <div className={cn("p-5 rounded-2xl border flex gap-4 transition-all text-left", isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm")}>
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-550 font-extrabold flex items-center justify-center shrink-0">2</div>
                                <div className="space-y-1">
                                  <label className="text-xs font-black uppercase text-indigo-500 block">Paso 2: Diagnóstico mediante el nombre del cliente</label>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    Si le sale algún mensaje de error y no se muestran los nombres reales del cliente, se entiende de antemano que el trámite <strong>necesita una actualización de datos</strong> de manera obligatoria.
                                  </p>
                                </div>
                              </div>

                              {/* Paso 3 */}
                              <div className={cn("p-5 rounded-2xl border flex gap-4 transition-all text-left", isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm")}>
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-550 font-extrabold flex items-center justify-center shrink-0">3</div>
                                <div className="space-y-1">
                                  <label className="text-xs font-black uppercase text-indigo-500 block">Paso 3: Carga de valores al SRI</label>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    Asegúrese de tener subidos los datos correspondientes y los valores completos en la plataforma del SRI. Para verificar si los valores están completos consulte el portal oficial del SRI.
                                  </p>
                                </div>
                              </div>

                              {/* Paso 4 */}
                              <div className={cn("p-5 rounded-2xl border flex gap-4 transition-all text-left", isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm")}>
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-550 font-extrabold flex items-center justify-center shrink-0">4</div>
                                <div className="space-y-1">
                                  <label className="text-xs font-black uppercase text-indigo-500 block">Paso 4: Verificación final en el SRI</label>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    Consulte y valide directamente en el SRI si el cliente tiene valores ya cancelados/saldados o cuánto adeuda actualmente.
                                  </p>
                                  <a 
                                    href="https://srienlinea.sri.gob.ec/" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs font-bold text-indigo-500 hover:text-indigo-600 hover:underline flex items-center gap-1 mt-2.5 break-all"
                                  >
                                    🔗 https://srienlinea.sri.gob.ec/
                                  </a>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="guide_ai_activation"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-4"
                          >
                            <div className="bg-emerald-50 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-100/30 dark:border-emerald-505/10 text-xs text-slate-500 font-semibold leading-relaxed text-left">
                              Aprenda a habilitar el Asistente Inteligente mediante una clave de API de Gemini personal de Google AI Studio. Este proceso toma menos de un minuto y le dará los mejores superpoderes.
                            </div>

                            <div className="space-y-4">
                              {/* Paso 1 */}
                              <div className={cn("p-5 rounded-2xl border flex gap-4 transition-all text-left", isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm")}>
                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-650 dark:text-emerald-400 font-extrabold flex items-center justify-center shrink-0">1</div>
                                <div className="space-y-1">
                                  <label className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-450 block">Paso 1: obtener la API Key</label>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    Esto se logra entrando al portal de desarrolladores de Google AI Studio con su cuenta habitual:
                                  </p>
                                  <a 
                                    href="https://aistudio.google.com/api-keys?project=gen-lang-client-0052201582" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs font-bold text-indigo-500 hover:text-indigo-600 hover:underline flex items-center gap-1 mt-2 break-all"
                                  >
                                    🔗 https://aistudio.google.com/api-keys?project=gen-lang-client-0052201582
                                  </a>
                                </div>
                              </div>

                              {/* Paso 2 */}
                              <div className={cn("p-5 rounded-2xl border flex gap-4 transition-all text-left", isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm")}>
                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-650 dark:text-emerald-400 font-extrabold flex items-center justify-center shrink-0">2</div>
                                <div className="space-y-1">
                                  <label className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-450 block">Paso 2: buscar la opción llamada obtener API KEY</label>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    En la barra izquierda o cabecera del portal de Google, busque y presione la opción principal identificada con el nombre de <strong className="text-indigo-600 dark:text-indigo-400">Crear clave de API ("Get API Key")</strong>.
                                  </p>
                                </div>
                              </div>

                              {/* Paso 3 */}
                              <div className={cn("p-5 rounded-2xl border flex gap-4 transition-all text-left", isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm")}>
                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-650 dark:text-emerald-400 font-extrabold flex items-center justify-center shrink-0">3</div>
                                <div className="space-y-1">
                                  <label className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-450 block">Paso 3: aceptar términos y copiar la llave</label>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    Se le cargará automáticamente una ventana flotante de Google. Marque la casilla para aceptar los términos de servicio, complete la generación y copie la llave al portapapeles.
                                  </p>
                                </div>
                              </div>

                              {/* Paso 4 */}
                              <div className={cn("p-5 rounded-2xl border flex gap-4 transition-all text-left", isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-100 shadow-sm")}>
                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-650 dark:text-emerald-400 font-extrabold flex items-center justify-center shrink-0">4</div>
                                <div className="space-y-1">
                                  <label className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-450 block">Paso 4: pegar la API KEY en configuración del asistente</label>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    Regrese a esta pantalla de Configuración y pegue su llave en la sección superior <strong className="text-indigo-600 dark:text-indigo-400">"Configuración del Asistente de IA"</strong> para finalizar la activación de su asistente.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-sm">
                    <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl text-xs text-slate-500 font-medium">
                      Deshabilite características no deseadas para aligerar la interfaz de navegación del cliente. Las características deshabilitadas desaparecerán del menú principal. Al habilitarse nuevamente, recuperará el acceso directo de inmediato y se conservarán los datos intactos.
                    </div>

                    <div className="space-y-3 pt-2">
                      {[
                        { 
                          id: 'crm', 
                          label: 'CRM Relaciones', 
                          desc: 'Directorio de intermediarios locales, revendedores, deudores y registros de convenios.' 
                        },
                        { 
                          id: 'services', 
                          label: 'Servicios Digitales', 
                          desc: 'Gestión y venta de cuentas de streaming (Netflix, Disney) y de licencias digitales.' 
                        },
                        { 
                          id: 'updates', 
                          label: 'Actualizaciones ANT (Trámites)', 
                          desc: 'Trámites e intermediación de licencias ANT, cobro individual y multas de conductores.' 
                        },
                        { 
                          id: 'treasury', 
                          label: 'Tesorería y Caja', 
                          desc: 'Libro diario, flujos de efectivo ingresados y saldos bancarios o billeteras.' 
                        },
                        { 
                          id: 'alerts', 
                          label: 'Alertas y Cobros Inteligentes', 
                          desc: 'Módulo de recordatorios e historial clínico de cobros por pendientes o vencimientos.' 
                        },
                        { 
                          id: 'ai_assistant', 
                          label: 'Asistente de Inteligencia Artificial', 
                          desc: 'Asistente interactivo inteligente con comandos por mensaje.' 
                        },
                      ].map((feat) => {
                        const isEnabled = !(settings?.disabledFeatures || []).includes(feat.id);
                        return (
                          <div 
                            key={feat.id} 
                            className={cn(
                              "p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all",
                              isDark ? "bg-slate-900/40 border-slate-800 hover:border-slate-700" : "bg-white border-slate-100 hover:border-slate-200"
                            )}
                          >
                            <div className="space-y-0.5 max-w-[80%]">
                              <div className="flex items-center gap-2">
                                <span className={cn("text-xs font-extrabold pb-0.5", isDark ? "text-slate-100" : "text-slate-800")}>{feat.label}</span>
                                {isEnabled ? (
                                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[8px] font-bold px-1.5 py-0.2 rounded uppercase">Activo</span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 dark:bg-slate-850 dark:text-slate-400 text-[8px] font-bold px-1.5 py-0.2 rounded uppercase">Inactivo</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium leading-normal">{feat.desc}</p>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => toggleFeature(feat.id)}
                              className={cn(
                                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                isEnabled ? "bg-indigo-600" : (isDark ? "bg-slate-800" : "bg-slate-200")
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                  isEnabled ? "translate-x-5" : "translate-x-0"
                                )}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-8 border-t border-slate-100 dark:border-slate-800/60 pt-4 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Código Seguro • ID: {user?.uid.substring(0, 8)}</span>
                <button
                  type="button"
                  onClick={() => setIsInfoModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-700/80 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cerrar Ventana
                </button>
              </div>
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
