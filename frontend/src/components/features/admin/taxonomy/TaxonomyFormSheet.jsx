"use client";

/**
 * Add or edit a genre / vibe (roadmap Day 7): name, icon, colour,
 * description and whether listeners see it, with a live preview of the
 * Browse tile. The slug is made from the name once and never changes
 * (songs are tagged with it).
 */
import { useState } from "react";
import { Check, Type } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import CheckboxField from "@/components/ui/CheckboxField";
import FormAlert from "@/components/ui/FormAlert";
import TextField from "@/components/ui/TextField";
import TextAreaField from "@/components/ui/TextAreaField";
import TaxonomyIcon from "@/components/ui/TaxonomyIcon";
import { createCategory, updateCategory } from "@/services/adminTaxonomy.service";
import { TAXONOMY_ICONS } from "@/utils/iconRegistry";
import { cn, slugify } from "@/utils/genericFunctions";

const ICON_NAMES = Object.keys(TAXONOMY_ICONS);
/** Brand-friendly presets; any hex works through the picker. */
const COLOUR_PRESETS = [
  "#22C55E",
  "#67E8F9",
  "#A78BFA",
  "#F472B6",
  "#FB923C",
  "#FACC15",
  "#F87171",
  "#60A5FA",
  "#34D399",
  "#E879F9",
];
const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * @param {Object|null} item
 * @returns {{ name: string, icon: string, colour: string, description: string, active: boolean }}
 */
function toValues(item) {
  return {
    name: item?.name ?? "",
    icon: item?.icon ?? "Music2",
    colour: item?.colour ?? "#22C55E",
    description: item?.description ?? "",
    active: item?.active ?? true,
  };
}

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {"genre"|"vibe"} props.kind
 * @param {Object|null} [props.item] - Edit this one; null to add
 * @param {(item: Object) => void} props.onSaved
 */
export default function TaxonomyFormSheet({ open, onClose, kind, item = null, onSaved }) {
  const [values, setValues] = useState(() => toValues(item));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const label = kind === "genre" ? "genre" : "vibe";

  const update = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSave = async () => {
    setFormError(null);
    const name = values.name.trim();
    const nextErrors = {};
    if (!name) nextErrors.name = "Enter a name";
    else if (!item && !slugify(name)) nextErrors.name = "Use letters or numbers";
    if (!HEX.test(values.colour)) nextErrors.colour = "Use a colour like #22C55E";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = { ...values, name, description: values.description.trim() };
    setIsSaving(true);
    try {
      const result = item
        ? await updateCategory(kind, item.id, payload)
        : await createCategory(kind, payload);
      onSaved(result.item);
    } catch (error) {
      if (error?.details?.fields) setErrors(error.details.fields);
      setFormError(error?.message ?? `Couldn't save the ${label}. Try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!isSaving}
      title={item ? `Edit ${item.name}` : `New ${label}`}
      description={
        item
          ? `Slug: ${item.slug} (fixed — songs are tagged with it)`
          : `Slug: ${slugify(values.name) || "…"}`
      }
      className="sm:max-w-2xl"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            {item ? "Save" : `Add ${label}`}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <FormAlert message={formError} />

        {/* Live preview of the Browse tile */}
        <div
          className="flex items-center gap-4 rounded-card border border-line p-4"
          style={{
            backgroundImage: `linear-gradient(150deg, ${HEX.test(values.colour) ? values.colour : "#22C55E"}40, #050806 70%)`,
          }}
        >
          <span
            className="flex size-12 items-center justify-center rounded-xl bg-black/40"
            style={{ color: values.colour }}
          >
            <TaxonomyIcon name={values.icon} size={24} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-bold">
              {values.name || `New ${label}`}
            </span>
            <span className="block truncate text-xs text-fg-muted">
              {values.description || "Preview"}
            </span>
          </span>
        </div>

        <TextField
          label="Name"
          icon={Type}
          value={values.name}
          maxLength={40}
          onChange={(event) => update("name", event.target.value)}
          error={errors.name}
        />

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg">Icon</legend>
          <div
            role="radiogroup"
            aria-label="Icon"
            className="grid grid-cols-6 gap-2 sm:grid-cols-11"
          >
            {ICON_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={values.icon === name}
                aria-label={name}
                title={name}
                onClick={() => update("icon", name)}
                className={cn(
                  "flex aspect-square min-h-11 items-center justify-center rounded-control border transition",
                  values.icon === name
                    ? "border-neon bg-neon-dim text-neon shadow-glow-sm"
                    : "border-line text-fg-muted hover:text-fg"
                )}
              >
                <TaxonomyIcon name={name} size={20} aria-hidden />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg">Colour</legend>
          <div className="flex flex-wrap items-center gap-2">
            {COLOUR_PRESETS.map((colour) => (
              <button
                key={colour}
                type="button"
                onClick={() => update("colour", colour)}
                aria-label={`Colour ${colour}`}
                aria-pressed={values.colour.toUpperCase() === colour}
                className="flex size-11 items-center justify-center rounded-full border-2 transition"
                style={{
                  backgroundColor: colour,
                  borderColor: values.colour.toUpperCase() === colour ? "#fff" : "transparent",
                }}
              >
                {values.colour.toUpperCase() === colour && (
                  <Check size={18} className="text-black" aria-hidden />
                )}
              </button>
            ))}
            <label className="flex min-h-11 items-center gap-2 rounded-full border border-line pr-3 pl-1">
              <input
                type="color"
                value={HEX.test(values.colour) ? values.colour : "#22C55E"}
                onChange={(event) => update("colour", event.target.value.toUpperCase())}
                aria-label="Pick any colour"
                className="size-9 cursor-pointer rounded-full border-0 bg-transparent"
              />
              <input
                type="text"
                value={values.colour}
                onChange={(event) => update("colour", event.target.value.trim())}
                aria-label="Colour hex code"
                maxLength={7}
                className="w-20 bg-transparent font-mono text-sm text-fg uppercase outline-none"
              />
            </label>
          </div>
          {errors.colour && <p className="mt-2 text-sm text-danger">{errors.colour}</p>}
        </fieldset>

        <TextAreaField
          label="Short description"
          value={values.description}
          maxLength={120}
          rows={2}
          onChange={(event) => update("description", event.target.value)}
          error={errors.description}
        />
        <CheckboxField
          checked={values.active}
          onChange={(checked) => update("active", checked)}
          label="Show to listeners"
          description="Hidden ones disappear from Browse, Search and the taste quiz but keep their songs."
        />
      </div>
    </Sheet>
  );
}
