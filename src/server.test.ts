import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { CHIRPIE_TOOL_NAMES, type ChirpieApi } from "@chirpie/mcp-core";
import { createStdioServer } from "./server";

describe("stdio server tools/list", () => {
  it("sends every tool with its title and annotations", async () => {
    const server = createStdioServer((): ChirpieApi => {
      throw new Error("not used");
    });
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "vitest", version: "1.0.0" });
    await server.connect(serverSide);
    await client.connect(clientSide);

    try {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name)).toEqual([...CHIRPIE_TOOL_NAMES]);
      for (const tool of tools) {
        expect(tool.title, tool.name).toBeTruthy();
        expect(typeof tool.annotations?.readOnlyHint, tool.name).toBe("boolean");
        expect(typeof tool.annotations?.destructiveHint, tool.name).toBe("boolean");
      }
      expect(
        tools.find((t) => t.name === "chirpie_delete_post")?.annotations
      ).toMatchObject({ destructiveHint: true, readOnlyHint: false });

      expect(client.getServerVersion()?.name).toBe("chirpie");
      expect(client.getInstructions()).toBeTruthy();
    } finally {
      await client.close();
      await server.close();
    }
  });
});
