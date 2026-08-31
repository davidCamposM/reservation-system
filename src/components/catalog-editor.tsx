"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { AdminCatalog, AdminProfessional, AdminService } from "@/lib/catalog-types";
import { useUnsavedChanges } from "@/components/navigation-provider";

export type CatalogEditorTarget = { kind: "services"; record?: AdminService } | { kind: "professionals"; record?: AdminProfessional };
type Props = { target: CatalogEditorTarget; catalog: AdminCatalog; onClose: () => void; onSave: (body: object) => Promise<void> };

/** Campos reutilizados por el servicio principal y por cada servicio creado junto al profesional. */
function ServiceFields({ prefix = "", record }: { prefix?: string; record?: AdminService }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-semibold sm:col-span-2">Nombre del servicio<input autoComplete="off" className="admin-input" name={`${prefix}name`} required minLength={2} maxLength={100} defaultValue={record?.name} placeholder="Ej. Evaluación dental" /></label>
    <label className="text-sm font-semibold">Precio en CLP<input className="admin-input" name={`${prefix}price`} type="number" min={1} max={999999999} step={1} required defaultValue={record?.price} placeholder="25000" /></label>
    <label className="text-sm font-semibold">Duración en minutos<input className="admin-input" name={`${prefix}durationMins`} type="number" min={5} max={480} step={1} required defaultValue={record?.durationMins ?? 30} /></label>
    <label className="text-sm font-semibold sm:col-span-2">Descripción<textarea className="admin-input" name={`${prefix}description`} maxLength={1000} rows={2} defaultValue={record?.description ?? ""} /></label>
  </div>;
}

/** El diálogo nativo confina el foco, admite Escape y devuelve el foco al botón que lo abrió. */
export function CatalogEditor({ target, catalog, onClose, onSave }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [newServices, setNewServices] = useState<string[]>([]);
  useUnsavedChanges("catalog-editor", dirty);
  useEffect(() => { dialog.current?.showModal(); }, []);

  function close() {
    if (saving) return;
    if (dirty) { setConfirmDiscard(true); return; }
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const serviceData = (prefix = "") => ({ name: String(form.get(`${prefix}name`) ?? ""), description: String(form.get(`${prefix}description`) ?? ""), price: Number(form.get(`${prefix}price`)), durationMins: Number(form.get(`${prefix}durationMins`)) });
    const body = target.kind === "services"
      ? { ...serviceData(), active: form.get("active") === "on", professionalIds: form.getAll("professionalIds") }
      : { name: String(form.get("name")), bio: String(form.get("bio") ?? ""), active: form.get("active") === "on", serviceIds: form.getAll("serviceIds"), newServices: newServices.map((id) => serviceData(`new.${id}.`)) };
    setSaving(true); setMessage("");
    try { await onSave(body); setDirty(false); onClose(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No fue posible guardar. El borrador se conserva."); }
    finally { setSaving(false); }
  }

  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); close(); }} aria-labelledby="editor-title" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-canvas p-0 text-ink shadow-float backdrop:bg-ink/40 backdrop:backdrop-blur-sm">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
      <h2 id="editor-title" className="text-xl font-extrabold">{target.record ? "Editar" : "Crear"} {target.kind === "services" ? "servicio" : "profesional"}</h2>
      <button type="button" disabled={saving} onClick={close} aria-label="Cerrar formulario" className="route-control px-3"><X size={20} /></button>
    </div>
    <form onSubmit={submit} onChange={() => setDirty(true)} className="space-y-6 p-6">
      {dirty && <p className="text-sm font-semibold text-amber-900">Cambios sin guardar</p>}
      {confirmDiscard && <div role="alert" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold">¿Descartar los cambios del formulario?</p><p className="text-sm">Los cambios aún no se han guardado.</p><div className="flex flex-wrap gap-2"><button type="button" className="route-control" onClick={() => setConfirmDiscard(false)}>Seguir editando</button><button type="button" className="route-control text-rose-800" onClick={onClose}>Descartar cambios</button></div></div>}
      <fieldset disabled={saving} className="space-y-6 disabled:opacity-60">
        {target.kind === "services" ? <ServiceFields record={target.record} /> : <div className="space-y-4">
          <label className="block text-sm font-semibold">Nombre del profesional<input name="name" required minLength={2} maxLength={100} defaultValue={target.record?.name} className="admin-input" placeholder="Ej. Pedro Juan" /></label>
          <label className="block text-sm font-semibold">Especialidad o presentación<textarea name="bio" maxLength={1000} rows={3} defaultValue={target.record?.bio ?? ""} className="admin-input" placeholder="Ej. Dentista. Atención general y preventiva." /></label>
        </div>}
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={target.record?.active ?? true} className="size-5 accent-teal-700" />{target.kind === "services" ? "Servicio activo" : "Profesional activo"}</label>
        <fieldset className="rounded-2xl border border-slate-200 bg-white p-4">
          <legend className="px-2 font-bold">{target.kind === "services" ? "Profesionales que realizan este servicio" : "Servicios que realiza"}</legend>
          <p className="mb-3 text-sm text-slate-600">La selección vincula ambos registros. Puede elegirse más de uno.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {target.kind === "services" ? catalog.professionals.map((p) => <label key={p.id} className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm"><input type="checkbox" name="professionalIds" value={p.id} defaultChecked={target.record?.professionalIds.includes(p.id)} className="size-5 accent-teal-700" /><span>{p.name}{!p.active && " (inactivo)"}</span></label>) : catalog.services.map((s) => <label key={s.id} className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm"><input type="checkbox" name="serviceIds" value={s.id} defaultChecked={target.record?.serviceIds.includes(s.id)} className="size-5 accent-teal-700" /><span>{s.name}{!s.active && " (inactivo)"}</span></label>)}
          </div>
          {(target.kind === "services" ? !catalog.professionals.length : !catalog.services.length) && <p className="text-sm text-slate-600">Aún no hay registros para seleccionar.{target.kind === "professionals" && " Los servicios pueden crearse aquí mismo."}</p>}
        </fieldset>
        {target.kind === "professionals" && <section className="space-y-4">
          <div><h3 className="font-bold">Crear servicios en este mismo paso</h3><p className="mt-1 text-sm text-slate-600">Se guardarán y quedarán vinculados a este profesional automáticamente.</p></div>
          {newServices.map((id, index) => <div key={id} className="admin-card space-y-4 border-teal-200">
            <div className="flex items-center justify-between"><h4 className="font-bold">Nuevo servicio {index + 1}</h4><button type="button" className="route-control" aria-label={`Quitar nuevo servicio ${index + 1}`} onClick={() => { setNewServices((current) => current.filter((entry) => entry !== id)); setDirty(true); }}><Trash2 size={16} /></button></div>
            <ServiceFields prefix={`new.${id}.`} />
          </div>)}
          <button type="button" disabled={newServices.length >= 10} onClick={() => { setNewServices((current) => [...current, crypto.randomUUID()]); setDirty(true); }} className="route-control"><Plus size={18} /> Agregar nuevo servicio</button>
        </section>}
      </fieldset>
      {message && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{message}</p>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={close} disabled={saving} className="route-control">Cancelar</button><button type="submit" disabled={saving} className="ui-button ui-button-primary disabled:opacity-60">{saving ? "Guardando…" : "Guardar y vincular"}</button></div>
    </form>
  </dialog>;
}
