import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12 || password === "Admin123!") {
    throw new Error("El seed requiere SEED_ADMIN_EMAIL y una contraseña privada de al menos 12 caracteres.");
  }
  // El seed no eleva a administrador una cuenta de cliente preexistente ni cambia contraseñas existentes.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== "ADMIN") throw new Error("El correo elegido ya pertenece a una cuenta de cliente.");
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: "Administrador ReservaPro", email, passwordHash: await hash(password, 12), role: "ADMIN" },
  });

  if (process.env.SEED_DEMO_DATA !== "true") return;

  const [alex, camila] = await Promise.all([
    prisma.professional.upsert({
      where: { id: "seed-professional-alex" },
      update: {},
      create: { id: "seed-professional-alex", name: "Alex Rivera", bio: "Especialista en atención personalizada." },
    }),
    prisma.professional.upsert({
      where: { id: "seed-professional-camila" },
      update: {},
      create: { id: "seed-professional-camila", name: "Camila Torres", bio: "Profesional de bienestar y cuidado." },
    }),
  ]);

  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: "seed-service-evaluacion" },
      update: {},
      create: { id: "seed-service-evaluacion", name: "Evaluación inicial", description: "Conversemos sobre tus necesidades.", durationMins: 30, price: 18000 },
    }),
    prisma.service.upsert({
      where: { id: "seed-service-sesion" },
      update: {},
      create: { id: "seed-service-sesion", name: "Sesión personalizada", description: "Atención adaptada a ti.", durationMins: 60, price: 35000 },
    }),
    prisma.service.upsert({
      where: { id: "seed-service-control" },
      update: {},
      create: { id: "seed-service-control", name: "Sesión de control", description: "Seguimiento de tu proceso.", durationMins: 45, price: 25000 },
    }),
  ]);

  await prisma.serviceProfessional.createMany({
    data: services.flatMap((service) => [
      { serviceId: service.id, professionalId: alex.id },
      { serviceId: service.id, professionalId: camila.id },
    ]),
    skipDuplicates: true,
  });

  const hours = [1, 2, 3, 4, 5].flatMap((weekday) => [
    { professionalId: alex.id, weekday, startTime: "09:00", endTime: "18:00" },
    { professionalId: camila.id, weekday, startTime: "10:00", endTime: "19:00" },
  ]);
  await prisma.weeklyAvailability.createMany({ data: hours, skipDuplicates: true });
}

main()
  .then(() => console.log("ReservaPro seed data created."))
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(() => prisma.$disconnect());
