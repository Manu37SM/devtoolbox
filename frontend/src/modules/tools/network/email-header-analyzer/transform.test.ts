import { describe, expect, it } from "vitest";
import { orgDomain, parseHeaders, parseReceived, runEmailHeaderAnalyzer } from "./transform";

const RAW = `Delivered-To: ann@example.org
Received: by 2002:a05:6a10:1234 with SMTP id abc;
        Wed, 31 Jan 2024 02:10:05 -0800 (PST)
Received: from mail-out.acme-bank.com (mail-out.acme-bank.com. [203.0.113.10])
        by mx.google.com with ESMTPS id x1si;
        Wed, 31 Jan 2024 02:02:01 -0800 (PST)
Received: from app01.internal ([10.0.0.5]) by mail-out.acme-bank.com with ESMTP; Wed, 31 Jan 2024 15:31:55 +0530
Authentication-Results: mx.google.com;
       dkim=pass header.i=@acme-bank.com header.s=s1 header.b=abc;
       spf=pass (google.com: domain of bounce@mail.acme-bank.com designates 203.0.113.10 as permitted sender) smtp.mailfrom=bounce@mail.acme-bank.com;
       dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=acme-bank.com
Return-Path: <bounce@mail.acme-bank.com>
DKIM-Signature: v=1; a=rsa-sha256; d=acme-bank.com; s=s1; h=from:to:subject;
 bh=abc=; b=def=
From: Acme Bank <alerts@acme-bank.com>
Reply-To: support@acme-help.net
To: ann@example.org
Subject: Your statement
Date: Wed, 31 Jan 2024 15:31:50 +0530
Message-ID: <123@acme-bank.com>
List-Unsubscribe: <https://acme-bank.com/u/1>

Body text here: Received: not a header`;

describe("parsing", () => {
  it("unfolds headers and stops at the body", () => {
    const h = parseHeaders(RAW);
    expect(h.filter(([k]) => k === "Received")).toHaveLength(3);
    expect(h.find(([k]) => k === "DKIM-Signature")![1]).toBe("v=1; a=rsa-sha256; d=acme-bank.com; s=s1; h=from:to:subject; bh=abc=; b=def=");
    expect(h.some(([, v]) => v.includes("not a header"))).toBe(false);
  });
  it("parses Received lines", () => {
    const r = parseReceived("from mail-out.acme-bank.com (mail-out.acme-bank.com. [203.0.113.10]) by mx.google.com with ESMTPS id x1si; Wed, 31 Jan 2024 02:02:01 -0800 (PST)");
    expect(r).toMatchObject({ from: "mail-out.acme-bank.com", by: "mx.google.com", with: "ESMTPS", ip: "203.0.113.10" });
    expect(r.date!.toISOString()).toBe("2024-01-31T10:02:01.000Z");
  });
  it("computes organisational domains", () => {
    expect(orgDomain("mail.acme-bank.com")).toBe("acme-bank.com");
    expect(orgDomain("mx.shop.co.uk")).toBe("shop.co.uk");
  });
});

describe("runEmailHeaderAnalyzer", () => {
  it("reports the path, delays, authentication and alignment", () => {
    const out = runEmailHeaderAnalyzer(RAW, { showAllHeaders: false }).output;
    expect(out).toContain("Delivery path (3 hops, oldest first)");
    expect(out).toContain("1. app01.internal [10.0.0.5] -> mail-out.acme-bank.com (ESMTP)  2024-01-31T10:01:55Z");
    expect(out).toContain("2. mail-out.acme-bank.com [203.0.113.10] -> mx.google.com (ESMTPS)  2024-01-31T10:02:01Z  +6s");
    expect(out).toContain("+8 min");
    expect(out).toContain("SPF:   pass  (envelope from mail.acme-bank.com, aligned with From)");
    expect(out).toContain("DKIM:  pass  (d=acme-bank.com, selector s1, aligned with From)");
    expect(out).toContain("DMARC: pass  (policy REJECT)");
    expect(out).toContain("Reply-To (acme-help.net) differs from From (acme-bank.com)");
    expect(out).toContain("Hop 3 took 8 min");
    expect(out).toContain("No List-Unsubscribe-Post header");
  });
  it("flags failing authentication", () => {
    const out = runEmailHeaderAnalyzer("From: a@paypal.com\nAuthentication-Results: mx; spf=softfail smtp.mailfrom=x@evil.test; dmarc=fail header.from=paypal.com\n", { showAllHeaders: true }).output;
    expect(out).toContain("! DMARC failed");
    expect(out).toContain("! SPF softfail");
    expect(out).toContain("! No DKIM signature");
    expect(out).toContain("All headers (2)");
  });
  it("explains empty input", () => {
    expect(runEmailHeaderAnalyzer("hello world", { showAllHeaders: false }).error?.message).toContain("Show original");
  });
});
