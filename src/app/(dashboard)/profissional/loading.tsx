export default function ProfessionalLoading() {
  return (
    <div className="professional-page-skeleton">
      <div className="skel-header" />
      <div className="skel-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skel-card" />
        ))}
      </div>
      <div className="skel-block" />
      <div className="skel-block skel-block--short" />
      <style>{`
        .professional-page-skeleton {
          padding: 4px 0 40px;
          animation: skel-fade 0.18s ease both;
        }
        @keyframes skel-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes skel-shimmer {
          from { background-position: -200% 0; }
          to   { background-position: 200% 0; }
        }
        .skel-header,
        .skel-card,
        .skel-block {
          border-radius: 10px;
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(212,168,67,0.07) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: skel-shimmer 1.6s ease-in-out infinite;
        }
        .skel-header {
          height: 56px;
          margin-bottom: 24px;
        }
        .skel-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .skel-card {
          height: 100px;
        }
        .skel-block {
          height: 120px;
          margin-bottom: 14px;
        }
        .skel-block--short {
          height: 72px;
        }
        @media (min-width: 640px) {
          .skel-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
