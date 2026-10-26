import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import HomeCitySearch from "@/components/home/HomeCitySearch";
import HomeDiscoveryPreview from "@/components/home/HomeDiscoveryPreview";
import elitePurple from "@/assets/home/elite-destaque-roxo.jpg";
import eliteGold from "@/assets/home/elite-destaque-dourado.jpg";
import elitePool from "@/assets/home/elite-destaque-piscina.jpg";
import styles from "./home.module.css";

const campaignPhotos = [
  {
    src: elitePurple,
    name: "Yasmin Mineira",
    alt: "Yasmin Mineira em campanha da Elite Modell com peças roxas e detalhes dourados",
    position: "center top",
  },
  {
    src: eliteGold,
    name: "Bruna Lambertini",
    alt: "Bruna Lambertini em campanha da Elite Modell com look dourado",
    position: "center bottom",
  },
  {
    src: elitePool,
    name: "Juh Alves",
    alt: "Juh Alves em campanha da Elite Modell junto à piscina",
    position: "center center",
  },
];

const entries = [
  { tag: "Cliente", title: "Quero encontrar acompanhantes", description: "Veja perfis verificados e encontre a sua próxima experiência.", cta: "Explorar perfis", href: "/buscar?tab=acompanhantes&selecionarCidade=1" },
  { tag: "Acompanhante", title: "Quero anunciar meu perfil", description: "Crie seu perfil com segurança e comece a receber contatos.", cta: "Criar meu perfil", href: ACCOUNT_ROUTES.cadastroAcompanhante },
];
const trustItems = [
  { title: "Privacidade real", text: "Seus dados protegidos." },
  { title: "Suporte humano", text: "Atendimento discreto e especializado." },
  { title: "Ambiente seguro", text: "Tecnologia e moderação ativa." },
];

export default function HomePage() {
  return <div className={styles.shell}>
    <Navbar tone="light" accent="purple" />
    <main>
      <section className={styles.hero}>
        <div className={styles.model}>
          <Image
            src="/images/home/modelo-elite.jpg"
            alt="Modelo da Elite Modell"
            fill
            preload
            quality={75}
            sizes="(max-width: 760px) 72vw, 58vw"
            className={styles.modelImage}
          />
          <span className={styles.heroModelName}>Brida Nunes</span>
        </div>
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>Discrição • Segurança • Liberdade</span>
          <h1>Encontre o <br/>perfil certo <br/><strong>para você.</strong></h1>
          <p>Acompanhantes verificadas, com privacidade, segurança e liberdade para viver boas experiências.</p>
          <HomeCitySearch />
          <div className={styles.heroActions}>
            <Link href="/buscar?tab=acompanhantes" className={styles.heroCta}>Explorar perfis<ArrowRight aria-hidden="true" size={22}/></Link>
            <Link href={ACCOUNT_ROUTES.cadastroAcompanhante} className={`${styles.heroCta} ${styles.heroCtaSecondary}`}>Anunciar meu perfil<ArrowRight aria-hidden="true" size={22}/></Link>
          </div>
          <span className={styles.ageNotice}>Ambiente exclusivo para maiores de 18 anos.</span>
        </div>
      </section>

      <HomeDiscoveryPreview />

      <section className={styles.campaign} aria-labelledby="campaign-title">
        <h2 className={styles.campaignTitle} id="campaign-title">Conheça nossas musas</h2>
        {campaignPhotos.map((photo) => (
          <div className={styles.campaignVisual} key={photo.name}>
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              quality={75}
              sizes="(max-width: 900px) calc(100vw - 28px), 752px"
              className={styles.campaignImage}
              style={{ objectPosition: photo.position }}
            />
            <span className={styles.modelSignature}>{photo.name}</span>
          </div>
        ))}
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
            <Link href={entry.href} className={styles.cta}>{entry.cta}<ArrowRight aria-hidden="true" size={22}/></Link>
          </article>)}
        </div>
      </section>

    </main>
    <Footer tone="light"/>
  </div>;
}
