export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d0d0d",
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
            background: "linear-gradient(to right, rgba(13,13,13,0.2) 0%, rgba(13,13,13,0.85) 100%)",
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
            background: "linear-gradient(to left, rgba(13,13,13,0.2) 0%, rgba(13,13,13,0.85) 100%)",
          }}
        />
      </div>

      {/* Glow vermelho sutil */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 400,
          borderRadius: "50%",
          background: "rgba(204,0,0,0.06)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <div style={{ position: "relative", zIndex: 10, width: "100%" , display: "flex", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}
