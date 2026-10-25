"use client";

/**
 * Forgot password: ask for the email, then confirm without revealing whether
 * the account exists (same message either way).
 */
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import * as authService from "@/services/auth.service";
import { validateEmail } from "@/utils/validators";
import { fadeUp } from "@/utils/animations";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const emailError = validateEmail(email);
    setFieldError(emailError ?? null);
    if (emailError) return;

    setIsSubmitting(true);
    try {
      await authService.requestPasswordReset(email.trim());
      setSentTo(email.trim());
    } catch (error) {
      setFormError(error?.message ?? "Something went wrong. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {sentTo ? (
        <motion.div key="sent" variants={fadeUp} initial="hidden" animate="visible" exit="hidden">
          <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-line-strong bg-neon-dim text-neon">
            <MailCheck size={26} aria-hidden />
          </div>
          <p className="font-mono text-sm text-neon">$ selfvibe reset --sent</p>
          <h1 className="mt-3 font-display text-3xl font-bold">Check your inbox</h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            If an account exists for <span className="break-all text-fg">{sentTo}</span>, we&apos;ve
            sent a link to reset your password. It works for 30 minutes.
          </p>
          <p className="mt-3 text-sm text-fg-muted">
            No email? Check spam, or{" "}
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="inline-flex min-h-11 items-center font-semibold text-neon hover:underline"
            >
              try another email
            </button>
            .
          </p>
          <Button href="/login" variant="outline" fullWidth className="mt-6">
            <ArrowLeft size={16} aria-hidden />
            Back to log in
          </Button>
        </motion.div>
      ) : (
        <motion.div key="form" variants={fadeUp} initial="hidden" animate="visible" exit="hidden">
          <p className="font-mono text-sm text-neon">$ selfvibe reset --request</p>
          <h1 className="mt-3 font-display text-3xl font-bold">Forgot your password?</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Enter your email and we&apos;ll send you a link to choose a new one.
          </p>

          <FormAlert message={formError} className="mt-6" />

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <TextField
              label="Email"
              name="email"
              type="email"
              icon={Mail}
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldError(null);
              }}
              error={fieldError}
            />
            <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-fg-muted">
            Remembered it?{" "}
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center font-semibold text-neon hover:underline"
            >
              Log in
            </Link>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
