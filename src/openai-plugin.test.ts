import { describe, it, expect } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { chirpieToolNames, KEY_MANAGEMENT_TOOLS } from "@chirpie/mcp-core";

/**
 * The OpenAI plugin package (packages/mcp/openai-plugin) uploaded to
 * platform.openai.com/plugins. Limits are OpenAI's public-submission limits from
 * https://developers.openai.com/plugins/deploy/submission (read 2026-10-04).
 * A package that breaks one of them uploads fine and then fails review, so
 * check them here instead.
 */

const ROOT = join(process.cwd(), "packages/mcp/openai-plugin");
const plugin = JSON.parse(readFileSync(join(ROOT, "plugin.json"), "utf8"));
const mcp = JSON.parse(readFileSync(join(ROOT, "mcp.json"), "utf8"));
const openai = plugin.extensions["com.openai"];
const ui = openai.interface;

/** Width and height from a PNG's IHDR chunk. */
function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("OpenAI plugin package", () => {
  it("is a portable Agent Plugins manifest with a stable identity", () => {
    expect(plugin.$schema).toBe("https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
    expect(plugin.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(plugin.name.length).toBeLessThanOrEqual(64);
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(plugin.description.length).toBeLessThanOrEqual(4000);
    expect(plugin.author.name.length).toBeLessThanOrEqual(120);
  });

  it("keeps the listing text within OpenAI's limits", () => {
    expect(ui.displayName.length).toBeLessThanOrEqual(30);
    expect(ui.shortDescription.length).toBeLessThanOrEqual(30);
    expect(ui.longDescription.length).toBeLessThanOrEqual(4000);
    expect(ui.developerName.length).toBeLessThanOrEqual(80);
    expect(ui.category).toBeTruthy();
    expect(ui.capabilities.length).toBeLessThanOrEqual(20);
    for (const c of ui.capabilities) expect(c.length).toBeLessThanOrEqual(120);
    expect(ui.defaultPrompt.length).toBeLessThanOrEqual(3);
    expect(new Set(ui.defaultPrompt).size).toBe(ui.defaultPrompt.length);
    for (const p of ui.defaultPrompt) {
      expect(p.length).toBeLessThanOrEqual(128);
      expect(p).not.toContain("@");
    }
  });

  it("does not advertise pricing in the listing text", () => {
    // Plugin guidelines: "Do not advertise pricing, subscriptions, free trials, discounts, or promotions."
    for (const text of [ui.shortDescription, ui.longDescription]) {
      expect(text).not.toMatch(/\$|\bfree\b|\btrial\b|\bdiscount/i);
    }
  });

  it("names only live networks, with the Meta ones as coming soon", () => {
    expect(ui.longDescription).toContain("Threads, Instagram and Facebook are coming soon");
    for (const text of [plugin.description, ui.shortDescription, ...ui.capabilities, ...ui.defaultPrompt]) {
      expect(text).not.toMatch(/Instagram|Facebook|Threads|TikTok|Pinterest|YouTube|Reddit|Snapchat/);
    }
  });

  it("gives all four HTTPS listing URLs an MCP review needs", () => {
    for (const key of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
      expect(ui[key]).toMatch(/^https:\/\/chirpie\.ai(\/|$)/);
      expect(ui[key].length).toBeLessThanOrEqual(1024);
    }
  });

  it("ships a square logo of at least 48px and at most 5 MiB", () => {
    for (const key of ["logo", "composerIcon"]) {
      expect(ui[key]).toMatch(/^\.\//);
      const path = join(ROOT, ui[key]);
      expect(statSync(path).size).toBeLessThanOrEqual(5 * 1024 * 1024);
      const { width, height } = pngSize(path);
      expect(width).toBe(height);
      expect(width).toBeGreaterThanOrEqual(48);
      expect(width).toBeLessThanOrEqual(4096);
    }
  });

  it("declares exactly one remote MCP server, the hosted endpoint", () => {
    expect(mcp.$schema).toBe("https://agent-plugins.org/schemas/1.0.0/mcp.schema.json");
    const servers = Object.values(mcp.mcpServers) as { type: string; url: string }[];
    expect(servers).toEqual([{ type: "streamable-http", url: "https://chirpie.ai/mcp" }]);
  });

  it("carries exactly five positive and three negative review cases", () => {
    const { positive, negative } = openai.review.test_cases;
    expect(positive).toHaveLength(5);
    expect(negative).toHaveLength(3);
    for (const c of positive) {
      expect(c.description && c.prompt && c.tools_triggered && c.expected_behavior).toBeTruthy();
      expect(c.description.length).toBeLessThanOrEqual(4000);
    }
    for (const c of negative) expect(c.description && c.prompt).toBeTruthy();
  });

  it("names only tools a ChatGPT sign-in connection is offered", () => {
    const offered = new Set(chirpieToolNames({ exclude: KEY_MANAGEMENT_TOOLS }));
    for (const c of openai.review.test_cases.positive) {
      for (const tool of c.tools_triggered.split(",").map((t: string) => t.trim())) {
        expect(offered.has(tool), tool).toBe(true);
      }
    }
  });

  it("keeps credentials out of the package", () => {
    const raw = JSON.stringify(plugin);
    expect(raw).not.toMatch(/test_credentials|reviewer_instructions|chirpie_sk_/);
  });

  it("matches the long description recorded in the listings doc", () => {
    const doc = readFileSync(join(process.cwd(), "agents_context/gtm/mcp-directory-listings.md"), "utf8");
    expect(doc).toContain(ui.longDescription);
  });
});
