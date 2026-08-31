"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

/** Se miden solo páginas públicas. Se eliminan parámetros; nunca se envían identificadores de reservas o pagos. */
export function Telemetry() {
  function publicEvent<T extends { url: string }>(event: T): T | null {
    const url = new URL(event.url, window.location.origin);
    if (!["/", "/catalogo"].includes(url.pathname)) return null;
    return { ...event, url: `${url.origin}${url.pathname}` };
  }
  return <><Analytics beforeSend={publicEvent} /><SpeedInsights beforeSend={publicEvent} /></>;
}
