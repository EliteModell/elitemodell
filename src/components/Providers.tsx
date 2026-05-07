"use client";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1a1a1a",
            color: "#fff",
            border: "1px solid #2a2a2a",
            borderRadius: "8px",
          },
          success: { iconTheme: { primary: "#cc0000", secondary: "#fff" } },
        }}
      />
    </SessionProvider>
  );
}
