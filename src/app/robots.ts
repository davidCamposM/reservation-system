import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/environment";

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: ["/", "/catalogo"], disallow: ["/admin", "/api", "/cuenta", "/pago", "/reservar", "/ingresar", "/registro"] }, sitemap: `${siteUrl()}/sitemap.xml` };
}
