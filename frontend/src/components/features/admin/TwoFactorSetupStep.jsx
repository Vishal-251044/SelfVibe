"use client";

/**
 * Console sign-in, first login only: enrol an authenticator app.
 * Fetches the QR code, shows the manual key, then asks for the first code.
 */
import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Copy } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import FormAlert from "@/components/ui/FormAlert";
import Button from "@/components/ui/Button";
import TwoFactorCodeForm from "@/components/features/admin/TwoFactorCodeForm";
import * as adminAuthService from "@/services/adminAuth.service";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

/**
 * @param {Object} props
 * @param {string} props.challengeToken
 * @param {(result: Object) => void} props.onSuccess
 * @param {() => void} props.onExpired
 */
export default function TwoFactorSetupStep({ challengeToken, onSuccess, onExpired }) {
  const [enrollment, setEnrollment] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const { copy, isCopied } = useCopyToClipboard();

  useEffect(() => {
    let isCancelled = false;
    adminAuthService
      .setupTwoFactor(challengeToken)
      .then((data) => !isCancelled && setEnrollment(data))
      .catch((error) => {
        if (isCancelled) return;
        if (error?.code === "TOKEN_EXPIRED") onExpired();
        else setLoadError(error?.message ?? "Could not start two-factor setup.");
      });
    return () => {
      isCancelled = true;
    };
  }, [challengeToken, onExpired, attempt]);

  return (
    <div>
      <p className="font-mono text-sm text-neon">$ selfvibe console --enrol-2fa</p>
      <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Secure your account</h1>
      <ol className="mt-3 space-y-1 text-sm text-fg-muted">
        <li>1. Open Google Authenticator, Authy or 1Password.</li>
        <li>2. Scan this QR code (or type the key).</li>
        <li>3. Enter the 6-digit code it shows.</li>
      </ol>

      {loadError ? (
        <div className="mt-6 space-y-4">
          <FormAlert message={loadError} />
          <Button variant="outline" fullWidth onClick={() => setAttempt((count) => count + 1)}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-4">
          {enrollment ? (
            <Image
              src={enrollment.qrCodeDataUrl}
              alt="QR code to add SelfVibe to your authenticator app"
              width={208}
              height={208}
              unoptimized
              className="rounded-xl border-4 border-white bg-white"
            />
          ) : (
            <Skeleton className="size-52 rounded-xl" />
          )}

          <div className="w-full rounded-control border border-line bg-black px-4 py-3">
            <p className="text-xs text-fg-subtle">Can&apos;t scan? Enter this key</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              {enrollment ? (
                <code className="text-sm break-all text-neon-soft">{enrollment.manualKey}</code>
              ) : (
                <Skeleton className="h-5 w-full" />
              )}
              <button
                type="button"
                onClick={() => enrollment && copy(enrollment.manualKey.replace(/\s/g, ""))}
                aria-label={isCopied ? "Key copied" : "Copy key"}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:bg-neon-dim hover:text-neon"
              >
                {isCopied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {enrollment && (
        <div className="mt-6">
          <TwoFactorCodeForm
            challengeToken={challengeToken}
            onSuccess={onSuccess}
            onExpired={onExpired}
            submitLabel="Turn on two-factor"
          />
        </div>
      )}
    </div>
  );
}
