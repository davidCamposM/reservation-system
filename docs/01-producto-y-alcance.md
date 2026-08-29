
## 1. Propósito de este documento

Este documento define qué problema resuelve ReservaPro, para quién se construye, qué valor ofrece y cuáles son los límites del MVP (Producto Mínimo Viable) actual. Su objetivo es evitar que el alcance del producto dependa únicamente de conversaciones o interpretaciones personales.

## 2. Resumen del producto

ReservaPro es una aplicación web de agenda y reservas para negocios de servicios. Permite que un cliente seleccione un servicio, elija un profesional, vea horarios disponibles y cree una reserva. A su vez, permite que un administrador gestione el catálogo de servicios, los profesionales, sus jornadas semanales, bloqueos excepcionales y el estado de las reservas.

## 3. Problema a resolver

Muchos negocios de servicios administran su agenda mediante conversaciones de WhatsApp, llamadas, mensajes directos o planillas. Ese proceso manual genera problemas frecuentes:

- El cliente no puede ver por sí mismo los horarios disponibles.
- El encargado debe responder repetidamente las mismas preguntas sobre fechas, precios y duración.
- Dos personas pueden solicitar o confirmar la misma hora.
- Es difícil registrar ausencias, vacaciones o cambios excepcionales de disponibilidad.
- La información de reservas queda dispersa en varios canales.
- El negocio no cuenta con una base estructurada para medir reservas y facturación.

## 4. Usuarios objetivo

### 4.1 Negocios potenciales

ReservaPro está orientado a negocios y profesionales que venden su tiempo prestando diversos servicios, atención o sesiones agendables:

- Centros estéticos y de depilación.
- Barberías y peluquerías.
- Psicólogos, nutricionistas y profesionales de salud no clínica.
- Entrenadores personales y centros deportivos.
- Fotógrafos y servicios audiovisuales.
- Talleres, servicios técnicos y reparaciones.
- Profesores particulares y tutores.
- Turismo, experiencias y actividades con cupos.
- Profesionales independientes.

### 4.2 Roles dentro del sistema

| Rol | Objetivo principal | Capacidades actuales |
|---|---|---|
| Cliente | Reservar una atención de manera autónoma. | Registrarse, iniciar sesión, ver servicios, seleccionar profesional y horario, crear una reserva y revisar sus propias reservas. |
| Administrador | Operar la agenda y catálogo del negocio. | Gestionar servicios y profesionales, definir jornadas, crear bloqueos excepcionales y actualizar estados de reservas. |

> El rol de **profesional** todavía no tiene una cuenta ni panel propio. En el MVP, sus horarios son administrados por una cuenta `ADMIN`.

## 5. Propuesta de valor

ReservaPro entrega una experiencia de reserva simple para el cliente y una operación centralizada para el negocio.

### Para el cliente

- Puede consultar servicios, duración y precio.
- Elige un profesional y un horario disponible sin esperar una respuesta manual.
- Recibe una reserva visible en su cuenta.
- Evita solicitar horas que ya están ocupadas.

### Para el negocio

- Mantiene servicios, precios, duración y profesionales en un único lugar.
- Controla la disponibilidad semanal y excepciones de agenda.
- Reduce el riesgo de cruces de horario.
- Cuenta con una base de datos lista para integrar pagos y notificaciones.

## 6. Flujo principal del producto

El flujo principal de ReservaPro es la creación de una reserva:

1. El cliente crea una cuenta o inicia sesión.
2. Selecciona un servicio activo.
3. Selecciona un profesional habilitado para ese servicio.
4. Selecciona una fecha.
5. El sistema consulta la disponibilidad real del profesional.
6. El cliente selecciona una hora disponible.
7. El sistema vuelve a validar el horario y crea una reserva en estado `PENDING`.
8. El horario seleccionado queda bloqueado temporalmente durante 15 minutos.
9. El cliente puede revisar el resultado de la reserva en `/cuenta`.

El administrador puede confirmar, cancelar o marcar como completada la reserva desde `/admin/agenda`.

## 7. Alcance del MVP actual

La siguiente tabla explica las funcionalidades que ya forman parte del sistema y otras que están en planificación pero aún no se implementan.

| Área | Incluido actualmente | Estado |
|---|---|---|
| Catálogo | Servicios con nombre, descripción, precio, duración y estado activo/inactivo. | Implementado |
| Autenticación | Registro, inicio de sesión, cierre de sesión y roles `CUSTOMER` / `ADMIN`. | Implementado |
| Cuenta de cliente | Visualización de reservas propias y sus estados. | Implementado |
| Administración | Gestión de servicios y profesionales. | Implementado |
| Agenda | Jornada semanal por profesional. | Implementado |
| Excepciones | Bloqueos puntuales de fechas y horas por profesional. | Implementado |
| Reservas | Selección de servicio, profesional, fecha y horario. | Implementado |
| Conflictos de agenda | Validación en API y restricción adicional en PostgreSQL. | Implementado |
| Estados | `PENDING`, `CONFIRMED`, `CANCELED` y `COMPLETED`. | Implementado |
| Zona horaria | Cálculos de agenda con zona horaria `America/Santiago`. | Implementado |
| Pago | Estructura de datos preparada, sin flujo de pago activo. | Pendiente |
| Email | Estructura de notificaciones preparada, sin envío activo. | Pendiente |
| WhatsApp | No implementado. | Pendiente |
| Métricas | El panel muestra métricas básicas; analítica completa está pendiente. | Parcial |
| Despliegue público | El sistema funciona en localhost. | Pendiente |

## 8. Reglas de negocio implementadas

Estas reglas describen el comportamiento que el sistema debe respetar en su estado actual:

1. Solo un usuario autenticado con rol `CUSTOMER` puede crear una reserva.
2. Un usuario con rol `ADMIN` no puede crear reservas como cliente.
3. Solo un administrador puede entrar a `/admin` y `/admin/agenda`.
4. Un cliente solo puede ver sus propias reservas en `/cuenta`.
5. Un servicio y un profesional deben estar activos para que puedan reservarse.
6. El profesional debe estar asociado al servicio elegido.
7. Un horario solo puede ofrecerse dentro de una ventana de disponibilidad semanal.
8. Un bloqueo excepcional elimina los horarios que se cruzan con ese período.
9. Una reserva `PENDING` bloquea el horario durante 15 minutos.
10. Las reservas `PENDING` expiradas se cambian a `CANCELED` al consultar o crear disponibilidad.
11. Una reserva `PENDING` o `CONFIRMED` no puede cruzarse con otra reserva activa del mismo profesional.
12. PostgreSQL aplica una restricción de exclusión como protección final ante dos solicitudes simultáneas.

## 9. Estados de reserva

| Estado | Significado para el negocio | Efecto en la agenda |
|---|---|---|
| `PENDING` | Reserva recién creada y aún no confirmada. | Bloquea el horario durante 15 minutos. |
| `CONFIRMED` | Reserva validada por el administrador. | Mantiene el horario ocupado. |
| `CANCELED` | Reserva anulada o expirada. | Libera el horario para futuras reservas. |
| `COMPLETED` | Atención realizada. | Representa una atención cerrada. |

## 10. Alcance fuera del MVP actual

Las siguientes capacidades son deseables, pero no forman parte de la entrega implementada hasta la semana 3:

- Cobro real mediante Webpay Plus u otra pasarela de pago.
- Confirmaciones, recordatorios y cancelaciones automáticas por correo electrónico.
- Integración con WhatsApp.
- Panel individual para cada profesional.
- Reprogramación o cancelación realizada directamente por el cliente.
- Gestión de sucursales, salas, recursos físicos o varios negocios por cuenta.
- Cupones, descuentos, paquetes de sesiones o membresías.
- Calendarios externos como Google Calendar.
- Reportes avanzados de conversión, ocupación y facturación.
- Configuración productiva de privacidad, auditoría, monitoreo y recuperación ante incidentes.


## 11. Próximas etapas del producto

El desarrollo continuará en incrementos pequeños y verificables:

1. **Semana 4: pagos y confirmaciones.** Se creará una integración de pago de demostración, se preparará Webpay Plus en ambiente de integración y se asociará el resultado al estado de la reserva.
2. **Semana 5: notificaciones.** Se implementará un correo de confirmación y se preparará la estructura para recordatorios.
3. **Semana 6: métricas y calidad.** Se ampliarán los indicadores de reservas y facturación, se agregarán pruebas y se mejorará la experiencia administrativa.
4. **Etapa de portafolio: despliegue.** Se publicará una demo segura, se documentarán sus credenciales de prueba y se enlazará desde la landing de portafolio.

Este documento debe actualizarse cuando cambie el problema, los usuarios, el alcance, una regla de negocio o una exclusión relevante.



## 12. Documentos relacionados

- [README principal](../README.md): instalación, tecnologías, comandos y resumen público del proyecto.
- `02-instalacion-local.md`: guía detallada de entorno local y resolución de problemas.
- `03-arquitectura.md`: estructura técnica y diagramas modelo C4.
- `04-modelo-de-datos.md`: entidades, relaciones y reglas de persistencia.
- `05-flujos-de-usuario.md`: recorridos detallados de cliente y administrador.
- `06-api.md`: contratos de las rutas API.
- `07-seguridad-y-roles.md`: sesiones, permisos y límites de seguridad.
- `08-pruebas-manuales.md`: casos para comprobar el MVP.
- `09-roadmap.md`: planificación de etapas futuras.

---

**Responsable:** David Campos Muñoz.  
