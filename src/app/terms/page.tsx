"use client";
import Link from "next/link";
import { useState } from "react";

const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";

export default function TermsPage() {
  const [language, setLanguage] = useState<"pt" | "en">("pt");

  const content = {
    pt: {
      title: "Termos de Uso",
      lastUpdated: "Última atualização: 11 de maio de 2026",
      sections: [
        {
          heading: "1. Aceitação dos Termos",
          content: "Ao acessar e usar a plataforma Elite Modell, você concorda em estar vinculado por estes Termos de Uso. Se você não concorda com qualquer parte destes termos, não poderá usar a plataforma."
        },
        {
          heading: "2. Maioridade",
          content: "Você confirma que tem pelo menos 18 anos de idade e possui a capacidade legal para celebrar este acordo. A plataforma Elite Modell é destinada exclusivamente para maiores de 18 anos."
        },
        {
          heading: "3. Contas de Usuário",
          content: "Você é responsável por manter a confidencialidade de suas credenciais de login. Você concorda em ser responsável por todas as atividades que ocorram sob sua conta. Notifique-nos imediatamente de qualquer uso não autorizado."
        },
        {
          heading: "4. Conteúdo do Usuário",
          content: "Você retém os direitos sobre o conteúdo que publica, mas concede à Elite Modell uma licença para usar, exibir e distribuir esse conteúdo conforme necessário para operar a plataforma."
        },
        {
          heading: "5. Condutas Proibidas",
          content: `Você concorda em não:
- Publicar conteúdo ilegal, ofensivo ou discriminatório
- Usar a plataforma para fraude, assédio ou exploração
- Violar leis aplicáveis ou direitos de terceiros
- Tentar contornar sistemas de segurança
- Coletar dados de outros usuários sem consentimento`
        },
        {
          heading: "6. Política de Verificação",
          content: "Profissionais cadastrados passam por um processo de verificação de documentos. A Elite Modell pode solicitar documentação adicional a qualquer momento. Conteúdo falsificado ou verificação enganosa resultará em banimento permanente."
        },
        {
          heading: "7. Política de Cancelamento",
          content: "Você pode cancelar sua conta a qualquer momento. Dados pessoais serão deletados conforme a Lei Geral de Proteção de Dados (LGPD). Dados de transações serão mantidos por 5 anos para fins fiscais."
        },
        {
          heading: "8. Isenção de Responsabilidade",
          content: "A plataforma é fornecida 'no estado em que se encontra'. A Elite Modell não garante que o serviço será ininterrupto ou livre de erros. Não somos responsáveis por danos indiretos ou consequentes."
        },
        {
          heading: "9. Limitação de Responsabilidade",
          content: "Salvo quando proibido por lei, nossa responsabilidade total não deve exceder o valor que você pagou à Elite Modell nos últimos 12 meses."
        },
        {
          heading: "10. Lei Aplicável",
          content: "Estes Termos são regidos pelas leis do Brasil. Qualquer disputa será resolvida nos tribunais competentes de São Paulo."
        }
      ]
    },
    en: {
      title: "Terms of Use",
      lastUpdated: "Last updated: May 11, 2026",
      sections: [
        {
          heading: "1. Acceptance of Terms",
          content: "By accessing and using the Elite Modell platform, you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, you may not use the platform."
        },
        {
          heading: "2. Age of Majority",
          content: "You confirm that you are at least 18 years old and have the legal capacity to enter into this agreement. The Elite Modell platform is intended exclusively for those 18 years of age and older."
        },
        {
          heading: "3. User Accounts",
          content: "You are responsible for maintaining the confidentiality of your login credentials. You agree to be responsible for all activities that occur under your account. Notify us immediately of any unauthorized use."
        },
        {
          heading: "4. User Content",
          content: "You retain rights to the content you publish, but grant Elite Modell a license to use, display, and distribute that content as necessary to operate the platform."
        },
        {
          heading: "5. Prohibited Conduct",
          content: `You agree not to:
- Post illegal, offensive, or discriminatory content
- Use the platform for fraud, harassment, or exploitation
- Violate applicable laws or third-party rights
- Attempt to circumvent security systems
- Collect data from other users without consent`
        },
        {
          heading: "6. Verification Policy",
          content: "Professionals registered go through a document verification process. Elite Modell may request additional documentation at any time. Falsified content or deceptive verification will result in permanent ban."
        },
        {
          heading: "7. Cancellation Policy",
          content: "You may cancel your account at any time. Personal data will be deleted in accordance with the General Data Protection Law (LGPD). Transaction data will be retained for 5 years for tax purposes."
        },
        {
          heading: "8. Disclaimer",
          content: "The platform is provided 'as is'. Elite Modell does not guarantee that the service will be uninterrupted or error-free. We are not responsible for indirect or consequential damages."
        },
        {
          heading: "9. Limitation of Liability",
          content: "Except where prohibited by law, our total liability shall not exceed the amount you paid to Elite Modell in the last 12 months."
        },
        {
          heading: "10. Governing Law",
          content: "These Terms are governed by the laws of Brazil. Any dispute will be resolved in the competent courts of São Paulo."
        }
      ]
    }
  };

  const lang = content[language];

  return (
    <div style={{ minHeight: "100vh", background: "#040a14", color: "#f1f5f9" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "20px 0", position: "sticky", top: 0, background: "#040a14", zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
            <span style={{ fontWeight: 900, fontSize: 20 }}>
              <span style={{ background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>elite</span>
              <span style={{ color: "#f1f5f9" }}>modell</span>
            </span>
          </Link>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setLanguage("pt")}
              style={{
                padding: "8px 16px",
                background: language === "pt" ? GOLD : "transparent",
                color: language === "pt" ? "#040a14" : "#888",
                border: `1px solid ${language === "pt" ? GOLD : "#333"}`,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              PT
            </button>
            <button
              onClick={() => setLanguage("en")}
              style={{
                padding: "8px 16px",
                background: language === "en" ? GOLD : "transparent",
                color: language === "en" ? "#040a14" : "#888",
                border: `1px solid ${language === "en" ? GOLD : "#333"}`,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 20px" }}>
        <h1 style={{ fontSize: 44, fontWeight: 900, marginBottom: 12, background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          {lang.title}
        </h1>
        <p style={{ color: "#888", fontSize: 14, marginBottom: 40 }}>{lang.lastUpdated}</p>

        {lang.sections.map((section, idx) => (
          <div key={idx} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "#fff" }}>{section.heading}</h2>
            <p style={{ lineHeight: 1.7, color: "#aaa", whiteSpace: "pre-wrap" }}>{section.content}</p>
          </div>
        ))}

        {/* Contact */}
        <div style={{ marginTop: 60, padding: "24px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12 }}>
          <p style={{ color: "#888", fontSize: 14, marginBottom: 12 }}>
            <strong>Dúvidas sobre estes termos?</strong>
          </p>
          <p style={{ color: "#aaa", fontSize: 14 }}>
            Entre em contato: <a href="mailto:legal@elitemodell.com.br" style={{ color: GOLD, textDecoration: "none" }}>legal@elitemodell.com.br</a>
          </p>
        </div>
      </div>
    </div>
  );
}
