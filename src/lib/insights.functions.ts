import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");

    const { supabase, userId } = context;
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: rows } = await supabase.from("analytics").select("metric,value,created_at").gte("created_at", since);

    // Aggregate
    const agg: Record<string, { thisWeek: number; lastWeek: number; total: number }> = {};
    const now = Date.now();
    for (const r of rows ?? []) {
      const t = new Date(r.created_at).getTime();
      const v = Number(r.value);
      const a = agg[r.metric] ?? { thisWeek: 0, lastWeek: 0, total: 0 };
      a.total += v;
      if (t > now - 7 * 86400000) a.thisWeek += v;
      else if (t > now - 14 * 86400000) a.lastWeek += v;
      agg[r.metric] = a;
    }

    const summary = Object.entries(agg).map(([m, a]) => {
      const change = a.lastWeek ? ((a.thisWeek - a.lastWeek) / a.lastWeek) * 100 : 0;
      return { metric: m, thisWeek: Math.round(a.thisWeek), lastWeek: Math.round(a.lastWeek), changePct: Math.round(change * 10) / 10 };
    });

    const prompt = `You are a senior data analyst. Given this 30-day metric summary (JSON), produce concise business insights.\n\nDATA:\n${JSON.stringify(summary, null, 2)}\n\nReturn STRICT JSON with this shape:\n{\n  "summary": "1-2 sentence executive summary",\n  "trends": ["3-5 short bullet trends"],\n  "recommendations": ["3-5 short actionable recommendations"]\n}\nReturn ONLY the JSON object, no markdown.`;

    const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    }),
  }
);

    if (!res.ok) {
      if (res.status === 429) throw new Error("AI rate limit — try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Top up to continue.");
      throw new Error(`AI provider error: ${res.status}`);
    }
    const j = await res.json() as {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
};

const text =
  j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    let parsed: { summary: string; trends: string[]; recommendations: string[] };
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : text);
    } catch {
      parsed = { summary: text.slice(0, 240), trends: [], recommendations: [] };
    }

    await supabase.from("reports").insert({
      user_id: userId,
      name: `Insights — ${new Date().toLocaleDateString()}`,
      payload: parsed as any,
    });

    return { ...parsed, summaryData: summary, generatedAt: new Date().toISOString() };
  });
