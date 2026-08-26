import type { MetadataRoute } from "next";

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

        "/snippets/",
        "/pipelines/",

        "/s/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
