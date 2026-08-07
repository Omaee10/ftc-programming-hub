import type { NextConfig } from "next";

/**
 * Production builds content-hash every file under /_next/static, so pinning
 * them forever is safe and saves revalidation round trips.
 *
 * `next dev` is the opposite: Turbopack reuses chunk names across recompiles,
 * so an immutable year-long max-age makes the browser serve the first copy it
 * ever saw and silently ignore every later edit. Next.js warns about this on
 * every dev boot ("Setting a custom Cache-Control header can break Next.js
 * development behavior"). Falling through to no custom header lets Next apply
 * its own dev-appropriate no-store defaults.
 */
const staticAssetHeaders: NonNullable<NextConfig["headers"]> = async () =>
  process.env.NODE_ENV === "production"
    ? [
        {
          source: "/_next/static/:path*",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
      ]
    : [];

const nextConfig: NextConfig = {
  compress: true,
  headers: staticAssetHeaders,
};

export default nextConfig;
