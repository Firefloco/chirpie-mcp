import { describe, expect, it, vi } from "vitest";
import type { ChirpieApi } from "@chirpie/mcp-core";
import type { DeviceAuthorization, DeviceTokenCheck } from "@chirpie/sdk";
import { createDeviceLoginResolver } from "./device-login";

const auth: DeviceAuthorization = {
  device_code: "chirpie_dc_test",
  user_code: "WDJB-MJHT",
  verification_uri: "https://chirpie.ai/activate",
  verification_uri_complete: "https://chirpie.ai/activate?code=WDJB-MJHT",
  expires_in: 900,
  interval: 5,
  human_action: { message: "open it", url: "https://chirpie.ai/activate?code=WDJB-MJHT" },
  next_step: "poll",
};

function setup(checks: DeviceTokenCheck[], clock?: () => number) {
  // By default every read of the clock is ten seconds later, so each call is
  // past the poll interval.
  let t = 0;
  const now = clock ?? (() => (t += 10_000));
  const start = vi.fn<(options?: { clientName?: string }) => Promise<DeviceAuthorization>>(async () => auth);
  const check = vi.fn(async () => checks.shift() ?? ({ status: "pending", interval: 5 } as const));
  const save = vi.fn();
  const fake = { tag: "client" } as unknown as ChirpieApi;
  const resolve = createDeviceLoginResolver({
    baseUrl: "https://chirpie.ai",
    clientName: () => "claude-code",
    start,
    check,
    save,
    makeClient: () => fake,
    now,
    background: false,
  });
  return { resolve, start, check, save, fake };
}

describe("stdio device login", () => {
  it("starts a device authorization and tells the agent exactly what to relay", async () => {
    const { resolve, start } = setup([]);
    const err = await resolve().catch((e) => e);
    expect(err.code).toBe("login_required");
    expect(err.message).toContain("https://chirpie.ai/activate?code=WDJB-MJHT");
    expect(err.message).toContain("WDJB-MJHT");
    expect(err.message).toMatch(/Do not ask them for a password, a code or a key/);
    expect(start.mock.calls[0][0]).toMatchObject({ clientName: expect.stringContaining("claude-code via Chirpie MCP on ") });
  });

  it("keeps the same request while it is pending, rather than starting another", async () => {
    const { resolve, start } = setup([{ status: "pending", interval: 5 }]);
    await resolve().catch(() => {});
    const again = await resolve().catch((e) => e);
    expect(again.code).toBe("login_required");
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("picks the key up once approved, saves it, and stops asking", async () => {
    const { resolve, save, fake, start } = setup([
      {
        status: "approved",
        token: {
          api_key: "chirpie_sk_new",
          key_prefix: "chirpie_sk_new",
          name: "n",
          scopes: null,
          expires_at: "2027-01-01T00:00:00Z",
          token_type: "api_key",
          next_step: "",
        },
      },
    ]);
    await resolve().catch(() => {});
    await expect(resolve()).resolves.toBe(fake);
    await expect(resolve()).resolves.toBe(fake);
    expect(save).toHaveBeenCalledWith("chirpie_sk_new", "https://chirpie.ai");
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("says the person declined, and starts again only on the call after", async () => {
    const { resolve, start } = setup([{ status: "denied" }]);
    await resolve().catch(() => {});
    const denied = await resolve().catch((e) => e);
    expect(denied.code).toBe("access_denied");
    expect(start).toHaveBeenCalledTimes(1);
    // The agent asked, the person said yes, and the tool is called again.
    const again = await resolve().catch((e) => e);
    expect(again.code).toBe("login_required");
    expect(start).toHaveBeenCalledTimes(2);
  });

  it("does not poll again inside the interval, which would only earn a slow_down", async () => {
    const { resolve, check } = setup([], () => 1_000);
    await resolve().catch(() => {});
    const again = await resolve().catch((e) => e);
    expect(again.code).toBe("login_required");
    expect(again.details.human_action.url).toContain("WDJB-MJHT");
    expect(check).not.toHaveBeenCalled();
  });

  it("shares one start between calls that arrive together", async () => {
    const { resolve, start } = setup([]);
    const [a, b] = await Promise.all([resolve().catch((e) => e), resolve().catch((e) => e)]);
    expect(a.code).toBe("login_required");
    expect(b.code).toBe("login_required");
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("keeps the collected key when saving the config fails", async () => {
    const approved: DeviceTokenCheck = {
      status: "approved",
      token: {
        api_key: "chirpie_sk_new",
        key_prefix: "chirpie_sk_new",
        name: "n",
        scopes: null,
        expires_at: "2027-01-01T00:00:00Z",
        token_type: "api_key",
        next_step: "",
      },
    };
    const { resolve, save, fake, check } = setup([approved]);
    save.mockImplementationOnce(() => {
      throw new Error("read-only home");
    });
    await resolve().catch(() => {});
    await expect(resolve()).resolves.toBe(fake);
    // The next call retries the save, and never asks for the key again.
    await expect(resolve()).resolves.toBe(fake);
    expect(save).toHaveBeenCalledTimes(2);
    expect(check).toHaveBeenCalledTimes(1);
  });

  it("tells the person about a full key list instead of asking them to approve again", async () => {
    const { resolve, check } = setup([]);
    check.mockRejectedValueOnce(
      Object.assign(new Error("This Chirpie account already holds 25 API keys."), {
        code: "key_limit_reached",
      })
    );
    await resolve().catch(() => {});
    const err = await resolve().catch((e) => e);
    expect(err.code).toBe("key_limit_reached");
    expect(err.details.human_action.url).toBe("https://chirpie.ai/dashboard/keys");
  });
});
