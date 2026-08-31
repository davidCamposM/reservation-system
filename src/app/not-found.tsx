import Link from "next/link";

/**
 * DESCRIPCIÓN: Pantalla para rutas que no existen en ReservaPro.
 * QUÉ HACE: Sustituye la respuesta técnica predeterminada por una explicación y un enlace de recuperación.
 * PARA QUÉ SE UTILIZA: Una URL escrita de forma incorrecta no deja al visitante sin una forma clara de continuar navegando.
 */
export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-700">Error 404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Esta página no existe</h1>
      <p className="mt-3 text-slate-600">La dirección puede estar incompleta o el contenido ya no está disponible.</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
        Volver al inicio
      </Link>
    </section>
  );
}
