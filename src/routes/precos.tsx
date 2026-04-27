import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, ArrowRight, TreePine, Mail, Zap, Building2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Planos e Preços — GeoTerra" },
      { name: "description", content: "Planos do GeoTerra: Starter, Profissional e Enterprise. Cobrança mensal ou anual com desconto." },
      { property: "og:title", content: "Planos e Preços — GeoTerra" },
      { property: "og:description", content: "Escolha o plano ideal para seu escritório técnico ou consultoria agroambiental." },
    ],
  }),
  component: PricingPage,
});

type Cycle = "mensal" | "anual";

interface Plan {
  key: string;
  name: string;
  Icon: React.ElementType;
  tagline: string;
  monthly: number; // in BRL
  annual: number; // monthly equivalent when paying annually
  highlight?: boolean;
  ctaLabel: string;
  ctaTo?: "/signup" | "/login";
  ctaHref?: string;
  features: string[];
  limits: { label: string; value: string }[];
}

const PLANS: Plan[] = [
  {
    key: "starter",
    name: "Starter",
    Icon: Zap,
    tagline: "Para profissionais autônomos e pequenas equipes começando.",
    monthly: 149,
    annual: 119,
    ctaLabel: "Começar agora",
    ctaTo: "/signup",
    limits: [
      { label: "Imóveis cadastrados", value: "Até 25" },
      { label: "Usuários", value: "1" },
      { label: "Licenças ambientais", value: "Até 50" },
    ],
    features: [
      "Cadastro de imóveis e clientes",
      "Diagnóstico automático básico",
      "Controle de licenças com alertas",
      "Relatórios PDF padrão",
      "Histórico de consultas",
    ],
  },
  {
    key: "profissional",
    name: "Profissional",
    Icon: Rocket,
    tagline: "Para escritórios técnicos e consultorias em crescimento.",
    monthly: 449,
    annual: 359,
    highlight: true,
    ctaLabel: "Assinar Profissional",
    ctaTo: "/signup",
    limits: [
      { label: "Imóveis cadastrados", value: "Até 250" },
      { label: "Usuários", value: "Até 8" },
      { label: "Licenças ambientais", value: "Ilimitadas" },
    ],
    features: [
      "Tudo do Starter",
      "Regras de diagnóstico personalizáveis",
      "Múltiplos perfis (admin/técnico/financeiro)",
      "Sincronização simulada CAR/SIGEF/MapBiomas",
      "Central de alertas unificada",
      "Anexos seguros em licenças",
      "Suporte prioritário por e-mail",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    Icon: Building2,
    tagline: "Para operações de larga escala e integrações sob medida.",
    monthly: 0,
    annual: 0,
    ctaLabel: "Falar com vendas",
    ctaHref: "mailto:contato@geoterra.app?subject=Interesse%20no%20plano%20Enterprise%20GeoTerra",
    limits: [
      { label: "Imóveis cadastrados", value: "Ilimitados" },
      { label: "Usuários", value: "Ilimitados" },
      { label: "Licenças ambientais", value: "Ilimitadas" },
    ],
    features: [
      "Tudo do Profissional",
      "Integrações reais com CAR, SIGEF, IBAMA",
      "SSO / SAML",
      "SLA dedicado e onboarding assistido",
      "Multi-organização e hierarquia",
      "API e webhooks",
      "Gerente de conta dedicado",
    ],
  },
];

function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>("anual");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Decorative bg */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[480px] w-[480px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-1/2 -right-40 h-[480px] w-[480px] rounded-full bg-success/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <Header />

      <section className="px-6 pt-20 pb-12 text-center md:pt-28">
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> Planos & Preços
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Escolha o plano ideal para
            <br />
            <span className="bg-gradient-to-br from-primary via-primary to-success bg-clip-text text-transparent">
              sua operação rural
            </span>
          </h1>
          <p className="mt-5 text-base text-muted-foreground md:text-lg">
            Comece pequeno e cresça com a sua equipe. Cancele quando quiser.
          </p>

          {/* Cycle toggle */}
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 p-1 backdrop-blur">
            <CycleButton active={cycle === "mensal"} onClick={() => setCycle("mensal")}>
              Mensal
            </CycleButton>
            <CycleButton active={cycle === "anual"} onClick={() => setCycle("anual")}>
              Anual
              <span className="ml-1.5 rounded-full bg-success/20 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                -20%
              </span>
            </CycleButton>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <PlanCard key={p.key} plan={p} cycle={cycle} />
          ))}
        </div>
      </section>

      <FAQSection />

      <BottomCTA />

      <Footer />
    </div>
  );
}

function CycleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-5 py-1.5 text-sm font-medium transition",
        active ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function PlanCard({ plan, cycle }: { plan: Plan; cycle: Cycle }) {
  const isEnterprise = plan.monthly === 0 && plan.annual === 0;
  const price = cycle === "mensal" ? plan.monthly : plan.annual;
  const Icon = plan.Icon;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-7 transition",
        plan.highlight
          ? "border-primary/50 bg-gradient-to-b from-primary/10 to-card shadow-2xl shadow-primary/10"
          : "border-border bg-card/60 hover:border-primary/30"
      )}
    >
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-glow">
          Mais popular
        </span>
      )}

      <div className="flex items-center gap-3">
        <div
          className={cn(
            "grid h-11 w-11 place-items-center rounded-lg",
            plan.highlight ? "bg-gradient-primary shadow-glow text-primary-foreground" : "bg-primary/15 text-primary"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold">{plan.name}</h3>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{plan.tagline}</p>

      {/* Price */}
      <div className="mt-6 min-h-[72px]">
        {isEnterprise ? (
          <div>
            <div className="text-3xl font-bold tracking-tight">Sob consulta</div>
            <div className="mt-1 text-xs text-muted-foreground">Personalizado para sua operação</div>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-medium text-muted-foreground">R$</span>
              <span className="text-4xl font-bold tracking-tight">{price}</span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {cycle === "anual" ? `Cobrado anualmente — R$ ${price * 12}/ano` : "Cobrado mensalmente"}
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      {plan.ctaTo ? (
        <Link
          to={plan.ctaTo}
          className={cn(
            "mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition",
            plan.highlight
              ? "bg-primary text-primary-foreground shadow-glow hover:opacity-90"
              : "border border-border bg-card hover:border-primary/50 hover:text-primary"
          )}
        >
          {plan.ctaLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <a
          href={plan.ctaHref}
          className={cn(
            "mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition",
            plan.highlight
              ? "bg-primary text-primary-foreground shadow-glow hover:opacity-90"
              : "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          <Mail className="h-4 w-4" /> {plan.ctaLabel}
        </a>
      )}

      {/* Limits */}
      <div className="mt-6 grid gap-2 rounded-lg border border-border/60 bg-background/40 p-4 text-xs">
        {plan.limits.map((l) => (
          <div key={l.label} className="flex justify-between">
            <span className="text-muted-foreground">{l.label}</span>
            <span className="font-medium">{l.value}</span>
          </div>
        ))}
      </div>

      {/* Features */}
      <ul className="mt-6 space-y-2.5 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check className={cn("mt-0.5 h-4 w-4 shrink-0", plan.highlight ? "text-primary" : "text-success")} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: "Posso trocar de plano depois?",
      a: "Sim. Você pode fazer upgrade ou downgrade a qualquer momento. Mudanças entram em vigor no próximo ciclo.",
    },
    {
      q: "Existe período de teste?",
      a: "Você pode criar uma conta gratuita e explorar a plataforma com dados de demonstração antes de assinar.",
    },
    {
      q: "Como funciona o desconto anual?",
      a: "Pagando anualmente você economiza 20% em relação à cobrança mensal, com a mesma flexibilidade.",
    },
    {
      q: "Quais formas de pagamento?",
      a: "Cartão de crédito, boleto e PIX para planos anuais. Enterprise pode ser faturado mediante contrato.",
    },
    {
      q: "Os dados ficam isolados entre organizações?",
      a: "Sim. Toda a plataforma usa Row-Level Security por organização — seus dados nunca são vistos por terceiros.",
    },
    {
      q: "Posso cancelar a qualquer momento?",
      a: "Sim, sem multa. O acesso permanece até o fim do ciclo já pago.",
    },
  ];
  return (
    <section className="border-t border-border/60 bg-card/20 px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Perguntas frequentes</h2>
          <p className="mt-3 text-muted-foreground">Tudo o que você precisa saber antes de começar.</p>
        </div>
        <div className="mt-10 grid gap-3 md:grid-cols-2">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-xl border border-border bg-card/60 p-5">
              <div className="text-sm font-semibold">{f.q}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-success/10 p-10 text-center md:p-14">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-success/20 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Ainda em dúvida?</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Agende uma demonstração com nosso time técnico e veja o GeoTerra em ação.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90"
              >
                Criar conta <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:contato@geoterra.app?subject=Solicita%C3%A7%C3%A3o%20de%20demonstra%C3%A7%C3%A3o%20GeoTerra"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-6 text-sm font-semibold text-primary hover:bg-primary/20"
              >
                <Mail className="h-4 w-4" /> Solicitar demonstração
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/landing" className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary shadow-glow">
            <TreePine className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">GeoTerra</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Land Intelligence</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-7 text-sm md:flex">
          <Link to="/landing" hash="recursos" className="text-muted-foreground transition hover:text-foreground">Recursos</Link>
          <Link to="/precos" className="text-foreground transition" activeProps={{ className: "text-foreground" }}>Preços</Link>
          <Link to="/landing" hash="contato" className="text-muted-foreground transition hover:text-foreground">Contato</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden h-9 items-center rounded-md border border-border bg-card/60 px-4 text-sm font-medium hover:border-primary/50 hover:text-primary sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90"
          >
            Criar conta <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <TreePine className="h-4 w-4 text-primary" />
          <span>© {new Date().getFullYear()} GeoTerra — Inteligência Territorial.</span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/landing" className="hover:text-foreground">Início</Link>
          <Link to="/precos" className="hover:text-foreground">Preços</Link>
          <Link to="/login" className="hover:text-foreground">Entrar</Link>
          <Link to="/signup" className="hover:text-foreground">Criar conta</Link>
        </div>
      </div>
    </footer>
  );
}
