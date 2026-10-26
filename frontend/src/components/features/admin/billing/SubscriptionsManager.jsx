"use client";

/**
 * Console → Subscriptions (PRD §10.10, F33; Admin and Owner): subscribers per
 * plan, monthly recurring revenue, last 30 days' revenue and failed renewals;
 * search and filter every subscription. The Owner can give a plan without
 * payment and end such a gift early. Paid plans are refunded / cancelled in
 * the Razorpay dashboard, so money is only ever moved in one place.
 */
import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, Gift, IndianRupee, Search, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import SelectField from "@/components/ui/SelectField";
import Skeleton from "@/components/ui/Skeleton";
import TextField from "@/components/ui/TextField";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import StatCard from "@/components/features/admin/insights/StatCard";
import GrantPlanSheet from "@/components/features/admin/billing/GrantPlanSheet";
import { useHasPermission } from "@/components/features/admin/RequirePermission";
import {
  getBillingStats,
  getSubscriptions,
  revokeGrantedPlan,
} from "@/services/adminConsole.service";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { showToast } from "@/store/toastStore";
import { QUERY_KEYS } from "@/utils/constants";
import { formatPrice, formatRelativeTime } from "@/utils/genericFunctions";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "access", label: "Active now" },
  { value: "problem", label: "Payment problems" },
  { value: "ended", label: "Ended" },
];
const PLAN_FILTERS = [
  { value: "", label: "Any plan" },
  { value: "premium", label: "Premium" },
  { value: "creatorPro", label: "Creator Pro" },
];
const STATUS_TONES = {
  active: "success",
  authenticated: "success",
  pending: "warning",
  halted: "danger",
  cancelled: "muted",
  completed: "muted",
  expired: "muted",
};

/** Revenue and subscribers across the top. */
function BillingStats() {
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEYS.adminBillingStats,
    queryFn: ({ signal }) => getBillingStats({ signal }),
  });
  return (
    <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <StatCard
        label="Subscribers"
        icon={Users}
        loading={isPending}
        value={data?.subscribers.total ?? 0}
        hint={
          data && `${data.subscribers.premium} Premium · ${data.subscribers.creatorPro} Creator Pro`
        }
      />
      <StatCard
        label="Monthly recurring"
        icon={IndianRupee}
        loading={isPending}
        value={formatPrice((data?.mrrPaise ?? 0) / 100)}
        hint="Yearly plans counted as 1/12"
      />
      <StatCard
        label="Revenue, 30 days"
        icon={CreditCard}
        loading={isPending}
        value={formatPrice((data?.revenue30dPaise ?? 0) / 100)}
      />
      <StatCard
        label="Failed renewals"
        icon={AlertTriangle}
        loading={isPending}
        value={data?.failedRenewals ?? 0}
        tone={data?.failedRenewals ? "warning" : "default"}
        hint="Razorpay is retrying"
      />
    </div>
  );
}

export default function SubscriptionsManager() {
  const queryClient = useQueryClient();
  const canGrant = useHasPermission("billing.manage");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);
  const [isGranting, setIsGranting] = useState(false);
  const [ending, setEnding] = useState(null);
  const q = useDebouncedValue(search.trim(), 350);
  const query = { q: q || undefined, status, plan: plan || undefined, page, limit: 25 };
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: QUERY_KEYS.adminSubscriptions(query),
    queryFn: ({ signal }) => getSubscriptions(query, { signal }),
    placeholderData: keepPreviousData,
  });
  const revoke = useMutation({
    mutationFn: (id) => revokeGrantedPlan(id),
    onSuccess: () => {
      setEnding(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "billing"] });
      showToast({ command: "selfvibe billing --revoke", message: "gift ended", tone: "success" });
    },
  });
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        eyebrow="selfvibe console --billing"
        title="Subscriptions"
        subtitle="Who pays for what. Refunds and paid cancellations happen in the Razorpay dashboard."
        actions={
          canGrant && (
            <Button onClick={() => setIsGranting(true)}>
              <Gift size={16} aria-hidden /> Give a plan
            </Button>
          )
        }
      />
      <BillingStats />

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <TextField
          label="Search"
          icon={Search}
          type="search"
          placeholder="Name or email"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <SelectField
          label="Show"
          options={STATUS_FILTERS}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        />
        <SelectField
          label="Plan"
          options={PLAN_FILTERS}
          value={plan}
          onChange={(event) => {
            setPlan(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-card" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={CreditCard}
          command="selfvibe billing --list"
          title="couldn't load subscriptions"
          description={error?.message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          command="selfvibe billing --list"
          title="no subscriptions yet"
          description={
            q || status !== "all" || plan
              ? "Nothing matches these filters."
              : "When someone upgrades, they show up here."
          }
        />
      ) : (
        <Stagger className="space-y-2" stagger={0.02} inView={false}>
          {items.map((item) => (
            <StaggerItem key={item.id}>
              <article className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-line bg-surface p-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {item.user?.name ?? "Deleted account"}
                  </span>
                  <span className="block truncate text-xs text-fg-subtle">
                    {item.user?.email ?? "—"} · started {formatRelativeTime(item.createdAt)}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="info">{item.planLabel}</Badge>
                  {item.provider === "manual" ? (
                    <Badge tone="success">Gift</Badge>
                  ) : (
                    <span className="text-xs text-fg-muted tabular-nums">
                      {formatPrice(item.amountPaise / 100)}/{item.period === "yearly" ? "yr" : "mo"}
                    </span>
                  )}
                  <Badge tone={STATUS_TONES[item.status] ?? "muted"}>
                    {item.cancelAtPeriodEnd && item.hasAccess ? "ends soon" : item.status}
                  </Badge>
                </span>
                <span className="w-full text-xs text-fg-subtle sm:w-auto">
                  {item.currentPeriodEnd
                    ? `${item.hasAccess ? "until" : "ended"} ${new Date(item.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                    : item.provider === "manual"
                      ? "no end date"
                      : ""}
                  {item.note && ` · ${item.note}`}
                </span>
                {canGrant && item.provider === "manual" && item.hasAccess && (
                  <Button size="sm" variant="ghost" onClick={() => setEnding(item)}>
                    End gift
                  </Button>
                )}
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <Pagination meta={data?.meta} onPageChange={setPage} disabled={isFetching} />

      {isGranting && <GrantPlanSheet open onClose={() => setIsGranting(false)} />}
      <ConfirmSheet
        open={Boolean(ending)}
        onClose={() => setEnding(null)}
        // Optional chaining: the React Compiler reads ending.id while rendering (ending is null when closed)
        onConfirm={() => revoke.mutate(ending?.id)}
        title={`End ${ending?.user?.name ?? "this"}'s gift?`}
        description="They move to their next plan (usually Free) right away."
        confirmLabel="End gift"
        loading={revoke.isPending}
        error={revoke.error?.message ?? null}
      />
    </>
  );
}
