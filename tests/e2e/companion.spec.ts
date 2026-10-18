import { test, expect } from "@playwright/test";

const passphrase = "test-only-private-passphrase";
test("private companion workflow persists appearance, wardrobe, chat and relationships", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  expect((await request.get("/api/characters")).status()).toBe(401);
  await page.goto("/");
  await page.getByLabel(/passphrase/i).fill(passphrase);
  await page
    .getByRole("button", { name: /Create my private space|Unlock my space/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "A world that feels like you." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Alma/ }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: ".local/screenshots/companions-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Create companion", exact: true })
    .first()
    .click();
  await page.getByLabel("Name", { exact: true }).fill("Test Nova");
  await page.getByLabel("Age · adults only").fill("29");
  await page.getByRole("tab", { name: "Appearance" }).click();
  await page.getByRole("slider", { name: "Height", exact: true }).fill("181");
  await page
    .getByRole("slider", { name: "Body build", exact: true })
    .fill("67");
  await page.getByRole("slider", { name: "Curves", exact: true }).fill("72");
  await page.getByRole("tab", { name: "Wardrobe" }).click();
  await page.screenshot({
    path: ".local/screenshots/character-studio.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Yoga essentials/ }).click();
  await page
    .getByRole("button", { name: "Bottoms color #333b44", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create companion", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: /Test Nova/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: /Test Nova/ })).toBeVisible();
  await page
    .getByRole("button", { name: "Chat with Test Nova", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Message Test Nova" })
    .fill("Hello, I love yoga");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Demo response", { exact: true })).toBeVisible();
  await page.screenshot({
    path: ".local/screenshots/private-chat.png",
    fullPage: true,
  });
  await expect(
    page
      .getByLabel("Conversation")
      .getByText("Hello, I love yoga", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Chat with Test Nova", exact: true })
    .click();
  await expect(page.getByText("Demo response", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Imagine a photo" }).click();
  await page.getByRole("button", { name: "Generate with ComfyUI" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Import a ComfyUI API workflow" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Relationships", exact: true })
    .click();
  await expect(
    page.getByText("1 conversations shared · 5 connection points"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "My companions", exact: false })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Edit Test Nova", exact: true })
    .click();
  await page.getByRole("tab", { name: "Appearance" }).click();
  await expect(
    page.getByRole("slider", { name: "Height", exact: true }),
  ).toHaveValue("181");
  await expect(
    page.getByRole("slider", { name: "Body build", exact: true }),
  ).toHaveValue("67");
  await page.getByRole("tab", { name: "Wardrobe" }).click();
  await expect(
    page.getByRole("button", { name: "Bottoms color #333b44", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Settings & integrations" }).click();
  await page
    .getByRole("button", { name: "Lock my space", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  expect((await page.request.get("/api/export")).status()).toBe(401);
  expect(errors).toEqual([]);
});

test("mobile navigation and character studio fit a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel(/passphrase/i).fill(passphrase);
  await page.getByRole("button", { name: "Unlock my space" }).click();
  await expect(
    page.getByRole("heading", { name: "A world that feels like you." }),
  ).toBeVisible();
  await page.screenshot({
    path: ".local/screenshots/companions-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Character studio", exact: true })
    .click();
  await expect(page.getByRole("tab", { name: "Appearance" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("rejects cross-site account creation and invalid input without exposing private data", async ({
  request,
}) => {
  const crossSite = await request.post("/api/session", {
    headers: { Origin: "https://untrusted.example" },
    data: { password: passphrase },
  });
  expect(crossSite.status()).toBe(403);
  const login = await request.post("/api/session", {
    data: { password: passphrase },
  });
  expect(login.status()).toBe(200);
  const chars = await (await request.get("/api/characters")).json();
  const original = chars[0];
  expect(
    (
      await request.patch(`/api/characters/${original.id}`, {
        data: { ...original, age: 17 },
      })
    ).status(),
  ).toBe(400);
  const failed = await request.post(`/api/characters/${original.id}/messages`, {
    data: { mode: "ollama", content: "This should not save on model failure" },
  });
  expect(failed.status()).toBe(503);
  const messages = await (
    await request.get(`/api/characters/${original.id}/messages`)
  ).json();
  expect(
    messages.messages.some(
      (m: { content: string }) =>
        m.content === "This should not save on model failure",
    ),
  ).toBe(false);
  expect((await request.get("/api/images/does-not-exist")).status()).toBe(404);
});
