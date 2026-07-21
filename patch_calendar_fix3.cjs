const fs = require('fs');
const file = 'src/components/Dashboard.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace('                  )}\n                {/* Values stack */}', '                  )}\n                </div>\n                {/* Values stack */}');
fs.writeFileSync(file, data);
