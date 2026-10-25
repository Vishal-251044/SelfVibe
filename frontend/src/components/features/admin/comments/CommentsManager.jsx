"use client";

/**
 * Console → Comments (PRD 10.9.2 Comments, roadmap Day 9): every comment across
 * songs, reported first; search, filter by status or reported only (and by
 * song when opened from a song page); hide, delete, pin, reply as SelfVibe.
 */
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MessageCircle, Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import SelectField from "@/components/ui/SelectField";
import Skeleton from "@/components/ui/Skeleton";
import TextField from "@/components/ui/TextField";
import CheckboxField from "@/components/ui/CheckboxField";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import AdminCommentRow from "@/components/features/admin/comments/AdminCommentRow";
import { getAdminComments } from "@/services/adminConsole.service";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { QUERY_KEYS } from "@/utils/constants";

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
  { value: "removed", label: "Deleted" },
];

export default function CommentsManager() {
  const searchParams = useSearchParams();
  const trackId = searchParams.get("trackId") ?? undefined;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [reportedOnly, setReportedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 350);
  const query = {
    q: q || undefined,
    status: status || undefined,
    reported: reportedOnly ? "true" : undefined,
    trackId,
    page,
    limit: 25,
  };

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: QUERY_KEYS.adminComments(query),
    queryFn: ({ signal }) => getAdminComments(query, { signal }),
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        eyebrow="selfvibe console --comments"
        title="Comments"
        subtitle={
          data
            ? `${data.meta.total} comments${data.reportedCount ? ` · ${data.reportedCount} reported` : ""}${trackId ? " on this song" : ""}`
            : "Reported comments come first"
        }
        actions={
          trackId ? (
            <Button href="/admin/comments" variant="ghost">
              All songs
            </Button>
          ) : null
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:items-end">
        <TextField
          label="Search"
          icon={Search}
          type="search"
          placeholder="Words in the comment"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <SelectField
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        />
      </div>
      <CheckboxField
        className="mb-5"
        checked={reportedOnly}
        onChange={(checked) => {
          setReportedOnly(checked);
          setPage(1);
        }}
        label="Reported only"
      />

      {isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-card" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={MessageCircle}
          command="selfvibe comments --list"
          title="couldn't load comments"
          description={error?.message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          command="selfvibe comments --list"
          title={reportedOnly ? "no reported comments" : "no comments found"}
          description={reportedOnly ? "Nothing waiting for review." : undefined}
        />
      ) : (
        <Stagger className="space-y-2" stagger={0.02} inView={false}>
          {items.map((comment) => (
            <StaggerItem key={comment.id}>
              <AdminCommentRow comment={comment} showTrack={!trackId} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <Pagination meta={data?.meta} onPageChange={setPage} disabled={isFetching} />
    </>
  );
}
