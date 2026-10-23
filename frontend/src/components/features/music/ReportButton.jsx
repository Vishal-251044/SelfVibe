"use client";

/**
 * "Report" for a track or artist (PRD F32): opens a sheet with reasons and an
 * optional note. Guests are sent to log in first.
 */
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, Flag } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import TextAreaField from "@/components/ui/TextAreaField";
import { useAuthStore } from "@/store/authStore";
import { fileReport } from "@/services/report.service";
import { REPORT_REASONS } from "@/utils/musicConstants";
import { cn } from "@/utils/genericFunctions";

const DETAILS_MAX_LENGTH = 1000;

/**
 * @param {Object} props
 * @param {"track"|"artist"} props.targetType
 * @param {string} props.targetId
 * @param {string} props.targetName - Shown in the sheet title
 * @param {"icon"|"button"} [props.variant="icon"]
 */
export default function ReportButton({ targetType, targetId, targetName, variant = "icon" }) {
  const router = useRouter();
  const pathname = usePathname();
  const isSignedIn = useAuthStore((state) => state.status === "authenticated");
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const open = () => {
    if (!isSignedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setIsSent(false);
    setError(null);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setReason("");
    setDetails("");
  };

  const submit = async () => {
    if (!reason) {
      setError("Choose a reason");
      return;
    }
    setIsSending(true);
    setError(null);
    try {
      await fileReport({ targetType, targetId, reason, details: details.trim() });
      setIsSent(true);
    } catch (requestError) {
      setError(requestError?.message ?? "Couldn't send your report. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={open}
          aria-label={`Report ${targetName}`}
          className="flex size-11 items-center justify-center rounded-full text-fg-subtle transition hover:bg-neon-dim hover:text-danger"
        >
          <Flag size={18} />
        </button>
      ) : (
        <Button variant="ghost" onClick={open}>
          <Flag size={16} aria-hidden />
          Report
        </Button>
      )}

      <Sheet
        open={isOpen}
        onClose={close}
        dismissible={!isSending}
        title={isSent ? "Thanks for letting us know" : `Report ${targetType}`}
        description={isSent ? undefined : `What's wrong with "${targetName}"?`}
        footer={
          isSent ? (
            <Button fullWidth onClick={close}>
              Done
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={close} disabled={isSending}>
                Cancel
              </Button>
              <Button onClick={submit} loading={isSending}>
                Send report
              </Button>
            </div>
          )
        }
      >
        {isSent ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 size={44} className="text-neon" aria-hidden />
            <p className="mt-4 max-w-sm text-sm text-fg-muted">
              Our moderation team will review it. If it breaks our rules, it will be taken down.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <FormAlert message={error} />
            <fieldset>
              <legend className="sr-only">Reason</legend>
              <div className="space-y-2">
                {REPORT_REASONS.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center gap-3 rounded-control border px-3.5 text-sm transition",
                      reason === option.value
                        ? "border-neon bg-neon-dim text-fg"
                        : "border-line bg-black text-fg-muted hover:border-line-strong"
                    )}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={option.value}
                      checked={reason === option.value}
                      onChange={() => {
                        setReason(option.value);
                        setError(null);
                      }}
                      className="size-4 accent-neon"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <TextAreaField
              label="Details (optional)"
              value={details}
              maxLength={DETAILS_MAX_LENGTH}
              placeholder="Links or anything that helps us check it"
              onChange={(event) => setDetails(event.target.value)}
            />
          </div>
        )}
      </Sheet>
    </>
  );
}
