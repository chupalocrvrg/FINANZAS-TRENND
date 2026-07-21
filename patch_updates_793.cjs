const fs = require('fs');
const file = 'src/data/updates.ts';
let data = fs.readFileSync(file, 'utf8');

const newUpdate = `  {
    id: "v_7_9_3_calendar_and_contrast",
    version: "V7.9.3",
    title: "V7.9.3 • Calendario Interactivo, Escala Visual y Contraste",
    date: "20-Julio-2026, 19:35:00",
    description: "Se agregaron indicadores directos de Cuentas por Cobrar y Cortes de servicio dentro de las casillas del calendario. Se incrementó la escala visual del texto universalmente. Se corrigió el contraste de texto en los modales de Cuentas por Pagar/Cobrar y de Novedades en modo claro. Además, el panel de notificaciones ahora se cierra automáticamente al navegar a otra sección.",
    type: "feature"
  },
`;

data = data.replace('export const SYSTEM_UPDATES: UpdateItem[] = [', 'export const SYSTEM_UPDATES: UpdateItem[] = [\n' + newUpdate);
fs.writeFileSync(file, data);
