const fs = require('fs');
const file = 'src/index.css';
let data = fs.readFileSync(file, 'utf8');

const newGradients = `
.bg-gradient-flow-light {
  background: linear-gradient(-45deg, #a1c4fd, #fbc2eb, #e0c3fc, #8ec5fc);
  background-size: 200% 200%;
  animation: gradient-breathe 12s ease-in-out infinite;
}

.bg-gradient-flow-dark {
  background: linear-gradient(-45deg, #0f172a, #312e81, #1e1b4b, #020617, #312e81);
  background-size: 200% 200%;
  animation: gradient-breathe 12s ease-in-out infinite;
}

/* Color Variants */
.bg-gradient-flow-light-teal {
  background: linear-gradient(-45deg, #84fab0, #8fd3f4, #a1c4fd, #96e6a1);
  background-size: 200% 200%;
  animation: gradient-breathe 12s ease-in-out infinite;
}
.bg-gradient-flow-dark-teal {
  background: linear-gradient(-45deg, #064e3b, #0f766e, #0369a1, #020617);
  background-size: 200% 200%;
  animation: gradient-breathe 12s ease-in-out infinite;
}

.bg-gradient-flow-light-purple {
  background: linear-gradient(-45deg, #e0c3fc, #fbc2eb, #a18cd1, #fbc2eb);
  background-size: 200% 200%;
  animation: gradient-breathe 12s ease-in-out infinite;
}
.bg-gradient-flow-dark-purple {
  background: linear-gradient(-45deg, #4c1d95, #7e22ce, #3b0764, #020617);
  background-size: 200% 200%;
  animation: gradient-breathe 12s ease-in-out infinite;
}

.bg-gradient-flow-light-orange {
  background: linear-gradient(-45deg, #f6d365, #fda085, #f6d365, #ffb199);
  background-size: 200% 200%;
  animation: gradient-breathe 12s ease-in-out infinite;
}
.bg-gradient-flow-dark-orange {
  background: linear-gradient(-45deg, #7c2d12, #9a3412, #451a03, #020617);
  background-size: 200% 200%;
  animation: gradient-breathe 12s ease-in-out infinite;
}
`;

data = data.replace(/\.bg-gradient-flow-light \{[\s\S]*?\.bg-gradient-flow-dark \{[\s\S]*?\}\n/, newGradients.trim() + '\n');
fs.writeFileSync(file, data);
