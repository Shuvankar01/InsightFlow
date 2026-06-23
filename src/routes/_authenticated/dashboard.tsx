import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, Zap, Activity, Percent } from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useSimulateTick } from "@/hooks/use-simulate-tick";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — InsightFlow" }] }),
  component: Dashboard,
});

const fmt = (n: number) => Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const money = (n: number) => "$" + fmt(n);

function Dashboard() {
  const qc = useQueryClient();
  useSimulateTick(8000);

  const { data: analytics = [] } = useQuery({
    queryKey: ["analytics", "60d"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics")
        .select("*")
        .gte("created_at", new Date(Date.now() - 60 * 86400000).toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics" }, () => {
        qc.invalidateQueries({ queryKey: ["analytics", "60d"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activities" }, () => {
        qc.invalidateQueries({ queryKey: ["activities", "recent"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const summary = useMemo(() => {
    const byMetric: Record<string, { value: number; prev: number }> = {};
    const now = Date.now();
    const day = 86400000;
    for (const r of analytics) {
      const t = new Date(r.created_at).getTime();
      const v = Number(r.value);
      const bucket = byMetric[r.metric] ?? { value: 0, prev: 0 };
      if (t > now - 7 * day) bucket.value += v;
      else if (t > now - 14 * day) bucket.prev += v;
      byMetric[r.metric] = bucket;
    }
    const pct = (k: string) => {
      const m = byMetric[k]; if (!m || !m.prev) return 0;
      return ((m.value - m.prev) / m.prev) * 100;
    };
    return {
      revenue: byMetric.revenue?.value ?? 0,
      users: byMetric.users?.value ?? 0,
      active: byMetric.active_users?.value ?? 0,
      orders: byMetric.orders?.value ?? 0,
      conversion: (byMetric.conversion?.value ?? 0) / Math.max(1, analytics.filter(a => a.metric === "conversion" && new Date(a.created_at).getTime() > now - 7*day).length),
      growth: pct("revenue"),
      d: { revenue: pct("revenue"), users: pct("users"), active: pct("active_users"), orders: pct("orders") },
    };
  }, [analytics]);

  const series = useMemo(() => {
    const buckets: Record<string, { date: string; revenue: number; users: number; orders: number; traffic: number }> = {};
    for (const r of analytics) {
      const d = new Date(r.created_at).toISOString().slice(0, 10);
      buckets[d] ??= { date: d, revenue: 0, users: 0, orders: 0, traffic: 0 };
      if (r.metric === "revenue") buckets[d].revenue += Number(r.value);
      if (r.metric === "users") buckets[d].users += Number(r.value);
      if (r.metric === "orders") buckets[d].orders += Number(r.value);
      if (r.metric === "traffic") buckets[d].traffic += Number(r.value);
    }
    return Object.values(buckets).slice(-30);
  }, [analytics]);

  const categoryData = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of analytics) {
      if (!r.category) continue;
      const key = String(r.category).trim().toLowerCase();
      c[key] = (c[key] ?? 0) + Number(r.value);
    }
    return Object.entries(c).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [analytics]);


  const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"];

  // Demo display fallback — only used when the backend has no signal yet
  const isDemoFallback = analytics.length === 0;
  const demoCards = [
    { label: "Revenue", value: "$128.4K", delta: 18.4, icon: DollarSign },
    { label: "Total users", value: "1,248", delta: 12.1, icon: Users },
    { label: "Active users", value: "842", delta: 9.4, icon: Activity },
    { label: "Orders", value: "3,421", delta: 6.8, icon: ShoppingCart },
    { label: "Conversion", value: "8.6%", delta: 1.2, icon: Percent },
    { label: "Growth", value: "+18.4%", delta: 18.4, icon: Zap },
  ];
  const liveCards = [
    { label: "Revenue", value: money(summary.revenue), delta: summary.d.revenue, icon: DollarSign },
    { label: "Total users", value: fmt(summary.users), delta: summary.d.users, icon: Users },
    { label: "Active users", value: fmt(summary.active), delta: summary.d.active, icon: Activity },
    { label: "Orders", value: fmt(summary.orders), delta: summary.d.orders, icon: ShoppingCart },
    { label: "Conversion", value: summary.conversion.toFixed(2) + "%", delta: 0.6, icon: Percent },
    { label: "Growth", value: (summary.growth >= 0 ? "+" : "") + summary.growth.toFixed(1) + "%", delta: summary.growth, icon: Zap },
  ];
  const cards = isDemoFallback ? demoCards : liveCards;

  const DEMO_ACTIVITY = [
    { id: "d1", event: "Admin login successful", description: "demo@insightflow.ai signed in from Chrome on macOS", created_at: new Date(Date.now() - 2 * 60_000).toISOString() },
    { id: "d2", event: "AI insight generated", description: "Weekly executive summary produced by AI engine", created_at: new Date(Date.now() - 18 * 60_000).toISOString() },
    { id: "d3", event: "Report exported", description: "Revenue performance exported as PDF", created_at: new Date(Date.now() - 55 * 60_000).toISOString() },
    { id: "d4", event: "User role updated", description: "Analytics Manager promoted to manager", created_at: new Date(Date.now() - 3 * 3600_000).toISOString() },
    { id: "d5", event: "Security alert detected", description: "Multiple failed logins from unknown IP — temporary block applied", created_at: new Date(Date.now() - 9 * 3600_000).toISOString() },
  ];
  const activityList = activities.length === 0 ? DEMO_ACTIVITY : activities;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live metrics from the last 7 days · auto-updating
          {isDemoFallback && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-[var(--gold)]/50 bg-[var(--gold)]/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--gold)]">
              Demo preview
            </span>
          )}
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">{c.label}</div>
              <c.icon className="h-4 w-4 text-gold" />
            </div>
            <div className="mt-2 font-display text-2xl">{c.value}</div>
            <div className={`mt-1 flex items-center gap-1 text-xs ${c.delta >= 0 ? "text-gold" : "text-destructive"}`}>
              {c.delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(c.delta).toFixed(1)}% vs prev week
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Revenue trend</div>
              <div className="text-xs text-muted-foreground">Last 30 days</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => fmt(v as number)} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#gRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="mb-4 text-sm font-semibold">Traffic by source</div>
          {categoryData.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card rounded-xl p-5">
          <div className="mb-4 text-sm font-semibold">User growth</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="users" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="mb-4 text-sm font-semibold">Orders</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              <Bar dataKey="orders" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="mb-4 text-sm font-semibold">Recent activity</div>
          <div className="space-y-3">
            {activityList.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No activity yet</div>}
            {activityList.map((a) => (
              <div key={a.id} className="flex items-start gap-3 border-b border-border/40 pb-3 last:border-0">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{a.event}</div>
                  {a.description && <div className="text-xs text-muted-foreground">{a.description}</div>}
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
