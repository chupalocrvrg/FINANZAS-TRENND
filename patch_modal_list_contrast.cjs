const fs = require('fs');
const file = 'src/components/Dashboard.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  '<p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate mt-0.5">{relativeLabel} • {px.description || \'Sin detalles\'}</p>',
  '<p className={cn("text-[10px] font-black uppercase tracking-widest truncate mt-0.5", isDark ? "text-slate-400" : "text-slate-600")}>{relativeLabel} • {px.description || \'Sin detalles\'}</p>'
);

data = data.replace(
  '<p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">',
  '<p className={cn("text-[10px] uppercase tracking-widest mt-0.5 font-bold", isDark ? "text-slate-400" : "text-slate-600")}>'
);

data = data.replace(
  '<p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">',
  '<p className={cn("text-[10px] uppercase tracking-widest mt-0.5 font-bold", isDark ? "text-slate-400" : "text-slate-600")}>'
);

fs.writeFileSync(file, data);
