import { afterEach, describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { body, sameOrigin } from "@/lib/http";

afterEach(() => vi.unstubAllEnvs());
describe("private-space authentication", () => {
  it("salts passphrases independently and verifies only the right password", async () => {
    const a = await hashPassword("a long private passphrase");
    const b = await hashPassword("a long private passphrase");
    expect(a).not.toBe(b);
    expect(a).not.toContain("a long private passphrase");
    expect(await verifyPassword("a long private passphrase", a)).toBe(true);
    expect(await verifyPassword("wrong passphrase", a)).toBe(false);
    expect(await verifyPassword("anything", "broken")).toBe(false);
  });
  it("uses the real Host authority when Next normalizes the internal URL", () => {
    const request = new Request("http://localhost:3100/api/session", {
      headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
    });
    expect(() => sameOrigin(request)).not.toThrow();
  });
  it("rejects foreign domains, ports, null origins, and protocol mismatches", () => {
    for (const origin of [
      "http://untrusted.example",
      "http://127.0.0.1:3101",
      "null",
      "https://127.0.0.1:3100",
    ]) {
      expect(() =>
        sameOrigin(
          new Request("http://localhost:3100", {
            headers: { host: "127.0.0.1:3100", origin },
          }),
        ),
      ).toThrow("Cross-site");
    }
  });
  it("supports HTTPS behind a reverse proxy only when secure cookies are configured", () => {
    vi.stubEnv("COOKIE_SECURE", "true");
    expect(() =>
      sameOrigin(
        new Request("http://localhost:3000", {
          headers: {
            host: "companion.example",
            origin: "https://companion.example",
          },
        }),
      ),
    ).not.toThrow();
  });
  it("rejects malformed JSON and oversized request bodies", async () => {
    await expect(
      body(new Request("http://local", { method: "POST", body: "{" })),
    ).rejects.toThrow("Invalid JSON");
    await expect(
      body(
        new Request("http://local", {
          method: "POST",
          body: "x".repeat(24_001),
        }),
      ),
    ).rejects.toThrow("too large");
  });
});
