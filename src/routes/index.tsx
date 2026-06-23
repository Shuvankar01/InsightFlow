import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity, BarChart3, Bell, Brain, Shield, Sparkles, Zap, TrendingUp,
  Building2, ShoppingBag, Users2, Database, ArrowRight, Lock, KeyRound,
  ShieldCheck, Cpu, Server, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InsightFlow — Real-Time AI Analytics Dashboard" },
      { name: "description", content: "AI-powered real-time business intelligence platform. Live metrics, instant AI insights, and a workspace built for fast-moving teams." },
      { property: "og:title", content: "InsightFlow — Real-Time AI Analytics" },
      { property: "og:description", content: "AI-powered real-time business intelligence platform." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Activity, title: "Real-time metrics", desc: "Live dashboards that update the second your data changes — no refresh, no waiting." },
  { icon: Brain, title: "AI-generated insights", desc: "Our AI engine surfaces trends, anomalies, and recommendations automatically." },
  { icon: Shield, title: "Role-based access", desc: "Admin, manager, and user roles with row-level security across every table." },
  { icon: Bell, title: "Live notifications", desc: "Toast alerts and an unread bell that wake up the moment something happens." },
  { icon: BarChart3, title: "Beautiful charts", desc: "Recharts visualizations tuned to your brand — line, area, pie, and trend." },
  { icon: Zap, title: "Built to ship", desc: "Production-ready stack: React, TanStack, Postgres, Tailwind, Framer Motion." },
];

const audiences = [
  { icon: Building2, title: "SaaS Companies", desc: "Track MRR, churn, activation, and feature usage with real-time pipelines and per-team workspaces." },
  { icon: ShoppingBag, title: "E-commerce Businesses", desc: "Monitor orders, revenue, conversion, and traffic sources the second they happen — not at end of day." },
  { icon: Users2, title: "Product Teams", desc: "Ship faster with shared dashboards, role-aware access, and AI summaries the whole team can act on." },
  { icon: Database, title: "Data-driven Organizations", desc: "Centralize signals from every source and turn raw events into trends and recommendations automatically." },
];

const flow = [
  { icon: Database, title: "Data Sources", desc: "Streams and events flow in." },
  { icon: Activity, title: "Realtime Engine", desc: "Processed instantly, in order." },
  { icon: Brain, title: "AI Analysis", desc: "Patterns and anomalies surface." },
  { icon: TrendingUp, title: "Actionable Insights", desc: "Decisions, not dashboards." },
];

const showcase = [
  { title: "Live Dashboard", desc: "KPIs, sparklines, and event feed in one calm view." },
  { title: "Deep Analytics", desc: "Trends, breakdowns, and segment compare with smooth charts." },
  { title: "AI Insights", desc: "Executive summary, trends, and recommendations on demand." },
  { title: "Admin Management", desc: "Users, roles, and an enterprise-grade audit log." },
];

const security = [
  { icon: KeyRound, title: "Secure authentication", desc: "Email + password and one-time codes — no passwords ever logged." },
  { icon: ShieldCheck, title: "Role-based access control", desc: "Granular admin / manager / user roles enforced server-side." },
  { icon: Lock, title: "Row-level security", desc: "Every table is policy-protected so users only see their own data." },
  { icon: Shield, title: "Protected data access", desc: "All privileged work runs on the server — no secrets in the browser." },
];

const trust = [
  { icon: Activity, title: "Real-time processing" },
  { icon: Cpu, title: "AI-powered insights" },
  { icon: ShieldCheck, title: "Secure architecture" },
  { icon: Server, title: "Production-ready stack" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg gold-gradient">
              <Sparkles className="h-4 w-4 text-gold-foreground" />
            </div>
            <span className="font-display text-xl">InsightFlow</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#audience" className="hover:text-foreground">Who it's for</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#security" className="hover:text-foreground">Security</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth"><Button size="sm" className="gold-gradient text-gold-foreground hover:opacity-90">Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--gold)/12%,_transparent_60%)]" />
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-foreground">
              <Sparkles className="h-3 w-3 text-gold" /> AI-powered analytics, in real time
            </div>
            <h1 className="font-display text-5xl leading-[1.05] md:text-7xl">
              The analytics dashboard <em className="text-gold">your data deserves.</em>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              AI-powered real-time business intelligence. Live metrics, instant summaries, and a workspace built for teams that move fast.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth"><Button size="lg" className="gold-gradient text-gold-foreground hover:opacity-90">Start analyzing your data today</Button></Link>
              <a href="#preview"><Button size="lg" variant="outline">See the dashboard</Button></a>
            </div>
          </motion.div>

          {/* Preview mock */}
          <motion.div id="preview" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7 }} className="mx-auto mt-20 max-w-5xl">
            <div className="glass-card rounded-2xl p-1 shadow-2xl shadow-emerald-deep/20">
              <div className="rounded-xl bg-card p-8">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { l: "Revenue", v: "$184.2k", t: "+12.4%" },
                    { l: "Active users", v: "12,840", t: "+8.1%" },
                    { l: "Orders", v: "1,284", t: "+3.2%" },
                    { l: "Conversion", v: "4.8%", t: "+0.6%" },
                  ].map((m) => (
                    <div key={m.l} className="rounded-lg border border-border/60 bg-background/60 p-4">
                      <div className="text-xs text-muted-foreground">{m.l}</div>
                      <div className="mt-1 font-display text-2xl">{m.v}</div>
                      <div className="mt-1 text-xs text-gold">{m.t}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex h-40 items-end gap-2">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const h = 30 + Math.sin(i / 2) * 25 + Math.random() * 30;
                    return <div key={i} className="flex-1 rounded-t gold-gradient opacity-80" style={{ height: `${h}%` }} />;
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Who it's for */}
      <section id="audience" className="border-t border-border/40">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl md:text-5xl">Built for teams that live in their data.</h2>
            <p className="mt-4 text-muted-foreground">Whatever you measure, InsightFlow keeps up.</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {audiences.map((a, i) => (
              <motion.div key={a.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-6">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 text-gold"><a.icon className="h-5 w-5" /></div>
                <h3 className="mt-4 text-lg font-semibold">{a.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{a.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border/40 bg-gradient-to-b from-background to-emerald-deep/[0.04]">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl md:text-5xl">How InsightFlow works.</h2>
            <p className="mt-4 text-muted-foreground">A streaming pipeline from raw event to clear decision.</p>
          </div>
          <div className="mt-16 grid items-stretch gap-4 md:grid-cols-7">
            {flow.map((step, i) => (
              <div key={step.title} className={`contents md:block ${i > 0 ? "" : ""}`}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card md:col-span-1 col-span-full rounded-xl p-6 text-center"
                  style={{ gridColumn: `${i * 2 + 1} / span 1` }}
                >
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full gold-gradient">
                    <step.icon className="h-5 w-5 text-gold-foreground" />
                  </div>
                  <h3 className="mt-4 font-display text-lg">{step.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{step.desc}</p>
                </motion.div>
                {i < flow.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + 0.2 }}
                    className="hidden items-center justify-center md:flex"
                    style={{ gridColumn: `${i * 2 + 2} / span 1` }}
                  >
                    <ArrowRight className="h-5 w-5 text-gold/70" />
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product showcase */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl md:text-5xl">One workspace, every view you need.</h2>
            <p className="mt-4 text-muted-foreground">From the live overview to deep audit trails.</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {showcase.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="glass-card overflow-hidden rounded-2xl"
              >
                <div className="relative h-52 bg-gradient-to-br from-emerald-deep/20 via-background to-gold/10 p-4">
                  <div className="grid h-full grid-cols-3 gap-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="rounded-lg border border-border/60 bg-card/70 p-3">
                        <div className="h-2 w-12 rounded bg-muted-foreground/30" />
                        <div className="mt-2 h-5 w-16 rounded bg-foreground/80" />
                        <div className="mt-3 flex h-16 items-end gap-1">
                          {Array.from({ length: 8 }).map((_, k) => (
                            <div key={k} className="flex-1 rounded-t gold-gradient opacity-70" style={{ height: `${20 + Math.abs(Math.sin((j + 1) * (k + 1))) * 70}%` }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/40">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl md:text-5xl">Everything you need, nothing you don't.</h2>
            <p className="mt-4 text-muted-foreground">A premium SaaS analytics experience, batteries included.</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-6">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 text-gold"><f.icon className="h-5 w-5" /></div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="border-t border-border/40 bg-emerald-deep/[0.04]">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl md:text-5xl">Secure by default.</h2>
            <p className="mt-4 text-muted-foreground">Enterprise-grade controls, with sensible defaults.</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {security.map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="glass-card rounded-xl p-6">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-deep/15 text-emerald-600"><s.icon className="h-5 w-5" /></div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((t) => (
              <div key={t.title} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-4">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold/15 text-gold">
                  <t.icon className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {t.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <TrendingUp className="mx-auto h-10 w-10 text-gold" />
          <h2 className="mt-6 font-display text-4xl md:text-5xl">Start analyzing your data today.</h2>
          <p className="mt-4 text-muted-foreground">Create an account and explore the live dashboard in under a minute.</p>
          <Link to="/auth" className="mt-8 inline-block">
            <Button size="lg" className="gold-gradient text-gold-foreground hover:opacity-90">Launch InsightFlow</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        <p>AI-powered real-time business intelligence platform</p>
        <p className="mt-1 text-xs">© {new Date().getFullYear()} InsightFlow. All rights reserved.</p>
      </footer>
    </div>
  );
}
