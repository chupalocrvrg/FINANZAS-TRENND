const fs = require('fs');

function replaceFile(file, replacements) {
  let data = fs.readFileSync(file, 'utf8');
  for (const [target, repl] of replacements) {
    data = data.replace(target, repl);
  }
  fs.writeFileSync(file, data);
}

replaceFile('src/components/Dashboard.tsx', [
  ['<p className="text-slate-500 font-mono font-bold mt-1">', '<p className={cn("font-mono font-bold mt-1", isDark ? "text-slate-500" : "text-slate-700")}>'],
  ['<span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Filtrar por Ecosistema CRM</span>', '<span className={cn("text-[9px] font-black uppercase tracking-widest px-1", isDark ? "text-slate-400" : "text-slate-600")}>Filtrar por Ecosistema CRM</span>'],
  ['<span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Visualización</span>', '<span className={cn("text-[9px] font-black uppercase tracking-widest px-1", isDark ? "text-slate-400" : "text-slate-600")}>Visualización</span>'],
  ['<span className="text-slate-400 uppercase tracking-widest text-[9px] font-black">Total en Selección Activa:</span>', '<span className={cn("uppercase tracking-widest text-[9px] font-black", isDark ? "text-slate-400" : "text-slate-600")}>Total en Selección Activa:</span>'],
  ['<p className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate mt-0.5">', '<p className={cn("text-[10px] font-black uppercase tracking-widest truncate mt-0.5", isDark ? "text-slate-500" : "text-slate-600")}>'],
  ['relative w-full max-w-2xl p-6 lg:p-8 rounded-3xl border shadow-2xl flex flex-col max-h-[85vh]', 'relative w-full max-w-2xl p-6 lg:p-8 rounded-3xl border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden'],
  ['overflow-y-auto flex-1 pr-2 min-h-[300px]', 'overflow-y-auto flex-1 pr-2 min-h-0'],
  ['No hay cuentas por cobrar en esta selección', 'No hay registros en esta selección'],
]);

replaceFile('src/components/WelcomeUpdateModal.tsx', [
  ['<p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">', '<p className={cn("text-xs font-bold mt-0.5", isDark ? "text-slate-400" : "text-slate-700")}>'],
  ['<h4 className={cn("text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200")}>', '<h4 className={cn("text-xs font-black uppercase tracking-wider", isDark ? "text-slate-200" : "text-slate-800")}>'],
  ['<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed font-semibold">', '<p className={cn("text-xs mt-0.5 leading-relaxed font-semibold", isDark ? "text-slate-400" : "text-slate-600")}>'],
]);

console.log("Done patching contrast.");
