import { describe, expect, it } from "vitest";
import { runWebhookSignatureVerifier } from "./transform";
import type { WebhookSignatureVerifierOptions } from "./schema";

const BODY = '{"id":"evt_1","amount":12550}';
const NOW = new Date(1706695200 * 1000 + 30_000);
const run = async (head: string, o: Partial<WebhookSignatureVerifierOptions>, body = BODY) =>
  (await runWebhookSignatureVerifier(`${head}\n\n${body}`, { provider: "github", algorithm: "sha256", encoding: "hex", ...o }, NOW));

// expected values from Python's hmac module
describe("providers (match Python hmac)", () => {
  it("GitHub", async () => {
    const r = await run("secret: s3cr3t\nsignature: sha256=30a0e9eb0494322da64dc32c39c63a3bb2ad4759995e892442cf6aa5a9d3c26e", { provider: "github" });
    expect(r.output).toContain("X-Hub-Signature-256: sha256=30a0e9eb0494322da64dc32c39c63a3bb2ad4759995e892442cf6aa5a9d3c26e");
    expect(r.output).toContain("MATCH");
  });
  it("Stripe with the full header and a timestamp check", async () => {
    const r = await run("secret: s3cr3t\nsignature: t=1706695200,v1=a8d96c5ea783e36f0ae2659d31eeb566550cfaf432ca8ac927b719ca58897160,v0=old", { provider: "stripe" });
    expect(r.output).toContain("MATCH");
    expect(r.output).toContain("Timestamp age 30s is within the 300s tolerance.");
  });
  it("Slack", async () => {
    const r = await run("secret: s3cr3t\ntimestamp: 1706695200\nsignature: v0=cf1d8a0332c6ae101dea9d33e0369f0b6428ba774c3b9ddf238c84f202c2ea2c", { provider: "slack" });
    expect(r.output).toContain("MATCH");
  });
  it("Razorpay and Shopify", async () => {
    expect((await run("secret: s3cr3t\nsignature: 30a0e9eb0494322da64dc32c39c63a3bb2ad4759995e892442cf6aa5a9d3c26e", { provider: "razorpay" })).output).toContain("MATCH");
    expect((await run("secret: s3cr3t\nsignature: MKDp6wSUMi2mTcMsOcY6O7KtR1mZXokkQs9qpanTwm4=", { provider: "shopify" })).output).toContain("MATCH");
  });
  it("Standard Webhooks spec example", async () => {
    const r = await runWebhookSignatureVerifier('secret: whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw\nid: msg_p5jXN8AQM9LWM0D4loKWxJek\ntimestamp: 1614265330\nsignature: v1,bogus v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=\n\n{"test": 2432232314}', { provider: "standard", algorithm: "sha256", encoding: "hex" }, new Date(1614265330 * 1000));
    expect(r.output).toContain("MATCH");
  });
  it("generic SHA-1 base64 and SHA-512 hex", async () => {
    expect((await run("secret: s3cr3t", { provider: "generic", algorithm: "sha1", encoding: "base64" })).output).toContain("bY52lcrgdCpNUZs4OJZEiRbbdbw=");
    expect((await run("secret: s3cr3t", { provider: "generic", algorithm: "sha512", encoding: "hex" })).output).toContain("1e2643ca6a466832d44b5d8fa29bef00207ba42c468c4c23cc0919286bff9664");
  });
});

describe("failures", () => {
  it("explains mismatches and replay windows", async () => {
    const r = await runWebhookSignatureVerifier(`secret: s3cr3t\nsignature: t=1706690000,v1=deadbeef\n\n${BODY}\n`, { provider: "stripe", algorithm: "sha256", encoding: "hex" }, NOW);
    expect(r.output).toContain("MISMATCH");
    expect(r.output).toContain("your body ends with a newline");
    expect(r.output).toContain("outside the 300s tolerance");
  });
  it("requires the provider's fields", async () => {
    expect((await run("signature: x", {})).error?.message).toContain("secret");
    expect((await run("secret: x", { provider: "slack" })).error?.message).toContain("timestamp");
    expect((await run("secret: whsec_AA==\ntimestamp: 1", { provider: "standard" })).error?.message).toContain("webhook-id");
  });
});
