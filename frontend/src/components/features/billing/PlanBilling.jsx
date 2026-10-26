"use client";

/**
 * "Plan & billing" on the profile page (PRD §10.10): current plan, when it
 * renews or ends, a warning when a renewal failed, Upgrade / Cancel, and the
 * last payments. Cancelling keeps the plan until the paid period ends.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Crown, CreditCard, Receipt } from "lucide-react";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import Skeleton from "@/components/ui/Skeleton";
import { cancelSubscription, getMyBilling } from "@/services/billing.service";
import { getMe } from "@/services/user.service";
import { useAuthStore } from "@/store/authStore";
import { showToast } from "@/store/toastStore";
import { QUERY_KEYS } from "@/utils/constants";
import { cn, formatPrice } from "@/utils/genericFunctions";

/**
 * @param {Date|string|null} value
 * @returns {string} e.g. "26 Nov 2026"
 */
function longDate(value) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
}

/** One line under the plan name: renews / ends / no end. */
function renewalLine(subscription) {
  if (!subscription) return "Free forever. Upgrade any time.";
  if (subscription.provider === "manual") {
    return subscription.currentPeriodEnd
      ? `Gift from SelfVibe, until ${longDate(subscription.currentPeriodEnd)}`
      : "Gift from SelfVibe, no end date";
  }
  if (subscription.cancelAtPeriodEnd)
    return `Cancelled. Ends on ${longDate(subscription.currentPeriodEnd)}`;
  const price = `${formatPrice(subscription.amountPaise / 100)} / ${subscription.period === "yearly" ? "year" : "month"}`;
  return subscription.currentPeriodEnd
    ? `${price} · renews on ${longDate(subscription.currentPeriodEnd)}`
    : price;
}

export default function PlanBilling() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: QUERY_KEYS.myBilling,
    queryFn: ({ signal }) => getMyBilling({ signal }),
  });
  const cancel = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: (result) => {
      queryClient.setQueryData(QUERY_KEYS.myBilling, result);
      setIsCancelOpen(false);
      getMe()
        .then(({ user }) => setUser(user))
        .catch(() => {});
      showToast({
        command: "selfvibe plan --cancel",
        message: `cancelled, ${result.planLabel} stays on until ${longDate(result.subscription?.currentPeriodEnd)}`,
        tone: "success",
        durationMs: 6000,
      });
    },
  });

  return (
    <section
      aria-labelledby="plan-billing-title"
      className="rounded-card border border-line bg-surface p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id="plan-billing-title"
          className="flex items-center gap-2 font-semibold text-neon-soft"
        >
          <CreditCard size={18} className="text-neon" aria-hidden /> Plan &amp; billing
        </h2>
      </div>

      {isPending ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
      ) : isError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
          Couldn&apos;t load your plan.
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3.5",
              data.plan === "free" ? "border-line bg-black/30" : "border-neon/40 bg-neon-dim"
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                data.plan === "free" ? "bg-surface-raised text-fg-muted" : "bg-neon text-black"
              )}
            >
              <Crown size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">{data.planLabel}</p>
              <p className="flex items-center gap-1.5 text-[13px] text-fg-muted">
                <CalendarClock size={13} aria-hidden className="shrink-0" />
                {renewalLine(data.subscription)}
              </p>
            </div>
          </div>

          {data.subscription?.paymentProblem && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-[13px] text-warning"
            >
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
              Your last renewal didn&apos;t go through. Razorpay will try again over the next few
              days; check your UPI app or card so your plan keeps going.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2.5">
            {data.plan === "free" ? (
              <Button href="/upgrade">
                <Crown size={16} aria-hidden /> Upgrade
              </Button>
            ) : (
              <Button href="/upgrade" variant="outline">
                See plans
              </Button>
            )}
            {data.subscription?.canCancel && (
              <Button
                variant="ghost"
                onClick={() => setIsCancelOpen(true)}
                className="text-fg-muted hover:text-danger"
              >
                Cancel plan
              </Button>
            )}
          </div>

          {data.payments.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-fg-muted">
                <Receipt size={14} aria-hidden /> Payments
              </h3>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {data.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]"
                  >
                    <span className="text-fg-muted">{longDate(payment.paidAt)}</span>
                    <span className="truncate text-fg-subtle uppercase">
                      {payment.method ?? ""}
                    </span>
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        payment.status === "captured" ? "text-fg" : "text-fg-subtle line-through"
                      )}
                    >
                      {formatPrice(payment.amountPaise / 100)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-fg-subtle">
                Receipts are emailed by Razorpay after each payment.
              </p>
            </div>
          )}
        </>
      )}

      <ConfirmSheet
        open={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={() => cancel.mutate()}
        title={`Cancel ${data?.planLabel ?? "your plan"}?`}
        description={
          data?.subscription?.status === "active"
            ? `You keep ${data?.planLabel} until ${longDate(data?.subscription?.currentPeriodEnd)}, then you're on Free. You won't be charged again.`
            : "Your plan stops now and you won't be charged."
        }
        confirmLabel="Cancel plan"
        loading={cancel.isPending}
        error={cancel.error?.message ?? null}
      />
    </section>
  );
}
