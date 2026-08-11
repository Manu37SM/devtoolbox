import { test } from "node:test";
import assert from "node:assert/strict";
import { main } from "./index";

// Only the argument-validation paths that return before ever constructing a
// DevToolboxClient (and therefore never touch the network or require
// DEVTOOLBOX_API_KEY) are covered here — the network paths are exercised by
// client.test.ts instead.

test("no command prints help and exits 1", async () => {
  assert.equal(await main([]), 1);
});

test("--help prints help and exits 0", async () => {
  assert.equal(await main(["--help"]), 0);
});

test("unknown command exits 1", async () => {
  assert.equal(await main(["bogus"]), 1);
});

test("hash with missing arguments exits 1", async () => {
  assert.equal(await main(["hash"]), 1);
  assert.equal(await main(["hash", "sha256"]), 1);
});

test("hash with an unsupported algorithm exits 1", async () => {
  assert.equal(await main(["hash", "sha3", "hello"]), 1);
});

test("json-validate with no file argument exits 1", async () => {
  assert.equal(await main(["json-validate"]), 1);
});
