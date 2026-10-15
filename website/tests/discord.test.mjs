import assert from "node:assert/strict";
import { test } from "node:test";
import { getDiscordInvite, validateDiscordInvite } from "../app/config/discord.server.ts";

test("the configured invitation is a validated Discord destination", async () => {
  const invite = await getDiscordInvite();
  assert.ok(invite);
  assert.equal(validateDiscordInvite(invite), invite);
});

test("accepts official Discord invitation formats", () => {
  for (const value of ["https://discord.gg/example-code", "https://discord.com/invite/exampleCode"]) {
    assert.equal(validateDiscordInvite(value), value);
  }
});

test("rejects arbitrary destinations and malformed invitations", () => {
  for (const value of [
    null, undefined, 42, "", "/join", "javascript:alert(1)",
    "http://discord.gg/example", "https://example.com/invite/example",
    "https://discord.gg.evil.example/example", "https://discord.com@evil.example/example",
    "https://user:password@discord.gg/example", "https://discord.gg:8443/example",
    "https://discord.gg/", "https://discord.com/channels/example",
    "https://discord.gg/example/extra", "https://discord.gg/%2fexample",
    "https://discord.gg/example?redirect=https://example.com", "https://discord.gg/example#other",
  ]) assert.equal(validateDiscordInvite(value), null, String(value));
});
