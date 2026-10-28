import type { MetadataRoute } from "next";
import { toolRegistry, getToolsByModule } from "@/lib/registry";
import { MODULE_ORDER } from "@/lib/module-meta";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://devtoolbox.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const toolPages: MetadataRoute.Sitemap = toolRegistry.map((tool) => ({
    url: `${siteUrl}/tools/${tool.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const categoryPages: MetadataRoute.Sitemap = MODULE_ORDER.filter((m) => getToolsByModule(m).length > 0).map((m) => ({
    url: `${siteUrl}/category/${m}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/pricing`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/plugins`,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    ...categoryPages,
    ...toolPages,
  ];
}
