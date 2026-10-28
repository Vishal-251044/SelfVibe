"use client";

/**
 * Console → Team (Owner only, roadmap Day 9): staff members and their roles,
 * invite by email (with a copyable link when email isn't set up), change a
 * role, remove access, cancel pending invites. The Owner can't be changed.
 * Day 10: a "Locked" badge after failed sign-ins, and a security sheet per
 * member (unlock, sign out everywhere, reset 2FA).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Crown,
  KeyRound,
  Mail,
  ShieldCheck,
  ShieldOff,
  UserCog,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import EmptyState from "@/components/ui/EmptyState";
import FormAlert from "@/components/ui/FormAlert";
import SelectField from "@/components/ui/SelectField";
import Sheet from "@/components/ui/Sheet";
import Skeleton from "@/components/ui/Skeleton";
import TextField from "@/components/ui/TextField";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import MemberSecuritySheet from "@/components/features/admin/team/MemberSecuritySheet";
import {
  changeStaffRole,
  getTeam,
  inviteStaff,
  removeStaff,
  revokeInvite,
} from "@/services/adminConsole.service";
import { showToast } from "@/store/toastStore";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { STAFF_ROLE_LABELS } from "@/utils/adminConstants";
import { QUERY_KEYS } from "@/utils/constants";
import { formatRelativeTime } from "@/utils/genericFunctions";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin — everything except settings and team" },
  { value: "contentManager", label: "Content Manager — music, curation, genres" },
  { value: "moderator", label: "Moderator — reports and comments" },
];

/** Invite someone. */
function InviteSheet({ open, onClose }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [staffRole, setStaffRole] = useState("moderator");
  const [link, setLink] = useState(null);
  const { copy, isCopied } = useCopyToClipboard();
  const invite = useMutation({
    mutationFn: () => inviteStaff({ email: email.trim(), staffRole }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminTeam });
      if (result.acceptUrl) setLink(result.acceptUrl);
      else {
        showToast({
          message: `invite sent to ${email.trim()}`,
          tone: "success",
        });
        onClose();
      }
    },
  });
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Invite to the team"
      description="They get an email link, then use their normal SelfVibe login to open the console."
      footer={
        link ? (
          <Button fullWidth onClick={onClose}>
            Done
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => invite.mutate()}
              loading={invite.isPending}
              disabled={!email.trim()}
            >
              Send invite
            </Button>
          </div>
        )
      }
    >
      {link ? (
        <div className="space-y-3">
          <FormAlert
            tone="info"
            message="Email isn't set up yet (RESEND_API_KEY), so share this link yourself. It works once and expires in 7 days."
          />
          <p className="rounded-control border border-line bg-black p-3 font-mono text-xs break-all text-neon">
            {link}
          </p>
          <Button variant="outline" fullWidth onClick={() => copy(link)}>
            <Copy size={16} aria-hidden /> {isCopied ? "Copied" : "Copy link"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <FormAlert message={invite.error?.message ?? null} />
          <TextField
            label="Email"
            icon={Mail}
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={invite.error?.details?.fields?.email}
          />
          <SelectField
            label="Role"
            options={ROLE_OPTIONS}
            value={staffRole}
            onChange={(event) => setStaffRole(event.target.value)}
          />
        </div>
      )}
    </Sheet>
  );
}

export default function TeamManager() {
  const queryClient = useQueryClient();
  const [isInviting, setIsInviting] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [securityFor, setSecurityFor] = useState(null);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.adminTeam,
    queryFn: ({ signal }) => getTeam({ signal }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminTeam });
  const onError = (mutationError) =>
    showToast({
      message: mutationError?.message ?? "couldn't update",
      tone: "error",
    });
  const role = useMutation({
    mutationFn: ({ id, staffRole }) => changeStaffRole(id, staffRole),
    onSuccess: () => {
      refresh();
      showToast({
        message: "role updated — applies at their next sign-in",
        tone: "success",
      });
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (member) => removeStaff(member.id),
    onSuccess: () => {
      setRemoving(null);
      refresh();
    },
    onError,
  });
  const cancel = useMutation({
    mutationFn: (inviteId) => revokeInvite(inviteId),
    onSuccess: refresh,
    onError,
  });

  return (
    <>
      <PageHeader
        eyebrow="Admin panel"
        title="Team"
        subtitle="Who can sign in to the console, and what they can do."
        actions={
          <Button onClick={() => setIsInviting(true)}>
            <UserPlus size={16} aria-hidden /> Invite
          </Button>
        }
      />
      {isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-card" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={UserCog}
          title="couldn't load the team"
          description={error?.message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : (
        <>
          <Stagger className="space-y-2" stagger={0.03} inView={false}>
            {data.members.map((member) => (
              <StaggerItem key={member.id}>
                <article className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-3">
                  <Avatar name={member.name} src={member.avatar} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-medium">
                      {member.name}
                      {member.isOwner && (
                        <Crown size={14} className="text-warning" aria-label="Owner" />
                      )}
                      {member.lockedUntil && <Badge tone="danger">Locked</Badge>}
                    </p>
                    <p className="truncate text-xs text-fg-subtle">
                      {member.email} ·{" "}
                      {member.lastLoginAt
                        ? `signed in ${formatRelativeTime(member.lastLoginAt)}`
                        : "never signed in"}
                    </p>
                  </div>
                  <span
                    className="flex items-center gap-1 text-xs text-fg-muted"
                    title={member.twoFactorEnabled ? "2FA on" : "2FA not set up yet"}
                  >
                    {member.twoFactorEnabled ? (
                      <ShieldCheck size={16} className="text-neon" aria-hidden />
                    ) : (
                      <ShieldOff size={16} className="text-warning" aria-hidden />
                    )}
                    <span className="sr-only">
                      {member.twoFactorEnabled ? "Two-factor on" : "Two-factor not set up"}
                    </span>
                  </span>
                  {member.isOwner ? (
                    <Badge tone="warning">Owner</Badge>
                  ) : (
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                      <label className="sr-only" htmlFor={`role-${member.id}`}>
                        Role for {member.name}
                      </label>
                      <select
                        id={`role-${member.id}`}
                        value={member.staffRole}
                        onChange={(event) =>
                          role.mutate({ id: member.id, staffRole: event.target.value })
                        }
                        disabled={role.isPending}
                        className="min-h-11 flex-1 rounded-control border border-line bg-black px-3 text-sm text-fg outline-none focus:border-neon sm:flex-none"
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {STAFF_ROLE_LABELS[option.value]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setSecurityFor(member)}
                        aria-label={`Security for ${member.name}`}
                        className="flex size-11 items-center justify-center rounded-full text-fg-muted transition hover:bg-neon-dim hover:text-neon"
                      >
                        <KeyRound size={18} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoving(member)}
                        aria-label={`Remove ${member.name} from the team`}
                        className="flex size-11 items-center justify-center rounded-full text-fg-muted transition hover:bg-danger/10 hover:text-danger"
                      >
                        <UserMinus size={18} aria-hidden />
                      </button>
                    </div>
                  )}
                </article>
              </StaggerItem>
            ))}
          </Stagger>

          {data.invites.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-neon-soft">Pending invites</h2>
              <ul className="space-y-2">
                {data.invites.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex items-center gap-3 rounded-card border border-dashed border-line p-3 text-sm"
                  >
                    <Mail size={16} className="text-fg-subtle" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{invite.email}</span>
                    <Badge tone="info">{STAFF_ROLE_LABELS[invite.staffRole]}</Badge>
                    <span className="hidden text-xs text-fg-subtle sm:inline">
                      expires{" "}
                      {new Date(invite.expiresAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => cancel.mutate(invite.id)}
                      aria-label={`Cancel invite for ${invite.email}`}
                      className="flex size-11 items-center justify-center rounded-full text-fg-muted hover:text-danger"
                    >
                      <X size={16} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {isInviting && <InviteSheet open onClose={() => setIsInviting(false)} />}
      <MemberSecuritySheet member={securityFor} onClose={() => setSecurityFor(null)} />
      <ConfirmSheet
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => remove.mutate(removing)}
        title={`Remove ${removing?.name ?? ""} from the team?`}
        description="They're signed out of the console now. Their listener account stays."
        confirmLabel="Remove access"
        loading={remove.isPending}
      />
    </>
  );
}
