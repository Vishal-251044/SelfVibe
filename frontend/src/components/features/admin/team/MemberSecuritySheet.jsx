"use client";

/**
 * Console → Team → a member's security (Owner only, roadmap Day 10 admin
 * security pass, PRD ADL-5): see 2FA and lock status, and
 * - Unlock: end a lockout early (after too many failed sign-ins)
 * - Sign out everywhere: end every console session of this person
 * - Reset 2FA: for a lost phone; they set up a new authenticator at next sign-in
 * Every action is audit-logged by the API.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LockOpen, LogOut, ShieldCheck, ShieldOff, TimerReset } from "lucide-react";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import Sheet from "@/components/ui/Sheet";
import { resetStaffTwoFactor, signOutStaff, unlockStaff } from "@/services/adminConsole.service";
import { showToast } from "@/store/toastStore";
import { QUERY_KEYS } from "@/utils/constants";
import { formatRelativeTime } from "@/utils/genericFunctions";

const ACTIONS = {
  unlock: { run: unlockStaff, command: "selfvibe team --unlock", done: "account unlocked" },
  signOut: {
    run: signOutStaff,
    command: "selfvibe team --sign-out",
    done: "signed out of every device",
  },
  reset2fa: {
    run: resetStaffTwoFactor,
    command: "selfvibe team --reset-2fa",
    done: "2FA reset, they set it up again at next sign-in",
  },
};

/**
 * @param {Object} props
 * @param {Object|null} props.member - Team member from GET /admin/team (null = closed)
 * @param {() => void} props.onClose
 */
export default function MemberSecuritySheet({ member, onClose }) {
  const queryClient = useQueryClient();
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const action = useMutation({
    mutationFn: (kind) => ACTIONS[kind].run(member?.id),
    onSuccess: (result, kind) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminTeam });
      showToast({ command: ACTIONS[kind].command, message: ACTIONS[kind].done, tone: "success" });
      setIsConfirmingReset(false);
      onClose();
    },
  });

  const close = () => {
    if (action.isPending) return;
    setIsConfirmingReset(false);
    action.reset();
    onClose();
  };
  const isLocked = Boolean(member?.lockedUntil);
  const busy = (kind) => action.isPending && action.variables === kind;

  return (
    <Sheet
      open={Boolean(member)}
      onClose={close}
      dismissible={!action.isPending}
      title={`Security · ${member?.name ?? ""}`}
      description="Lockouts, sessions and two-factor authentication for this person."
    >
      {member && (
        <div className="space-y-4">
          <FormAlert message={action.error?.message ?? null} />
          <ul className="space-y-2 rounded-card border border-line bg-black/40 p-3 text-sm">
            <li className="flex items-center gap-2">
              {member.twoFactorEnabled ? (
                <ShieldCheck size={16} className="text-neon" aria-hidden />
              ) : (
                <ShieldOff size={16} className="text-warning" aria-hidden />
              )}
              {member.twoFactorEnabled
                ? "Two-factor authentication is on"
                : "Two-factor not set up yet (asked at their next sign-in)"}
            </li>
            <li className="flex items-center gap-2">
              <TimerReset
                size={16}
                className={isLocked ? "text-danger" : "text-fg-subtle"}
                aria-hidden
              />
              {isLocked
                ? `Locked after failed sign-ins, until ${new Date(member.lockedUntil).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                : "Not locked"}
            </li>
            <li className="flex items-center gap-2 text-fg-muted">
              <KeyRound size={16} className="text-fg-subtle" aria-hidden />
              {member.lastLoginAt
                ? `Last console sign-in ${formatRelativeTime(member.lastLoginAt)}`
                : "Never signed in to the console"}
            </li>
          </ul>

          <div className="grid gap-2">
            {isLocked && (
              <Button onClick={() => action.mutate("unlock")} loading={busy("unlock")}>
                <LockOpen size={16} aria-hidden /> Unlock now
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => action.mutate("signOut")}
              loading={busy("signOut")}
            >
              <LogOut size={16} aria-hidden /> Sign out everywhere
            </Button>
            {member.twoFactorEnabled &&
              (isConfirmingReset ? (
                <div className="space-y-2 rounded-card border border-danger/50 p-3">
                  <p className="text-sm text-fg-muted">
                    Their authenticator stops working right away and they&apos;re signed out. At
                    their next sign-in they scan a new QR code and get new backup codes.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => setIsConfirmingReset(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => action.mutate("reset2fa")}
                      loading={busy("reset2fa")}
                      className="bg-danger text-black hover:bg-danger/90"
                    >
                      Reset 2FA
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setIsConfirmingReset(true)}
                  className="text-danger hover:bg-danger/10 hover:text-danger"
                >
                  <ShieldOff size={16} aria-hidden /> Reset 2FA (lost phone)
                </Button>
              ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
