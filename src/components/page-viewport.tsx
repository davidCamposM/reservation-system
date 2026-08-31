"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * Área desplazable de la aplicación. La cabecera es una fila hermana y nunca
 * participa en su scroll: títulos, tarjetas y formularios no pasan por detrás.
 * Al cambiar de ruta se abre el contenido desde arriba; los enlaces con ancla
 * mantienen su destino dentro de esta misma área.
 */
export function PageViewport({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const viewport = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);

  useLayoutEffect(() => {
    const content = viewport.current;
    if (!content) return;

    let target: HTMLElement | null = null;
    try {
      target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    } catch {
      // Un fragmento mal codificado no debe impedir que la página abra arriba.
    }

    content.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (target && content.contains(target)) target.scrollIntoView({ block: "start", behavior: "instant" });

    // Tras navegar, Page Down y las flechas actúan sobre el contenido, no sobre
    // el encabezado. La carga inicial conserva el foco que ya tenga el usuario.
    if (previousPath.current !== pathname) content.focus({ preventScroll: true });
    previousPath.current = pathname;
  }, [pathname]);

  return (
    <main ref={viewport} id="main-content" tabIndex={-1} className="app-content">
      <div className="mx-auto min-h-full max-w-7xl px-5 py-8 sm:px-6 sm:py-12">
        {children}
      </div>
    </main>
  );
}
