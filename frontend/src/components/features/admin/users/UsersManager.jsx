"use client";

/**
 * Console → Users & Creators (roadmap Day 9): search users, filter (listeners,
 * creators, suspended, wants verification), open one for details and
 * actions, and review verification requests (approve / reject).
 */
import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ChevronRight, Search, Users, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import SelectField from "@/components/ui/SelectField";
import Skeleton from "@/components/ui/Skeleton";
import TextField from "@/components/ui/TextField";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import UserDetailSheet from "@/components/features/admin/users/UserDetailSheet";
import {
  getUsers,
  getVerificationRequests,
  setArtistVerified,
} from "@/services/adminConsole.service";
import { showToast } from "@/store/toastStore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { QUERY_KEYS } from "@/utils/constants";
import { formatCount, formatRelativeTime } from "@/utils/genericFunctions";

const FILTERS = [
  { value: "all", label: "Everyone" },
  { value: "listeners", label: "Listeners" },
  { value: "creators", label: "Creators" },
  { value: "suspended", label: "Suspended" },
  { value: "verification", label: "Wants verification" },
];

/** Creators waiting for the verified badge. */
function VerificationRequests() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: QUERY_KEYS.adminVerification,
    queryFn: ({ signal }) => getVerificationRequests({ signal }),
  });
  const review = useMutation({
    mutationFn: ({ userId, approve }) => setArtistVerified(userId, approve),
    onSuccess: (_, { approve }) => {
      showToast({
        command: "selfvibe verify",
        message: approve ? "artist verified" : "request rejected",
        tone: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error) =>
      showToast({
        command: "selfvibe verify",
        message: error?.message ?? "couldn't update",
        tone: "error",
      }),
  });
  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="mb-6 rounded-card border border-warning/40 bg-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-warning">
        <BadgeCheck size={16} aria-hidden /> Verification requests ({items.length})
      </h2>
      <ul className="space-y-2">
        {items.map((request) => (
          <li
            key={request.id}
            className="flex flex-wrap items-center gap-3 rounded-control border border-line p-3"
          >
            <Avatar name={request.artist.stageName} src={request.avatar} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{request.artist.stageName}</span>
              <span className="block truncate text-xs text-fg-subtle">
                {request.songs} songs · {formatCount(request.plays)} plays · {request.followers}{" "}
                followers · asked {formatRelativeTime(request.requestedAt)}
              </span>
              {request.note && (
                <span className="mt-1 block text-xs text-fg-muted">“{request.note}”</span>
              )}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => review.mutate({ userId: request.id, approve: false })}
                disabled={review.isPending}
              >
                <X size={16} aria-hidden /> Reject
              </Button>
              <Button
                onClick={() => review.mutate({ userId: request.id, approve: true })}
                disabled={review.isPending}
              >
                <BadgeCheck size={16} aria-hidden /> Verify
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function UsersManager() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [openUserId, setOpenUserId] = useState(null);
  const q = useDebouncedValue(search.trim(), 350);
  const query = { q: q || undefined, filter, page, limit: 25 };
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: QUERY_KEYS.adminUsers(query),
    queryFn: ({ signal }) => getUsers(query, { signal }),
    placeholderData: keepPreviousData,
  });
  const users = data?.items ?? [];

  return (
    <>
      <PageHeader
        eyebrow="selfvibe console --users"
        title="Users & Creators"
        subtitle={
          data ? `${data.meta.total} accounts` : "Listeners and creators (staff are in Team)"
        }
      />
      <VerificationRequests />
      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TextField
          label="Search"
          icon={Search}
          type="search"
          placeholder="Name or email"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <SelectField
          label="Show"
          options={FILTERS}
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-card" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={Users}
          command="selfvibe users --list"
          title="couldn't load users"
          description={error?.message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          command="selfvibe users --search"
          title="no users found"
          description={q ? "Try another name or email." : undefined}
        />
      ) : (
        <Stagger className="space-y-2" stagger={0.02} inView={false}>
          {users.map((user) => (
            <StaggerItem key={user.id}>
              <button
                type="button"
                onClick={() => setOpenUserId(user.id)}
                className="flex min-h-16 w-full items-center gap-3 rounded-card border border-line bg-surface p-3 text-left transition hover:border-line-strong hover:bg-surface-raised"
              >
                <Avatar name={user.name} src={user.avatar} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{user.name}</span>
                  <span className="block truncate text-xs text-fg-subtle">{user.email}</span>
                </span>
                <span className="hidden flex-wrap justify-end gap-1 sm:flex">
                  {user.status === "suspended" && <Badge tone="danger">Suspended</Badge>}
                  {user.roles.includes("creator") && <Badge tone="info">Creator</Badge>}
                  {user.artist?.verified && <Badge tone="success">Verified</Badge>}
                  {user.artist?.verificationStatus === "pending" && (
                    <Badge tone="warning">Wants badge</Badge>
                  )}
                  {user.warningsCount > 0 && (
                    <Badge tone="warning">
                      {user.warningsCount} warning{user.warningsCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                </span>
                <ChevronRight size={18} className="shrink-0 text-fg-subtle" aria-hidden />
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <Pagination meta={data?.meta} onPageChange={setPage} disabled={isFetching} />
      <UserDetailSheet userId={openUserId} onClose={() => setOpenUserId(null)} />
    </>
  );
}
