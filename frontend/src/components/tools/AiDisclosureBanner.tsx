/** Shared "this sends your input to an AI model" banner for every Module 10
 * tool — satisfies FEATURE.md's "clearly labeled, show data-sent preview
 * before first use" requirement for AI tools without needing a bespoke
 * consent modal per tool: the disclosure is always visible above the
 * input, not a one-time dismissible dialog, so it can't be missed on a
 * later visit either. Mirrors the plain-text disclosure style already used
 * by the Module 8 server-proxied tools (see http-request-tester/ToolView.tsx). */
export function AiDisclosureBanner({ detail }: { detail: string }) {
  return (
    <div className="rounded-md border border-border-default bg-bg-raised px-3 py-2 text-xs text-text-muted">
      This tool sends {detail} to Claude (Anthropic's AI model) to generate a result. Nothing you enter here is
      stored beyond an anonymized token-count record — see &ldquo;How it works&rdquo; below.
    </div>
  );
}
