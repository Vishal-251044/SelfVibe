"use client";

/**
 * "Playback" on the profile page: streaming quality (Auto, Data saver, Normal,
 * High). Saved in this browser with the player settings and applied straight
 * away. High is part of the paid plans; free listeners see it with an upgrade
 * link instead.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Crown } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";
import { useAuthStore } from "@/store/authStore";
import { STREAM_QUALITY_OPTIONS } from "@/utils/musicConstants";
import { cn } from "@/utils/genericFunctions";
import { DURATION, EASE_OUT } from "@/utils/animations";

export default function PlaybackSettings() {
  const streamQuality = usePlayerStore((state) => state.streamQuality);
  const setStreamQuality = usePlayerStore((state) => state.setStreamQuality);
  const plan = useAuthStore((state) => state.user?.plan ?? "free");
  const isPaid = plan !== "free";

  return (
    <section
      aria-labelledby="playback-title"
      className="rounded-card border border-line bg-surface p-5 sm:p-6"
    >
      <h2 id="playback-title" className="font-semibold text-neon-soft">
        Playback
      </h2>
      <p className="mt-1 mb-4 text-sm text-fg-muted">
        Streaming quality. Auto keeps music playing on slow internet.
      </p>
      <div role="radiogroup" aria-labelledby="playback-title" className="grid gap-2 sm:grid-cols-2">
        {STREAM_QUALITY_OPTIONS.map((option) => {
          const isLocked = option.isPremium && !isPaid;
          const isSelected = streamQuality === option.value && !isLocked;
          return (
            <motion.button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isLocked}
              disabled={isLocked}
              onClick={() => setStreamQuality(option.value)}
              whileTap={isLocked ? undefined : { scale: 0.98 }}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
              className={cn(
                "flex min-h-16 items-start gap-3 rounded-xl border px-4 py-3 text-left transition",
                isSelected
                  ? "border-neon/50 bg-neon-dim"
                  : "border-line bg-black/20 hover:border-line-strong",
                isLocked && "cursor-not-allowed opacity-60 hover:border-line"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                  isSelected ? "border-neon bg-neon text-black" : "border-line-strong"
                )}
                aria-hidden
              >
                {isSelected && <Check size={12} strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                  {option.label}
                  {option.isPremium && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neon-dim px-2 py-0.5 text-[11px] font-medium text-neon">
                      <Crown size={11} aria-hidden /> Premium
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-fg-muted">{option.description}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
      {!isPaid && (
        <p className="mt-3 text-xs text-fg-subtle">
          Want High quality?{" "}
          <Link
            href="/upgrade"
            className="inline-flex min-h-11 items-center font-medium text-neon hover:underline"
          >
            See plans
          </Link>
        </p>
      )}
    </section>
  );
}
