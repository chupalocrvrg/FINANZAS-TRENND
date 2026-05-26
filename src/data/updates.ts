export interface UpdateItem {
  id: string;
  version: string;
  title: string;
  date: string;
  description: string;
  type: 'feature' | 'security' | 'core' | 'interface';
}

export const SYSTEM_UPDATES: UpdateItem[] = [
  {
    id: "v_25_5_28_camera_dup",
    version: "Versión 25.5.28",
    title: "Cámara In-App Real, Prevención de Registro Duplicado y Traducción Global",
    date: "26-Mayo-2026, 12:00:00",
    description: "Integración directa de cámaras web del dispositivo para capturas de recibos en tiempo real mediante el Asistente AI sin simulaciones. Implementa un motor de validación contra registros duplicados (vía Correo, Clave, PIN en Servicios Digitales, y Referencia/Factura en ANT). Se ha unificado el sistema i18n para proveer traducciones fluidas en Español e Inglés de manera global.",
    type: "feature"
  },
  {
    id: "v_25_5_27_assistant",
    version: "Version 25.5.27",
    title: "Asistente Inteligente AI de Alta Precisión",
    date: "25-Mayo-2026, 20:30:00",
    description: "Sincronización total del Asistente Virtual utilizando el SDK oficial Google GenAI avanzado de alto rendimiento. Implementa orden de turnos e inmunidad a errores de conversación en el backend express, asegurando respuestas instantáneas, precisas y perfectas al adjuntar transacciones por capturas de pantalla o consultar guías de uso del sistema.",
    type: "core"
  },
  {
    id: "v_25_5_26_tutorial",
    version: "Versión 25.5.26",
    title: "Tutorial Interactivo para Nuevos Usuarios",
    date: "25-Mayo-2026, 19:15:00",
    description: "Activación automática de un módulo de tutorial interactivo (stepper) para usuarios nuevos que completan su onboarding. Enseña paso a paso las características y funciones principales del sistema como el panel de comando, gestión de cuentas de streaming, control de tesorería multimoneda y automatización por Inteligencia Artificial.",
    type: "feature"
  },
  {
    id: "v_25_5_25_personalization",
    version: "Versión 25.5.25",
    title: "Módulo de Personalización Avanzada y Temas",
    date: "25-Mayo-2026, 18:20:00",
    description: "Unificación del motor de interfaz dentro de personalización global. Permite de forma centralizada alternar temas (Claro, Oscuro, Sistema), cargar una foto de perfil personalizada o usar el avatar original de su cuenta de Google, elegir paletas completas de acentos de color (Esmeralda, Rosa, Ámbar, Violeta, Cielo, Pizarra) y cambiar tipografías elegantes (Inter, Outfit, Space Grotesk, Playfair Display, JetBrains Mono). Disponibilidad multilingüe en Español e Inglés.",
    type: "interface"
  },
  {
    id: "v_25_5_24_purge",
    version: "Versión 25.5.24",
    title: "Privacidad y Borrado Seguro con PIN",
    date: "25-Mayo-2026, 13:40:00",
    description: "Integración del módulo de privacidad expreso para el control absoluto de sus datos. Permite purgar por completo todos los registros de la base de datos (ventas, deudas, cuentas, bancos) de forma segura y permanente, requiriendo la confirmación explícita mediante su PIN secreto de 4 dígitos creado en el Onboarding.",
    type: "security"
  },
  {
    id: "v_25_5_20_scurity",
    version: "Versión 25.5.20",
    title: "Inmunidad Estructural contra Inyecciones SQL & NoSQL",
    date: "20-Mayo-2026, 10:15:00",
    description: "Inmunización de registros de transacciones contra ataques de inyección. Con la base de datos distribuida NoSQL Google Firebase Firestore y reglas estrictas de autorización en firestore.rules, el sistema filtra y valida cada escritura limitando cualquier modificación no documentada de forma robusta e infranqueable.",
    type: "security"
  }
];
