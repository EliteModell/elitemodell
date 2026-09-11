export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="auth-premium-shell auth-light-shell"
      style={{
        minHeight: "100dvh",
        background: "#f7f7fa",
        padding: "0",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "none",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "0 16px",
        }}
      >
        {children}
      </div>
    </div>
  );
}
