/**
 * Next.js configuration.
 * - Static export (`output: "export"`) was removed on Day 1 — dynamic routes,
 *   the admin console and Vercel deployment need a server build.
 * - /api/* is proxied to the Express API (Day 2). The browser only ever talks to
 *   its own origin, so the httpOnly refresh cookie is first-party everywhere
 *   (Safari / iOS block third-party cookies, which would break login on iPhone).
 * - Security headers on every page (Day 10 security review): no framing
 *   (clickjacking), no MIME sniffing, microphone only for this site (voice
 *   control), strict referrer, HSTS in production.
 */
import packageJson from "./package.json" with { type: "json" };

const API_PROXY_TARGET = process.env.API_PROXY_TARGET;

if (!API_PROXY_TARGET) {
  throw new Error(
    "[next.config] API_PROXY_TARGET is not set. Add it to frontend/.env.local (e.g. http://localhost:5000)."
  );
}

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  },
  // allow-popups: Razorpay Checkout opens bank / 3-D Secure windows that report back
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Permissions-Policy",
    value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  // Shown in error reports and the console (release v1.0.0)
  env: { NEXT_PUBLIC_APP_VERSION: packageJson.version },

  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // The service worker must always be re-checked so updates reach installed apps
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },

  // Avatars: Cloudinary uploads, Google profile photos, Wikimedia Commons artist photos
  images: {
    // AVIF first (about 20% smaller than WebP), WebP for older browsers
    formats: ["image/avif", "image/webp"],
    // Covers and avatars get a new URL when they change, so resized copies can be kept a month
    minimumCacheTTL: 30 * 24 * 60 * 60,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "thumb.wikimedia.org" },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
