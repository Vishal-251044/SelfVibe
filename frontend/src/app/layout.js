/**
 * Root layout: fonts, global styles, SEO / PWA metadata and client providers.
 */
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Providers from "@/lib/Providers";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/utils/constants";
import "@/styles/globals.css";

// Inter for body text (compact, easy to read on phones), Space Grotesk for
// headings, JetBrains Mono only for the terminal-style accents ($ selfvibe …)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

// Absolute base for link previews (Open Graph images must be full URLs)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${APP_NAME} · ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} · ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the app draw under the notch; safe-area padding handles the rest
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}
    >
      <body>
        {/* Keyboard users jump straight past the navigation (Day 10 accessibility pass) */}
        <a
          href="#main"
          className="sr-only rounded-full bg-neon px-5 py-3 font-semibold text-black focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
