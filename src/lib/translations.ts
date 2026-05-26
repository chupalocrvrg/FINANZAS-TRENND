import { useAuth } from './AuthContext';

export const TRANSLATIONS_DICT = {
  es: {
    // Sidebar / Navigation
    'nav.dashboard': 'Panel Principal',
    'nav.crm': 'CRM Relaciones',
    'nav.services': 'Servicios Digitales',
    'nav.updates': 'Actualizaciones ANT',
    'nav.treasury': 'Tesorería',
    'nav.alerts': 'Alertas y Cobro',
    'nav.settings': 'Configuración',
    'nav.admin_modules': 'Módulos Administrativos',
    'nav.config_alerts': 'Configuración y Alertas',
    'nav.user': 'Usuario',

    // Common / Dashboard
    'dash.cash_balance': 'Saldo de Caja General',
    'dash.active_wallets': 'Billeteras Activas',
    'dash.receivables': 'Cuentas por Cobrar (CRM)',
    'dash.payables': 'Cuentas por Pagar (AP)',
    'dash.pending_receipts': 'Pendientes de Ingreso',
    'dash.pending_orders': 'Pendientes de Pago',
    'dash.recent_activities': 'Actividad Reciente',
    'dash.no_pending': 'No hay cuentas pendientes por cobrar.',
    'dash.no_payables': 'No hay cuentas pendientes por pagar.',
    'dash.add_short': 'Acceso Rápido',
    'dash.whats_new': 'Panel de Novedades',
    'dash.title': 'Resumen Financiero',
    'dash.subtitle': 'Métricas de rendimiento en tiempo real.',
    'dash.available_liquid': 'Disponible (Líquido)',
    'dash.available_cc': 'Cupo Disponible TC',
    'dash.cc_details': 'Cupo Tarjetas Crédito',
    'dash.pending': 'Pendientes',
    'dash.obligations': 'Obligaciones',
    'dash.registered_wallets': 'Cuentas Registradas',
    'dash.syncing': 'En Sincronización',

    // CRM
    'crm.title': 'Centro de Relaciones con Clientes (CRM)',
    'crm.subtitle': 'Administración de clientes habituales y carteras.',
    'crm.add_client': 'Añadir Cliente',
    'crm.search_client': 'Buscar cliente...',
    'crm.tab_clients': 'Clientes',
    'crm.tab_resellers': 'Revendedores',
    'crm.tab_intermediaries': 'Intermediarios',
    'crm.tab_suppliers': 'Proveedores',

    // Digital Services
    'ds.title': 'Venta de Servicios Digitales',
    'ds.subtitle': 'Venta y renovación de cuentas (Netflix, Disney, etc.)',
    'ds.add_service': 'Registrar Servicio',

    // ANT Updates
    'ant.title': 'Actualizaciones Especiales (ANT)',
    'ant.subtitle': 'Control de trámites de ANT, licencias y citaciones.',
    'ant.add_transaction': 'Registrar Trámite / Actualización',

    // Treasury
    'treas.title': 'Control de Tesorería',
    'treas.subtitle': 'Control de cajas físicas, cuentas bancarias y transferencias.',
    'treas.transfer': 'Transferir entre Cajas',

    // Alerts
    'alerts.title': 'Centro de Alertas y Cobranza',
    'alerts.subtitle': 'Control automatizado de vencimientos y avisos.',

    // Settings
    'settings.title': 'Centro de Configuración',
    'settings.subtitle': 'Ajustes del sistema, perfiles, PIN de seguridad e idioma.',
    'settings.save': 'Guardar Cambios',
    'settings.profile': 'Mi Perfil',
    'settings.language': 'Idioma del Sistema',
    'settings.appearance': 'Apariencia y Colores',
  },
  en: {
    // Sidebar / Navigation
    'nav.dashboard': 'Main Dashboard',
    'nav.crm': 'CRM Relations',
    'nav.services': 'Digital Services',
    'nav.updates': 'ANT Updates',
    'nav.treasury': 'Treasury & Cash',
    'nav.alerts': 'Alerts & Collections',
    'nav.settings': 'Settings & Core',
    'nav.admin_modules': 'Administrative Modules',
    'nav.config_alerts': 'Config & Alerts',
    'nav.user': 'User Profile',

    // Common / Dashboard
    'dash.cash_balance': 'Total General Cash Balance',
    'dash.active_wallets': 'Active Wallets',
    'dash.receivables': 'Accounts Receivable (CRM)',
    'dash.payables': 'Accounts Payable (AP)',
    'dash.pending_receipts': 'Pending Incomes',
    'dash.pending_orders': 'Pending Payments / Cost',
    'dash.recent_activities': 'Recent Activity Feed',
    'dash.no_pending': 'No pending receivables found.',
    'dash.no_payables': 'No pending supplier payables.',
    'dash.add_short': 'Quick Access',
    'dash.whats_new': 'Release Updates',
    'dash.title': 'Financial Summary',
    'dash.subtitle': 'Real-time financial performance metrics.',
    'dash.available_liquid': 'Available (Liquid)',
    'dash.available_cc': 'Available Credit',
    'dash.cc_details': 'Credit Card Limit',
    'dash.pending': 'Pending',
    'dash.obligations': 'Obligations',
    'dash.registered_wallets': 'Registered Wallets',
    'dash.syncing': 'In Sinc',

    // CRM
    'crm.title': 'Customer Relationship Management (CRM)',
    'crm.subtitle': 'Manage regular clients, portfolios, and details.',
    'crm.add_client': 'Add New Client',
    'crm.search_client': 'Search customer...',
    'crm.tab_clients': 'Clients',
    'crm.tab_resellers': 'Resellers',
    'crm.tab_intermediaries': 'Intermediaries',
    'crm.tab_suppliers': 'Suppliers',

    // Digital Services
    'ds.title': 'Digital Streaming Services Management',
    'ds.subtitle': 'Streaming account sale, delivery, and renewals.',
    'ds.add_service': 'Register New Service',

    // ANT Updates
    'ant.title': 'Special Driver/Car Updates (ANT)',
    'ant.subtitle': 'Driver permits, license renewals, and points clearing status.',
    'ant.add_transaction': 'Register ANT Update',

    // Treasury
    'treas.title': 'Treasury & Ledger Management',
    'treas.subtitle': 'Manage cash drawers, bank accounts, and wallet transfers.',
    'treas.transfer': 'Wallet Transfer',

    // Alerts
    'alerts.title': 'Alert & Collections Dashboard',
    'alerts.subtitle': 'Automated tracking of upcoming expiries and warnings.',

    // Settings
    'settings.title': 'System Settings Control Panel',
    'settings.subtitle': 'Customize platform behavior, profile info, PIN, and language.',
    'settings.save': 'Save Changes',
    'settings.profile': 'My Settings',
    'settings.language': 'System Language',
    'settings.appearance': 'Appearance & Themes',
  }
};

export function useTranslation() {
  const { settings } = useAuth();
  const currentLang = settings?.language || 'es';

  const t = (key: keyof typeof TRANSLATIONS_DICT.es, defaultText: string): string => {
    const dict = TRANSLATIONS_DICT[currentLang] || TRANSLATIONS_DICT.es;
    return (dict as any)[key] || defaultText;
  };

  return { t, language: currentLang };
}
