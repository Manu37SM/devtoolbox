"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

export interface TurnstileHandle {
  /** Call after a failed submit — a Turnstile token is single-use, so the
   * widget needs a fresh one before the next attempt can succeed. */
  reset: () => void;
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

/**
 * Cloudflare Turnstile widget — frontend half of checklist item #12 (bot
 * protection). Backend verification already shipped in
 * backend/src/common/captcha/captcha.service.ts; this is what actually
 * renders the checkbox for a user to interact with, previously missing
 * (see AUDIT_REPORT.md §26.4's disclosed follow-up).
 *
 * Renders nothing when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` isn't set — mirrors
 * CaptchaService's "skip verification if TURNSTILE_SECRET_KEY isn't
 * configured" default, so this component is safe to drop into a form
 * unconditionally without breaking local dev (which has no Turnstile key).
 */
export const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(function TurnstileWidget(
  { onVerify, onExpire },
  ref,
) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    },
  }));

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || !window.turnstile) return;

    const id = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      "expired-callback": () => onExpire?.(),
      "error-callback": () => onExpire?.(),
    });
    widgetIdRef.current = id;

    return () => {
      if (window.turnstile) window.turnstile.remove(id);
      widgetIdRef.current = null;
    };
    // Deliberately excludes onVerify/onExpire — re-running this effect would
    // tear down and re-render the widget (a visible flicker + a wasted
    // challenge) every time the parent re-renders with a new inline
    // callback. Both callers pass a stable setState function (or a thin
    // wrapper around one), so the closures captured here don't go stale in
    // a way that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, scriptReady]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
    </>
  );
});
