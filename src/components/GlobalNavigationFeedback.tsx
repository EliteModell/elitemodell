"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function internalNavigationAnchor(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) return null;

  const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
  if (!target || target.hasAttribute("download") || (target.target && target.target !== "_self")) return null;

  const destination = new URL(target.href, window.location.href);
  if (destination.origin !== window.location.origin || !["http:", "https:"].includes(destination.protocol)) return null;
  if (destination.href === window.location.href || (
    destination.pathname === window.location.pathname &&
    destination.search === window.location.search &&
    destination.hash
  )) return null;
  return target;
}

export default function GlobalNavigationFeedback() {
  const pathname = usePathname();
  const [pendingFromPath, setPendingFromPath] = useState<string | null>(null);
  const activeAnchor = useRef<HTMLAnchorElement | null>(null);
  const safetyTimer = useRef<number | null>(null);

  const clearDomState = useCallback(() => {
    activeAnchor.current?.removeAttribute("data-navigation-pending");
    activeAnchor.current = null;
    document.body.removeAttribute("data-navigation-pending");
    if (safetyTimer.current) window.clearTimeout(safetyTimer.current);
    safetyTimer.current = null;
  }, []);

  const clearPending = useCallback(() => {
    clearDomState();
    setPendingFromPath(null);
  }, [clearDomState]);

  useEffect(() => {
    clearDomState();
  }, [clearDomState, pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = internalNavigationAnchor(event);
      if (!anchor) return;
      activeAnchor.current?.removeAttribute("data-navigation-pending");
      activeAnchor.current = anchor;
      anchor.setAttribute("data-navigation-pending", "true");
      document.body.setAttribute("data-navigation-pending", "true");
      setPendingFromPath(pathname);
      if (safetyTimer.current) window.clearTimeout(safetyTimer.current);
      safetyTimer.current = window.setTimeout(clearPending, 15_000);
    };
    const onPageShow = () => clearPending();
    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", onPageShow);
      clearDomState();
    };
  }, [clearDomState, clearPending, pathname]);

  if (pendingFromPath !== pathname) return null;
  return <div className="global-navigation-progress" role="status" aria-label="Abrindo página" />;
}
