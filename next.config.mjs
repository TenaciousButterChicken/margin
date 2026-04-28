/** @type {import('next').NextConfig} */
const nextConfig = {
  // Canonicalise www.margin.school → margin.school. The www DNS still
  // points at the tunnel (so links don't dead-end), but anyone who lands
  // on www gets a permanent redirect to the apex so the address bar
  // always says margin.school.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.margin.school" }],
        destination: "https://margin.school/:path*",
        permanent: true,
      },
    ];
  },

  // Self-hosted on a Pi, no CDN in front. The default 1-year SSG cache
  // header for HTML means browsers cling to stale pages even after we
  // ship a new build. Override Cache-Control for HTML routes so updates
  // land on the next page load. Hashed JS/CSS under /_next/static/**
  // and image assets are excluded — they stay immutable as designed.
  async headers() {
    return [
      {
        // Pre-extracted GPT-2 embedding binaries: ~77 MB, deterministic by
        // filename. Let browsers cache them indefinitely so the embedding
        // visualizer is instant on repeat visits.
        source: "/embeddings/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/((?!_next/static|_next/image|favicon.ico|embeddings).*)",
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
