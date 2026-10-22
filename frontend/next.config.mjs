/**
 * Next.js configuration.
 * - Static export (`output: "export"`) was removed on Day 1 — dynamic routes,
 *   the admin console and Vercel deployment need a server build.
 * - /api/* is proxied to the Express API (Day 2). The browser only ever talks to
 *   its own origin, so the httpOnly refresh cookie is first-party everywhere
 *   (Safari / iOS block third-party cookies, which would break login on iPhone).
 * @type {import('next').NextConfig}
 */
const API_PROXY_TARGET = process.env.API_PROXY_TARGET;

if (!API_PROXY_TARGET) {
  throw new Error(
    "[next.config] API_PROXY_TARGET is not set. Add it to frontend/.env.local (e.g. http://localhost:5000)."
  );
}

const nextConfig = {
  reactCompiler: true,
  poweredByHeader: false,

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
