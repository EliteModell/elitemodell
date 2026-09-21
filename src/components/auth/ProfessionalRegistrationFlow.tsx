"use client";

import { NoPrefetchLink as Link } from "@/components/NoPrefetchLink";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Laptop,
  LockKeyhole,
  MessageCircle,
  Phone,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import styles from "./ProfessionalRegistrationFlow.module.css";
import { readJsonResponse } from "@/lib/safe-json-response";
type RegistrationStage = "phone" | "verification";
type VerificationChannel = "sms" | "whatsapp";

type ConsentState = {
  ageConfirmed: boolean;
  ownershipConfirmed: boolean;
  termsConsent: boolean;
  lgpdConsent: boolean;
  marketingConsent: boolean;
};

type VerifyCodeResponse = {
  error?: string;
  registrationPending?: boolean;
  redirectTo?: string;
};

type ProfessionalRegistrationFlowProps = {
  startAtVerification?: boolean;
  whatsAppVerifyEnabled?: boolean;
};

type SendCodeResponse = {
  ok?: boolean;
  code?:
    | "WHATSAPP_NOT_CONFIGURED"
    | "WHATSAPP_SENDER_ERROR"
    | "TWILIO_RATE_LIMIT"
    | "INVALID_PHONE"
    | "SMS_SEND_FAILED"
    | "WHATSAPP_SEND_FAILED";
  error?: string;
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
  whatsAppVerifyEnabled = false,
}: ProfessionalRegistrationFlowProps) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [stage, setStage] = useState<RegistrationStage>(
    startAtVerification ? "verification" : "phone",
  );
  const [phone, setPhone] = useState("");
  const [consents, setConsents] = useState<ConsentState>(initialConsent);
  const [channel, setChannel] = useState<VerificationChannel>("sms");
  const [whatsAppConsent, setWhatsAppConsent] = useState(false);
  const [smsFallbackAvailable, setSmsFallbackAvailable] = useState(false);
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
  const canContinueFromPhone =
    isValidBrazilianPhone(phone) &&
    mandatoryConsentsAccepted &&
    (channel !== "whatsapp" || whatsAppConsent);

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

  function setMandatoryConsent(accepted: boolean) {
    setConsents((current) => ({
      ...current,
      ageConfirmed: accepted,
      ownershipConfirmed: accepted,
      termsConsent: accepted,
      lgpdConsent: accepted,
    }));
  }

  async function continueToVerification() {
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
    await sendCode();
  }

  async function sendCode(channelOverride?: VerificationChannel) {
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

    const requestedChannel = channelOverride ?? channel;
    if (requestedChannel === "whatsapp" && (!whatsAppVerifyEnabled || !whatsAppConsent)) {
      toast.error(
        whatsAppVerifyEnabled
          ? "Confirme que deseja receber o código pelo WhatsApp."
          : "O WhatsApp ainda não está disponível. Use o envio por SMS.",
      );
      return;
    }

    const normalizedPhone = onlyDigits(phone);
    setSendingCode(true);
    const friendlyError = "Não foi possível enviar o código agora. Tente novamente.";

    try {
      const response = await fetch("/api/auth/phone/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizedPhone,
          accountType: "model",
          channel: requestedChannel,
          termsConsent: consents.termsConsent,
          lgpdConsent: consents.lgpdConsent,
          ageConfirmed: consents.ageConfirmed,
          ownershipConfirmed: consents.ownershipConfirmed,
          marketingConsent: consents.marketingConsent,
        }),
      });
      const data = await readJsonResponse<SendCodeResponse>(response);

      if (!data) {
        throw new Error(friendlyError);
      }
      if (!response.ok || !data.ok) {
        if (
          requestedChannel === "whatsapp" &&
          ["WHATSAPP_NOT_CONFIGURED", "WHATSAPP_SENDER_ERROR", "WHATSAPP_SEND_FAILED"].includes(
            data.code ?? "",
          )
        ) {
          setSmsFallbackAvailable(true);
        }
        throw new Error(data.error || friendlyError);
      }

      setChannel(requestedChannel);
      setSmsFallbackAvailable(false);
      setCodeSent(true);
      setCode("");
      setResendSeconds(RESEND_SECONDS);
      toast.success(
        requestedChannel === "whatsapp"
          ? "Código enviado pelo WhatsApp."
          : "SMS enviado! Pode levar até 1 minuto para chegar.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : friendlyError);
    } finally {
      setSendingCode(false);
    }
  }

  function chooseResendChannel(nextChannel: VerificationChannel) {
    setChannel(nextChannel);
    setCodeSent(false);
    setCode("");
    setSmsFallbackAvailable(false);
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
      const data = await readJsonResponse<VerifyCodeResponse>(response);

      if (!data) {
        throw new Error("Não foi possível validar o código agora. Tente novamente.");
      }
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

  return (
    <main className={styles.page}>
      <div className={styles.background} aria-hidden="true" />
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.backHome} href="/">
            <ChevronLeft size={18} aria-hidden="true" />
            Voltar
          </Link>
          <Link className={styles.brand} href="/" aria-label="Elite Modell - página inicial">
            <Image className={styles.brandSymbol} src="/brand/elite-modell-symbol.png" alt="" width={1536} height={1536} priority />
            <span className={styles.brandWords} aria-hidden="true">
              <strong>ELITE</strong>
              <small>— MODELL —</small>
            </span>
          </Link>
          <Link className={styles.loginLink} href="/login">Já tenho conta</Link>
        </header>

        <div className={styles.progressWrap} aria-label={`Etapa ${progress} de 3`}>
          <div className={styles.progressMeta}>
            <span>Cadastro de acompanhante</span>
            <span>Etapa {progress} de 3</span>
          </div>
          <div className={styles.progressTrack}><span style={{ width: `${(progress / 3) * 100}%` }} /></div>
        </div>

        {stage === "phone" ? (
          <div className={styles.phoneStage}>
            <section className={styles.hero} aria-labelledby="professional-register-title">
              <span className={styles.eyebrow}>Liberdade • discrição • segurança</span>
              <h1 id="professional-register-title" ref={headingRef} tabIndex={-1}>
                Cadastre-se grátis <em>como acompanhante</em>
              </h1>
              <p>Anuncie com segurança, controle seu perfil e acompanhe sua verificação em cada etapa.</p>
              <div className={styles.heroSteps} aria-label="Seu cadastro em três etapas">
                <div><b>1</b><span><strong>Telefone</strong><small>Informe seu número</small></span></div>
                <div><b>2</b><span><strong>Código</strong><small>Confirme sua identidade</small></span></div>
                <div><b>3</b><span><strong>Cadastro completo</strong><small>Crie seu perfil</small></span></div>
              </div>
            </section>

            <section className={styles.validationSection} aria-labelledby="validation-title">
              <div className={styles.validationIntro}>
                <span className={styles.eyebrow}><LockKeyhole size={16} aria-hidden="true" /> Validação segura</span>
                <h2 id="validation-title">Valide seu telefone para continuar</h2>
                <p>Enviaremos um código de 6 dígitos para o seu celular.</p>
                <label htmlFor="professional-phone">Seu número de telefone</label>
                <div className={styles.inputShell}>
                  <span className={styles.countryCode}>+55</span>
                  <input
                    id="professional-phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="tel"
                    placeholder="(11) 99999-9999"
                    value={formatPhone(phone)}
                    onChange={(event) => setPhone(onlyDigits(event.target.value))}
                    aria-describedby="phone-help"
                  />
                </div>
                <p id="phone-help" className={styles.inputHelp}>Use um número brasileiro com DDD.</p>
              </div>

              <div className={styles.validationControls}>
                <fieldset className={styles.deliveryChoice}>
                  <legend>Como deseja receber?</legend>
                  <div className={styles.deliveryOptions}>
                    <button
                      className={channel === "sms" ? styles.deliveryOptionSelected : undefined}
                      type="button"
                      role="radio"
                      aria-checked={channel === "sms"}
                      onClick={() => { setChannel("sms"); setSmsFallbackAvailable(false); }}
                    >
                      <span className={styles.channelIcon}><MessageCircle size={25} aria-hidden="true" /></span>
                      <span><strong>Receber código via SMS</strong><small>Receba uma mensagem de texto no seu celular.</small></span>
                      <ChevronRight size={22} aria-hidden="true" />
                    </button>
                    <button
                      className={channel === "whatsapp" ? styles.deliveryOptionSelected : undefined}
                      type="button"
                      role="radio"
                      aria-checked={channel === "whatsapp"}
                      disabled={!whatsAppVerifyEnabled}
                      onClick={() => { setChannel("whatsapp"); setSmsFallbackAvailable(false); }}
                    >
                      <span className={styles.channelIcon}><MessageCircle size={25} aria-hidden="true" /></span>
                      <span><strong>Receber código via WhatsApp</strong><small>Receba seu código pelo WhatsApp.</small></span>
                      {!whatsAppVerifyEnabled && <em>Em breve</em>}
                      {whatsAppVerifyEnabled && <ChevronRight size={22} aria-hidden="true" />}
                    </button>
                  </div>
                  {channel === "whatsapp" && whatsAppVerifyEnabled && (
                    <label className={styles.whatsAppConsent}>
                      <input type="checkbox" checked={whatsAppConsent} onChange={(event) => setWhatsAppConsent(event.target.checked)} />
                      <span>Quero receber meu código de verificação pelo WhatsApp.</span>
                    </label>
                  )}
                </fieldset>

                <div className={styles.consentList}>
                  <label className={styles.checkRow}>
                    <input type="checkbox" checked={mandatoryConsentsAccepted} onChange={(event) => setMandatoryConsent(event.target.checked)} />
                    <span>Confirmo que tenho 18 anos ou mais, que o perfil será criado para mim e concordo com os <Link href="/terms" target="_blank">Termos de Uso</Link> e a <Link href="/privacy" target="_blank">Política de Privacidade</Link>.</span>
                  </label>
                </div>

                <div className={styles.continueArea}>
                  <button className={styles.primaryButton} type="button" disabled={!canContinueFromPhone || sendingCode} onClick={continueToVerification}>
                    {sendingCode ? "Enviando código..." : "Enviar código"} <ChevronRight size={21} aria-hidden="true" />
                  </button>
                  <span><LockKeyhole size={14} aria-hidden="true" /> Seus dados estão protegidos e em total sigilo.</span>
                </div>
              </div>
            </section>

            <section className={styles.benefitsSection} aria-labelledby="benefits-title">
              <div className={styles.sectionHeading}>
                <span>Seu perfil do seu jeito</span>
                <h2 id="benefits-title">Ferramentas para você brilhar</h2>
                <p>Tenha autonomia, organize sua rotina e apresente seu trabalho com clareza.</p>
              </div>
              <div className={styles.benefitGrid}>
                {benefits.map(({ title, description, icon: Icon }) => (
                  <article key={title} className={styles.benefitCard}>
                    <span><Icon size={23} aria-hidden="true" /></span>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.simulatorSection} aria-labelledby="simulator-title">
              <div className={styles.sectionHeading}>
                <span><CircleDollarSign size={16} aria-hidden="true" /> Simulador Elite Modell</span>
                <h2 id="simulator-title">Quanto você pode faturar?</h2>
                <p>Ajuste os dados para visualizar uma estimativa personalizada.</p>
              </div>
              <div className={styles.simulatorGrid}>
                <div className={styles.simulatorControls}>
                  <label htmlFor="attendance-value"><span>Valor por atendimento</span><strong>{formatCurrency(attendanceValue)}</strong></label>
                  <input id="attendance-value" type="range" min={50} max={3000} step={50} value={attendanceValue} onChange={(event) => setAttendanceValue(Number(event.target.value))} />
                  <small>Defina quanto você cobra por atendimento.</small>
                  <label htmlFor="appointments-per-day"><span>Atendimentos por dia</span><strong>{appointmentsPerDay}</strong></label>
                  <input id="appointments-per-day" type="range" min={1} max={10} value={appointmentsPerDay} onChange={(event) => setAppointmentsPerDay(Number(event.target.value))} />
                  <small>Quantos atendimentos você realiza por dia?</small>
                  <label htmlFor="days-per-week"><span>Dias por semana</span><strong>{daysPerWeek}</strong></label>
                  <input id="days-per-week" type="range" min={1} max={7} value={daysPerWeek} onChange={(event) => setDaysPerWeek(Number(event.target.value))} />
                  <small>Em quantos dias da semana você trabalha?</small>
                </div>
                <div className={styles.revenueCard} aria-live="polite">
                  <span>Estimativa mensal</span>
                  <strong>{formatCurrency(monthlyRevenue)}</strong>
                  <div><span>Receita semanal</span><b>{formatCurrency(weeklyRevenue)}</b></div>
                  <div><span>Receita mensal</span><b>{formatCurrency(monthlyRevenue)}</b></div>
                  <p>Valores estimados. Ganhos dependem da região, demanda e disponibilidade.</p>
                </div>
              </div>
            </section>

          </div>
        ) : (
          <section className={styles.verificationStage} aria-labelledby="verification-title">
            <button className={styles.backButton} type="button" onClick={() => setStage("phone")}>
              <ChevronLeft size={20} aria-hidden="true" /> Alterar telefone
            </button>
            {!isValidBrazilianPhone(phone) ? (
              <div className={styles.verificationCard}>
                <Phone size={34} aria-hidden="true" />
                <h1 id="verification-title" ref={headingRef} tabIndex={-1}>Confirme seu telefone</h1>
                <p>Informe primeiro o telefone e aceite os termos obrigatórios.</p>
                <button className={styles.primaryButton} type="button" onClick={() => setStage("phone")}>Informar telefone</button>
              </div>
            ) : (
              <div className={styles.verificationCard}>
                <span className={styles.eyebrow}><LockKeyhole size={16} aria-hidden="true" /> Validação segura</span>
                <h1 id="verification-title" ref={headingRef} tabIndex={-1}>Valide seu telefone para continuar</h1>
                <p>Enviaremos um código de 6 dígitos por {channel === "whatsapp" ? "WhatsApp" : "SMS"} para <strong>{formatPhone(phone)}</strong>.</p>
                {!codeSent ? (
                  <div className={styles.channelSendPanel}>
                    <div className={styles.verificationChannels} role="radiogroup" aria-label="Canal de entrega">
                      <button className={channel === "sms" ? styles.verificationChannelSelected : undefined} type="button" role="radio" aria-checked={channel === "sms"} onClick={() => setChannel("sms")}><Phone size={18} aria-hidden="true" /> SMS</button>
                      {whatsAppVerifyEnabled && <button className={channel === "whatsapp" ? styles.verificationChannelSelected : undefined} type="button" role="radio" aria-checked={channel === "whatsapp"} onClick={() => setChannel("whatsapp")}><MessageCircle size={18} aria-hidden="true" /> WhatsApp</button>}
                    </div>
                    {channel === "whatsapp" && <label className={styles.whatsAppConsent}><input type="checkbox" checked={whatsAppConsent} onChange={(event) => setWhatsAppConsent(event.target.checked)} /><span>Quero receber meu código de verificação pelo WhatsApp.</span></label>}
                    {smsFallbackAvailable && <div className={styles.fallbackNotice} role="alert"><p>Não foi possível enviar pelo WhatsApp. Você pode receber o código por SMS.</p><button type="button" disabled={sendingCode} onClick={() => sendCode("sms")}>Enviar por SMS</button></div>}
                    <button className={styles.primaryButton} type="button" disabled={sendingCode || resendSeconds > 0 || (channel === "whatsapp" && !whatsAppConsent)} onClick={() => sendCode()}>
                      {sendingCode ? "Enviando..." : `Enviar código por ${channel === "whatsapp" ? "WhatsApp" : "SMS"}`} <ChevronRight size={20} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className={styles.codeArea}>
                    <div className={styles.sentNotice}><Check size={18} aria-hidden="true" /> Código solicitado por {channel === "whatsapp" ? "WhatsApp" : "SMS"}. Pode levar até 1 minuto.</div>
                    <label htmlFor="verification-code">Código de 6 dígitos</label>
                    <input id="verification-code" className={styles.codeInput} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" />
                    <button className={styles.primaryButton} type="button" disabled={verifyingCode || code.length !== 6} onClick={verifyCode}>{verifyingCode ? "Validando..." : "Validar e continuar"}</button>
                    <div className={styles.resendRow} aria-live="polite">
                      {resendSeconds > 0 ? <span><Clock3 size={16} aria-hidden="true" /> Reenviar em {resendSeconds}s</span> : <div className={styles.resendActions}><button type="button" disabled={sendingCode} onClick={() => sendCode(channel)}>Reenviar por {channel === "whatsapp" ? "WhatsApp" : "SMS"}</button>{channel === "whatsapp" ? <button type="button" disabled={sendingCode} onClick={() => sendCode("sms")}>Enviar por SMS</button> : whatsAppVerifyEnabled ? <button type="button" disabled={sendingCode} onClick={() => chooseResendChannel("whatsapp")}>Usar WhatsApp</button> : null}</div>}
                      <button type="button" onClick={() => setStage("phone")}>Corrigir telefone</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <footer className={styles.footer}>
          <span>© Elite Modell</span>
          <nav aria-label="Links jurídicos do cadastro"><Link href="/terms">Termos de Uso</Link><Link href="/privacy">Privacidade</Link></nav>
        </footer>
      </div>
    </main>
  );
}
