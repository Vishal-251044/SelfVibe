"use client";

/**
 * Release choice for new tracks (PRD MUS-3): publish when ready, schedule for
 * a date and time, or keep as a draft.
 */
import { CalendarClock } from "lucide-react";
import TextField from "@/components/ui/TextField";
import { RELEASE_OPTIONS } from "@/utils/musicConstants";
import { cn } from "@/utils/genericFunctions";

/**
 * Value for <input type="datetime-local"> one hour from now (local time).
 * @returns {string}
 */
export function defaultScheduleValue() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * @param {Object} props
 * @param {"publish"|"schedule"|"draft"} props.intent
 * @param {string} props.scheduledAt - datetime-local value
 * @param {(intent: string) => void} props.onIntentChange
 * @param {(value: string) => void} props.onScheduledAtChange
 * @param {string} [props.error]
 */
export default function ReleaseFields({
  intent,
  scheduledAt,
  onIntentChange,
  onScheduledAtChange,
  error,
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm text-fg-muted">Release</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {RELEASE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-control border px-3.5 text-sm transition",
              intent === option.value
                ? "border-neon bg-neon-dim text-fg"
                : "border-line bg-black text-fg-muted hover:border-line-strong"
            )}
          >
            <input
              type="radio"
              name="release-intent"
              value={option.value}
              checked={intent === option.value}
              onChange={() => onIntentChange(option.value)}
              className="size-4 accent-neon"
            />
            {option.label}
          </label>
        ))}
      </div>
      {intent === "schedule" && (
        <TextField
          label="Release date and time (your time zone)"
          icon={CalendarClock}
          type="datetime-local"
          value={scheduledAt}
          onChange={(event) => onScheduledAtChange(event.target.value)}
          error={error}
        />
      )}
    </fieldset>
  );
}
