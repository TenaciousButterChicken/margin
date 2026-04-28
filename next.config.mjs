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

  webpack: (config) => {
    // `@huggingface/transformers` is loaded at runtime via a CDN ESM URL
    // import (see lib/simulations/transformer-core.ts) and is NOT
    // bundled. Just make sure stray references to onnxruntime-node (the
    // package's Node-only optional dep) don't break the server build.
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      "onnxruntime-node": false,
    };
    return config;
  },
};

export default nextConfig;
