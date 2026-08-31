import type { NextConfig } from "next";
import { existsSync } from "node:fs";

// Evita que un árbol recreado por accidente vuelva a ocultar las páginas canónicas.
if (existsSync("app")) throw new Error("ReservaPro utiliza src/app. Se detectó un directorio app duplicado en la raíz; debe revisarse antes de iniciar.");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
    ] }, { source: "/:section(admin|cuenta|reservar|ingresar|registro|pago|api)/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
