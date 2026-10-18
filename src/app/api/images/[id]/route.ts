import path from "node:path";
import { readFile } from "node:fs/promises";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ApiError, route } from "@/lib/http";
import { imageDirectory } from "@/lib/image-storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return route(async () => {
    await requireAuth();
    const { id } = await context.params;
    const message = await db.message.findUnique({ where: { id } });
    if (
      !message?.imagePath ||
      !/^[a-f0-9-]+\.(png|jpg|webp)$/.test(message.imagePath)
    )
      throw new ApiError(404, "Image not found.");
    let data: Buffer;
    try {
      data = await readFile(path.join(imageDirectory(), message.imagePath));
    } catch {
      throw new ApiError(404, "Image file not found.");
    }
    const ext = message.imagePath.split(".").at(-1);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": ext === "jpg" ? "image/jpeg" : `image/${ext}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
