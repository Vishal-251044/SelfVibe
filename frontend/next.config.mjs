/**
 * Next.js configuration.
 * Note: static export (`output: "export"`) was removed on Day 1 — dynamic routes
 * (/playlist/[id], /artist/[id]), the admin console and Vercel deployment need a
 * server build.
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
};

export default nextConfig;
