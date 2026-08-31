"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";

const NavigationContext = createContext<{ confirmNavigation: () => boolean; setDirty: (key: string, dirty: boolean) => void }>({ confirmNavigation: () => true, setDirty: () => {} });

/** Protege borradores administrativos tanto en enlaces propios como al cerrar o recargar la pestaña. */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const dirtyForms = useRef(new Set<string>());
  const setDirty = useCallback((key: string, dirty: boolean) => {
    if (dirty) dirtyForms.current.add(key);
    else dirtyForms.current.delete(key);
  }, []);
  const confirmNavigation = useCallback(() => {
    if (!dirtyForms.current.size) return true;
    const confirmed = window.confirm("Hay cambios sin guardar. ¿Se desea salir y descartarlos?");
    if (confirmed) dirtyForms.current.clear();
    return confirmed;
  }, []);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirtyForms.current.size) { event.preventDefault(); event.returnValue = ""; }
    }
    function followLink(event: MouseEvent) {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
      if (anchor.href === window.location.href || anchor.hash && anchor.pathname === window.location.pathname) return;
      if (!confirmNavigation()) { event.preventDefault(); event.stopPropagation(); }
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", followLink, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", followLink, true); };
  }, [confirmNavigation]);

  return <NavigationContext.Provider value={{ confirmNavigation, setDirty }}>{children}</NavigationContext.Provider>;
}

export function useNavigationGuard() { return useContext(NavigationContext); }

export function useUnsavedChanges(key: string, dirty: boolean) {
  const { setDirty } = useNavigationGuard();
  useEffect(() => { setDirty(key, dirty); return () => setDirty(key, false); }, [key, dirty, setDirty]);
}
