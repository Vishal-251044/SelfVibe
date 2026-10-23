"use client";

/**
 * Upload allowance (PRD CRT-8): "3 of 20 songs · 12.4 MB used" with a bar.
 * Also exports the hook so the upload form can block uploads at the limit.
 */
import { useQuery } from "@tanstack/react-query";
import { HardDrive } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import Skeleton from "@/components/ui/Skeleton";
import { getMyUploadUsage } from "@/services/track.service";
import { QUERY_KEYS } from "@/utils/constants";
import { cn, formatFileSize } from "@/utils/genericFunctions";

/**
 * My upload allowance.
 * @returns {{ usage: { songsUsed: number, songLimit: number|null, bytesUsed: number }|undefined, isPending: boolean, isAtLimit: boolean }}
 */
export function useUploadAllowance() {
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEYS.myUploadUsage,
    queryFn: ({ signal }) => getMyUploadUsage({ signal }),
  });
  const isAtLimit = Boolean(data && data.songLimit !== null && data.songsUsed >= data.songLimit);
  return { usage: data, isPending, isAtLimit };
}

/**
 * @param {Object} props
 * @param {string} [props.className]
 */
export default function UploadAllowance({ className }) {
  const { usage, isPending, isAtLimit } = useUploadAllowance();

  if (isPending) return <Skeleton className={cn("h-20 rounded-card", className)} />;
  if (!usage) return null;

  const isUnlimited = usage.songLimit === null;
  const percent = isUnlimited ? 0 : (usage.songsUsed / usage.songLimit) * 100;

  return (
    <section
      aria-label="Upload allowance"
      className={cn("rounded-card border border-line bg-surface p-4", className)}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 text-fg">
          <HardDrive size={16} className="text-neon" aria-hidden />
          {isUnlimited
            ? `${usage.songsUsed} songs · unlimited`
            : `${usage.songsUsed} of ${usage.songLimit} songs`}
        </span>
        <span className="text-xs text-fg-subtle">{formatFileSize(usage.bytesUsed)} used</span>
      </div>
      {!isUnlimited && (
        <ProgressBar
          value={percent}
          tone={isAtLimit ? "danger" : "neon"}
          label="Songs uploaded"
          className="mt-3"
        />
      )}
      {isAtLimit && (
        <p className="mt-2 text-xs text-danger">
          You&apos;ve used all your uploads. Delete a song or upgrade to Creator Pro for unlimited
          uploads.
        </p>
      )}
    </section>
  );
}
