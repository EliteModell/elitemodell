"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentPropsWithoutRef, useCallback, useEffect, useRef } from "react";
import {
  beginProfessionalNavigationTransition,
  preloadProfessionalCover,
  prefetchProfessionalProfileData,
  rememberProfessionalNavigationPreview,
  type ProfessionalNavigationPreview,
} from "@/lib/professional-navigation-preview";

type Props = Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & {
  preview: ProfessionalNavigationPreview;
};

export default function ProfessionalProfileLink({ preview, onClick, onFocus, onPointerEnter, onTouchStart, ...props }: Props) {
  const router = useRouter();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const href = `/profissionais/${preview.slug}`;

  const warm = useCallback((userIntent = true, preloadCover = userIntent) => {
    rememberProfessionalNavigationPreview(preview);
    if (preloadCover) preloadProfessionalCover(preview);
    router.prefetch(href);
    prefetchProfessionalProfileData(preview.slug, userIntent);
  }, [href, preview, router]);

  useEffect(() => {
    const link = linkRef.current;
    if (!link || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      // Passive visibility should warm navigation data without competing with
      // carousel thumbnails for a larger 1200px profile cover download.
      warm(false, false);
      observer.disconnect();
    }, { rootMargin: "160px" });
    observer.observe(link);
    return () => observer.disconnect();
  }, [warm]);

  return (
    <Link
      {...props}
      ref={linkRef}
      href={href}
      onPointerEnter={(event) => { warm(); onPointerEnter?.(event); }}
      onFocus={(event) => { warm(); onFocus?.(event); }}
      // A horizontal swipe also emits touchstart on every card it crosses.
      // Keep that path lightweight and reserve the cover request for a click.
      onTouchStart={(event) => { warm(false, false); onTouchStart?.(event); }}
      onClick={(event) => {
        warm(true, true);
        onClick?.(event);
        if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
          beginProfessionalNavigationTransition(preview);
        }
      }}
    />
  );
}
