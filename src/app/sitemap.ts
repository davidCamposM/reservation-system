import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/environment";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl(), priority: 1 }, { url: `${siteUrl()}/catalogo`, priority: 0.8 }];
}
