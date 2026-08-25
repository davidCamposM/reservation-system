import Link from "next/link";

const features = ["Servicios y profesionales", "Agenda en tiempo real", "Pagos online seguros"];

export default function HomePage() {
  return (
    <section className="space-y-16">
      <div className="max-w-3xl space-y-6 pt-10">
        <p className="font-semibold text-teal-700">AGENDA INTELIGENTE PARA SERVICIOS</p>
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">Tu tiempo. Tus reservas. Todo en orden.</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-600">ReservaPro ayuda a negocios de servicios a gestionar su agenda, profesionales y pagos desde un único lugar.</p>
        <Link href="/reservar" className="inline-flex rounded-lg bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800">Reservar una hora</Link>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {features.map((feature, index) => (
          <article key={feature} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="text-sm font-bold text-teal-700">0{index + 1}</span>
            <h2 className="mt-4 text-xl font-semibold">{feature}</h2>
            <p className="mt-2 text-slate-600">Base preparada para una experiencia de reserva clara y confiable.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
