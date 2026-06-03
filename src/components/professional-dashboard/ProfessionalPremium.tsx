"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  Crown,
  Diamond,
  Gem,
  ImagePlus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
} from "lucide-react";

type IllustrationKind =
  | "growth"
  | "content"
  | "crown"
  | "diamond"
  | "profile"
  | "camera"
  | "calendar"
  | "shield";
type PremiumIconName = IllustrationKind | "image" | "video" | "story" | "message" | "star" | "calendar";

export function ProfessionalPremiumStyles() {
  return (
    <style>{`
      :root {
        --elite-bg: #050505;
        --elite-bg-soft: #090909;
        --elite-card: #111111;
        --elite-card-2: #181818;
        --elite-gold: #D6A83A;
        --elite-gold-light: #F5D46B;
        --elite-gold-dark: #8A671F;
        --elite-text: #FFFFFF;
        --elite-text-muted: #B8B8B8;
        --elite-border: rgba(214,168,58,0.35);
        --elite-border-soft: rgba(214,168,58,0.18);
        --elite-success: #75D99A;
        --elite-danger: #FF6B6B;
        --elite-warning: #FFB84D;
      }

      .professional-shell {
        background:
          radial-gradient(circle at top right, rgba(214,168,58,0.13), transparent 34%),
          radial-gradient(circle at top left, rgba(214,168,58,0.06), transparent 28%),
          linear-gradient(180deg, #050505 0%, #090806 45%, #050505 100%) !important;
      }

      .professional-page {
        padding-left: 16px !important;
        padding-right: 16px !important;
        padding-bottom: calc(148px + env(safe-area-inset-bottom)) !important;
      }

      .professional-content {
        max-width: 960px !important;
      }

      .professional-premium-page {
        width: 100%;
        max-width: 960px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 18px;
        color: var(--elite-text);
        overflow-x: hidden;
      }

      .premium-card,
      .premium-hero,
      .premium-action-card,
      .premium-section-card,
      .premium-plan-card,
      .premium-upload-zone,
      .premium-profile-row {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--elite-border);
        border-radius: 24px;
        background:
          linear-gradient(145deg, rgba(22,22,22,0.98), rgba(8,8,8,0.98)),
          radial-gradient(circle at top right, rgba(214,168,58,0.12), transparent 40%);
        box-shadow:
          0 14px 40px rgba(0,0,0,0.45),
          inset 0 1px 0 rgba(255,255,255,0.04);
      }

      .premium-card::before,
      .premium-hero::before,
      .premium-action-card::before,
      .premium-section-card::before,
      .premium-plan-card::before,
      .premium-upload-zone::before,
      .premium-profile-row::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(245,212,107,0.72), transparent);
        pointer-events: none;
      }

      .premium-hero {
        min-height: 252px;
        padding: 26px 22px;
      }

      .premium-hero-copy {
        position: relative;
        z-index: 2;
        max-width: 590px;
      }

      .premium-eyebrow {
        margin: 0;
        color: var(--elite-gold-light);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.28em;
        text-transform: uppercase;
      }

      .premium-title {
        margin: 12px 0 0;
        color: #fff;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(40px, 9vw, 68px);
        font-weight: 600;
        letter-spacing: 0;
        line-height: 0.95;
        text-wrap: balance;
      }

      .premium-title .gold,
      .premium-gold {
        color: var(--elite-gold-light);
      }

      .premium-description {
        margin: 18px 0 0;
        max-width: 560px;
        color: var(--elite-text-muted);
        font-size: 17px;
        line-height: 1.65;
      }

      .premium-illustration {
        position: absolute;
        right: 18px;
        bottom: 14px;
        width: 166px;
        height: 166px;
        display: grid;
        place-items: center;
        pointer-events: none;
        opacity: 0.92;
      }

      .premium-illustration::before {
        content: "";
        position: absolute;
        inset: 12px;
        border-radius: 999px;
        background: rgba(214,168,58,0.18);
        filter: blur(22px);
      }

      .premium-illustration-inner {
        position: relative;
        width: 132px;
        height: 132px;
        border: 1px solid rgba(245,212,107,0.24);
        border-radius: 32px;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at center, rgba(245,212,107,0.24), transparent 62%),
          linear-gradient(145deg, rgba(214,168,58,0.18), rgba(0,0,0,0.24));
        transform: rotate(-4deg);
      }

      .premium-illustration-icon {
        width: 64px;
        height: 64px;
        color: var(--elite-gold-light);
        filter: drop-shadow(0 0 18px rgba(214,168,58,0.45));
      }

      .premium-action-card {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 18px;
        align-items: center;
        padding: 20px;
        text-decoration: none;
        color: inherit;
        transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
      }

      .premium-action-card:hover {
        transform: translateY(-1px);
        border-color: rgba(245,212,107,0.65);
        box-shadow: 0 16px 42px rgba(0,0,0,0.55), 0 0 24px rgba(214,168,58,0.12);
      }

      .premium-action-card:active {
        transform: scale(0.985);
      }

      .premium-icon-orb {
        width: 74px;
        height: 74px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(245,212,107,0.38);
        border-radius: 24px;
        background:
          radial-gradient(circle, rgba(245,212,107,0.18), transparent 65%),
          rgba(214,168,58,0.08);
        color: var(--elite-gold-light);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 0 24px rgba(214,168,58,0.08);
      }

      .premium-icon-orb svg {
        width: 34px;
        height: 34px;
        filter: drop-shadow(0 0 16px rgba(214,168,58,0.38));
      }

      .premium-action-body {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .premium-action-title {
        margin: 0;
        color: #fff;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 30px;
        font-weight: 600;
        line-height: 1.08;
      }

      .premium-action-text {
        margin: 0;
        color: var(--elite-text-muted);
        font-size: 16px;
        line-height: 1.45;
      }

      .premium-button,
      .premium-button-secondary {
        min-height: 52px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        border-radius: 16px;
        padding: 0 20px;
        font-size: 15px;
        font-weight: 900;
        text-decoration: none;
        cursor: pointer;
        transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        white-space: nowrap;
      }

      .premium-button {
        border: 1px solid rgba(255,255,255,0.18);
        background: linear-gradient(135deg, #F5D46B 0%, #D6A83A 48%, #B88722 100%);
        color: #080808;
        box-shadow:
          0 10px 26px rgba(214,168,58,0.28),
          inset 0 1px 0 rgba(255,255,255,0.45);
      }

      .premium-button-secondary {
        border: 1px solid rgba(214,168,58,0.35);
        background: rgba(214,168,58,0.08);
        color: var(--elite-gold-light);
      }

      .premium-button:hover,
      .premium-button-secondary:hover {
        transform: translateY(-1px);
      }

      .premium-button:active,
      .premium-button-secondary:active {
        transform: scale(0.985);
      }

      .premium-badge {
        width: fit-content;
        max-width: 100%;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(214,168,58,0.38);
        border-radius: 999px;
        background: rgba(214,168,58,0.10);
        color: var(--elite-gold-light);
        padding: 7px 12px;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .premium-section-card {
        padding: 22px;
      }

      .premium-section-title {
        margin: 0;
        color: #fff;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(30px, 7vw, 44px);
        font-weight: 600;
        line-height: 1.04;
      }

      .premium-grid {
        display: grid;
        gap: 16px;
      }

      .premium-grid-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .premium-grid-3 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .premium-check-card {
        min-height: 62px;
        display: flex;
        align-items: center;
        gap: 12px;
        border: 1px solid var(--elite-border-soft);
        border-radius: 16px;
        background: rgba(255,255,255,0.035);
        padding: 14px 16px;
        color: #d8d8d8;
        font-size: 15px;
        font-weight: 800;
      }

      .premium-check-card svg {
        width: 22px;
        height: 22px;
        color: var(--elite-gold-light);
        flex: 0 0 auto;
      }

      .premium-plan-card {
        min-height: 378px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 22px;
      }

      .premium-plan-card.featured {
        border-color: rgba(245,212,107,0.75);
        box-shadow: 0 22px 70px rgba(0,0,0,0.50), 0 0 38px rgba(214,168,58,0.18);
      }

      .premium-plan-title {
        margin: 0;
        color: #fff;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 27px;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-align: center;
      }

      .premium-plan-benefits {
        list-style: none;
        margin: 4px 0 0;
        padding: 0;
        display: grid;
        gap: 10px;
      }

      .premium-plan-benefits li {
        display: flex;
        gap: 10px;
        align-items: center;
        color: var(--elite-text-muted);
        font-size: 14px;
      }

      .premium-plan-benefits svg {
        color: var(--elite-gold-light);
        flex: 0 0 auto;
      }

      .premium-upload-zone {
        border-style: dashed;
        padding: 28px 22px;
        text-align: center;
        cursor: pointer;
      }

      .premium-upload-zone .premium-icon-orb {
        margin: 0 auto 16px;
      }

      .premium-profile-row {
        display: grid;
        grid-template-columns: auto minmax(0,1fr) auto;
        gap: 18px;
        align-items: center;
        padding: 18px;
        text-decoration: none;
        color: inherit;
      }

      .premium-avatar {
        position: relative;
        width: 88px;
        height: 88px;
        border-radius: 999px;
        border: 2px solid var(--elite-gold-light);
        background: rgba(214,168,58,0.12);
        display: grid;
        place-items: center;
        overflow: hidden;
        box-shadow: 0 0 26px rgba(214,168,58,0.16);
      }

      .premium-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .premium-avatar-camera {
        position: absolute;
        right: -2px;
        bottom: -2px;
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        border: 1px solid var(--elite-gold-light);
        background: #080808;
        color: var(--elite-gold-light);
      }

      .premium-form input,
      .premium-form textarea,
      .premium-form select {
        width: 100%;
        min-height: 56px;
        border: 1px solid rgba(214,168,58,0.28);
        border-radius: 16px;
        background: rgba(8,8,8,0.92);
        color: #fff;
        padding: 14px 16px;
        outline: none;
      }

      .premium-form textarea {
        min-height: 138px;
        resize: vertical;
      }

      .premium-form label {
        display: block;
        margin-bottom: 8px;
        color: var(--elite-gold-light);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .professional-bottom-nav {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 40;
        padding: 8px 8px calc(10px + env(safe-area-inset-bottom));
        background: rgba(5,5,5,0.92);
        backdrop-filter: blur(18px);
        border-top: 1px solid rgba(214,168,58,0.25);
        box-shadow: 0 -12px 40px rgba(0,0,0,0.55);
      }

      .professional-bottom-nav-inner {
        max-width: 430px;
        min-height: 76px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(5, minmax(0,1fr));
        gap: 4px;
      }

      .professional-bottom-nav a {
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border-radius: 18px;
        color: rgba(255,255,255,0.48);
        font-size: 12px;
        font-weight: 900;
        text-decoration: none;
      }

      .professional-bottom-nav a.active {
        border: 1px solid rgba(245,212,107,0.40);
        background: linear-gradient(145deg, rgba(214,168,58,0.26), rgba(12,10,6,0.94));
        color: var(--elite-gold-light);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 26px rgba(214,168,58,0.12);
      }

      .professional-bottom-nav svg {
        width: 24px;
        height: 24px;
      }

      @media (min-width: 768px) {
        .professional-page {
          padding-bottom: 42px !important;
        }
      }

      @media (max-width: 760px) {
        .premium-action-card {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .premium-action-card .premium-button,
        .premium-action-card .premium-button-secondary {
          grid-column: 1 / -1;
          width: 100%;
          margin-top: 4px;
        }

        .premium-grid-2,
        .premium-grid-3 {
          grid-template-columns: 1fr;
        }

        .premium-profile-row {
          grid-template-columns: auto minmax(0,1fr) 24px;
          padding: 16px;
        }
      }

      @media (max-width: 430px) {
        .premium-hero {
          min-height: 238px;
          padding: 24px 18px;
        }

        .premium-illustration {
          width: 124px;
          height: 124px;
          right: 8px;
          bottom: 8px;
          opacity: 0.52;
        }

        .premium-illustration-inner {
          width: 104px;
          height: 104px;
          border-radius: 26px;
        }

        .premium-illustration-icon {
          width: 52px;
          height: 52px;
        }

        .premium-description {
          font-size: 16px;
          padding-right: 28px;
        }

        .premium-action-card {
          padding: 18px;
          gap: 14px;
        }

        .premium-icon-orb {
          width: 64px;
          height: 64px;
          border-radius: 20px;
        }

        .premium-action-title {
          font-size: 25px;
        }

        .premium-button,
        .premium-button-secondary {
          min-height: 50px;
          padding: 0 16px;
        }
      }

      @media (max-width: 370px) {
        .professional-page {
          padding-left: 14px !important;
          padding-right: 14px !important;
        }

        .premium-title {
          font-size: 36px;
        }

        .premium-profile-row {
          grid-template-columns: 1fr;
          text-align: center;
        }

        .premium-avatar {
          margin: 0 auto;
        }
      }
    `}</style>
  );
}

function renderPremiumIcon(kind: PremiumIconName, className?: string, size?: number) {
  const props = { className, size };
  switch (kind) {
    case "content":
    case "video":
      return <Camera {...props} />;
    case "crown":
      return <Crown {...props} />;
    case "diamond":
      return <Gem {...props} />;
    case "profile":
      return <UserRound {...props} />;
    case "camera":
    case "image":
      return <ImagePlus {...props} />;
    case "shield":
      return <ShieldCheck {...props} />;
    case "story":
    case "message":
    case "star":
      return <Sparkles {...props} />;
    default:
      return <TrendingUp {...props} />;
  }
}

export function PremiumIllustration({ kind = "growth" }: { kind?: IllustrationKind }) {
  return (
    <div className="premium-illustration" aria-hidden="true">
      <div className="premium-illustration-inner">
        {renderPremiumIcon(kind, "premium-illustration-icon")}
      </div>
    </div>
  );
}

export function PremiumHeroCard({
  eyebrow,
  title,
  subtitle,
  illustration = "growth",
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  illustration?: IllustrationKind;
}) {
  return (
    <section className="premium-hero">
      <div className="premium-hero-copy">
        <p className="premium-eyebrow">{eyebrow}</p>
        <h1 className="premium-title">{title}</h1>
        <p className="premium-description">{subtitle}</p>
      </div>
      <PremiumIllustration kind={illustration} />
    </section>
  );
}

export function PremiumActionCard({
  href,
  icon,
  title,
  description,
  buttonLabel,
  badge,
}: {
  href: string;
  icon: PremiumIconName;
  title: string;
  description: string;
  buttonLabel: string;
  badge?: string;
}) {
  return (
    <Link href={href} className="premium-action-card">
      <span className="premium-icon-orb">
        {renderPremiumIcon(icon)}
      </span>
      <span className="premium-action-body">
        {badge ? <span className="premium-badge">{badge}</span> : null}
        <span className="premium-action-title">{title}</span>
        <span className="premium-action-text">{description}</span>
      </span>
      <span className="premium-button">
        {buttonLabel}
        <ArrowRight size={18} />
      </span>
    </Link>
  );
}

export function PremiumButtonLink({
  href,
  children,
  secondary,
}: {
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link href={href} className={secondary ? "premium-button-secondary" : "premium-button"}>
      {children}
    </Link>
  );
}

export function PremiumChecklistItem({ label }: { label: string }) {
  return (
    <div className="premium-check-card">
      <Check />
      <span>{label}</span>
    </div>
  );
}

export function PremiumPlanCard({
  title,
  description,
  benefits,
  featured,
}: {
  title: string;
  description: string;
  benefits: string[];
  featured?: boolean;
}) {
  return (
    <article className={`premium-plan-card ${featured ? "featured" : ""}`}>
      {featured ? <span className="premium-badge" style={{ margin: "-36px auto 0" }}>Mais popular</span> : null}
      <span className="premium-icon-orb" style={{ margin: "0 auto" }}>
        {title === "DIAMANTE" ? <Diamond /> : <Crown />}
      </span>
      <h3 className="premium-plan-title">{title}</h3>
      <p className="premium-action-text" style={{ textAlign: "center", minHeight: 44 }}>{description}</p>
      <ul className="premium-plan-benefits">
        {benefits.map((benefit) => (
          <li key={benefit}>
            <BadgeCheck size={17} />
            {benefit}
          </li>
        ))}
      </ul>
      <span style={{ flex: 1 }} />
      <button type="button" className={featured ? "premium-button" : "premium-button-secondary"} style={{ width: "100%" }}>
        Escolher plano
      </button>
    </article>
  );
}

export function PremiumProfileRow({
  image,
  name,
  location,
  href = "/profissional/perfil",
}: {
  image?: string | null;
  name: string;
  location: string;
  href?: string;
}) {
  return (
    <Link href={href} className="premium-profile-row">
      <span className="premium-avatar">
        {image ? <img src={image} alt={name} /> : <UserRound size={42} color="#F5D46B" />}
        <span className="premium-avatar-camera">
          <Camera size={16} />
        </span>
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", color: "#fff", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 30, fontWeight: 600, lineHeight: 1.05 }}>
          Olá, {name}
        </span>
        <span style={{ display: "block", marginTop: 6, color: "var(--elite-text-muted)", fontSize: 16 }}>
          {location}
        </span>
      </span>
      <ArrowRight size={24} color="rgba(255,255,255,0.58)" />
    </Link>
  );
}

export function PremiumSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="premium-section-card">
      {eyebrow ? <p className="premium-eyebrow">{eyebrow}</p> : null}
      <h2 className="premium-section-title">{title}</h2>
      {description ? <p className="premium-description" style={{ marginTop: 10 }}>{description}</p> : null}
      {children ? <div style={{ marginTop: 20 }}>{children}</div> : null}
    </section>
  );
}

export function PremiumMetricCard({
  icon,
  value,
  label,
  description,
}: {
  icon: PremiumIconName;
  value: string;
  label: string;
  description: string;
}) {
  return (
    <article className="premium-section-card" style={{ minHeight: 148 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <span className="premium-icon-orb">
          {renderPremiumIcon(icon)}
        </span>
        <div>
          <strong style={{ display: "block", color: "var(--elite-gold-light)", fontSize: 38, lineHeight: 1 }}>{value}</strong>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>{label}</span>
        </div>
      </div>
      <p className="premium-action-text" style={{ marginTop: 16 }}>{description}</p>
    </article>
  );
}

export function PremiumUploadCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="premium-upload-zone">
      <span className="premium-icon-orb">
        <ImagePlus />
      </span>
      <h3 className="premium-action-title" style={{ fontSize: 24 }}>{title}</h3>
      <p className="premium-action-text" style={{ maxWidth: 320, margin: "8px auto 0" }}>{description}</p>
      <span className="premium-button" style={{ marginTop: 16 }}>Selecionar arquivo</span>
    </div>
  );
}
