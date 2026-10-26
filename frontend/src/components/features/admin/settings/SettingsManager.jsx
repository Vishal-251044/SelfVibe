"use client";

/**
 * Console → Settings (Owner only, roadmap Day 9): maintenance mode with its
 * message, feature flags (comments, uploads, voice), upload limits per plan,
 * the admin IP allowlist (PRD ADL-6), and plan prices (PRD §10.10). Each card
 * saves on its own and every change is audit-logged.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Construction, Globe2, IndianRupee, Settings, ToggleRight, Upload } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import CheckboxField from "@/components/ui/CheckboxField";
import EmptyState from "@/components/ui/EmptyState";
import FormAlert from "@/components/ui/FormAlert";
import Skeleton from "@/components/ui/Skeleton";
import TextAreaField from "@/components/ui/TextAreaField";
import TextField from "@/components/ui/TextField";
import { getSettings, saveSettings } from "@/services/adminConsole.service";
import { showToast } from "@/store/toastStore";
import { QUERY_KEYS } from "@/utils/constants";
import { cn } from "@/utils/genericFunctions";

const FEATURES = [
  {
    key: "comments",
    label: "Comments",
    description: "Listeners can post and reply. Existing comments stay visible when off.",
  },
  {
    key: "uploads",
    label: "Creator uploads",
    description: "Anyone can upload songs. Staff uploads always work.",
  },
  { key: "voice", label: "Voice control", description: "Mic buttons in the player and search." },
  {
    key: "payments",
    label: "Subscriptions checkout",
    description: "People can buy Premium and Creator Pro. Existing plans keep renewing when off.",
  },
];
const PAID_PLANS = [
  { key: "premium", label: "Premium" },
  { key: "creatorPro", label: "Creator Pro" },
];
const PLANS = [
  { key: "free", label: "Free" },
  { key: "premium", label: "Premium" },
  { key: "creatorPro", label: "Creator Pro" },
];

/**
 * A settings card with its own Save button.
 * @param {{ icon: React.ComponentType, title: string, description: string, children: React.ReactNode, onSave: () => void, saving: boolean, error?: string|null, danger?: boolean }} props
 */
function Card({ icon: Icon, title, description, children, onSave, saving, error, danger = false }) {
  return (
    <section
      className={cn(
        "rounded-card border bg-surface p-4 sm:p-5",
        danger ? "border-warning/50" : "border-line"
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <Icon
          size={20}
          className={cn("mt-0.5 shrink-0", danger ? "text-warning" : "text-neon")}
          aria-hidden
        />
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-fg-muted">{description}</p>
        </div>
      </div>
      <FormAlert message={error ?? null} className="mb-3" />
      <div className="space-y-4">{children}</div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onSave} loading={saving}>
          Save
        </Button>
      </div>
    </section>
  );
}

/**
 * The four settings cards, starting from the saved values.
 * @param {{ settings: Object, yourIp: string }} props
 */
function SettingsForms({ settings, yourIp }) {
  const queryClient = useQueryClient();
  const [maintenance, setMaintenance] = useState(settings.maintenance);
  const [features, setFeatures] = useState(settings.features);
  const [limits, setLimits] = useState(() =>
    Object.fromEntries(
      PLANS.map(({ key }) => [
        key,
        settings.uploadLimits[key] === null ? "" : String(settings.uploadLimits[key]),
      ])
    )
  );
  const [allowlist, setAllowlist] = useState(settings.adminIpAllowlist.join("\n"));
  const [prices, setPrices] = useState(() =>
    Object.fromEntries(
      PAID_PLANS.map(({ key }) => [
        key,
        {
          monthly: String(settings.planPrices[key].monthly),
          yearly: String(settings.planPrices[key].yearly),
        },
      ])
    )
  );

  const save = useMutation({
    mutationFn: ({ changes }) => saveSettings(changes),
    onSuccess: (result, { label }) => {
      queryClient.setQueryData(QUERY_KEYS.adminSettings, (current) => ({
        ...current,
        settings: result.settings,
      }));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.publicSettings });
      showToast({
        command: "selfvibe settings --save",
        message: `${label} saved`,
        tone: "success",
      });
    },
  });
  const errorFor = (label) =>
    save.isError && save.variables?.label === label ? save.error?.message : null;

  return (
    <>
      <PageHeader
        eyebrow="selfvibe console --settings"
        title="Settings"
        subtitle="Platform switches. Only the Owner can change these."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          icon={Construction}
          title="Maintenance mode"
          description="Listeners see this message instead of the app. The console keeps working."
          danger={maintenance.enabled}
          onSave={() => save.mutate({ label: "Maintenance", changes: { maintenance } })}
          saving={save.isPending && save.variables?.label === "Maintenance"}
          error={errorFor("Maintenance")}
        >
          <CheckboxField
            checked={maintenance.enabled}
            onChange={(enabled) => setMaintenance({ ...maintenance, enabled })}
            label="App is in maintenance"
            description={
              maintenance.enabled ? "Listeners can't use SelfVibe right now." : undefined
            }
          />
          <TextAreaField
            label="Message"
            value={maintenance.message}
            maxLength={200}
            rows={2}
            onChange={(event) => setMaintenance({ ...maintenance, message: event.target.value })}
          />
        </Card>

        <Card
          icon={ToggleRight}
          title="Features"
          description="Switch features off for everyone, e.g. during an incident."
          onSave={() => save.mutate({ label: "Features", changes: { features } })}
          saving={save.isPending && save.variables?.label === "Features"}
          error={errorFor("Features")}
        >
          {FEATURES.map((feature) => (
            <CheckboxField
              key={feature.key}
              checked={features[feature.key]}
              onChange={(on) => setFeatures({ ...features, [feature.key]: on })}
              label={feature.label}
              description={feature.description}
            />
          ))}
        </Card>

        <Card
          icon={Upload}
          title="Upload limits"
          description="Community songs each creator can keep, per plan. Leave empty for unlimited."
          onSave={() =>
            save.mutate({
              label: "Upload limits",
              changes: {
                uploadLimits: Object.fromEntries(
                  PLANS.map(({ key }) => [key, limits[key] === "" ? null : Number(limits[key])])
                ),
              },
            })
          }
          saving={save.isPending && save.variables?.label === "Upload limits"}
          error={errorFor("Upload limits")}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <TextField
                key={plan.key}
                label={plan.label}
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Unlimited"
                value={limits[plan.key]}
                onChange={(event) => setLimits({ ...limits, [plan.key]: event.target.value })}
              />
            ))}
          </div>
        </Card>

        <Card
          icon={IndianRupee}
          title="Plans & prices"
          description="In rupees, taxes included. New prices apply to new subscribers; current ones keep their price."
          onSave={() =>
            save.mutate({
              label: "Prices",
              changes: {
                planPrices: Object.fromEntries(
                  PAID_PLANS.map(({ key }) => [
                    key,
                    { monthly: Number(prices[key].monthly), yearly: Number(prices[key].yearly) },
                  ])
                ),
              },
            })
          }
          saving={save.isPending && save.variables?.label === "Prices"}
          error={errorFor("Prices")}
        >
          {PAID_PLANS.map((plan) => (
            <div key={plan.key} className="grid grid-cols-2 gap-3">
              {["monthly", "yearly"].map((period) => (
                <TextField
                  key={period}
                  label={`${plan.label}, ${period === "monthly" ? "per month" : "per year"} (₹)`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={prices[plan.key][period]}
                  onChange={(event) =>
                    setPrices({
                      ...prices,
                      [plan.key]: { ...prices[plan.key], [period]: event.target.value },
                    })
                  }
                />
              ))}
            </div>
          ))}
        </Card>

        <Card
          icon={Globe2}
          title="Console IP allowlist"
          description={`Only these IP addresses can open the console. Leave empty to allow any. Your IP: ${yourIp}`}
          onSave={() =>
            save.mutate({
              label: "IP allowlist",
              changes: {
                adminIpAllowlist: allowlist
                  .split(/[\s,]+/)
                  .map((ip) => ip.trim())
                  .filter(Boolean),
              },
            })
          }
          saving={save.isPending && save.variables?.label === "IP allowlist"}
          error={errorFor("IP allowlist")}
        >
          <TextAreaField
            label="One IP per line"
            value={allowlist}
            rows={3}
            onChange={(event) => setAllowlist(event.target.value)}
          />
        </Card>
      </div>
    </>
  );
}

export default function SettingsManager() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.adminSettings,
    queryFn: ({ signal }) => getSettings({ signal }),
  });
  if (isPending || isError) {
    return (
      <>
        <PageHeader eyebrow="selfvibe console --settings" title="Settings" />
        {isError ? (
          <EmptyState
            icon={Settings}
            command="selfvibe settings"
            title="couldn't load settings"
            description={error?.message}
            action={<Button onClick={() => refetch()}>Try again</Button>}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-56 rounded-card" />
            ))}
          </div>
        )}
      </>
    );
  }
  return <SettingsForms settings={data.settings} yourIp={data.yourIp} />;
}
