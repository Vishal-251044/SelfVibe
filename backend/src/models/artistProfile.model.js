/**
 * ArtistProfile: public artist page (PRD §13 `artistProfiles`).
 * Linked to a creator's user account, or created by staff / the seed for
 * official artists that have no account (userId is then null).
 * `slug` is the stable key used to match uploaded music to the right artist.
 */
import mongoose from "mongoose";

const artistProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    stageName: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, trim: true, lowercase: true, match: /^[a-z0-9-]+$/ },
    bio: { type: String, trim: true, maxlength: 1000, default: "" },
    avatar: { type: String, default: null },
    // Who took the photo / where it is licensed from (required for Wikimedia Commons images)
    avatarCredit: {
      source: { type: String, default: null }, // e.g. "Wikimedia Commons"
      url: { type: String, default: null }, // file / licence page
    },
    banner: { type: String, default: null },
    socials: {
      instagram: { type: String, trim: true },
      youtube: { type: String, trim: true },
      spotify: { type: String, trim: true },
      x: { type: String, trim: true },
      website: { type: String, trim: true },
    },

    // Discovery tags (genre / vibe slugs) used for onboarding suggestions and recommendations
    genres: { type: [String], default: [] },
    vibes: { type: [String], default: [] },
    country: { type: String, uppercase: true, match: /^[A-Z]{2}$/, default: null }, // ISO 3166-1
    popularity: { type: Number, min: 0, max: 100, default: 0 }, // editorial rank until real stats exist

    verified: { type: Boolean, default: false },
    createdByStaff: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    followersCount: { type: Number, default: 0, min: 0 },
    monthlyListeners: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// One artist profile per user account; official artists (userId null) are not constrained
artistProfileSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } }
);
// Slugs are unique when present (creator profiles may not have one yet)
artistProfileSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { slug: { $type: "string" } } }
);
artistProfileSchema.index({ stageName: 1 });

// A renamed artist renames itself on every track (search matches "song by artist")
artistProfileSchema.pre("save", function rememberRename() {
  this.$locals.isRenamed = !this.isNew && this.isModified("stageName");
});
artistProfileSchema.post("save", async function renameOnTracks(artist) {
  if (!artist.$locals.isRenamed) return;
  await mongoose
    .model("Track")
    .updateMany({ artistId: artist._id }, { $set: { artistName: artist.stageName } });
});
artistProfileSchema.index({ genres: 1 });
artistProfileSchema.index({ vibes: 1 });

export const ArtistProfile = mongoose.model("ArtistProfile", artistProfileSchema);
