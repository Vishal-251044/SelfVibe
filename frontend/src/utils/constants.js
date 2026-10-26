/**
 * App-wide constants: brand copy, navigation, vibes and plan data.
 * Keep product data that appears on more than one screen here so it has a
 * single source of truth.
 */
import {
  Home,
  Search,
  Library,
  Sparkles,
  User,
  Coffee,
  Target,
  Code2,
  Dumbbell,
  Moon,
  Plane,
  Smile,
  PartyPopper,
} from "lucide-react";

export const APP_NAME = "SelfVibe";
export const APP_TAGLINE = "Stream music. Feel the magic.";
export const APP_DESCRIPTION =
  "A next-generation music platform for listeners and creators: personalised streaming, a taste-learning recommendation engine, and an AI music studio.";

/**
 * Non-secret "a session exists" cookies set by the API. The route guard
 * (src/proxy.js) reads them to redirect before rendering; real access is
 * always checked by the API.
 */
export const SESSION_HINT_COOKIES = {
  user: "sv_session",
  staff: "sv_staff",
};

/** Pages that need a signed-in listener (kept in sync with the (app) route group). */
export const PROTECTED_APP_PATHS = [
  "/home",
  "/search",
  "/library",
  "/studio",
  "/profile",
  "/onboarding",
  "/creator",
  "/browse",
  "/mix",
  "/upgrade",
];

/** App pages anyone can open (shared links); a session is used when there is one. */
export const PUBLIC_APP_PATHS = ["/artist", "/playlist", "/track"];

/** Where a shared link opens (Day 10). These pages are public and have link previews. */
export const SHARE_PATHS = { track: "/track", playlist: "/playlist", artist: "/artist" };

/** Primary in-app destinations (MOB-2: Home · Search · Library · AI Studio · Profile). */
export const APP_NAV_ITEMS = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Search", href: "/search", icon: Search },
  { label: "Library", href: "/library", icon: Library },
  { label: "Studio", href: "/studio", icon: Sparkles },
  { label: "Profile", href: "/profile", icon: User },
];

/** Section anchors on the public landing page. */
export const LANDING_NAV_ITEMS = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Vibes", href: "#vibes" },
  { label: "Pricing", href: "#pricing" },
];

/** Vibes from PRD BRW-2. `slug` is what the API will use on Day 7. */
export const VIBES = [
  { name: "Chill", slug: "chill", icon: Coffee, blurb: "Slow down, breathe out" },
  { name: "Focus", slug: "focus", icon: Target, blurb: "Deep work, no distractions" },
  { name: "Code", slug: "code", icon: Code2, blurb: "Flow state for builders" },
  { name: "Gym", slug: "gym", icon: Dumbbell, blurb: "High energy, heavy sets" },
  { name: "Sleep", slug: "sleep", icon: Moon, blurb: "Soft sounds for late nights" },
  { name: "Travel", slug: "travel", icon: Plane, blurb: "Windows down, long roads" },
  { name: "Happy", slug: "happy", icon: Smile, blurb: "Instant mood lift" },
  { name: "Party", slug: "party", icon: PartyPopper, blurb: "Turn the volume up" },
];

/**
 * Plans from PRD §5. `key` matches the API (/billing/plans); prices here are
 * fallbacks, the live prices come from the API (Owner sets them in Settings).
 * `soon` marks perks that arrive with later releases (AI Studio, downloads),
 * so the pricing page never sells something that doesn't exist yet.
 */
export const PLANS = [
  {
    id: "free",
    key: "free",
    name: "Free",
    price: 0,
    yearlyPrice: 0,
    tagline: "For everyday listening",
    highlighted: false,
    features: [
      { label: "Stream the full catalog", included: true },
      { label: "Personal For You feed and Daily Mixes", included: true },
      { label: "Playlists, likes and follows", included: true },
      { label: "Voice control (English + Hindi)", included: true },
      { label: "Upload up to 20 of your songs", included: true },
      { label: "High-quality audio", included: false },
    ],
  },
  {
    id: "premium",
    key: "premium",
    name: "Premium",
    price: 99,
    yearlyPrice: 990,
    tagline: "For power listeners",
    highlighted: true,
    features: [
      { label: "Everything in Free", included: true },
      { label: "High-quality audio when available", included: true },
      { label: "Supports independent artists", included: true },
      { label: "More AI generations per day", included: true, soon: true },
      { label: "Offline downloads", included: true, soon: true },
    ],
  },
  {
    id: "creator-pro",
    key: "creatorPro",
    name: "Creator Pro",
    price: 149,
    yearlyPrice: 1490,
    tagline: "For artists and producers",
    highlighted: false,
    features: [
      { label: "Everything in Premium", included: true },
      { label: "Unlimited song uploads", included: true },
      { label: "Creator analytics for every song", included: true },
      { label: "Most AI generations per day", included: true, soon: true },
      { label: "Promotion slots in discovery", included: true, soon: true },
    ],
  },
];

/** Taste quiz rules — same as the API (PRD ONB-1). */
export const ONBOARDING_LIMITS = {
  minGenres: 3,
  maxGenres: 10,
  minVibes: 2,
  maxVibes: 8,
  maxArtists: 20,
};

/** React Query cache keys, in one place so invalidation never misses one. */
export const QUERY_KEYS = {
  onboardingOptions: ["onboarding", "options"],
  taste: ["users", "me", "taste"],
  /** @param {string[]} genres @param {string[]} vibes */
  myArtist: ["creator", "me"],
  myTracks: (page) => ["creator", "tracks", page],
  myUploadUsage: ["creator", "usage"],
  likedIds: ["library", "likes", "ids"],
  likedTracks: ["library", "likes", "list"],
  followIds: ["library", "follows", "ids"],
  follows: ["library", "follows", "list"],
  history: ["library", "history"],
  myPlaylists: ["playlists", "mine"],
  /** @param {string} id */
  playlist: (id) => ["playlists", "detail", id],
  /** @param {string} trackId @param {string} sort */
  comments: (trackId, sort) => ["comments", trackId, sort],
  /** @param {string} commentId */
  replies: (commentId) => ["comments", "replies", commentId],
  /** @param {string} idOrSlug */
  artistPage: (idOrSlug) => ["artists", idOrSlug],
  adminTaxonomy: ["admin", "taxonomy"],
  /** @param {string} q @param {string} catalog */
  search: (q, catalog) => ["search", q, catalog],
  recentSearches: ["search", "recent"],
  forYouAll: ["feed", "for-you"], // every catalog (prefix)
  /** @param {string} catalog */
  forYou: (catalog) => ["feed", "for-you", catalog],
  /** @param {"genre"|"vibe"} kind @param {string} catalog */
  categories: (kind, catalog) => ["browse", kind, "list", catalog],
  /** @param {"genre"|"vibe"} kind @param {string} slug @param {string} catalog @param {string} sort */
  category: (kind, slug, catalog, sort) => ["browse", kind, slug, catalog, sort],
  /** @param {string} catalog */
  trending: (catalog) => ["browse", "trending", catalog],
  /** @param {string} catalog */
  newReleases: (catalog) => ["browse", "new", catalog],
  /** @param {"genre"|"vibe"} kind */
  adminCategories: (kind) => ["admin", "categories", kind],
  dailyMixes: (catalog) => ["feed", "daily-mix", catalog],
  /** @param {string} trackId */
  similar: (trackId) => ["tracks", trackId, "similar"],
  // Plans & payments
  billingPlans: ["billing", "plans"],
  myBilling: ["billing", "me"],
  adminBillingStats: ["admin", "billing", "stats"],
  /** @param {Object} query */
  adminSubscriptions: (query) => ["admin", "billing", "subscriptions", query],
  /** @param {string} trackId - Song page (Day 10) */
  track: (trackId) => ["tracks", trackId, "page"],
  creatorAnalytics: (range) => ["creator", "analytics", range],
  publicSettings: ["settings", "public"],
  homeSections: (catalog) => ["home", "sections", catalog],
  adminStats: ["admin", "stats"],
  adminPerformance: (query) => ["admin", "performance", query],
  adminTrackPerformance: (trackId, range) => ["admin", "performance", trackId, range],
  adminComments: (query) => ["admin", "comments", query],
  adminReports: (query) => ["admin", "reports", query],
  adminUsers: (query) => ["admin", "users", query],
  adminUser: (id) => ["admin", "user", id],
  adminVerification: ["admin", "verification"],
  adminStorage: ["admin", "storage"],
  adminHomeSections: ["admin", "home-sections"],
  adminEditorial: ["admin", "editorial"],
  adminTeam: ["admin", "team"],
  adminSettings: ["admin", "settings"],
  adminAudit: (query) => ["admin", "audit", query],
  adminTracks: (filters) => ["admin", "tracks", filters],
  adminTrack: (trackId) => ["admin", "track", trackId],
  adminArtists: (filters) => ["admin", "artists", filters],
  adminArtist: (artistId) => ["admin", "artist", artistId],
  adminAlbum: (albumId) => ["admin", "album", albumId],
  adminBulk: (bulkId) => ["admin", "bulk", bulkId],
  artistSuggestions: (genres, vibes) => [
    "onboarding",
    "artists",
    [...genres].sort(),
    [...vibes].sort(),
  ],
};
