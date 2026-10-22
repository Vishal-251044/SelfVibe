"use client";

/**
 * Console navigation, filtered by the staff member's permissions. Modules that
 * are not built yet are listed but disabled (labelled "Soon").
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { ADMIN_NAV_SECTIONS } from "@/utils/adminConstants";
import { cn } from "@/utils/genericFunctions";

/**
 * @param {Object} props
 * @param {string[]} props.permissions - The staff member's permissions
 * @param {() => void} [props.onNavigate] - Called after a link is used (closes the drawer)
 */
export default function AdminSidebar({ permissions, onNavigate }) {
  const pathname = usePathname();

  const sections = ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => permissions.includes(item.permission)),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-(--top-nav-height) shrink-0 items-center gap-3 border-b border-line px-5">
        <Logo href="/admin" size="sm" />
        <span className="rounded-md border border-line-strong px-2 py-0.5 text-[0.625rem] tracking-widest text-neon uppercase">
          Console
        </span>
      </div>

      <nav aria-label="Console" className="no-scrollbar flex-1 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            <p className="mb-2 px-3 text-[0.6875rem] tracking-widest text-fg-subtle uppercase">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map(({ label, href, icon: Icon, ready }) => {
                const isActive = pathname === href;
                const classes = cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                  isActive && "bg-neon-dim text-neon shadow-[inset_2px_0_0_var(--color-neon)]",
                  !isActive && ready && "text-fg-muted hover:bg-surface-raised hover:text-fg",
                  !ready && "cursor-not-allowed text-fg-subtle/70"
                );

                return (
                  <li key={href}>
                    {ready ? (
                      <Link
                        href={href}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={classes}
                      >
                        <Icon size={18} aria-hidden />
                        {label}
                      </Link>
                    ) : (
                      <span aria-disabled="true" className={classes}>
                        <Icon size={18} aria-hidden />
                        <span className="flex-1">{label}</span>
                        <span className="rounded border border-line px-1.5 text-[0.625rem] uppercase">
                          Soon
                        </span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
