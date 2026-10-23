"use client";
import dynamic from "next/dynamic";
import { SessionProvider } from "next-auth/react";
import OAuthReturnGuard from "@/components/OAuthReturnGuard";
import GlobalNavigationFeedback from "@/components/GlobalNavigationFeedback";

const ToastHost = dynamic(() => import("@/components/ToastHost"), {
  ssr: false,
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false}>
      <OAuthReturnGuard />
      <GlobalNavigationFeedback />
      {children}
      <ToastHost />
    </SessionProvider>
  );
}
