const skeletons = [1, 2, 3, 4, 5, 6];

export default function AdminLoading() {
  return (
    <div aria-label="Carregando painel administrativo" aria-busy="true">
      <div style={{ width: 180, height: 12, borderRadius: 6, background: "rgba(212,168,67,.18)", marginBottom: 14 }} />
      <div style={{ width: "min(440px, 82%)", height: 30, borderRadius: 8, background: "rgba(255,255,255,.10)", marginBottom: 10 }} />
      <div style={{ width: "min(680px, 94%)", height: 14, borderRadius: 7, background: "rgba(255,255,255,.06)", marginBottom: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        {skeletons.map((item) => (
          <div key={item} style={{ height: 96, borderRadius: 8, border: "1px solid rgba(212,168,67,.12)", background: "rgba(255,255,255,.035)" }} />
        ))}
      </div>
      <div style={{ height: 280, borderRadius: 8, border: "1px solid rgba(212,168,67,.12)", background: "rgba(255,255,255,.025)" }} />
    </div>
  );
}
