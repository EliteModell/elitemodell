"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  Headphones,
  Laptop,
  LockKeyhole,
  MessageCircle,
  Phone,
  SlidersHorizontal,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import styles from "./ProfessionalRegistrationFlow.module.css";

type RegistrationStage = "phone" | "verification";
type VerificationChannel = "whatsapp" | "sms";

type ConsentState = {
  ageConfirmed: boolean;
  ownershipConfirmed: boolean;
  termsConsent: boolean;
  lgpdConsent: boolean;
  marketingConsent: boolean;
};

type SendCodeResponse = {
  error?: string;
  message?: string;
  resendInSeconds?: number;
};

type VerifyCodeResponse = {
  error?: string;
  registrationPending?: boolean;
  redirectTo?: string;
};

type ProfessionalRegistrationFlowProps = {
  startAtVerification?: boolean;
};

const PHONE_STORAGE_KEY = "elitemodell.professional-registration.phone";
const CONSENT_STORAGE_KEY = "elitemodell.professional-registration.consents";
const RESEND_SECONDS = 60;

const initialConsent: ConsentState = {
  ageConfirmed: false,
  ownershipConfirmed: false,
  termsConsent: false,
  lgpdConsent: false,
  marketingConsent: false,
};

const benefits = [
  {
    title: "Controle do seu perfil",
    description: "Atualize fotos, apresentação, valores e informações em um único lugar.",
    icon: SlidersHorizontal,
  },
  {
    title: "Horários flexíveis",
    description: "Organize sua disponibilidade e ajuste sua agenda quando precisar.",
    icon: CalendarClock,
  },
  {
    title: "Atendimento presencial ou virtual",
    description: "Apresente as modalidades que fazem sentido para a sua atuação.",
    icon: Laptop,
  },
  {
    title: "Perfil verificado",
    description: "Conclua a verificação para transmitir mais confiança aos visitantes.",
    icon: BadgeCheck,
  },
  {
    title: "Mais visibilidade",
    description: "Use os recursos da plataforma para ampliar o alcance do seu anúncio.",
    icon: Eye,
  },
  {
    title: "Suporte da plataforma",
    description: "Receba orientação para usar os recursos e manter seu anúncio atualizado.",
    icon: Headphones,
  },
];

const faqs = [
  {
    question: "Como funciona o cadastro?",
    answer:
      "Você confirma seu telefone, cria sua conta e completa o perfil profissional com suas próprias informações. Antes da publicação, os dados obrigatórios e as etapas de verificação são conferidos.",
  },
  {
    question: "Quanto custa anunciar?",
    answer:
      "O cadastro inicial é gratuito. Planos e recursos opcionais de visibilidade, quando disponíveis, apresentam preço e condições antes de qualquer contratação.",
  },
  {
    question: "Como recebo dos clientes?",
    answer:
      "Você informa no perfil as formas de pagamento aceitas. Quando houver um recurso de pagamento intermediado pela plataforma, as condições específicas serão exibidas antes do uso.",
  },
  {
    question: "Posso definir meus horários?",
    answer:
      "Sim. Você controla os horários informados no perfil e pode ajustar sua disponibilidade conforme sua rotina.",
  },
  {
    question: "Como funciona a verificação?",
    answer:
      "A plataforma pode solicitar confirmação de telefone, identidade, maioridade e titularidade do perfil. Os dados são tratados conforme a Política de Privacidade.",
  },
  {
    question: "Preciso ter experiência?",
    answer:
      "Não existe exigência de tempo mínimo de experiência. É importante apresentar informações verdadeiras, compreender as regras e manter uma comunicação profissional.",
  },
];

function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatPhone(value: string) {
  const digits = onlyDigits(value);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function isValidBrazilianPhone(value: string) {
  const digits = onlyDigits(value);
  return /^[1-9]{2}9\d{8}$/.test(digits);
}

export function ProfessionalRegistrationFlow({
  startAtVerification = false,
}: ProfessionalRegistrationFlowProps) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [stage, setStage] = useState<RegistrationStage>(
    startAtVerification ? "verification" : "phone",
  );
  const [phone, setPhone] = useState("");
  const [consents, setConsents] = useState<ConsentState>(initialConsent);
  const [channel, setChannel] = useState<VerificationChannel | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [attendanceValue, setAttendanceValue] = useState(300);
  const [appointmentsPerDay, setAppointmentsPerDay] = useState(2);
  const [daysPerWeek, setDaysPerWeek] = useState(5);

  const weeklyRevenue = attendanceValue * appointmentsPerDay * daysPerWeek;
  const monthlyRevenue = Math.round(weeklyRevenue * 4.33);
  const mandatoryConsentsAccepted =
    consents.ageConfirmed &&
    consents.ownershipConfirmed &&
    consents.termsConsent &&
    consents.lgpdConsent;

  const progress = stage === "phone" ? 1 : 2;

  useEffect(() => {
    let cancelled = false;

    window.queueMicrotask(() => {
      if (cancelled) return;

      const savedPhone = window.sessionStorage.getItem(PHONE_STORAGE_KEY);
      const savedConsents = window.sessionStorage.getItem(CONSENT_STORAGE_KEY);

      if (savedPhone) setPhone(savedPhone);
      if (savedConsents) {
        try {
          setConsents({ ...initialConsent, ...JSON.parse(savedConsents) });
        } catch {
          window.sessionStorage.removeItem(CONSENT_STORAGE_KEY);
        }
      }
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [hydrated, stage]);

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  function persistRegistrationData() {
    window.sessionStorage.setItem(PHONE_STORAGE_KEY, onlyDigits(phone));
    window.sessionStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consents));
  }

  function continueToVerification() {
    if (!isValidBrazilianPhone(phone)) {
      toast.error("Informe um telefone brasileiro válido com DDD.");
      return;
    }

    if (!mandatoryConsentsAccepted) {
      toast.error("Confirme os itens obrigatórios para continuar.");
      return;
    }

    persistRegistrationData();
    setStage("verification");
  }

  async function sendCode(selectedChannel: VerificationChannel) {
    if (!isValidBrazilianPhone(phone)) {
      toast.error("Informe novamente o telefone profissional.");
      setStage("phone");
      return;
    }

    if (!mandatoryConsentsAccepted) {
      toast.error("Os consentimentos obrigatórios precisam ser confirmados.");
      setStage("phone");
      return;
    }

    setSendingCode(true);
    try {
      const response = await fetch("/api/auth/phone/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: onlyDigits(phone),
          accountType: "model",
          channel: selectedChannel,
          ...consents,
        }),
      });
      const data = (await response.json()) as SendCodeResponse;

      if (!response.ok) {
        const retryAfter = Number(data.resendInSeconds || 0);
        if (retryAfter > 0) setResendSeconds(retryAfter);
        throw new Error(data.error || data.message || "Não foi possível enviar o código.");
      }

      setChannel(selectedChannel);
      setCodeSent(true);
      setCode("");
      setResendSeconds(RESEND_SECONDS);
      toast.success(
        selectedChannel === "whatsapp"
          ? "Código enviado pelo WhatsApp."
          : "Código enviado por SMS.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o código.");
    } finally {
      setSendingCode(false);
    }
  }

  async function verifyCode() {
    if (code.length !== 6) {
      toast.error("Digite o código de 6 dígitos.");
      return;
    }

    setVerifyingCode(true);
    try {
      const response = await fetch("/api/auth/phone/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: onlyDigits(phone),
          code,
          accountType: "model",
          deferAccountCreation: true,
          ...consents,
        }),
      });
      const data = (await response.json()) as VerifyCodeResponse;

      if (!response.ok || !data.registrationPending) {
        throw new Error(data.error || "Código inválido ou expirado.");
      }

      toast.success("Telefone confirmado com segurança.");
      router.replace(data.redirectTo || "/cadastro?tipo=acompanhante&telefoneValidado=1");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível validar o código.");
    } finally {
      setVerifyingCode(false);
    }
  }

  if (!hydrated) {
    return (
      <main className={styles.loadingPage} aria-label="Carregando cadastro profissional">
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

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Elite Modell - página inicial">
          <span className={styles.brandStar} aria-hidden="true">
            ✦
          </span>
          elitemodell
        </Link>
        <Link className={styles.loginLink} href="/login">
          Já tenho conta
        </Link>
      </header>

      <div className={styles.progressWrap} aria-label={`Etapa ${progress} de 3`}>
        <div className={styles.progressMeta}>
          <span>Cadastro profissional</span>
          <span>Etapa {progress} de 3</span>
        </div>
        <div className={styles.progressTrack}>
          <span style={{ width: `${(progress / 3) * 100}%` }} />
        </div>
      </div>

      {stage === "phone" && (
        <section className={styles.phoneStage} aria-labelledby="professional-register-title">
          <div className={styles.heroVisual}>
            <Image
              src="/images/professional-registration/elite-professional-hero-v1.png"
              alt="Profissional adulta administrando seu perfil pelo celular em ambiente sofisticado"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 50vw"
              className={styles.heroImage}
            />
            <div className={styles.heroOverlay} />
            <div className={styles.heroMessage}>
              <span>Seu perfil, suas escolhas</span>
              <strong>Presença profissional com identidade e controle.</strong>
            </div>
          </div>

          <div className={styles.phoneContent}>
            <span className={styles.eyebrow}>
              <Sparkles size={16} aria-hidden="true" />
              Espaço profissional Elite Modell
            </span>
            <h1 id="professional-register-title" ref={headingRef} tabIndex={-1}>
              Cadastre-se como profissional
            </h1>
            <p className={styles.lead}>
              Crie seu perfil, defina seus valores e seja encontrada por clientes da sua região.
            </p>

            <div className={styles.formCard}>
              <label htmlFor="professional-phone">Qual seu número de WhatsApp profissional?</label>
              <div className={styles.inputShell}>
                <Phone size={20} aria-hidden="true" />
                <span className={styles.countryCode}>+55</span>
                <input
                  id="professional-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Digite seu WhatsApp profissional"
                  value={formatPhone(phone)}
                  onChange={(event) => setPhone(onlyDigits(event.target.value))}
                  aria-describedby="phone-help"
                />
              </div>
              <p id="phone-help" className={styles.inputHelp}>
                Este número poderá ficar visível no seu perfil, conforme suas configurações.
              </p>

              <div className={styles.consentList}>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={consents.ageConfirmed}
                    onChange={(event) =>
                      setConsents((current) => ({
                        ...current,
                        ageConfirmed: event.target.checked,
                      }))
                    }
                  />
                  <span>Confirmo que tenho 18 anos ou mais.</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={consents.ownershipConfirmed}
                    onChange={(event) =>
                      setConsents((current) => ({
                        ...current,
                        ownershipConfirmed: event.target.checked,
                      }))
                    }
                  />
                  <span>Confirmo que o perfil será criado para mim.</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={consents.termsConsent}
                    onChange={(event) =>
                      setConsents((current) => ({
                        ...current,
                        termsConsent: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    Li e aceito os{" "}
                    <Link href="/terms" target="_blank">
                      Termos de Uso
                    </Link>
                    .
                  </span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={consents.lgpdConsent}
                    onChange={(event) =>
                      setConsents((current) => ({
                        ...current,
                        lgpdConsent: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    Li a{" "}
                    <Link href="/privacy" target="_blank">
                      Política de Privacidade
                    </Link>
                    .
                  </span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={consents.marketingConsent}
                    onChange={(event) =>
                      setConsents((current) => ({
                        ...current,
                        marketingConsent: event.target.checked,
                      }))
                    }
                  />
                  <span>Quero receber novidades e orientações da plataforma. (Opcional)</span>
                </label>
              </div>

              <button className={styles.primaryButton} type="button" onClick={continueToVerification}>
                Continuar
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </div>

            <div className={styles.quickBenefits} aria-label="Benefícios do cadastro">
              {[
                "Cadastro gratuito",
                "Controle do próprio perfil",
                "Perfil verificado",
                "Suporte da plataforma",
              ].map((item) => (
                <span key={item}>
                  <Check size={16} aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {stage === "verification" && (
        <section className={styles.verificationStage} aria-labelledby="verification-title">
          <button className={styles.backButton} type="button" onClick={() => setStage("phone")}>
            <ChevronLeft size={20} aria-hidden="true" />
            Alterar telefone
          </button>

          {!isValidBrazilianPhone(phone) ? (
            <div className={styles.emptyVerification}>
              <Phone size={34} aria-hidden="true" />
              <h1 id="verification-title" ref={headingRef} tabIndex={-1}>
                Confirme seu telefone profissional
              </h1>
              <p>
                Para escolher WhatsApp ou SMS, informe primeiro o telefone e aceite os termos
                obrigatórios.
              </p>
              <button className={styles.primaryButton} type="button" onClick={() => setStage("phone")}>
                Informar telefone
              </button>
            </div>
          ) : (
            <div className={styles.verificationCard}>
              <span className={styles.eyebrow}>
                <LockKeyhole size={16} aria-hidden="true" />
                Validação segura
              </span>
              <h1 id="verification-title" ref={headingRef} tabIndex={-1}>
                Escolha o método de validação do seu telefone
              </h1>
              <p>
                Enviaremos um código de 6 dígitos para <strong>{formatPhone(phone)}</strong>.
              </p>

              {!codeSent ? (
                <div className={styles.channelList}>
                  <button
                    type="button"
                    disabled={sendingCode}
                    onClick={() => sendCode("whatsapp")}
                  >
                    <span className={styles.channelIcon}>
                      <MessageCircle size={25} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Receber código via WhatsApp</strong>
                      <small>Use o aplicativo vinculado a este número.</small>
                    </span>
                    <ChevronRight size={22} aria-hidden="true" />
                  </button>
                  <button type="button" disabled={sendingCode} onClick={() => sendCode("sms")}>
                    <span className={styles.channelIcon}>
                      <Phone size={25} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>Receber código via SMS</strong>
                      <small>Receba uma mensagem de texto no celular.</small>
                    </span>
                    <ChevronRight size={22} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className={styles.codeArea}>
                  <div className={styles.sentNotice}>
                    <Check size={18} aria-hidden="true" />
                    Código enviado por {channel === "whatsapp" ? "WhatsApp" : "SMS"}.
                  </div>
                  <label htmlFor="verification-code">Código de 6 dígitos</label>
                  <input
                    id="verification-code"
                    className={styles.codeInput}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                  />
                  <button
                    className={styles.primaryButton}
                    type="button"
                    disabled={verifyingCode || code.length !== 6}
                    onClick={verifyCode}
                  >
                    {verifyingCode ? "Validando..." : "Validar e continuar"}
                  </button>
                  <div className={styles.resendRow} aria-live="polite">
                    {resendSeconds > 0 ? (
                      <span>
                        <Clock3 size={16} aria-hidden="true" />
                        Reenviar em {resendSeconds}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={sendingCode || !channel}
                        onClick={() => channel && sendCode(channel)}
                      >
                        Reenviar código
                      </button>
                    )}
                    <button type="button" onClick={() => setCodeSent(false)}>
                      Trocar método
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {stage === "phone" && (
        <div className={styles.experienceStage}>
          <section className={styles.simulatorSection} aria-labelledby="simulator-title">
            <div className={styles.sectionHeading}>
              <span className={styles.eyebrow}>
                <CircleDollarSign size={16} aria-hidden="true" />
                Simulador Elite Modell
              </span>
              <h2 id="simulator-title">Quanto você pode faturar?</h2>
              <p>Ajuste os dados para visualizar uma estimativa personalizada.</p>
            </div>

            <div className={styles.simulatorGrid}>
              <div className={styles.simulatorControls}>
                <label htmlFor="attendance-value">
                  <span>Valor por atendimento</span>
                  <strong>{formatCurrency(attendanceValue)}</strong>
                </label>
                <input
                  id="attendance-value"
                  type="range"
                  min={50}
                  max={3000}
                  step={50}
                  value={attendanceValue}
                  onChange={(event) => setAttendanceValue(Number(event.target.value))}
                />

                <label htmlFor="appointments-per-day">
                  <span>Atendimentos por dia</span>
                  <strong>{appointmentsPerDay}</strong>
                </label>
                <input
                  id="appointments-per-day"
                  type="range"
                  min={1}
                  max={10}
                  value={appointmentsPerDay}
                  onChange={(event) => setAppointmentsPerDay(Number(event.target.value))}
                />

                <label htmlFor="days-per-week">
                  <span>Dias por semana</span>
                  <strong>{daysPerWeek}</strong>
                </label>
                <input
                  id="days-per-week"
                  type="range"
                  min={1}
                  max={7}
                  value={daysPerWeek}
                  onChange={(event) => setDaysPerWeek(Number(event.target.value))}
                />
              </div>

              <div className={styles.revenueCard} aria-live="polite">
                <span>Estimativa mensal</span>
                <strong>{formatCurrency(monthlyRevenue)}</strong>
                <div>
                  <span>Receita semanal</span>
                  <b>{formatCurrency(weeklyRevenue)}</b>
                </div>
                <div>
                  <span>Receita mensal</span>
                  <b>{formatCurrency(monthlyRevenue)}</b>
                </div>
                <p>
                  Valores estimados. Ganhos dependem da região, demanda e disponibilidade.
                </p>
              </div>
            </div>
          </section>

          <section className={styles.benefitsSection} aria-labelledby="benefits-title">
            <div className={styles.sectionHeading}>
              <span className={styles.eyebrow}>
                <Sparkles size={16} aria-hidden="true" />
                Liberdade com organização
              </span>
              <h2 id="benefits-title">Seu perfil do seu jeito</h2>
              <p>Ferramentas para apresentar seu trabalho com clareza, segurança e autonomia.</p>
            </div>

            <div className={styles.benefitGrid}>
              {benefits.map(({ title, description, icon: Icon }) => (
                <article key={title} className={styles.benefitCard}>
                  <span>
                    <Icon size={24} aria-hidden="true" />
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.faqSection} aria-labelledby="faq-title">
            <div className={styles.sectionHeading}>
              <span className={styles.eyebrow}>
                <MessageCircle size={16} aria-hidden="true" />
                Informações importantes
              </span>
              <h2 id="faq-title">Dúvidas frequentes</h2>
            </div>

            <div className={styles.faqList}>
              {faqs.map(({ question, answer }) => (
                <details key={question}>
                  <summary>
                    <span>{question}</span>
                    <ChevronDown size={20} aria-hidden="true" />
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </section>

        </div>
      )}

      <footer className={styles.footer}>
        <div>
          <WalletCards size={18} aria-hidden="true" />
          Nenhuma cobrança é realizada nesta etapa.
        </div>
        <nav aria-label="Links jurídicos do cadastro">
          <Link href="/terms">Termos de Uso</Link>
          <Link href="/privacy">Privacidade</Link>
          <a href="mailto:privacidade@elitemodell.com.br">Canal de Privacidade</a>
        </nav>
      </footer>
    </main>
  );
}
