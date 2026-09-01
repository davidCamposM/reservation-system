"use client";

/**
 * DESCRIPCIÓN: Dependencias para formularios que se ejecutan en el navegador.
 * QUÉ HACE: signIn crea la sesión con NextAuth; Link navega sin recargar; useState guarda mensajes y carga.
 * PARA QUÉ SE UTILIZA: Permite registrar e iniciar sesión desde las páginas públicas de ReservaPro.
 */
import { signIn } from "next-auth/react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { safeCallbackUrl } from "@/lib/auth-navigation";
import { getResponseMessage } from "@/lib/http";

/**
 * DESCRIPCIÓN: Formulario de acceso para una cuenta existente.
 * QUÉ HACE: Envía correo y contraseña al proveedor credentials de NextAuth.
 * PARA QUÉ SE UTILIZA: Crea una sesión y lleva al cliente a /cuenta cuando sus credenciales son correctas.
 */
export function LoginForm({ callbackUrl, passwordReset }: { callbackUrl?: string; passwordReset?: boolean }) {
  // Este mensaje se muestra solo si NextAuth rechaza las credenciales.
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * DESCRIPCIÓN: Acción ejecutada al enviar el formulario.
   * QUÉ HACE: Evita la recarga, toma los campos y solicita a NextAuth iniciar sesión.
   * PARA QUÉ SE UTILIZA: Mantiene la autenticación dentro de la aplicación sin enviar un formulario HTML tradicional.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const form = new FormData(event.currentTarget);
      const result = await signIn("credentials", {
        email: form.get("email"),
        password: form.get("password"),
        redirect: false,
      });

      if (result?.error || !result?.ok) {
        setMessage("Correo o contraseña incorrectos.");
        return;
      }

      // Después de crear la sesión, el cliente puede acceder a sus reservas.
      window.location.assign(safeCallbackUrl(callbackUrl));
    } catch {
      setMessage("No fue posible iniciar sesión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
      {passwordReset ? <p role="status" className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">La contraseña fue actualizada. Ya puedes iniciar sesión.</p> : null}
      <label className="block text-sm font-bold text-slate-700">
        Correo electrónico
        <input required name="email" type="email" placeholder="nombre@correo.cl" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
      </label>
      <div className="flex justify-end"><Link href="/recuperar-contrasena" className="text-sm font-bold text-teal-700 hover:underline">¿Olvidaste tu contraseña?</Link></div>
      <label className="block text-sm font-bold text-slate-700">
        Contraseña
        <input required name="password" type="password" minLength={8} placeholder="••••••••" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
      </label>
      {message ? <p role="alert" className="text-sm font-semibold text-red-700">{message}</p> : null}
      <button disabled={loading} className="w-full rounded-lg bg-slate-950 py-3 font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Ingresando..." : "Ingresar"}</button>
    </form>
  );
}

/**
 * DESCRIPCIÓN: Formulario para crear una cuenta de cliente.
 * QUÉ HACE: Envía los datos a /api/register y, si se crea la cuenta, inicia sesión automáticamente.
 * PARA QUÉ SE UTILIZA: El visitante no necesita volver a ingresar sus credenciales después de registrarse.
 */
export function RegistrationForm({ callbackUrl }: { callbackUrl?: string }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * DESCRIPCIÓN: Acción de registro e inicio de sesión posterior.
   * QUÉ HACE: Crea la cuenta por API y después utiliza signIn con las mismas credenciales.
   * PARA QUÉ SE UTILIZA: Conecta los dos pasos necesarios para que un nuevo cliente llegue a su cuenta.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const form = new FormData(event.currentTarget);
      const body = Object.fromEntries(form.entries());
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = payload && typeof payload === "object" && "message" in payload ? payload.message : null;
        setMessage(typeof errorMessage === "string" ? errorMessage : "No fue posible crear la cuenta.");
        return;
      }

      const result = await signIn("credentials", {
        email: String(body.email ?? ""),
        password: String(body.password ?? ""),
        redirect: false,
      });

      // En un error inesperado de sesión, la cuenta ya existe y se puede usar desde la pantalla de acceso.
      if (result?.error || !result?.ok) {
        window.location.assign(`/ingresar?callbackUrl=${encodeURIComponent(safeCallbackUrl(callbackUrl))}`);
        return;
      }

      window.location.assign(safeCallbackUrl(callbackUrl));
    } catch {
      setMessage("No fue posible crear la cuenta. Revisa tu conexión e intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
      <label className="text-sm font-bold text-slate-700">Nombre completo<input required name="name" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" placeholder="Tu nombre" /></label>
      <label className="text-sm font-bold text-slate-700">Correo electrónico<input required name="email" type="email" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" placeholder="nombre@correo.cl" /></label>
      <label className="text-sm font-bold text-slate-700">Teléfono<input name="phone" type="tel" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" placeholder="+56 9..." /></label>
      <label className="text-sm font-bold text-slate-700">Contraseña<input required name="password" type="password" minLength={8} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" placeholder="Mínimo 8 caracteres" /></label>
      {message ? <p role="alert" className="text-sm font-semibold text-red-700">{message}</p> : null}
      <button disabled={loading} className="mt-2 rounded-lg bg-teal-700 py-3 font-bold text-white disabled:opacity-60 hover:bg-teal-800">{loading ? "Creando cuenta..." : "Crear cuenta"}</button>
    </form>
  );
}

/**
 * DESCRIPCIÓN: Enlace contextual entre registro e inicio de sesión.
 * QUÉ HACE: Muestra el enlace opuesto según la página que lo utiliza.
 * PARA QUÉ SE UTILIZA: Ayuda a la persona a cambiar de flujo sin duplicar este texto en dos páginas.
 */
export function AuthFooter({ register, callbackUrl }: { register?: boolean; callbackUrl?: string }) {
  if (register) {
    return <p className="mt-5 text-center text-sm text-slate-600">¿Ya tienes una cuenta? <Link className="font-bold text-teal-700 hover:underline" href={`/ingresar?callbackUrl=${encodeURIComponent(safeCallbackUrl(callbackUrl))}`}>Inicia sesión</Link></p>;
  }

  return <p className="mt-5 text-center text-sm text-slate-600">¿Aún no tienes cuenta? <Link className="font-bold text-teal-700 hover:underline" href={`/registro?callbackUrl=${encodeURIComponent(safeCallbackUrl(callbackUrl))}`}>Crea tu cuenta</Link></p>;
}

export function PasswordResetRequestForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const email = String(new FormData(event.currentTarget).get("email") ?? "");
      const response = await fetch("/api/auth/password-reset/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const payload = await response.json().catch(() => null);
      setMessage(response.ok ? "Si existe una cuenta asociada, se enviará un enlace de recuperación a ese correo." : getResponseMessage(payload, "No fue posible procesar la solicitud. Intenta nuevamente."));
    } catch {
      setMessage("No fue posible procesar la solicitud. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
    <label className="block text-sm font-bold text-slate-700">Correo electrónico<input required name="email" type="email" autoComplete="email" placeholder="nombre@correo.cl" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
    {message ? <p role="status" className="text-sm font-semibold text-slate-700">{message}</p> : null}
    <button disabled={loading} className="w-full rounded-lg bg-slate-950 py-3 font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Enviando..." : "Enviar enlace"}</button>
  </form>;
}

export function NewPasswordForm({ token }: { token?: string }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) { setMessage("El enlace de recuperación no es válido."); return; }
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (password !== confirmPassword) { setMessage("Las contraseñas no coinciden."); return; }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) { setMessage(getResponseMessage(payload, "No fue posible restablecer la contraseña.")); return; }
      window.location.assign("/ingresar?passwordReset=1");
    } catch {
      setMessage("No fue posible restablecer la contraseña. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
    <label className="block text-sm font-bold text-slate-700">Nueva contraseña<input required name="password" type="password" minLength={8} maxLength={72} autoComplete="new-password" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
    <label className="block text-sm font-bold text-slate-700">Repite la contraseña<input required name="confirmPassword" type="password" minLength={8} maxLength={72} autoComplete="new-password" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
    {message ? <p role="alert" className="text-sm font-semibold text-red-700">{message}</p> : null}
    <button disabled={loading || !token} className="w-full rounded-lg bg-slate-950 py-3 font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Actualizando..." : "Guardar nueva contraseña"}</button>
  </form>;
}
