import { hostname } from "os";
import {
  ChirpieClient,
  checkDeviceToken,
  saveConfig,
  startDeviceAuth,
  type DeviceAuthorization,
} from "@chirpie/sdk";
import type { ChirpieApi } from "@chirpie/mcp-core";

/**
 * Signing the stdio server in with no API key configured, without the agent
 * ever handling a credential.
 *
 * The first tool call starts a device authorization and fails with
 * `login_required` and the exact sentence for the agent to relay ("Ask the
 * person to open <url> and approve code <code>"). The server then polls in
 * the background; once the person approves, the key is saved to
 * `~/.chirpie/config.json` (the same file `chirpie login` writes) and the
 * next tool call simply works. Nothing has to restart.
 */
export interface DeviceLoginDeps {
  baseUrl: string;
  /** The MCP client's own name, when it sent one (e.g. "claude-code"). */
  clientName: () => string | undefined;
  start?: typeof startDeviceAuth;
  check?: typeof checkDeviceToken;
  save?: typeof saveConfig;
  makeClient?: (apiKey: string, baseUrl: string) => ChirpieApi;
  now?: () => number;
  /** Background polling; tests turn it off and poll by calling again. */
  background?: boolean;
}

export function loginRequiredMessage(auth: DeviceAuthorization): string {
  return `Chirpie is not signed in on this computer yet. Ask the person to open ${auth.verification_uri_complete} and approve the code ${auth.user_code} (if they have no Chirpie account, that page creates one with just their email). Do not ask them for a password, a code or a key: approving is all they do. Then call this tool again; the key is picked up and saved to ~/.chirpie/config.json automatically. The link expires in 15 minutes.`;
}

export function createDeviceLoginResolver(deps: DeviceLoginDeps): () => Promise<ChirpieApi> {
  const start = deps.start ?? startDeviceAuth;
  const check = deps.check ?? checkDeviceToken;
  const save = deps.save ?? saveConfig;
  const makeClient =
    deps.makeClient ?? ((apiKey: string, baseUrl: string) => new ChirpieClient({ apiKey, baseUrl }));
  const now = deps.now ?? Date.now;

  type Pending = { auth: DeviceAuthorization; expiresAt: number };

  let client: ChirpieApi | null = null;
  /** A collected key whose save to ~/.chirpie/config.json failed; retried. */
  let unsavedKey: string | null = null;
  let pending: Pending | null = null;
  let starting: Promise<Pending> | null = null;
  // One deadline and one in-flight poll for the foreground and the background
  // alike: every poll sooner than the interval is a slow_down that raises it.
  let nextPollAt = 0;
  let polling: Promise<ChirpieApi | null> | null = null;
  /** An error only the person can clear (today, key_limit_reached), surfaced to the agent. */
  let personError: { code: string; message: string } | null = null;
  /**
   * The person declined the last request. The next call says so instead of
   * mailing a fresh link; only a call after that (the agent asked and the
   * person said yes) starts again.
   */
  let declined = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const persist = (apiKey: string) => {
    try {
      save(apiKey, deps.baseUrl);
      unsavedKey = null;
    } catch (err) {
      // The key is single use and already collected: keep using it in this
      // process and try the save again on the next call.
      unsavedKey = apiKey;
      console.error("Could not save the Chirpie API key to ~/.chirpie/config.json:", err);
    }
  };

  const adopt = (apiKey: string): ChirpieApi => {
    client = makeClient(apiKey, deps.baseUrl);
    pending = null;
    personError = null;
    if (timer) clearTimeout(timer);
    persist(apiKey);
    return client;
  };

  /** One poll of the request current when it starts; ignores a superseded one. */
  const pollOnce = (): Promise<ChirpieApi | null> => {
    if (polling) return polling;
    const req = pending;
    if (!req) return Promise.resolve(null);
    nextPollAt = now() + req.auth.interval * 1000;
    polling = (async () => {
      try {
        const result = await check({ deviceCode: req.auth.device_code, baseUrl: deps.baseUrl });
        // A newer request replaced this one while the poll was out: its
        // answer, approval included, belongs to nobody now.
        if (pending !== req) return client;
        if (result.status === "approved") return adopt(result.token.api_key);
        if (result.status === "denied" || result.status === "expired") {
          pending = null;
          if (result.status === "denied") declined = true;
          return null;
        }
        req.auth = { ...req.auth, interval: result.interval };
        nextPollAt = now() + result.interval * 1000;
        personError = null;
        return null;
      } catch (err) {
        const code = (err as { code?: unknown } | null)?.code;
        const message = (err as { message?: unknown } | null)?.message;
        if (pending === req && code === "key_limit_reached" && typeof message === "string") {
          personError = { code, message };
        }
        return null;
      } finally {
        polling = null;
      }
    })();
    return polling;
  };

  const schedule = () => {
    if (!deps.background || !pending) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      await pollOnce();
      schedule();
    }, Math.max(0, nextPollAt - now()) || pending.auth.interval * 1000);
    timer.unref?.();
  };

  const waiting = (req: Pending): Error => {
    if (personError) {
      return Object.assign(new Error(personError.message), {
        code: personError.code,
        details: {
          human_action: {
            message: `${personError.message} The approval is kept; once a key is revoked, call this tool again.`,
            url: `${deps.baseUrl.replace(/\/+$/, "")}/dashboard/keys`,
          },
        },
      });
    }
    return Object.assign(new Error(loginRequiredMessage(req.auth)), {
      code: "login_required",
      details: { human_action: req.auth.human_action },
    });
  };

  return async () => {
    if (client) {
      if (unsavedKey) persist(unsavedKey);
      return client;
    }
    if (pending && now() < pending.expiresAt) {
      // The background poll may be a few seconds behind the person's tap.
      if (now() >= nextPollAt) {
        const ready = await pollOnce();
        if (ready) return ready;
      }
      if (pending) throw waiting(pending);
    }
    if (declined) {
      declined = false;
      throw Object.assign(
        new Error(
          "The person declined the request to connect Chirpie. Do not start another on your own: ask them whether they want to connect it, and call this tool again only if they say yes."
        ),
        { code: "access_denied" }
      );
    }
    // Two calls arriving together share one start, so there is one link.
    if (!starting) {
      const name = deps.clientName();
      starting = start({
        baseUrl: deps.baseUrl,
        clientName: `${name ? `${name} via Chirpie MCP` : "Chirpie MCP"} on ${hostname()}`,
      })
        .then((auth) => {
          const req: Pending = { auth, expiresAt: now() + auth.expires_in * 1000 };
          pending = req;
          personError = null;
          nextPollAt = now() + auth.interval * 1000;
          schedule();
          return req;
        })
        .finally(() => {
          starting = null;
        });
    }
    const req = await starting;
    throw waiting(req);
  };
}
