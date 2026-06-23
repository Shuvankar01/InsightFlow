import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — InsightFlow" },
      { name: "description", content: "Reset your InsightFlow password securely with an email code." },
    ],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().trim().email("Enter a valid email").max(255) });

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ email: fd.get("email") });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("We sent a 6-digit code to your email");
    navigate({ to: "/verify-email", search: { email: parsed.data.email, mode: "reset" } });
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
            Reset securely.
          </h2>
          <p className="mt-4 text-[oklch(0.85_0.04_90)]/80">
            We'll email you a 6-digit verification code to confirm it's you.
          </p>
        </div>
        <div className="relative text-xs text-[oklch(0.85_0.04_90)]/60">
          Codes expire in a few minutes for your protection.
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <Link to="/auth" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl">Forgot password</h1>
              <p className="text-xs text-muted-foreground">Enter your email to receive a verification code</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fp-email">Email</Label>
              <Input id="fp-email" name="email" type="email" autoComplete="email" required />
            </div>
            <Button type="submit" disabled={loading} className="w-full gold-gradient text-gold-foreground hover:opacity-90">
              {loading ? "Sending code…" : "Send verification code"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
