"use client";

/**
 * Signed-in user's profile: avatar, name, bio with an inline edit form,
 * account details, taste summary, app & privacy (Day 10), and Log out.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Crown, LogOut, Mail, Mic2, Pencil, ShieldCheck } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import ProfileEditForm from "@/components/features/profile/ProfileEditForm";
import TasteSummary from "@/components/features/profile/TasteSummary";
import AccountPrivacy from "@/components/features/profile/AccountPrivacy";
import { useAuthStore } from "@/store/authStore";
import { fadeUp } from "@/utils/animations";

const PLAN_LABELS = { free: "Free", premium: "Premium", creatorPro: "Creator Pro" };

/**
 * @param {Date|string} value
 * @returns {string} e.g. "October 2026"
 */
function formatMemberSince(value) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    new Date(value)
  );
}

export default function ProfileSummary() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null; // AuthGuard shows the loader until the user is known

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.replace("/login");
  };

  const details = [
    { icon: Mail, label: "Email", value: user.email },
    {
      icon: ShieldCheck,
      label: "Email status",
      value: user.emailVerified ? "Verified" : "Not verified yet",
    },
    { icon: Crown, label: "Plan", value: PLAN_LABELS[user.plan] ?? user.plan },
    { icon: Mic2, label: "Role", value: user.roles.includes("creator") ? "Creator" : "Listener" },
    { icon: CalendarDays, label: "Member since", value: formatMemberSince(user.createdAt) },
  ];

  return (
    <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <section className="flex flex-col items-center rounded-card border border-line-strong bg-surface p-5 text-center shadow-glow-lg sm:p-6 lg:sticky lg:top-[calc(var(--top-nav-height)+1.5rem)]">
        <AnimatePresence mode="wait" initial={false}>
          {isEditing ? (
            <motion.div
              key="edit"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="w-full"
            >
              <ProfileEditForm user={user} onDone={() => setIsEditing(false)} />
            </motion.div>
          ) : (
            <motion.div
              key="view"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex w-full flex-col items-center"
            >
              <Avatar name={user.name} src={user.avatar} size="lg" />
              <h2 className="mt-4 font-display text-xl font-bold tracking-tight break-words">
                {user.name}
              </h2>
              <p className="mt-1 text-sm break-all text-fg-muted">{user.email}</p>
              {user.bio ? (
                <p className="mt-4 text-sm whitespace-pre-line text-fg-muted">{user.bio}</p>
              ) : (
                <p className="mt-4 text-sm text-fg-subtle italic">No bio yet.</p>
              )}
              <div className="mt-5 grid w-full gap-2.5">
                <Button onClick={() => setIsEditing(true)} fullWidth>
                  <Pencil size={16} aria-hidden />
                  Edit profile
                </Button>
                <Button variant="outline" onClick={handleLogout} loading={isLoggingOut} fullWidth>
                  {!isLoggingOut && <LogOut size={16} aria-hidden />}
                  {isLoggingOut ? "Logging out…" : "Log out"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="min-w-0 space-y-4 sm:space-y-5">
        <TasteSummary />
        <Stagger
          className="grid content-start gap-2.5 sm:grid-cols-2 xl:grid-cols-3"
          inView={false}
        >
          {details.map(({ icon: Icon, label, value }) => (
            <StaggerItem key={label}>
              <div className="flex min-h-16 items-center gap-3 rounded-card border border-line bg-surface px-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neon-dim text-neon">
                  <Icon size={18} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-fg-subtle">{label}</p>
                  <p className="truncate text-sm text-fg">{value}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
        <AccountPrivacy />
      </div>
    </div>
  );
}
