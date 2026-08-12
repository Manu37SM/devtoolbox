import type { MetadataRoute } from "next";

// Static robots.txt generation (Next 15 App Router convention — this file
// replaces a hand-written public/robots.txt and is served at /robots.txt
// automatically). Added as part of the prod-readiness sweep in
// AUDIT_REPORT.md §25 — this was previously missing entirely, which meant
// crawlers had no guidance and no sitemap pointer.
//
// Tool pages and marketing/root content are crawlable (that's the whole
// point of a free-tools SEO play); anything behind auth, or that's a
// functional-not-content route (auth flows, account settings, SSO/OAuth
// callbacks, invite-accept links, password reset), is disallowed since
// there's nothing there worth indexing and some of those URLs carry
// single-use tokens that shouldn't end up in a search index or crawler
// cache.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://devtoolbox.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account",
        "/auth/",
        "/login",
        "/register",
        "/reset-password",
        "/verify-email",
        "/sso/",
        "/invites/",
        // Owner-only content, requires auth to view/manage.
        "/snippets/",
        "/pipelines/",
        // Share links use an unguessable slug as their access control
        // (ARCHITECTURE.md §8.4) — indexing them would defeat that, so
        // they're excluded even though they're technically public URLs.
        "/s/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
