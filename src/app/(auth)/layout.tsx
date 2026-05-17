export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#050505",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Foto esquerda */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "38%",
          height: "100%",
          backgroundImage: "url(/model1.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to right, rgba(5,5,5,0.22) 0%, rgba(5,5,5,0.94) 100%)",
          }}
        />
      </div>

      {/* Foto direita */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "38%",
          height: "100%",
          backgroundImage: "url(/model2.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to left, rgba(5,5,5,0.22) 0%, rgba(5,5,5,0.94) 100%)",
          }}
        />
      </div>

      {/* Glow dourado sutil */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 400,
          borderRadius: "50%",
          background: "rgba(212,168,67,0.05)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <div style={{ position: "relative", zIndex: 10, width: "100%", display: "flex", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}
