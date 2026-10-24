"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "summary",
  "label[for]",
  "select",
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
].join(",");

function interactiveControl(event: Event) {
  const control = event.target instanceof Element
    ? event.target.closest<HTMLElement>(INTERACTIVE_SELECTOR)
    : null;
  if (!control || control.matches(":disabled") || control.getAttribute("aria-disabled") === "true") return null;
  return control;
}

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
  const activeControl = useRef<HTMLElement | null>(null);
  const interactionTimer = useRef<number | null>(null);
  const safetyTimer = useRef<number | null>(null);
  const progress = useRef<HTMLDivElement | null>(null);

  const clearInteraction = useCallback(() => {
    activeControl.current?.removeAttribute("data-interaction-active");
    activeControl.current = null;
    if (interactionTimer.current) window.clearTimeout(interactionTimer.current);
    interactionTimer.current = null;
  }, []);

  const finishInteraction = useCallback(() => {
    if (interactionTimer.current) window.clearTimeout(interactionTimer.current);
    interactionTimer.current = window.setTimeout(clearInteraction, 180);
  }, [clearInteraction]);

  const clearDomState = useCallback(() => {
    activeAnchor.current?.removeAttribute("data-navigation-pending");
    activeAnchor.current = null;
    document.body.removeAttribute("data-navigation-pending");
    progress.current?.setAttribute("data-visible", "false");
    if (safetyTimer.current) window.clearTimeout(safetyTimer.current);
    safetyTimer.current = null;
  }, []);

  const clearPending = useCallback(() => {
    clearDomState();
    setPendingFromPath(null);
  }, [clearDomState]);

  useEffect(() => {
    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(clearDomState);
    });
    return () => window.cancelAnimationFrame(firstFrame);
  }, [clearDomState, pathname]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const control = interactiveControl(event);
      if (!control) return;
      clearInteraction();
      activeControl.current = control;
      control.setAttribute("data-interaction-active", "true");
    };
    const onPointerEnd = () => finishInteraction();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const control = interactiveControl(event);
      if (!control) return;
      clearInteraction();
      activeControl.current = control;
      control.setAttribute("data-interaction-active", "true");
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") finishInteraction();
    };
    const onClick = (event: MouseEvent) => {
      const anchor = internalNavigationAnchor(event);
      if (!anchor) return;
      activeAnchor.current?.removeAttribute("data-navigation-pending");
      activeAnchor.current = anchor;
      anchor.setAttribute("data-navigation-pending", "true");
      document.body.setAttribute("data-navigation-pending", "true");
      progress.current?.setAttribute("data-visible", "true");
      setPendingFromPath(pathname);
      if (safetyTimer.current) window.clearTimeout(safetyTimer.current);
      safetyTimer.current = window.setTimeout(clearPending, 15_000);
    };
    const onPageShow = () => clearPending();
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerEnd, true);
    document.addEventListener("pointercancel", onPointerEnd, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerEnd, true);
      document.removeEventListener("pointercancel", onPointerEnd, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", onPageShow);
      clearDomState();
      clearInteraction();
    };
  }, [clearDomState, clearInteraction, clearPending, finishInteraction, pathname]);

  return (
    <div
      ref={progress}
      className="global-navigation-progress"
      data-visible={pendingFromPath === pathname ? "true" : "false"}
      role="status"
      aria-label="Abrindo página"
    />
  );
}
