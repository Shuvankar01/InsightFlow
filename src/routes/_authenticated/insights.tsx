import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateInsights } from "@/lib/insights.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, TrendingUp, Lightbulb, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({ meta: [{ title: "AI Insights — InsightFlow" }] }),
  component: InsightsPage,
});

type Report = { summary: string; trends: string[]; recommendations: string[] };

function InsightsPage() {
  const gen = useServerFn(generateInsights);

  const { data: latest } = useQuery({
    queryKey: ["latest-report"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const m = useMutation({
    mutationFn: () => gen({}),
    onSuccess: () => toast.success("New insights generated"),
    onError: (e: Error) => toast.error(e.message),
  });

  const report: Report | null = (m.data as Report) ?? (latest?.payload as Report) ?? null;

  function exportPDF() {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(20); doc.text("InsightFlow — AI Insights", 14, 20);
    doc.setFontSize(11); doc.setTextColor(120);
    doc.text(new Date().toLocaleString(), 14, 28);
    doc.setTextColor(20); doc.setFontSize(14); doc.text("Summary", 14, 42);
    doc.setFontSize(11); doc.text(doc.splitTextToSize(report.summary, 180), 14, 50);
    let y = 50 + doc.splitTextToSize(report.summary, 180).length * 6 + 8;
    doc.setFontSize(14); doc.text("Trends", 14, y); y += 8;
    doc.setFontSize(11);
    report.trends.forEach((t) => { const lines = doc.splitTextToSize("• " + t, 180); doc.text(lines, 14, y); y += lines.length * 6 + 2; });
    y += 4; doc.setFontSize(14); doc.text("Recommendations", 14, y); y += 8;
    doc.setFontSize(11);
    report.recommendations.forEach((t) => { const lines = doc.splitTextToSize("• " + t, 180); doc.text(lines, 14, y); y += lines.length * 6 + 2; });
    doc.save(`insightflow-${Date.now()}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl">AI Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">Powered by AI Analytics Engine</p>
        </div>
        <div className="flex gap-2">
          {report && <Button variant="outline" onClick={exportPDF}><Download className="mr-2 h-4 w-4" /> Export PDF</Button>}
          <Button onClick={() => m.mutate()} disabled={m.isPending} className="gold-gradient text-gold-foreground hover:opacity-90">
            <Sparkles className="mr-2 h-4 w-4" />
            {m.isPending ? "Analyzing…" : report ? "Regenerate" : "Generate insights"}
          </Button>
        </div>
      </div>

      {!report && !m.isPending && (
        <div className="glass-card grid place-items-center rounded-xl p-16 text-center">
          <Brain className="h-10 w-10 text-gold" />
          <h2 className="mt-4 font-display text-2xl">No insights yet</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">Click <em>Generate insights</em> to analyze your last 30 days of metrics with AI.</p>
        </div>
      )}

      {m.isPending && (
        <div className="space-y-4">
          {[1,2,3].map((i) => <div key={i} className="glass-card h-32 animate-pulse rounded-xl" />)}
        </div>
      )}

      {report && (
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 text-gold"><Brain className="h-4 w-4" /><span className="text-xs uppercase tracking-wider">Executive summary</span></div>
            <p className="mt-3 text-lg leading-relaxed">{report.summary}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 text-gold"><TrendingUp className="h-4 w-4" /><span className="text-xs uppercase tracking-wider">Trends</span></div>
              <ul className="mt-4 space-y-3">
                {report.trends.map((t, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 text-gold"><Lightbulb className="h-4 w-4" /><span className="text-xs uppercase tracking-wider">Recommendations</span></div>
              <ul className="mt-4 space-y-3">
                {report.recommendations.map((t, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
