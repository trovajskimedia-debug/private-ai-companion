import path from "node:path";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { ApiError } from "./http";
import { comfyFetch, imageHistory } from "./integrations/comfyui";
import { getComfySettings } from "./comfy-settings";
import { withChatLock } from "./chat-lock";

export const imageDirectory = () => path.join(process.cwd(), "data", "images");

export async function resolveImageJob(id: string) {
  return withChatLock(`job:${id}`, async () => {
    const job = await db.imageJob.findUnique({ where: { id } });
    if (!job) throw new ApiError(404, "Image job not found.");
    if (job.status === "completed" || job.status === "failed") return job;
    if (Date.now() - job.createdAt.getTime() > 15 * 60_000) {
      return db.imageJob.update({
        where: { id },
        data: {
          status: "failed",
          error:
            "The image job timed out after 15 minutes. Check ComfyUI and try again.",
        },
      });
    }
    if (!job.promptId) return job;
    const serverUrl = job.serverUrl || (await getComfySettings()).baseUrl;
    const history = await imageHistory(job.promptId, serverUrl);
    if (!history) return job;
    if (history.status?.status_str === "error")
      return db.imageJob.update({
        where: { id },
        data: {
          status: "failed",
          error: history.status.messages?.some(([, data]) =>
            /OutOfMemory|out of memory/i.test(
              `${data.exception_type} ${data.exception_message}`,
            ),
          )
            ? "ComfyUI ran out of GPU memory. Try 512×768, batch size 1, and close other GPU applications. RTX 3060 VRAM differs between variants."
            : "ComfyUI reported an execution error. Check its model and node configuration.",
        },
      });
    const output = Object.values(history.outputs || {}).flatMap(
      (value) => value.images || [],
    )[0];
    if (!output) {
      if (history.status?.completed)
        return db.imageJob.update({
          where: { id },
          data: {
            status: "failed",
            error:
              "The workflow completed without an image. Include a SaveImage node.",
          },
        });
      return job;
    }
    const params = new URLSearchParams({
      filename: output.filename,
      subfolder: output.subfolder || "",
      type: output.type || "output",
    });
    const response = await comfyFetch(serverUrl, `/view?${params}`, {}, 30_000);
    if (!response.ok)
      throw new ApiError(
        502,
        "The generated image could not be downloaded. Retry shortly.",
      );
    const type = response.headers.get("content-type")?.split(";")[0];
    const ext =
      type === "image/png"
        ? "png"
        : type === "image/jpeg"
          ? "jpg"
          : type === "image/webp"
            ? "webp"
            : null;
    if (!ext)
      throw new ApiError(502, "ComfyUI returned an unsupported image format.");
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > 20 * 1024 * 1024)
      throw new ApiError(502, "Generated image exceeds the 20 MB limit.");
    const filename = `${randomUUID()}.${ext}`;
    await mkdir(imageDirectory(), { recursive: true });
    const fullPath = path.join(imageDirectory(), filename);
    await writeFile(fullPath, data, { mode: 0o600 });
    try {
      return await db.$transaction(async (tx) => {
        const message = await tx.message.create({
          data: {
            characterId: job.characterId,
            role: "assistant",
            kind: job.purpose === "portrait" ? "portrait" : "image",
            content: job.prompt,
            imagePath: filename,
            provider: "comfyui",
            metadata: JSON.parse(JSON.stringify(job.metadata)),
          },
        });
        if (job.purpose === "portrait")
          await tx.character.update({
            where: { id: job.characterId },
            data: { portraitId: message.id, portraitSpec: job.renderSpec },
          });
        return tx.imageJob.update({
          where: { id },
          data: { status: "completed" },
        });
      });
    } catch (error) {
      await unlink(fullPath).catch(() => {});
      throw error;
    }
  });
}
