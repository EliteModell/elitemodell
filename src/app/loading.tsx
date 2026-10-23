export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Abrindo página"
      style={{ position: "fixed", inset: "0 0 auto", zIndex: 20000, height: 3, overflow: "hidden" }}
    >
      <span
        className="elite-route-progress"
        aria-hidden="true"
        style={{
          display: "block",
          width: "42%",
          height: "100%",
          borderRadius: 999,
          background: "linear-gradient(90deg, #7b1fa2, #b72cff, #e1a6ff)",
          animation: "elite-route-progress 900ms ease-in-out infinite alternate",
        }}
      />
      <span className="sr-only">Abrindo página…</span>
      <style>{`
        @keyframes elite-route-progress {
          from { transform: translateX(-15%); opacity: .72; }
          to { transform: translateX(155%); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .elite-route-progress { animation: none !important; width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
