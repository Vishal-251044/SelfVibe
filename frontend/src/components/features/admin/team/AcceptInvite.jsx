"use client";

/**
 * Accept a staff invite (roadmap Day 9 Team): shows who invited you and the
 * role. People with a SelfVibe account confirm their password; new people
 * pick a name and password. Then they sign in to the console (and set up 2FA).
 */
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound, MailX, ShieldCheck, User } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FormAlert from "@/components/ui/FormAlert";
import ScreenLoader from "@/components/ui/ScreenLoader";
import TextField from "@/components/ui/TextField";
import { acceptInvite, getInvite } from "@/services/adminConsole.service";

/**
 * @param {Object} props
 * @param {string} props.token
 */
export default function AcceptInvite({ token }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["admin", "invite", token],
    queryFn: ({ signal }) => getInvite(token, { signal }),
    retry: false,
  });
  const accept = useMutation({
    mutationFn: () => acceptInvite(token, { ...(name.trim() && { name: name.trim() }), password }),
  });

  if (isPending) return <ScreenLoader className="min-h-64" />;
  if (isError) {
    return (
      <EmptyState
        icon={MailX}
        command="selfvibe team --join"
        title="invite not valid"
        description={
          error?.message ??
          "This link has expired or was already used. Ask the Owner for a new one."
        }
        className="border-0 bg-transparent px-0"
      />
    );
  }
  const invite = data.invite;

  if (accept.isSuccess) {
    return (
      <div className="text-center">
        <ShieldCheck size={40} className="mx-auto mb-4 text-neon" aria-hidden />
        <p className="font-mono text-sm text-neon">$ selfvibe team --join</p>
        <h1 className="mt-2 font-display text-2xl font-bold">You&apos;re on the team</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Sign in to the console. You&apos;ll set up two-factor authentication on your first
          sign-in.
        </p>
        <Button href="/admin/login" fullWidth className="mt-6">
          Sign in to the console
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        accept.mutate();
      }}
    >
      <div>
        <p className="font-mono text-sm text-neon">$ selfvibe team --join</p>
        <h1 className="mt-2 font-display text-2xl font-bold">Join as {invite.roleLabel}</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {invite.inviterName} invited <span className="text-fg">{invite.email}</span> to the
          SelfVibe console.
        </p>
      </div>
      <FormAlert message={accept.error?.message ?? null} />
      {invite.hasAccount ? (
        <p className="text-sm text-fg-muted">
          This email already has a SelfVibe account — confirm its password to accept.
        </p>
      ) : (
        <TextField
          label="Your name"
          icon={User}
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      )}
      <TextField
        label={invite.hasAccount ? "Password" : "Choose a password"}
        icon={KeyRound}
        type="password"
        autoComplete={invite.hasAccount ? "current-password" : "new-password"}
        minLength={8}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={accept.error?.details?.fields?.password}
        required
      />
      <Button
        type="submit"
        fullWidth
        loading={accept.isPending}
        disabled={password.length < 8 || (!invite.hasAccount && !name.trim())}
      >
        Accept invite
      </Button>
    </form>
  );
}
