import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { TIERS, isAiTool, isLaunchPromoActive } from "@/lib/tiers";
import { toolRegistry } from "@/lib/registry";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Every DevToolbox tool is free. Only AI-powered tools have usage limits, with higher limits on Pro and Team.",
};

// Re-evaluate the promo banner hourly so it disappears when the offer ends.
export const revalidate = 3600;

export default function PricingPage() {
  const total = toolRegistry.length;
  const aiCount = toolRegistry.filter(isAiTool).length;
  const promo = isLaunchPromoActive(process.env.NEXT_PUBLIC_LAUNCH_PROMO_UNTIL);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Free tools. Paid only for heavy AI use.</h1>
      <p className="mt-3 max-w-2xl text-text-secondary">
        {total - aiCount} of our {total} tools are free forever with no account, and nothing you paste leaves your browser unless a tool says otherwise. The {aiCount}{" "}
        AI-powered tools call a model on our servers, so they have hourly limits. Pro and Team raise those limits.
      </p>

      {promo && (
        <p className="mt-6 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-text-primary">
          <strong>Launch offer:</strong> for a limited time, every signed-in free account gets Pro-level AI limits.{" "}
          <Link href="/register" className="font-medium text-accent underline underline-offset-2">
            Create a free account
          </Link>
        </p>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => (
          <section key={tier.id} className="flex flex-col rounded-md border border-border-subtle bg-bg-raised p-5">
            <h2 className="text-lg font-semibold text-text-primary">{tier.name}</h2>
            <p className="mt-1 text-sm text-text-muted">{tier.tagline}</p>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-5">
              {tier.id === "free" ? (
                <Link href="/" className="text-sm font-medium text-accent hover:underline">
                  Start using tools
                </Link>
              ) : (
                <Link href="/account" className="text-sm font-medium text-accent hover:underline">
                  See price and upgrade in your account
                </Link>
              )}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-8 text-sm text-text-muted">
        Prices are shown at checkout in your account. Questions about limits? Every response from an AI tool tells you how many
        requests you have left this hour.
      </p>
    </div>
  );
}
