import styles from "@/components/auth/ProfessionalRegistrationFlow.module.css";

export default function LoadingCadastroAcompanhante() {
  return (
    <main className={styles.loadingPage} aria-label="Carregando cadastro de acompanhante">
      <div className={styles.loadingHeader} />
      <div className={styles.loadingHero}>
        <div className={styles.loadingImage} />
        <div className={styles.loadingContent}>
          <div className={styles.loadingLineShort} />
          <div className={styles.loadingTitle} />
          <div className={styles.loadingLine} />
          <div className={styles.loadingInput} />
          <div className={styles.loadingButton} />
        </div>
      </div>
    </main>
  );
}
