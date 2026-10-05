import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The Kiro power: packages/mcp/plugin.json and mcp.json, which the sync
 * workflow mirrors to the root of Firefloco/chirpie-mcp. Kiro's submission form
 * wants a public repository with a root plugin.json in the Agent Plugins 1.0.0
 * format, carrying $schema, name, version, description, author.name and
 * keywords, and a README linking the privacy policy and support. Requirements
 * from https://kiro.dev/powers/submit and https://kiro.dev/docs/powers/create/
 * (read 2026-10-04); field rules from
 * https://agent-plugins.org/schemas/1.0.0/plugin.schema.json.
 */

const ROOT = join(process.cwd(), "packages/mcp");
const plugin = JSON.parse(readFileSync(join(ROOT, "plugin.json"), "utf8"));
const mcp = JSON.parse(readFileSync(join(ROOT, "mcp.json"), "utf8"));
const readme = readFileSync(join(ROOT, "README.md"), "utf8");

const ALLOWED_KEYS = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]);

describe("Kiro power manifest", () => {
  it("carries every field Kiro requires, in the Agent Plugins schema", () => {
    expect(plugin.$schema).toBe("https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
    expect(plugin.name).toMatch(/^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/);
    expect(plugin.name.length).toBeLessThanOrEqual(64);
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(plugin.description).toBeTruthy();
    expect(plugin.author.name).toBe("Fireflo LLC");
    expect(Array.isArray(plugin.keywords)).toBe(true);
    expect(plugin.keywords.length).toBeGreaterThan(0);
    for (const k of plugin.keywords) expect(typeof k).toBe("string");
    expect(new Set(plugin.keywords).size).toBe(plugin.keywords.length);
  });

  it("uses only fields the schema allows", () => {
    for (const key of Object.keys(plugin)) expect(ALLOWED_KEYS.has(key), key).toBe(true);
    for (const key of Object.keys(plugin.author)) {
      expect(["name", "email", "url"]).toContain(key);
    }
  });

  it("points at the public mirror, the docs and an SPDX license", () => {
    expect(plugin.repository).toBe("https://github.com/Firefloco/chirpie-mcp");
    expect(plugin.homepage).toMatch(/^https:\/\/chirpie\.ai\//);
    expect(plugin.license).toBe("MIT");
  });

  it("names only live networks", () => {
    for (const text of [plugin.description, ...plugin.keywords]) {
      expect(text).not.toMatch(/Instagram|Facebook|Threads|TikTok|Pinterest|YouTube|Reddit|Snapchat/i);
    }
    expect(plugin.description).toContain("X, Bluesky, LinkedIn, Mastodon and Telegram");
  });

  it("declares exactly one remote MCP server, the hosted endpoint", () => {
    expect(mcp.$schema).toBe("https://agent-plugins.org/schemas/1.0.0/mcp.schema.json");
    const servers = Object.values(mcp.mcpServers) as { type: string; url: string }[];
    expect(servers).toEqual([{ type: "streamable-http", url: "https://chirpie.ai/mcp" }]);
  });

  it("links the privacy policy and support from the README", () => {
    expect(readme).toContain("https://chirpie.ai/privacy");
    expect(readme).toContain("https://chirpie.ai/support");
    expect(readme).toContain("support@chirpie.ai");
  });

  it("keeps credentials out of the manifest", () => {
    expect(JSON.stringify({ plugin, mcp })).not.toMatch(/chirpie_sk_|clientSecret|Authorization/);
  });
});
