/**
 * Owner / Admin Console constants: role labels, idle timeout and the console
 * navigation. Each nav item names the permission it needs (same keys as the
 * backend's config/permissions.js), so staff only see what they can use.
 */
import {
  Bot,
  Disc3,
  FileClock,
  Flag,
  LayoutDashboard,
  LineChart,
  Music4,
  Settings,
  Shapes,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";

export const STAFF_ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  contentManager: "Content Manager",
  moderator: "Moderator",
};

/** Sign out after 30 minutes without activity (PRD ADL-4). */
export const STAFF_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
/** While the staff member is active, tell the API at most every 5 minutes. */
export const STAFF_HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Console navigation. `ready: false` modules are shown (so staff can see what is
 * coming) but not clickable until they are built.
 */
export const ADMIN_NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        permission: "dashboard.view",
        ready: true,
      },
      {
        label: "Analytics",
        href: "/admin/analytics",
        icon: LineChart,
        permission: "dashboard.view",
        ready: false,
      },
    ],
  },
  {
    title: "Catalog",
    items: [
      {
        label: "Music",
        href: "/admin/music",
        icon: Music4,
        permission: "music.manage",
        ready: false,
      },
      {
        label: "Artists & Albums",
        href: "/admin/artists",
        icon: Disc3,
        permission: "catalog.edit",
        ready: false,
      },
      {
        label: "Genres & Vibes",
        href: "/admin/genres",
        icon: Shapes,
        permission: "genres.manage",
        ready: false,
      },
      {
        label: "Curation",
        href: "/admin/curation",
        icon: Sparkles,
        permission: "curation.manage",
        ready: false,
      },
    ],
  },
  {
    title: "Community",
    items: [
      {
        label: "Users & Creators",
        href: "/admin/users",
        icon: Users,
        permission: "users.manage",
        ready: false,
      },
      {
        label: "Moderation",
        href: "/admin/moderation",
        icon: Flag,
        permission: "reports.manage",
        ready: false,
      },
      { label: "AI Control", href: "/admin/ai", icon: Bot, permission: "ai.manage", ready: false },
    ],
  },
  {
    title: "Platform",
    items: [
      {
        label: "Team",
        href: "/admin/team",
        icon: UserCog,
        permission: "team.manage",
        ready: false,
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
        permission: "settings.manage",
        ready: false,
      },
      {
        label: "Audit log",
        href: "/admin/audit",
        icon: FileClock,
        permission: "audit.view",
        ready: false,
      },
    ],
  },
];

/** Human-readable names for permission keys (dashboard "Your access" panel). */
export const PERMISSION_LABELS = {
  "console.access": "Sign in to the console",
  "dashboard.view": "Dashboard and analytics",
  "reports.manage": "Handle reports and takedowns",
  "music.manage": "Add and upload music",
  "catalog.edit": "Edit tracks, artists and albums",
  "curation.manage": "Curate the home page",
  "genres.manage": "Manage genres and vibes",
  "users.manage": "Manage users and creators",
  "ai.manage": "AI controls",
  "audit.view": "View the audit log",
  "settings.manage": "Platform settings",
  "team.manage": "Invite and manage staff",
};
