"use client";
import dynamic from "next/dynamic";
import { SessionProvider } from "next-auth/react";

const ToastHost = dynamic(() => import("@/components/ToastHost"), {
  ssr: false,
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false}>
      {children}
      <ToastHost />
    </SessionProvider>
  );
}
