import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createChirpieMcpServer,
  type ChirpieApiResolver,
} from "@chirpie/mcp-core";

// Injected at build time by tsup from package.json
declare const __PACKAGE_VERSION__: string;
export const SERVER_VERSION =
  typeof __PACKAGE_VERSION__ !== "undefined" ? __PACKAGE_VERSION__ : "dev";

/**
 * The stdio server, built but not yet connected.
 *
 * Split from `index.ts` so a test can connect it to an in-memory transport
 * and read `tools/list` exactly as a client would. The server info, the
 * instructions and every tool's annotations come from `@chirpie/mcp-core`, so
 * the hosted server at https://chirpie.ai/mcp describes itself identically.
 */
export function createStdioServer(resolveClient: ChirpieApiResolver): McpServer {
  return createChirpieMcpServer(SERVER_VERSION, resolveClient);
}
