import React, { useState } from 'react';
import { signInWithGoogle, signInWithGoogleRedirect } from '../lib/firebase';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);

  const handleLoginPopup = async () => {
    setLoading(true);
    setError(null);
    setErrorType(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google Auth Popup Error:", err);
      const code = err?.code || "";
      let userFriendlyMessage = "Ocurrió un error inesperado al conectar con Google. Por favor intenta de nuevo.";
      
      if (code === "auth/unauthorized-domain") {
        setErrorType("unauthorized-domain");
        userFriendlyMessage = `Este dominio (${window.location.hostname}) no está autorizado en tu proyecto de Firebase.`;
      } else if (code === "auth/popup-closed-by-user") {
        userFriendlyMessage = "La ventana de inicio de sesión se cerró antes de completar el proceso.";
      } else if (code === "auth/popup-blocked") {
        userFriendlyMessage = "El navegador bloqueó la ventana emergente de inicio de sesión. Por favor permite las ventanas emergentes o usa el método de redirección.";
      } else {
        userFriendlyMessage = err?.message || userFriendlyMessage;
      }
      
      setError(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginRedirect = async () => {
    setLoading(true);
    setError(null);
    setErrorType(null);
    try {
      await signInWithGoogleRedirect();
    } catch (err: any) {
      console.error("Google Auth Redirect Error:", err);
      const code = err?.code || "";
      let userFriendlyMessage = "No se pudo iniciar la redirección de Google.";
      if (code === "auth/unauthorized-domain") {
        setErrorType("unauthorized-domain");
        userFriendlyMessage = `Este dominio (${window.location.hostname}) no está autorizado en tu proyecto de Firebase.`;
      } else {
        userFriendlyMessage = err?.message || userFriendlyMessage;
      }
      setError(userFriendlyMessage);
      setLoading(false);
    }
  };

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'tu-app.vercel.app';
  const isUnauthorizedDomain = errorType === "unauthorized-domain" || (error && error.includes("unauthorized-domain"));

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <LogIn className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Control Financiero</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Sistema Control Financiero (Beta 1.0.0)</p>
        </div>

        <div className="space-y-3">
          <button 
            onClick={handleLoginPopup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl px-4 transition-all font-bold shadow-md hover:shadow-indigo-100 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 brightness-0 invert" />
            )}
            {loading ? "Conectando..." : "Ingresar con Google (Popup)"}
          </button>

          <button 
            onClick={handleLoginRedirect}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 rounded-xl px-4 transition-all font-bold shadow-sm disabled:opacity-50 active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            ) : (
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            )}
            Ingresar con Redirección (Alternativo)
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-left">
            <div className="flex gap-2 text-rose-800 font-bold text-sm items-start mb-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 label-icon" />
              <span>Incidencia detectada</span>
            </div>
            <p className="text-xs text-rose-700 font-semibold leading-relaxed mb-3">
              {error}
            </p>
            
            {isUnauthorizedDomain && (
              <div className="pt-3 border-t border-rose-200/50 text-slate-700 space-y-2">
                <p className="font-bold text-slate-900 text-xs">🛠️ SOLUCIÓN PASO A PASO:</p>
                <ol className="list-decimal pl-4 space-y-1.5 font-medium text-[11px] text-slate-600">
                  <li>Copia el dominio de tu despliegue: <strong className="font-mono bg-white border border-rose-200 px-1.5 py-0.5 rounded select-all font-bold text-slate-950">{currentHostname}</strong></li>
                  <li>Inicia sesión en tu <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-bold hover:text-indigo-700 inline-flex items-center gap-0.5">Consola de Firebase (clic aquí)</a>.</li>
                  <li>Ingresa a tu proyecto, ve a la sección <strong>Authentication</strong> y selecciona la pestaña <strong>Settings (Ajustes/Configuración)</strong>.</li>
                  <li>Busca la opción <strong>Authorized domains / Dominios autorizados</strong> en el menú lateral o apartado principal.</li>
                  <li>Haz clic en <strong>Add domain (Agregar dominio)</strong>, pega <code className="bg-slate-100 px-1 rounded text-slate-950">{currentHostname}</code> y guarda los cambios.</li>
                  <li>Recarga la aplicación e intenta ingresar nuevamente.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-slate-400 text-center mt-8 uppercase font-bold tracking-[0.2em]">
          Arquitectura Segura • Versión Beta 1.0.0
        </p>
      </motion.div>
    </div>
  );
}
