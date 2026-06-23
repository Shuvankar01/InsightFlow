import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Download, FileText, Search, Activity as ActivityIcon, Filter,
  AlertTriangle, AlertCircle, CheckCircle2, Info, Radio, List, GitBranch,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/activities")({
  head: () => ({ meta: [{ title: "Audit Log — InsightFlow" }] }),
  component: ActivitiesPage,
});

type Severity = "info" | "success" | "warning" | "critical";

type ActivityRow = {
  id: string;
  user_id: string | null;
  event: string;
  description: string | null;
  severity: Severity;
  status: string;
  metadata: Record<string, unknown> | null;
  device_info: Record<string, unknown> | null;
  created_at: string;
};

const PAGE_SIZE = 15;

const MIN = 60 * 1000;
const DEMO_ACTIVITIES: ActivityRow[] = [
  { id: "demo-1", user_id: null, event: "auth.login.success", description: "Admin signed in from Chrome on macOS", severity: "success", status: "ok", metadata: { ip: "203.0.113.42", method: "password" }, device_info: { browser: "Chrome 121", os: "macOS 14" }, created_at: new Date(Date.now() - 3 * MIN).toISOString() },
  { id: "demo-2", user_id: null, event: "auth.login.failed", description: "Failed login attempt — invalid password", severity: "warning", status: "blocked", metadata: { ip: "198.51.100.7", attempts: 2 }, device_info: { browser: "Firefox 122", os: "Windows 11" }, created_at: new Date(Date.now() - 22 * MIN).toISOString() },
  { id: "demo-3", user_id: null, event: "user.invited", description: "Analytics Manager invited manager@insightflow.ai", severity: "info", status: "sent", metadata: { role: "manager" }, device_info: null, created_at: new Date(Date.now() - 55 * MIN).toISOString() },
  { id: "demo-4", user_id: null, event: "user.role.updated", description: "Team Member promoted from viewer to user", severity: "success", status: "ok", metadata: { from: "viewer", to: "user" }, device_info: null, created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
  { id: "demo-5", user_id: null, event: "dashboard.viewed", description: "Executive dashboard opened", severity: "info", status: "ok", metadata: { widgets: 6 }, device_info: null, created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },
  { id: "demo-6", user_id: null, event: "analytics.report.generated", description: "Weekly performance report generated", severity: "success", status: "ok", metadata: { range: "7d", rows: 1240 }, device_info: null, created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
  { id: "demo-7", user_id: null, event: "ai.insight.generated", description: "AI summary identified a 12% spike in organic traffic", severity: "success", status: "ok", metadata: { model: "gemini", tokens: 842 }, device_info: null, created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString() },
  { id: "demo-8", user_id: null, event: "export.csv.completed", description: "Audit log exported as CSV (320 rows)", severity: "info", status: "ok", metadata: { rows: 320, format: "csv" }, device_info: null, created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString() },
  { id: "demo-9", user_id: null, event: "security.alert.critical", description: "Multiple failed logins from unknown IP — temporary block applied", severity: "critical", status: "blocked", metadata: { ip: "192.0.2.91", attempts: 7 }, device_info: { browser: "unknown", os: "unknown" }, created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString() },
];

type Category = "authentication" | "users" | "analytics" | "ai" | "exports" | "security" | "other";




function deriveCategory(event: string): Category {
  const e = event.toLowerCase();
  if (e.includes("login") || e.includes("logout") || e.includes("auth") || e.includes("signup")) return "authentication";
  if (e.includes("user") || e.includes("role") || e.includes("invite") || e.includes("profile")) return "users";
  if (e.includes("report") || e.includes("export") || e.includes("download")) return "exports";
  if (e.includes("insight") || e.includes("ai") || e.includes("summary")) return "ai";
  if (e.includes("dashboard") || e.includes("analytics") || e.includes("metric") || e.includes("data")) return "analytics";
  if (e.includes("block") || e.includes("security") || e.includes("threat") || e.includes("failed") || e.includes("alert")) return "security";
  return "other";
}

function deriveSeverity(event: string, raw: Severity): Severity {
  if (raw && raw !== "info") return raw;
  if (event.includes("delete") || event.includes("block") || event.includes("critical")) return "critical";
  if (event.includes("warn") || event.includes("fail") || event.includes("error")) return "warning";
  if (event.includes("payment") || event.includes("signup") || event.includes("success") || event.includes("captured")) return "success";
  return "info";
}

function severityStyles(s: Severity) {
  switch (s) {
    case "critical":
      return { cls: "bg-destructive/15 text-destructive border-destructive/40", Icon: AlertCircle };
    case "warning":
      return { cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40", Icon: AlertTriangle };
    case "success":
      return { cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40", Icon: CheckCircle2 };
    default:
      return { cls: "bg-primary/10 text-foreground border-primary/30", Icon: Info };
  }
}

function ActivitiesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [range, setRange] = useState<string>("7d");
  const [view, setView] = useState<"table" | "timeline">("table");
  const [page, setPage] = useState(0);
  const [drawer, setDrawer] = useState<ActivityRow | null>(null);

  const { data: activities = [], isLoading } = useQuery<ActivityRow[]>({
    queryKey: ["activities-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-mini"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,name,email,avatar");
      return data ?? [];
    },
  });
  const userMap = useMemo(() => {
    const m = new Map<string, { name: string | null; email: string | null }>();
    for (const p of profiles) m.set(p.id, { name: p.name, email: p.email });
    return m;
  }, [profiles]);

  useEffect(() => {
    const ch = supabase
      .channel("activities-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () => {
        qc.invalidateQueries({ queryKey: ["activities-all"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const rangeMs = useMemo(() => {
    const d: Record<string, number> = { "24h": 86400000, "7d": 7 * 86400000, "30d": 30 * 86400000, all: 0 };
    return d[range] ?? 0;
  }, [range]);

  const isDemoFallback = !isLoading && activities.length === 0;
  const sourceActivities = isDemoFallback ? DEMO_ACTIVITIES : activities;

  const filtered = useMemo(() => {
    const cutoff = rangeMs ? Date.now() - rangeMs : 0;
    return sourceActivities
      .map((a) => ({
        ...a,
        severity: deriveSeverity(a.event, a.severity),
        category: deriveCategory(a.event),
      }))
      .filter((a) => {
        if (cutoff && new Date(a.created_at).getTime() < cutoff) return false;
        if (severity !== "all" && a.severity !== severity) return false;
        if (category !== "all" && a.category !== category) return false;
        if (search) {
          const s = search.toLowerCase();
          const user = a.user_id ? userMap.get(a.user_id) : null;
          if (
            !a.event.toLowerCase().includes(s) &&
            !(a.description ?? "").toLowerCase().includes(s) &&
            !(user?.name ?? "").toLowerCase().includes(s) &&
            !(user?.email ?? "").toLowerCase().includes(s)
          ) return false;
        }
        return true;
      });
  }, [sourceActivities, rangeMs, severity, category, search, userMap]);


  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  useEffect(() => { setPage(0); }, [search, severity, category, range]);

  const counts = useMemo(() => {
    const c = { info: 0, success: 0, warning: 0, critical: 0 };
    for (const a of filtered) c[a.severity]++;
    return c;
  }, [filtered]);

  function exportCSV() {
    const rows = [
      ["id", "user", "event", "description", "severity", "status", "created_at"],
      ...filtered.map((a) => {
        const u = a.user_id ? userMap.get(a.user_id) : null;
        return [a.id, u?.email ?? a.user_id ?? "system", a.event, a.description ?? "", a.severity, a.status, a.created_at];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-log-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("InsightFlow — Audit Log", 14, 16);
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleString()} • ${filtered.length} events`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["When", "User", "Action", "Severity", "Status"]],
      body: filtered.map((a) => {
        const u = a.user_id ? userMap.get(a.user_id) : null;
        return [
          format(new Date(a.created_at), "yyyy-MM-dd HH:mm"),
          u?.email ?? "system",
          a.event,
          a.severity,
          a.status,
        ];
      }),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21, 67, 56] },
    });
    doc.save(`audit-log-${Date.now()}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl">Audit log</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <Radio className="h-3 w-3 animate-pulse" /> Live Monitoring
            </span>
            {isDemoFallback && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--gold)]/50 bg-[var(--gold)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--gold)]">
                Demo preview
              </span>
            )}

          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} events tracked across authentication, users, analytics, AI, exports and security.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="inline-flex rounded-md border border-border/60 bg-background/40 p-0.5">
            <button
              onClick={() => setView("table")}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setView("timeline")}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs ${view === "timeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <GitBranch className="h-3.5 w-3.5" /> Timeline
            </button>
          </div>
          <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />CSV</Button>
          <Button variant="outline" onClick={exportPDF}><FileText className="mr-2 h-4 w-4" />PDF</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["info", "success", "warning", "critical"] as Severity[]).map((s) => {
          const { cls, Icon } = severityStyles(s);
          return (
            <div key={s} className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{s}</div>
                <Icon className="h-4 w-4 opacity-60" />
              </div>
              <div className="mt-2 font-display text-3xl">{counts[s]}</div>
              <div className={`mt-2 inline-block rounded border px-2 py-0.5 text-[10px] uppercase ${cls}`}>{s}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events, users, descriptions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-40"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="authentication">Authentication</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="analytics">Analytics</SelectItem>
              <SelectItem value="ai">AI</SelectItem>
              <SelectItem value="exports">Exports</SelectItem>
              <SelectItem value="security">Security</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {view === "timeline" ? (
        <div className="glass-card rounded-xl p-6">
          {isLoading && <div className="p-10 text-center text-muted-foreground">Loading timeline…</div>}
          {!isLoading && paged.length === 0 && (
            <div className="p-10 text-center text-muted-foreground">
              <ActivityIcon className="mx-auto mb-2 h-6 w-6 opacity-50" />
              No events match your filters
            </div>
          )}
          <ol className="relative ml-3 space-y-5 border-l border-border/60 pl-6">
            {paged.map((a) => {
              const u = a.user_id ? userMap.get(a.user_id) : null;
              const { cls, Icon } = severityStyles(a.severity);
              return (
                <li key={a.id} className="relative cursor-pointer" onClick={() => setDrawer(a)}>
                  <span className={`absolute -left-[31px] top-1 grid h-6 w-6 place-items-center rounded-full border ${cls}`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{a.event}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{a.category}</Badge>
                    <Badge variant="outline" className={`text-[10px] capitalize ${cls}`}>{a.severity}</Badge>
                    <span className="text-xs text-muted-foreground">
                      · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="mt-1 text-sm">{a.description ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{u?.name ?? (a.user_id ? "Unknown user" : "System")} · {u?.email ?? ""}</div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
      <div className="glass-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Loading audit log…</td></tr>}
              {!isLoading && paged.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">
                  <ActivityIcon className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  No events match your filters
                </td></tr>
              )}
              {paged.map((a) => {
                const u = a.user_id ? userMap.get(a.user_id) : null;
                const { cls, Icon } = severityStyles(a.severity);
                return (
                  <tr
                    key={a.id}
                    onClick={() => setDrawer(a)}
                    className="cursor-pointer border-t border-border/50 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{u?.name ?? (a.user_id ? "Unknown" : "System")}</div>
                      <div className="text-xs text-muted-foreground">{u?.email ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{a.event}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] capitalize">{a.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{a.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`capitalize ${cls}`}>
                        <Icon className="mr-1 h-3 w-3" />{a.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground" title={new Date(a.created_at).toLocaleString()}>
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">Page {page + 1} of {totalPages}</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      {/* Details drawer */}
      <Sheet open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {drawer && (
            <>
              <SheetHeader>
                <SheetTitle>Event details</SheetTitle>
                <SheetDescription className="font-mono text-xs">{drawer.id}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`capitalize ${severityStyles(drawer.severity).cls}`}>
                    {drawer.severity}
                  </Badge>
                  <Badge variant="outline" className="capitalize">{drawer.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(drawer.created_at), "PPpp")}
                  </span>
                </div>
                <Field label="Action" value={drawer.event} mono />
                <Field label="Description" value={drawer.description ?? "—"} />
                <Field
                  label="User"
                  value={
                    drawer.user_id
                      ? `${userMap.get(drawer.user_id)?.name ?? "Unknown"} (${userMap.get(drawer.user_id)?.email ?? drawer.user_id})`
                      : "System"
                  }
                />
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Metadata</div>
                  <pre className="max-h-48 overflow-auto rounded-lg border border-border/50 bg-muted/30 p-3 text-xs">
{JSON.stringify(drawer.metadata ?? {}, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Device info</div>
                  <pre className="max-h-48 overflow-auto rounded-lg border border-border/50 bg-muted/30 p-3 text-xs">
{JSON.stringify(drawer.device_info ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border/50 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 break-words ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}
