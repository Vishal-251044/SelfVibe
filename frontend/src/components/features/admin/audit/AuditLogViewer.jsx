"use client";

/**
 * Console → Audit log (PRD ADL-7, roadmap Day 9): every staff action — who,
 * what, on what, before / after, when, from which IP — searchable by action
 * and filtered by date. Open an entry to see the change.
 */
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown, FileClock } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import SelectField from "@/components/ui/SelectField";
import Skeleton from "@/components/ui/Skeleton";
import TextField from "@/components/ui/TextField";
import { getAuditLogs } from "@/services/adminConsole.service";
import { STAFF_ROLE_LABELS } from "@/utils/adminConstants";
import { QUERY_KEYS } from "@/utils/constants";
import { cn } from "@/utils/genericFunctions";

/** Pretty-print a before / after snapshot. */
const pretty = (value) =>
  value === null || value === undefined ? "—" : JSON.stringify(value, null, 2);

export default function AuditLogViewer() {
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const query = {
    action: action || undefined,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    page,
    limit: 50,
  };
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: QUERY_KEYS.adminAudit(query),
    queryFn: ({ signal }) => getAuditLogs(query, { signal }),
    placeholderData: keepPreviousData,
  });
  // Group actions by their area ("track", "user"…) for the filter
  const areas = [...new Set((data?.actions ?? []).map((name) => name.split(".")[0]))];
  const actionOptions = [
    { value: "", label: "All actions" },
    ...areas.map((area) => ({ value: `${area}.`, label: `${area} — all` })),
    ...(data?.actions ?? []).map((name) => ({ value: name, label: name })),
  ];
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        eyebrow="selfvibe console --audit"
        title="Audit log"
        subtitle={data ? `${data.meta.total} entries` : "Every staff action, with before and after"}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <SelectField
          label="Action"
          options={actionOptions}
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
        />
        <TextField
          label="From"
          type="date"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
        />
        <TextField
          label="To"
          type="date"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-14 rounded-card" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={FileClock}
          command="selfvibe audit --list"
          title="couldn't load the audit log"
          description={error?.message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileClock}
          command="selfvibe audit --list"
          title="no entries"
          description="Try another action or date range."
        />
      ) : (
        <ul className="space-y-1">
          {items.map((entry) => {
            const isOpen = openId === entry.id;
            const failed = entry.statusCode >= 400;
            return (
              <li key={entry.id} className="rounded-card border border-line bg-surface">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : entry.id)}
                  aria-expanded={isOpen}
                  className="flex min-h-14 w-full items-center gap-3 px-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono text-neon">{entry.action}</span>
                      {failed && <Badge tone="danger">failed {entry.statusCode}</Badge>}
                    </span>
                    <span className="block truncate text-xs text-fg-subtle">
                      {entry.staff?.name ?? "Unknown"} (
                      {STAFF_ROLE_LABELS[entry.staffRole] ?? entry.staffRole}) ·{" "}
                      {new Date(entry.createdAt).toLocaleString("en-IN")}
                      {entry.targetType ? ` · ${entry.targetType} ${entry.targetId ?? ""}` : ""}
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={cn("shrink-0 text-fg-subtle transition", isOpen && "rotate-180")}
                    aria-hidden
                  />
                </button>
                {isOpen && (
                  <div className="grid gap-3 border-t border-line p-3 text-xs md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-fg-subtle">Before</p>
                      <pre className="max-h-64 overflow-auto rounded-lg bg-black p-2 font-mono text-fg-muted">
                        {pretty(entry.before)}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-fg-subtle">After</p>
                      <pre className="max-h-64 overflow-auto rounded-lg bg-black p-2 font-mono text-fg-muted">
                        {pretty(entry.after)}
                      </pre>
                    </div>
                    <p className="text-fg-subtle md:col-span-2">
                      {entry.method} {entry.path} · IP {entry.ip ?? "—"}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Pagination meta={data?.meta} onPageChange={setPage} disabled={isFetching} />
    </>
  );
}
