import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, route } from "@/lib/http";
import { imageDirectory } from "@/lib/image-storage";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return route(async () => {
    await requireAuth();
    const { id } = await context.params;
    const image = await db.referenceImage.findUnique({ where: { id } });
    if (!image || !/^[a-f0-9-]+\.(png|jpg|webp)$/.test(image.filename))
      throw new ApiError(404, "Reference image not found.");
    const data = await readFile(path.join(imageDirectory(), image.filename));
    const ext = image.filename.split(".").at(-1);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": ext === "jpg" ? "image/jpeg" : `image/${ext}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
