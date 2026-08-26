
export function AiDisclosureBanner({ detail }: { detail: string }) {
  return (
    <div className="rounded-md border border-border-default bg-bg-raised px-3 py-2 text-xs text-text-muted">
      This tool sends {detail} to Claude (Anthropic&apos;s AI model) to generate a result. Nothing you enter here is
      stored beyond an anonymized token-count record — see &ldquo;How it works&rdquo; below.
    </div>
  );
}
