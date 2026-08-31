"use client";

/**
 * DESCRIPCIÓN: Límite global ante errores inesperados de páginas públicas o privadas.
 * QUÉ HACE: Evita que Next.js muestre detalles internos y ofrece una acción para volver a intentar la carga.
 * PARA QUÉ SE UTILIZA: Protege la experiencia de usuarios y administradores cuando falla una consulta, una sesión o una dependencia del servidor.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // El error queda disponible para el registro seguro del servidor, pero no se expone información técnica al visitante.
  void error;

  return (
        <div className="mx-auto flex max-w-2xl items-center py-16">
          <section className="w-full rounded-2xl border border-rose-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-rose-700">Error inesperado</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">No fue posible cargar esta página</h1>
            <p className="mt-3 text-slate-600">La página no pudo actualizarse. Antes de repetir una operación, conviene comprobar su estado.</p>
            <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
              Reintentar
            </button>
          </section>
        </div>
  );
}
