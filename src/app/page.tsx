import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomeCitySearch from "@/components/home/HomeCitySearch";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import styles from "./home.module.css";

const entries = [
  { tag: "Cliente", title: "Quero encontrar acompanhantes", description: "Veja perfis disponíveis na sua cidade e encontre quem combina com você.", cta: "Explorar perfis", href: "/buscar?tab=acompanhantes&selecionarCidade=1" },
  { tag: "Acompanhante", title: "Quero anunciar meu perfil", description: "Crie seu perfil, escolha sua cidade e comece a receber contatos.", cta: "Criar meu perfil", href: ACCOUNT_ROUTES.cadastroAcompanhante },
];
const trustItems = [
  { title: "Privacidade real", text: "Seus dados protegidos." },
  { title: "Suporte humano", text: "Atendimento discreto e especializado." },
  { title: "Ambiente seguro", text: "Tecnologia e moderação ativa." },
];

export default function HomePage() {
  return <div className={styles.shell}>
    <Navbar tone="light" />
    <main>
      <section className={styles.hero}>
        <div className={styles.model}>
          <Image src="/images/home/modelo-elite.jpg" alt="Modelo da Elite Modell" fill preload quality={100} sizes="(max-width: 760px) 72vw, 58vw" className={styles.modelImage}/>
        </div>
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>Discrição • Segurança • Liberdade</span>
          <h1>Encontre quem combina com você.</h1>
          <p>Perfis verificados, privacidade e liberdade para escolher do seu jeito.</p>
          <HomeCitySearch />
          <span className={styles.ageNotice}>Ambiente exclusivo para maiores de 18 anos.</span>
        </div>
      </section>

      <section className={styles.trust} aria-label="Compromissos Elite Modell">
        {trustItems.map(({ title, text }) => <div className={styles.trustItem} key={title}>
          <h3>{title}</h3><p>{text}</p>
        </div>)}
      </section>

      <section className={styles.quick}>
        <span className={styles.eyebrow}>Entrada rápida</span>
        <h2>O que você procura?</h2>
        <p className={styles.quickIntro}>Escolha como deseja usar a Elite Modell.</p>
        <div className={styles.entryGrid}>
          {entries.map((entry) => <article className={styles.entryCard} key={entry.title}>
            <span className={styles.tag}>{entry.tag}</span>
            <h3>{entry.title}</h3>
            <p>{entry.description}</p>
            <Link href={entry.href} className={styles.cta}>{entry.cta}</Link>
          </article>)}
        </div>
      </section>

    </main>
    <Footer tone="light"/>
  </div>;
}
