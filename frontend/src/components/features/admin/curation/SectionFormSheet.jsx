"use client";

/**
 * Add or edit a Home section (roadmap Day 9 Curation): hero banner (image,
 * link), featured songs, featured artists or an editorial playlist, with an
 * optional start / end date. The type can't change after creation.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Image as ImageIcon, Link2, Type } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import CheckboxField from "@/components/ui/CheckboxField";
import FormAlert from "@/components/ui/FormAlert";
import SelectField from "@/components/ui/SelectField";
import TextField from "@/components/ui/TextField";
import ItemPicker from "@/components/features/admin/curation/ItemPicker";
import {
  createHomeSection,
  getEditorialPlaylists,
  updateHomeSection,
} from "@/services/adminConsole.service";
import { QUERY_KEYS } from "@/utils/constants";

export const SECTION_TYPES = [
  { value: "hero", label: "Hero banner" },
  { value: "featuredTracks", label: "Featured songs" },
  { value: "featuredArtists", label: "Featured artists" },
  { value: "editorial", label: "Editorial playlist" },
];

/** "2026-11-01T00:00" for <input type="datetime-local"> */
const toLocalInput = (value) =>
  value
    ? new Date(new Date(value).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Object|null} [props.section] - Edit this one; null to add
 * @param {() => void} props.onSaved
 */
export default function SectionFormSheet({ open, onClose, section = null, onSaved }) {
  const [type, setType] = useState(section?.type ?? "hero");
  const [title, setTitle] = useState(section?.title ?? "");
  const [subtitle, setSubtitle] = useState(section?.subtitle ?? "");
  const [imageUrl, setImageUrl] = useState(section?.imageUrl ?? "");
  const [link, setLink] = useState(section?.link ?? "");
  const [playlistId, setPlaylistId] = useState(section?.playlistId ?? "");
  const [items, setItems] = useState(
    section?.items.map((item) => ({ id: item.id, label: item.label })) ?? []
  );
  const [active, setActive] = useState(section?.active ?? true);
  const [startsAt, setStartsAt] = useState(toLocalInput(section?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(section?.endsAt));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const editorial = useQuery({
    queryKey: QUERY_KEYS.adminEditorial,
    queryFn: ({ signal }) => getEditorialPlaylists({ signal }),
    enabled: open && type === "editorial",
  });

  const save = async () => {
    setFormError(null);
    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      active,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      ...(type === "hero" && { imageUrl: imageUrl.trim() || null, link: link.trim() || null }),
      ...((type === "featuredTracks" || type === "featuredArtists") && {
        itemIds: items.map((item) => item.id),
      }),
      ...(type === "editorial" && {
        playlistId: playlistId || editorial.data?.items[0]?.id || null,
      }),
    };
    if (!payload.title) return setErrors({ title: "Enter a title" });
    setIsSaving(true);
    try {
      if (section) await updateHomeSection(section.id, payload);
      else await createHomeSection({ type, ...payload });
      onSaved();
    } catch (error) {
      setErrors(error?.details?.fields ?? {});
      setFormError(error?.message ?? "Couldn't save the section");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!isSaving}
      title={section ? `Edit "${section.title}"` : "New Home section"}
      className="sm:max-w-2xl"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={save} loading={isSaving}>
            {section ? "Save" : "Add section"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormAlert message={formError} />
        {!section && (
          <SelectField
            label="Type"
            options={SECTION_TYPES}
            value={type}
            onChange={(event) => setType(event.target.value)}
          />
        )}
        <TextField
          label="Title"
          icon={Type}
          value={title}
          maxLength={80}
          onChange={(event) => setTitle(event.target.value)}
          error={errors.title}
        />
        <TextField
          label="Subtitle (optional)"
          value={subtitle}
          maxLength={160}
          onChange={(event) => setSubtitle(event.target.value)}
          error={errors.subtitle}
        />
        {type === "hero" && (
          <>
            <TextField
              label="Banner image (https link)"
              icon={ImageIcon}
              type="url"
              placeholder="https://res.cloudinary.com/…"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              error={errors.imageUrl}
            />
            <TextField
              label="Button link (app path or https)"
              icon={Link2}
              placeholder="/browse/vibe/chill"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              error={errors.link}
            />
          </>
        )}
        {type === "featuredTracks" && (
          <ItemPicker kind="tracks" value={items} onChange={setItems} />
        )}
        {type === "featuredArtists" && (
          <ItemPicker kind="artists" value={items} onChange={setItems} />
        )}
        {type === "editorial" &&
          (editorial.data?.items.length ? (
            <SelectField
              label="Playlist"
              options={editorial.data.items.map((playlist) => ({
                value: playlist.id,
                label: `${playlist.name} (${playlist.trackCount} songs)`,
              }))}
              value={playlistId || editorial.data.items[0].id}
              onChange={(event) => setPlaylistId(event.target.value)}
              error={errors.playlistId}
            />
          ) : (
            <p className="rounded-card border border-dashed border-line p-3 text-sm text-fg-muted">
              Create an editorial playlist first (Editorial playlists tab).
            </p>
          ))}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Show from (optional)"
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
          <TextField
            label="Show until (optional)"
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            error={errors.endsAt}
          />
        </div>
        <CheckboxField checked={active} onChange={setActive} label="Show on Home" />
      </div>
    </Sheet>
  );
}
