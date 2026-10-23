"use client";

/**
 * Reprocess (optionally with a replacement audio file) and delete, on the
 * admin track page.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import FormAlert from "@/components/ui/FormAlert";
import AudioUploadField from "@/components/features/music/AudioUploadField";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { deleteAdminTrack, reprocessAdminTrack } from "@/services/adminMusic.service";
import { QUERY_KEYS } from "@/utils/constants";

/**
 * @param {Object} props
 * @param {Object} props.track
 * @param {boolean} props.canDelete
 */
export default function TrackMaintenancePanel({ track, canDelete }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const replacement = useMediaUpload({ kind: "audio", scope: "staff" });
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const isBusy = ["queued", "running"].includes(track.processing?.state);

  const reprocess = useMutation({
    mutationFn: () =>
      reprocessAdminTrack(track.id, replacement.status === "done" ? replacement.key : undefined),
    onSuccess: ({ track: updated }) => {
      queryClient.setQueryData(QUERY_KEYS.adminTrack(track.id), { track: updated });
      replacement.reset();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteAdminTrack(track.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tracks"] });
      router.replace("/admin/music");
    },
  });

  return (
    <section
      className="space-y-4 rounded-card border border-line bg-surface p-5"
      aria-labelledby="maintenance-heading"
    >
      <div>
        <h2 id="maintenance-heading" className="font-display text-lg font-bold">
          Audio
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Run processing again, or replace the audio file. Listeners keep the current version until
          the new one is ready.
        </p>
      </div>
      <AudioUploadField
        upload={replacement}
        label="Replacement file (optional)"
        disabled={isBusy}
      />
      <FormAlert message={reprocess.error?.message ?? null} />
      <Button
        variant="outline"
        fullWidth
        onClick={() => reprocess.mutate()}
        loading={reprocess.isPending}
        disabled={isBusy || replacement.status === "uploading"}
      >
        <RefreshCw size={16} aria-hidden />
        {replacement.status === "done" ? "Replace and reprocess" : "Reprocess"}
      </Button>

      {canDelete && (
        <>
          <hr className="border-line" />
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setIsConfirmingDelete(true)}
            className="text-danger hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 size={16} aria-hidden /> Delete track
          </Button>
        </>
      )}
      <ConfirmSheet
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={() => remove.mutate()}
        loading={remove.isPending}
        error={remove.error?.message ?? null}
        title={`Delete "${track.title}"?`}
        description="The track and all its audio files are removed for good. This is recorded in the audit log."
      />
    </section>
  );
}
