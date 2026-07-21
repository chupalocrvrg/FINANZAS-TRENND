const fs = require('fs');
const file = 'src/data/updates.ts';
let data = fs.readFileSync(file, 'utf8');

const newUpdate = `  {
    id: "v_7_9_1_liquid_glass_breathing",
    version: "V7.9.1",
    title: "V7.9.1 • Gradientes Dinámicos y Opacidad en Liquid Glass",
    date: "20-Julio-2026, 16:15:00",
    description: "Refinamiento visual del motor Liquid Glass. Se ha incorporado una animación orgánica ('breathing gradient') que atenúa y expande suavemente los fondos coloridos para simular fluidez, similar a una malla Aurora. Asimismo, se redujo drásticamente la opacidad de los bordes blancos en las tarjetas para lograr un efecto de cristal esmerilado más inmersivo y sutil.",
    type: "interface"
  },
`;

data = data.replace('export const SYSTEM_UPDATES: UpdateItem[] = [', 'export const SYSTEM_UPDATES: UpdateItem[] = [\n' + newUpdate);
fs.writeFileSync(file, data);
