# @chirpie/mcp

**Post, schedule, and track social posts on X, Bluesky, LinkedIn, Instagram and more from AI agents.** Chirpie is one API for X/Twitter, Bluesky, LinkedIn, Threads, Mastodon, Instagram, Facebook and Telegram, covering posting, threads, scheduling, deletion and analytics. This MCP server puts all of it in front of Claude, Cursor, ChatGPT or any other MCP-capable agent, so "post this to X and LinkedIn, and schedule the follow-up for 9am" is a single sentence rather than a pile of platform SDKs, OAuth dances and rate-limit handling.

## Hosted server (recommended)

You don't need to install anything. Point your client at:

```
https://chirpie.ai/mcp
```

Sign in when prompted and you're connected. No API key to copy, nothing to keep up to date.

**Claude Code**

```bash
claude mcp add --transport http chirpie https://chirpie.ai/mcp
```

**Claude**: Settings → Connectors → Add custom connector → `https://chirpie.ai/mcp`

**Cursor**: add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "chirpie": {
      "url": "https://chirpie.ai/mcp"
    }
  }
}
```

**ChatGPT**: Settings → Connectors → Create → MCP server → `https://chirpie.ai/mcp`

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

**Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

**Cursor**: add to your MCP settings:

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
| `chirpie_upload_media` | Upload an image or video and get the id a post can attach |
| `chirpie_post` | Post to any connected account, now or scheduled, or to several at once |
| `chirpie_thread` | Post a 2-25 part thread, to one account or to several at once |
| `chirpie_list_posts` | List posts, filtered by status, account, or the group of a multi-account publish |
| `chirpie_get_post` | Fetch one post |
| `chirpie_update_post` | Edit a post that has not published yet: text, media, or time |
| `chirpie_delete_post` | Delete a post (and remove it from the platform) |
| `chirpie_list_accounts` | List connected social accounts, active and inactive |
| `chirpie_activate_account` | Activate an account so it can publish |
| `chirpie_deactivate_account` | Deactivate an account (stays connected, frees a plan slot) |
| `chirpie_disconnect_account` | Disconnect an account (ends the connection, cancels its scheduled posts, frees a plan slot) |
| `chirpie_analytics` | Engagement metrics for a published post |
| `chirpie_create_key` | Create an API key |
| `chirpie_list_keys` | List API keys |
| `chirpie_revoke_key` | Revoke an API key |
| `chirpie_connect_x` | Connect X/Twitter (returns an authorization link) |
| `chirpie_connect_linkedin` | Connect a LinkedIn profile |
| `chirpie_connect_linkedin_pages` | Connect the LinkedIn Pages you administer (coming soon) |
| `chirpie_connect_threads` | Connect Threads (coming soon) |
| `chirpie_connect_instagram` | Connect Instagram (coming soon) |
| `chirpie_connect_facebook` | Connect a Facebook Page (coming soon) |
| `chirpie_connect_bluesky` | Connect Bluesky with an app password |
| `chirpie_connect_mastodon` | Connect Mastodon on any instance |
| `chirpie_connect_telegram` | Connect a Telegram bot |
| `chirpie_set_x_keys` | Register your own X developer app for connecting X accounts |
| `chirpie_get_x_keys_status` | Check whether your own X developer app is configured |
| `chirpie_remove_x_keys` | Remove your own X developer app |

The hosted and local servers expose exactly the same tools. On the hosted server,
`chirpie_create_key`, `chirpie_list_keys`, `chirpie_revoke_key` and
`chirpie_remove_x_keys` require API-key auth. Sign in with OAuth and they are not
offered, since an OAuth connection must not leave a long-lived key behind or tear
down credentials your other connections depend on.

## Several accounts in one call

`chirpie_post` and `chirpie_thread` take `account_ids` in place of `account_id`,
up to 25 of them. The answer is then a `group_id` plus one result per account,
in the order they were named, and `account_configurations` gives a single
account its own text, media or thread. The accounts that worked stay published
when another one's platform refuses, so an agent should read `success` on each
result. Pass the `group_id` to `chirpie_list_posts` to read the whole group
back.

## Try it

Once connected, ask your agent:

- "Post to X and LinkedIn: we just shipped v2, but keep the X one shorter."
- "Draft a 5-post thread about why we moved off cron, and schedule it for 9am tomorrow."
- "How did my last Bluesky post do?"
- "Connect my X account."

## Links

- Docs: https://chirpie.ai/docs/mcp
- API reference: https://chirpie.ai/docs
- Dashboard: https://chirpie.ai/dashboard

MIT © Fireflo LLC

---

> This repository is an automatically maintained source mirror of `packages/mcp` in the Chirpie monorepo. Pull requests opened here cannot be merged.
