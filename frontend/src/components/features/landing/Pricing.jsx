/**
 * Landing pricing cards for the plans in PRD §5. Prices are the live ones
 * from the API (Owner settings, refreshed every 5 minutes), with the
 * constants as a fallback. Paid plans open /upgrade (visitors sign in first);
 * perks that arrive later are marked "soon".
 */
import { Check, Clock, X } from "lucide-react";
import { fetchPublic } from "@/services/serverApi";
import GridBackground from "@/components/ui/GridBackground";
import Button from "@/components/ui/Button";
import { Stagger, StaggerItem } from "@/components/animations/Stagger";
import SectionHeading from "@/components/features/landing/SectionHeading";
import { PLANS } from "@/utils/constants";
import { cn, formatPrice } from "@/utils/genericFunctions";

export default async function Pricing() {
  const live = await fetchPublic("/billing/plans");
  const priceOf = (plan) => live?.plans?.find((item) => item.plan === plan.key)?.prices ?? null;

  return (
    <section id="pricing" className="relative isolate scroll-mt-20 py-20 sm:py-28">
      <GridBackground intensity={0.16} glow={false} />

      <div className="px-safe mx-auto max-w-6xl md:px-6">
        <SectionHeading
          eyebrow="pricing"
          title="Simple"
          highlight="pricing"
          description="Start free. Upgrade when you want more."
        />

        <Stagger className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {PLANS.map((plan) => (
            <StaggerItem key={plan.id}>
              <article
                className={cn(
                  "relative flex h-full flex-col rounded-card border p-7 transition duration-300 sm:p-8",
                  plan.highlighted
                    ? "border-neon bg-black shadow-glow-lg"
                    : "border-line bg-surface/70 hover:border-line-strong"
                )}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-7 rounded-full bg-neon px-3 py-1 text-xs font-semibold text-black">
                    Most popular
                  </span>
                )}

                <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm text-fg-muted">{plan.tagline}</p>

                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold sm:text-5xl">
                    {formatPrice(priceOf(plan)?.monthly ?? plan.price)}
                  </span>
                  <span className="text-sm text-fg-muted">/ month</span>
                </p>
                {plan.price > 0 && (
                  <p className="mt-1 text-xs text-fg-subtle">
                    or {formatPrice(priceOf(plan)?.yearly ?? plan.yearlyPrice)} / year
                  </p>
                )}

                <ul className="mt-8 flex-1 space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li
                      key={feature.label}
                      className={cn(
                        "flex items-start gap-3",
                        feature.included ? "text-fg" : "text-fg-subtle"
                      )}
                    >
                      {feature.soon ? (
                        <Clock size={18} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden />
                      ) : feature.included ? (
                        <Check size={18} className="mt-0.5 shrink-0 text-neon" aria-hidden />
                      ) : (
                        <X size={18} className="mt-0.5 shrink-0" aria-hidden />
                      )}
                      <span>
                        <span className="sr-only">
                          {feature.included ? "Included: " : "Not included: "}
                        </span>
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
                  href={plan.price === 0 ? "/signup" : `/upgrade?plan=${plan.key}`}
                  variant={plan.highlighted ? "primary" : "outline"}
                  fullWidth
                  className="mt-8"
                >
                  {plan.price === 0 ? "Start free" : `Choose ${plan.name}`}
                </Button>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
