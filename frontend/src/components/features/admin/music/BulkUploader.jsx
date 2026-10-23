"use client";

/**
 * Admin Console → Bulk upload (/admin/music/bulk, PRD MUS-2):
 * 1. drop up to 50 audio files (uploaded 3 at a time, with retry)
 * 2. optionally add a CSV with metadata per file (template provided)
 * 3. choose defaults for files without a CSV row, then start
 * The server matches files to CSV rows and reports each failed row.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileSpreadsheet, Files, Rocket, X } from "lucide-react";
import Button from "@/components/ui/Button";
import ChipPicker from "@/components/ui/ChipPicker";
import FileDropzone from "@/components/ui/FileDropzone";
import FormAlert from "@/components/ui/FormAlert";
import PageHeader from "@/components/ui/PageHeader";
import ArtistPicker from "@/components/features/admin/music/ArtistPicker";
import BulkFileList from "@/components/features/admin/music/BulkFileList";
import BulkResults from "@/components/features/admin/music/BulkResults";
import ReleaseFields, {
  defaultScheduleValue,
} from "@/components/features/admin/music/ReleaseFields";
import { useBulkFileUploads } from "@/hooks/useBulkFileUploads";
import { useTaxonomy } from "@/hooks/useTaxonomy";
import { getBulkUpload, startBulkUpload } from "@/services/adminMusic.service";
import { QUERY_KEYS } from "@/utils/constants";
import {
  AUDIO_UPLOAD,
  BULK_UPLOAD_MAX_FILES,
  MAX_TRACK_GENRES,
  MAX_TRACK_VIBES,
} from "@/utils/musicConstants";

const CSV_MAX_BYTES = 500_000;
const CSV_TEMPLATE = [
  "file_name,title,artist,album,genres,vibes,mood,language,explicit",
  "song-one.mp3,Song One,Artist Name,Album Name,pop;indie,happy;travel,happy,hindi,no",
].join("\n");
const BULK_POLL_MS = 2000;

export default function BulkUploader() {
  const queryClient = useQueryClient();
  const taxonomy = useTaxonomy("staff");
  const uploads = useBulkFileUploads();
  const [csv, setCsv] = useState(null); // { name, text, rows }
  const [defaults, setDefaults] = useState({ artist: null, genres: [], vibes: [] });
  const [release, setRelease] = useState({
    intent: "publish",
    scheduledAt: defaultScheduleValue(),
  });
  const [notice, setNotice] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [bulkId, setBulkId] = useState(null);

  const { data: bulkData } = useQuery({
    queryKey: QUERY_KEYS.adminBulk(bulkId),
    queryFn: ({ signal }) => getBulkUpload(bulkId, { signal }),
    enabled: Boolean(bulkId),
    refetchInterval: (query) =>
      ["done", "failed"].includes(query.state.data?.bulk?.status) ? false : BULK_POLL_MS,
  });

  const doneFiles = uploads.items.filter((item) => item.status === "done");
  const isUploading = uploads.items.some((item) => ["waiting", "uploading"].includes(item.status));

  const pickCsv = async ([file]) => {
    setFormError(null);
    if (!/\.csv$/i.test(file.name)) {
      setFormError("The metadata file must be a .csv");
      return;
    }
    if (file.size > CSV_MAX_BYTES) {
      setFormError("The CSV is too large (max 500 KB)");
      return;
    }
    const text = await file.text();
    const rows = Math.max(0, text.split(/\r?\n/).filter((line) => line.trim()).length - 1);
    setCsv({ name: file.name, text, rows });
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: "selfvibe-bulk-template.csv",
    });
    link.click();
    URL.revokeObjectURL(url);
  };

  const start = async () => {
    setFormError(null);
    if (doneFiles.length === 0) {
      setFormError("Upload at least one audio file first.");
      return;
    }
    if (isUploading) {
      setFormError("Wait for the uploads to finish.");
      return;
    }
    const scheduledAt = release.intent === "schedule" ? new Date(release.scheduledAt) : null;
    if (scheduledAt && scheduledAt <= new Date()) {
      setFormError("Choose a future release date.");
      return;
    }

    setIsStarting(true);
    try {
      const { bulkImportId } = await startBulkUpload({
        files: doneFiles.map((item) => ({ fileName: item.file.name, audioKey: item.key })),
        csvText: csv?.text ?? null,
        defaults: {
          artistId: defaults.artist?.id ?? null,
          genres: defaults.genres,
          vibes: defaults.vibes,
          releaseIntent: release.intent,
          scheduledAt: scheduledAt?.toISOString() ?? null,
        },
      });
      setBulkId(bulkImportId);
      queryClient.invalidateQueries({ queryKey: ["admin", "tracks"] });
    } catch (error) {
      setFormError(error?.message ?? "Couldn't start the bulk upload. Try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const startOver = () => {
    uploads.clear();
    setCsv(null);
    setBulkId(null);
    setNotice(null);
  };

  return (
    <>
      <Button href="/admin/music" variant="ghost" className="mb-2 -ml-3 px-3">
        <ArrowLeft size={16} aria-hidden /> Music
      </Button>
      <PageHeader
        eyebrow="selfvibe tracks --bulk"
        title="Bulk upload"
        subtitle={`Up to ${BULK_UPLOAD_MAX_FILES} audio files at once, with an optional CSV for titles, artists, albums and tags.`}
      />

      {bulkId ? (
        <BulkResults bulk={bulkData?.bulk} onStartOver={startOver} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <FileDropzone
              label={`Audio files (${uploads.items.length} / ${BULK_UPLOAD_MAX_FILES})`}
              hint={AUDIO_UPLOAD.label}
              accept={AUDIO_UPLOAD.accept}
              icon={Files}
              multiple
              disabled={uploads.items.length >= BULK_UPLOAD_MAX_FILES}
              onFiles={(files) => setNotice(uploads.addFiles(files))}
            />
            <FormAlert message={notice} tone="info" />
            {uploads.items.length > 0 && (
              <BulkFileList
                items={uploads.items}
                onRetry={uploads.retry}
                onRemove={uploads.remove}
              />
            )}
          </div>

          <div className="space-y-5 rounded-card border border-line bg-surface p-5 sm:p-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold">Metadata CSV</h2>
                <Button variant="ghost" onClick={downloadTemplate} className="-mr-3 px-3">
                  <Download size={16} aria-hidden /> Template
                </Button>
              </div>
              <p className="text-sm text-fg-muted">
                Rows match files by <code className="text-neon-soft">file_name</code>. Separate
                several genres or vibes with <code className="text-neon-soft">;</code>. New artists
                and albums are created automatically.
              </p>
              {csv ? (
                <div className="flex min-h-14 items-center gap-3 rounded-control border border-line-strong bg-black px-3">
                  <FileSpreadsheet size={20} className="shrink-0 text-neon" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {csv.name} · {csv.rows} rows
                  </span>
                  <button
                    type="button"
                    onClick={() => setCsv(null)}
                    aria-label="Remove CSV"
                    className="flex size-11 items-center justify-center rounded-full text-fg-subtle hover:text-danger"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <FileDropzone
                  label="CSV file (optional)"
                  hint=".csv · up to 500 KB"
                  accept=".csv,text/csv"
                  icon={FileSpreadsheet}
                  onFiles={pickCsv}
                  className="[&_button]:min-h-24"
                />
              )}
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-lg font-bold">Defaults</h2>
              <p className="-mt-2 text-sm text-fg-muted">
                Used for files without a CSV row (or empty cells).
              </p>
              <ArtistPicker
                label="Default artist"
                value={defaults.artist}
                onChange={(artist) => setDefaults((current) => ({ ...current, artist }))}
              />
              <ChipPicker
                label="Default genres"
                options={taxonomy.genres}
                value={defaults.genres}
                max={MAX_TRACK_GENRES}
                loading={taxonomy.isPending}
                onChange={(genres) => setDefaults((current) => ({ ...current, genres }))}
              />
              <ChipPicker
                label="Default vibes"
                options={taxonomy.vibes}
                value={defaults.vibes}
                max={MAX_TRACK_VIBES}
                loading={taxonomy.isPending}
                onChange={(vibes) => setDefaults((current) => ({ ...current, vibes }))}
              />
              <ReleaseFields
                intent={release.intent}
                scheduledAt={release.scheduledAt}
                onIntentChange={(intent) => setRelease((current) => ({ ...current, intent }))}
                onScheduledAtChange={(scheduledAt) =>
                  setRelease((current) => ({ ...current, scheduledAt }))
                }
              />
            </section>

            <FormAlert message={formError} />
            <Button
              size="lg"
              fullWidth
              onClick={start}
              loading={isStarting}
              disabled={isUploading || doneFiles.length === 0}
            >
              <Rocket size={18} aria-hidden />
              {isUploading
                ? `Uploading… ${doneFiles.length} / ${uploads.items.length}`
                : `Create ${doneFiles.length} ${doneFiles.length === 1 ? "track" : "tracks"}`}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
