"use client";

/**
 * Admin Console → Add track (/admin/music/new, PRD MUS-1): audio + cover
 * upload, artist and album, metadata, and release (publish / schedule / draft).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import PageHeader from "@/components/ui/PageHeader";
import SelectField from "@/components/ui/SelectField";
import AudioUploadField from "@/components/features/music/AudioUploadField";
import CoverUploadField from "@/components/features/music/CoverUploadField";
import TrackMetadataFields, {
  EMPTY_TRACK_METADATA,
  metadataToPayload,
  titleFromFileName,
  validateMetadata,
} from "@/components/features/music/TrackMetadataFields";
import ArtistPicker from "@/components/features/admin/music/ArtistPicker";
import ReleaseFields, {
  defaultScheduleValue,
} from "@/components/features/admin/music/ReleaseFields";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useTaxonomy } from "@/hooks/useTaxonomy";
import { createAdminTrack, getAdminArtist } from "@/services/adminMusic.service";
import { QUERY_KEYS } from "@/utils/constants";

export default function AdminTrackCreateForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const taxonomy = useTaxonomy("staff");
  const audio = useMediaUpload({ kind: "audio", scope: "staff" });
  const cover = useMediaUpload({ kind: "image", scope: "staff" });
  const [values, setValues] = useState(EMPTY_TRACK_METADATA);
  const [artist, setArtist] = useState(null);
  const [albumId, setAlbumId] = useState("");
  const [release, setRelease] = useState({
    intent: "publish",
    scheduledAt: defaultScheduleValue(),
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Albums of the chosen artist
  const { data: artistData } = useQuery({
    queryKey: QUERY_KEYS.adminArtist(artist?.id),
    queryFn: ({ signal }) => getAdminArtist(artist.id, { signal }),
    enabled: Boolean(artist?.id),
  });
  const albums = artistData?.albums ?? [];

  const update = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const startAudio = (file) => {
    audio.start(file);
    setErrors((current) => ({ ...current, audioKey: undefined }));
    if (!values.title.trim()) update("title", titleFromFileName(file.name));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const nextErrors = validateMetadata(values);
    if (!audio.file) nextErrors.audioKey = "Add the audio file";
    if (!artist) nextErrors.artistId = "Choose an artist";
    const scheduledAt =
      release.intent === "schedule" && release.scheduledAt ? new Date(release.scheduledAt) : null;
    if (release.intent === "schedule" && (!scheduledAt || scheduledAt <= new Date())) {
      nextErrors.scheduledAt = "Choose a future date and time";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Check the highlighted fields.");
      return;
    }
    if (audio.status !== "done" || cover.status === "uploading") {
      setFormError(audio.status === "error" ? audio.error : "Wait for the upload to finish.");
      return;
    }

    setIsSaving(true);
    try {
      const { track } = await createAdminTrack({
        ...metadataToPayload(values),
        artistId: artist.id,
        albumId: albumId || null,
        audioKey: audio.key,
        coverKey: cover.status === "done" ? cover.key : null,
        releaseIntent: release.intent,
        scheduledAt: scheduledAt?.toISOString() ?? null,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "tracks"] });
      router.push(`/admin/music/${track.id}`);
    } catch (error) {
      if (error?.details?.fields) setErrors(error.details.fields);
      setFormError(error?.message ?? "Couldn't add the track. Try again.");
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button href="/admin/music" variant="ghost" className="mb-2 -ml-3 px-3">
        <ArrowLeft size={16} aria-hidden /> Music
      </Button>
      <PageHeader
        eyebrow="selfvibe tracks --add"
        title="Add a track"
        subtitle="The file uploads while you fill in the details. Processing starts when you save."
      />
      <form
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
          <ArtistPicker
            value={artist}
            onChange={(picked) => {
              setArtist(picked);
              setAlbumId("");
              setErrors((current) => ({ ...current, artistId: undefined }));
            }}
            error={errors.artistId}
          />
          {artist && (
            <SelectField
              label="Album (optional)"
              placeholder={albums.length ? "No album" : "This artist has no albums yet"}
              options={albums.map((album) => ({ value: album.id, label: album.title }))}
              value={albumId}
              onChange={(event) => setAlbumId(event.target.value)}
              error={errors.albumId}
            />
          )}
          <TrackMetadataFields
            values={values}
            onChange={update}
            errors={errors}
            taxonomy={taxonomy}
          />
          <ReleaseFields
            intent={release.intent}
            scheduledAt={release.scheduledAt}
            onIntentChange={(intent) => setRelease((current) => ({ ...current, intent }))}
            onScheduledAtChange={(scheduledAt) =>
              setRelease((current) => ({ ...current, scheduledAt }))
            }
            error={errors.scheduledAt}
          />
          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={isSaving}
            disabled={audio.status === "uploading" || cover.status === "uploading"}
          >
            <Plus size={18} aria-hidden />
            {audio.status === "uploading" ? `Uploading ${audio.progress}%…` : "Add track"}
          </Button>
        </div>
      </form>
    </>
  );
}
