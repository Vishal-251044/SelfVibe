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
];

/** App pages anyone can open (shared links); a session is used when there is one. */
export const PUBLIC_APP_PATHS = ["/artist", "/playlist"];

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

/** Plans from PRD §5 (proposal — final pricing is decided before payments ship). */
export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    tagline: "For everyday listening",
    highlighted: false,
    features: [
      { label: "Stream the full catalog", included: true },
      { label: "Personal For You feed", included: true },
      { label: "Playlists, likes and follows", included: true },
      { label: "Voice control (English + Hindi)", included: true },
      { label: "3 AI generations per day", included: true },
      { label: "Ad-free, unlimited skips", included: false },
      { label: "Offline downloads", included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 99,
    tagline: "For power listeners",
    highlighted: true,
    features: [
      { label: "Everything in Free", included: true },
      { label: "Ad-free, unlimited skips", included: true },
      { label: "High-quality audio", included: true },
      { label: "Offline downloads", included: true },
      { label: "20 AI generations per day", included: true },
    ],
  },
  {
    id: "creator-pro",
    name: "Creator Pro",
    price: 149,
    tagline: "For artists and producers",
    highlighted: false,
    features: [
      { label: "Everything in Premium", included: true },
      { label: "Unlimited uploads", included: true },
      { label: "Detailed creator analytics", included: true },
      { label: "100 AI generations per day", included: true },
      { label: "Promotion slots in discovery", included: true },
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
