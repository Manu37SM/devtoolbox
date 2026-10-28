import type { ToolRegistryEntry } from "@devtoolbox/shared";

/**
 * Product tiers. Every non-AI tool is free forever and runs in the browser;
 * tiers only change AI usage limits and account features.
 *
 * The AI numbers mirror backend/src/modules/ai-gateway/ai-gateway.controller.ts
 * (AI_THROTTLE). Keep the two in sync. Prices are deliberately NOT here: they
 * come from the Razorpay checkout so there is a single source of truth.
 */
export const AI_HOURLY_LIMITS = { anonymous: 5, free: 60, pro: 1000 } as const;

export function isAiTool(tool: Pick<ToolRegistryEntry, "module">): boolean {
  return tool.module === "ai";
}

/** True while LAUNCH_PROMO_UNTIL (ISO instant) is in the future. Fails closed. */
export function isLaunchPromoActive(until: string | undefined, now: Date = new Date()): boolean {
  if (!until) return false;
  const end = Date.parse(until);
  return !Number.isNaN(end) && now.getTime() < end;
}

export interface TierSummary {
  id: "free" | "pro" | "team";
  name: string;
  tagline: string;
  features: string[];
}

export const TIERS: TierSummary[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Every tool, no account needed.",
    features: [
      "All non-AI tools, unlimited, free forever",
      "Nothing you paste leaves your browser unless a tool says otherwise",
      `AI tools: ${AI_HOURLY_LIMITS.anonymous} requests/hour without an account, ${AI_HOURLY_LIMITS.free}/hour signed in`,
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For heavy AI use and automation.",
    features: [
      `AI tools: ${AI_HOURLY_LIMITS.pro.toLocaleString("en-US")} requests/hour`,
      "Public API access for CI and scripts",
      "Everything in Free",
    ],
  },
  {
    id: "team",
    name: "Team",
    tagline: "Pro limits for everyone on your team.",
    features: [
      "Everything in Pro",
      "Members of your organization inherit Team limits",
    ],
  },
];
