"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function hasOAuthSearchParams(search: string) {
  const params = new URLSearchParams(search);
  return params.has("code") || params.has("error") || params.has("error_description");
}

function hasOAuthHash(hash: string) {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(value);
  return params.has("access_token") || params.has("refresh_token") || params.has("error");
}

export default function OAuthReturnGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/auth/callback") return;

    const { search, hash } = window.location;
    if (!hasOAuthSearchParams(search) && !hasOAuthHash(hash)) return;

    window.location.replace(`/auth/callback${search}${hash}`);
  }, [pathname]);

  return null;
}
