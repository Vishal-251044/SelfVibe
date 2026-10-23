"use client";

/**
 * Result of a bulk import: progress while the server creates tracks, then a
 * created / failed summary with the reason for every failed row.
 */
import Link from "next/link";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";

/**
 * @param {Object} props
 * @param {{ status: string, total: number, results: Object[], error: string|null }|undefined} props.bulk
 * @param {() => void} props.onStartOver
 */
export default function BulkResults({ bulk, onStartOver }) {
  const isRunning = !bulk || bulk.status === "queued" || bulk.status === "running";
  if (isRunning) {
    return (
      <section
        className="flex flex-col items-center rounded-card border border-line-strong bg-surface px-6 py-12 text-center"
        aria-live="polite"
      >
        <Loader2 size={40} className="animate-spin text-neon" aria-hidden />
        <h2 className="mt-5 font-display text-xl font-bold">Creating tracks…</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Matching files to your CSV and queueing {bulk?.total ?? ""} tracks for processing. You can
          leave this page — it keeps running.
        </p>
      </section>
    );
  }

  const created = bulk.results.filter((row) => row.status === "created");
  const failed = bulk.results.filter((row) => row.status === "failed");

  return (
    <section className="space-y-6" aria-live="polite">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-line-strong bg-neon-dim p-5">
          <CheckCircle2 size={22} className="text-neon" aria-hidden />
          <p className="mt-3 font-display text-3xl font-bold tabular-nums">{created.length}</p>
          <p className="text-sm text-fg-muted">tracks created — now processing</p>
        </div>
        <div className="rounded-card border border-danger/40 bg-danger/10 p-5">
          <CircleAlert size={22} className="text-danger" aria-hidden />
          <p className="mt-3 font-display text-3xl font-bold tabular-nums">{failed.length}</p>
          <p className="text-sm text-fg-muted">rows need attention</p>
        </div>
      </div>

      {bulk.error && (
        <p role="alert" className="text-sm text-danger">
          {bulk.error}
        </p>
      )}

      {failed.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-danger">Failed rows</h3>
          <Stagger
            className="divide-y divide-line rounded-card border border-line bg-surface"
            inView={false}
            stagger={0.02}
          >
            {failed.map((row, index) => (
              <StaggerItem key={`${row.fileName}-${index}`} className="px-4 py-3 text-sm">
                <p className="truncate text-fg">
                  {row.row ? `Row ${row.row} · ` : ""}
                  {row.fileName}
                </p>
                <p className="text-xs text-danger">{row.error}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      )}

      {created.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-neon-soft">Created</h3>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-card border border-line bg-surface">
            {created.map((row) => (
              <li key={row.trackId}>
                <Link
                  href={`/admin/music/${row.trackId}`}
                  className="flex min-h-12 items-center justify-between gap-3 px-4 text-sm hover:bg-neon-dim"
                >
                  <span className="truncate">{row.title}</span>
                  <span className="shrink-0 text-xs text-fg-subtle">{row.fileName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:flex">
        <Button variant="outline" onClick={onStartOver}>
          Upload more
        </Button>
        <Button href="/admin/music">Go to music</Button>
      </div>
    </section>
  );
}
