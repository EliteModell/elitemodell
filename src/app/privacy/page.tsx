"use client";
import Link from "next/link";
import { useState } from "react";

const GOLD = "#d4a843";
const GOLD_GRADIENT = "linear-gradient(135deg, #ffe5a0 0%, #d4a843 22%, #f5d78c 45%, #9e7b2a 72%, #d4a843 100%)";

export default function PrivacyPage() {
  const [language, setLanguage] = useState<"pt" | "en">("pt");

  const content = {
    pt: {
      title: "Política de Privacidade",
      lastUpdated: "Última atualização: 11 de maio de 2026",
      intro: "A Elite Modell respeita sua privacidade e está comprometida em proteger seus dados pessoais de acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e legislação aplicável.",
      sections: [
        {
          heading: "1. Coleta de Dados",
          content: "Coletamos informações que você fornece voluntariamente, como nome, email, telefone, data de nascimento e documentos de identificação. Também coletamos dados automaticamente, como endereço IP, tipo de navegador e atividades na plataforma."
        },
        {
          heading: "2. Uso dos Dados",
          content: `Seus dados são utilizados para:
- Criar e gerenciar sua conta
- Processar pagamentos e transações
- Verificar sua identidade e idade
- Enviar notificações e comunicações
- Melhorar a segurança da plataforma
- Cumprir obrigações legais
- Análise agregada e estatísticas (anonimizadas)`
        },
        {
          heading: "3. Compartilhamento de Dados",
          content: "Não vendemos seus dados pessoais. Compartilhamos dados apenas com: (a) Provedores de serviço que processam pagamentos e armazenamento; (b) Autoridades quando obrigado por lei; (c) Outro usuário quando você inicia transação."
        },
        {
          heading: "4. Armazenamento Seguro",
          content: "Seus dados são armazenados em servidores protegidos com criptografia de ponta a ponta. Acessamos dados sensíveis apenas quando necessário. Implementamos múltiplas camadas de segurança para proteger contra acesso não autorizado."
        },
        {
          heading: "5. Retenção de Dados",
          content: `Mantemos seus dados pessoais enquanto sua conta estiver ativa. Após cancelamento:
- Dados pessoais não sujeitos a obrigação legal: deletados ou anonimizados em até 30 dias
- Fotos/vídeos: deletados em até 7 dias
- Registros de transação: mantidos por 5 anos (obrigação fiscal)
- Dados necessários para cumprimento legal, prevenção a fraude e defesa de direitos: retidos pelo prazo legal aplicável
- Logs de segurança: mantidos por 90 dias`
        },
        {
          heading: "6. Seus Direitos (LGPD)",
          content: `Você tem direito a:
- ACESSAR: solicitar cópia de todos seus dados
- CORRIGIR: atualizar informações imprecisas
- DELETAR: remover seus dados (direito ao esquecimento)
- PORTABILIDADE: receber dados em formato estruturado
- OPOSIÇÃO: contestar processamento de dados
- REVOGAÇÃO: retirar consentimento a qualquer momento`
        },
        {
          heading: "7. Cookies e Rastreamento",
          content: "Utilizamos cookies para melhorar sua experiência. Você pode desabilitar cookies em suas configurações de navegador, mas isso pode afetar a funcionalidade da plataforma."
        },
        {
          heading: "8. Segurança de Menores",
          content: "A plataforma não é destinada a menores de 18 anos. Se descobrirmos que um menor está usando a plataforma, sua conta será encerrada e dados deletados imediatamente."
        },
        {
          heading: "9. Alterações nesta Política",
          content: "Podemos atualizar esta política ocasionalmente. Notificaremos você por email de alterações significativas. Seu uso contínuo implica em aceitação das novas termos."
        },
        {
          heading: "10. Contato",
          content: "Para solicitações relacionadas à privacidade, entre em contato: privacy@elitemodell.com.br. Você também pode contatar nossa Autoridade de Proteção de Dados: ANPD (Autoridade Nacional de Proteção de Dados)."
        }
      ]
    },
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last updated: May 11, 2026",
      intro: "Elite Modell respects your privacy and is committed to protecting your personal data in accordance with the General Data Protection Law (LGPD - Law nº 13.709/2018) and applicable legislation.",
      sections: [
        {
          heading: "1. Data Collection",
          content: "We collect information you voluntarily provide, such as name, email, phone, date of birth, and identification documents. We also collect data automatically, such as IP address, browser type, and activities on the platform."
        },
        {
          heading: "2. Data Usage",
          content: `Your data is used for:
- Creating and managing your account
- Processing payments and transactions
- Verifying your identity and age
- Sending notifications and communications
- Improving platform security
- Complying with legal obligations
- Aggregated analysis and statistics (anonymized)`
        },
        {
          heading: "3. Data Sharing",
          content: "We do not sell your personal data. We share data only with: (a) Service providers who process payments and storage; (b) Authorities when required by law; (c) Another user when you initiate a transaction."
        },
        {
          heading: "4. Secure Storage",
          content: "Your data is stored on protected servers with end-to-end encryption. We access sensitive data only when necessary. We implement multiple layers of security to protect against unauthorized access."
        },
        {
          heading: "5. Data Retention",
          content: `We maintain your personal data while your account is active. After cancellation:
- Personal data not subject to legal obligations: deleted or anonymized within 30 days
- Photos/videos: deleted within 7 days
- Transaction records: maintained for 5 years (tax obligation)
- Data required for legal compliance, fraud prevention, and legal claims: retained for the applicable legal period
- Security logs: maintained for 90 days`
        },
        {
          heading: "6. Your Rights (LGPD)",
          content: `You have the right to:
- ACCESS: request a copy of all your data
- CORRECT: update inaccurate information
- DELETE: remove your data (right to be forgotten)
- PORTABILITY: receive data in structured format
- OPPOSITION: contest data processing
- REVOCATION: withdraw consent at any time`
        },
        {
          heading: "7. Cookies and Tracking",
          content: "We use cookies to improve your experience. You can disable cookies in your browser settings, but this may affect the functionality of the platform."
        },
        {
          heading: "8. Minor Safety",
          content: "The platform is not intended for minors under 18 years of age. If we discover that a minor is using the platform, their account will be terminated and data deleted immediately."
        },
        {
          heading: "9. Changes to This Policy",
          content: "We may update this policy occasionally. We will notify you by email of significant changes. Your continued use implies acceptance of the new terms."
        },
        {
          heading: "10. Contact",
          content: "For privacy-related requests, contact us: privacy@elitemodell.com.br. You can also contact our Data Protection Authority: ANPD (National Authority for Data Protection)."
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
        <p style={{ color: "#888", fontSize: 14, marginBottom: 12 }}>{lang.lastUpdated}</p>
        <p style={{ lineHeight: 1.7, color: "#aaa", fontSize: 15, marginBottom: 40 }}>{lang.intro}</p>

        {lang.sections.map((section, idx) => (
          <div key={idx} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "#fff" }}>{section.heading}</h2>
            <p style={{ lineHeight: 1.7, color: "#aaa", whiteSpace: "pre-wrap" }}>{section.content}</p>
          </div>
        ))}

        {/* Contact */}
        <div style={{ marginTop: 60, padding: "24px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12 }}>
          <p style={{ color: "#888", fontSize: 14, marginBottom: 12 }}>
            <strong>Perguntas sobre privacidade?</strong>
          </p>
          <p style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>
            Entre em contato: <a href="mailto:privacy@elitemodell.com.br" style={{ color: GOLD, textDecoration: "none" }}>privacy@elitemodell.com.br</a>
          </p>
          <p style={{ color: "#666", fontSize: 12, marginTop: 16 }}>
            Autoridade Nacional de Proteção de Dados (ANPD): https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd
          </p>
        </div>
      </div>
    </div>
  );
}
