export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="auth-premium-shell"
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(circle at 20% 10%, rgba(214,168,58,0.16), transparent 32%), radial-gradient(circle at 85% 35%, rgba(214,168,58,0.10), transparent 34%), #050505",
        padding: "0",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(180deg, rgba(5,5,5,0) 0%, rgba(5,5,5,0.72) 58%, #050505 100%)",
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
