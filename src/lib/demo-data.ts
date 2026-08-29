/**
 * DESCRIPCIÓN: Datos visuales ficticios utilizados durante la primera etapa del proyecto.
 * QUÉ HACE: Entrega contenido estático a páginas públicas que todavía no consultan PostgreSQL.
 * PARA QUÉ SE UTILIZA: Permite diseñar y recorrer la interfaz antes de implementar las reservas reales.
 * NOTA: Estos datos no son los mismos registros administrados desde /admin.
 */

/**
 * DESCRIPCIÓN: Servicios de ejemplo para la landing, catálogo y flujo visual de reserva.
 * QUÉ HACE: Define nombre, duración, precio, descripción y estilos de presentación.
 * PARA QUÉ SE UTILIZA: Da contenido consistente a las pantallas demostrativas de Semana 1.
 */
export const services = [
  {
    id: "evaluacion",
    name: "Evaluación inicial",
    duration: "30 min",
    price: "$18.000",
    description: "Una primera conversación para entender lo que necesitas.",
    color: "bg-teal-50 text-teal-700",
  },
  {
    id: "sesion",
    name: "Sesión personalizada",
    duration: "60 min",
    price: "$35.000",
    description: "Atención individual adaptada a tus objetivos.",
    color: "bg-indigo-50 text-indigo-700",
  },
  {
    id: "control",
    name: "Sesión de control",
    duration: "45 min",
    price: "$25.000",
    description: "Seguimiento de tu proceso y próximos pasos.",
    color: "bg-orange-50 text-orange-700",
  },
];

/**
 * DESCRIPCIÓN: Profesionales ficticios usados en las vistas públicas.
 * QUÉ HACE: Proporciona nombre, rol e información visual para tarjetas y selectores.
 * PARA QUÉ SE UTILIZA: Muestra cómo se verá la elección de profesional antes de conectar la agenda real.
 */
export const professionals = [
  {
    id: "alex",
    name: "Alex Rivera",
    role: "Especialista en atención personalizada",
    initials: "AR",
    color: "bg-teal-700",
  },
  {
    id: "camila",
    name: "Camila Torres",
    role: "Profesional de bienestar y cuidado",
    initials: "CT",
    color: "bg-indigo-700",
  },
];

/**
 * DESCRIPCIÓN: Reservas de ejemplo para una futura vista de agenda.
 * QUÉ HACE: Representa tres atenciones con cliente, servicio, profesional, fecha y estado.
 * PARA QUÉ SE UTILIZA: Sirve como maqueta visual hasta que la Semana 3 consulte Reservation desde PostgreSQL.
 */
export const upcomingReservations = [
  {
    customer: "Sofía Martínez",
    service: "Sesión personalizada",
    professional: "Camila Torres",
    date: "Hoy · 16:30",
    status: "Confirmada",
  },
  {
    customer: "Diego Rojas",
    service: "Evaluación inicial",
    professional: "Alex Rivera",
    date: "Mañana · 10:00",
    status: "Pendiente",
  },
  {
    customer: "Valentina Soto",
    service: "Sesión de control",
    professional: "Camila Torres",
    date: "Mañana · 12:15",
    status: "Confirmada",
  },
];
