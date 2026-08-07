import type { NextConfig } from "next";

// Human-readable build stamp (YYYYMMDD-HHmmss, local build machine time),
// baked into the client bundle every time `next build` runs — used by
// UpdateChecker to detect a new deployment without needing a service
// worker, and shown in the UI so a deploy can be visually confirmed.
function buildStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: buildStamp(),
  },
  experimental: {
    // Client-cache TTLs for already-visited routes. `dynamic` defaults to 0
    // (no caching at all), which meant switching back to a tab you were just
    // on refetched the whole page from the server — the main remaining
    // source of lag when moving between the bottom-nav tabs.
    //
    // Safe here because every mutation path already calls `router.refresh()`,
    // which busts this cache — so newly added/edited/deleted transactions
    // still show up immediately rather than waiting out the TTL.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
