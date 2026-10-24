"use client";

/**
 * Create or edit a playlist (PRD LIB-2): name, description, public / private
 * and (when editing) a cover image, or back to the song mosaic.
 */
import { useState } from "react";
import { ListMusic } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import CheckboxField from "@/components/ui/CheckboxField";
import FormAlert from "@/components/ui/FormAlert";
import TextField from "@/components/ui/TextField";
import TextAreaField from "@/components/ui/TextAreaField";
import CoverUploadField from "@/components/features/music/CoverUploadField";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { createPlaylist, updatePlaylist } from "@/services/playlist.service";

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Object|null} [props.playlist] - Edit this playlist; null to create
 * @param {(playlist: Object) => void} props.onSaved
 */
export default function PlaylistFormSheet({ open, onClose, playlist = null, onSaved }) {
  const cover = useMediaUpload({ kind: "image" });
  const [values, setValues] = useState({
    name: playlist?.name ?? "",
    description: playlist?.description ?? "",
    isPublic: playlist?.isPublic ?? false,
  });
  const [removeCover, setRemoveCover] = useState(false);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const update = (field, value) => setValues((current) => ({ ...current, [field]: value }));

  const save = async () => {
    const name = values.name.trim();
    if (!name) {
      setError("Give your playlist a name");
      return;
    }
    if (cover.status === "uploading") {
      setError("Wait for the cover to finish uploading.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const body = { name, description: values.description.trim(), isPublic: values.isPublic };
      let result;
      if (playlist) {
        if (cover.status === "done") body.coverKey = cover.key;
        else if (removeCover) body.coverKey = null;
        result = await updatePlaylist(playlist.id, body);
      } else {
        result = await createPlaylist(body);
      }
      onSaved(result.playlist);
    } catch (requestError) {
      setError(requestError?.message ?? "Couldn't save the playlist. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!isSaving}
      title={playlist ? "Edit playlist" : "New playlist"}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={save} loading={isSaving}>
            {playlist ? "Save" : "Create"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <FormAlert message={error} />
        <TextField
          label="Name"
          icon={ListMusic}
          value={values.name}
          maxLength={100}
          placeholder="My playlist"
          onChange={(event) => update("name", event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && save()}
        />
        <TextAreaField
          label="Description (optional)"
          value={values.description}
          maxLength={500}
          rows={3}
          onChange={(event) => update("description", event.target.value)}
        />
        <CheckboxField
          checked={values.isPublic}
          onChange={(checked) => update("isPublic", checked)}
          label="Public playlist"
          description="Anyone with the link can see and play it. Private playlists are only for you."
        />
        {playlist && (
          <div>
            <CoverUploadField
              upload={cover}
              currentUrl={removeCover ? null : (playlist.coverUrl ?? null)}
              label="Cover (optional)"
              hint="Without one, the playlist shows covers of its songs"
            />
            {playlist.coverUrl && !removeCover && cover.status !== "done" && (
              <button
                type="button"
                onClick={() => setRemoveCover(true)}
                className="mt-1 min-h-11 text-xs text-fg-subtle hover:text-danger"
              >
                Remove cover
              </button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
