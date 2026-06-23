import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Bell, ShieldAlert, LogIn, Users, Brain, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — InsightFlow" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { theme, toggle } = useTheme();
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const [name, setName] = useState("");
  useEffect(() => { if (profile?.name) setName(profile.name); }, [profile?.name]);

  // Notification preferences (UI-only; persisted locally for demo)
  const PREF_KEY = "insightflow.notifPrefs.v1";
  type Prefs = {
    securityAlerts: boolean;
    loginActivity: boolean;
    userChanges: boolean;
    aiInsightUpdates: boolean;
    exportNotifications: boolean;
    frequency: "instant" | "daily" | "weekly";
  };
  const defaultPrefs: Prefs = {
    securityAlerts: true,
    loginActivity: true,
    userChanges: true,
    aiInsightUpdates: true,
    exportNotifications: false,
    frequency: "instant",
  };
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(PREF_KEY) : null;
      if (raw) setPrefs({ ...defaultPrefs, ...JSON.parse(raw) });
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function updatePref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs((p) => {
      const next = { ...p, [key]: value };
      try { window.localStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }
  function savePrefs() {
    try { window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
    toast.success("Notification preferences saved");
  }

  async function save() {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ name }).eq("id", profile.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["my-profile"] }); }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-4xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile and preferences</p>
      </div>

      <section className="glass-card space-y-4 rounded-xl p-6">
        <h2 className="text-lg font-semibold">Profile</h2>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={profile?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={save} className="gold-gradient text-gold-foreground hover:opacity-90">Save changes</Button>
      </section>

      <section className="glass-card space-y-4 rounded-xl p-6">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm">Dark mode</div>
            <div className="text-xs text-muted-foreground">Switch between the emerald dark and light themes.</div>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggle} />
        </div>
      </section>

      <section className="glass-card space-y-5 rounded-xl p-6">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gold" />
          <h2 className="text-lg font-semibold">Notification preferences</h2>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          Choose which events you want to be notified about, and how often.
        </p>

        <div className="divide-y divide-border/60">
          {([
            { key: "securityAlerts", icon: ShieldAlert, label: "Security alerts", desc: "Suspicious logins, blocked attempts, permission changes." },
            { key: "loginActivity", icon: LogIn, label: "Login activity", desc: "Successful and failed sign-ins on your account." },
            { key: "userChanges", icon: Users, label: "User changes", desc: "Invites, role changes, and member status updates." },
            { key: "aiInsightUpdates", icon: Brain, label: "AI insight updates", desc: "New AI summaries, anomaly detections, and recommendations." },
            { key: "exportNotifications", icon: Download, label: "Export notifications", desc: "When CSV/PDF exports are ready for download." },
          ] as const).map(({ key, icon: Icon, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </div>
              <Switch
                checked={prefs[key]}
                onCheckedChange={(v) => updatePref(key, v)}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <div>
            <Label className="text-sm">Delivery frequency</Label>
            <p className="text-xs text-muted-foreground">How often we batch notifications.</p>
          </div>
          <Select
            value={prefs.frequency}
            onValueChange={(v) => updatePref("frequency", v as Prefs["frequency"])}
          >
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant</SelectItem>
              <SelectItem value="daily">Daily summary</SelectItem>
              <SelectItem value="weekly">Weekly summary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end">
          <Button onClick={savePrefs} className="gold-gradient text-gold-foreground hover:opacity-90">
            Save preferences
          </Button>
        </div>
      </section>
    </div>
  );
}
