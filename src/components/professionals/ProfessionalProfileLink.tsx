"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentPropsWithoutRef, useCallback, useEffect, useRef } from "react";
import {
  preloadProfessionalCover,
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

  const warm = useCallback(() => {
    rememberProfessionalNavigationPreview(preview);
    preloadProfessionalCover(preview);
    router.prefetch(href);
  }, [href, preview, router]);

  useEffect(() => {
    const link = linkRef.current;
    if (!link || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      warm();
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
      onTouchStart={(event) => { warm(); onTouchStart?.(event); }}
      onClick={(event) => { rememberProfessionalNavigationPreview(preview); onClick?.(event); }}
    />
  );
}
