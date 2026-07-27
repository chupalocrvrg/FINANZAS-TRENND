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
    id: "v_7_17_0_payment_receipt_modal",
    version: "V7.17.0",
    title: "V7.17.0 • Recibos de Cobro y Panel de Pagos",
    date: new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }).replace(',', ''),
    description: "Se ha mejorado sustancialmente el flujo de cobros. Ahora, al presionar 'Cobrar' se despliega un panel interactivo que permite ingresar el valor exacto a descontar con opción a comentarios. Tras confirmar, el sistema genera automáticamente un Recibo de Cobro detallado que incluye la fecha, días de mora, el abono registrado y el saldo restante.",
    type: "feature"
  },
  {
    id: "v_7_16_3_sync_dev_server",
    version: "V7.16.3",
    title: "V7.16.3 • Corrección de Sincronización del Servidor",
    date: new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }).replace(',', ''),
    description: "Se detectó y solucionó una caída en el servidor de desarrollo en tiempo real que impedía que su navegador descargara las nuevas funciones de Cobro. El servidor ha sido reiniciado forzosamente, por lo que el botón de 'Cobrar' ahora ejecutará la función correctamente sin arrojar errores de referencia. Refresque la página si el error persiste.",
    type: "core"
  },

  {
    id: "v_7_16_2_partial_payments_client_name",
    version: "V7.16.2",
    title: "V7.16.2 • Abonos Parciales y Visualización de Clientes en E-Commerce Físico",
    date: new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }).replace(',', ''),
    description: "Se solucionó el error que impedía registrar cobros en las cuotas. Ahora al presionar 'Cobrar' se despliega una ventana que permite ingresar el monto exacto a abonar, habilitando Abonos Parciales. Además, se corrigió la visualización del nombre del Cliente en la cabecera de las tarjetas de venta que se mostraban como 'Cliente sin nombre'.",
    type: "interface"
  },

  {
    id: "v_7_16_1_fixes_contrast_payments",
    version: "V7.16.1",
    title: "V7.16.1 • Textos Legibles (Liquid Glass) y Abonos Parciales",
    date: new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }).replace(',', ''),
    description: "Se corrigió el problema de legibilidad visual de los textos oscuros que se veían blancos o borrosos bajo el tema Liquid Glass (Light), eliminando el sombreado de texto global. Además, ahora en las Ventas del Comercio Físico (E-Commerce Local) los usuarios pueden marcar como COBRADAS las cuotas individuales (Abonos parciales) desde el panel de Calendario de Pagos de cada Venta.",
    type: "interface"
  },

  {
    id: "v_7_16_0_sales_predictive_crm",
    version: "V7.16.0",
    title: "V7.16.0 • Búsqueda Predictiva de Clientes y Corrección de Guardado de Ventas",
    date: new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }).replace(',', ''),
    description: "Se implementó un sistema de búsqueda predictiva para Clientes en el módulo de Ventas. Ahora al escribir la Cédula o el Nombre, el sistema busca en tiempo real en el CRM y auto-completa el resto de datos (Celular, Ciudad, Barrio, Referencia). Se corrigió de forma definitiva el guardado de la venta (uso de addDoc) y se amplió el panel visual para mostrar el Calendario de Pagos Estimado de forma anticipada antes de guardar.",
    type: "feature"
  },

  {
    id: "v_7_15_1_sales_payments_schedule",
    version: "V7.15.1",
    title: "V7.15.1 • Corrección en Ventas y Calendario de Pagos",
    date: new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }).replace(',', ''),
    description: "Se ha corregido el guardado de las ventas. Ahora al crear una venta se muestra un resumen con el Calendario de Pagos estimado en base al tipo de venta y frecuencia. Además, cada venta registrada muestra en su tarjeta de detalle todo su cronograma de cuotas (Fechas, montos y estado).",
    type: "core"
  },

  {
    id: "v_7_15_0_sales_client_crm",
    version: "V7.15.0",
    title: "V7.15.0 • Creador Dinámico de Clientes y CRM Integrado en Ventas",
    date: new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }).replace(',', ''),
    description: "Se ha potenciado el módulo de Ventas Físicas. Ahora permite seleccionar clientes predictivos directamente desde el CRM, auto-completando sus datos. En caso de ser un cliente nuevo, se habilita la creación autónoma exigiendo Cédula (hasta 13 dígitos), Celular y Dirección desglosada (Ciudad, Barrio, Referencia). Adicionalmente, se incluyó el selector de Tipo/Tiempo de Venta (Contado, 3 y 6 meses) que recalcula dinámicamente los valores del inventario.",
    type: "feature"
  },

  {
    id: "v_7_14_0_commerce_margins",
    version: "V7.14.0",
    title: "V7.14.0 • Sistema Autónomo de Márgenes Comerciales",
    date: new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }).replace(',', ''),
    description: "Se integró un motor global de configuración de márgenes de ganancia (PVP, 3 Meses y 6 Meses) en el panel de Ajustes (Comercio y Ganancias). El inventario ahora solo requiere ingresar el Costo base; el sistema calculará dinámicamente los precios de venta y financiamiento aplicando las reglas configuradas.",
    type: "feature"
  },

  {
    id: "v_7_13_1_dock_tooltips_fix",
    version: "V7.13.1",
    title: "V7.13.1 • Corrección de Tooltips en el Dock de Navegación",
    date: "27-Jul-2026, 09:40:00",
    description: "Se ha solucionado el problema visual donde los nombres de los módulos emergentes (tooltips) en el Dock inferior se mostraban entrecortados. Se incrementó la altura del contenedor de desbordamiento (overflow) y se aplicaron ajustes de eventos de puntero (pointer-events) para garantizar que los textos se dibujen de manera completa sin bloquear la interacción con el resto de la interfaz.",
    type: "interface"
  },
  {
    id: "v_7_13_0_mother_account_dock_unification",
    version: "V7.13.0",
    title: "V7.13.0 • Habilitación del Dock Universal y Control Estricto de Cuentas Madre",
    date: "26-Julio-2026, 23:50:00",
    description: "Se eliminó definitivamente la barra de navegación inferior en dispositivos móviles y tabletas, reemplazándola por el MacDock unificado para todas las resoluciones. Adicionalmente, se integró el botón 'Registrar Cuenta Madre' en Servicios Digitales, configurando el sistema para que al seleccionar 'Vender Perfil', el selector de cuentas origen únicamente despliegue las Cuentas Madre (Matriz) que se encuentren activas, evitando mezclar suscripciones completas.",
    type: "feature"
  },
  {
    id: "v_7_12_0_mother_account_button_and_universal_dock",
    version: "V7.12.0",
    title: "V7.12.0 • Botón Especializado de Cuenta Madre y Dock Universal",
    date: "26-Julio-2026, 23:25:00",
    description: "Se unificó la experiencia de usuario habilitando el MacDock interactivo para todas las resoluciones (Móvil y Escritorio) eliminando la barra inferior antigua. Adicionalmente, se incorporó un botón dedicado 'Registrar Cuenta Madre' que filtra inteligentemente el catálogo para aislar inventarios, reflejándose exclusivamente en la ventana de venta por perfiles y protegiendo el stock de las cuentas completas del cliente final.",
    type: "feature"
  },
  {
    id: "v_7_11_1_fix_mobile_menu_contrast",
    version: "V7.11.1",
    title: "V7.11.1 • Corrección de Contraste en Menú Móvil",
    date: "26-Julio-2026, 23:05:00",
    description: "Se corrigió el contraste de color del texto en el popover del menú inferior (Comercio / Finanzas) durante el uso del modo claro, mejorando la legibilidad de las opciones.",
    type: "interface"
  },
  {
    id: "v_7_11_0_parent_account_isolation",
    version: "V7.11.0",
    title: "V7.11.0 • Separación Lógica de Cuentas Matrices",
    date: "25-Julio-2026, 12:00:00",
    description: "Se agregó el tipo de acceso 'Matriz (Inventario)' para diferenciar las cuentas utilizadas como proveedoras de perfiles de aquellas cuentas completas vendidas directamente al cliente final, eliminando la duplicación en la ventana de venta de perfiles.",
    type: "feature"
  },
  {
    id: "v_7_10_2_wa_modal_fix",
    version: "V7.10.2",
    title: "V7.10.2 • Corrección Modal de WhatsApp",
    date: "25-Julio-2026, 11:55:00",
    description: "Corrección técnica: se habilitó correctamente el renderizado de la ventana emergente de opciones de WhatsApp (Envío de Datos vs Notificación de Corte), que no se mostraba al hacer clic.",
    type: "interface"
  },
  {
    id: "v_7_10_1_ui_refinements_and_fixes",
    version: "V7.10.1",
    title: "V7.10.1 • Correcciones Visuales y Mejoras UX",
    date: "25-Julio-2026, 10:15:00",
    description: "Se eliminó el buscador duplicado en el modal de catálogo. Se integró entrada predictiva (datalist) en la selección de servicios del formulario de venta, reemplazando la lista desplegable clásica. Ampliada la compatibilidad de 'Pantallas Máximas' a servicios que contengan la palabra 'completa'. El menú de WhatsApp ahora se despliega obligatoriamente mostrando siempre las opciones de mensaje disponibles.",
    type: "interface"
  },
  {
    id: "v_7_10_0_predictive_profiles_wa",
    version: "V7.10.0",
    title: "V7.10.0 • Entradas Predictivas, Venta de Perfiles y WhatsApp Reminders",
    date: "25-Julio-2026, 09:55:00",
    description: "Implementación de entradas predictivas para Clientes y Servicios en Ventas, con autoguardado en CRM. Inclusión de barra de búsqueda y campos de 'Pantallas Máximas' en el catálogo global. Adición del nuevo módulo 'Gestión de Perfiles' para vender sub-cuentas desde matrices completas. Nuevo menú para enviar notificaciones de corte por WhatsApp. Además, se habilitó la visibilidad de enlaces públicos de recibos sin requerir sesión iniciada.",
    type: "feature"
  },
  {
    id: "v_7_9_3_calendar_and_contrast",
    version: "V7.9.3",
    title: "V7.9.3 • Calendario Interactivo, Escala Visual y Contraste",
    date: "20-Julio-2026, 19:35:00",
    description: "Se agregaron indicadores directos de Cuentas por Cobrar y Cortes de servicio dentro de las casillas del calendario. Se incrementó la escala visual del texto universalmente. Se corrigió el contraste de texto en los modales de Cuentas por Pagar/Cobrar y de Novedades en modo claro. Además, el panel de notificaciones ahora se cierra automáticamente al navegar a otra sección.",
    type: "feature"
  },

  {
    id: "v_7_9_2_liquid_glass_variants",
    version: "V7.9.2",
    title: "V7.9.2 • Variantes Cromáticas y Correcciones de Dashboard",
    date: "20-Julio-2026, 17:35:00",
    description: "Se han integrado 4 nuevas variaciones cromáticas (Pastel, Teal, Amatista y Ámbar) para el motor Liquid Glass en Ajustes. Además, se ajustó la fórmula de 'Ganancias Aproximadas' para que incluya las Cuentas por Cobrar. También se corrigió el contraste de texto en las tarjetas del dashboard durante el uso del Modo Claro y se estandarizó el color de fondo para la tarjeta de Cuentas por Pagar.",
    type: "feature"
  },

  {
    id: "v_7_9_1_liquid_glass_breathing",
    version: "V7.9.1",
    title: "V7.9.1 • Gradientes Dinámicos y Opacidad en Liquid Glass",
    date: "20-Julio-2026, 16:15:00",
    description: "Refinamiento visual del motor Liquid Glass. Se ha incorporado una animación orgánica ('breathing gradient') que atenúa y expande suavemente los fondos coloridos para simular fluidez, similar a una malla Aurora. Asimismo, se redujo drásticamente la opacidad de los bordes blancos en las tarjetas para lograr un efecto de cristal esmerilado más inmersivo y sutil.",
    type: "interface"
  },

  {
    id: "v_7_9_0_dashboard_and_ui_styles",
    version: "V7.9.0",
    title: "V7.9.0 • Métricas de Tablero, Estilos de Interfaz Liquid Glass y Gradientes",
    date: "20-Julio-2026, 15:30:00",
    description: "Actualización de las métricas del tablero principal para mostrar 'Ganancias Aproximadas de este Mes' mediante el cálculo en tiempo real de beneficios y 'Total de Clientes Activos', depurando métricas redundantes. Además, se integró en la sección de Ajustes el Motor de Estilos visuales con opciones 'Plástico (Sólido)' y 'Liquid Glass (Transparente)', soportados por fondos animados con gradientes de color que se adaptan a las modalidades Claro y Oscuro para una experiencia inmersiva y elegante.",
    type: "feature"
  },

  {
    id: "v_7_8_0_macos_animated_dock",
    version: "V7.8.0",
    title: "V7.8.0 • Nueva Navegación: Mac-style Dock Animado",
    date: "20-Julio-2026, 12:00:00",
    description: "Se ha reemplazado la clásica barra lateral de navegación (Sidebar) por un nuevo Dock flotante animado al estilo macOS para dispositivos de escritorio. Este Dock interactivo amplía los íconos dinámicamente al pasar el mouse e integra todos los módulos y submódulos (Inicio, Comercio, Finanzas y Ajustes) en un solo panel elegante y moderno.",
    type: "interface"
  },
  {
    id: "v_7_7_1_iframe_security_patch",
    version: "V7.7.1",
    title: "V7.7.1 • Parche de Compatibilidad de Entorno (Iframe)",
    date: "11-Julio-2026, 18:45:00",
    description: "Se eliminó una restricción estricta de seguridad (X-Frame-Options: SAMEORIGIN) a nivel del servidor Express que estaba bloqueando la renderización de la interfaz dentro del iframe del entorno de desarrollo de AI Studio, lo que ocasionaba una pantalla en blanco.",
    type: "feature"
  },
  {
    id: "v_7_7_0_treasury_wallets_toggle_and_general_ledger",
    version: "V7.7.0",
    title: "V7.7.0 • Tesorería Flexible: Desactivación de Billeteras y Registro General",
    date: "11-Julio-2026, 17:00:00",
    description: "Se implementó un nuevo control en la Configuración para ocultar y desactivar la selección obligatoria de 'Cuentas Bancarias y Billeteras'. Al desactivarse, todos los módulos (Tesorería, Servicios Digitales, Trámites ANT, Alertas y Dashboard) ocultan el selector de billeteras, convirtiendo el sistema en un Registro General de flujos y transacciones sin necesidad de especificar cuentas de origen o destino.",
    type: "feature"
  },
  {
    id: "v_7_6_0_portal_layout_reorder_and_active_expiration_filter",
    version: "V7.6.0",
    title: "V7.6.0 • Reorganización de Portal de Clientes y Filtro Activo por Expiración",
    date: "11-Julio-2026, 14:30:00",
    description: "Se reestructuró por completo el orden visual de los de módulos en el Portal Público del Cliente para optimizar la navegación: primero se muestran las tarjetas Bento de resumen, seguidas de las suscripciones premium, las cuentas de pago autorizadas, la tabla de valores pendientes de pago o conciliación, y finalmente las instrucciones de abonos. Además, se actualizó la lógica de filtrado de suscripciones activas para excluir de la parte superior aquellas cuentas que ya hayan expirado en fecha (comparado con la fecha actual del sistema), manteniéndolas en la sección de cobros pendientes bajo la etiqueta de 'Servicio Vencido' si aún no se han pagado.",
    type: "feature"
  },
  {
    id: "v_7_5_2_crm_category_contrast_fix",
    version: "V7.5.2",
    title: "V7.5.2 • Corrección de Contraste en Categorías del CRM",
    date: "01-Julio-2026, 19:02:00",
    description: "Se corrigió un problema visual en el modal de registro y edición del CRM donde el listado de selección múltiple de categorías y casillas de verificación presentaba un contraste deficiente con texto claro sobre fondo claro. Se rediseñó el componente utilizando clases estrictamente reactivas que se adaptan dinámicamente al estado de modo oscuro (isDark) o modo claro, garantizando un texto charcoal/slate-800 altamente legible en modo claro y slate-300 en modo oscuro.",
    type: "interface"
  },
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
