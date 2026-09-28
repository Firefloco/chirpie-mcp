import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ChirpieClient, getConfig } from "@chirpie/sdk";
import type { ChirpieApi } from "@chirpie/mcp-core";
import { createStdioServer } from "./server";

// Resolve API key: env var → ~/.chirpie/config.json
const config = getConfig();
const client = config
  ? new ChirpieClient({ apiKey: config.api_key, baseUrl: config.base_url })
  : null;

function requireClient(): ChirpieApi {
  if (!client) {
    throw new Error(
      "Not authenticated. Run `chirpie login` or set CHIRPIE_API_KEY environment variable."
    );
  }
  return client;
}

// Tool definitions, server info and tool annotations are shared with the
// hosted server at https://chirpie.ai/mcp (see packages/mcp-core) so both
// surfaces stay in lockstep.
const server = createStdioServer(requireClient);

// Start
const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  console.error("Failed to start Chirpie MCP server:", err);
  process.exit(1);
});
