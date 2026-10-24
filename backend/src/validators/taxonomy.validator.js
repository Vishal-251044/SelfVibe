/**
 * Zod schemas for the admin Genres & Vibes manager (roadmap Day 7).
 */
import { z } from "zod";
import { TAXONOMY_ICONS } from "../config/constants.js";

const name = z
  .string()
  .trim()
  .min(1, { error: "Enter a name" })
  .max(40, { error: "Use at most 40 characters" });
const icon = z.enum(TAXONOMY_ICONS, { error: "Pick an icon from the list" });
const colour = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, { error: "Use a colour like #22C55E" })
  .transform((value) => value.toUpperCase());
const description = z.string().trim().max(120, { error: "Use at most 120 characters" });
const objectId = z.string().regex(/^[0-9a-f]{24}$/i, { error: "Invalid id" });

/** POST /api/admin/genres, /api/admin/vibes */
export const createCategorySchema = z.object({
  name,
  // Optional; made from the name when missing. Songs are tagged with it, so it can't change later.
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "Use lowercase letters, numbers and dashes" })
    .max(40)
    .optional(),
  icon,
  colour,
  description: description.default(""),
  active: z.boolean().default(true),
});

/** PATCH /api/admin/genres/:id, /api/admin/vibes/:id */
export const updateCategorySchema = z
  .object({
    name: name.optional(),
    icon: icon.optional(),
    colour: colour.optional(),
    description: description.optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { error: "Nothing to update" });

/** PUT /api/admin/genres/order, /api/admin/vibes/order */
export const reorderCategoriesSchema = z.object({
  ids: z.array(objectId).min(1).max(500),
});

export const categoryIdParamsSchema = z.object({ id: objectId });
