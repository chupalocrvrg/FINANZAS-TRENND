const fs = require('fs');
const file = 'src/components/WelcomeUpdateModal.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  'isDark ? "text-slate-400 border-slate-800 hover:bg-slate-800" : "text-slate-500 border-slate-100 hover:bg-slate-50"',
  'isDark ? "text-slate-400 border-slate-800 hover:bg-slate-800" : "text-slate-700 border-slate-300 hover:bg-slate-200/50"'
);

fs.writeFileSync(file, data);
