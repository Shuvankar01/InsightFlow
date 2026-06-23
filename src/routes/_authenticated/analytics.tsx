import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — InsightFlow" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data = [], isLoading } = useQuery({
    queryKey: ["analytics", days],
    queryFn: async () => {
      const { data, error } = await supabase.from("analytics").select("*")
        .gte("created_at", new Date(Date.now() - days * 86400000).toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const series = useMemo(() => {
    const b: Record<string, any> = {};
    for (const r of data) {
      const d = new Date(r.created_at).toISOString().slice(0, 10);
      b[d] ??= { date: d };
      b[d][r.metric] = (b[d][r.metric] ?? 0) + Number(r.value);
    }
    return Object.values(b);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Deep dive into your metrics over time</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 60].map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{d}d</Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            { key: "revenue", title: "Revenue" },
            { key: "users", title: "Users" },
            { key: "active_users", title: "Active users" },
            { key: "orders", title: "Orders" },
            { key: "traffic", title: "Traffic" },
            { key: "conversion", title: "Conversion %" },
          ].map((m, i) => (
            <div key={m.key} className="glass-card rounded-xl p-5">
              <div className="mb-3 text-sm font-semibold">{m.title}</div>
              <ResponsiveContainer width="100%" height={200}>
                {i % 2 === 0 ? (
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id={`g${m.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--color-gold)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" fontSize={10} stroke="var(--color-muted-foreground)" tickFormatter={(v) => v.slice(5)} />
                    <YAxis fontSize={10} stroke="var(--color-muted-foreground)" />
                    <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                    <Area type="monotone" dataKey={m.key} stroke="var(--color-gold)" fill={`url(#g${m.key})`} strokeWidth={2} />
                  </AreaChart>
                ) : (
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" fontSize={10} stroke="var(--color-muted-foreground)" tickFormatter={(v) => v.slice(5)} />
                    <YAxis fontSize={10} stroke="var(--color-muted-foreground)" />
                    <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                    <Line type="monotone" dataKey={m.key} stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
