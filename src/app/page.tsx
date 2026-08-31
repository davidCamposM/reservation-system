/**
 * DESCRIPCIÓN: Página pública principal de ReservaPro.
 * QUÉ HACE: Presenta el valor del sistema y dirige a las personas al flujo real de reserva.
 * PARA QUÉ SE UTILIZA: Funciona como landing de demostración sin alterar la lógica del negocio.
 */
import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  CreditCard,
  Dumbbell,
  HeartPulse,
  Map,
  Scissors,
  Sparkles,
  TimerReset,
  Wrench,
} from "lucide-react";
import { LandingProductDemo } from "@/components/landing-product-demo";

/**
 * DESCRIPCIÓN: Rubros que pueden usar ReservaPro.
 * QUÉ HACE: Conserva una propuesta concreta de seis categorías y les asigna un icono coherente.
 * PARA QUÉ SE UTILIZA: Ayuda a que una persona identifique rápidamente si el producto aplica a su negocio.
 */
const industries: Array<{ label: string; icon: LucideIcon; color: string }> = [
  { label: "Centros estéticos", icon: Sparkles, color: "bg-brand-soft text-brand-deep" },
  { label: "Barberías", icon: Scissors, color: "bg-slate-100 text-slate-700" },
  { label: "Psicología", icon: HeartPulse, color: "bg-violet-50 text-violet-700" },
  { label: "Entrenamiento", icon: Dumbbell, color: "bg-accent-soft text-lime-800" },
  { label: "Fotografía", icon: Map, color: "bg-sky-50 text-sky-700" },
  { label: "Servicios técnicos", icon: Wrench, color: "bg-amber-50 text-amber-700" },
];

/**
 * DESCRIPCIÓN: Problemas operativos y beneficios que se muestran en el bloque bento.
 * QUÉ HACE: Mantiene cada mensaje, icono y color en una única fuente de datos.
 * PARA QUÉ SE UTILIZA: Permite crear tarjetas consistentes sin repetir estructuras de interfaz.
 */
const benefits: Array<{
  issue: string;
  solution: string;
  description: string;
  icon: LucideIcon;
  tone: string;
}> = [
  {
    issue: "Mensajes dispersos",
    solution: "Una agenda disponible 24/7",
    description: "Las personas revisan servicios y horas libres sin coordinar por varios canales.",
    icon: CalendarDays,
    tone: "bg-brand-soft text-brand-deep",
  },
  {
    issue: "Horas duplicadas",
    solution: "Bloqueos automáticos por horario",
    description: "Cada reserva protege el espacio correspondiente de la agenda profesional.",
    icon: TimerReset,
    tone: "bg-sky-50 text-sky-700",
  },
  {
    issue: "Pagos sin confirmar",
    solution: "Cobro y confirmación en un solo flujo",
    description: "El pago aprobado actualiza la reserva y deja un registro claro para administrar.",
    icon: CreditCard,
    tone: "bg-accent-soft text-lime-800",
  },
  {
    issue: "Recordatorios manuales",
    solution: "Correos programados para cada atención",
    description: "La comunicación de confirmación y recordatorio acompaña a cada reserva.",
    icon: BellRing,
    tone: "bg-violet-50 text-violet-700",
  },
];

/**
 * DESCRIPCIÓN: Botón reutilizable que conduce a la demostración funcional.
 * QUÉ HACE: Crea un enlace con una variante visual primaria o secundaria y un icono de dirección.
 * PARA QUÉ SE UTILIZA: Mantiene los llamados a la acción de la landing consistentes y accesibles.
 */
function DemoButton({ children, secondary = false }: { children: ReactNode; secondary?: boolean }) {
  return (
    <Link href="/reservar" className={`group ui-button ${secondary ? "ui-button-secondary" : "ui-button-primary"}`}>
      {children}
      <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

/**
 * DESCRIPCIÓN: Composición completa de la landing.
 * QUÉ HACE: Organiza hero, rubros, beneficios y cierre en secciones independientes.
 * PARA QUÉ SE UTILIZA: Ofrece una primera impresión editorial del producto y conserva el CTA hacia /reservar.
 */
export default function HomePage() {
  return (
    <div className="-mx-5 -mt-8 overflow-hidden pb-0 sm:-mx-6 sm:-mt-12">
      {/*
        DESCRIPCIÓN: Hero de introducción al producto.
        QUÉ HACE: Combina el mensaje principal con una demostración visual de estados reales de ReservaPro.
        PARA QUÉ SE UTILIZA: Comunica el beneficio del sistema y permite comenzar la demo desde el primer bloque.
      */}
      <section className="relative isolate overflow-hidden bg-white px-5 py-16 sm:px-6 sm:py-20 lg:py-24">
        {/* La fotografía ocupa el fondo completo del Hero, no el interior de las tarjetas del mockup. */}
        <Image
          src="/images/agenda-calendario.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="pointer-events-none absolute inset-0 z-0 scale-105 object-cover object-[60%_center] opacity-[0.9] blur-[1px]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-white/[0.62] via-white/[0.28] to-sky-50/[0.04]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-sky-50/[0.08] via-transparent to-white/[0.22]" />
        <div className="relative z-20 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-xl">
            <p className="ui-label">AGENDA INTELIGENTE PARA SERVICIOS</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[0.98] tracking-[-0.065em] text-ink sm:text-6xl lg:text-7xl">
              El día fluye mejor cuando la agenda tiene orden.
            </h1>
            <p className="mt-7 max-w-lg text-base font-semibold leading-8 text-ink sm:text-lg">
              ReservaPro reúne reservas, disponibilidad, pagos y comunicación para que el equipo dedique más tiempo a atender.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link href="/reservar" className="ui-button ui-button-primary group">
                <CalendarDays aria-hidden="true" className="size-4" />
                Reservar una hora
                <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link href="/catalogo" className="ui-button ui-button-secondary">
                Ver servicios
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-2" aria-label="Funciones principales">
              {["Agenda en línea", "Horarios protegidos", "Pagos integrados"].map((feature) => (
                <span key={feature} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 backdrop-blur">
                  <Check aria-hidden="true" className="size-4 text-brand" />
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* El mockup se muestra directamente sobre la fotografía para conservar
              una sola tarjeta protagonista y evitar superficies translúcidas duplicadas. */}
          <div className="relative isolate mx-auto w-full max-w-xl">
            {/* El contenedor toma la altura natural del mockup para que nunca se corte al animarse. */}
            <div className="relative py-2 sm:py-3">
              <div className="relative z-10 grid place-items-center">
                <LandingProductDemo />
              </div>
            </div>
            {/* Esta ficha queda debajo del mockup para no tapar la demostración ni la fotografía. */}
            <div className="mt-6 flex w-full max-w-sm items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-float sm:ml-5">
              <span className="ui-icon h-10 w-10 bg-brand-soft text-brand-deep"><Check aria-hidden="true" className="size-5" /></span>
              <div><p className="text-xs font-semibold text-semantic-muted">Agenda en línea</p><p className="font-extrabold text-ink">Horarios protegidos</p></div>
            </div>
          </div>
        </div>
      </section>

      {/*
        DESCRIPCIÓN: Franja de rubros objetivo.
        QUÉ HACE: Presenta categorías con iconos y variaciones de color discretas.
        PARA QUÉ SE UTILIZA: Hace visible la versatilidad de ReservaPro sin añadir promesas ni datos ficticios.
      */}
      <section id="features" className="bg-white px-5 py-16 sm:px-6 sm:py-20 lg:py-24" aria-labelledby="industries-title">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="ui-label">PENSADO PARA ATENDER</p>
            <h2 id="industries-title" className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-ink sm:text-4xl">
              Un ritmo claro para distintos servicios.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-semantic-muted">La misma agenda se adapta a equipos pequeños, profesionales independientes y negocios de atención por hora.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map(({ label, icon: Icon, color }) => (
            <article key={label} className="ui-card group min-h-44 p-6 transition duration-200 hover:-translate-y-1 hover:shadow-card">
              <span className={`ui-icon ${color}`}>
                <Icon aria-hidden="true" className="size-5 transition-transform duration-200 group-hover:-rotate-6" />
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-ink">{label}</h3>
            </article>
            ))}
          </div>
        </div>
      </section>

      {/*
        DESCRIPCIÓN: Bento de beneficios operativos.
        QUÉ HACE: Une cada síntoma cotidiano con una solución específica mediante tarjetas escaneables.
        PARA QUÉ SE UTILIZA: Explica el producto de forma concreta sin depender de frases comerciales genéricas.
      */}
      <section id="about" className="bg-gradient-to-b from-sky-50 to-white px-5 py-16 sm:px-6 sm:py-20 lg:py-24" aria-labelledby="benefits-title">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.74fr_1.26fr] lg:gap-16">
          <div className="lg:pt-8">
            <p className="ui-label">ORDEN QUE SE NOTA</p>
            <h2 id="benefits-title" className="mt-4 max-w-md text-4xl font-extrabold leading-[1.02] tracking-[-0.06em] text-ink sm:text-5xl">
              Menos coordinación. Más atención.
            </h2>
            <p className="mt-6 max-w-md text-base leading-8 text-semantic-muted sm:text-lg">
              Cada etapa acompaña a la siguiente, desde que una persona elige un servicio hasta que recibe su confirmación.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
          {benefits.map(({ issue, solution, description, icon: Icon, tone }, index) => (
            <article key={solution} className="ui-card group relative min-h-64 overflow-hidden p-6 transition duration-200 hover:-translate-y-1 hover:shadow-card">
              <div className="flex items-start justify-between gap-4">
                <span className={`ui-icon ${tone}`}>
                  <Icon aria-hidden="true" className="size-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
                </span>
                <span className="text-sm font-bold tracking-wide text-slate-400">0{index + 1}</span>
              </div>
              <p className="mt-8 text-sm font-semibold text-semantic-muted">{issue}</p>
              <h3 className="mt-2 max-w-md text-xl font-extrabold tracking-[-0.03em] text-ink">{solution}</h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-semantic-muted">{description}</p>

              {index === 2 ? (
                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-bold text-brand-deep" aria-label="Flujo de reserva">
                  <span className="rounded-full bg-white px-3 py-2 shadow-sm">Reserva</span>
                  <ArrowRight aria-hidden="true" className="size-4" />
                  <span className="rounded-full bg-white px-3 py-2 shadow-sm">Pago</span>
                  <ArrowRight aria-hidden="true" className="size-4" />
                  <span className="rounded-full bg-white px-3 py-2 shadow-sm">Confirmación</span>
                </div>
              ) : null}
            </article>
          ))}
          </div>
        </div>
      </section>

      {/*
        DESCRIPCIÓN: Cierre de la propuesta de valor y pie de página.
        QUÉ HACE: Reitera el objetivo operativo y ofrece navegación mínima hacia la demo.
        PARA QUÉ SE UTILIZA: Cierra la landing sin mostrar tecnologías, testimonios ni métricas no verificadas.
      */}
      <section className="bg-brand-soft px-5 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 rounded-3xl border border-brand/15 bg-white/45 px-6 py-10 sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:px-14">
          <div className="max-w-2xl">
            <p className="ui-label border-brand/15 bg-white/65">CONTROL OPERATIVO, SIN RUIDO</p>
            <h2 className="mt-5 text-4xl font-extrabold leading-[1.02] tracking-[-0.055em] text-ink sm:text-5xl">Reservas claras para que el día tenga espacio para atender.</h2>
          </div>
          <div className="shrink-0">
            <DemoButton>Comenzar una reserva</DemoButton>
          </div>
        </div>
      </section>

      <footer className="bg-ink px-5 py-12 text-sm text-white sm:px-6 sm:py-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <p className="font-extrabold tracking-[-0.04em]">Reserva<span className="text-teal-300">Pro</span></p>
          <nav aria-label="Navegación del pie de página" className="flex flex-wrap gap-x-6 gap-y-3 font-semibold text-slate-300">
            <Link href="/catalogo" className="transition hover:text-white">Servicios</Link>
            <Link href="/reservar" className="transition hover:text-white">Reservar</Link>
            <Link href="/cuenta" className="transition hover:text-white">Mi cuenta</Link>
            <Link href="/reservar" className="text-teal-300 transition hover:text-white">Explorar demo</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
