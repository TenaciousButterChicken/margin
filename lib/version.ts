// Manual milestone version. Bump this when shipping a milestone:
//   1.0  Site skeleton
//   2.0  Simulations launch
//   3.0  Auth + teacher dashboard
//   3.1  Phase labs migration
export const VERSION = "3.1.0";

// Auto-injected at build time via next.config.mjs.
export const COMMIT_SHA = process.env.NEXT_PUBLIC_GIT_SHA ?? "unknown";
export const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE ?? "unknown";
