import type { MetadataRoute } from "next";
import { toolRegistry } from "@/lib/registry";

// Static sitemap generation (Next 15 App Router convention — served at
// /sitemap.xml automatically). Added as part of the prod-readiness sweep in
// AUDIT_REPORT.md §25. Only lists content actually meant to be indexed: the
// homepage, the public plugin marketplace, and every tool page — mirrors
// robots.ts's allow/disallow split, so nothing listed here is also
// disallowed there.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://devtoolbox.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const toolPages: MetadataRoute.Sitemap = toolRegistry.map((tool) => ({
    url: `${siteUrl}/tools/${tool.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/plugins`,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    ...toolPages,
  ];
}
