/**
 * Status pill for a managed track: processing progress wins over release status.
 */
import Badge from "@/components/ui/Badge";
import { PROCESSING_META, TRACK_STATUS_META } from "@/utils/musicConstants";

/**
 * @param {Object} props
 * @param {{ status: string, processing?: { state: string }, scheduledAt?: string|null }} props.track
 */
export default function TrackStatusBadge({ track }) {
  const processingState = track.processing?.state;
  if (processingState === "queued" || processingState === "running") {
    return (
      <Badge tone="info" pulse>
        {PROCESSING_META[processingState].label}
      </Badge>
    );
  }
  if (processingState === "failed" && track.status === "processing") {
    return <Badge tone="danger">Failed</Badge>;
  }

  const meta = TRACK_STATUS_META[track.status] ?? { label: track.status, tone: "muted" };
  const scheduledLabel =
    track.status === "scheduled" && track.scheduledAt
      ? ` · ${new Date(track.scheduledAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
      : "";
  return (
    <Badge tone={meta.tone}>
      {meta.label}
      {scheduledLabel}
    </Badge>
  );
}
