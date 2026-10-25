import Navbar from "@/components/Navbar";
import styles from "./profile.module.css";

export default function ProfessionalProfileLoading() {
  return (
    <div className={styles.transitionPage} data-testid="profile-route-transition">
      <Navbar />
      <div className={styles.routePreviewCover}>
        <div className={styles.previewShade} />
        <div className={styles.previewIdentity}>
          <h1 className={styles.routePreviewName} />
          <span className={styles.routePreviewLocation} />
        </div>
      </div>
      <div className={styles.previewSummary}>
        <div className={styles.routePreviewAvatar} />
        <div className={styles.previewDetails} aria-label="Carregando dados do perfil">
          <span /><span /><span />
        </div>
      </div>
      <span className="sr-only">Abrindo perfil…</span>
    </div>
  );
}
