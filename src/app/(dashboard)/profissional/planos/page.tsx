"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  Clock,
  Copy,
  Crown,
  Diamond,
  EyeOff,
  HelpCircle,
  Image as ImageIcon,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  POINTS_MAX,
  POINTS_MIN,
  PROFESSIONAL_PLANS,
  getProfessionalPlanPrice,
  normalizePointsQuantity,
  type ProfessionalPlan,
  type ProfessionalPlanId,
  type ProfessionalPlanPrice,
} from "@/lib/professional-plans";

type CheckoutStage = "idle" | "creating" | "waiting" | "paid" | "failed";
type CheckoutSelection = {
  plan: ProfessionalPlan;
  price: ProfessionalPlanPrice;
  pointsQuantity?: number;
};

type ProductMeta = {
  eyebrow: string;
  headline: string;
  summary: string;
  badge?: string;
  primaryPrice?: string;
  icon: LucideIcon;
  tone: "gold" | "bronze" | "silver" | "amber" | "diamond" | "privacy" | "neutral";
  benefits: string[];
  cta: string;
  exampleTitle: string;
};

const GOLD = "#d4a843";
const GOLD_SOFT = "#f5d78c";

const PRODUCT_META: Record<ProfessionalPlanId, ProductMeta> = {
  "one-hour-top": {
    eyebrow: "Produto principal",
    headline: "Prioridade temporária nos horários de maior movimento",
    summary: "Seu anúncio ganha prioridade por 1 hora, aparece com mais força no topo das buscas e recebe um formato de destaque ampliado.",
    badge: "Destaque recomendado",
    primaryPrice: "R$ 24,99",
    icon: Zap,
    tone: "gold",
    benefits: [
      "Prioridade temporária",
      "Topo das buscas e listagem",
      "Mais visibilidade na sua cidade",
      "Formato de destaque ampliado",
      "Mais chance de receber contatos",
      "Ideal para horários de maior movimento",
    ],
    cta: "Comprar 1 hora no topo",
    exampleTitle: "Destaque de topo",
  },
  pontos: {
    eyebrow: "Força de listagem",
    headline: "Compre pontos para aumentar a força do seu anúncio",
    summary: "Os pontos ajudam a definir a força do seu anúncio na listagem. Quanto mais pontos ativos, maior a chance de aparecer melhor, conforme a concorrência da cidade.",
    icon: TrendingUp,
    tone: "neutral",
    benefits: [
      "Mínimo 10 pontos",
      "Máximo 15.000 pontos",
      "Duração de 3, 7 ou 30 dias",
      "Simulação antes da compra",
    ],
    cta: "Comprar pontos",
    exampleTitle: "Mais força na listagem",
  },
  telefone: {
    eyebrow: "Contato direto",
    headline: "Telefone e WhatsApp visíveis na listagem",
    summary: "Deixe seu contato mais acessível para facilitar conversas com clientes interessados.",
    primaryPrice: "R$ 1,99/dia",
    icon: Phone,
    tone: "neutral",
    benefits: [
      "Botão de contato direto",
      "WhatsApp mais acessível",
      "Menos etapas até a conversa",
      "Período flexível",
    ],
    cta: "Comprar telefone na listagem",
    exampleTitle: "Contato direto",
  },
  bronze: {
    eyebrow: "Plano Bronze",
    headline: "Destaque visual básico para ganhar presença",
    summary: "Adiciona pontos e uma apresentação mais chamativa para seu perfil aparecer com mais presença na listagem.",
    icon: Trophy,
    tone: "bronze",
    benefits: ["+200 pontos de listagem", "Destaque visual básico", "Mais presença", "Acabamento mais chamativo"],
    cta: "Comprar Bronze",
    exampleTitle: "Destaque Bronze",
  },
  prata: {
    eyebrow: "Plano Prata",
    headline: "Maior exposição entre anunciantes",
    summary: "Aumenta a exposição do perfil e ajuda seu anúncio a aparecer com mais força durante a navegação.",
    primaryPrice: "R$ 3,66/dia",
    icon: Star,
    tone: "silver",
    benefits: ["+500 pontos de listagem", "Maior exposição", "Mais força entre anunciantes", "Visual premium"],
    cta: "Comprar Prata",
    exampleTitle: "Exposição Prata",
  },
  ouro: {
    eyebrow: "Plano Ouro",
    headline: "Anúncio médio com informações em destaque",
    summary: "Combina pontos, informações e contato visível conforme a regra do plano para melhorar a conversão.",
    primaryPrice: "R$ 6,99/dia",
    icon: Crown,
    tone: "amber",
    benefits: ["+1.000 pontos de listagem", "Médio anúncio", "Informações em destaque", "WhatsApp visível conforme regra"],
    cta: "Comprar Ouro",
    exampleTitle: "Presença Ouro",
  },
  diamante: {
    eyebrow: "Plano Diamante",
    headline: "Grande anúncio com grade de fotos",
    summary: "Pacote de maior presença para destacar fotos, informações adicionais e contato visível conforme a regra do plano.",
    primaryPrice: "R$ 11,33/dia",
    icon: Diamond,
    tone: "diamond",
    benefits: ["+2.000 pontos de listagem", "Grande anúncio", "Grade de fotos", "Informações adicionais", "WhatsApp visível conforme regra"],
    cta: "Comprar Diamante",
    exampleTitle: "Vitrine Diamante",
  },
  "idade-oculta": {
    eyebrow: "Privacidade",
    headline: "Mais controle sobre a idade exibida",
    summary: "Sua idade não aparece publicamente no anúncio e na listagem, mantendo a privacidade com pontos extras.",
    primaryPrice: "R$ 1,99/dia",
    icon: EyeOff,
    tone: "privacy",
    benefits: ["+100 pontos de listagem", "Idade não aparece publicamente", "Mais controle de privacidade", "Recurso extra do anúncio"],
    cta: "Comprar idade oculta",
    exampleTitle: "Privacidade ativa",
  },
};

const PLAN_ORDER: ProfessionalPlanId[] = ["bronze", "prata", "ouro", "diamante"];
const FAQ = [
  {
    question: "Anunciar é gratuito?",
    answer: "O cadastro pode ser iniciado gratuitamente, mas planos e destaques são recursos opcionais para aumentar a visibilidade do perfil.",
  },
  {
    question: "Comprar plano garante ficar em primeiro?",
    answer: "Não. O plano aumenta a força e a visibilidade do anúncio, mas a posição pode variar conforme cidade, concorrência, pontos ativos e outros anúncios.",
  },
  {
    question: "Por quanto tempo meu destaque fica ativo?",
    answer: "Depende do período contratado: 1 hora, 3 dias, 7 dias, 30 dias ou assinatura mensal, conforme o produto escolhido.",
  },
  {
    question: "Posso comprar mais de um recurso?",
    answer: "Sim. Você pode combinar plano, pontos, telefone na listagem, idade oculta e destaque de topo, conforme disponibilidade.",
  },
  {
    question: "O que acontece quando o plano vence?",
    answer: "O benefício deixa de ficar ativo e o perfil volta ao funcionamento padrão, a menos que seja renovado.",
  },
  {
    question: "O pagamento é por Pix?",
    answer: "Sim. Quando o pagamento estiver disponível, o sistema gera QR Code e código copia e cola para concluir por Pix.",
  },
];

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function planById(id: ProfessionalPlanId) {
  const plan = PROFESSIONAL_PLANS.find((item) => item.id === id);
  if (!plan) throw new Error(`Plano não encontrado: ${id}`);
  return plan;
}

function selectedPrice(plan: ProfessionalPlan, selectedKey: string, pointsQuantity: number) {
  return getProfessionalPlanPrice(plan.id, selectedKey, plan.id === "pontos" ? pointsQuantity : undefined)?.price ?? plan.prices[0];
}

function selectedPoints(plan: ProfessionalPlan, pointsQuantity: number) {
  return plan.id === "pontos" ? pointsQuantity : plan.points;
}

function productTypeFor(plan: ProfessionalPlan) {
  if (plan.id === "pontos") return "points";
  if (plan.id === "one-hour-top") return "top_boost";
  if (plan.id === "telefone") return "phone_visibility";
  if (plan.id === "idade-oculta") return "privacy_addon";
  return "highlight_plan";
}

function PlanCheckout({ selection, onClose }: { selection: CheckoutSelection; onClose: () => void }) {
  const [stage, setStage] = useState<CheckoutStage>("idle");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const meta = PRODUCT_META[selection.plan.id];
  const points = selectedPoints(selection.plan, selection.pointsQuantity ?? selection.plan.points);

  async function createPix() {
    if (stage === "creating") return;
    setStage("creating");
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/professional/plans/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selection.plan.id,
          priceKey: selection.price.key,
          productId: selection.plan.id,
          productType: productTypeFor(selection.plan),
          planName: selection.plan.name,
          duration: selection.price.label,
          price: selection.price.value,
          points,
          pointsQuantity: selection.pointsQuantity,
          activationMode: "agora",
          paymentMethod: "pix",
          metadata: {
            headline: meta.headline,
            benefits: meta.benefits,
          },
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Não foi possível gerar o Pix agora. Tente novamente em instantes.");
        setStage("failed");
        return;
      }

      setPaymentId(data.localPaymentId);
      setQrCode(data.copyPaste || data.qrCode || null);
      setQrCodeBase64(data.qrCodeBase64 || null);
      setMessage(data.message || "Pix gerado. A ativação acontece após a confirmação do pagamento.");
      setStage("waiting");
    } catch (err) {
      console.error("[professional-plans-checkout]", err);
      setError("Não foi possível gerar o Pix agora. Tente novamente em instantes.");
      setStage("failed");
    }
  }

  async function verifyPayment() {
    if (!paymentId) return;
    try {
      const res = await fetch(`/api/payments/status/${paymentId}`);
      const data = await res.json().catch(() => ({}));
      if (data.status === "PAID") {
        setStage("paid");
        return;
      }
      if (data.status === "FAILED" || data.status === "REFUNDED") {
        setError("Pagamento não confirmado.");
        setStage("failed");
        return;
      }
      setMessage("Pagamento ainda pendente. Assim que confirmar, o produto será ativado.");
    } catch {
      setMessage("Não foi possível verificar agora. Tente novamente em instantes.");
    }
  }

  async function copyPix() {
    if (!qrCode) return;
    await navigator.clipboard.writeText(qrCode);
    setMessage("Código Pix copiado.");
  }

  return createPortal(
    <div className="plans-modal" role="dialog" aria-modal="true">
      <div className="plans-checkout">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <p className="eyebrow">Pagamento</p>
        <h2>{selection.plan.name}</h2>
        <p className="muted">
          {selection.price.label}
          {points > 0 ? ` · ${points.toLocaleString("pt-BR")} pontos` : ""}
        </p>

        <div className="checkout-summary">
          <span>Total</span>
          <strong>{money(selection.price.value)}</strong>
        </div>

        <ul className="checkout-benefits">
          {meta.benefits.slice(0, 4).map((benefit) => (
            <li key={benefit}><Check size={14} /> {benefit}</li>
          ))}
        </ul>

        {stage === "idle" && <button className="primary-action" type="button" onClick={createPix}>Gerar Pix</button>}
        {stage === "creating" && <p className="status-copy">Criando pedido e preparando o Pix...</p>}
        {stage === "waiting" && (
          <div className="pix-box">
            {message && <p className="status-copy">{message}</p>}
            {qrCodeBase64 && <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code Pix" />}
            {qrCode && <code>{qrCode.length > 150 ? `${qrCode.slice(0, 150)}...` : qrCode}</code>}
            <button className="primary-action" type="button" onClick={copyPix}><Copy size={17} /> Copiar código Pix</button>
            <button className="ghost-action" type="button" onClick={verifyPayment}>Já paguei / verificar</button>
          </div>
        )}
        {stage === "paid" && (
          <div className="pix-box">
            <h3>Pagamento confirmado</h3>
            <p className="status-copy">Seu produto foi ativado no perfil profissional.</p>
            <button className="primary-action" type="button" onClick={() => window.location.reload()}>Atualizar painel</button>
          </div>
        )}
        {stage === "failed" && (
          <div className="pix-box">
            <h3>Não foi possível concluir</h3>
            <p className="status-copy">{error}</p>
            <button className="primary-action" type="button" onClick={createPix}>Tentar novamente</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function ExampleModal({ plan, onClose }: { plan: ProfessionalPlan; onClose: () => void }) {
  const meta = PRODUCT_META[plan.id];
  const phoneVisible = plan.benefits.showPhone || plan.id === "telefone";
  const hasGallery = plan.id === "diamante";
  const hiddenAge = plan.id === "idade-oculta";

  return createPortal(
    <div className="plans-modal" role="dialog" aria-modal="true">
      <div className="example-modal">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <p className="eyebrow">Exemplo do anúncio</p>
        <h2>{meta.exampleTitle}</h2>
        <p className="muted">Uma simulação visual para comparar o anúncio comum com recursos de destaque ativados.</p>

        <div className="preview-grid">
          <div className="preview-card muted-preview">
            <span>Anúncio comum</span>
            <div className="preview-photo">Foto</div>
            <strong>Perfil padrão</strong>
            <p>Informações básicas e aparição normal na listagem.</p>
          </div>
          <div className="preview-card active-preview">
            <span>Com destaque</span>
            <div className="preview-photo">Elite</div>
            <strong>{plan.name}</strong>
            <p>{hiddenAge ? "Idade protegida e privacidade maior." : "Mais presença visual e melhor apresentação."}</p>
            {phoneVisible && <b className="contact-pill"><Phone size={13} /> WhatsApp visível</b>}
          </div>
          <div className="preview-card active-preview">
            <span>Mais recursos</span>
            <div className={hasGallery ? "mini-gallery" : "preview-photo"}>
              {hasGallery ? <><i /><i /><i /><i /></> : <ImageIcon size={24} />}
            </div>
            <strong>{hasGallery ? "Grade de fotos" : "Informações em destaque"}</strong>
            <p>Apresentação mais completa para clientes compararem seu perfil.</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PeriodPicker({
  plan,
  selectedKey,
  pointsQuantity,
  onChange,
}: {
  plan: ProfessionalPlan;
  selectedKey: string;
  pointsQuantity: number;
  onChange: (key: string) => void;
}) {
  return (
    <div className="period-box">
      <label htmlFor={`${plan.id}-periodo`}>Período</label>
      <select id={`${plan.id}-periodo`} value={selectedKey} onChange={(event) => onChange(event.target.value)}>
        {plan.prices.map((price) => {
          const calculated = selectedPrice(plan, price.key, pointsQuantity);
          return (
            <option key={price.key} value={price.key}>
              {price.label} · {price.dailyLabel ?? money(calculated.value)}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function ProductCard({
  plan,
  selectedKey,
  pointsQuantity,
  onPeriodChange,
  onCheckout,
  onExample,
}: {
  plan: ProfessionalPlan;
  selectedKey: string;
  pointsQuantity: number;
  onPeriodChange: (key: string) => void;
  onCheckout: (selection: CheckoutSelection) => void;
  onExample: (plan: ProfessionalPlan) => void;
}) {
  const meta = PRODUCT_META[plan.id];
  const Icon = meta.icon;
  const price = selectedPrice(plan, selectedKey, pointsQuantity);
  const points = selectedPoints(plan, pointsQuantity);
  const isTop = plan.id === "one-hour-top";

  return (
    <article className={`product-card tone-${meta.tone} ${isTop ? "hero-product" : ""}`}>
      <div className="product-topline">
        <span>{meta.eyebrow}</span>
        {meta.badge && <b>{meta.badge}</b>}
      </div>
      <div className="product-heading">
        <span className="product-icon"><Icon size={22} /></span>
        <div>
          <h2>{plan.name}</h2>
          <p>{meta.headline}</p>
        </div>
      </div>
      <p className="summary">{meta.summary}</p>
      {points > 0 && <strong className="points-pill">+{points.toLocaleString("pt-BR")} pontos de listagem</strong>}

      <ul className="benefit-grid">
        {meta.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
      </ul>

      <div className="price-row">
        <span>{meta.primaryPrice ?? money(price.value)}</span>
        <small>{meta.primaryPrice ? `${price.label}: ${money(price.value)}` : isTop ? "por 1 hora" : price.label}</small>
      </div>

      {plan.prices.length > 1 && (
        <PeriodPicker plan={plan} selectedKey={selectedKey} pointsQuantity={pointsQuantity} onChange={onPeriodChange} />
      )}

      <div className="card-actions">
        <button className="ghost-action" type="button" onClick={() => onExample(plan)}>Ver exemplo do anúncio</button>
        <button className="primary-action" type="button" onClick={() => onCheckout({ plan, price })}>
          {meta.cta}
        </button>
      </div>
    </article>
  );
}

function PointsSection({
  plan,
  selectedKey,
  pointsQuantity,
  onPeriodChange,
  onPointsChange,
  onCheckout,
  onExample,
}: {
  plan: ProfessionalPlan;
  selectedKey: string;
  pointsQuantity: number;
  onPeriodChange: (key: string) => void;
  onPointsChange: (value: number) => void;
  onCheckout: (selection: CheckoutSelection) => void;
  onExample: (plan: ProfessionalPlan) => void;
}) {
  const [simulated, setSimulated] = useState(false);
  const meta = PRODUCT_META.pontos;
  const price = selectedPrice(plan, selectedKey, pointsQuantity);

  return (
    <section className="sales-section points-section" aria-labelledby="points-title">
      <div className="section-copy">
        <p className="eyebrow">Pontos</p>
        <h2 id="points-title">Entenda e ajuste sua força na listagem</h2>
        <p>
          Os pontos ajudam a definir a força do seu anúncio na listagem. Quanto mais pontos ativos, maior a chance de aparecer em posições melhores, conforme a concorrência da sua cidade.
        </p>
      </div>
      <div className="points-panel">
        <div className="points-control">
          <button type="button" onClick={() => onPointsChange(pointsQuantity - 10)} aria-label="Diminuir pontos"><Minus size={18} /></button>
          <input
            type="number"
            min={POINTS_MIN}
            max={POINTS_MAX}
            value={pointsQuantity}
            onChange={(event) => onPointsChange(Number(event.target.value))}
          />
          <button type="button" onClick={() => onPointsChange(pointsQuantity + 10)} aria-label="Aumentar pontos"><Plus size={18} /></button>
          <small>Mínimo {POINTS_MIN} pontos · Máximo {POINTS_MAX.toLocaleString("pt-BR")} pontos</small>
        </div>
        <PeriodPicker plan={plan} selectedKey={selectedKey} pointsQuantity={pointsQuantity} onChange={onPeriodChange} />
        <div className="price-row compact-price">
          <span>{money(price.value)}</span>
          <small>{pointsQuantity.toLocaleString("pt-BR")} pontos por {price.label.toLowerCase()}</small>
        </div>
        <p className="quiet-note">A posição pode variar conforme novos anúncios, compras de planos e expiração de pontos na cidade.</p>
        {simulated && (
          <div className="simulation-box">
            <strong>Simulação do anúncio</strong>
            <span>{pointsQuantity.toLocaleString("pt-BR")} pontos ativos por {price.label.toLowerCase()} aumentam a força do perfil na listagem.</span>
          </div>
        )}
        <div className="card-actions">
          <button className="ghost-action" type="button" onClick={() => setSimulated((value) => !value)}>Simular meu anúncio</button>
          <button className="ghost-action" type="button" onClick={() => onExample(plan)}>Ver exemplo</button>
          <button className="primary-action" type="button" onClick={() => onCheckout({ plan, price, pointsQuantity })}>{meta.cta}</button>
        </div>
      </div>
    </section>
  );
}

export default function PlanosPage() {
  const [selectedPeriods, setSelectedPeriods] = useState<Record<string, string>>({});
  const [pointsQuantity, setPointsQuantity] = useState(POINTS_MIN);
  const [checkout, setCheckout] = useState<CheckoutSelection | null>(null);
  const [examplePlan, setExamplePlan] = useState<ProfessionalPlan | null>(null);

  const plans = useMemo(() => ({
    top: planById("one-hour-top"),
    points: planById("pontos"),
    phone: planById("telefone"),
    hiddenAge: planById("idade-oculta"),
    highlights: PLAN_ORDER.map(planById),
  }), []);

  function selectedKeyFor(plan: ProfessionalPlan) {
    if (selectedPeriods[plan.id]) return selectedPeriods[plan.id];
    if (plan.id === "pontos") return "30d";
    if (plan.id === "one-hour-top") return "hora";
    if (plan.prices.some((price) => price.key === "30d")) return "30d";
    return plan.prices[0].key;
  }

  function setPeriod(planId: string, key: string) {
    setSelectedPeriods((current) => ({ ...current, [planId]: key }));
  }

  function setPoints(value: number) {
    setPointsQuantity(normalizePointsQuantity(value));
  }

  return (
    <main className="plans-page">
      {checkout && <PlanCheckout selection={checkout} onClose={() => setCheckout(null)} />}
      {examplePlan && <ExampleModal plan={examplePlan} onClose={() => setExamplePlan(null)} />}

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Elite Modell Premium</p>
          <h1>Impulsione seu perfil e apareça mais</h1>
          <p>Escolha planos, destaques e recursos extras para aumentar sua visibilidade na Elite Modell.</p>
        </div>
        <div className="hero-summary" aria-label="Resumo de vantagens">
          {[
            { label: "Mais visibilidade", icon: TrendingUp },
            { label: "Mais contatos", icon: MessageCircle },
            { label: "Mais destaque na listagem", icon: Sparkles },
            { label: "Mais controle do anúncio", icon: ShieldCheck },
          ].map(({ label, icon: SummaryIcon }) => {
            return (
              <div key={label}>
                <SummaryIcon size={18} />
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="opportunity-band" aria-label="Oportunidade">
        <span><Sparkles size={16} /> Oportunidade</span>
        <p>Perfis com destaque aparecem com mais força na listagem e tendem a receber mais visitas. Quanto melhor sua posição, maiores as chances de receber contatos.</p>
        <b>Vence em 3 dias</b>
      </section>

      <section className="first-product" aria-label="Produto principal">
        <ProductCard
          plan={plans.top}
          selectedKey={selectedKeyFor(plans.top)}
          pointsQuantity={pointsQuantity}
          onPeriodChange={(key) => setPeriod(plans.top.id, key)}
          onCheckout={setCheckout}
          onExample={setExamplePlan}
        />
      </section>

      <PointsSection
        plan={plans.points}
        selectedKey={selectedKeyFor(plans.points)}
        pointsQuantity={pointsQuantity}
        onPeriodChange={(key) => setPeriod(plans.points.id, key)}
        onPointsChange={setPoints}
        onCheckout={setCheckout}
        onExample={setExamplePlan}
      />

      <section className="sales-section single-product" aria-labelledby="phone-title">
        <div className="section-copy">
          <p className="eyebrow">Telefone na listagem</p>
          <h2 id="phone-title">Facilite conversas com clientes interessados</h2>
          <p>Deixe seu contato mais acessível para reduzir etapas e aumentar as chances de conversa direta.</p>
        </div>
        <ProductCard
          plan={plans.phone}
          selectedKey={selectedKeyFor(plans.phone)}
          pointsQuantity={pointsQuantity}
          onPeriodChange={(key) => setPeriod(plans.phone.id, key)}
          onCheckout={setCheckout}
          onExample={setExamplePlan}
        />
      </section>

      <section className="sales-section" aria-labelledby="highlight-title">
        <div className="section-copy wide-copy">
          <p className="eyebrow">Planos de destaque</p>
          <h2 id="highlight-title">Escolha o nível de presença do seu anúncio</h2>
          <p>Os planos aumentam a força do seu anúncio e adicionam recursos visuais para destacar seu perfil na listagem.</p>
        </div>
        <div className="highlight-grid">
          {plans.highlights.map((plan) => (
            <ProductCard
              key={plan.id}
              plan={plan}
              selectedKey={selectedKeyFor(plan)}
              pointsQuantity={pointsQuantity}
              onPeriodChange={(key) => setPeriod(plan.id, key)}
              onCheckout={setCheckout}
              onExample={setExamplePlan}
            />
          ))}
        </div>
      </section>

      <section className="sales-section single-product" aria-labelledby="privacy-title">
        <div className="section-copy">
          <p className="eyebrow">Produto extra</p>
          <h2 id="privacy-title">Controle como sua idade aparece</h2>
          <p>Use o recurso de privacidade para ocultar a idade publicamente no anúncio e na listagem.</p>
        </div>
        <ProductCard
          plan={plans.hiddenAge}
          selectedKey={selectedKeyFor(plans.hiddenAge)}
          pointsQuantity={pointsQuantity}
          onPeriodChange={(key) => setPeriod(plans.hiddenAge.id, key)}
          onCheckout={setCheckout}
          onExample={setExamplePlan}
        />
      </section>

      <section className="info-grid" aria-label="Informações sobre planos">
        <article>
          <TrendingUp size={24} />
          <h2>Como funciona a ordenação na listagem?</h2>
          <p>A posição dos anúncios é calculada com base em fatores como pontos ativos, plano contratado, destaque, atividade do perfil e concorrência da cidade. A posição pode mudar ao longo do tempo conforme novos anúncios compram planos ou pontos expiram.</p>
        </article>
        <article>
          <BadgeCheck size={24} />
          <h2>O que são planos e para que servem?</h2>
          <p>Os planos são formas de aumentar a visibilidade do perfil dentro da Elite Modell. Eles adicionam pontos, recursos visuais e vantagens que ajudam seu anúncio a se destacar na listagem.</p>
        </article>
      </section>

      <section className="advantages-section" aria-labelledby="advantages-title">
        <p className="eyebrow">Mais vantagens</p>
        <h2 id="advantages-title">Recursos que fortalecem sua apresentação</h2>
        <div className="advantages-grid">
          {[
            { label: "Prioridade no atendimento", icon: Clock },
            { label: "Mais destaque na listagem", icon: Sparkles },
            { label: "Mais chances de contato", icon: MessageCircle },
            { label: "Perfil com aparência mais completa", icon: ImageIcon },
            { label: "Recursos extras de anúncio", icon: Trophy },
            { label: "Controle de visibilidade", icon: ShieldCheck },
            { label: "Melhor apresentação para clientes", icon: ArrowUpRight },
          ].map(({ label, icon: AdvantageIcon }) => {
            return (
              <div key={label}>
                <AdvantageIcon size={19} />
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="faq-section" aria-labelledby="faq-title">
        <p className="eyebrow">Dúvidas frequentes</p>
        <h2 id="faq-title">Ainda tem dúvidas?</h2>
        <div className="faq-list">
          {FAQ.map((item, index) => (
            <details key={item.question} open={index === 0}>
              <summary><HelpCircle size={18} /> {item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <style>{`
        .plans-page {
          width: min(100%, 1120px);
          margin: 0 auto;
          padding: 8px 0 40px;
          color: #f8fafc;
        }
        .eyebrow {
          margin: 0 0 8px;
          color: ${GOLD};
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .hero-section {
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(280px, 0.92fr);
          gap: 22px;
          align-items: stretch;
          margin-bottom: 16px;
        }
        .hero-copy {
          min-height: 286px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border: 1px solid rgba(212,168,67,0.28);
          border-radius: 8px;
          background: linear-gradient(145deg, rgba(24,22,18,0.98), rgba(7,7,8,0.98));
          padding: 30px;
        }
        .hero-copy h1 {
          margin: 0;
          max-width: 680px;
          color: #fff;
          font-size: 44px;
          line-height: 1.02;
          font-weight: 950;
          letter-spacing: 0;
        }
        .hero-copy p:last-child {
          max-width: 620px;
          margin: 14px 0 0;
          color: #aeb6c2;
          font-size: 16px;
          line-height: 1.6;
        }
        .hero-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .hero-summary div,
        .advantages-grid div {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 92px;
          border: 1px solid rgba(212,168,67,0.18);
          border-radius: 8px;
          background: rgba(255,255,255,0.035);
          padding: 16px;
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 850;
          line-height: 1.25;
        }
        .hero-summary svg,
        .advantages-grid svg,
        .info-grid svg {
          color: #f5d78c;
          flex: 0 0 auto;
        }
        .opportunity-band {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          margin: 0 0 16px;
          border: 1px solid rgba(245,215,140,0.30);
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(212,168,67,0.16), rgba(255,255,255,0.035));
          padding: 15px 16px;
        }
        .opportunity-band span,
        .opportunity-band b {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid rgba(245,215,140,0.32);
          border-radius: 999px;
          background: rgba(0,0,0,0.22);
          color: #f5d78c;
          padding: 8px 11px;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }
        .opportunity-band p {
          margin: 0;
          color: #d7dde6;
          font-size: 13px;
          line-height: 1.5;
        }
        .first-product,
        .sales-section,
        .info-grid,
        .advantages-section,
        .faq-section {
          margin-top: 18px;
        }
        .sales-section {
          display: grid;
          grid-template-columns: minmax(230px, 0.42fr) minmax(0, 0.58fr);
          gap: 16px;
          align-items: start;
        }
        .sales-section.points-section {
          grid-template-columns: minmax(240px, 0.42fr) minmax(0, 0.58fr);
        }
        .single-product {
          grid-template-columns: minmax(230px, 0.34fr) minmax(0, 0.66fr);
        }
        .section-copy {
          position: sticky;
          top: 16px;
          border: 1px solid rgba(212,168,67,0.16);
          border-radius: 8px;
          background: rgba(255,255,255,0.035);
          padding: 20px;
        }
        .section-copy.wide-copy {
          position: static;
          grid-column: 1 / -1;
        }
        .section-copy h2,
        .advantages-section h2,
        .faq-section h2,
        .info-grid h2 {
          margin: 0;
          color: #fff;
          font-size: 25px;
          line-height: 1.12;
          font-weight: 950;
          letter-spacing: 0;
        }
        .section-copy p:not(.eyebrow),
        .info-grid p {
          margin: 12px 0 0;
          color: #aeb6c2;
          font-size: 14px;
          line-height: 1.65;
        }
        .highlight-grid {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .product-card,
        .points-panel {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(212,168,67,0.22);
          border-radius: 8px;
          background: linear-gradient(145deg, rgba(22,22,22,0.98), rgba(7,7,8,0.98));
          padding: 18px;
          box-shadow: 0 18px 60px rgba(0,0,0,0.32);
        }
        .product-card::before,
        .points-panel::before {
          content: "";
          position: absolute;
          inset: 0 0 auto;
          height: 3px;
          background: linear-gradient(90deg, transparent, rgba(212,168,67,0.72), transparent);
        }
        .hero-product {
          background: linear-gradient(135deg, rgba(38,32,18,0.98), rgba(7,7,8,0.98) 56%);
          border-color: rgba(245,215,140,0.50);
        }
        .tone-bronze::before { background: linear-gradient(90deg, transparent, #b87945, transparent); }
        .tone-silver::before { background: linear-gradient(90deg, transparent, #cbd5e1, transparent); }
        .tone-amber::before { background: linear-gradient(90deg, transparent, #fbbf24, transparent); }
        .tone-diamond::before { background: linear-gradient(90deg, transparent, #93c5fd, transparent); }
        .tone-privacy::before { background: linear-gradient(90deg, transparent, #c4b5fd, transparent); }
        .product-topline,
        .product-heading,
        .price-row,
        .card-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .product-topline span {
          color: ${GOLD};
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .product-topline b,
        .points-pill {
          width: fit-content;
          border-radius: 999px;
          border: 1px solid rgba(245,215,140,0.35);
          background: rgba(212,168,67,0.14);
          color: #f5d78c;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }
        .product-heading {
          justify-content: flex-start;
          align-items: flex-start;
          margin-top: 15px;
        }
        .product-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(212,168,67,0.24);
          border-radius: 8px;
          background: rgba(212,168,67,0.10);
          color: #f5d78c;
          flex: 0 0 auto;
        }
        .product-heading h2 {
          margin: 0;
          color: #fff;
          font-size: 28px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: 0;
        }
        .product-heading p {
          margin: 7px 0 0;
          color: #e2e8f0;
          font-size: 15px;
          line-height: 1.35;
          font-weight: 750;
        }
        .summary {
          margin: 14px 0 0;
          color: #aeb6c2;
          font-size: 14px;
          line-height: 1.58;
        }
        .points-pill {
          display: block;
          margin-top: 14px;
        }
        .benefit-grid,
        .checkout-benefits {
          list-style: none;
          margin: 16px 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }
        .benefit-grid li,
        .checkout-benefits li {
          min-height: 42px;
          border: 1px solid rgba(212,168,67,0.14);
          border-radius: 8px;
          background: rgba(255,255,255,0.035);
          color: #d7dde6;
          padding: 10px;
          font-size: 12px;
          line-height: 1.35;
        }
        .checkout-benefits li {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .benefit-grid li::before {
          content: "✓";
          color: #f5d78c;
          margin-right: 6px;
          font-weight: 950;
        }
        .points-control {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr) 48px;
          gap: 8px;
          align-items: center;
        }
        .points-control button {
          height: 50px;
          border: 1px solid rgba(212,168,67,0.28);
          border-radius: 8px;
          background: rgba(212,168,67,0.10);
          color: #f5d78c;
          font-weight: 950;
          cursor: pointer;
        }
        .points-control input {
          height: 50px;
          min-width: 0;
          border: 1px solid rgba(212,168,67,0.28);
          border-radius: 8px;
          background: #080808;
          color: #fff;
          text-align: center;
          font-size: 18px;
          font-weight: 950;
          outline: none;
        }
        .points-control small {
          grid-column: 1 / -1;
          color: #8e98a7;
          font-size: 12px;
          text-align: center;
        }
        .price-row {
          align-items: flex-end;
          margin: 18px 0 13px;
          padding-top: 16px;
          border-top: 1px solid rgba(212,168,67,0.14);
        }
        .compact-price {
          margin-top: 12px;
        }
        .price-row span {
          color: #f5d78c;
          font-size: 34px;
          line-height: 0.95;
          font-weight: 950;
        }
        .price-row small {
          color: #aeb6c2;
          font-size: 12px;
          text-align: right;
        }
        .period-box {
          display: grid;
          gap: 8px;
          margin-bottom: 13px;
        }
        .period-box label {
          color: ${GOLD};
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .period-box select {
          width: 100%;
          min-height: 50px;
          border: 1px solid rgba(212,168,67,0.28);
          border-radius: 8px;
          background: #080808;
          color: #fff;
          padding: 0 14px;
          font-size: 14px;
          font-weight: 850;
          outline: none;
        }
        .quiet-note {
          margin: 10px 0 12px;
          color: #8e98a7;
          font-size: 12px;
          line-height: 1.55;
        }
        .simulation-box {
          display: grid;
          gap: 4px;
          margin-bottom: 12px;
          border: 1px solid rgba(245,215,140,0.28);
          border-radius: 8px;
          background: rgba(212,168,67,0.10);
          padding: 12px;
          color: #f8fafc;
          font-size: 13px;
        }
        .simulation-box span {
          color: #cbd5e1;
        }
        .card-actions {
          align-items: stretch;
        }
        .primary-action,
        .ghost-action {
          min-height: 52px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 950;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .primary-action {
          flex: 1;
          border: 0;
          background: linear-gradient(135deg, #f5d78c, ${GOLD} 48%, #a77818);
          color: #080704;
          box-shadow: 0 18px 44px rgba(212,168,67,0.20);
        }
        .ghost-action {
          border: 1px solid rgba(212,168,67,0.28);
          background: rgba(255,255,255,0.035);
          color: #f5d78c;
          padding: 0 16px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .info-grid article,
        .advantages-section,
        .faq-section {
          border: 1px solid rgba(212,168,67,0.18);
          border-radius: 8px;
          background: rgba(255,255,255,0.035);
          padding: 22px;
        }
        .advantages-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }
        .faq-list {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }
        .faq-list details {
          border: 1px solid rgba(212,168,67,0.16);
          border-radius: 8px;
          background: rgba(0,0,0,0.24);
          padding: 14px;
        }
        .faq-list summary {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }
        .faq-list p {
          margin: 10px 0 0;
          color: #aeb6c2;
          font-size: 13px;
          line-height: 1.6;
        }
        .plans-modal {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          display: grid;
          place-items: center;
          padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
          background: rgba(0,0,0,0.84);
        }
        .plans-checkout,
        .example-modal {
          position: relative;
          width: min(100%, 500px);
          max-height: min(90dvh, 760px);
          overflow-y: auto;
          border: 1px solid rgba(212,168,67,0.35);
          border-radius: 8px;
          background: #090909;
          padding: 22px;
          box-shadow: 0 24px 90px rgba(0,0,0,0.72);
        }
        .example-modal {
          width: min(100%, 760px);
        }
        .modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 36px;
          height: 36px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          background: rgba(255,255,255,0.05);
          color: #fff;
          display: grid;
          place-items: center;
          cursor: pointer;
        }
        .plans-checkout h2,
        .plans-checkout h3,
        .example-modal h2 {
          margin: 0 44px 6px 0;
          color: #fff;
          font-size: 24px;
          line-height: 1.12;
        }
        .muted,
        .status-copy {
          color: #aeb6c2;
          font-size: 13px;
          line-height: 1.6;
        }
        .checkout-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 18px 0;
          border: 1px solid rgba(212,168,67,0.18);
          border-radius: 8px;
          background: rgba(255,255,255,0.035);
          padding: 14px;
          color: #aeb6c2;
        }
        .checkout-summary strong {
          color: #f5d78c;
          font-size: 22px;
        }
        .pix-box {
          display: grid;
          gap: 12px;
          text-align: center;
        }
        .pix-box img {
          width: 190px;
          height: 190px;
          margin: 0 auto;
          border-radius: 8px;
          background: #fff;
          padding: 10px;
        }
        .pix-box code {
          display: block;
          max-height: 86px;
          overflow: hidden;
          word-break: break-all;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 8px;
          background: #050505;
          color: #aeb6c2;
          padding: 10px;
          text-align: left;
          font-size: 11px;
        }
        .preview-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }
        .preview-card {
          min-height: 248px;
          border: 1px solid rgba(212,168,67,0.16);
          border-radius: 8px;
          background: rgba(255,255,255,0.035);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .preview-card span {
          color: #f5d78c;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .preview-photo,
        .mini-gallery {
          min-height: 104px;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(212,168,67,0.18), rgba(255,255,255,0.05));
          display: grid;
          place-items: center;
          color: #f5d78c;
          font-weight: 950;
        }
        .mini-gallery {
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          padding: 8px;
        }
        .mini-gallery i {
          min-height: 42px;
          border-radius: 6px;
          background: rgba(245,215,140,0.18);
        }
        .preview-card strong {
          color: #fff;
          font-size: 16px;
        }
        .preview-card p {
          margin: 0;
          color: #aeb6c2;
          font-size: 13px;
          line-height: 1.45;
        }
        .active-preview {
          border-color: rgba(245,215,140,0.38);
          box-shadow: inset 0 0 0 1px rgba(245,215,140,0.08);
        }
        .contact-pill {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          background: rgba(34,197,94,0.12);
          color: #86efac;
          padding: 7px 10px;
          font-size: 12px;
        }
        @media (max-width: 900px) {
          .hero-section,
          .sales-section,
          .sales-section.points-section,
          .single-product,
          .info-grid {
            grid-template-columns: 1fr;
          }
          .section-copy {
            position: static;
          }
          .advantages-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 620px) {
          .plans-page {
            padding-bottom: 28px;
          }
          .hero-copy {
            min-height: auto;
            padding: 22px;
          }
          .hero-copy h1 {
            font-size: 31px;
          }
          .hero-summary,
          .highlight-grid,
          .preview-grid {
            grid-template-columns: 1fr;
          }
          .opportunity-band {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .opportunity-band b {
            width: fit-content;
          }
          .product-card,
          .points-panel,
          .section-copy,
          .info-grid article,
          .advantages-section,
          .faq-section {
            padding: 16px;
          }
          .product-heading {
            display: grid;
            grid-template-columns: 46px minmax(0, 1fr);
          }
          .product-heading h2 {
            font-size: 24px;
          }
          .price-row,
          .card-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .price-row small {
            text-align: left;
          }
          .benefit-grid,
          .checkout-benefits,
          .advantages-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
