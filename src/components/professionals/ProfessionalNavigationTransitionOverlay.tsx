"use client";

import { useEffect, useSyncExternalStore } from "react";
import ProfessionalProfileTransition from "@/components/professionals/ProfessionalProfileTransition";
import {
  clearProfessionalNavigationTransition,
  readActiveProfessionalNavigationPreview,
  subscribeProfessionalNavigationPreview,
} from "@/lib/professional-navigation-preview";

export default function ProfessionalNavigationTransitionOverlay() {
  const activePreview = useSyncExternalStore(
    subscribeProfessionalNavigationPreview,
    readActiveProfessionalNavigationPreview,
    () => null,
  );

  useEffect(() => {
    if (!activePreview) return;
    const timeout = window.setTimeout(clearProfessionalNavigationTransition, 15_000);
    window.addEventListener("popstate", clearProfessionalNavigationTransition, { once: true });
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("popstate", clearProfessionalNavigationTransition);
    };
  }, [activePreview]);

  if (!activePreview) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 19_000, overflowY: "auto", background: "#f7f7fa" }} data-testid="profile-navigation-overlay">
      <ProfessionalProfileTransition slug={activePreview.slug} />
    </div>
  );
}
