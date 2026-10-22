"use client";

/**
 * Console dashboard (Day 2 version): welcome, the signed-in staff member's
 * access, and session security. Platform stats arrive with the full console
 * on Day 9.
 */
import { BarChart3, Check, Clock3, KeyRound, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import { useStaffAuthStore } from "@/store/staffAuthStore";
import { PERMISSION_LABELS, STAFF_ROLE_LABELS } from "@/utils/adminConstants";

export default function AdminDashboard() {
  const staff = useStaffAuthStore((state) => state.staff);
  if (!staff) return null;

  const firstName = staff.name.split(" ")[0];
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
        eyebrow="selfvibe console --dashboard"
        title={`Welcome, ${firstName}`}
        subtitle={`Signed in as ${STAFF_ROLE_LABELS[staff.staffRole] ?? staff.staffRole}.`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <EmptyState
          icon={BarChart3}
          command="selfvibe stats --today"
          title="no platform activity yet"
          description="Users, plays, uploads and reports will show here once music and listeners arrive."
          className="h-full"
        />

        <div className="space-y-6">
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
          </section>

          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="mb-4 text-sm font-semibold text-neon-soft">Your access</h2>
            <Stagger className="space-y-2" stagger={0.03} inView={false}>
              {staff.permissions.map((permission) => (
                <StaggerItem key={permission}>
                  <p className="flex items-center gap-3 text-sm text-fg-muted">
                    <Check size={16} className="shrink-0 text-neon" aria-hidden />
                    {PERMISSION_LABELS[permission] ?? permission}
                  </p>
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        </div>
      </div>
    </>
  );
}
