const fs = require('fs');
const file = 'src/index.css';
let data = fs.readFileSync(file, 'utf8');

if (!data.includes('html { font-size: 105%; }')) {
  data += '\nhtml { font-size: 105%; }\n';
  fs.writeFileSync(file, data);
}
