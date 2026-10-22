"use client";

/**
 * Public landing-page navbar: logo, section anchors, and session actions
 * (avatar + Open app when signed in, Log in / Get Started otherwise).
 * Collapses into an animated dropdown menu on phones.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Logo from "@/components/ui/Logo";
import NavbarSessionActions from "@/components/features/auth/NavbarSessionActions";
import { LANDING_NAV_ITEMS } from "@/utils/constants";
import { slideDown } from "@/utils/animations";
import { cn } from "@/utils/genericFunctions";

export default function SiteNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Solidify the bar once the page scrolls past the top
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setIsOpen(false);

  return (
    <header
      className={cn(
        "pt-safe sticky top-0 z-50 border-b transition-colors duration-300",
        isScrolled || isOpen
          ? "border-line bg-black/80 backdrop-blur-xl"
          : "border-transparent bg-transparent"
      )}
    >
      <nav
        aria-label="Main"
        className="px-safe mx-auto flex h-(--top-nav-height) max-w-7xl items-center justify-between md:px-6"
      >
        <Logo />

        <ul className="hidden items-center gap-8 text-sm text-fg-muted md:flex lg:gap-10">
          {LANDING_NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="transition-colors hover:text-neon">
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <NavbarSessionActions />
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          className="flex size-11 items-center justify-center rounded-xl text-neon hover:bg-neon-dim md:hidden"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-menu"
            variants={slideDown}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="px-safe border-t border-line pb-6 md:hidden"
          >
            <ul className="flex flex-col py-2">
              {LANDING_NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={closeMenu}
                    className="flex min-h-12 items-center text-base text-fg-muted hover:text-neon"
                  >
                    <span className="mr-3 text-neon">{">"}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <NavbarSessionActions variant="mobile" onNavigate={closeMenu} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
