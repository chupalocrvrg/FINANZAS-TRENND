const fs = require('fs');
const file = 'src/index.css';
let data = fs.readFileSync(file, 'utf8');

const newAnimations = `
@keyframes gradient-breathe {
  0% {
    background-size: 200% 200%;
    background-position: 0% 0%;
    filter: brightness(0.95);
  }
  50% {
    background-size: 300% 300%;
    background-position: 100% 100%;
    filter: brightness(1.05);
  }
  100% {
    background-size: 200% 200%;
    background-position: 0% 0%;
    filter: brightness(0.95);
  }
}

.bg-gradient-flow-light {
  /* Soft pastel gradient matching the image */
  background: linear-gradient(-45deg, #a1c4fd, #fbc2eb, #e0c3fc, #8ec5fc);
  background-size: 200% 200%;
  animation: gradient-breathe 12s ease-in-out infinite;
}

.bg-gradient-flow-dark {
  background: linear-gradient(-45deg, #0f172a, #312e81, #1e1b4b, #020617, #312e81);
  background-size: 200% 200%;
  animation: gradient-breathe 12s ease-in-out infinite;
}
`;

data = data.replace(/@keyframes gradient-xy \{[\s\S]*?\.bg-gradient-flow-dark \{[\s\S]*?\}\n/, newAnimations.trim() + '\n');

// Also ensure glass borders are very subtle
data = data.replace(/border-color: rgba\(255, 255, 255, 0\.3\) !important;/g, 'border-color: rgba(255, 255, 255, 0.15) !important;');
data = data.replace(/border-color: rgba\(255, 255, 255, 0\.08\) !important;/g, 'border-color: rgba(255, 255, 255, 0.05) !important;');

fs.writeFileSync(file, data);
