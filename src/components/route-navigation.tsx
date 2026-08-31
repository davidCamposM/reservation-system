"use client";

import { ArrowLeft, House } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { previousRoute, recordRoute, type NavigationRole } from "@/lib/navigation";
import { useNavigationGuard } from "@/components/navigation-provider";

const STORAGE_KEY = "reservapro:navigation:v1";

/** Guarda únicamente rutas conocidas en esta pestaña; un cambio de identidad descarta el historial anterior. */
export function RouteNavigation({ identity, role }: { identity: string; role: NavigationRole }) {
  const path = usePathname();
  const router = useRouter();
  const { confirmNavigation } = useNavigationGuard();
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => {
    let entries: string[] = [];
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.identity === identity && Array.isArray(saved.paths)) entries = saved.paths.filter((entry: unknown) => typeof entry === "string");
    } catch { /* El almacenamiento privado o bloqueado no impide navegar. */ }
    entries = recordRoute(entries, path, role);
    setHistory(entries);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ identity, paths: entries })); } catch { /* Se conserva la salida segura. */ }
  }, [path, identity, role]);

  if (path === "/") return null;
  // La cabecera contiene ambas filas fuera del área desplazable. No se
  // necesitan coordenadas fijas ni alturas de compensación por dispositivo.
  return (
    <nav
      aria-label="Navegación de regreso"
      data-route-navigation="stationary"
      className="py-3"
    >
      <div className="mx-auto flex max-w-7xl gap-2">
        <button type="button" onClick={() => { if (confirmNavigation()) router.push(previousRoute(history, path, role)); }} className="route-control">
          <ArrowLeft aria-hidden="true" size={18} /> Volver
        </button>
        <Link href="/" className="route-control"><House aria-hidden="true" size={18} /> Inicio</Link>
      </div>
    </nav>
  );
}
