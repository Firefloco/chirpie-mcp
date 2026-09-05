import { defineConfig } from "tsup";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  target: "node18",
  banner: { js: "#!/usr/bin/env node" },
  // Inline the real package version so the MCP server can advertise it
  // instead of a stale hardcoded value.
  define: {
    "__PACKAGE_VERSION__": JSON.stringify(pkg.version),
  },
});
