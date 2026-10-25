"use client";

/**
 * Console → Curation (PRD 10.9.2, roadmap Day 9): arrange the Home page
 * sections (hero banners, featured songs / artists, editorial playlists) and
 * build editorial playlists. Order here is the order on Home.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  LayoutTemplate,
  ListMusic,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import PlaylistCover from "@/components/features/playlist/PlaylistCover";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import SectionFormSheet, {
  SECTION_TYPES,
} from "@/components/features/admin/curation/SectionFormSheet";
import EditorialFormSheet from "@/components/features/admin/curation/EditorialFormSheet";
import {
  deleteEditorialPlaylist,
  deleteHomeSection,
  getEditorialPlaylists,
  getHomeSections,
  reorderHomeSections,
  updateHomeSection,
} from "@/services/adminConsole.service";
import { showToast } from "@/store/toastStore";
import { QUERY_KEYS } from "@/utils/constants";
import { cn, formatRelativeTime, pluralize } from "@/utils/genericFunctions";

const TYPE_LABEL = Object.fromEntries(SECTION_TYPES.map((type) => [type.value, type.label]));
const iconButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted transition hover:bg-neon-dim hover:text-neon disabled:opacity-30";

/** Home sections tab. */
function SectionsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // section, "new" or null
  const [deleting, setDeleting] = useState(null);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.adminHomeSections,
    queryFn: ({ signal }) => getHomeSections({ signal }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminHomeSections });
  const onError = (mutationError) =>
    showToast({
      command: "selfvibe curation",
      message: mutationError?.message ?? "couldn't save",
      tone: "error",
    });
  const reorder = useMutation({
    mutationFn: reorderHomeSections,
    onSuccess: (result) => queryClient.setQueryData(QUERY_KEYS.adminHomeSections, result),
    onError,
  });
  const toggle = useMutation({
    mutationFn: (section) => updateHomeSection(section.id, { active: !section.active }),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: (section) => deleteHomeSection(section.id),
    onSuccess: () => {
      setDeleting(null);
      refresh();
    },
    onError,
  });
  const sections = data?.items ?? [];

  const move = (from, to) => {
    const ids = sections.map((section) => section.id);
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    reorder.mutate(ids);
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} aria-hidden /> Add section
        </Button>
      </div>
      {isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-card" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={LayoutTemplate}
          command="selfvibe curation --sections"
          title="couldn't load sections"
          description={error?.message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : sections.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          command="selfvibe curation --sections"
          title="Home has no curated sections yet"
          description="Add a hero banner or featured songs — they appear above the For You rows."
          action={<Button onClick={() => setEditing("new")}>Add the first one</Button>}
        />
      ) : (
        <Stagger className="space-y-2" stagger={0.03} inView={false}>
          {sections.map((section, index) => (
            <StaggerItem key={section.id}>
              <article
                className={cn(
                  "flex items-center gap-2 rounded-card border border-line bg-surface p-3",
                  !section.active && "opacity-60"
                )}
              >
                <span className="w-6 text-center font-mono text-xs text-neon">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{section.title}</span>
                    <Badge tone="info">{TYPE_LABEL[section.type]}</Badge>
                    {!section.active && <Badge tone="muted">Hidden</Badge>}
                    {section.endsAt && (
                      <Badge tone="warning">
                        until {new Date(section.endsAt).toLocaleDateString("en-IN")}
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-fg-subtle">
                    {section.type === "editorial"
                      ? (section.playlistName ?? "playlist removed")
                      : section.items.length
                        ? section.items.map((item) => item.label).join(", ")
                        : section.subtitle || section.link || "—"}
                  </p>
                </div>
                <button
                  type="button"
                  className={iconButton}
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0 || reorder.isPending}
                  aria-label={`Move ${section.title} up`}
                >
                  <ArrowUp size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  className={iconButton}
                  onClick={() => move(index, index + 1)}
                  disabled={index === sections.length - 1 || reorder.isPending}
                  aria-label={`Move ${section.title} down`}
                >
                  <ArrowDown size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  className={cn(iconButton, "hidden sm:flex")}
                  onClick={() => toggle.mutate(section)}
                  aria-label={section.active ? `Hide ${section.title}` : `Show ${section.title}`}
                >
                  {section.active ? (
                    <Eye size={16} aria-hidden />
                  ) : (
                    <EyeOff size={16} aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  className={iconButton}
                  onClick={() => setEditing(section)}
                  aria-label={`Edit ${section.title}`}
                >
                  <Pencil size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  className={cn(iconButton, "hover:text-danger")}
                  onClick={() => setDeleting(section)}
                  aria-label={`Delete ${section.title}`}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      {editing && (
        <SectionFormSheet
          key={editing === "new" ? "new" : editing.id}
          open
          section={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      <ConfirmSheet
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting)}
        title={`Delete "${deleting?.title ?? ""}"?`}
        description="It disappears from Home right away."
        loading={remove.isPending}
      />
    </>
  );
}

/** Editorial playlists tab. */
function EditorialTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.adminEditorial,
    queryFn: ({ signal }) => getEditorialPlaylists({ signal }),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminEditorial });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminHomeSections });
  };
  const remove = useMutation({
    mutationFn: (playlist) => deleteEditorialPlaylist(playlist.id),
    onSuccess: () => {
      setDeleting(null);
      refresh();
    },
  });
  const playlists = data?.items ?? [];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus size={16} aria-hidden /> New playlist
        </Button>
      </div>
      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-card" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={ListMusic}
          command="selfvibe curation --playlists"
          title="couldn't load playlists"
          description={error?.message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : playlists.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          command="selfvibe curation --playlists"
          title="no editorial playlists yet"
          description="Build one like “SelfVibe Code Mode”, then show it on Home."
          action={<Button onClick={() => setEditing("new")}>Create one</Button>}
        />
      ) : (
        <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" stagger={0.03} inView={false}>
          {playlists.map((playlist) => (
            <StaggerItem key={playlist.id}>
              <article className="flex items-center gap-3 rounded-card border border-line bg-surface p-3">
                <PlaylistCover playlist={playlist} className="size-16 rounded-lg" sizes="64px" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{playlist.name}</p>
                  <p className="text-xs text-fg-subtle">
                    {pluralize(playlist.trackCount, "song")} ·{" "}
                    {playlist.isPublic ? "public" : "hidden"} ·{" "}
                    {formatRelativeTime(playlist.updatedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  className={iconButton}
                  onClick={() => setEditing(playlist)}
                  aria-label={`Edit ${playlist.name}`}
                >
                  <Pencil size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  className={cn(iconButton, "hover:text-danger")}
                  onClick={() => setDeleting(playlist)}
                  aria-label={`Delete ${playlist.name}`}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      {editing && (
        <EditorialFormSheet
          key={editing === "new" ? "new" : editing.id}
          open
          playlist={editing === "new" ? null : editing}
          initialTracks={
            editing === "new"
              ? []
              : editing.tracks.map((track) => ({ id: track.id, label: track.title }))
          }
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      <ConfirmSheet
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting)}
        title={`Delete ${deleting?.name ?? ""}?`}
        description="Home sections that show it are removed too."
        loading={remove.isPending}
        error={remove.error?.message ?? null}
      />
    </>
  );
}

export default function CurationManager() {
  const [tab, setTab] = useState("sections");
  return (
    <>
      <PageHeader
        eyebrow="selfvibe console --curation"
        title="Curation"
        subtitle="What listeners see first on Home."
      />
      <div
        role="tablist"
        aria-label="Curation"
        className="mb-6 inline-flex rounded-full border border-line bg-surface p-1"
      >
        {[
          ["sections", "Home sections"],
          ["editorial", "Editorial playlists"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "min-h-10 rounded-full px-4 text-sm font-medium transition",
              tab === value ? "bg-neon text-black" : "text-fg-muted hover:text-fg"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "sections" ? <SectionsTab /> : <EditorialTab />}
    </>
  );
}
