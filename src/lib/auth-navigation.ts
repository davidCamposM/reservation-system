/** Solo se acepta un destino conocido. Nunca se redirige a dominios externos desde un parámetro de login. */
export function safeCallbackUrl(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/cuenta";
  try {
    const url = new URL(value, "https://reservapro.invalid");
    if (url.origin !== "https://reservapro.invalid") return "/cuenta";
    if (url.pathname === "/cuenta" || url.pathname === "/admin") return url.pathname;
    if (url.pathname === "/reservar") {
      const service = url.searchParams.get("service");
      return `/reservar${service && service.length <= 100 ? `?service=${encodeURIComponent(service)}` : ""}`;
    }
  } catch { /* Los destinos inválidos se sustituyen por la cuenta. */ }
  return "/cuenta";
}
