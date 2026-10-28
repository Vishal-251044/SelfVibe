"use client";

/**
 * Console → Subscriptions → "Give a plan" (Owner, PRD §10.10): pick a person,
 * a plan, how long, and why (gift, refund, beta tester). No payment is taken;
 * the grant is audit-logged and ends by itself.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import FormAlert from "@/components/ui/FormAlert";
import SelectField from "@/components/ui/SelectField";
import Sheet from "@/components/ui/Sheet";
import TextField from "@/components/ui/TextField";
import { getUsers, grantPlan } from "@/services/adminConsole.service";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { showToast } from "@/store/toastStore";
import { QUERY_KEYS } from "@/utils/constants";
import { cn } from "@/utils/genericFunctions";

const PLAN_OPTIONS = [
  { value: "premium", label: "Premium" },
  { value: "creatorPro", label: "Creator Pro" },
];
const DURATION_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "3 months" },
  { value: "365", label: "1 year" },
  { value: "forever", label: "No end date" },
];

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {{ id: string, name: string, email: string, avatar?: string|null }} [props.person] - Pre-selected (from Users & Creators)
 * @param {() => void} [props.onGranted] - After the plan is given
 */
export default function GrantPlanSheet({ open, onClose, person: initialPerson = null, onGranted }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [person, setPerson] = useState(initialPerson);
  const [plan, setPlan] = useState("premium");
  const [duration, setDuration] = useState("30");
  const [note, setNote] = useState("");
  const q = useDebouncedValue(search.trim(), 300);
  const query = { q, filter: "all", page: 1, limit: 6 };
  const people = useQuery({
    queryKey: QUERY_KEYS.adminUsers(query),
    queryFn: ({ signal }) => getUsers(query, { signal }),
    enabled: open && q.length >= 2,
  });
  const grant = useMutation({
    mutationFn: () =>
      grantPlan({
        userId: person?.id,
        plan,
        days: duration === "forever" ? null : Number(duration),
        note: note.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "billing"] });
      onGranted?.();
      showToast({
        message: `${person?.name} is on ${PLAN_OPTIONS.find((option) => option.value === plan).label}`,
        tone: "success",
      });
      onClose();
    },
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!grant.isPending}
      title="Give a plan"
      description="No payment is taken. It ends by itself, and you can end it early."
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onClose} disabled={grant.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => grant.mutate()}
            loading={grant.isPending}
            disabled={!person || note.trim().length < 3}
          >
            Give plan
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormAlert message={grant.error?.message ?? null} />
        {person ? (
          <div className="flex items-center gap-3 rounded-xl border border-neon/40 bg-neon-dim p-3">
            <Avatar name={person.name} src={person.avatar} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{person.name}</span>
              <span className="block truncate text-xs text-fg-subtle">{person.email}</span>
            </span>
            <Button size="sm" variant="ghost" onClick={() => setPerson(null)}>
              Change
            </Button>
          </div>
        ) : (
          <div>
            <TextField
              label="Person"
              icon={Search}
              type="search"
              placeholder="Search by name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {(people.data?.items ?? []).length > 0 && (
              <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                {people.data.items.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => setPerson(user)}
                      className="flex min-h-12 w-full items-center gap-3 px-3 text-left transition hover:bg-surface-raised"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{user.name}</span>
                        <span className="block truncate text-xs text-fg-subtle">{user.email}</span>
                      </span>
                      <span
                        className={cn(
                          "text-[11px]",
                          user.plan === "free" ? "text-fg-subtle" : "text-neon"
                        )}
                      >
                        {user.plan}
                      </span>
                      <Check size={16} className="text-fg-subtle" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Plan"
            options={PLAN_OPTIONS}
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
          />
          <SelectField
            label="For"
            options={DURATION_OPTIONS}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </div>
        <TextField
          label="Reason (saved in the audit log)"
          placeholder="e.g. refund, beta tester, contest prize"
          maxLength={200}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
    </Sheet>
  );
}
