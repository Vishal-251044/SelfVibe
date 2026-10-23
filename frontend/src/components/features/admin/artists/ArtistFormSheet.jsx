"use client";

/**
 * Create or edit an official artist (PRD MUS-4) in a sheet: name, photo,
 * bio, country, genres, vibes, website and verified badge.
 */
import { useState } from "react";
import { Globe, MapPin, Mic2 } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import ChipPicker from "@/components/ui/ChipPicker";
import CheckboxField from "@/components/ui/CheckboxField";
import FormAlert from "@/components/ui/FormAlert";
import TextField from "@/components/ui/TextField";
import TextAreaField from "@/components/ui/TextAreaField";
import CoverUploadField from "@/components/features/music/CoverUploadField";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useTaxonomy } from "@/hooks/useTaxonomy";
import { createAdminArtist, updateAdminArtist } from "@/services/adminMusic.service";

/**
 * Form values from an artist (or blanks for a new one).
 * @param {Object|null} artist
 * @returns {Object}
 */
function toValues(artist) {
  return {
    stageName: artist?.stageName ?? "",
    bio: artist?.bio ?? "",
    country: artist?.country ?? "",
    genres: artist?.genres ?? [],
    vibes: artist?.vibes ?? [],
    website: artist?.socials?.website ?? "",
    verified: Boolean(artist?.verified),
  };
}

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Object|null} [props.artist] - Edit this artist; null to create
 * @param {(artist: Object) => void} props.onSaved
 */
export default function ArtistFormSheet({ open, onClose, artist = null, onSaved }) {
  const taxonomy = useTaxonomy("staff");
  const photo = useMediaUpload({ kind: "image", scope: "staff" });
  const [values, setValues] = useState(() => toValues(artist));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const update = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSave = async () => {
    setFormError(null);
    const stageName = values.stageName.trim();
    const country = values.country.trim().toUpperCase();
    const nextErrors = {};
    if (stageName.length < 2) nextErrors.stageName = "Use at least 2 characters";
    if (country && !/^[A-Z]{2}$/.test(country)) nextErrors.country = "Use a 2-letter code, e.g. IN";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (photo.status === "uploading") {
      setFormError("Wait for the photo to finish uploading.");
      return;
    }

    const payload = {
      stageName,
      bio: values.bio.trim(),
      country: country || null,
      genres: values.genres,
      vibes: values.vibes,
      verified: values.verified,
      socials: { website: values.website.trim() },
      ...(photo.status === "done" && { avatarKey: photo.key }),
    };

    setIsSaving(true);
    try {
      const result = artist
        ? await updateAdminArtist(artist.id, payload)
        : await createAdminArtist(payload);
      photo.reset();
      onSaved(result.artist);
    } catch (error) {
      if (error?.details?.fields) setErrors(error.details.fields);
      setFormError(error?.message ?? "Couldn't save the artist. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!isSaving}
      title={artist ? `Edit ${artist.stageName}` : "New artist"}
      description={
        artist ? undefined : "Official artists have no user account — staff manage their tracks."
      }
      className="sm:max-w-2xl"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            {artist ? "Save" : "Create artist"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <FormAlert message={formError} />
        <TextField
          label="Stage name"
          icon={Mic2}
          value={values.stageName}
          maxLength={60}
          onChange={(event) => update("stageName", event.target.value)}
          error={errors.stageName}
        />
        <CoverUploadField upload={photo} currentUrl={artist?.avatar ?? null} label="Photo" />
        <TextAreaField
          label="Bio"
          value={values.bio}
          maxLength={1000}
          rows={3}
          onChange={(event) => update("bio", event.target.value)}
          error={errors.bio}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Country code"
            icon={MapPin}
            value={values.country}
            maxLength={2}
            placeholder="IN"
            autoCapitalize="characters"
            onChange={(event) => update("country", event.target.value)}
            error={errors.country}
          />
          <TextField
            label="Website"
            icon={Globe}
            type="url"
            value={values.website}
            placeholder="https://"
            onChange={(event) => update("website", event.target.value)}
            error={errors["socials.website"] ?? errors.socials}
          />
        </div>
        <ChipPicker
          label="Genres"
          options={taxonomy.genres}
          value={values.genres}
          max={5}
          loading={taxonomy.isPending}
          onChange={(genres) => update("genres", genres)}
          error={errors.genres}
        />
        <ChipPicker
          label="Vibes"
          options={taxonomy.vibes}
          value={values.vibes}
          max={5}
          loading={taxonomy.isPending}
          onChange={(vibes) => update("vibes", vibes)}
          error={errors.vibes}
        />
        <CheckboxField
          checked={values.verified}
          onChange={(checked) => update("verified", checked)}
          label="Verified artist"
          description="Shows the verified badge on the artist page and tracks."
        />
      </div>
    </Sheet>
  );
}
