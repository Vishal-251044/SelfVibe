"use client";

/**
 * Console dashboard (PRD 10.9.2 Dashboard, roadmap Day 9): users, DAU / MAU,
 * plays today with a 14-day chart, uploads, open reports, verification
 * requests, storage used and today's top songs — plus the staff member's
 * session security and access.
 */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  Check,
  Clock3,
  Crown,
  Flag,
  HardDrive,
  IndianRupee,
  KeyRound,
  Music4,
  PlayCircle,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import CoverArt from "@/components/features/music/CoverArt";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import StatCard from "@/components/features/admin/insights/StatCard";
import TrendChart from "@/components/features/admin/insights/TrendChart";
import { useHasPermission } from "@/components/features/admin/RequirePermission";
import { getBillingStats, getDashboardStats } from "@/services/adminConsole.service";
import { useStaffAuthStore } from "@/store/staffAuthStore";
import { PERMISSION_LABELS, STAFF_ROLE_LABELS } from "@/utils/adminConstants";
import { QUERY_KEYS } from "@/utils/constants";
import { formatCount, formatFileSize, formatPrice } from "@/utils/genericFunctions";

export default function AdminDashboard() {
  const staff = useStaffAuthStore((state) => state.staff);
  const canModerate = useHasPermission("reports.manage");
  const canManageUsers = useHasPermission("users.manage");
  // Revenue is only for staff who may see billing (Admin, Owner)
  const canSeeBilling = useHasPermission("billing.view");
  const query = useQuery({
    queryKey: QUERY_KEYS.adminStats,
    queryFn: ({ signal }) => getDashboardStats({ signal }),
    refetchInterval: 60 * 1000,
  });
  const billing = useQuery({
    queryKey: QUERY_KEYS.adminBillingStats,
    queryFn: ({ signal }) => getBillingStats({ signal }),
    enabled: canSeeBilling,
  });
  if (!staff) return null;

  const stats = query.data;
  const loading = query.isPending;
  const firstName = staff.name.split(" ")[0];
  const storageHint = stats?.storage.quotaBytes
    ? `of ${formatFileSize(stats.storage.quotaBytes)} across ${stats.storage.accounts} accounts`
    : "local / single storage";
  const securityItems = [
    {
      icon: ShieldCheck,
      label: "Two-factor authentication",
      value: staff.twoFactorEnabled ? "On" : "Off",
    },
    { icon: Clock3, label: "Idle sign-out", value: "After 30 minutes" },
    { icon: KeyRound, label: "Session length", value: "Up to 8 hours" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Admin panel"
        title={`Welcome, ${firstName}`}
        subtitle={`Signed in as ${STAFF_ROLE_LABELS[staff.staffRole] ?? staff.staffRole}.`}
      />

      {query.isError ? (
        <EmptyState
          icon={Activity}
          title="couldn't load platform stats"
          description={query.error?.message}
          action={<Button onClick={() => query.refetch()}>Try again</Button>}
        />
      ) : (
        <>
          <Stagger
            className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
            stagger={0.04}
            inView={false}
          >
            <StaggerItem>
              <StatCard
                label="Listeners"
                icon={Users}
                loading={loading}
                value={formatCount(stats?.users.total)}
                hint={`${stats?.users.newToday ?? 0} new today · ${stats?.users.newThisWeek ?? 0} this week`}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Active today"
                icon={Activity}
                loading={loading}
                value={formatCount(stats?.users.dau)}
                hint={`${formatCount(stats?.users.mau)} in 30 days`}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Plays today"
                icon={PlayCircle}
                loading={loading}
                value={formatCount(stats?.plays.today)}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Songs live"
                icon={Music4}
                loading={loading}
                value={formatCount(stats?.catalog.published)}
                hint={`${stats?.catalog.official ?? 0} official · ${stats?.catalog.community ?? 0} community`}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Uploads"
                icon={Upload}
                loading={loading}
                value={stats?.catalog.uploadsToday ?? 0}
                hint={`${stats?.catalog.uploadsThisWeek ?? 0} this week · ${stats?.catalog.processing ?? 0} processing`}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Open reports"
                icon={Flag}
                loading={loading}
                tone={stats?.moderation.openReports ? "warning" : "default"}
                value={stats?.moderation.openReports ?? 0}
                hint={canModerate ? "Moderation queue" : undefined}
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Verification"
                icon={BadgeCheck}
                loading={loading}
                value={stats?.moderation.verificationRequests ?? 0}
                hint="Creators waiting"
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                label="Storage used"
                icon={HardDrive}
                loading={loading}
                value={formatFileSize(stats?.storage.bytesUsed ?? 0)}
                hint={storageHint}
              />
            </StaggerItem>
            {canSeeBilling && (
              <>
                <StaggerItem>
                  <StatCard
                    label="Subscribers"
                    icon={Crown}
                    loading={billing.isPending}
                    value={billing.data?.subscribers.total ?? 0}
                    hint="Premium + Creator Pro"
                  />
                </StaggerItem>
                <StaggerItem>
                  <StatCard
                    label="Monthly recurring"
                    icon={IndianRupee}
                    loading={billing.isPending}
                    value={formatPrice((billing.data?.mrrPaise ?? 0) / 100)}
                    hint={
                      billing.data?.failedRenewals
                        ? `${billing.data.failedRenewals} failed renewals`
                        : "Subscriptions"
                    }
                    tone={billing.data?.failedRenewals ? "warning" : "default"}
                  />
                </StaggerItem>
              </>
            )}
          </Stagger>

          <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
              <h2 className="mb-1 text-sm font-semibold text-neon-soft">Plays, last 14 days</h2>
              {loading ? (
                <div className="mt-4 h-40 animate-pulse rounded-lg bg-surface-raised" />
              ) : (
                <TrendChart
                  series={stats.plays.last14Days}
                  valueKey="plays"
                  label="Plays per day"
                />
              )}
            </section>
            <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neon-soft">Top songs today</h2>
                <Link
                  href="/admin/performance"
                  className="inline-flex min-h-11 items-center text-xs text-fg-muted hover:text-neon"
                >
                  All songs
                </Link>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="h-12 animate-pulse rounded-lg bg-surface-raised" />
                  ))}
                </div>
              ) : stats.topTracksToday.length === 0 ? (
                <p className="text-sm text-fg-subtle">No plays yet today</p>
              ) : (
                <ol className="space-y-1">
                  {stats.topTracksToday.map((track, index) => (
                    <li key={track.id}>
                      <Link
                        href={`/admin/performance/${track.id}`}
                        className="flex min-h-12 items-center gap-3 rounded-lg px-2 py-1 transition hover:bg-surface-raised"
                      >
                        <span className="w-4 text-xs font-semibold text-neon tabular-nums">
                          {index + 1}
                        </span>
                        <CoverArt
                          src={track.coverUrl}
                          alt=""
                          seed={track.id}
                          className="size-10 rounded-md"
                          sizes="40px"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-fg">{track.title}</span>
                          <span className="block truncate text-xs text-fg-subtle">
                            {track.artist}
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-fg tabular-nums">
                          {formatCount(track.plays)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-neon-soft">Session security</h2>
          <ul className="space-y-3">
            {securityItems.map(({ icon: Icon, label, value }) => (
              <li key={label} className="flex items-center gap-3 text-sm">
                <Icon size={18} className="shrink-0 text-neon" aria-hidden />
                <span className="flex-1 text-fg-muted">{label}</span>
                <span className="text-fg">{value}</span>
              </li>
            ))}
          </ul>
          {canManageUsers && stats?.users.suspended > 0 && (
            <p className="mt-4 text-xs text-fg-subtle">
              {stats.users.suspended} suspended account(s)
            </p>
          )}
        </section>
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-neon-soft">Your access</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {staff.permissions.map((permission) => (
              <li key={permission} className="flex items-center gap-2 text-sm text-fg-muted">
                <Check size={16} className="shrink-0 text-neon" aria-hidden />
                {PERMISSION_LABELS[permission] ?? permission}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
