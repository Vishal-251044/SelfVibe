"use client";

/**
 * Edit a track's details in the Admin Console: metadata, artist, album,
 * featured flag and cover. Sends only what changed.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import CheckboxField from "@/components/ui/CheckboxField";
import FormAlert from "@/components/ui/FormAlert";
import SelectField from "@/components/ui/SelectField";
import CoverUploadField from "@/components/features/music/CoverUploadField";
import TrackMetadataFields, {
  metadataFromTrack,
  metadataToPayload,
  validateMetadata,
} from "@/components/features/music/TrackMetadataFields";
import ArtistPicker from "@/components/features/admin/music/ArtistPicker";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useTaxonomy } from "@/hooks/useTaxonomy";
import { getAdminArtist, updateAdminTrack } from "@/services/adminMusic.service";
import { QUERY_KEYS } from "@/utils/constants";

/**
 * Fields whose value differs from the original (arrays compared by content).
 * @param {Object} next
 * @param {Object} original
 * @returns {Object}
 */
function diff(next, original) {
  return Object.fromEntries(
    Object.entries(next).filter(
      ([key, value]) => JSON.stringify(value) !== JSON.stringify(original[key])
    )
  );
}

/**
 * @param {Object} props
 * @param {Object} props.track - Managed track
 */
export default function AdminTrackEditForm({ track }) {
  const queryClient = useQueryClient();
  const taxonomy = useTaxonomy("staff");
  const cover = useMediaUpload({ kind: "image", scope: "staff" });
  const [values, setValues] = useState(() => metadataFromTrack(track));
  const [artist, setArtist] = useState(track.artist);
  const [albumId, setAlbumId] = useState(track.albumId ?? "");
  const [featured, setFeatured] = useState(track.featured);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ tone: "error", text: null });
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateMetadata(values);
    if (!artist) nextErrors.artistId = "Choose an artist";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const changes = {
      ...diff(metadataToPayload(values), metadataToPayload(metadataFromTrack(track))),
      ...(artist.id !== track.artistId && { artistId: artist.id }),
      ...((albumId || null) !== (track.albumId ?? null) && { albumId: albumId || null }),
      ...(featured !== track.featured && { featured }),
      ...(cover.status === "done" && { coverKey: cover.key }),
    };
    if (Object.keys(changes).length === 0) {
      setMessage({ tone: "info", text: "Nothing changed." });
      return;
    }

    setIsSaving(true);
    setMessage({ tone: "error", text: null });
    try {
      const { track: updated } = await updateAdminTrack(track.id, changes);
      queryClient.setQueryData(QUERY_KEYS.adminTrack(track.id), { track: updated });
      queryClient.invalidateQueries({ queryKey: ["admin", "tracks"] });
      cover.reset();
      setMessage({ tone: "success", text: "Saved." });
    } catch (error) {
      if (error?.details?.fields) setErrors(error.details.fields);
      setMessage({ tone: "error", text: error?.message ?? "Couldn't save. Try again." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-card border border-line bg-surface p-5 sm:p-6"
      aria-labelledby="details-heading"
    >
      <h2 id="details-heading" className="font-display text-lg font-bold">
        Details
      </h2>
      <FormAlert message={message.text} tone={message.tone} />
      <ArtistPicker
        value={artist}
        onChange={(picked) => {
          setArtist(picked);
          setAlbumId("");
        }}
        error={errors.artistId}
      />
      {artist && (
        <SelectField
          label="Album"
          placeholder="No album"
          options={albums.map((album) => ({ value: album.id, label: album.title }))}
          value={albumId}
          onChange={(event) => setAlbumId(event.target.value)}
          error={errors.albumId}
        />
      )}
      <TrackMetadataFields values={values} onChange={update} errors={errors} taxonomy={taxonomy} />
      <CoverUploadField upload={cover} currentUrl={track.coverUrl} label="Cover art" />
      <CheckboxField
        checked={featured}
        onChange={setFeatured}
        label="Featured"
        description="Eligible for the home page and editorial picks."
      />
      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={isSaving}
        disabled={cover.status === "uploading"}
      >
        <Save size={18} aria-hidden /> Save changes
      </Button>
    </form>
  );
}
