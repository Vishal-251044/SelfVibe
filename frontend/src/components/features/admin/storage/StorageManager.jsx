"use client";

/**
 * Console → Storage (PRD STO-3/5, roadmap Day 9): space used per Cloudinary
 * account (bars warn near the full line), songs per account, bandwidth,
 * pause / resume, sync usage now, and move songs to another account in the
 * same pool. Viewing is open to all staff; changes need storage.manage.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRightLeft, HardDrive, Pause, Play, RefreshCw } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FormAlert from "@/components/ui/FormAlert";
import SelectField from "@/components/ui/SelectField";
import Sheet from "@/components/ui/Sheet";
import Skeleton from "@/components/ui/Skeleton";
import TextField from "@/components/ui/TextField";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import { useHasPermission } from "@/components/features/admin/RequirePermission";
import {
  getStorageAccounts,
  moveStorage,
  setStorageStatus,
  syncStorage,
} from "@/services/adminConsole.service";
import { showToast } from "@/store/toastStore";
import { QUERY_KEYS } from "@/utils/constants";
import { DURATION, EASE_OUT } from "@/utils/animations";
import { cn, formatFileSize, formatRelativeTime } from "@/utils/genericFunctions";

const STATUS_TONE = { active: "success", full: "danger", paused: "warning" };

/**
 * Move songs between two accounts of the same pool.
 * @param {{ open: boolean, onClose: () => void, accounts: Object[], fromKey: string|null }} props
 */
function MoveSheet({ open, onClose, accounts, fromKey }) {
  const queryClient = useQueryClient();
  const from = accounts.find((account) => account.key === fromKey);
  const targets = accounts.filter(
    (account) =>
      account.key !== fromKey && account.pool === from?.pool && account.status === "active"
  );
  const [toKey, setToKey] = useState("");
  const [limit, setLimit] = useState("20");
  const move = useMutation({
    mutationFn: () =>
      moveStorage({ fromKey, toKey: toKey || targets[0]?.key, limit: Number(limit) || 20 }),
    onSuccess: (result) => {
      showToast({
        message: `${result.queued} song(s) moving in the background`,
        tone: "success",
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminStorage });
      onClose();
    },
  });
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Move songs from ${fromKey ?? ""}`}
      description="Files are copied to the new account, then removed from the old one. Songs keep playing while they move."
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => move.mutate()}
            loading={move.isPending}
            disabled={targets.length === 0}
          >
            Move songs
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormAlert
          message={
            move.error?.message ??
            (targets.length === 0 ? `No other active account in the ${from?.pool} pool.` : null)
          }
        />
        {targets.length > 0 && (
          <>
            <SelectField
              label="Move to"
              options={targets.map((account) => ({
                value: account.key,
                label: `${account.key} · ${account.usedPercent}% used`,
              }))}
              value={toKey || targets[0].key}
              onChange={(event) => setToKey(event.target.value)}
            />
            <TextField
              label="How many songs (max 200)"
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
          </>
        )}
      </div>
    </Sheet>
  );
}

export default function StorageManager() {
  const queryClient = useQueryClient();
  const canManage = useHasPermission("storage.manage");
  const [movingFrom, setMovingFrom] = useState(null);
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.adminStorage,
    queryFn: ({ signal }) => getStorageAccounts({ signal }),
  });
  const refresh = (result) => queryClient.setQueryData(QUERY_KEYS.adminStorage, result);
  const sync = useMutation({
    mutationFn: syncStorage,
    onSuccess: (result) => {
      refresh(result);
      showToast({
        message: "usage synced from Cloudinary",
        tone: "success",
      });
    },
    onError: (syncError) =>
      showToast({
        message: syncError?.message ?? "sync failed",
        tone: "error",
      }),
  });
  const toggle = useMutation({
    mutationFn: ({ key, status }) => setStorageStatus(key, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminStorage }),
    onError: (toggleError) =>
      showToast({
        message: toggleError?.message ?? "couldn't update",
        tone: "error",
      }),
  });
  const accounts = data?.accounts ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Admin panel"
        title="Storage"
        subtitle="Cloudinary accounts in the Official and Community pools"
        actions={
          canManage && data?.usesPool ? (
            <Button variant="outline" onClick={() => sync.mutate()} loading={sync.isPending}>
              <RefreshCw size={16} aria-hidden /> Sync now
            </Button>
          ) : null
        }
      />

      {isPending ? (
        <div className="grid gap-3 md:grid-cols-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-44 rounded-card" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={HardDrive}
          title="couldn't load storage"
          description={error?.message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : !data.usesPool ? (
        <EmptyState
          icon={HardDrive}
          title={`storage driver: ${data.driver}`}
          description="The Cloudinary storage pool isn't in use. Add accounts to CLOUDINARY_ACCOUNTS in backend/.env to manage them here."
        />
      ) : (
        <Stagger className="grid gap-3 md:grid-cols-2" stagger={0.04} inView={false}>
          {accounts.map((account) => {
            const tone =
              account.usedPercent >= data.fullPercent
                ? "bg-danger"
                : account.nearlyFull
                  ? "bg-warning"
                  : "bg-neon";
            return (
              <StaggerItem key={account.key}>
                <article className="rounded-card border border-line bg-surface p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono font-medium">{account.key}</p>
                      <p className="text-xs text-fg-subtle capitalize">{account.pool} pool</p>
                    </div>
                    <Badge tone={STATUS_TONE[account.status]}>{account.status}</Badge>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-fg-muted">
                        {formatFileSize(account.bytesUsed)} of {formatFileSize(account.quotaBytes)}
                      </span>
                      <span
                        className={cn(
                          "tabular-nums",
                          account.nearlyFull ? "text-warning" : "text-fg"
                        )}
                      >
                        {account.usedPercent}%
                      </span>
                    </div>
                    <div
                      className="relative h-2.5 overflow-hidden rounded-full bg-white/5"
                      role="meter"
                      aria-valuenow={account.usedPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${account.key} space used`}
                    >
                      <motion.div
                        className={cn("h-full origin-left rounded-full", tone)}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: Math.min(1, account.usedPercent / 100) }}
                        transition={{ duration: DURATION.slow, ease: EASE_OUT }}
                      />
                      <span
                        className="absolute inset-y-0 w-px bg-danger/70"
                        style={{ left: `${data.fullPercent}%` }}
                        aria-hidden
                      />
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <dt className="text-fg-subtle">Songs</dt>
                      <dd className="text-sm tabular-nums">{account.songCount}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-subtle">Bandwidth</dt>
                      <dd className="text-sm tabular-nums">
                        {formatFileSize(account.bandwidthBytes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-fg-subtle">Synced</dt>
                      <dd className="truncate text-sm">
                        {account.lastSyncAt ? formatRelativeTime(account.lastSyncAt) : "never"}
                      </dd>
                    </div>
                  </dl>
                  {account.lastSyncError && (
                    <p className="mt-2 text-xs text-danger">
                      Last sync failed: {account.lastSyncError}
                    </p>
                  )}
                  {canManage && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                      {account.status === "paused" ? (
                        <Button
                          variant="outline"
                          onClick={() => toggle.mutate({ key: account.key, status: "active" })}
                          disabled={toggle.isPending}
                        >
                          <Play size={16} aria-hidden /> Resume
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => toggle.mutate({ key: account.key, status: "paused" })}
                          disabled={toggle.isPending}
                        >
                          <Pause size={16} aria-hidden /> Pause uploads
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => setMovingFrom(account.key)}
                        disabled={account.songCount === 0}
                      >
                        <ArrowRightLeft size={16} aria-hidden /> Move songs
                      </Button>
                    </div>
                  )}
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
      {movingFrom && (
        <MoveSheet
          open
          onClose={() => setMovingFrom(null)}
          accounts={accounts}
          fromKey={movingFrom}
        />
      )}
    </>
  );
}
