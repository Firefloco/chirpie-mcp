import { defineConfig } from "tsup";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  target: "node18",
  banner: { js: "#!/usr/bin/env node" },
  // @chirpie/mcp-core is a private, source-only workspace package shared with
  // the hosted server. Bundle it into dist so the published package has no
  // unresolvable dependency.
  noExternal: ["@chirpie/mcp-core"],
  // Inline the real package version so the MCP server can advertise it
  // instead of a stale hardcoded value.
  define: {
    "__PACKAGE_VERSION__": JSON.stringify(pkg.version),
  },
});
