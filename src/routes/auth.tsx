import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — InsightFlow" },
      { name: "description", content: "Sign in or create your InsightFlow account." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const signinPasswordSchema = z.string().min(6, "At least 6 characters").max(72);
const signupPasswordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(72)
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a symbol");
const signinSchema = z.object({ email: emailSchema, password: signinPasswordSchema });
const signupSchema = z
  .object({
    email: emailSchema,
    password: signupPasswordSchema,
    confirmPassword: z.string(),
    name: z.string().trim().min(1, "Name required").max(80),
  })
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

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signupPassword, setSignupPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signinSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password"),
      confirmPassword: fd.get("confirmPassword"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { name: parsed.data.name } },
    });
    if (error) { setLoading(false); toast.error(error.message); return; }
    // Auto-login: if no session was returned (e.g. email confirmation still required),
    // attempt password sign-in to log the user in immediately.
    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (signInErr) {
        setLoading(false);
        toast.error(signInErr.message);
        return;
      }
    }
    setLoading(false);
    toast.success("Account created — welcome to InsightFlow!");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-emerald-deep p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_var(--gold)/20%,_transparent_60%)]" />
        <div className="relative flex items-center gap-2 text-background">
          <div className="grid h-8 w-8 place-items-center rounded-lg gold-gradient">
            <Sparkles className="h-4 w-4 text-gold-foreground" />
          </div>
          <span className="font-display text-xl text-[oklch(0.95_0.025_90)]">InsightFlow</span>
        </div>
        <div className="relative">
          <h2 className="font-display text-4xl text-[oklch(0.95_0.025_90)] md:text-5xl">
            Sign in to your live analytics workspace.
          </h2>
          <p className="mt-4 text-[oklch(0.85_0.04_90)]/80">
            Real-time dashboards, AI insights, and team controls — ready when you are.
          </p>
        </div>
        <div className="relative text-xs text-[oklch(0.85_0.04_90)]/60">
          First account becomes the workspace admin.
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <h1 className="font-display text-3xl">Welcome</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in or create your account</p>

          <Tabs defaultValue="signin" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="si-password">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input id="si-password" name="password" type="password" autoComplete="current-password" required />
                </div>
                <Button type="submit" disabled={loading} className="w-full gold-gradient text-gold-foreground hover:opacity-90">
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <div className="pt-4">
                <h2 className="font-display text-xl">Create your InsightFlow account</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start analyzing your business data with AI-powered insights
                </p>
              </div>
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-password">Password</Label>
                  <Input
                    id="su-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {[
                      { key: "min", label: "At least 8 characters" },
                      { key: "upper", label: "Uppercase letter" },
                      { key: "number", label: "Number" },
                      { key: "symbol", label: "Symbol" },
                    ].map((req) => {
                      const met = meetsRequirement(signupPassword, req.key);
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
                  <Label htmlFor="su-confirm">Confirm password</Label>
                  <Input
                    id="su-confirm"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full gold-gradient text-gold-foreground hover:opacity-90">
                  {loading ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
