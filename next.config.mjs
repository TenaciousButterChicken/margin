import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  webpack: (config, { isServer }) => {
    // @huggingface/transformers ships two builds: a Node variant that
    // pulls in the native onnxruntime-node binaries (.node files) and a
    // browser variant that loads WASM via fetch. The package's exports
    // field selects "node" by default, which webpack respects on both
    // client AND server, and chokes on the .node binary imports. Alias
    // the bare module name to the absolute path of the web bundle to
    // bypass exports resolution entirely.
    const webBundle = path.resolve(
      __dirname,
      "node_modules/@huggingface/transformers/dist/transformers.web.js"
    );
    config.resolve.alias = {
      ...config.resolve.alias,
      "@huggingface/transformers$": webBundle,
    };
    // The web bundle references onnxruntime-node only as a fallback; tell
    // webpack to treat it as empty so the server bundle stops bundling
    // the native binaries.
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      "onnxruntime-node": false,
    };
    if (!isServer) {
      // The web bundle dynamic-imports its WASM files relative to itself.
      // Tell webpack not to try to bundle them; they're fetched at runtime.
      config.module = {
        ...config.module,
        rules: [
          ...(config.module?.rules ?? []),
          {
            test: /\.wasm$/,
            type: "asset/resource",
          },
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
