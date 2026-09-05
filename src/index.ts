import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ChirpieClient, ChirpieApiError, getConfig } from "@chirpie/sdk";
import { z } from "zod";

// Resolve API key: env var → ~/.chirpie/config.json
const config = getConfig();
const client = config
  ? new ChirpieClient({ apiKey: config.api_key, baseUrl: config.base_url })
  : null;

function requireClient(): ChirpieClient {
  if (!client) {
    throw new Error(
      "Not authenticated. Run `chirpie login` or set CHIRPIE_API_KEY environment variable."
    );
  }
  return client;
}

function formatResult(data: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function formatError(err: unknown): { content: { type: "text"; text: string }[]; isError: true } {
  const message = err instanceof ChirpieApiError
    ? `${err.code}: ${err.message}`
    : err instanceof Error
      ? err.message
      : "Unknown error";
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

// Injected at build time by tsup from package.json
declare const __PACKAGE_VERSION__: string;
const SERVER_VERSION =
  typeof __PACKAGE_VERSION__ !== "undefined" ? __PACKAGE_VERSION__ : "dev";

const server = new McpServer({
  name: "chirpie",
  version: SERVER_VERSION,
});

// Post
server.tool(
  "chirpie_post",
  "Create a post on X/Twitter, Bluesky, LinkedIn, Threads, Mastodon, Instagram, Facebook, Telegram, Reddit, Pinterest, TikTok, YouTube, Google Business Profile, or Snapchat with optional media. Posts immediately or at a scheduled time. Note: Instagram, Pinterest, TikTok, YouTube, and Snapchat REQUIRE media.",
  {
    account_id: z.string().describe("Account ID to post from (X, Bluesky, LinkedIn, Threads, Mastodon, Instagram, Facebook, Telegram, Reddit, Pinterest, TikTok, YouTube, Google Business Profile, or Snapchat)"),
    text: z.string().max(63_206).describe("Post text (max 280 chars for standard X, 25,000 for X Premium, 300 for Bluesky, 3,000 for LinkedIn, 500 for Threads, 500 for Mastodon, 2,200 for Instagram, 63,206 for Facebook, 4,096 for Telegram, 40,000 for Reddit, 500 for Pinterest, 2,200 for TikTok, 5,000 for YouTube, 1,500 for Google Business Profile, 160 for Snapchat)"),
    media_urls: z.array(z.string()).max(10).optional().describe("Public image URLs. X supports images + video (max 4); Bluesky supports images only (~1MB each, max 4); LinkedIn supports images (JPEG, PNG, GIF up to 8MB each, max 4). Threads supports one image per post. Mastodon supports images + video (max 4). Instagram REQUIRES at least 1 image (max 10 for carousel). Facebook supports images (max 4). Telegram supports images + video. Reddit supports images (max 1). Pinterest REQUIRES 1 image. TikTok REQUIRES video or photo. YouTube REQUIRES video. Google Business Profile supports images (max 1). Snapchat REQUIRES media (image or video)."),
    schedule_at: z.string().optional().describe("ISO 8601 datetime (UTC) to schedule the post. Scheduled posts publish within ~5 minutes of this time."),
  },
  async ({ account_id, text, media_urls, schedule_at }) => {
    try {
      const result = await requireClient().createPost({ account_id, text, media_urls, schedule_at });
      return formatResult(result);
    } catch (err) {
      return formatError(err);
    }
  }
);

// Thread
server.tool(
  "chirpie_thread",
  "Create a thread (multiple posts) on X/Twitter, Bluesky, LinkedIn, Threads, Mastodon, Instagram, Facebook, Telegram, Reddit, Pinterest, TikTok, YouTube, Google Business Profile, or Snapchat. X, Bluesky, Threads, Mastodon, and Telegram support native reply threading. Reddit threads via comments. Others degrade gracefully to standalone posts.",
  {
    account_id: z.string().describe("Account ID to post from (X, Bluesky, LinkedIn, Threads, Mastodon, Instagram, Facebook, Telegram, Reddit, Pinterest, TikTok, YouTube, Google Business Profile, or Snapchat). Some platforms degrade to standalone posts."),
    posts: z.array(z.object({
      text: z.string().max(63_206).describe("Post text (max 280 chars for standard X, 25,000 for X Premium, 300 for Bluesky, 3,000 for LinkedIn, 500 for Threads, 500 for Mastodon, 2,200 for Instagram, 63,206 for Facebook, 4,096 for Telegram, 40,000 for Reddit, 500 for Pinterest, 2,200 for TikTok, 5,000 for YouTube, 1,500 for Google Business Profile, 160 for Snapchat)"),
      media_urls: z.array(z.string()).max(10).optional().describe("Public image URLs (Bluesky: images only, ~1MB each, max 4; X: images + video, max 4; LinkedIn: images up to 8MB each, max 4; Threads: 1 image per post; Mastodon: images + video, max 4; Instagram: requires images, max 10; Facebook: images, max 4; Telegram: images + video; Reddit: 1 image; Pinterest: requires 1 image; TikTok: requires video/photo; YouTube: requires video; Google Business Profile: 1 image; Snapchat: requires media)"),
    })).min(2).max(25).describe("Array of posts in the thread"),
    schedule_at: z.string().optional().describe("ISO 8601 datetime (UTC) to schedule the thread. Scheduled threads publish within ~5 minutes of this time."),
  },
  async ({ account_id, posts, schedule_at }) => {
    try {
      const result = await requireClient().createThread({ account_id, posts, schedule_at });
      return formatResult(result);
    } catch (err) {
      return formatError(err);
    }
  }
);

// List posts
server.tool(
  "chirpie_list_posts",
  "List recent posts. Filter by status or account.",
  {
    status: z.string().optional().describe("Filter: draft, scheduled, published, failed"),
    account_id: z.string().optional().describe("Filter by account ID"),
    limit: z.number().optional().describe("Max results (default 20)"),
  },
  async ({ status, account_id, limit }) => {
    try {
      const result = await requireClient().listPosts({ status, account_id, limit });
      return formatResult(result);
    } catch (err) {
      return formatError(err);
    }
  }
);

// Get post
server.tool(
  "chirpie_get_post",
  "Get a single post by ID.",
  {
    id: z.string().describe("Post ID"),
  },
  async ({ id }) => {
    try {
      const result = await requireClient().getPost(id);
      return formatResult(result);
    } catch (err) {
      return formatError(err);
    }
  }
);

// Delete post
server.tool(
  "chirpie_delete_post",
  "Delete a post. Also deletes from the platform (X, Bluesky, LinkedIn, Threads, Mastodon, Instagram, Facebook, Telegram, Reddit, Pinterest, YouTube, Google Business Profile, or Snapchat) if published. Note: TikTok does not support deletion via API.",
  {
    id: z.string().describe("Post ID to delete"),
  },
  async ({ id }) => {
    try {
      const result = await requireClient().deletePost(id);
      return formatResult(result);
    } catch (err) {
      return formatError(err);
    }
  }
);

// List accounts
server.tool(
  "chirpie_list_accounts",
  "List connected social accounts (X/Twitter, Bluesky, LinkedIn, Threads, Mastodon, Instagram, Facebook, Telegram, Reddit, Pinterest, TikTok, YouTube, Google Business Profile, and Snapchat).",
  {},
  async () => {
    try {
      const result = await requireClient().listAccounts();
      return formatResult(result);
    } catch (err) {
      return formatError(err);
    }
  }
);

// Analytics
server.tool(
  "chirpie_analytics",
  "Get analytics (likes, reposts, replies, etc.) for a published post on X, Bluesky, LinkedIn, Threads, Mastodon, Instagram, Facebook, Reddit, Pinterest, TikTok, YouTube, or Google Business Profile. Note: Telegram and Snapchat do not expose analytics.",
  {
    post_id: z.string().describe("Post ID to get analytics for"),
  },
  async ({ post_id }) => {
    try {
      const result = await requireClient().getPostAnalytics(post_id);
      return formatResult(result);
    } catch (err) {
      return formatError(err);
    }
  }
);

// Key management
server.tool(
  "chirpie_create_key",
  "Create a new Chirpie API key. Returns the full key once — store it securely. Keys are prefixed `chirpie_sk_` and never re-shown by the API.",
  {
    name: z.string().optional().describe("Friendly name for the key (default: 'Default')"),
  },
  async ({ name }) => {
    try {
      const result = await requireClient().createKey(name);
      return formatResult(result);
    } catch (err) {
      return formatError(err);
    }
  }
);

server.tool(
  "chirpie_list_keys",
  "List the user's Chirpie API keys (prefix + metadata; the full key is only shown on creation).",
  {},
  async () => {
    try {
      const result = await requireClient().listKeys();
      return formatResult(result);
    } catch (err) {
      return formatError(err);
    }
  }
);

server.tool(
  "chirpie_revoke_key",
  "Revoke a Chirpie API key by its ID. Revocation is permanent and immediate.",
  {
    id: z.string().describe("API key ID to revoke"),
  },
  async ({ id }) => {
    try {
      const result = await requireClient().revokeKey(id);
      return formatResult(result);
    } catch (err) {
      return formatError(err);
    }
  }
);

// Account connection tools — OAuth-based platforms return an authorization_url
// that the user must open in a browser to complete the flow.
// Disabled platforms below are commented out; uncomment to enable.
const oauthConnectTools: Array<{ name: string; label: string; method: keyof ChirpieClient }> = [
  { name: "chirpie_connect_x", label: "X/Twitter", method: "connectXAccount" },
  { name: "chirpie_connect_linkedin", label: "LinkedIn", method: "connectLinkedInAccount" },
  { name: "chirpie_connect_threads", label: "Threads", method: "connectThreadsAccount" },
  { name: "chirpie_connect_instagram", label: "Instagram", method: "connectInstagramAccount" },
  { name: "chirpie_connect_facebook", label: "Facebook Pages", method: "connectFacebookAccount" },
  // { name: "chirpie_connect_reddit", label: "Reddit", method: "connectRedditAccount" },
  // { name: "chirpie_connect_pinterest", label: "Pinterest", method: "connectPinterestAccount" },
  // { name: "chirpie_connect_tiktok", label: "TikTok", method: "connectTikTokAccount" },
  // { name: "chirpie_connect_youtube", label: "YouTube", method: "connectYouTubeAccount" },
  // { name: "chirpie_connect_google_business", label: "Google Business Profile", method: "connectGBPAccount" },
  // { name: "chirpie_connect_snapchat", label: "Snapchat", method: "connectSnapchatAccount" },
];

for (const { name, label, method } of oauthConnectTools) {
  server.tool(
    name,
    `Start the OAuth flow for a ${label} account. Returns an authorization_url the user must open in a browser to complete the connection.`,
    {},
    async () => {
      try {
        const fn = (requireClient() as unknown as Record<string, () => Promise<{ authorization_url: string }>>)[method as string];
        const result = await fn.call(requireClient());
        return formatResult(result);
      } catch (err) {
        return formatError(err);
      }
    }
  );
}

// Credential-based platforms
server.tool(
  "chirpie_connect_bluesky",
  "Connect a Bluesky account using an app password (create one at https://bsky.app/settings/app-passwords).",
  {
    identifier: z.string().describe("Bluesky handle (e.g. user.bsky.social)"),
    app_password: z.string().describe("Bluesky app password"),
  },
  async ({ identifier, app_password }) => {
    try {
      const result = await requireClient().connectBlueskyAccount({
        platform: "bluesky",
        identifier,
        app_password,
      });
      return formatResult(result);
    } catch (err) {
      return formatError(err);
    }
  }
);

server.tool(
  "chirpie_connect_mastodon",
  "Start the OAuth flow for a Mastodon account on a specific instance.",
  {
    instance_url: z.string().describe("Mastodon instance URL (e.g. https://mastodon.social)"),
  },
  async ({ instance_url }) => {
    try {
      const result = await requireClient().connectMastodonAccount({
        platform: "mastodon",
        instance_url,
      });
      return formatResult(result);
    } catch (err) {
      return formatError(err);
    }
  }
);

server.tool(
  "chirpie_connect_telegram",
  "Connect a Telegram bot. Create a bot with @BotFather on Telegram, then pass the bot token and the chat ID (user, group, or channel).",
  {
    bot_token: z.string().describe("Bot token from @BotFather"),
    chat_id: z.string().describe("Target chat ID (user, group, or channel)"),
  },
  async ({ bot_token, chat_id }) => {
    try {
      const result = await requireClient().connectTelegramAccount({
        platform: "telegram",
        bot_token,
        chat_id,
      });
      return formatResult(result);
    } catch (err) {
      return formatError(err);
    }
  }
);

// Start
const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  console.error("Failed to start Chirpie MCP server:", err);
  process.exit(1);
});
