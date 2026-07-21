const fs = require('fs');
const file = 'src/index.css';
let data = fs.readFileSync(file, 'utf8');

const shadowRules = `
body[data-theme="light"][data-ui-style="liquid_glass"] p,
body[data-theme="light"][data-ui-style="liquid_glass"] span,
body[data-theme="light"][data-ui-style="liquid_glass"] h1,
body[data-theme="light"][data-ui-style="liquid_glass"] h2,
body[data-theme="light"][data-ui-style="liquid_glass"] h3,
body[data-theme="light"][data-ui-style="liquid_glass"] h4,
body[data-theme="light"][data-ui-style="liquid_glass"] div {
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8), 0 0 2px rgba(255, 255, 255, 0.5);
}

body[data-theme="dark"][data-ui-style="liquid_glass"] p,
body[data-theme="dark"][data-ui-style="liquid_glass"] span,
body[data-theme="dark"][data-ui-style="liquid_glass"] h1,
body[data-theme="dark"][data-ui-style="liquid_glass"] h2,
body[data-theme="dark"][data-ui-style="liquid_glass"] h3,
body[data-theme="dark"][data-ui-style="liquid_glass"] h4,
body[data-theme="dark"][data-ui-style="liquid_glass"] div {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}
`;

if (!data.includes('rgba(0, 0, 0, 0.8)')) {
  data += '\n' + shadowRules + '\n';
  fs.writeFileSync(file, data);
}
