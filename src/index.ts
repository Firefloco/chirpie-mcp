import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ChirpieClient, getConfig } from "@chirpie/sdk";
import { registerChirpieTools, type ChirpieApi } from "@chirpie/mcp-core";

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

// Injected at build time by tsup from package.json
declare const __PACKAGE_VERSION__: string;
const SERVER_VERSION =
  typeof __PACKAGE_VERSION__ !== "undefined" ? __PACKAGE_VERSION__ : "dev";

const server = new McpServer({
  name: "chirpie",
  version: SERVER_VERSION,
});

// Tool definitions are shared with the hosted server at https://chirpie.ai/mcp
// (see packages/mcp-core) so both surfaces stay in lockstep.
registerChirpieTools(server, requireClient);

// Start
const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  console.error("Failed to start Chirpie MCP server:", err);
  process.exit(1);
});
