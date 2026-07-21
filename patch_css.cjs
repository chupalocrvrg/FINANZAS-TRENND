const fs = require('fs');
const file = 'src/index.css';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  'body[data-ui-style="liquid_glass"] .bg-white {',
  'body[data-ui-style="liquid_glass"] .bg-white,\nbody[data-ui-style="liquid_glass"] .bg-slate-50,\nbody[data-ui-style="liquid_glass"] .bg-slate-100,\nbody[data-ui-style="liquid_glass"] .bg-slate-200 {'
);

fs.writeFileSync(file, data);
