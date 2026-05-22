import React from 'react';
import { signInWithGoogle } from '../lib/firebase';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export function Login() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <LogIn className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Control Financiero</h1>
          <p className="text-slate-500 text-sm mt-2">Sistema Control Financiero (Beta 1.0.0)</p>
        </div>

        <button 
          onClick={() => signInWithGoogle()}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-3 rounded-xl px-4 hover:bg-slate-50 transition-all font-bold text-slate-700 shadow-sm active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Login with Google
        </button>

        <p className="text-[10px] text-slate-400 text-center mt-8 uppercase font-bold tracking-[0.2em]">
          Arquitectura Segura • Versión Beta 1.0.0
        </p>
      </motion.div>
    </div>
  );
}
