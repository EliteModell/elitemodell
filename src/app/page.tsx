import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Headphones, LockKeyhole, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ACCOUNT_ROUTES } from "@/lib/account-routes";
import styles from "./home.module.css";

const benefits = ["Discrição total", "Perfis verificados", "Experiência premium"];
const entries = [
  { tag: "Cliente", title: "Busco prazer", description: "Explore perfis verificados e encontre sua experiência.", cta: "Ver perfis agora", href: "/buscar?tab=acompanhantes&selecionarCidade=1" },
  { tag: "Acompanhante", title: "Seja acompanhante", description: "Anuncie com segurança e acompanhe sua verificação.", cta: "Começar cadastro", href: ACCOUNT_ROUTES.cadastroAcompanhante },
];
const trustItems = [
  { icon: ShieldCheck, title: "Discrição garantida", text: "Sua privacidade em primeiro lugar." },
  { icon: Headphones, title: "Suporte dedicado", text: "Atendimento especializado e humanizado." },
  { icon: LockKeyhole, title: "Ambiente seguro", text: "Tecnologia e equipe para sua proteção." },
];

export default function HomePage() {
  return <div className={styles.shell}>
    <Navbar />
    <main>
      <section className={styles.hero}>
        <div className={styles.ambient} aria-hidden="true"><i/><i/><i/><i/></div>
        <div className={styles.heroCopy}>
          <h1><span>A plataforma</span><strong>premium</strong><span>do Brasil</span></h1>
          <p>Discrição, segurança e as melhores experiências em um só lugar.</p>
          <div className={styles.benefits} aria-label="Benefícios da plataforma">
            {benefits.map((benefit) => <span key={benefit}>{benefit}</span>)}
          </div>
        </div>
        <div className={styles.model} aria-hidden="true">
          <div className={styles.modelGlow}/>
          <Image src="/images/home/modelo-hero.jpeg" alt="" fill priority quality={75} sizes="(max-width: 760px) 78vw, 52vw" className={styles.modelImage}/>
        </div>
      </section>

      <section className={styles.quick}>
        <span className={styles.eyebrow}>Entrada rápida</span>
        <h2>O que você procura?</h2>
        <div className={styles.entryGrid}>
          {entries.map((entry) => <article className={styles.entryCard} key={entry.title}>
            <span className={styles.tag}>{entry.tag}</span>
            <h3>{entry.title}</h3>
            <p>{entry.description}</p>
            <Link href={entry.href} className={styles.cta}>{entry.cta}<ChevronRight aria-hidden="true" size={21}/></Link>
          </article>)}
        </div>
      </section>

      <section className={styles.trust} aria-label="Compromissos Elite Modell">
        {trustItems.map(({ icon: Icon, title, text }) => <div className={styles.trustItem} key={title}>
          <span className={styles.trustIcon}><Icon aria-hidden="true"/></span>
          <h3>{title}</h3><p>{text}</p>
        </div>)}
      </section>
    </main>
    <Footer/>
  </div>;
}
