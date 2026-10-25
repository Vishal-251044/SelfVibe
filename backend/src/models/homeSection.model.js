/**
 * HomeSection: a staff-curated block on the Home page (PRD §13 homeSections,
 * roadmap Day 9 Curation): a hero banner, featured tracks / artists, or an
 * editorial playlist. Shown in `order` while active and inside its date window.
 */
import mongoose from "mongoose";
import { HOME_SECTION_TYPES } from "../config/constants.js";

const homeSectionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: HOME_SECTION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    subtitle: { type: String, trim: true, maxlength: 160, default: "" },
    // hero: banner image + button link; editorial: the playlist
    imageUrl: { type: String, default: null },
    link: { type: String, trim: true, maxlength: 300, default: null },
    playlistId: { type: mongoose.Schema.Types.ObjectId, ref: "Playlist", default: null },
    // featuredTracks → track ids, featuredArtists → artist profile ids (in display order)
    itemIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

homeSectionSchema.index({ active: 1, order: 1 });

export const HomeSection = mongoose.model("HomeSection", homeSectionSchema);
