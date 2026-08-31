/**
 * DESCRIPCIÓN: Estado de carga de la sección administrativa.
 * QUÉ HACE: Muestra bloques visuales mientras Next.js obtiene los datos protegidos de /admin.
 * PARA QUÉ SE UTILIZA: Evita una pantalla vacía y comunica que el panel está siendo preparado.
 */
export default function AdminLoading() {
  return (
    <section className="space-y-6" aria-label="Cargando administración" aria-busy="true">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        {["metric-one", "metric-two", "metric-three"].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
    </section>
  );
}
