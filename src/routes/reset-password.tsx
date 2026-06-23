import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Check, Lock, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — InsightFlow" },
      { name: "description", content: "Choose a new password for your InsightFlow account." },
    ],
  }),
  component: ResetPasswordPage,
});

const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(72)
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a symbol");

const schema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function meetsRequirement(password: string, rule: string) {
  switch (rule) {
    case "min": return password.length >= 8;
    case "upper": return /[A-Z]/.test(password);
    case "number": return /[0-9]/.test(password);
    case "symbol": return /[^A-Za-z0-9]/.test(password);
    default: return false;
  }
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Must have a session from the verified recovery OTP.
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        toast.error("Verification required");
        navigate({ to: "/forgot-password" });
        return;
      }
      setChecking(false);
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      password: fd.get("password"),
      confirmPassword: fd.get("confirmPassword"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) { setLoading(false); toast.error(error.message); return; }
    // Sign out to force fresh login with the new password.
    await supabase.auth.signOut();
    setLoading(false);
    toast.success("Password updated — sign in to continue");
    navigate({ to: "/auth" });
  }

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-emerald-deep p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_var(--gold)/20%,_transparent_60%)]" />
        <div className="relative flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg gold-gradient">
            <Sparkles className="h-4 w-4 text-gold-foreground" />
          </div>
          <span className="font-display text-xl text-[oklch(0.95_0.025_90)]">InsightFlow</span>
        </div>
        <div className="relative">
          <h2 className="font-display text-4xl text-[oklch(0.95_0.025_90)] md:text-5xl">
            Choose a strong password.
          </h2>
          <p className="mt-4 text-[oklch(0.85_0.04_90)]/80">
            Make it unique. We'll sign you back in right after.
          </p>
        </div>
        <div className="relative text-xs text-[oklch(0.85_0.04_90)]/60">
          Your data is protected by row-level security.
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <Link to="/auth" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl">Set a new password</h1>
              <p className="text-xs text-muted-foreground">Choose something secure you'll remember</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rp-password">New password</Label>
              <Input
                id="rp-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {[
                  { key: "min", label: "At least 8 characters" },
                  { key: "upper", label: "Uppercase letter" },
                  { key: "number", label: "Number" },
                  { key: "symbol", label: "Symbol" },
                ].map((req) => {
                  const met = meetsRequirement(password, req.key);
                  return (
                    <div key={req.key} className="flex items-center gap-1.5 text-xs">
                      {met ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                      <span className={met ? "text-emerald-600" : "text-muted-foreground"}>
                        {req.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp-confirm">Confirm new password</Label>
              <Input
                id="rp-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full gold-gradient text-gold-foreground hover:opacity-90">
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
