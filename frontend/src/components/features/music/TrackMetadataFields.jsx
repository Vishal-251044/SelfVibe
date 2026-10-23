"use client";

/**
 * Track metadata inputs shared by the creator upload form and the Admin
 * Console track form (PRD CRT-2): title, genres, vibes, mood, language,
 * explicit flag, BPM and lyrics.
 */
import { Music } from "lucide-react";
import TextField from "@/components/ui/TextField";
import TextAreaField from "@/components/ui/TextAreaField";
import SelectField from "@/components/ui/SelectField";
import ChipPicker from "@/components/ui/ChipPicker";
import CheckboxField from "@/components/ui/CheckboxField";
import { LANGUAGES, MAX_TRACK_GENRES, MAX_TRACK_VIBES, MOODS } from "@/utils/musicConstants";

/** Empty metadata for a new track. */
export const EMPTY_TRACK_METADATA = {
  title: "",
  genres: [],
  vibes: [],
  mood: "",
  language: "",
  explicit: false,
  bpm: "",
  lyrics: "",
};

/**
 * Metadata from an existing track (for edit forms).
 * @param {Object} track
 * @returns {typeof EMPTY_TRACK_METADATA}
 */
export function metadataFromTrack(track) {
  return {
    title: track.title ?? "",
    genres: track.genres ?? [],
    vibes: track.vibes ?? [],
    mood: track.mood ?? "",
    language: track.language ?? "",
    explicit: Boolean(track.explicit),
    bpm: track.bpm ? String(track.bpm) : "",
    lyrics: track.lyrics ?? "",
  };
}

/**
 * Convert form values to the API body (empty selects → null, BPM → number).
 * @param {typeof EMPTY_TRACK_METADATA} values
 * @returns {Object}
 */
export function metadataToPayload(values) {
  return {
    title: values.title.trim(),
    genres: values.genres,
    vibes: values.vibes,
    mood: values.mood || null,
    language: values.language || null,
    explicit: values.explicit,
    bpm: values.bpm ? Number(values.bpm) : null,
    lyrics: values.lyrics,
  };
}

/**
 * Client-side checks matching the API's rules.
 * @param {typeof EMPTY_TRACK_METADATA} values
 * @returns {Object<string, string>} field → message
 */
export function validateMetadata(values) {
  const errors = {};
  if (!values.title.trim()) errors.title = "Enter a title";
  if (values.genres.length === 0) errors.genres = "Pick at least one genre";
  if (values.bpm && (Number(values.bpm) < 20 || Number(values.bpm) > 300)) {
    errors.bpm = "BPM must be between 20 and 300";
  }
  return errors;
}

/**
 * @param {Object} props
 * @param {typeof EMPTY_TRACK_METADATA} props.values
 * @param {(field: string, value: any) => void} props.onChange
 * @param {Object<string, string>} props.errors
 * @param {{ genres: Object[], vibes: Object[], isPending: boolean }} props.taxonomy
 * @param {boolean} [props.showAdvanced=true] - BPM and lyrics
 */
export default function TrackMetadataFields({
  values,
  onChange,
  errors,
  taxonomy,
  showAdvanced = true,
}) {
  return (
    <div className="space-y-5">
      <TextField
        label="Title"
        icon={Music}
        value={values.title}
        maxLength={150}
        placeholder="Song title"
        onChange={(event) => onChange("title", event.target.value)}
        error={errors.title}
      />
      <ChipPicker
        label="Genres"
        options={taxonomy.genres}
        value={values.genres}
        max={MAX_TRACK_GENRES}
        loading={taxonomy.isPending}
        onChange={(genres) => onChange("genres", genres)}
        error={errors.genres}
      />
      <ChipPicker
        label="Vibes (optional)"
        options={taxonomy.vibes}
        value={values.vibes}
        max={MAX_TRACK_VIBES}
        loading={taxonomy.isPending}
        onChange={(vibes) => onChange("vibes", vibes)}
        error={errors.vibes}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Mood"
          placeholder="Not set"
          options={MOODS}
          value={values.mood}
          onChange={(event) => onChange("mood", event.target.value)}
          error={errors.mood}
        />
        <SelectField
          label="Language"
          placeholder="Not set"
          options={LANGUAGES}
          value={values.language}
          onChange={(event) => onChange("language", event.target.value)}
          error={errors.language}
        />
      </div>
      {showAdvanced && (
        <>
          <TextField
            label="BPM (optional)"
            type="number"
            inputMode="numeric"
            min={20}
            max={300}
            value={values.bpm}
            onChange={(event) => onChange("bpm", event.target.value)}
            error={errors.bpm}
          />
          <TextAreaField
            label="Lyrics (optional)"
            value={values.lyrics}
            maxLength={10000}
            rows={5}
            placeholder="Paste the lyrics"
            onChange={(event) => onChange("lyrics", event.target.value)}
            error={errors.lyrics}
          />
        </>
      )}
      <CheckboxField
        checked={values.explicit}
        onChange={(checked) => onChange("explicit", checked)}
        label="Explicit content"
        description="Strong language or adult themes. Listeners can filter explicit tracks."
      />
    </div>
  );
}

/**
 * Suggest a title from a file name: "my_song-final.mp3" → "My song final".
 * @param {string} fileName
 * @returns {string}
 */
export function titleFromFileName(fileName) {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
}
