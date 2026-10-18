import { test, expect } from "@playwright/test";

test("Ollama chat and durable ComfyUI jobs work through HTTP and private image storage", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByLabel(/passphrase/i).fill("fixture-only-passphrase-123");
  await page.getByRole("button", { name: "Create my private space" }).click();
  await page
    .getByRole("button", { name: "Chat with Alma", exact: true })
    .click();
  await page.getByLabel("Reply mode", { exact: true }).selectOption("ollama");
  await page
    .getByRole("textbox", { name: "Message Alma" })
    .fill("Hello from an integration test");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByText("A reply from the Ollama protocol fixture.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Imagine a photo" }).click();
  await page.getByRole("button", { name: "Generate with ComfyUI" }).click();
  await expect(page.getByText("ComfyUI is creating your image…")).toBeVisible();
  // Jobs are database-backed and can be resumed after navigating away or reloading.
  await page.reload();
  await page
    .getByRole("button", { name: "Chat with Alma", exact: true })
    .click();
  const photo = page.getByRole("img", {
    name: /^Alma: Enjoying a quiet morning/,
  });
  await expect(photo).toBeVisible({ timeout: 15_000 });
  await expect(photo).toHaveJSProperty("naturalWidth", 1);
  const src = await photo.getAttribute("src");
  expect(src).toMatch(/^\/api\/images\//);
  expect((await page.request.get(src!)).status()).toBe(200);
  expect((await request.get(src!)).status()).toBe(401);
  // Clear removes the database message and the private image file reference.
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Clear conversation", exact: true })
    .click();
  await expect(photo).toHaveCount(0);
  expect((await page.request.get(src!)).status()).toBe(404);
  const chars = await (await page.request.get("/api/characters")).json();
  const id = chars[0].id;
  const before = chars[0].relationship.points;
  const failure = await page.request.post(`/api/characters/${id}/messages`, {
    data: { mode: "ollama", content: "[fail]" },
  });
  expect(failure.status()).toBe(502);
  const after = await (await page.request.get("/api/characters")).json();
  expect(after[0].relationship.points).toBe(before);
  const failedImage = await page.request.post(`/api/characters/${id}/images`, {
    data: { prompt: "[execution-error]" },
  });
  expect(failedImage.status()).toBe(202);
  const job = await failedImage.json();
  const resolved = await (
    await page.request.post(`/api/jobs/${job.id}`)
  ).json();
  expect(resolved.status).toBe("failed");
  expect(resolved.error).toContain("execution error");
});
