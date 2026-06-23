import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CATEGORIES = ["organic", "direct", "social", "referral", "email"];
type Sev = "info" | "success" | "warning" | "critical";
const EVENT_TEMPLATES: { event: string; description: string; severity: Sev; status: string }[] = [
  { event: "order.placed", description: "New order received", severity: "success", status: "success" },
  { event: "user.signup", description: "Visitor created an account", severity: "success", status: "success" },
  { event: "user.login", description: "User signed in", severity: "info", status: "success" },
  { event: "payment.captured", description: "Payment captured successfully", severity: "success", status: "success" },
  { event: "payment.failed", description: "Payment was declined", severity: "warning", status: "failed" },
  { event: "subscription.renewed", description: "Subscription renewed", severity: "info", status: "success" },
  { event: "report.generated", description: "Analytics report generated", severity: "info", status: "success" },
  { event: "user.blocked", description: "User account blocked by admin", severity: "critical", status: "success" },
  { event: "role.changed", description: "User role updated", severity: "warning", status: "success" },
  { event: "data.update", description: "Data record updated", severity: "info", status: "success" },
];

function jitter(base: number, spread: number) {
  return Math.max(0, Math.round(base + (Math.random() - 0.5) * spread));
}

// Smooth diurnal + weekly trend so values move like a real product instead of
// random spikes. Returns a 0.7–1.3 multiplier based on hour-of-day & day-of-week.
function trendMultiplier(d: Date) {
  const hour = d.getUTCHours();
  const dow = d.getUTCDay();
  const diurnal = 1 + 0.18 * Math.sin(((hour - 9) / 24) * Math.PI * 2); // peak mid-day
  const weekly = 1 + 0.08 * Math.sin(((dow - 2) / 7) * Math.PI * 2);     // peak mid-week
  return diurnal * weekly;
}

export const simulateTick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date();
    const nowIso = now.toISOString();
    const m = trendMultiplier(now);
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)].toLowerCase();
    const trafficCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)].toLowerCase();

    const rows = [
      { metric: "revenue", value: jitter(4200 * m, 600), category, created_at: nowIso },
      { metric: "users", value: jitter(140 * m, 30), category: null, created_at: nowIso },
      { metric: "active_users", value: jitter(540 * m, 80), category: null, created_at: nowIso },
      { metric: "orders", value: jitter(48 * m, 12), category: null, created_at: nowIso },
      { metric: "traffic", value: jitter(1800 * m, 300), category: trafficCategory, created_at: nowIso },
      { metric: "conversion", value: Number((2.5 + Math.sin(now.getUTCHours() / 4) * 0.8 + Math.random() * 0.4).toFixed(2)), category: null, created_at: nowIso },
    ];


    const { error } = await supabaseAdmin.from("analytics").insert(rows);
    if (error) throw new Error(error.message);

    let activityInserted = false;
    if (Math.random() < 0.45) {
      const tpl = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
      const devices = ["macOS · Chrome", "Windows · Edge", "iOS · Safari", "Android · Chrome", "Linux · Firefox"];
      await supabaseAdmin.from("activities").insert({
        event: tpl.event,
        description: tpl.description,
        severity: tpl.severity,
        status: tpl.status,
        metadata: { simulated: true, amount: jitter(120, 200) },
        device_info: {
          device: devices[Math.floor(Math.random() * devices.length)],
          ip: `${jitter(50, 80)}.${jitter(120, 80)}.${jitter(40, 50)}.${jitter(20, 30)}`,
        },
      });
      activityInserted = true;
    }

    return { ok: true, inserted: rows.length, activityInserted, at: nowIso };
  });
