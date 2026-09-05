# @chirpie/mcp

**Give your AI agent a voice on social media.** Chirpie is one API for X/Twitter, Bluesky, LinkedIn, Threads, Mastodon, Instagram, Facebook and Telegram — posting, threads, scheduling, deletion and analytics. This MCP server puts all of it in front of Claude, Cursor, ChatGPT or any other MCP-capable agent, so "post this to X and LinkedIn, and schedule the follow-up for 9am" is a single sentence rather than a pile of platform SDKs, OAuth dances and rate-limit handling.

## Hosted server (recommended)

You don't need to install anything. Point your client at:

```
https://chirpie.ai/mcp
```

Sign in when prompted and you're connected — no API key to copy, nothing to keep up to date.

**Claude Code**

```bash
claude mcp add --transport http chirpie https://chirpie.ai/mcp
```

**Claude** — Settings → Connectors → Add custom connector → `https://chirpie.ai/mcp`

**Cursor** — add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "chirpie": {
      "url": "https://chirpie.ai/mcp"
    }
  }
}
```

**ChatGPT** — Settings → Connectors → Create → MCP server → `https://chirpie.ai/mcp`

Prefer a key over OAuth (CI, scripts, clients without an OAuth flow)? Send it as a header:

```json
{
  "mcpServers": {
    "chirpie": {
      "type": "http",
      "url": "https://chirpie.ai/mcp",
      "headers": { "Authorization": "Bearer chirpie_sk_your_key_here" }
    }
  }
}
```

## Local server (this package)

Run the same tool set locally over stdio.

```bash
npm install -g chirpie
chirpie login
```

**Claude Code**

```bash
claude mcp add chirpie -- npx @chirpie/mcp
```

**Claude Desktop** — `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chirpie": {
      "command": "npx",
      "args": ["@chirpie/mcp"]
    }
  }
}
```

**Cursor** — add to your MCP settings:

```json
{
  "mcpServers": {
    "chirpie": {
      "command": "npx",
      "args": ["@chirpie/mcp"]
    }
  }
}
```

The local server resolves credentials in this order:

1. `CHIRPIE_API_KEY` environment variable
2. `~/.chirpie/config.json` (written by `chirpie login`)

The CLI and this server share that config, so one `chirpie login` covers both.

## Tools

| Tool | What it does |
|------|--------------|
| `chirpie_post` | Post to any connected account, now or scheduled |
| `chirpie_thread` | Post a 2–25 part thread |
| `chirpie_list_posts` | List posts, filtered by status or account |
| `chirpie_get_post` | Fetch one post |
| `chirpie_delete_post` | Delete a post (and remove it from the platform) |
| `chirpie_list_accounts` | List connected social accounts |
| `chirpie_analytics` | Engagement metrics for a published post |
| `chirpie_create_key` | Create an API key |
| `chirpie_list_keys` | List API keys |
| `chirpie_revoke_key` | Revoke an API key |
| `chirpie_connect_x` | Connect X/Twitter (returns an authorization link) |
| `chirpie_connect_linkedin` | Connect LinkedIn |
| `chirpie_connect_threads` | Connect Threads |
| `chirpie_connect_instagram` | Connect Instagram |
| `chirpie_connect_facebook` | Connect a Facebook Page |
| `chirpie_connect_bluesky` | Connect Bluesky with an app password |
| `chirpie_connect_mastodon` | Connect Mastodon on any instance |
| `chirpie_connect_telegram` | Connect a Telegram bot |

The hosted and local servers expose exactly the same tools.

## Try it

Once connected, ask your agent:

- "Post to X and LinkedIn: we just shipped v2."
- "Draft a 5-post thread about why we moved off cron, and schedule it for 9am tomorrow."
- "How did my last Bluesky post do?"
- "Connect my X account."

## Links

- Docs — https://chirpie.ai/docs/mcp
- API reference — https://chirpie.ai/docs
- Dashboard — https://chirpie.ai/dashboard

MIT © Fireflo LLC

---

> This repository is an automatically maintained source mirror of `packages/mcp` in the Chirpie monorepo. Pull requests opened here cannot be merged.
