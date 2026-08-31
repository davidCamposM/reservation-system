"use client";

/**
 * DESCRIPCIÓN: Límite visual ante un error inesperado de administración.
 * QUÉ HACE: Muestra un mensaje seguro y permite reintentar la carga de la ruta que falló.
 * PARA QUÉ SE UTILIZA: No se exponen detalles internos de base de datos o autenticación al administrador.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // El detalle se conserva para cumplir el contrato de Next.js, pero no se muestra por seguridad.
  void error;

  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-950">
      <h1 className="text-xl font-bold">No fue posible cargar la administración</h1>
      <p className="mt-2 text-sm">La información no se modificó. Intenta cargar el panel nuevamente.</p>
      <button type="button" onClick={reset} className="mt-5 rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800">Reintentar</button>
    </section>
  );
}
