"use client";

/**
 * Creator upload (/creator/upload, PRD CRT-2 / CRT-3 / CRT-6):
 * audio (required) and cover (optional) upload straight to storage while the
 * creator fills in the details; the rights checkbox is required. After submit
 * the track is processed in the background and appears in the studio.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import CheckboxField from "@/components/ui/CheckboxField";
import AudioUploadField from "@/components/features/music/AudioUploadField";
import CoverUploadField from "@/components/features/music/CoverUploadField";
import TrackMetadataFields, {
  EMPTY_TRACK_METADATA,
  metadataToPayload,
  titleFromFileName,
  validateMetadata,
} from "@/components/features/music/TrackMetadataFields";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useTaxonomy } from "@/hooks/useTaxonomy";
import { createMyTrack } from "@/services/track.service";
import { fadeUp } from "@/utils/animations";

export default function TrackUploadForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const taxonomy = useTaxonomy("user");
  const audio = useMediaUpload({ kind: "audio" });
  const cover = useMediaUpload({ kind: "image" });
  const [values, setValues] = useState(EMPTY_TRACK_METADATA);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createdTitle, setCreatedTitle] = useState(null);

  const update = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  // Start uploading right away; suggest a title from the file name
  const startAudio = (file) => {
    audio.start(file);
    setErrors((current) => ({ ...current, audioKey: undefined }));
    if (!values.title.trim()) update("title", titleFromFileName(file.name));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const nextErrors = validateMetadata(values);
    if (!audio.file) nextErrors.audioKey = "Add your audio file";
    else if (audio.status === "error") nextErrors.audioKey = audio.error;
    if (!rightsConfirmed) nextErrors.rightsConfirmed = "Confirm you own the rights to this audio";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Check the highlighted fields.");
      return;
    }
    if (audio.status === "uploading" || cover.status === "uploading") {
      setFormError("Wait for the upload to finish.");
      return;
    }

    setIsSaving(true);
    try {
      await createMyTrack({
        ...metadataToPayload(values),
        audioKey: audio.key,
        coverKey: cover.status === "done" ? cover.key : null,
        rightsConfirmed: true,
      });
      queryClient.invalidateQueries({ queryKey: ["creator", "tracks"] });
      setCreatedTitle(values.title.trim());
    } catch (error) {
      if (error?.details?.fields) setErrors(error.details.fields);
      setFormError(error?.message ?? "Couldn't add your track. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    audio.reset();
    cover.reset();
    setValues(EMPTY_TRACK_METADATA);
    setRightsConfirmed(false);
    setErrors({});
    setCreatedTitle(null);
  };

  return (
    <AnimatePresence mode="wait">
      {createdTitle ? (
        <motion.div
          key="done"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="mx-auto flex max-w-lg flex-col items-center rounded-card border border-line-strong bg-surface px-6 py-12 text-center shadow-panel"
        >
          <CheckCircle2 size={52} className="text-neon" aria-hidden />
          <h2 className="mt-5 font-display text-2xl font-bold">Upload received</h2>
          <p className="mt-2 text-sm text-fg-muted">
            &ldquo;{createdTitle}&rdquo; is processing. It goes live automatically when it&apos;s
            ready — usually within a minute.
          </p>
          <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
            <Button variant="outline" onClick={resetForm}>
              Upload another
            </Button>
            <Button onClick={() => router.push("/creator")}>Go to studio</Button>
          </div>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onSubmit={handleSubmit}
          noValidate
          className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-8"
        >
          <div className="space-y-5">
            <AudioUploadField
              upload={{ ...audio, start: startAudio }}
              error={errors.audioKey}
              disabled={isSaving}
            />
            <CoverUploadField upload={cover} disabled={isSaving} />
          </div>

          <div className="space-y-5 rounded-card border border-line bg-surface p-5 sm:p-6">
            <FormAlert message={formError} />
            <TrackMetadataFields
              values={values}
              onChange={update}
              errors={errors}
              taxonomy={taxonomy}
            />
            <CheckboxField
              checked={rightsConfirmed}
              onChange={(checked) => {
                setRightsConfirmed(checked);
                setErrors((current) => ({ ...current, rightsConfirmed: undefined }));
              }}
              label="I own this music or have the rights to share it"
              description="Uploading someone else's music can get the track taken down and your account suspended."
              error={errors.rightsConfirmed}
            />
            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={isSaving}
              disabled={audio.status === "uploading" || cover.status === "uploading"}
            >
              <ShieldCheck size={18} aria-hidden />
              {audio.status === "uploading" ? `Uploading ${audio.progress}%…` : "Publish track"}
            </Button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
