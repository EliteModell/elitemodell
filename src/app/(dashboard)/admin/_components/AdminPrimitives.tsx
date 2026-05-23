import Link from "next/link";

export const adminColors = {
  gold: "#d4a843",
  bg: "#050506",
  panel: "#0d0d10",
  panel2: "#111116",
  border: "rgba(212,168,67,0.18)",
  muted: "rgba(255,255,255,0.55)",
};

export function AdminHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap" }}>
      <div>
        <p style={{ margin: "0 0 8px", color: adminColors.gold, fontSize: 11, fontWeight: 900, letterSpacing: 2.4, textTransform: "uppercase" }}>
          Admin Elite Model
        </p>
        <h1 style={{ margin: 0, color: "#fff", fontSize: 28, lineHeight: 1.05, fontWeight: 950, letterSpacing: 0 }}>{title}</h1>
        {subtitle ? <p style={{ margin: "10px 0 0", color: adminColors.muted, fontSize: 14, lineHeight: 1.6, maxWidth: 780 }}>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  href,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  href?: string;
  tone?: "neutral" | "warning" | "success" | "danger";
}) {
  const toneColor = tone === "warning" ? adminColors.gold : tone === "success" ? "#22c55e" : tone === "danger" ? "#ef4444" : "#fff";
  const content = (
    <div style={{ background: `linear-gradient(180deg, ${adminColors.panel2}, ${adminColors.panel})`, border: `1px solid ${adminColors.border}`, borderRadius: 8, padding: 18, minHeight: 112 }}>
      <div style={{ color: toneColor, fontSize: 28, fontWeight: 950, lineHeight: 1 }}>{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</div>
      <div style={{ color: adminColors.muted, fontSize: 12, marginTop: 10, lineHeight: 1.4 }}>{label}</div>
    </div>
  );

  if (!href) return content;
  return <Link href={href} style={{ textDecoration: "none" }}>{content}</Link>;
}

export function AdminPanel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: adminColors.panel, border: `1px solid ${adminColors.border}`, borderRadius: 8, padding: 16 }}>
      {children}
    </div>
  );
}

export function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warning" | "success" | "danger" }) {
  const color = tone === "warning" ? adminColors.gold : tone === "success" ? "#22c55e" : tone === "danger" ? "#ef4444" : "#94a3b8";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", border: `1px solid ${color}55`, background: `${color}16`, color, borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8 }}>
      {children}
    </span>
  );
}

export function AdminTable({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${adminColors.border}`, borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>{children}</table>
    </div>
  );
}

export const thStyle: React.CSSProperties = {
  padding: "12px 14px",
  color: adminColors.gold,
  fontSize: 11,
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: 1.2,
  borderBottom: `1px solid ${adminColors.border}`,
  background: "rgba(212,168,67,0.06)",
};

export const tdStyle: React.CSSProperties = {
  padding: "13px 14px",
  color: "#e5e7eb",
  fontSize: 13,
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  verticalAlign: "top",
};

export const buttonStyle: React.CSSProperties = {
  border: `1px solid ${adminColors.border}`,
  borderRadius: 8,
  background: "rgba(212,168,67,0.12)",
  color: adminColors.gold,
  padding: "8px 11px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};
