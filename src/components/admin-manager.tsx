"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CalendarDays, LayoutDashboard, Link2, Pencil, Plus, Search, Trash2, Users, BriefcaseBusiness } from "lucide-react";
import { CatalogEditor, type CatalogEditorTarget } from "@/components/catalog-editor";
import { professionalReadiness, type AdminCatalog } from "@/lib/catalog-types";

type View = "Resumen" | "Servicios" | "Profesionales" | "Vinculaciones";
const views = [{ name: "Resumen", icon: LayoutDashboard }, { name: "Servicios", icon: BriefcaseBusiness }, { name: "Profesionales", icon: Users }, { name: "Vinculaciones", icon: Link2 }] as const;

/** Todas las vistas comparten un catálogo; una asignación se refleja inmediatamente en ambos lados. */
export function AdminManager({ initialCatalog, children }: { initialCatalog: AdminCatalog; children: ReactNode }) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [view, setView] = useState<View>("Resumen");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<CatalogEditorTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function mutation(path: string, method: string, body?: object) {
    const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || "No fue posible guardar. El formulario conserva los cambios.");
    if (payload?.catalog) setCatalog(payload.catalog);
    else {
      const refresh = await fetch("/api/admin/catalog", { cache: "no-store" });
      const result = await refresh.json();
      if (!refresh.ok || !result.catalog) throw new Error("La operación se realizó, pero falta actualizar el catálogo. Recarga la página.");
      setCatalog(result.catalog);
    }
    setFailed(false); setMessage("Catálogo actualizado.");
  }

  async function remove(kind: "services" | "professionals", id: string, name: string) {
    if (!window.confirm(`¿Eliminar “${name}”? Si tiene reservas, debe desactivarse en lugar de eliminarse.`)) return;
    setBusy(true); setMessage("");
    try { await mutation(`/api/admin/${kind}/${id}`, "DELETE"); }
    catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "No fue posible eliminar."); }
    finally { setBusy(false); }
  }

  async function toggle(serviceId: string, professionalId: string) {
    const service = catalog.services.find((record) => record.id === serviceId)!;
    const ids = service.professionalIds.includes(professionalId) ? service.professionalIds.filter((id) => id !== professionalId) : [...service.professionalIds, professionalId];
    setBusy(true); setMessage("");
    try { await mutation(`/api/admin/services/${serviceId}`, "PATCH", { professionalIds: ids }); }
    catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "No fue posible vincular."); }
    finally { setBusy(false); }
  }

  const filteredServices = catalog.services.filter((s) => s.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const filteredProfessionals = catalog.professionals.filter((p) => `${p.name} ${p.bio ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const notReady = catalog.professionals.filter((p) => p.active && professionalReadiness(p, catalog.services) !== "Listo para recibir reservas");

  return <div className="space-y-6">
    <nav aria-label="Secciones del administrador" className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
      {views.map(({ name, icon: Icon }) => <button key={name} type="button" aria-pressed={view === name} onClick={() => { setView(name); setQuery(""); }} className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${view === name ? "bg-brand-deep text-white" : "text-slate-600 hover:bg-brand-soft"}`}><Icon aria-hidden="true" size={18} />{name}</button>)}
    </nav>
    {message && <p role={failed ? "alert" : "status"} className={`rounded-xl p-4 text-sm ${failed ? "bg-rose-50 text-rose-800" : "bg-teal-50 text-teal-900"}`}>{message}</p>}

    {view === "Resumen" && <div className="space-y-6">{children}
      <section className="admin-card flex flex-wrap items-center justify-between gap-5">
        <div><h2 className="text-lg font-extrabold">Servicios y equipo, conectados</h2><p className="mt-2 text-sm text-slate-600">{catalog.services.length} servicios · {catalog.professionals.length} profesionales. {notReady.length ? `${notReady.length} profesionales necesitan completar su configuración.` : "El equipo activo tiene servicios y jornada configurados."}</p></div>
        <button className="ui-button ui-button-primary" onClick={() => setView("Profesionales")}><Users size={18} /> Revisar equipo</button>
      </section>
    </div>}

    {(view === "Servicios" || view === "Profesionales") && <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="relative w-full sm:max-w-sm"><span className="sr-only">Buscar {view.toLowerCase()}</span><Search aria-hidden="true" size={18} className="absolute left-3 top-3.5 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${view.toLowerCase()}…`} className="admin-input mt-0 pl-10" /></label>
        <button onClick={() => setEditor({ kind: view === "Servicios" ? "services" : "professionals" })} className="ui-button ui-button-primary"><Plus size={18} />{view === "Servicios" ? "Crear servicio" : "Crear profesional"}</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {view === "Servicios" ? filteredServices.map((s) => <article key={s.id} className="admin-card flex flex-col gap-4">
          <div className="flex justify-between gap-3"><h2 className="text-xl font-extrabold">{s.name}</h2><span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{s.active ? "Activo" : "Inactivo"}</span></div>
          <p className="text-sm text-slate-600">{s.description || "Sin descripción."}</p>
          <p className="font-bold text-brand-deep">${s.price.toLocaleString("es-CL")} CLP · {s.durationMins} min</p>
          <div className="flex flex-wrap gap-2">{s.professionalIds.length ? catalog.professionals.filter((p) => s.professionalIds.includes(p.id)).map((p) => <span key={p.id} className="rounded-lg bg-brand-soft px-3 py-1 text-sm text-teal-900">{p.name}{!p.active && " · Inactivo"}</span>) : <span className="text-sm text-amber-800">Sin profesionales: aún no aparece en el catálogo público.</span>}</div>
          <div className="mt-auto flex gap-2 pt-2"><button className="route-control" onClick={() => setEditor({ kind: "services", record: s })}><Pencil size={16} />Editar y asignar</button><button disabled={busy} className="route-control" aria-label={`Eliminar servicio ${s.name}`} onClick={() => void remove("services", s.id, s.name)}><Trash2 size={16} /></button></div>
        </article>) : filteredProfessionals.map((p) => {
          const readiness = professionalReadiness(p, catalog.services);
          return <article key={p.id} className="admin-card flex flex-col gap-4">
            <h2 className="text-xl font-extrabold">{p.name}</h2><p className="text-sm text-slate-600">{p.bio || "Sin presentación."}</p>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${readiness === "Listo para recibir reservas" ? "bg-brand-soft text-teal-900" : "bg-amber-50 text-amber-900"}`}>{readiness}</span>
            <div className="flex flex-wrap gap-2">{catalog.services.filter((s) => p.serviceIds.includes(s.id)).map((s) => <span key={s.id} className="rounded-lg bg-slate-100 px-3 py-1 text-sm">{s.name}{!s.active && " · Inactivo"}</span>)}</div>
            <div className="mt-auto flex flex-wrap gap-2 pt-2"><button className="route-control" onClick={() => setEditor({ kind: "professionals", record: p })}><Pencil size={16} />Editar y vincular</button><Link href={`/admin/agenda?professional=${encodeURIComponent(p.id)}`} className="route-control"><CalendarDays size={16} />Jornada</Link><button disabled={busy} className="route-control" aria-label={`Eliminar profesional ${p.name}`} onClick={() => void remove("professionals", p.id, p.name)}><Trash2 size={16} /></button></div>
          </article>;
        })}
      </div>
      {(view === "Servicios" ? !filteredServices.length : !filteredProfessionals.length) && <p className="admin-card text-slate-600">No hay resultados. Puede crearse un registro con el botón superior.</p>}
    </>}

    {view === "Vinculaciones" && <section className="admin-card space-y-5">
      <div><h2 className="text-xl font-extrabold">Quién realiza cada servicio</h2><p className="mt-2 text-sm text-slate-600">Cada selección se guarda automáticamente. Desvincular no modifica reservas existentes.</p></div>
      {(!catalog.services.length || !catalog.professionals.length) ? <p className="text-slate-600">Primero deben crearse servicios y profesionales.</p> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><caption className="sr-only">Matriz de servicios y profesionales</caption><thead><tr><th scope="col" className="p-3">Servicio</th>{catalog.professionals.map((p) => <th scope="col" key={p.id} className="p-3">{p.name}{!p.active && " (inactivo)"}</th>)}</tr></thead><tbody>{catalog.services.map((s) => <tr key={s.id} className="border-t border-slate-100"><th scope="row" className="p-3">{s.name}{!s.active && " (inactivo)"}</th>{catalog.professionals.map((p) => <td key={p.id}><label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center p-3"><input aria-label={`${s.name} — ${p.name}`} type="checkbox" checked={s.professionalIds.includes(p.id)} disabled={busy} onChange={() => void toggle(s.id, p.id)} className="size-5 accent-teal-700" /></label></td>)}</tr>)}</tbody></table></div>
        <div className="space-y-4 md:hidden">{catalog.services.map((s) => <fieldset key={s.id} className="rounded-xl border border-slate-200 p-3"><legend className="px-2 font-bold">{s.name}</legend>{catalog.professionals.map((p) => <label key={p.id} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={s.professionalIds.includes(p.id)} disabled={busy} onChange={() => void toggle(s.id, p.id)} className="size-5 accent-teal-700" />{p.name}{!p.active && " (inactivo)"}</label>)}</fieldset>)}</div>
      </>}
      {busy && <p role="status" className="text-sm text-brand-deep">Guardando vinculación…</p>}
    </section>}
    {editor && <CatalogEditor target={editor} catalog={catalog} onClose={() => setEditor(null)} onSave={(body) => mutation(`/api/admin/${editor.kind}${editor.record ? `/${editor.record.id}` : ""}`, editor.record ? "PATCH" : "POST", body)} />}
  </div>;
}
