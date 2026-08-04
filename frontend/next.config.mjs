import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root explicitly (monorepo root, one level up from
  // frontend/) rather than letting Next auto-detect it by searching for
  // the nearest lockfile. Auto-detection can pick the wrong directory if
  // an unrelated package-lock.json exists elsewhere on the filesystem
  // (e.g. a stray one in the user's home directory) — see AUDIT_REPORT.md
  // §7.9 for the incident that surfaced this.
  outputFileTracingRoot: path.join(__dirname, ".."),
  // html-minifier-terser (used client-side by the HTML Beautifier tool's
  // Minify mode — see modules/tools/code/html-beautifier/transform.ts)
  // pulls in clean-css, which unconditionally `require`s Node core
  // modules (fs, path, os) in a source-map-reading code path we never
  // actually invoke (we only call html-minifier-terser's `minify()`
  // programmatically on an in-memory string, never its file-reading
  // APIs). Webpack still tries to resolve those modules for the browser
  // bundle and fails since they don't exist there. This is the standard
  // Next.js fix: mark them as unavailable in client bundles rather than
  // erroring — safe here because the code paths that would actually call
  // them are never reached in our usage.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
  // PWA/offline support (FEATURE.md's Cross-Cutting Platform Features, P1):
  // service workers are notorious for getting stuck on a stale cached
  // copy of themselves, since browsers historically applied their normal
  // HTTP caching heuristics to /sw.js just like any other static file —
  // delaying detection of a new worker version, sometimes indefinitely.
  // Force revalidation on every request for this one file specifically so
  // update checks (which the browser already runs periodically/on
  // navigation) actually see fresh bytes instead of a cached response.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
