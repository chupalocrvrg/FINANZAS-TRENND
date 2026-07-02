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
    id: "v_7_5_1_system_audit_and_offline_robustness",
    version: "V7.5.1",
    title: "V7.5.1 • Auditoría de Conexiones y Robustez Offline/Online",
    date: "01-Julio-2026, 18:48:00",
    description: "Se realizó una auditoría completa del sistema para garantizar la concordancia entre bases de datos de perfiles multi-categorías. Se actualizaron los filtros de referencias en módulos clave (Dashboard, DigitalServices, Transactions, Asistente AI) para buscar dentro de la matriz de tipos de entidad (types) en lugar de depender únicamente del campo de tipo unitario tradicional (type). Asimismo, se validó la configuración de persistencia Firestore offline garantizando que las consultas funcionen de forma idéntica en modo conectado y desconectado con sincronización asíncrona robusta.",
    type: "core"
  },
  {
    id: "v_7_5_0_crm_unified_multicategory_filters",
    version: "V7.5.0",
    title: "V7.5.0 • Unificación de CRM con Filtro Inteligente y Multi-Categorías",
    date: "01-Julio-2026, 10:10:00",
    description: "Se unificó por completo la interfaz del CRM en un listado global, eliminando las pestañas rígidas anteriores. En su lugar, se implementó un motor de Filtro Inteligente multi-selección que permite filtrar dinámicamente contactos por cualquier combinación de roles (Clientes, Revendedores, Intermediarios, Proveedores y Actualizadores ANT). Asimismo, se rediseñaron los formularios de creación y edición para permitir asignar múltiples categorías simultáneamente a una sola persona con casillas marcables de alta fidelidad, brindando total flexibilidad para contactos con múltiples roles comerciales.",
    type: "feature"
  },
  {
    id: "v_7_4_0_payment_consolidation_and_public_portal_grids",
    version: "V7.4.0",
    title: "V7.4.0 • Multi-Cuentas en Portal de Clientes y Consolidación de Cuentas Bancarias",
    date: "01-Julio-2026, 09:43:52",
    description: "Se unificó y consolidó por completo la configuración de cuentas bancarias y billeteras de pago directamente en el módulo de Tesorería, eliminando la sección redundante de Ajustes. El Portal Público del Cliente y los comprobantes individuales de Vales/Recibos de Pago ahora listan dinámicamente todas las cuentas bancarias autorizadas que posean un número de cuenta registrado, ocultando automáticamente aquellas que no tengan datos configurados, asegurando la privacidad del comercio y facilitando los reportes de transferencias para los clientes.",
    type: "feature"
  },
  {
    id: "v_7_3_0_custom_sales_templates_and_payment_centralization",
    version: "V7.3.0",
    title: "V7.3.0 • Plantillas Dinámicas de WhatsApp, Consolidación de Cobros y Horarios Ecuador",
    date: "01-Julio-2026, 08:31:51",
    description: "Se implementó el nuevo motor de plantillas personalizables de WhatsApp para ventas de servicios en Ajustes, soportando etiquetas inteligentes como {cliente}, {servicio}, {usuario}, {clave}, {pin}, {vencimiento} y {empresa} para automatizar la redacción con un solo clic. Se centralizó la configuración de números de cuentas bancarias y enlaces de pago directamente dentro de la sección de Cuentas Bancarias y Billeteras, reestructurando el formulario de Configuración para mayor coherencia operativa. Finalmente, se sincronizaron los registros e historiales de actualización de sistema bajo la zona horaria oficial de Ecuador continental (GMT-5).",
    type: "feature"
  },
  {
    id: "v_7_2_0_payment_gateways_and_randomized_portal",
    version: "V7.2.0",
    title: "V7.2.0 • Métodos de Pago Flexibles, Enlaces de Portal Ofuscados y QR Scanner Autonómo",
    date: "01-Julio-2026, 08:10:00",
    description: "Se integró soporte multi-moneda y pasarelas de cobro personalizadas en Ajustes (Mejora 1) donde los comercios configuran sus números de cuenta o enlaces de Binance Pay y PayPal. Para máxima seguridad de datos (Mejora 2), se reemplazó la estructura de enlaces públicos legibles por tokens de acceso de un solo uso ofuscados, vinculando automáticamente cada cliente a su propio identificador único aleatorio e indescifrable en Firestore. Finalmente, se diseñó el nuevo generador interactivo de Códigos QR de Pago (Mejora 4) para escaneos directos sin dependencias, acelerando la conciliación de saldos.",
    type: "feature"
  },
  {
    id: "v_7_1_0_security_signatures_and_branding",
    version: "V7.1.0",
    title: "V7.1.0 • Seguridad Avanzada, Firma Digital de Enlaces y Personalización de Marca",
    date: "01-Julio-2026, 07:45:00",
    description: "Se implementó un motor de firma criptográfica local para proteger los enlaces del portal público de clientes (anti-peeking), impidiendo que se modifiquen parámetros de consulta para ver información ajena. Asimismo, se integró personalización de marca inteligente que carga dinámicamente el logotipo y el nombre de la tienda del comercio en la cabecera del portal. Finalmente, se diseñó la nueva plantilla ultra-reducida y estética de WhatsApp con soporte para negritas nativas y emojis informativos para el envío de cuentas.",
    type: "security"
  },
  {
    id: "v_7_0_0_client_public_portal",
    version: "V7.0.0",
    title: "V7.0.0 • Lanzamiento de Portal de Consulta de Clientes y Recibos Online",
    date: "01-Julio-2026, 06:45:00",
    description: "Se diseñó y desplegó el nuevo Portal Público de Consulta para Clientes y comprobantes online. Este portal permite a los clientes finales consultar en tiempo real el estado detallado de todas sus cuentas, visualizar credenciales de acceso de forma segura contra miradas indiscretas, y revisar todas las cuentas por cobrar pendientes (servicios digitales, trámites ANT y préstamos personales en curso). Adicionalmente, se habilitó la emisión y descarga de recibos digitales de caja y estados de cuenta en PDF directamente en el cliente, eliminando la necesidad de adjuntar o transferir archivos PDF pesados por WhatsApp.",
    type: "feature"
  },
  {
    id: "v_6_8_0_advanced_filters_and_offline_fixes",
    version: "V6.8.0",
    title: "V6.8.0 • Filtros Avanzados de Búsqueda y Estabilización Offline",
    date: "30-Junio-2026, 21:55:00",
    description: "Se implementó un completo motor de filtros avanzados en la sección de búsqueda de Servicios Digitales, permitiendo filtrar de forma precisa por proveedor, producto, rangos de fecha de corte o vencimiento, y fecha de venta/registro. Adicionalmente, se robusteció la estabilidad del modo offline al remover importaciones dinámicas de Firestore en eventos y asegurar que las notificaciones locales se ejecuten de manera no bloqueante, evitando que el sistema quede en estados de carga permanentes.",
    type: "feature"
  },
  {
    id: "v_6_7_2_ai_assistant_key_config_removed",
    version: "V6.7.2",
    title: "V6.7.2 • Centralización de Clave API y Correcciones Visuales",
    date: "24-Junio-2026, 13:45:00",
    description: "Se ha eliminado la opción de agregar la clave de API directamente en la interfaz del asistente para simplificarla. La configuración ahora se realiza exclusivamente desde el menú de Configuración. También se removió un mensaje emergente de mantenimiento que se mostraba en la interfaz.",
    type: "feature"
  },
  {
    id: "v_6_7_1_ai_assistant_fab_restored",
    version: "V6.7.1",
    title: "V6.7.1 • Restauración del Botón Flotante para Asistente Inteligente",
    date: "24-Junio-2026, 12:22:00",
    description: "Se ha restaurado el botón flotante dedicado exclusivamente al Asistente Inteligente (IA), luego de remover las otras funcionalidades del botón principal.",
    type: "feature"
  },
  {
    id: "v_6_7_0_quickadd_removal",
    version: "V6.7.0",
    title: "V6.7.0 • Remoción de Botón Flotante (Quick Add)",
    date: "24-Junio-2026, 12:17:00",
    description: "Se ha eliminado el componente Botón Flotante (Quick Add) por solicitud del usuario para simplificar la interfaz. Se mantiene únicamente el Asistente Inteligente (IA) como botón flotante de acciones avanzadas.",
    type: "feature"
  },
  {
    id: "v_6_6_3_quick_add_wallet_sync_fix",
    version: "V6.6.3",
    title: "V6.6.3 • Sincronización Automática de Tesorería en Módulo Rápido",
    date: "24-Junio-2026, 11:47:00",
    description: "Corrección y optimización del Botón Flotante Inteligente. Las ventas (Servicios Digitales y Trámites ANT) ahora detectan automáticamente intención de pago en lenguaje natural ('pagado', 'transferencia', 'cancelado') y habilitan un selector de caja destino. Adicionalmente, se integra un script de auto-reparación en tiempo real que sincroniza las ventas del día actual con su respectiva caja principal.",
    type: "feature"
  },
  {
    id: "v_6_6_2_pdf_accounts_receivable_sync",
    version: "V6.6.2",
    title: "V6.6.2 • Sincronización Integral de Cuentas por Cobrar en Estados de Cuenta PDF",
    date: "24-Junio-2026, 11:45:00",
    description: "Expande la estructura del motor de reportes en PDF (Estados de Cuenta) para consolidar y visualizar absolutamente todas las cuentas por cobrar pendientes. Ahora, el reporte final correlaciona de forma unificada las ventas de servicios digitales, préstamos directos y trámites ingresados mediante el Botón Flotante (Quick Add) que aún no han sido liquidados, otorgando un estado financiero exacto y transparente.",
    type: "feature"
  },
  {
    id: "v_6_6_1_expiration_warning_threshold_refinement",
    version: "V6.6.1",
    title: "V6.6.1 • Optimización del Umbral de Anticipación para Alertas de Cuentas por Vencer",
    date: "21-Junio-2026, 18:00:00",
    description: "Ajusta con precisión milimétrica el sistema de alertas tempranas de vencimiento. Modifica los umbrales de anticipación a un máximo estricto de 2 días de antelación previo a la fecha de corte, alineando de forma íntegra las notificaciones push locales, el popover de resumen y el estado cromático de aviso en el módulo de suscripciones digitales.",
    type: "feature"
  },
  {
    id: "v_6_6_0_offline_resilience_receipt_privacy",
    version: "V6.6.0",
    title: "V6.6.0 • Resiliencia Offline sin Internet, Contraste de Cobros y Privacidad Selectiva de Cuentas en Recibos",
    date: "21-Junio-2026, 19:45:00",
    description: "Despliega una arquitectura Offline robusta: el Service Worker ahora intercepta y resuelve peticiones de navegación directamente desde la caché local, y el proveedor de autenticación inicia inmediatamente desde el almacenamiento persistente los datos de usuario y preferencias si no hay cobertura de internet. Incrementa el contraste de texto/fondo del selector de cajas y entrada de saldo en el panel de Cobros. Adicionalmente, implementa el filtro de Privacidad Selectiva de Cuentas: los destinatarios liquidados o sin balances pendientes (no endeudados) ya no recibirán ni visualizarán los números de cuentas bancarias y códigos de pago en ningún formato (texto WhatsApp, imagen de alta resolución o PDF de liquidación).",
    type: "feature"
  },
  {
    id: "v_6_5_1_loans_wallet_refinement",
    version: "V6.5.1",
    title: "V6.5.1 • Precisión Contable en Préstamos (Débito Inmediato y Abono de Retorno)",
    date: "19-Junio-2026, 18:55:00",
    description: "Corrige y perfecciona el flujo de caja para Préstamos en Tesorería. Al registrar el préstamo, el sistema ahora exige la billetera origen y deduce el dinero de inmediato (débito). Al cobrarse el préstamo de vuelta en el panel de Cuentas por Cobrar (AR), se abona (incrementa) la billetera seleccionada por el usuario con el monto devuelto, soportando adecuadamente amortizaciones parciales o totales de la cartera.",
    type: "feature"
  },
  {
    id: "v_6_5_0_notification_linking_whatsapp_billing_loans",
    version: "V6.5.0",
    title: "V6.5.0 • Enrutamiento por Service Worker, Credenciales en Recoratorios de WhatsApp y Módulo de Préstamos en Tesorería",
    date: "19-Junio-2026, 15:30:00",
    description: "Introduce un sistema robusto de navegación interactiva y enfoque en Service Workers mediante postMessage para redirección instantánea de notificaciones. Integra credenciales de correo electrónico en los mensajes de recordatorio de WhatsApp. Ajusta el cálculo del saldo del periodo de renovación para no duplicar los montos de costos del proveedor. Finalmente, lanza una sección de sugerencias de ingresos y egresos en Tesorería, incluyendo el registro de 'Préstamos' autovinculados automáticamente al panel de Cuentas por Cobrar (AR).",
    type: "feature"
  },
  {
    id: "v_6_4_0_owasp_audit_logging_credential_masking",
    version: "V6.4.0",
    title: "V6.4.0 • Escudo de Privacidad de Credenciales, Prevención Shoulder-Surfing y Auditoría de Seguridad OWASP (A09)",
    date: "19-Junio-2026, 10:00:00",
    description: "Fortalece la seguridad visual mediante el enmascaramiento automático de credenciales (claves y PINs de acceso) en las fichas de servicios digitales contra miradas indiscretas, introduciendo botones de revelación temporal. Además, despliega el nuevo panel modular de Auditoría OWASP (Categoría A09:2021) que genera de manera local un rastro no repudiable de eventos críticos, registrando intentos de bloqueo, accesos exitosos/fallidos, restablecimientos y descargas de copias de seguridad.",
    type: "security"
  },
  {
    id: "v_6_3_0_owasp_security_hardening",
    version: "V6.3.0",
    title: "V6.3.0 • Blindaje de Seguridad Integral OWASP (Zero-Trust, Sanitización e ID Validation)",
    date: "19-Junio-2026, 09:00:00",
    description: "Implementa el modelo Zero-Trust en toda la capa de API de Node/Express. Introduce middleware de validación criptográfica y autenticación JWT para tokens de Firebase Auth, sanitización estricta de cadenas de caracteres e inyecciones HTML en endpoints de asistencia Gemini, y robustece las políticas de cabeceras CORS/CSP siguiendo guías OWASP.",
    type: "security"
  },
  {
    id: "v_6_2_2_system_version_alerts",
    version: "V6.2.2",
    title: "V6.2.2 • Visualización Dinámica de Versión en Panel de Alertas",
    date: "19-Junio-2026, 08:50:00",
    description: "Incorpora un distintivo indicador visual que muestra dinámicamente la versión activa del software en el Panel de Alertas y Cobranzas, respondiendo a la selección interactiva de foco.",
    type: "interface"
  },
  {
    id: "v_6_2_1_crm_autocomplete_polishing",
    version: "V6.2.1",
    title: "V6.2.1 • Refinamiento de Autocompletado Predictivo CRM, WhatsApp Opcional y Diálogos de Alertas",
    date: "19-Junio-2026, 08:45:00",
    description: "Refina la interfaz de autocompletado en el menú rápido (FAB) sustituyendo selectores en cascada por un sistema de búsqueda predictiva de alta precisión. Introduce ventanas emergentes de confirmación interactiva para WhatsApp opcional y diálogos de estado estilizados de éxito/error en reemplazo de alertas nativas del navegador.",
    type: "feature"
  },
  {
    id: "v_6_2_0_crm_integration_and_scheduled_payments",
    version: "V6.2.0",
    title: "V6.2.0 • Autocompletado Predictivo CRM, Selección de Proveedores, Alertas de Pagos Programados y Rediseño de Vista de Recibos",
    date: "19-Junio-2026, 08:30:00",
    description: "Lanza el sistema predictivo de búsqueda y autocompletado en CRM para campos de clientes finales y distribuidores. Integra selección explícita de proveedores en ventas de servicios digitales corporativos desde el botón flotante (FAB). Implementa el motor de alertas y amortizaciones para egresos y deudas de deudas fijas/programadas (incluyendo tarjetas de crédito con liberación inteligente de cupo). Además, optimiza el centrado y dimensionamiento de códigos de barra en comprobantes de pago y reemplaza diálogos nativos por ventanas emergentes.",
    type: "feature"
  },
  {
    id: "v_6_1_0_cache_and_background_optimization",
    version: "V6.1.0",
    title: "V6.1.0 • Capa de Caché Inteligente, Procesos Asíncronos Desacoplados y Optimización de Índices",
    date: "18-Junio-2026, 14:00:00",
    description: "Implementa una arquitectura avanzada de optimización de rendimiento y coste de base de datos. Introduce una capa de caché en memoria de alto rendimiento para consultas repetitivas de reportes que reduce el consumo de lectura de Firestore. Desarrolla un ejecutor asíncrono para delegar comprobaciones pesadas y envíos de notificaciones locales al hilo secundario del navegador de forma no bloqueante. Adicionalmente, detecta y define los índices compuestos de Firestore críticos para optimizar consultas de rango y ordenamiento frecuentes.",
    type: "core"
  },
  {
    id: "v_6_0_0_hardened_security_and_onboarding",
    version: "V6.0.0",
    title: "V6.0.0 • Suite de Seguridad Robusta, Control Anti-Fuerza-Bruta y Onboarding Inteligente",
    date: "17-Junio-2026, 18:00:00",
    description: "Lanzamiento mayor de la arquitectura de seguridad integral del sistema. Activa de forma efectiva la protección de datos por RLS (Row Level Security) a través de reglas de acceso en Firestore, junto con una configuración de CORS robusta en el servidor Express. Implementa una suite de sanitización y limpieza de inputs contra inyección SQL y XSS, límites de repetición (Rate Limiting) para evitar ataques de fuerza bruta en creación de registros, e indexación compuesta para optimizar consultas frecuentes. Además, se optimiza por completo el onboarding pre-detectando compatibilidad biométrica y ofreciendo chips de autocompletado inteligente.",
    type: "security"
  },
  {
    id: "v_5_9_0_fab_inline_crm_creation_form",
    version: "V5.9.0",
    title: "V5.9.0 • Formulario Inline de Creación de Clientes y Revendedores en FAB",
    date: "17-Junio-2026, 17:55:00",
    description: "Implementación de un formulario inline e interactivo de creación de clientes y revendedores directamente dentro de la sección de vinculación con el CRM del botón flotante (FAB). Ahora, el usuario puede presionar 'Crear Nuevo' para desplegar instantáneamente campos dedicados de nombre completo, contacto de WhatsApp y tipo de entidad, guardándolos e indexándolos en el CRM con un solo clic y seleccionándolos para la venta activa de forma 100% ininterrumpida.",
    type: "feature"
  },
  {
    id: "v_5_8_0_fab_instant_crm_registration",
    version: "V5.8.0",
    title: "V5.8.0 • Registro Inteligente Instantáneo en CRM desde FAB",
    date: "17-Junio-2026, 17:45:00",
    description: "Inclusión de botones dinámicos de autoguardado en CRM dentro del menú de Acceso Rápido Flotante. Ahora, al pegar textos de WhatsApp o escribir manualmente un cliente o revendedor nuevo, un botón inteligente de alto contraste aparece instantáneamente si no existen en la base de datos de CRM, permitiendo registrarlos con un solo clic directamente desde el popover flotante sin interrumpir el flujo.",
    type: "feature"
  },
  {
    id: "v_5_7_0_fab_crm_client_linking",
    version: "V5.7.0",
    title: "V5.7.0 • Integración Completa de Clientes CRM y Revendedores en FAB",
    date: "17-Junio-2026, 17:35:00",
    description: "Sincronización quirúrgica de clientes y revendedores en el panel de Acceso Rápido Flotante (FAB). Ahora, el usuario puede seleccionar dinámicamente si la venta es a un Cliente Final o a un Revendedor, auto-vincular de forma directa con los registros del CRM, seleccionar productos del catálogo para auto-rellenar pvp/costo, y detallar opcionalmente los datos de Cliente Final para revendedores, igualando la fiabilidad de la vista completa.",
    type: "feature"
  },
  {
    id: "v_5_6_0_fab_local_text_extractor",
    version: "V5.6.0",
    title: "V5.6.0 • Extractor Local Integrado Directo en Botonera Flotante (Cero API)",
    date: "17-Junio-2026, 16:15:00",
    description: "Incorporación quirúrgica del Extractor Inteligente Local Autónomo en el Panel de Acceso Rápido (FAB). Ahora, el usuario puede simplemente escribir o pegar cualquier texto de entrega de cuenta o planilla (como chats de WhatsApp) directamente en la botonera flotante. El sistema procesa la información de forma local e instantánea (sin requerir llamadas de API ni internet) y auto-rellena dinámicamente todos los campos correspondientes de la venta de cuenta o placa ANT para registro inmediato.",
    type: "feature"
  },
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
