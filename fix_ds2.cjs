const fs = require('fs');
let data = fs.readFileSync('src/components/DigitalServices.tsx', 'utf8');

// The one at 2227:
data = data.replace(/<\/p>\n\s*<\/div>\)\}\n\s*<div className="grid grid-cols-1/g, '</p>\n                  </div>\n                  <div className="grid grid-cols-1');

// Any others?
data = data.replace(/<\/div>\)\}/g, '</div>');

fs.writeFileSync('src/components/DigitalServices.tsx', data);
