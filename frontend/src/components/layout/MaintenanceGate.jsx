"use client";

/**
 * Maintenance mode (roadmap Day 9 Settings): when the Owner switches it on —
 * or any API call answers 503 MAINTENANCE — the app shows a terminal-style
 * "we'll be back" screen instead of the page, and checks again every minute.
 * A 503 only counts until newer settings say maintenance is over.
 */
import { useEffect, useState } from "react";
import { Construction, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import GridBackground from "@/components/ui/GridBackground";
import Logo from "@/components/ui/Logo";
import TerminalWindow from "@/components/ui/TerminalWindow";
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
        <TerminalWindow title="selfvibe@status:~">
          <div className="space-y-2 font-mono text-sm">
            <p className="text-neon">$ selfvibe status</p>
            <p className="flex items-center gap-2 text-warning">
              <Construction size={16} aria-hidden /> {">>"} maintenance in progress
            </p>
            <p className="text-fg">{message}</p>
            <p className="text-fg-subtle">
              {">>"} checking again every minute
              <span className="ml-1 animate-blink text-neon">_</span>
            </p>
          </div>
        </TerminalWindow>
        <Button variant="outline" fullWidth className="mt-6" onClick={() => refetch()}>
          <RefreshCw size={16} aria-hidden /> Check now
        </Button>
      </FadeIn>
    </div>
  );
}
