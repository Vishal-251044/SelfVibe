"use client";

/**
 * Upgrade page (/upgrade, PRD §10.10): Premium and Creator Pro, monthly or
 * yearly, paid with Razorpay (UPI AutoPay, cards, netbanking). Prices come
 * from the API (Owner settings). After paying, the plan switches on as soon
 * as the server has verified the payment. ?plan= preselects a plan.
 */
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Check, Clock, CreditCard, Crown, ShieldCheck, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FormAlert from "@/components/ui/FormAlert";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { getMyBilling, getPlans } from "@/services/billing.service";
import { getMe } from "@/services/user.service";
import { useAuthStore } from "@/store/authStore";
import { PLANS, QUERY_KEYS } from "@/utils/constants";
import { DURATION, EASE_OUT } from "@/utils/animations";
import { cn, formatPrice } from "@/utils/genericFunctions";

const PERIODS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];
const STATUS_LABELS = {
  starting: "Preparing…",
  paying: "Waiting for payment…",
  confirming: "Confirming…",
};

/**
 * Monthly / Yearly switch with a sliding pill.
 * @param {{ value: string, onChange: (value: string) => void, yearlySaving: number }} props
 */
function PeriodSwitch({ value, onChange, yearlySaving }) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing period"
      className="relative inline-flex rounded-full px-0.5 before:pointer-events-none before:absolute before:inset-x-0 before:inset-y-1 before:rounded-full before:border before:border-white/10 before:bg-surface-raised before:content-['']"
    >
      {PERIODS.map((period) => {
        const isActive = period.value === value;
        return (
          <button
            key={period.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(period.value)}
            className={cn(
              "relative min-h-11 rounded-full px-4 text-[13px] font-medium transition-colors",
              isActive ? "text-black" : "text-fg-muted hover:text-fg"
            )}
          >
            {isActive && (
              <motion.span
                layoutId="period-pill"
                className="absolute inset-x-0 inset-y-1.5 rounded-full bg-neon shadow-glow-sm"
                transition={{ duration: DURATION.base, ease: EASE_OUT }}
              />
            )}
            <span className="relative">
              {period.label}
              {period.value === "yearly" && yearlySaving > 0 && (
                <span
                  className={cn("ml-1.5 text-[11px]", isActive ? "text-black/70" : "text-neon")}
                >
                  save {yearlySaving}%
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Shown after a successful upgrade. */
function UpgradeSuccess({ planLabel }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DURATION.slow, ease: EASE_OUT }}
      className="mx-auto max-w-md rounded-card border border-neon/50 bg-surface p-6 text-center shadow-glow-lg"
    >
      <motion.span
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
        className="mx-auto flex size-16 items-center justify-center rounded-full bg-neon text-black"
      >
        <Crown size={30} aria-hidden />
      </motion.span>
      <p className="mt-4 font-mono text-xs text-neon">$ selfvibe plan --upgrade</p>
      <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">
        Welcome to {planLabel}
      </h2>
      <p className="mt-2 text-sm text-fg-muted">
        Your plan is active now. Razorpay emails your receipt, and you can manage or cancel it any
        time from your profile.
      </p>
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <Button href="/home">Start listening</Button>
        <Button href="/profile" variant="outline">
          Manage plan
        </Button>
      </div>
    </motion.div>
  );
}

export default function UpgradeView() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const wanted = searchParams.get("plan");
  const [period, setPeriod] = useState(
    searchParams.get("period") === "yearly" ? "yearly" : "monthly"
  );
  const [upgradedTo, setUpgradedTo] = useState(null);
  const [buying, setBuying] = useState(null);
  const { checkout, status, error } = useRazorpayCheckout();

  const plans = useQuery({
    queryKey: QUERY_KEYS.billingPlans,
    queryFn: ({ signal }) => getPlans({ signal }),
  });
  const billing = useQuery({
    queryKey: QUERY_KEYS.myBilling,
    queryFn: ({ signal }) => getMyBilling({ signal }),
  });

  const buy = async (plan) => {
    setBuying(plan.plan);
    const result = await checkout({ plan: plan.plan, period });
    setBuying(null);
    if (!result) return;
    queryClient.setQueryData(QUERY_KEYS.myBilling, result);
    getMe()
      .then(({ user }) => setUser(user))
      .catch(() => {});
    setUpgradedTo(plan.label);
  };

  const header = (
    <PageHeader
      eyebrow="selfvibe plan --upgrade"
      title="Upgrade SelfVibe"
      subtitle="Pay with UPI, card or netbanking. Cancel any time."
    />
  );

  if (upgradedTo) {
    return (
      <>
        {header}
        <UpgradeSuccess planLabel={upgradedTo} />
      </>
    );
  }
  if (plans.isPending || billing.isPending) {
    return (
      <>
        {header}
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading plans">
          <Skeleton className="h-80 rounded-card" />
          <Skeleton className="h-80 rounded-card" />
        </div>
      </>
    );
  }
  if (plans.isError || billing.isError) {
    return (
      <>
        {header}
        <EmptyState
          icon={CreditCard}
          command="selfvibe plan --list"
          title="couldn't load plans"
          description={(plans.error ?? billing.error)?.message}
          action={
            <Button
              onClick={() => {
                plans.refetch();
                billing.refetch();
              }}
            >
              Try again
            </Button>
          }
        />
      </>
    );
  }

  const { available, plans: forSale } = plans.data;
  const current = billing.data.subscription;
  const premium = forSale.find((plan) => plan.plan === "premium");
  const yearlySaving = premium
    ? Math.round((1 - premium.prices.yearly / (premium.prices.monthly * 12)) * 100)
    : 0;

  return (
    <>
      {header}

      {current && (
        <FormAlert
          tone="info"
          className="mb-4"
          message={`You're on ${current.planLabel}${current.cancelAtPeriodEnd ? `, ending ${new Date(current.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}. Manage it from your profile.`}
        />
      )}
      {!available && (
        <FormAlert
          tone="info"
          className="mb-4"
          message="Payments aren't available yet. Please check back soon."
        />
      )}
      <FormAlert message={error} className="mb-4" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <PeriodSwitch value={period} onChange={setPeriod} yearlySaving={yearlySaving} />
        <p className="flex items-center gap-1.5 text-xs text-fg-muted">
          <ShieldCheck size={14} className="text-neon" aria-hidden /> Secure payments by Razorpay
        </p>
      </div>

      <Stagger className="grid gap-4 md:grid-cols-2" inView={false} stagger={0.06}>
        {forSale.map((plan) => {
          const details = PLANS.find((item) => item.key === plan.plan);
          const price = plan.prices[period];
          const isWanted = wanted === plan.plan || (!wanted && plan.plan === "premium");
          const isCurrent = current?.plan === plan.plan;
          const isBusy = buying === plan.plan && status !== "idle";
          return (
            <StaggerItem key={plan.plan}>
              <motion.article
                whileHover={{ y: -3 }}
                transition={{ duration: DURATION.fast }}
                className={cn(
                  "relative flex h-full flex-col rounded-card border p-5 sm:p-6",
                  isWanted
                    ? "border-neon/70 bg-black shadow-glow-lg"
                    : "border-line bg-surface hover:border-line-strong"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
                    {plan.plan === "creatorPro" ? (
                      <Sparkles size={18} className="text-neon" aria-hidden />
                    ) : (
                      <Crown size={18} className="text-neon" aria-hidden />
                    )}
                    {plan.label}
                  </h2>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neon-dim px-2.5 py-1 text-[11px] font-semibold text-neon">
                      <BadgeCheck size={13} aria-hidden /> Your plan
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[13px] text-fg-muted">{details?.tagline}</p>

                <p className="mt-4 flex items-baseline gap-1.5">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={`${plan.plan}-${period}`}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      transition={{ duration: DURATION.fast }}
                      className="font-display text-4xl font-bold tracking-tight"
                    >
                      {formatPrice(price)}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-sm text-fg-muted">
                    / {period === "yearly" ? "year" : "month"}
                  </span>
                </p>
                {period === "yearly" && (
                  <p className="text-xs text-fg-subtle">
                    That&apos;s {formatPrice(Math.round(price / 12))} a month
                  </p>
                )}

                <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                  {(details?.features ?? []).map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2.5">
                      {feature.soon ? (
                        <Clock size={16} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden />
                      ) : (
                        <Check size={16} className="mt-0.5 shrink-0 text-neon" aria-hidden />
                      )}
                      <span className={feature.soon ? "text-fg-muted" : "text-fg"}>
                        {feature.label}
                        {feature.soon && (
                          <span className="ml-1.5 rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] tracking-wide text-fg-subtle uppercase">
                            soon
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-6"
                  fullWidth
                  variant={isWanted ? "primary" : "outline"}
                  disabled={!available || Boolean(current) || (status !== "idle" && !isBusy)}
                  loading={isBusy}
                  onClick={() => buy(plan)}
                >
                  {isBusy
                    ? STATUS_LABELS[status]
                    : isCurrent
                      ? "Current plan"
                      : `Get ${plan.label}`}
                </Button>
              </motion.article>
            </StaggerItem>
          );
        })}
      </Stagger>

      <p className="mt-5 text-center text-xs text-fg-subtle">
        Renews automatically until you cancel. Prices include applicable taxes. See the{" "}
        <a href="/refunds" className="underline hover:text-neon">
          refund &amp; cancellation policy
        </a>
        .
      </p>
    </>
  );
}
