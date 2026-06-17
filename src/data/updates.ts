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
    id: "v_5_5_0_unified_fab_recurrent_expenses",
    version: "V5.5.0",
    title: "V5.5.0 • Unificación de Botonera Flotante y Sugerencia de Gastos Recurrentes",
    date: "17-Junio-2026, 15:30:00",
    description: "Consolidación de la experiencia de registro y soporte en un único e intuitivo Botón Flotante Central en la esquina inferior derecha. Este control unificado despliega el menú interactivo que ahora incluye acceso directo con efectos de alta fidelidad al Asistente Inteligente (Gemini). Además, se incorporó un módulo de chips de asistencia rápida para Egresos y Gastos Recurrentes (Internet, Tarjetas de Crédito, Arriendos, Servicios Públicos) que rellenan instantáneamente la transacción financiera y configuran de forma automatizada las periodicidades y cuentas correspondientes.",
    type: "feature"
  },
  {
    id: "v_5_4_0_zero_key_local_extractor",
    version: "V5.4.0",
    title: "V5.4.0 • Extractor de Cuentas y Trámites Autónomo Sin Clave API",
    date: "17-Junio-2026, 11:15:00",
    description: "Integración del nuevo Extractor Autónomo Inteligente optimizado para funcionar 100% offline y de manera local sin requerir de Claves de API de Gemini ni de conexiones externas. El sistema es ahora capaz de identificar de manera instantánea correos, claves, PINs, perfiles, precios y costos de cuentas de streaming, así como abonos o trámites ANT a partir de textos o chats de WhatsApp copiados, eliminando por completo la necesidad de configurar o actualizar claves API de forma manual.",
    type: "feature"
  },
  {
    id: "v_5_3_1_notification_credentials_search",
    version: "V5.3.1",
    title: "V5.3.1 • Filtrado de Servicios por Correo de Cuenta Activa",
    date: "12-Junio-2026, 05:52:00",
    description: "Optimización quirúrgica en el sistema de alertas y su redirección. Las notificaciones y paneles ahora presentan el correo de acceso exacto del servicio (p. ej. Netflix). Al hacer clic en la alerta, el sistema filtra de manera específica por el correo electrónico del servicio afectado, evitando la sobreexposición de otros servicios del mismo distribuidor o revendedor.",
    type: "feature"
  },
  {
    id: "v_5_3_0_notifications_deeplink_and_alerts_search",
    version: "V5.3.0",
    title: "V5.3.0 • Sistema de Deep-Linking en Notificaciones Push, SW En Rutado y Buscador de Cobranza",
    date: "12-Junio-2026, 05:40:00",
    description: "Implementación del motor avanzado de Deep-Linking en las Alertas de Notificación del Sistema. El Service Worker ahora procesa los clics en notificaciones, abriendo o desviando el foco al módulo preciso. Integración de enrutamiento por eventos automatizado que filtra la cuenta cliqueada al instante mediante el popover. Adición de una barra de búsqueda inteligente y optimizada con soporte completo para filtros en Alertas y Cobranza, junto al motor activo de monitoreo en tiempo real de abonos y cuentas digitales vencidas.",
    type: "feature"
  },
  {
    id: "v_5_2_1_updates_panel",
    version: "V5.2.1",
    title: "V5.2.1 • Recuperación de PIN, Panel de Vencimientos, Rentabilidad y MRR Recurrente",
    date: "08-Junio-2026, 03:45:00",
    description: "Inclusión de la recuperación segura de PIN de bloqueo en pantalla a través de la cuenta verificada del propietario. Activación de un panel dinámico de filtros interactivos por categorías de vencimiento, que agrupa y resalta servicios según su gravedad temporal (Expirado, Por Vencer, Al Día). Integración de una métrica avanzada de rentabilidad operativa en tiempo real que calcula márgenes detallados contra costos de proveedores, junto con la estimación automatizada de Ingresos Recurrentes Mensuales (MRR) de la cartera comercial para un control financiero de nivel superior.",
    type: "feature"
  },
  {
    id: "v_4_2_0_automated_durations_and_expired_cleanup",
    version: "V4.2.0 (2.4.1)",
    title: "V4.2.0 (2.4.1) • Asignación Autónoma de Vigencias y Purga de Cuentas Overdue sin Afectación de Clientes",
    date: "28-Mayo-2026, 15:45:00",
    description: "Incorporación del motor semántico de asignación de vigencias para suscripciones digitales que asocia automáticamente 30 días de cobertura o interpreta de forma inteligente duraciones personalizadas en base a descripciones del servicio y comentarios de proveedores. Adicionalmente, se activó la rutina de depuración en segundo plano que localiza y purga de forma permanente del sistema las cuentas con más de 3 días de expiración sin renovación registrada, salvaguardando en su totalidad el CRM e historial original del cliente.",
    type: "feature"
  },
  {
    id: "v_4_1_0_conversational_entity_mapping",
    version: "V4.1.0 (2.4.0)",
    title: "V4.1.0 (2.4.0) • Mapeo Multilateral de Socios y Creación In-Chat Directa de Clientes / Revendedores",
    date: "28-Mayo-2026, 14:15:00",
    description: "Refactorización integral en las tarjetas de confirmación del Asistente Virtual Gemini. Se ha incorporado soporte para segmentar y visualizar compradores en tres tipologías (Clientes Finales, Revendedores e Intermediarios). Adicionalmente, se implementó el motor de registro conversacional in-chat que posibilita la creación instantánea de parejas comerciales autónomamente en la base de datos de Firestore sin abandonar la conversación.",
    type: "feature"
  },
  {
    id: "v_4_0_0_unified_statements_batch_operations_and_sidebar_refinement",
    version: "V4.0.0",
    title: "V4.0.0 • Sistema de Notificaciones Multi-Canal (PDF/PNG/TXT), Comprobación Masiva de Trámites y Refinamiento Estético",
    date: "28-Mayo-2026, 09:55:00",
    description: "Gran evolución estructural: Integración de la pasarela de avisos en tres formatos (Texto plano, Imagen HD y Reporte PDF formal) para deudas individuales y grupales. Activación de casillas de verificación en Trámites ANT para marcados masivos en lote y descargas unificadas de liquidación. Generación automática de vales y recibos digitales tras abonos parciales o liquidaciones. Refinamiento estético eliminando bloques redundantes del dashboard, remoción del cuadrado flotante en Sidebar y corrección de contraste en el protocolo oscuro.",
    type: "feature"
  },
  {
    id: "v_3_1_0_universal_excel_backups_and_cascading_privacy",
    version: "V3.1.0",
    title: "Módulo Excel Universal, Pestañas en Cascada y Purga Integrada en Privacidad",
    date: "27-Mayo-2026, 14:00:00",
    description: "Inauguración de la exportación e importación avanzada en formatos Excel (.xlsx y .xls) estructurando los datos comerciales en pestañas independientes para facilidad de control manual. Integración tipo cascada colapsable automática para la gestión de Copias de Seguridad y Migración. Reubicación unificada de la Provisión de Eliminación Segura (Purga Total con PIN de seguridad) directamente dentro de la sección de Privacidad y Seguridad. Desplazamiento del panel de Información y Control de Módulos al final absoluto de la pantalla de configuración.",
    type: "feature"
  },
  {
    id: "v_3_0_5_wallet_transfers_and_comprehensive_receipts",
    version: "V3.0.5",
    title: "Transferencias entre Billeteras, Recibos Dinámicos Multi-Abonos y Guía de Soporte ANT",
    date: "27-Mayo-2026, 01:30:00",
    description: "Implementación del módulo de transferencias financieras de saldo entre billeteras con comentarios históricos auditables. Adición de un motor de comprobantes dinámicos para abonos parciales y cobros totales asociados a intermediarios, proveedores, revendedores y clientes finales con botones de emisión, descarga PDF/PNG y compartir vía WhatsApp. Sincronización de la guía interactiva para verificación e inspección de actualización de datos de facturas en el SRI y la ANT. Soporte extendido para lectura nativa de adjuntos PDF y XML en el asistente virtual.",
    type: "feature"
  },
  {
    id: "v_3_0_4_reporting_billing_and_pricing",
    version: "V3.0.4",
    title: "Reportes Avanzados, Copias de Seguridad, Comprobantes y Depuración del Protocolo",
    date: "26-Mayo-2026, 16:35:00",
    description: "Inauguración de Reportes avanzados con generación dinámica PDF/Excel. Adición de importación/exportación JSON nativa en configuración. Diseño de comprobantes y recibos de transacciones descargables en PDF/PNG listos para compartir en WhatsApp. Depuración de la interfaz eliminando la etiqueta de versión redundante fuera de los módulos de configuración.",
    type: "feature"
  },
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
