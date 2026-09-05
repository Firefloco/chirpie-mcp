# Chirpie MCP Server

> **This repository is an automatically maintained source mirror** of `packages/mcp`
> in the Chirpie monorepo. Please do not open pull requests here — they cannot be
> merged. File issues and feature requests at [chirpie.ai](https://chirpie.ai) or
> email support@chirpie.ai.

[![npm](https://img.shields.io/npm/v/@chirpie/mcp)](https://www.npmjs.com/package/@chirpie/mcp)

The Chirpie [MCP](https://modelcontextprotocol.io) server gives AI agents a single set
of tools for social media. Post, thread, schedule, delete and pull analytics across
X/Twitter, Bluesky, LinkedIn, Threads, Mastodon, Instagram, Facebook and Telegram — with
Reddit, Pinterest, TikTok, YouTube, Google Business Profile and Snapchat coming soon.

Accounts are connected through a browser OAuth flow the agent starts itself, so there
are no per-platform API keys to manage.

- **Docs:** https://chirpie.ai/docs/mcp
- **npm:** https://www.npmjs.com/package/@chirpie/mcp
- **MCP Registry:** `io.github.firefloco/chirpie`

## Install

### Claude Code

```bash
claude mcp add chirpie -- npx -y @chirpie/mcp
```

### Claude Desktop / Cursor / any MCP client

```json
{
  "mcpServers": {
    "chirpie": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@chirpie/mcp"],
      "env": { "CHIRPIE_API_KEY": "chirpie_sk_..." }
    }
  }
}
```

### Hosted (no install)

```json
{
  "mcpServers": {
    "chirpie": { "type": "http", "url": "https://chirpie.ai/mcp" }
  }
}
```

## Authentication

Either works:

- Run `npm install -g chirpie && chirpie login` — credentials are saved to
  `~/.chirpie/config.json` and picked up automatically.
- Or set `CHIRPIE_API_KEY` to a key created at https://chirpie.ai/dashboard/keys.

`CHIRPIE_BASE_URL` optionally overrides the API base URL (defaults to
`https://chirpie.ai`).

## Tools

18 tools covering posting (`chirpie_post`, `chirpie_thread`), post management
(`chirpie_list_posts`, `chirpie_get_post`, `chirpie_delete_post`), analytics
(`chirpie_analytics`), accounts (`chirpie_list_accounts`, plus a
`chirpie_connect_*` tool per platform) and API keys (`chirpie_create_key`,
`chirpie_list_keys`, `chirpie_revoke_key`).

See https://chirpie.ai/docs/mcp for the full reference.

## Note on building from source

`package.json` references `@chirpie/sdk` as a workspace dependency, which only resolves
inside the Chirpie monorepo. This mirror exists for transparency and security review —
install the published package from npm rather than building it here.

## License

MIT — see [LICENSE](./LICENSE).
