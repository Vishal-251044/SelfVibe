"use client";

/**
 * Console top bar: drawer button (phones / tablets), signed-in staff member
 * with role badge, and Sign out.
 */
import { LogOut, Menu } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Logo from "@/components/ui/Logo";
import { STAFF_ROLE_LABELS } from "@/utils/adminConstants";

/**
 * @param {Object} props
 * @param {Object} props.staff - { name, email, avatar, staffRole }
 * @param {() => void} props.onOpenMenu
 * @param {() => void} props.onSignOut
 * @param {boolean} props.isSigningOut
 */
export default function AdminTopbar({ staff, onOpenMenu, onSignOut, isSigningOut }) {
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-line bg-black/80 backdrop-blur-xl">
      <div className="flex h-(--top-nav-height) items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open console menu"
          className="flex size-11 items-center justify-center rounded-xl text-neon hover:bg-neon-dim lg:hidden"
        >
          <Menu size={22} />
        </button>
        <div className="lg:hidden">
          <Logo href="/admin" size="sm" showWordmark={false} />
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-3">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm text-fg">{staff.name}</p>
            <p className="text-xs text-neon">
              {STAFF_ROLE_LABELS[staff.staffRole] ?? staff.staffRole}
            </p>
          </div>
          <Avatar name={staff.name} src={staff.avatar} size="sm" />
          <button
            type="button"
            onClick={onSignOut}
            disabled={isSigningOut}
            aria-label="Sign out of the console"
            className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm text-fg-muted transition hover:border-neon hover:text-neon disabled:opacity-50"
          >
            <LogOut size={18} aria-hidden />
            <span className="hidden sm:inline">{isSigningOut ? "Signing out…" : "Sign out"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
