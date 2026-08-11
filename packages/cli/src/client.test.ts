import { test } from "node:test";
import assert from "node:assert/strict";
import { CliError, DevToolboxClient } from "./client";

test("throws CliError when DEVTOOLBOX_API_KEY is missing", () => {
  assert.throws(() => new DevToolboxClient({}), CliError);
});

test("hash() posts to /public/hash with the Authorization header and returns the digest", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const originalFetch = global.fetch;
  global.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ digest: "abc123" }), { status: 200 });
  }) as typeof fetch;

  try {
    const client = new DevToolboxClient({ DEVTOOLBOX_API_KEY: "dtb_live_test" });
    const result = await client.hash("hello", "sha256");

    assert.equal(result.digest, "abc123");
    assert.equal(calls.length, 1);
    const call = calls[0]!;
    assert.equal(call.url, "https://api.devtoolbox.dev/v1/public/hash");
    const headers = call.init.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer dtb_live_test");
    assert.deepEqual(JSON.parse(call.init.body as string), { input: "hello", algorithm: "sha256" });
  } finally {
    global.fetch = originalFetch;
  }
});

test("respects DEVTOOLBOX_API_URL for a custom base URL", async () => {
  const originalFetch = global.fetch;
  let requestedUrl = "";
  global.fetch = (async (url: string) => {
    requestedUrl = String(url);
    return new Response(JSON.stringify({ valid: true }), { status: 200 });
  }) as typeof fetch;

  try {
    const client = new DevToolboxClient({
      DEVTOOLBOX_API_KEY: "dtb_live_test",
      DEVTOOLBOX_API_URL: "http://localhost:3001/v1/",
    });
    await client.jsonValidate("{}");
    assert.equal(requestedUrl, "http://localhost:3001/v1/public/json-validate");
  } finally {
    global.fetch = originalFetch;
  }
});

test("throws CliError with the server's error message on a non-2xx response", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    new Response(JSON.stringify({ error: { message: "Invalid or revoked API key." } }), { status: 401 })) as typeof fetch;

  try {
    const client = new DevToolboxClient({ DEVTOOLBOX_API_KEY: "dtb_live_bad" });
    await assert.rejects(() => client.hash("hello", "sha256"), (err: unknown) => {
      assert.ok(err instanceof CliError);
      assert.equal((err as Error).message, "Invalid or revoked API key.");
      return true;
    });
  } finally {
    global.fetch = originalFetch;
  }
});
