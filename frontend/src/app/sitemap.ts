import type { MetadataRoute } from "next";
import { toolRegistry } from "@/lib/registry";

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
