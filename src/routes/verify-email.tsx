import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, MailCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const searchSchema = z.object({
  email: z.string().email(),
  mode: z.enum(["signup", "login", "reset"]).default("signup"),
});

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [
      { title: "Verify your email — InsightFlow" },
      { name: "description", content: "Enter the 6-digit verification code we emailed you." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: VerifyEmailPage,
});

const RESEND_SECONDS = 45;

function VerifyEmailPage() {
  const { email, mode } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  async function verify(token: string) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setVerifying(true);
    const verifyArgs =
      mode === "signup"
        ? ({ email, token, type: "signup" } as const)
        : mode === "reset"
        ? ({ email, token, type: "recovery" } as const)
        : ({ email, token, type: "email" } as const);
    const { error } = await supabase.auth.verifyOtp(verifyArgs);
    setVerifying(false);
    if (error) {
      submittedRef.current = false;
      setCode("");
      toast.error(error.message || "Invalid or expired code");
      return;
    }
    if (mode === "reset") {
      toast.success("Code verified — set a new password");
      navigate({ to: "/reset-password" });
      return;
    }
    toast.success(mode === "signup" ? "Account verified — welcome!" : "Signed in");
    navigate({ to: "/dashboard" });
  }

  useEffect(() => {
    if (code.length === 6 && !verifying) {
      void verify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function handleResend() {
    if (seconds > 0 || resending) return;
    setResending(true);
    const { error } =
      mode === "reset"
        ? await supabase.auth.resetPasswordForEmail(email)
        : await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setResending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("A new code is on its way");
    setSeconds(RESEND_SECONDS);
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
            One last step.
          </h2>
          <p className="mt-4 text-[oklch(0.85_0.04_90)]/80">
            Check your inbox for a 6-digit code. It expires in a few minutes.
          </p>
        </div>
        <div className="relative text-xs text-[oklch(0.85_0.04_90)]/60">
          Didn't get it? Check spam, or resend below.
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <Link to="/auth" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>

          <div className="mt-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl">Verify your email</h1>
              <p className="text-xs text-muted-foreground">Code sent to {email}</p>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                disabled={verifying}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              type="button"
              onClick={() => void verify(code)}
              disabled={code.length !== 6 || verifying}
              className="w-full gold-gradient text-gold-foreground hover:opacity-90"
            >
              {verifying ? "Verifying…" : "Verify & continue"}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              {seconds > 0 ? (
                <span>Resend code in {seconds}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {resending ? "Sending…" : "Resend code"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
