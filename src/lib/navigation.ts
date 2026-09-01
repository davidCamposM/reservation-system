/** Historial permitido: nunca conserva tokens, callbacks ni direcciones externas. */
export type NavigationRole = "ADMIN" | "CUSTOMER" | null;
const PUBLIC_ROUTES = ["/", "/catalogo", "/ingresar", "/registro", "/recuperar-contrasena", "/restablecer-contrasena"];

export function isSafeHistoryRoute(path: string, role: NavigationRole) {
  if (PUBLIC_ROUTES.includes(path)) return !role || !["/ingresar", "/registro", "/recuperar-contrasena", "/restablecer-contrasena"].includes(path);
  if (role === "ADMIN") return ["/admin", "/admin/agenda"].includes(path);
  return role === "CUSTOMER" && ["/cuenta", "/reservar"].includes(path);
}

/** Una entrada directa siempre tiene una salida conocida dentro de la aplicación. */
export function fallbackRoute(path: string, role: NavigationRole) {
  if (path === "/pago/resultado") return role === "ADMIN" ? "/admin" : "/cuenta";
  if (path === "/admin/agenda") return "/admin";
  if (path === "/reservar") return "/catalogo";
  return "/";
}

/** Al regresar a una ruta anterior se recorta la pila, evitando ciclos entre dos páginas. */
export function recordRoute(history: string[], path: string, role: NavigationRole) {
  const clean = history.filter((entry) => isSafeHistoryRoute(entry, role));
  if (!isSafeHistoryRoute(path, role)) return clean;
  const previousIndex = clean.lastIndexOf(path);
  return previousIndex >= 0 ? clean.slice(0, previousIndex + 1) : [...clean, path].slice(-20);
}

export function previousRoute(history: string[], path: string, role: NavigationRole) {
  if (path === "/pago/resultado") return fallbackRoute(path, role);
  const entries = recordRoute(history, path, role);
  return entries.length > 1 ? entries[entries.length - 2] : fallbackRoute(path, role);
}
