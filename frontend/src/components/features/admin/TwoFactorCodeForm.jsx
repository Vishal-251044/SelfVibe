"use client";

/**
 * Shared code entry for 2FA: a 6-digit authenticator code, or (optionally) a
 * backup code. Submits to /admin/auth/2fa/verify.
 */
import { useState } from "react";
import { KeyRound } from "lucide-react";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import * as adminAuthService from "@/services/adminAuth.service";
import { validateTwoFactorCode } from "@/utils/validators";

/**
 * @param {Object} props
 * @param {string} props.challengeToken
 * @param {(result: Object) => void} props.onSuccess - Receives { staff, accessToken, backupCodes? }
 * @param {() => void} props.onExpired - Challenge expired: go back to the password step
 * @param {boolean} [props.allowBackupCode=false] - Show the "use a backup code" switch
 * @param {string} [props.submitLabel="Verify"]
 */
export default function TwoFactorCodeForm({
  challengeToken,
  onSuccess,
  onExpired,
  allowBackupCode = false,
  submitLabel = "Verify",
}) {
  const [code, setCode] = useState("");
  const [isBackupMode, setIsBackupMode] = useState(false);
  const [fieldError, setFieldError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    // Authenticator codes are digits only; backup codes allow letters and a dash
    const raw = event.target.value;
    setCode(isBackupMode ? raw.toUpperCase().slice(0, 9) : raw.replace(/\D/g, "").slice(0, 6));
    setFieldError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const error = validateTwoFactorCode(code, isBackupMode);
    if (error) {
      setFieldError(error);
      return;
    }

    setIsSubmitting(true);
    try {
      onSuccess(await adminAuthService.verifyTwoFactor({ challengeToken, code: code.trim() }));
    } catch (apiError) {
      setIsSubmitting(false);
      setCode("");
      if (apiError?.code === "TOKEN_EXPIRED") {
        onExpired();
        return;
      }
      setFormError(apiError?.message ?? "Verification failed. Try again.");
    }
  };

  const toggleMode = () => {
    setIsBackupMode((mode) => !mode);
    setCode("");
    setFieldError(null);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <TextField
        label={isBackupMode ? "Backup code" : "6-digit code"}
        name="code"
        icon={KeyRound}
        value={code}
        onChange={handleChange}
        error={fieldError}
        placeholder={isBackupMode ? "ABCD-EFGH" : "123 456"}
        inputMode={isBackupMode ? "text" : "numeric"}
        autoComplete="one-time-code"
        autoFocus
        inputClassName="font-mono text-lg tracking-[0.35em] sm:text-lg"
      />
      <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
        {isSubmitting ? "Verifying…" : submitLabel}
      </Button>
      {allowBackupCode && (
        <button
          type="button"
          onClick={toggleMode}
          className="mx-auto flex min-h-11 items-center text-sm text-fg-muted hover:text-neon"
        >
          {isBackupMode
            ? "Use the authenticator app instead"
            : "Lost your phone? Use a backup code"}
        </button>
      )}
    </form>
  );
}
