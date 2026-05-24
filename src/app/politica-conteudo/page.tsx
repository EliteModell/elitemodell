import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Conteúdo Adulto — Elite Modell",
  description: "Regras e diretrizes para conteúdo adulto na plataforma Elite Modell.",
  robots: { index: false },
};

const GOLD = "#d4a843";

export default function PoliticaConteudoPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#f1f5f9",
        fontFamily: "inherit",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px 96px" }}>
        {/* Header */}
        <div style={{ marginBottom: 48, borderBottom: "1px solid rgba(212,168,67,0.15)", paddingBottom: 32 }}>
          <Link
            href="/"
            style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.5px", textDecoration: "none", display: "inline-block", marginBottom: 32 }}
          >
            <span style={{ background: "linear-gradient(135deg, #ffe5a0, #d4a843, #f5d78c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>elite</span>
            <span style={{ color: "#f1f5f9" }}>modell</span>
          </Link>

          <p style={{ color: GOLD, fontSize: 11, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 12px" }}>
            Política de conteúdo
          </p>
          <h1 style={{ fontSize: "clamp(28px, 6vw, 42px)", fontWeight: 900, margin: "0 0 16px", lineHeight: 1.1 }}>
            Política de Conteúdo Adulto
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
            Última atualização: maio de 2026
          </p>
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

          <section>
            <h2 style={{ color: GOLD, fontSize: 13, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 16px" }}>
              1. Plataforma para maiores de 18 anos
            </h2>
            <p style={{ color: "#cbd5e1", lineHeight: 1.8, margin: 0 }}>
              A Elite Modell é uma plataforma exclusiva para adultos com 18 anos ou mais. O acesso, cadastro e uso
              de qualquer recurso da plataforma é estritamente proibido para menores de idade. Todo usuário
              confirma sua maioridade no momento do cadastro e ao aceitar os Termos de Uso.
            </p>
          </section>

          <section>
            <h2 style={{ color: GOLD, fontSize: 13, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 16px" }}>
              2. Conteúdo permitido
            </h2>
            <p style={{ color: "#cbd5e1", lineHeight: 1.8, margin: "0 0 16px" }}>
              São permitidos na plataforma:
            </p>
            <ul style={{ color: "#cbd5e1", lineHeight: 2, paddingLeft: 20, margin: 0 }}>
              <li>Perfis profissionais de acompanhantes adultos legalmente autorizados a exercer a atividade</li>
              <li>Fotos e vídeos de caráter profissional e artístico, sem nudez explícita no perfil público</li>
              <li>Anúncios de imóveis para fins de atendimento entre adultos</li>
              <li>Comunicação direta entre usuários verificados por meio de canais privados</li>
              <li>Avaliações e comentários honestos sobre serviços prestados</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: GOLD, fontSize: 13, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 16px" }}>
              3. Conteúdo proibido
            </h2>
            <p style={{ color: "#cbd5e1", lineHeight: 1.8, margin: "0 0 16px" }}>
              É expressamente proibido e sujeito a remoção imediata e banimento permanente:
            </p>
            <ul style={{ color: "#cbd5e1", lineHeight: 2, paddingLeft: 20, margin: 0 }}>
              <li>Qualquer conteúdo envolvendo menores de idade, sem exceção</li>
              <li>Material de abuso sexual infantil (CSAM) — reportado imediatamente às autoridades</li>
              <li>Conteúdo não consensual ou obtido sem permissão explícita do(s) envolvido(s)</li>
              <li>Perfis falsos, fotos de terceiros sem autorização ou identidades falsificadas</li>
              <li>Conteúdo que promova violência, coerção, tráfico de pessoas ou exploração sexual</li>
              <li>Spam, fraude, golpes ou qualquer forma de enganação financeira</li>
              <li>Conteúdo discriminatório com base em raça, gênero, orientação sexual ou religião</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: GOLD, fontSize: 13, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 16px" }}>
              4. Verificação de identidade
            </h2>
            <p style={{ color: "#cbd5e1", lineHeight: 1.8, margin: 0 }}>
              Profissionais e anfitriões são submetidos a processo de verificação de identidade antes de publicar
              perfis ou imóveis na plataforma. A verificação inclui confirmação de documento oficial e, quando
              aplicável, validação facial. Usuários não verificados têm acesso limitado a recursos sensíveis.
            </p>
          </section>

          <section>
            <h2 style={{ color: GOLD, fontSize: 13, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 16px" }}>
              5. Moderação e denúncias
            </h2>
            <p style={{ color: "#cbd5e1", lineHeight: 1.8, margin: "0 0 16px" }}>
              A Elite Modell mantém uma equipe de moderação que revisa conteúdos denunciados. Para reportar
              conteúdo que viole esta política, utilize o botão &quot;Denunciar&quot; em qualquer perfil ou entre em
              contato pelo e-mail{" "}
              <a href="mailto:suporte@elitemodell.com.br" style={{ color: GOLD, textDecoration: "none" }}>
                suporte@elitemodell.com.br
              </a>
              .
            </p>
            <p style={{ color: "#cbd5e1", lineHeight: 1.8, margin: 0 }}>
              Conteúdo envolvendo menores de idade é reportado às autoridades competentes, incluindo a Polícia
              Federal e o Ministério Público, sem aviso prévio ao denunciado.
            </p>
          </section>

          <section>
            <h2 style={{ color: GOLD, fontSize: 13, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 16px" }}>
              6. Consequências por violação
            </h2>
            <ul style={{ color: "#cbd5e1", lineHeight: 2, paddingLeft: 20, margin: 0 }}>
              <li>Remoção imediata do conteúdo infrator</li>
              <li>Suspensão temporária ou banimento permanente da conta</li>
              <li>Comunicação às autoridades competentes nos casos previstos em lei</li>
              <li>Ação civil ou criminal quando aplicável</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: GOLD, fontSize: 13, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 16px" }}>
              7. Responsabilidade do usuário
            </h2>
            <p style={{ color: "#cbd5e1", lineHeight: 1.8, margin: 0 }}>
              Cada usuário é integralmente responsável pelo conteúdo que publica na plataforma. Ao publicar fotos,
              vídeos ou textos, o usuário declara que possui todos os direitos e permissões necessários sobre o
              material, incluindo o consentimento expresso de todas as pessoas retratadas.
            </p>
          </section>

          <div style={{
            background: "rgba(212,168,67,0.06)",
            border: "1px solid rgba(212,168,67,0.18)",
            borderRadius: 12,
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}>
            <p style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 700, margin: 0 }}>Dúvidas ou denúncias?</p>
            <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
              <a href="mailto:suporte@elitemodell.com.br" style={{ color: GOLD, textDecoration: "none" }}>suporte@elitemodell.com.br</a>
              {" "}·{" "}
              <Link href="/terms" style={{ color: GOLD, textDecoration: "none" }}>Termos de Uso</Link>
              {" "}·{" "}
              <Link href="/privacy" style={{ color: GOLD, textDecoration: "none" }}>Política de Privacidade</Link>
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}
