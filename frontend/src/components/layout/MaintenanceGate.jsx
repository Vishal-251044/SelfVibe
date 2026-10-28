"use client";

/**
 * Maintenance mode (roadmap Day 9 Settings): when the Owner switches it on —
 * or any API call answers 503 MAINTENANCE — the app shows a friendly
 * "we'll be back" screen instead of the page, and checks again every minute.
 * A 503 only counts until newer settings say maintenance is over.
 */
import { useEffect, useState } from "react";
import { Construction, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import GridBackground from "@/components/ui/GridBackground";
import Logo from "@/components/ui/Logo";
import FadeIn from "@/components/animations/FadeIn";
import { onMaintenance } from "@/services/api";
import { useAppSettings } from "@/hooks/useAppSettings";

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function MaintenanceGate({ children }) {
  const { maintenance, updatedAt, refetch } = useAppSettings();
  const [apiNotice, setApiNotice] = useState(null); // { message, at }

  // Any request that hits maintenance flips the screen on, and re-checks the settings
  useEffect(
    () =>
      onMaintenance((message) => {
        setApiNotice({ message, at: Date.now() });
        refetch();
      }),
    [refetch]
  );

  const apiSaysDown =
    Boolean(apiNotice) && !(maintenance && updatedAt > apiNotice.at && !maintenance.enabled);
  const isDown = maintenance?.enabled || apiSaysDown;
  if (!isDown) return children;
  const message = maintenance?.enabled ? maintenance.message : apiNotice?.message;

  return (
    <div className="pt-safe pb-safe px-safe fixed inset-0 z-[80] flex flex-col items-center justify-center gap-8 overflow-y-auto bg-ink py-10">
      <GridBackground intensity={0.2} />
      <Logo href={null} />
      <FadeIn className="w-full max-w-lg px-4">
        <div className="rounded-card border border-white/10 bg-surface/90 p-6 text-center shadow-panel backdrop-blur">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-warning/15 text-warning">
            <Construction size={26} aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold tracking-tight">
            We&apos;re tuning things up
          </h1>
          <p className="mt-2 text-sm text-fg-muted">{message}</p>
          <p className="mt-4 text-xs text-fg-subtle">We&apos;ll check again every minute.</p>
        </div>
        <Button variant="outline" fullWidth className="mt-6" onClick={() => refetch()}>
          <RefreshCw size={16} aria-hidden /> Check now
        </Button>
      </FadeIn>
    </div>
  );
}
