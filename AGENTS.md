# Pautas de Desarrollo y Gestión de Versiones para el Asistente AI

## Regla de Incremento de Versión Autómato
En cada sesión o turno donde se realicen modificaciones, mejoras o correcciones en el código de la aplicación, el Asistente AI **debe actualizar y sumar de forma totalmente automática la versión del sistema** en `/src/data/updates.ts`, agregando el registro correspondiente al inicio de la lista `SYSTEM_UPDATES`.

### Algoritmo de Cálculo de Impacto de Versión
Obteniendo como base la versión más reciente en `SYSTEM_UPDATES` (ejemplo actual: `V5.2.1`), se calculará la nueva versión bajo la siguiente jerarquía de impacto:

1. **Impacto Leve (Correcciones de bugs, optimizaciones menores, textos, estilos visuales mínimos):**
   - Se incrementa el **tercer dígito** (Patch).
   - Ejemplo: `v5.2.1` -> `v5.2.2`

2. **Nueva Característica / Módulo / Mejora Intermedia (Flujos adicionales, nuevos componentes, filtros, buscador integrado):**
   - Se incrementa el **segundo dígito** (Minor) y se **reinicia** el último dígito a `0`.
   - Ejemplo: `v5.2.1` -> `v5.3.0`

3. **Mejora Significativa / Evolución Mayor (Reestructuraciones del core, integraciones push-notification complejas, cambios críticos del sistema):**
   - Se incrementa el **primer dígito** (Major) y se **reinician** todos los subsecuentes a `0`.
   - Ejemplo: `v5.2.1` -> `6.0.0` or `V6.0.0`

---

## Panel Flotante de Actualizaciones al Inicio (Floating Update Modal)
Cualquier registro nuevo agregado a `SYSTEM_UPDATES` debe coincidir con un nuevo `id` único. La aplicación en `/src/components/WelcomeUpdateModal.tsx` lee el primer elemento de esta lista (`SYSTEM_UPDATES[0]`) y, si detecta una versión cuyo ID no ha sido registrado previamente en el `localStorage` del navegador del usuario (`welcome_notified_version_${CURRENT_VERSION_ID}`), presentará de forma automática una ventana flotante con efectos visuales elegantes de entrada conteniendo los detalles e historial de los cambios introducidos.

## Historial de Actualizaciones Realizadas en esta Sesión
En esta sesión se han integrado importantes mejoras funcionales:
- **Mecanismo de Deep-Linking en Notificaciones Locales y Service Worker:** Modificación en la firma de `sendLocalPushNotification` para aceptar parámetros de navegación URL. El Service Worker ahora captura el evento `notificationclick`, enfoca o navega de forma inteligente hacia el path destino configurado (`?tab=services&search=...` o `?tab=alerts&search=...`).
- **Sistema de Búsqueda Integrado en Alertas y Cobranzas:** Integración de un buscador moderno y de alto contraste en el panel de Alertas (`Alerts.tsx`), permitiendo ubicar al instante trámites, servicios o clientes bajo cobranza regulatoria.
- **Enrutamiento por Eventos & Popovers de Notificación:** Al presionar notificaciones o elementos del popover, el sistema efectúa una transición de tab instantánea y dispara eventos personalizados (`app-search-filter`, `app-alerts-filter`) para rellenar de modo autónomo la barra de filtros y focalizar la cuenta a gestionar.
- **Detección Activa de Expiraciones y Cobros Pendientes:** Ejecución automatizada de disparadores basados en snapshots en tiempo real que alertan de inmediato mediante notificaciones push cuando una cuenta o trámite entra en estado por vencer, vencido o pendiente de pago.
- **Aislamiento por Credencial Activa (V5.3.1):** Re-diseño del motor de mapeo de alertas de servicios digitales para utilizar y filtrar en base al correo electrónico o perfil (`email` / `profileName`) de la cuenta de suscripción. Evita la sobreexposición en perfiles de revendedores (distribuidores multi-cuenta).
- **Extractor Inteligente Local Autónomo de Respaldo y Cero-Clave (V5.4.0):** Implementación de un motor extractor léxico local basado en expresiones regulares y emparejamiento con el catálogo para que el Asistente Inteligente no dependa obligatoriamente de claves de API externas para el procesamiento de mensajes de texto de venta o trámites ANT.

**Siguiendo las pautas de impacto, esto constituye un incremento de tipo Nueva Característica con un ajuste leve subsecuente e incremento a Minor (Minor Upgrade)**, elevándose progresivamente de **V5.2.1** a **V5.3.1** y finalmente a **V5.4.0** como la versión estable actual.
