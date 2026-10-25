"use client";

/**
 * Create or edit an editorial playlist (e.g. "SelfVibe Code Mode"): name,
 * description, public / hidden and its songs in order.
 */
import { useState } from "react";
import { ListMusic } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import CheckboxField from "@/components/ui/CheckboxField";
import FormAlert from "@/components/ui/FormAlert";
import TextAreaField from "@/components/ui/TextAreaField";
import TextField from "@/components/ui/TextField";
import ItemPicker from "@/components/features/admin/curation/ItemPicker";
import { createEditorialPlaylist, updateEditorialPlaylist } from "@/services/adminConsole.service";

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Object|null} [props.playlist] - Edit this one; null to create
 * @param {Array<{ id: string, label: string }>} [props.initialTracks] - Song labels when editing
 * @param {() => void} props.onSaved
 */
export default function EditorialFormSheet({
  open,
  onClose,
  playlist = null,
  initialTracks = [],
  onSaved,
}) {
  const [name, setName] = useState(playlist?.name ?? "");
  const [description, setDescription] = useState(playlist?.description ?? "");
  const [isPublic, setIsPublic] = useState(playlist?.isPublic ?? true);
  const [tracks, setTracks] = useState(initialTracks);
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return setFormError("Give the playlist a name");
    setFormError(null);
    setIsSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim(),
      isPublic,
      trackIds: tracks.map((track) => track.id),
    };
    try {
      if (playlist) await updateEditorialPlaylist(playlist.id, payload);
      else await createEditorialPlaylist(payload);
      onSaved();
    } catch (error) {
      setFormError(error?.message ?? "Couldn't save the playlist");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!isSaving}
      title={playlist ? `Edit ${playlist.name}` : "New editorial playlist"}
      description="Shown as made by SelfVibe. Listeners can play and save it but not edit it."
      className="sm:max-w-2xl"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={save} loading={isSaving}>
            {playlist ? "Save" : "Create playlist"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormAlert message={formError} />
        <TextField
          label="Name"
          icon={ListMusic}
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
        />
        <TextAreaField
          label="Description"
          value={description}
          maxLength={500}
          rows={2}
          onChange={(event) => setDescription(event.target.value)}
        />
        <CheckboxField
          checked={isPublic}
          onChange={setIsPublic}
          label="Public"
          description="Hidden playlists can't be opened by listeners or shown on Home."
        />
        <ItemPicker kind="tracks" value={tracks} onChange={setTracks} max={200} />
      </div>
    </Sheet>
  );
}
