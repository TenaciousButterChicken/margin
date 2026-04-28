/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-hosted on a Pi, no CDN in front. The default 1-year SSG cache
  // header for HTML means browsers cling to stale pages even after we
  // ship a new build. Override Cache-Control for HTML routes so updates
  // land on the next page load. Hashed JS/CSS under /_next/static/**
  // and image assets are excluded — they stay immutable as designed.
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
