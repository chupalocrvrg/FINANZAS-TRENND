const fs = require('fs');
const file = 'src/data/updates.ts';
let data = fs.readFileSync(file, 'utf8');

const newUpdate = `  {
    id: "v_7_9_2_liquid_glass_variants",
    version: "V7.9.2",
    title: "V7.9.2 • Variantes Cromáticas y Correcciones de Dashboard",
    date: "20-Julio-2026, 17:35:00",
    description: "Se han integrado 4 nuevas variaciones cromáticas (Pastel, Teal, Amatista y Ámbar) para el motor Liquid Glass en Ajustes. Además, se ajustó la fórmula de 'Ganancias Aproximadas' para que incluya las Cuentas por Cobrar. También se corrigió el contraste de texto en las tarjetas del dashboard durante el uso del Modo Claro y se estandarizó el color de fondo para la tarjeta de Cuentas por Pagar.",
    type: "feature"
  },
`;

data = data.replace('export const SYSTEM_UPDATES: UpdateItem[] = [', 'export const SYSTEM_UPDATES: UpdateItem[] = [\n' + newUpdate);
fs.writeFileSync(file, data);
