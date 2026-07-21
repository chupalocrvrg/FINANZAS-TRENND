const fs = require('fs');
const file = 'src/components/Dashboard.tsx';
let data = fs.readFileSync(file, 'utf8');

const errorBlock = `                  )}
                {/* Values stack */}`;

data = data.replace(errorBlock, '                  )}\n                </div>\n                {/* Values stack */}');
fs.writeFileSync(file, data);
