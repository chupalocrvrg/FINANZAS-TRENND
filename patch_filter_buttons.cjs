const fs = require('fs');
const file = 'src/components/Dashboard.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(/"text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"/g, 'isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-950"');
data = data.replace(/"text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"/g, 'isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-950"');

fs.writeFileSync(file, data);
