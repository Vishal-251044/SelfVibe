"use client";

/**
 * Create or edit an album / EP / single for an artist: title, type, release
 * date and cover.
 */
import { useState } from "react";
import { Disc3 } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import SelectField from "@/components/ui/SelectField";
import TextField from "@/components/ui/TextField";
import CoverUploadField from "@/components/features/music/CoverUploadField";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { createAdminAlbum, updateAdminAlbum } from "@/services/adminMusic.service";
import { ALBUM_TYPES } from "@/utils/musicConstants";

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.artistId
 * @param {Object|null} [props.album] - Edit this album; null to create
 * @param {(album: Object) => void} props.onSaved
 */
export default function AlbumFormSheet({ open, onClose, artistId, album = null, onSaved }) {
  const cover = useMediaUpload({ kind: "image", scope: "staff" });
  const [values, setValues] = useState({
    title: album?.title ?? "",
    type: album?.type ?? "album",
    releaseDate: album?.releaseDate ? String(album.releaseDate).slice(0, 10) : "",
  });
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const update = (field, value) => setValues((current) => ({ ...current, [field]: value }));

  const handleSave = async () => {
    if (!values.title.trim()) {
      setError("Enter a title");
      return;
    }
    if (cover.status === "uploading") {
      setError("Wait for the cover to finish uploading.");
      return;
    }
    const payload = {
      title: values.title.trim(),
      type: values.type,
      releaseDate: values.releaseDate || null,
      ...(cover.status === "done" && { coverKey: cover.key }),
    };
    setIsSaving(true);
    setError(null);
    try {
      const result = album
        ? await updateAdminAlbum(album.id, payload)
        : await createAdminAlbum({ artistId, ...payload });
      onSaved(result.album);
    } catch (requestError) {
      setError(requestError?.message ?? "Couldn't save the album. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!isSaving}
      title={album ? `Edit ${album.title}` : "New album"}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            {album ? "Save" : "Create"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <FormAlert message={error} />
        <TextField
          label="Title"
          icon={Disc3}
          value={values.title}
          maxLength={150}
          onChange={(event) => update("title", event.target.value)}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Type"
            options={ALBUM_TYPES}
            value={values.type}
            onChange={(event) => update("type", event.target.value)}
          />
          <TextField
            label="Release date"
            type="date"
            value={values.releaseDate}
            onChange={(event) => update("releaseDate", event.target.value)}
          />
        </div>
        <CoverUploadField upload={cover} currentUrl={album?.coverUrl ?? null} />
      </div>
    </Sheet>
  );
}
