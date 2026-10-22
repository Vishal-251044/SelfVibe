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
  "/playlist",
  "/artist",
  "/studio",
  "/profile",
];

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
