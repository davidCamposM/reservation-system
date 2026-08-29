"use client";

/**
 * DESCRIPCIÓN: Herramientas de React para una interfaz que cambia en el navegador.
 * QUÉ HACE: FormEvent tipa los formularios y useState conserva los datos visibles después de cada acción.
 * PARA QUÉ SE UTILIZA: AdminManager permite administrar servicios y profesionales sin recargar la página.
 */
import { type Dispatch, type FormEvent, type FormEventHandler, type SetStateAction, useState } from "react";

/**
 * DESCRIPCIÓN: Forma de un servicio que este componente recibe desde la página administrativa.
 * QUÉ HACE: Describe solo los datos que la interfaz necesita mostrar o editar.
 * PARA QUÉ SE UTILIZA: TypeScript detecta errores si se intenta usar un campo inexistente.
 */
export type ManagedService = {
  id: string;
  name: string;
  description: string | null;
  durationMins: number;
  price: number;
  active: boolean;
};

/**
 * DESCRIPCIÓN: Forma de un profesional usada por la interfaz administrativa.
 * QUÉ HACE: Representa sus campos editables y su estado de disponibilidad.
 * PARA QUÉ SE UTILIZA: Mantiene consistente la información que viaja entre React y la API.
 */
export type ManagedProfessional = {
  id: string;
  name: string;
  bio: string | null;
  active: boolean;
};

type RecordType = "services" | "professionals";
type RequestMethod = "POST" | "PATCH" | "DELETE";

/**
 * DESCRIPCIÓN: Función común para comunicarse con las rutas API de administración.
 * QUÉ HACE: Envía una solicitud, transforma el cuerpo a JSON cuando corresponde y entrega la respuesta.
 * PARA QUÉ SE UTILIZA: Evita repetir la misma lógica de fetch y manejo de errores para cada botón.
 */
async function apiRequest<T>(path: string, method: RequestMethod, body?: object): Promise<T | null> {
  const response = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Las rutas API devuelven un mensaje JSON cuando la acción no pudo completarse.
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "No se pudo guardar el cambio.");
  }

  // HTTP 204 se usa al eliminar: confirma éxito, pero no incluye un cuerpo de respuesta.
  if (response.status === 204) return null;
  return response.json() as Promise<T>;
}

/**
 * DESCRIPCIÓN: Propiedades requeridas por el contenedor administrativo.
 * QUÉ HACE: Recibe los datos iniciales que la página /admin obtuvo desde PostgreSQL.
 * PARA QUÉ SE UTILIZA: React puede pintar el estado actual apenas se carga el panel.
 */
type AdminManagerProps = {
  initialServices: ManagedService[];
  initialProfessionals: ManagedProfessional[];
};

/**
 * DESCRIPCIÓN: Área interactiva para administrar catálogo y profesionales.
 * QUÉ HACE: Mantiene datos locales, llama a las APIs y actualiza la interfaz según el resultado.
 * PARA QUÉ SE UTILIZA: Centraliza el CRUD que usa el administrador en la ruta /admin.
 */
export function AdminManager({ initialServices, initialProfessionals }: AdminManagerProps) {
  /**
   * DESCRIPCIÓN: Estado local de los datos y mensaje de resultado.
   * QUÉ HACE: Guarda las listas que se ven en pantalla y la última confirmación o error.
   * PARA QUÉ SE UTILIZA: La interfaz se actualiza inmediatamente sin solicitar toda la página nuevamente.
   */
  const [services, setServices] = useState(initialServices);
  const [professionals, setProfessionals] = useState(initialProfessionals);
  const [message, setMessage] = useState("");

  /**
   * DESCRIPCIÓN: Crea un servicio a partir del formulario de servicios.
   * QUÉ HACE: Lee los campos, llama a POST /api/admin/services y agrega la respuesta a la lista local.
   * PARA QUÉ SE UTILIZA: Permite ampliar el catálogo sin recargar /admin.
   */
  async function createService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const result = await apiRequest<{ service: ManagedService }>("/api/admin/services", "POST", {
        name: form.get("name"),
        description: form.get("description"),
        durationMins: Number(form.get("duration")),
        price: Number(form.get("price")),
      });

      if (result) setServices((current) => [...current, result.service]);
      event.currentTarget.reset();
      setMessage("Servicio creado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    }
  }

  /**
   * DESCRIPCIÓN: Crea un profesional desde el formulario correspondiente.
   * QUÉ HACE: Envía los datos validados por la API y agrega el registro creado al estado local.
   * PARA QUÉ SE UTILIZA: Permite al administrador incorporar personas que atenderán reservas.
   */
  async function createProfessional(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const result = await apiRequest<{ professional: ManagedProfessional }>("/api/admin/professionals", "POST", {
        name: form.get("name"),
        bio: form.get("bio"),
      });

      if (result) setProfessionals((current) => [...current, result.professional]);
      event.currentTarget.reset();
      setMessage("Profesional creado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    }
  }

  /**
   * DESCRIPCIÓN: Guarda los cambios de un servicio existente.
   * QUÉ HACE: Envía el servicio editado mediante PATCH y sustituye solo ese elemento de la lista local.
   * PARA QUÉ SE UTILIZA: Refleja cambios de nombre, duración, precio o estado activo.
   */
  async function saveService(service: ManagedService) {
    try {
      const result = await apiRequest<{ service: ManagedService }>(`/api/admin/services/${service.id}`, "PATCH", service);
      if (result) setServices((current) => current.map((item) => item.id === service.id ? result.service : item));
      setMessage("Servicio actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    }
  }

  /**
   * DESCRIPCIÓN: Guarda los cambios de un profesional existente.
   * QUÉ HACE: Envía PATCH a la ruta que contiene el id y reemplaza ese profesional en la lista local.
   * PARA QUÉ SE UTILIZA: Permite cambiar nombre, biografía o estado activo.
   */
  async function saveProfessional(professional: ManagedProfessional) {
    try {
      const result = await apiRequest<{ professional: ManagedProfessional }>(`/api/admin/professionals/${professional.id}`, "PATCH", professional);
      if (result) setProfessionals((current) => current.map((item) => item.id === professional.id ? result.professional : item));
      setMessage("Profesional actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    }
  }

  /**
   * DESCRIPCIÓN: Elimina un servicio o profesional después de pedir confirmación.
   * QUÉ HACE: Solicita confirmación, llama DELETE y quita el registro de la lista local si la API tiene éxito.
   * PARA QUÉ SE UTILIZA: Evita eliminaciones accidentales y mantiene la interfaz sincronizada con PostgreSQL.
   */
  async function removeRecord(kind: RecordType, id: string) {
    if (!window.confirm("¿Eliminar este registro?")) return;

    try {
      await apiRequest(`/api/admin/${kind}/${id}`, "DELETE");

      if (kind === "services") {
        setServices((current) => current.filter((item) => item.id !== id));
      } else {
        setProfessionals((current) => current.filter((item) => item.id !== id));
      }

      setMessage("Registro eliminado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    }
  }

  /**
   * DESCRIPCIÓN: Estructura visual de los dos paneles de gestión.
   * QUÉ HACE: Muestra un mensaje opcional, formularios de creación y listas editables.
   * PARA QUÉ SE UTILIZA: Reúne las tareas administrativas cotidianas en una sola vista clara.
   */
  return (
    <section className="mt-10 space-y-8">
      {/* Mensaje de éxito o error producido por una acción anterior. */}
      {message ? <p className="rounded-lg bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800">{message}</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <ServiceManagement
          services={services}
          onCreate={createService}
          onChange={setServices}
          onSave={saveService}
          onDelete={(id) => removeRecord("services", id)}
        />
        <ProfessionalManagement
          professionals={professionals}
          onCreate={createProfessional}
          onChange={setProfessionals}
          onSave={saveProfessional}
          onDelete={(id) => removeRecord("professionals", id)}
        />
      </div>
    </section>
  );
}

type ServiceManagementProps = {
  services: ManagedService[];
  onCreate: FormEventHandler<HTMLFormElement>;
  onChange: Dispatch<SetStateAction<ManagedService[]>>;
  onSave(service: ManagedService): void;
  onDelete(id: string): void;
};

/**
 * DESCRIPCIÓN: Panel visual para crear y editar servicios.
 * QUÉ HACE: Contiene el formulario de alta y una fila editable por cada servicio existente.
 * PARA QUÉ SE UTILIZA: Reduce el tamaño de AdminManager y separa la gestión del catálogo.
 */
function ServiceManagement({ services, onCreate, onChange, onSave, onDelete }: ServiceManagementProps) {
  function changeService(id: string, changes: Partial<ManagedService>) {
    onChange((current) => current.map((service) => service.id === id ? { ...service, ...changes } : service));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">Servicios</h2>

      {/* Formulario para crear un nuevo servicio. */}
      <form onSubmit={onCreate} className="mt-4 grid gap-2 sm:grid-cols-2">
        <input required name="name" placeholder="Nombre" className="rounded-lg border border-slate-300 px-3 py-2" />
        <input name="description" placeholder="Descripción breve" className="rounded-lg border border-slate-300 px-3 py-2" />
        <input required name="duration" type="number" min="15" step="15" placeholder="Duración (min)" className="rounded-lg border border-slate-300 px-3 py-2" />
        <input required name="price" type="number" min="0" placeholder="Precio CLP" className="rounded-lg border border-slate-300 px-3 py-2" />
        <button className="rounded-lg bg-teal-700 px-3 py-2 font-bold text-white sm:col-span-2">Agregar servicio</button>
      </form>

      {/* Lista de servicios existentes: cada fila cambia primero el estado local y luego se guarda con el botón. */}
      <div className="mt-5 space-y-3">
        {services.map((service) => (
          <div key={service.id} className="rounded-xl border border-slate-200 p-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <input value={service.name} onChange={(event) => changeService(service.id, { name: event.target.value })} className="rounded border border-slate-300 px-2 py-1" />
              <input value={service.durationMins} onChange={(event) => changeService(service.id, { durationMins: Number(event.target.value) })} type="number" className="rounded border border-slate-300 px-2 py-1" />
              <input value={service.price} onChange={(event) => changeService(service.id, { price: Number(event.target.value) })} type="number" className="rounded border border-slate-300 px-2 py-1" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-2"><input checked={service.active} onChange={(event) => changeService(service.id, { active: event.target.checked })} type="checkbox" />Activo</label>
              <button type="button" onClick={() => onSave(service)} className="font-bold text-teal-700">Guardar</button>
              <button type="button" onClick={() => onDelete(service.id)} className="font-bold text-red-700">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ProfessionalManagementProps = {
  professionals: ManagedProfessional[];
  onCreate: FormEventHandler<HTMLFormElement>;
  onChange: Dispatch<SetStateAction<ManagedProfessional[]>>;
  onSave(professional: ManagedProfessional): void;
  onDelete(id: string): void;
};

/**
 * DESCRIPCIÓN: Panel visual para crear y editar profesionales.
 * QUÉ HACE: Incluye un formulario de alta y controles para editar cada profesional existente.
 * PARA QUÉ SE UTILIZA: Mantiene separada la gestión de personas de la gestión de servicios.
 */
function ProfessionalManagement({ professionals, onCreate, onChange, onSave, onDelete }: ProfessionalManagementProps) {
  function changeProfessional(id: string, changes: Partial<ManagedProfessional>) {
    onChange((current) => current.map((professional) => professional.id === id ? { ...professional, ...changes } : professional));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">Profesionales</h2>

      {/* Formulario para crear un profesional nuevo. */}
      <form onSubmit={onCreate} className="mt-4 grid gap-2">
        <input required name="name" placeholder="Nombre" className="rounded-lg border border-slate-300 px-3 py-2" />
        <input name="bio" placeholder="Especialidad o biografía breve" className="rounded-lg border border-slate-300 px-3 py-2" />
        <button className="rounded-lg bg-slate-950 px-3 py-2 font-bold text-white">Agregar profesional</button>
      </form>

      {/* Lista editable de profesionales existentes. */}
      <div className="mt-5 space-y-3">
        {professionals.map((professional) => (
          <div key={professional.id} className="rounded-xl border border-slate-200 p-3">
            <input value={professional.name} onChange={(event) => changeProfessional(professional.id, { name: event.target.value })} className="w-full rounded border border-slate-300 px-2 py-1" />
            <input value={professional.bio ?? ""} onChange={(event) => changeProfessional(professional.id, { bio: event.target.value })} placeholder="Especialidad" className="mt-2 w-full rounded border border-slate-300 px-2 py-1" />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-2"><input checked={professional.active} onChange={(event) => changeProfessional(professional.id, { active: event.target.checked })} type="checkbox" />Activo</label>
              <button type="button" onClick={() => onSave(professional)} className="font-bold text-teal-700">Guardar</button>
              <button type="button" onClick={() => onDelete(professional.id)} className="font-bold text-red-700">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
