"use client";

/**
 * Release controls on the admin track page (PRD MUS-3): publish now,
 * unpublish, or schedule a release date.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import TextField from "@/components/ui/TextField";
import { defaultScheduleValue } from "@/components/features/admin/music/ReleaseFields";
import { changeAdminTrackRelease } from "@/services/adminMusic.service";
import { QUERY_KEYS } from "@/utils/constants";

/**
 * @param {Object} props
 * @param {Object} props.track - Managed track
 */
export default function TrackReleasePanel({ track }) {
  const queryClient = useQueryClient();
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleValue());
  const [isScheduling, setIsScheduling] = useState(false);
  const [localError, setLocalError] = useState(null);

  const mutation = useMutation({
    mutationFn: ({ action, at }) => changeAdminTrackRelease(track.id, action, at),
    onSuccess: ({ track: updated }) => {
      queryClient.setQueryData(QUERY_KEYS.adminTrack(track.id), { track: updated });
      queryClient.invalidateQueries({ queryKey: ["admin", "tracks"] });
      setIsScheduling(false);
    },
  });

  const isReady = track.bitrates?.length > 0;
  const isLive = track.status === "published";

  const schedule = () => {
    const date = new Date(scheduledAt);
    if (!scheduledAt || date <= new Date()) {
      setLocalError("Choose a future date and time");
      return;
    }
    setLocalError(null);
    mutation.mutate({ action: "schedule", at: date.toISOString() });
  };

  return (
    <section
      className="rounded-card border border-line bg-surface p-5"
      aria-labelledby="release-heading"
    >
      <h2 id="release-heading" className="mb-1 font-display text-lg font-bold">
        Release
      </h2>
      <p className="mb-4 text-sm text-fg-muted">
        {!isReady
          ? "Available once processing finishes."
          : isLive
            ? "Live for listeners."
            : track.status === "scheduled"
              ? `Goes live ${new Date(track.scheduledAt).toLocaleString()}.`
              : "Not visible to listeners."}
      </p>
      <FormAlert message={localError ?? mutation.error?.message ?? null} className="mb-3" />
      <div className="grid gap-3 sm:grid-cols-2">
        {isLive ? (
          <Button
            variant="outline"
            onClick={() => mutation.mutate({ action: "unpublish" })}
            loading={mutation.isPending && mutation.variables?.action === "unpublish"}
          >
            <EyeOff size={16} aria-hidden /> Unpublish
          </Button>
        ) : (
          <Button
            onClick={() => mutation.mutate({ action: "publish" })}
            disabled={!isReady}
            loading={mutation.isPending && mutation.variables?.action === "publish"}
          >
            <Eye size={16} aria-hidden /> Publish now
          </Button>
        )}
        <Button
          variant="outline"
          disabled={!isReady}
          onClick={() => setIsScheduling((open) => !open)}
        >
          <CalendarClock size={16} aria-hidden /> Schedule
        </Button>
      </div>
      {isScheduling && (
        <div className="mt-4 space-y-3">
          <TextField
            label="Release date and time (your time zone)"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
          <Button
            fullWidth
            onClick={schedule}
            loading={mutation.isPending && mutation.variables?.action === "schedule"}
          >
            Save schedule
          </Button>
        </div>
      )}
    </section>
  );
}
