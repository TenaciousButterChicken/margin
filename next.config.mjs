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
    // browser variant that uses `import.meta` and loads WASM via fetch.
    // The component that imports it is `ssr: false`, so the server bundle
    // never actually runs this code — we just need webpack to stop trying
    // to parse it. Externalize on the server, alias to the web build on
    // the client.
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        "@huggingface/transformers",
        "onnxruntime-node",
      ];
    } else {
      const webBundle = path.resolve(
        __dirname,
        "node_modules/@huggingface/transformers/dist/transformers.web.js"
      );
      config.resolve.alias = {
        ...config.resolve.alias,
        "@huggingface/transformers$": webBundle,
      };
      // The web bundle dynamic-imports its WASM files; let them be
      // fetched at runtime instead of bundled.
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
