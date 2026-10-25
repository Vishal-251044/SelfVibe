"use client";

/**
 * Reset password from an emailed link (/reset-password?token=…).
 * Checks the link first, so an expired link says so before the user types.
 */
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2Off, Lock } from "lucide-react";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import EmptyState from "@/components/ui/EmptyState";
import ScreenLoader from "@/components/ui/ScreenLoader";
import * as authService from "@/services/auth.service";
import { validateNewPassword } from "@/utils/validators";

export default function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  // "checking" → "ready" | "invalid"; a missing token is invalid right away
  const [linkStatus, setLinkStatus] = useState(token ? "checking" : "invalid");
  const [values, setValues] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    let isCancelled = false;
    authService
      .validateResetToken(token)
      .then(({ valid }) => !isCancelled && setLinkStatus(valid ? "ready" : "invalid"))
      .catch(() => !isCancelled && setLinkStatus("ready")); // network hiccup: let the submit decide
    return () => {
      isCancelled = true;
    };
  }, [token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const nextErrors = {
      password: validateNewPassword(values.password),
      confirm: values.confirm !== values.password ? "Passwords don't match" : undefined,
    };
    setErrors(nextErrors);
    if (nextErrors.password || nextErrors.confirm) return;

    setIsSubmitting(true);
    try {
      await authService.resetPassword({ token, password: values.password });
      router.replace("/login?reset=success");
    } catch (error) {
      if (error?.code === "RESET_TOKEN_INVALID") setLinkStatus("invalid");
      else if (error?.details?.fields?.password)
        setErrors({ password: error.details.fields.password });
      else setFormError(error?.message ?? "Something went wrong. Try again.");
      setIsSubmitting(false);
    }
  };

  if (linkStatus === "checking")
    return <ScreenLoader label="checking your link" className="min-h-80" />;

  if (linkStatus === "invalid") {
    return (
      <EmptyState
        icon={Link2Off}
        command="selfvibe reset --verify"
        title="link expired"
        description="This reset link is invalid, already used, or older than 30 minutes. Request a new one."
        action={<Button href="/forgot-password">Send a new link</Button>}
        className="border-0 bg-transparent px-0 py-4"
      />
    );
  }

  return (
    <div>
      <p className="font-mono text-sm text-neon">$ selfvibe reset --apply</p>
      <h1 className="mt-3 font-display text-3xl font-bold">Choose a new password</h1>
      <p className="mt-2 text-sm text-fg-muted">
        You&apos;ll be signed out on all devices, then you can log in with the new one.
      </p>

      <FormAlert message={formError} className="mt-6" />

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <TextField
          label="New password"
          name="password"
          type="password"
          icon={Lock}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
        />
        <TextField
          label="Confirm new password"
          name="confirm"
          type="password"
          icon={Lock}
          autoComplete="new-password"
          value={values.confirm}
          onChange={handleChange}
          error={errors.confirm}
        />
        <Button type="submit" size="lg" fullWidth loading={isSubmitting} className="mt-2">
          {isSubmitting ? "Saving…" : "Change password"}
        </Button>
      </form>
    </div>
  );
}
