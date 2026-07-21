const fs = require('fs');
const file = 'src/components/Dashboard.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  '<button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 transition-colors self-start p-1 cursor-pointer">',
  '<button onClick={() => setActiveModal(null)} className={cn("transition-colors self-start p-1 cursor-pointer", isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")}>'
);

fs.writeFileSync(file, data);
