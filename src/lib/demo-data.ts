export const services = [
  { id: "evaluacion", name: "Evaluación inicial", duration: "30 min", price: "$18.000", description: "Una primera conversación para entender lo que necesitas.", color: "bg-teal-50 text-teal-700" },
  { id: "sesion", name: "Sesión personalizada", duration: "60 min", price: "$35.000", description: "Atención individual adaptada a tus objetivos.", color: "bg-indigo-50 text-indigo-700" },
  { id: "control", name: "Sesión de control", duration: "45 min", price: "$25.000", description: "Seguimiento de tu proceso y próximos pasos.", color: "bg-orange-50 text-orange-700" },
];

export const professionals = [
  { id: "alex", name: "Alex Rivera", role: "Especialista en atención personalizada", initials: "AR", color: "bg-teal-700" },
  { id: "camila", name: "Camila Torres", role: "Profesional de bienestar y cuidado", initials: "CT", color: "bg-indigo-700" },
];

export const upcomingReservations = [
  { customer: "Sofía Martínez", service: "Sesión personalizada", professional: "Camila Torres", date: "Hoy · 16:30", status: "Confirmada" },
  { customer: "Diego Rojas", service: "Evaluación inicial", professional: "Alex Rivera", date: "Mañana · 10:00", status: "Pendiente" },
  { customer: "Valentina Soto", service: "Sesión de control", professional: "Camila Torres", date: "Mañana · 12:15", status: "Confirmada" },
];
