/**
 * Public site footer: brand blurb, product links, contact and social links.
 */
import Link from "next/link";
import { Github, Instagram, Linkedin, Mail, MapPin, Twitter } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { APP_TAGLINE } from "@/utils/constants";

const PRODUCT_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Vibes", href: "/#vibes" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Get Started", href: "/signup" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

// TODO: add the real social profile URLs; links without one are hidden (no dead links)
const SOCIAL_LINKS = [
  { label: "Instagram", href: "#", icon: Instagram },
  { label: "LinkedIn", href: "#", icon: Linkedin },
  { label: "GitHub", href: "#", icon: Github },
  { label: "X (Twitter)", href: "#", icon: Twitter },
].filter((link) => link.href !== "#");

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-black">
      <div className="px-safe mx-auto max-w-7xl py-14 md:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <Logo />
            <p className="mt-5 text-sm font-semibold text-neon-bright">{APP_TAGLINE}</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">
              Personalised streaming, a taste engine that learns you, and an AI studio to make your
              own tracks. Built for listeners and creators.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-neon-soft">Product</h3>
            <ul className="space-y-1 text-sm text-fg-muted">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-9 items-center hover:text-neon"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-neon-soft">Contact</h3>
            <ul className="space-y-3 text-sm text-fg-muted">
              <li className="flex items-center gap-2">
                <Mail size={16} className="shrink-0 text-neon" aria-hidden />
                <a href="mailto:support@selfvibe.ai" className="break-all hover:text-neon">
                  support@selfvibe.ai
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={16} className="shrink-0 text-neon" aria-hidden />
                India
              </li>
            </ul>
            {SOCIAL_LINKS.length > 0 && (
              <div className="mt-5 flex gap-2">
                {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="flex size-11 items-center justify-center rounded-xl border border-line text-neon transition hover:border-neon hover:shadow-glow-sm"
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-line pt-6 text-xs text-fg-subtle sm:flex-row">
          <p>© {new Date().getFullYear()} SelfVibe. All rights reserved.</p>
          <p>
            <span className="text-neon">$</span> made in India, tuned for every vibe
          </p>
        </div>
      </div>
    </footer>
  );
}
