"use client";

/**
 * One user in the console (roadmap Day 9): profile, activity, warnings and
 * the actions — suspend / reactivate, creator role, verify artist, send a
 * password reset. Staff accounts are managed in Team, never here.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Ban, Gift, KeyRound, Mail, Mic2, RotateCcw } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import FormAlert from "@/components/ui/FormAlert";
import Skeleton from "@/components/ui/Skeleton";
import {
  getUser,
  sendUserPasswordReset,
  setArtistVerified,
  setCreatorRole,
  setUserStatus,
} from "@/services/adminConsole.service";
import { showToast } from "@/store/toastStore";
import GrantPlanSheet from "@/components/features/admin/billing/GrantPlanSheet";
import { useHasPermission } from "@/components/features/admin/RequirePermission";
import { QUERY_KEYS } from "@/utils/constants";
import { formatCount, formatRelativeTime } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {string|null} props.userId - Open when set
 * @param {() => void} props.onClose
 */
export default function UserDetailSheet({ userId, onClose }) {
  const queryClient = useQueryClient();
  const [isConfirmingSuspend, setIsConfirmingSuspend] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  // Owner: give a free plan; other staff: email the person
  const canGrantPlan = useHasPermission("billing.manage");
  const { data, isPending, isError, error } = useQuery({
    queryKey: QUERY_KEYS.adminUser(userId),
    queryFn: ({ signal }) => getUser(userId, { signal }),
    enabled: Boolean(userId),
  });

  const action = useMutation({
    mutationFn: ({ run }) => run(),
    onSuccess: (_, { done }) => {
      setIsConfirmingSuspend(false);
      showToast({ message: done, tone: "success" });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminUser(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminVerification });
    },
  });
  const user = data?.user;
  const activity = data?.activity;
  const isSuspended = user?.status === "suspended";
  const isCreator = user?.roles.includes("creator");

  return (
    <Sheet
      open={Boolean(userId)}
      onClose={onClose}
      title={user?.name ?? "User"}
      description={user?.email}
      className="sm:max-w-2xl"
    >
      {isPending ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-20 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      ) : isError ? (
        <FormAlert message={error?.message ?? "Couldn't load this user"} />
      ) : (
        <div className="space-y-5">
          <FormAlert message={action.error?.message ?? null} />
          <div className="flex items-center gap-4">
            <Avatar name={user.name} src={user.avatar} size="lg" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap gap-2">
                <Badge tone={isSuspended ? "danger" : "success"}>
                  {isSuspended ? "Suspended" : "Active"}
                </Badge>
                {isCreator && <Badge tone="info">Creator</Badge>}
                {user.artist?.verified && <Badge tone="success">Verified artist</Badge>}
                {user.artist?.verificationStatus === "pending" && (
                  <Badge tone="warning">Wants verification</Badge>
                )}
                <Badge tone="muted">{user.plan}</Badge>
              </div>
              <p className="text-xs text-fg-subtle">
                Joined {formatRelativeTime(user.createdAt)}
                {user.lastLoginAt ? ` · last sign-in ${formatRelativeTime(user.lastLoginAt)}` : ""}
              </p>
              {user.artist && (
                <p className="truncate text-xs text-fg-muted">Artist: {user.artist.stageName}</p>
              )}
            </div>
          </div>

          {data.verification?.status === "pending" && data.verification.note && (
            <p className="rounded-card border border-warning/40 bg-warning/5 p-3 text-sm text-fg-muted">
              “{data.verification.note}”
            </p>
          )}

          <dl className="grid grid-cols-3 gap-2 text-center sm:grid-cols-4">
            {[
              ["Plays", activity.playsTotal],
              ["Plays (30 d)", activity.plays30d],
              ["Likes", activity.likes],
              ["Playlists", activity.playlists],
              ["Comments", activity.comments],
              ["Uploads", activity.uploads],
              ["Live songs", activity.published],
              ["Reports", activity.reportsAgainst],
            ].map(([label, value]) => (
              <div key={label} className="rounded-control border border-line p-2">
                <dt className="text-[0.6875rem] text-fg-subtle">{label}</dt>
                <dd className="text-sm font-semibold tabular-nums">{formatCount(value)}</dd>
              </div>
            ))}
          </dl>

          {data.warnings.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-warning">
                Warnings ({data.warnings.length})
              </h3>
              <ul className="space-y-1 text-xs text-fg-muted">
                {data.warnings.map((warning, index) => (
                  <li key={index}>
                    {warning.reason} · {formatRelativeTime(warning.at)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {activity.recentPlays.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-neon-soft">Recently played</h3>
              <ul className="space-y-1 text-xs text-fg-muted">
                {activity.recentPlays.map((play) => (
                  <li key={`${play.trackId}-${play.at}`} className="truncate">
                    {play.title} · {formatRelativeTime(play.at)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {isSuspended ? (
              <Button
                variant="outline"
                loading={action.isPending}
                onClick={() =>
                  action.mutate({
                    run: () => setUserStatus(user.id, "active"),
                    done: "account reactivated",
                  })
                }
              >
                <RotateCcw size={16} aria-hidden /> Reactivate
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setIsConfirmingSuspend(true)}>
                <Ban size={16} aria-hidden /> Suspend
              </Button>
            )}
            <Button
              variant="outline"
              loading={action.isPending}
              onClick={() =>
                action.mutate({
                  run: () => setCreatorRole(user.id, !isCreator),
                  done: isCreator ? "creator role removed" : "creator role given",
                })
              }
            >
              <Mic2 size={16} aria-hidden /> {isCreator ? "Remove creator role" : "Make creator"}
            </Button>
            {user.artist && (
              <Button
                variant="outline"
                loading={action.isPending}
                onClick={() =>
                  action.mutate({
                    run: () => setArtistVerified(user.id, !user.artist.verified),
                    done: user.artist.verified ? "verification removed" : "artist verified",
                  })
                }
              >
                <BadgeCheck size={16} aria-hidden />{" "}
                {user.artist.verified ? "Remove verified badge" : "Verify artist"}
              </Button>
            )}
            <Button
              variant="outline"
              loading={action.isPending}
              onClick={() =>
                action.mutate({
                  run: () => sendUserPasswordReset(user.id),
                  done: "password reset email sent",
                })
              }
            >
              <KeyRound size={16} aria-hidden /> Send password reset
            </Button>
            {canGrantPlan ? (
              <Button variant="outline" onClick={() => setIsGranting(true)}>
                <Gift size={16} aria-hidden /> Give a plan
              </Button>
            ) : (
              <Button variant="outline" href={`mailto:${user.email}`} nativeLink>
                <Mail size={16} aria-hidden /> Email user
              </Button>
            )}
          </div>
          {isGranting && (
            <GrantPlanSheet
              open
              onClose={() => setIsGranting(false)}
              person={{ id: user.id, name: user.name, email: user.email, avatar: user.avatar }}
              onGranted={() => queryClient.invalidateQueries({ queryKey: ["admin"] })}
            />
          )}
        </div>
      )}

      <ConfirmSheet
        open={isConfirmingSuspend}
        onClose={() => setIsConfirmingSuspend(false)}
        onConfirm={() =>
          action.mutate({
            run: () => setUserStatus(user.id, "suspended"),
            done: "account suspended",
          })
        }
        title={`Suspend ${user?.name ?? "this user"}?`}
        description="They are signed out everywhere and can't sign in until you reactivate the account."
        confirmLabel="Suspend"
        loading={action.isPending}
      />
    </Sheet>
  );
}
