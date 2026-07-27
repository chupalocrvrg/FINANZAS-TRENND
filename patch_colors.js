const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/(--color-indigo-500: #10b981 !important;)/, "--color-indigo-400: #34d399 !important;\n        $1");
content = content.replace(/(--color-indigo-500: #f43f5e !important;)/, "--color-indigo-400: #fb7185 !important;\n        $1");
content = content.replace(/(--color-indigo-500: #f59e0b !important;)/, "--color-indigo-400: #fbbf24 !important;\n        $1");
content = content.replace(/(--color-indigo-500: #8b5cf6 !important;)/, "--color-indigo-400: #a78bfa !important;\n        $1");
content = content.replace(/(--color-indigo-500: #0ea5e9 !important;)/, "--color-indigo-400: #38bdf8 !important;\n        $1");
content = content.replace(/(--color-indigo-500: #64748b !important;)/, "--color-indigo-400: #94a3b8 !important;\n        $1");

fs.writeFileSync('src/App.tsx', content);
