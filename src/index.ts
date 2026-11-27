import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ChirpieClient, getConfig } from "@chirpie/sdk";
import type { ChirpieApi } from "@chirpie/mcp-core";
import { createStdioServer } from "./server";
import { createDeviceLoginResolver } from "./device-login";

// Resolve API key: env var → ~/.chirpie/config.json → device authorization.
const config = getConfig();
const configured: ChirpieApi | null = config
  ? new ChirpieClient({ apiKey: config.api_key, baseUrl: config.base_url })
  : null;

// With no key anywhere, the first tool call starts a device authorization and
// answers with the sentence for the agent to relay; once the person approves,
// the key is saved where `chirpie login` saves it and every later call works.
// See device-login.ts.
const deviceLogin = createDeviceLoginResolver({
  baseUrl: (process.env.CHIRPIE_BASE_URL ?? "https://chirpie.ai").trim(),
  clientName: () => server.server.getClientVersion()?.name,
  background: true,
});

function resolveClient(): ChirpieApi | Promise<ChirpieApi> {
  return configured ?? deviceLogin();
}

// Tool definitions, server info and tool annotations are shared with the
// hosted server at https://chirpie.ai/mcp (see packages/mcp-core) so both
// surfaces stay in lockstep.
const server = createStdioServer(resolveClient);

// Start
const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  console.error("Failed to start Chirpie MCP server:", err);
  process.exit(1);
});
