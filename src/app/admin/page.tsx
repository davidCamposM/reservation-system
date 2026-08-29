/**
 * Importacion de elementos varios para la pagina de administrador.
 */
import { SectionHeading } from "@/components/section-heading";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AdminManager } from "@/components/admin-manager";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DESCRIPCIÓN: Página principal del panel de administración.
 * QUÉ HACE: Comprueba permisos, obtiene información del negocio y renderiza las métricas y controles.
 * PARA QUÉ SE UTILIZA: Es la ruta /admin que usa el administrador para gestionar ReservaPro.
 */
export default async function AdminPage() {


  //-------------------------------------------------------------------------------------------------------------
  // Procesamiento de direcciones y datos - Pagina /Admin.
  /**
   * DESCRIPCIÓN: Lectura de la sesión del usuario actual desde el servidor.
   * QUÉ HACE: Recupera el usuario que inició sesión y su rol, antes de generar el HTML de la página.
   * PARA QUÉ SE UTILIZA: Evita confiar en datos enviados desde el navegador para decidir quién puede ver /admin.
   */
  const session = await getServerSession(authOptions);

  /**
   * DESCRIPCIÓN: Protección para visitantes sin una cuenta autenticada.
   * QUÉ HACE: Interrumpe el renderizado y lleva al visitante a la pantalla de inicio de sesión.
   * Redirije automaticamente a /ingresar, si se intenta ingresar por fuerza a /admin
   */
  if (!session) redirect("/ingresar");

  /**
   * DESCRIPCIÓN: Protección por rol de usuario.
   * QUÉ HACE: Redirige a un cliente autenticado hacia su propia cuenta si intenta abrir /admin.
   * PARA QUÉ SE UTILIZA: Separa las capacidades de un cliente de las capacidades del administrador.
   */
  if (session.user.role !== "ADMIN") redirect("/cuenta");

  //-------------------------------------------------------------------------------------------------------------






//-------------------------------------------------------------------------------------------------------------

  /**
   * DESCRIPCIÓN: Carga inicial de datos para el panel.
   * QUÉ HACE: Consulta servicios, profesionales, total de reservas y total de pagos aprobados en paralelo.
   * PARA QUÉ SE UTILIZA: Tener toda la información necesaria sin esperar cada consulta una por una.
   */
  const [services, professionals, totalReservations, paidPayments] = await Promise.all([

    // Lista de servicios ordenada para que el administrador los encuentre fácilmente.
    prisma.service.findMany({ orderBy: { name: "asc" } }), // Registro de la tabla Service
    // Lista de profesionales ordenada alfabéticamente.
    prisma.professional.findMany({ orderBy: { name: "asc" } }), // Registro de la tabla Professional
    // Cantidad global de reservas, usada como primera métrica del resumen.
    prisma.reservation.count(), // Registro de la tabla reservation.
    // Suma de pagos aprobados: no cuenta pagos pendientes, fallidos o expirados como facturación.
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }), // Registro de la tabla Payment.



  ]);
//-------------------------------------------------------------------------------------------------------------



  /**
   * DESCRIPCIÓN: Datos que mostrarán las tarjetas de métricas.
   * QUÉ HACE: Convierte resultados técnicos de la base de datos a textos listos para la interfaz.
   * PARA QUÉ SE UTILIZA: Mantiene el JSX más limpio y concentra el formato de cada indicador en un solo lugar.
   * NOTA: amount es Decimal en Prisma; se convierte a number únicamente para mostrar moneda en pantalla.
   */
  const metrics = [
    { label: "Reservas totales", value: String(totalReservations) },
    { label: "Servicios activos", value: String(services.filter((service) => service.active).length) },
    { label: "Facturación pagada", value: `$${Number(paidPayments._sum.amount ?? 0).toLocaleString("es-CL")}` },
  ];


  //-------------------------------------------------------------------------------------------------------------
  /**
   * DESCRIPCIÓN: Estructura visual del panel de administración.
   * QUÉ HACE: Muestra el encabezado, las tarjetas de métricas y el componente de gestión.
   * PARA QUÉ SE UTILIZA: Organiza en una única pantalla las acciones y datos principales del administrador.
   */
  return (
    <section className="space-y-8">
      {/*
        DESCRIPCIÓN: Encabezado de la página.
        QUÉ HACE: Muestra el título y contexto del área administrativa.
        PARA QUÉ SE UTILIZA: Orienta al administrador antes de usar las métricas y formularios.
      */}
      <SectionHeading
        eyebrow="Administración"
        title="Resumen del negocio"
        description="Gestiona catálogo, profesionales y el desempeño de tu agenda."
      />

      {/** Enlace a las herramientas específicas de agenda creadas durante la semana 3. */}
      <Link
        className="inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        href="/admin/agenda"
      >
        Configurar agenda y reservas
      </Link>

      {/*
        DESCRIPCIÓN: Rejilla de métricas del negocio.
        QUÉ HACE: Recorre el arreglo metrics y crea una tarjeta visual por cada indicador.
        PARA QUÉ SE UTILIZA: Evita repetir manualmente la misma estructura HTML para cada métrica.
      */}
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{metric.value}</p>
          </article>
        ))}
      </div>

      {/*
        DESCRIPCIÓN: Herramientas interactivas de gestión.
        QUÉ HACE: Entrega los servicios y profesionales iniciales al componente cliente AdminManager.
        PARA QUÉ SE UTILIZA: Permite crear, editar, activar y eliminar registros sin convertir esta página completa en cliente.
        NOTA: price se convierte de Decimal a number porque los componentes cliente reciben datos serializables.
      */}
      <AdminManager
        initialServices={services.map((service) => ({ ...service, price: Number(service.price) }))}
        initialProfessionals={professionals}
      />
    </section>
  );
}

//-------------------------------------------------------------------------------------------------------------
