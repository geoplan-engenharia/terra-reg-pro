import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  Map as MapIcon,
  ShieldCheck,
  FileText,
  Bell,
  Database,
  Leaf,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Layers,
  TreePine,
  Satellite,
  Mail,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "GeoTerra — Inteligência territorial para imóveis rurais" },
      { name: "description", content: "Plataforma SaaS para regularização fundiária, análise ambiental, controle de licenças e monitoramento contínuo de imóveis rurais." },
      { property: "og:title", content: "GeoTerra — Inteligência territorial para imóveis rurais" },
      { property: "og:description", content: "Consulta, diagnóstico, licenças e monitoramento em um só lugar." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Decorative background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-success/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-info/10 blur-3xl" />
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

      <Hero />

      <TrustStrip />

      <Features />

      <HowItWorks />

      <CTA />

      <Footer />
    </div>
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
          <a href="#recursos" className="text-muted-foreground transition hover:text-foreground">Recursos</a>
          <a href="#como-funciona" className="text-muted-foreground transition hover:text-foreground">Como funciona</a>
          <a href="#contato" className="text-muted-foreground transition hover:text-foreground">Contato</a>
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

function Hero() {
  return (
    <section className="relative px-6 pt-20 pb-24 md:pt-28 md:pb-32">
      <div className="mx-auto max-w-5xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" /> Plataforma SaaS para regularização rural
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
          Inteligência territorial para
          <br />
          <span className="bg-gradient-to-br from-primary via-primary to-success bg-clip-text text-transparent">
            regularização de imóveis rurais
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Consulte, diagnostique e monitore propriedades rurais em uma única plataforma.
          Conecte CAR, SIGEF, MapBiomas, DETER e IBAMA com fluxos automatizados de
          análise técnica e licenciamento ambiental.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/signup"
           
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 sm:w-auto"
          >
            Criar conta gratuita <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-card/60 px-6 text-sm font-semibold transition hover:border-primary/50 hover:text-primary sm:w-auto"
          >
            Entrar
          </Link>
          <a
            href="#contato"
            className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md border border-transparent px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:w-auto"
          >
            Solicitar demonstração <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Mock dashboard card */}
        <div className="mt-16 rounded-2xl border border-border bg-card/60 p-2 shadow-2xl backdrop-blur-sm">
          <div className="rounded-xl border border-border/60 bg-background/80 p-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                <span className="h-2 w-2 rounded-full bg-warning" />
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="ml-3 font-mono">geoterra.app/dashboard</span>
              </div>
              <div className="hidden items-center gap-1.5 text-[10px] text-muted-foreground sm:flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Sincronizado
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Imóveis", value: "147", tone: "primary" },
                { label: "Em risco", value: "12", tone: "destructive" },
                { label: "Licenças", value: "38", tone: "info" },
                { label: "Alertas novos", value: "9", tone: "warning" },
              ].map((k) => (
                <div key={k.label} className="rounded-lg border border-border bg-card/40 p-3 text-left">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
                  <div className="mt-1.5 text-2xl font-semibold tracking-tight">{k.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card/40 p-4 md:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium">Diagnósticos por imóvel</span>
                  <span className="text-[10px] text-muted-foreground">Últimos 30 dias</span>
                </div>
                <div className="flex h-24 items-end gap-1.5">
                  {[40, 65, 30, 80, 55, 90, 45, 70, 60, 85, 50, 75].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-gradient-to-t from-primary/80 to-primary/30"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card/40 p-4">
                <div className="mb-3 text-xs font-medium">Conformidade</div>
                <div className="space-y-2.5 text-[11px]">
                  {[
                    { l: "CAR ativo", v: 92, c: "bg-success" },
                    { l: "SIGEF certificado", v: 68, c: "bg-info" },
                    { l: "Sem embargo", v: 84, c: "bg-primary" },
                  ].map((row) => (
                    <div key={row.l}>
                      <div className="mb-1 flex justify-between text-muted-foreground">
                        <span>{row.l}</span>
                        <span>{row.v}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
                        <div className={`${row.c} h-full rounded-full`} style={{ width: `${row.v}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = ["CAR / SICAR", "SIGEF / INCRA", "MapBiomas", "DETER / PRODES", "IBAMA"];
  return (
    <section className="border-y border-border/60 bg-card/30 py-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        <span className="text-foreground/60">Integrações planejadas</span>
        {items.map((i) => (
          <span key={i} className="font-medium">{i}</span>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  {
    Icon: MapIcon,
    title: "Consulta de imóveis rurais",
    desc: "Cadastre matrícula, CAR, SIGEF e geometria do imóvel. Histórico completo de consultas técnicas em um só lugar.",
  },
  {
    Icon: ShieldCheck,
    title: "Diagnóstico ambiental e fundiário",
    desc: "Motor de regras configurável avalia automaticamente CAR, SIGEF, embargos, desmatamento, APP e Reserva Legal.",
  },
  {
    Icon: FileText,
    title: "Controle de licenças ambientais",
    desc: "LP, LI, LO, LAS, outorgas. Anexos seguros, vínculo com cliente/imóvel e alertas automáticos de vencimento.",
  },
  {
    Icon: Bell,
    title: "Monitoramento e alertas",
    desc: "Central unificada com alertas de monitoramento, licenças vencendo e diagnósticos críticos por severidade.",
  },
  {
    Icon: FileText,
    title: "Relatórios técnicos em PDF",
    desc: "Geração automática de laudos com diagnóstico, dados cartoriais, análise ambiental e mapa do imóvel.",
  },
  {
    Icon: Database,
    title: "Fontes de dados e integrações",
    desc: "Catálogo extensível para CAR, SIGEF, MapBiomas, DETER e IBAMA. Sincronização simulada para validar fluxos.",
  },
];

function Features() {
  return (
    <section id="recursos" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-success">
            <Layers className="h-3 w-3" /> Plataforma completa
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Tudo que sua equipe precisa para regularizar imóveis rurais
          </h2>
          <p className="mt-3 text-muted-foreground">
            Do cadastro à emissão do laudo técnico, com automação e governança.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-6 transition hover:border-primary/40 hover:bg-card"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-gradient-primary shadow-glow">
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { Icon: MapIcon, title: "Cadastre o imóvel", desc: "Matrícula, CAR, SIGEF e geometria. Importe ou consulte fontes externas." },
    { Icon: Satellite, title: "Rode o diagnóstico", desc: "Regras automáticas avaliam conformidade ambiental e fundiária." },
    { Icon: FileText, title: "Emita o laudo", desc: "Relatório PDF profissional com todas as evidências consolidadas." },
  ];
  return (
    <section id="como-funciona" className="border-y border-border/60 bg-card/20 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Do cadastro ao laudo em 3 passos</h2>
          <p className="mt-3 text-muted-foreground">Fluxo otimizado para escritórios técnicos e consultorias agroambientais.</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-border bg-card/60 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                  <s.Icon className="h-5 w-5" />
                </div>
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-3 rounded-2xl border border-border bg-card/60 p-6 md:grid-cols-3">
          {[
            "Multi-organização com controle de papéis",
            "Histórico imutável de consultas",
            "RLS por organização — dados isolados",
          ].map((b) => (
            <div key={b} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>{b}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="contato" className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-success/10 p-10 md:p-14">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-success/20 blur-3xl" />
          <div className="relative text-center">
            <Leaf className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Pronto para modernizar sua operação rural?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Crie sua conta agora ou agende uma demonstração com nosso time técnico.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
               
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 sm:w-auto"
              >
                Criar conta <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-card/80 px-6 text-sm font-semibold hover:border-primary/50 hover:text-primary sm:w-auto"
              >
                Entrar
              </Link>
              <a
                href="mailto:contato@geoterra.app?subject=Solicita%C3%A7%C3%A3o%20de%20demonstra%C3%A7%C3%A3o%20GeoTerra"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-6 text-sm font-semibold text-primary hover:bg-primary/20 sm:w-auto"
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

function Footer() {
  return (
    <footer className="border-t border-border/60 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <TreePine className="h-4 w-4 text-primary" />
          <span>© {new Date().getFullYear()} GeoTerra — Inteligência Territorial.</span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/login" className="hover:text-foreground">Entrar</Link>
          <Link to="/signup" className="hover:text-foreground">Criar conta</Link>
          <a href="#contato" className="hover:text-foreground">Contato</a>
        </div>
      </div>
    </footer>
  );
}
