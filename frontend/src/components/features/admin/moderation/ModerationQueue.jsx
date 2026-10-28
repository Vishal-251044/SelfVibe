"use client";

/**
 * Console → Moderation (PRD 10.9.2, roadmap Day 9): reports grouped per item
 * (song, comment, artist), most reported first, with a preview and actions —
 * dismiss, warn the uploader, take down, restore. Open / resolved tabs.
 */
import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Ban, Check, Flag, RotateCcw, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import SelectField from "@/components/ui/SelectField";
import Skeleton from "@/components/ui/Skeleton";
import CoverArt from "@/components/features/music/CoverArt";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import { getReports, moderateReport } from "@/services/adminConsole.service";
import { showToast } from "@/store/toastStore";
import { QUERY_KEYS } from "@/utils/constants";
import { cn, formatRelativeTime } from "@/utils/genericFunctions";

const TABS = [
  { value: "open", label: "Open" },
  { value: "actioned", label: "Actioned" },
  { value: "dismissed", label: "Dismissed" },
];
const TYPE_OPTIONS = [
  { value: "", label: "Everything" },
  { value: "track", label: "Songs" },
  { value: "comment", label: "Comments" },
  { value: "artist", label: "Artists" },
];
const TYPE_LABEL = { track: "Song", comment: "Comment", artist: "Artist" };
const DONE = {
  dismiss: "reports dismissed",
  takeDown: "taken down",
  warn: "warning sent",
  restore: "restored",
};
/** Actions that need a second tap. */
const CONFIRM = {
  takeDown: {
    title: "Take this down?",
    description: "It disappears for listeners straight away. You can restore it later.",
    label: "Take down",
  },
  warn: {
    title: "Warn the uploader?",
    description: "They get an email and a warning on their account.",
    label: "Send warning",
  },
};

/**
 * Link to where the item lives.
 * @param {Object} group
 * @returns {string|null}
 */
function itemHref(group) {
  if (group.targetType === "track") return `/admin/performance/${group.targetId}`;
  if (group.targetType === "comment" && group.preview?.trackId)
    return `/admin/comments?trackId=${group.preview.trackId}`;
  if (group.targetType === "artist" && group.preview?.slug) return `/artist/${group.preview.slug}`;
  return null;
}

export default function ModerationQueue() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("open");
  const [targetType, setTargetType] = useState("");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null); // { group, action }
  const query = { status, targetType: targetType || undefined, page, limit: 20 };

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: QUERY_KEYS.adminReports(query),
    queryFn: ({ signal }) => getReports(query, { signal }),
    placeholderData: keepPreviousData,
  });
  const act = useMutation({
    mutationFn: ({ group, action }) =>
      moderateReport({ targetType: group.targetType, targetId: group.targetId, action }),
    onSuccess: (_, { action }) => {
      setPending(null);
      showToast({
        message: DONE[action],
        tone: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (mutationError) =>
      showToast({
        message: mutationError?.message ?? "couldn't do that",
        tone: "error",
      }),
  });

  /** Run an action, asking first for the serious ones. */
  const run = (group, action) =>
    CONFIRM[action] ? setPending({ group, action }) : act.mutate({ group, action });
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Admin panel"
        title="Moderation"
        subtitle={
          data
            ? `${data.openCount} open report${data.openCount === 1 ? "" : "s"}`
            : "Reported songs, comments and artists"
        }
      />
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div
          role="tablist"
          aria-label="Report status"
          className="inline-flex rounded-full border border-line bg-surface p-1"
        >
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={cn(
                "min-h-10 rounded-full px-4 text-sm font-medium transition",
                status === tab.value ? "bg-neon text-black" : "text-fg-muted hover:text-fg"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <SelectField
          label="Show"
          options={TYPE_OPTIONS}
          value={targetType}
          onChange={(event) => {
            setTargetType(event.target.value);
            setPage(1);
          }}
          className="min-w-40"
        />
      </div>

      {isPending ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-36 rounded-card" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={Flag}
          title="couldn't load reports"
          description={error?.message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Check}
          title={status === "open" ? "queue is clear" : "nothing here"}
          description={status === "open" ? "No reports waiting for review." : undefined}
        />
      ) : (
        <Stagger className="space-y-3" stagger={0.03} inView={false}>
          {items.map((group) => {
            const preview = group.preview;
            const href = itemHref(group);
            return (
              <StaggerItem key={`${group.targetType}-${group.targetId}`}>
                <article className="rounded-card border border-line bg-surface p-4">
                  <div className="flex items-start gap-3">
                    {group.targetType === "comment" ? (
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-fg-muted">
                        <ShieldAlert size={22} aria-hidden />
                      </span>
                    ) : (
                      <CoverArt
                        src={preview?.imageUrl}
                        alt=""
                        seed={group.targetId}
                        className={cn(
                          "size-14 shrink-0",
                          group.targetType === "artist" ? "rounded-full" : "rounded-lg"
                        )}
                        sizes="56px"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge tone="info">{TYPE_LABEL[group.targetType]}</Badge>
                        <span className="inline-flex items-center gap-1 text-warning">
                          <Flag size={12} aria-hidden /> {group.reportCount} report
                          {group.reportCount === 1 ? "" : "s"}
                        </span>
                        {preview?.isTakenDown && <Badge tone="danger">Taken down</Badge>}
                        <span className="text-fg-subtle">
                          last {formatRelativeTime(group.lastReportedAt)}
                        </span>
                      </p>
                      {preview ? (
                        <>
                          <p
                            className={cn(
                              "mt-1 font-medium text-fg",
                              group.targetType === "comment"
                                ? "line-clamp-3 font-normal whitespace-pre-line"
                                : "truncate"
                            )}
                          >
                            {preview.title}
                          </p>
                          <p className="truncate text-xs text-fg-muted">{preview.subtitle}</p>
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-fg-subtle">This item no longer exists.</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(group.reasons).map(([reason, count]) => (
                          <span
                            key={reason}
                            className="rounded-full border border-line px-2 py-0.5 text-xs text-fg-muted capitalize"
                          >
                            {reason} × {count}
                          </span>
                        ))}
                      </div>
                      {group.details.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-fg-muted">
                          {group.details.slice(0, 3).map((detail, index) => (
                            <li key={index} className="line-clamp-2">
                              “{detail}”
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                    {href && (
                      <Button href={href} variant="ghost">
                        Preview
                      </Button>
                    )}
                    {status === "open" && preview && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => run(group, "dismiss")}
                          disabled={act.isPending}
                        >
                          <Check size={16} aria-hidden /> Dismiss
                        </Button>
                        {group.targetType !== "artist" || preview.subtitle === "Creator" ? (
                          <Button
                            variant="outline"
                            onClick={() => run(group, "warn")}
                            disabled={act.isPending}
                          >
                            <AlertTriangle size={16} aria-hidden /> Warn
                          </Button>
                        ) : null}
                        {!preview.isTakenDown && (
                          <Button
                            onClick={() => run(group, "takeDown")}
                            disabled={act.isPending}
                            className="bg-danger text-black hover:bg-danger/90"
                          >
                            <Ban size={16} aria-hidden /> Take down
                          </Button>
                        )}
                      </>
                    )}
                    {preview?.isTakenDown && (
                      <Button
                        variant="outline"
                        onClick={() => run(group, "restore")}
                        disabled={act.isPending}
                      >
                        <RotateCcw size={16} aria-hidden /> Restore
                      </Button>
                    )}
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
      <Pagination meta={data?.meta} onPageChange={setPage} disabled={isFetching} />

      <ConfirmSheet
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={() => act.mutate(pending)}
        title={pending ? CONFIRM[pending.action].title : ""}
        description={pending ? CONFIRM[pending.action].description : ""}
        confirmLabel={pending ? CONFIRM[pending.action].label : "Confirm"}
        loading={act.isPending}
        error={act.error?.message ?? null}
      />
      {status === "open" && data?.openCount > 0 && (
        <p className="mt-6 text-xs text-fg-subtle">
          Tip: comments can also be handled in{" "}
          <Link href="/admin/comments?reported=true" className="text-neon hover:underline">
            Comments
          </Link>
          .
        </p>
      )}
    </>
  );
}
