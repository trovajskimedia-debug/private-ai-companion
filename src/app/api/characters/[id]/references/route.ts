import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, json, route, sameOrigin } from "@/lib/http";
import { imageDirectory } from "@/lib/image-storage";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return route(async () => {
    await requireAuth();
    const { id } = await context.params;
    return json(
      await db.referenceImage.findMany({
        where: { characterId: id },
        select: { id: true, label: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    );
  });
}
export async function POST(request: Request, context: Context) {
  return route(async () => {
    sameOrigin(request);
    await requireAuth();
    const { id } = await context.params;
    if (!(await db.character.findUnique({ where: { id } })))
      throw new ApiError(404, "Companion not found.");
    if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024)
      throw new ApiError(413, "Reference images must be 10 MB or smaller.");
    if ((await db.referenceImage.count({ where: { characterId: id } })) >= 12)
      throw new ApiError(
        400,
        "A character can have up to 12 reference images.",
      );
    const form = await request.formData();
    const file = form.get("image");
    if (
      !(file instanceof File) ||
      file.size > 10 * 1024 * 1024 ||
      file.size < 12
    )
      throw new ApiError(
        400,
        "Upload a PNG, JPEG or WebP reference image (maximum 10 MB).",
      );
    const data = Buffer.from(await file.arrayBuffer());
    const ext = data
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "png"
      : data[0] === 255 && data[1] === 216 && data[2] === 255
        ? "jpg"
        : data.toString("ascii", 0, 4) === "RIFF" &&
            data.toString("ascii", 8, 12) === "WEBP"
          ? "webp"
          : null;
    if (!ext)
      throw new ApiError(400, "The file contents are not a supported image.");
    const filename = `${randomUUID()}.${ext}`;
    await mkdir(imageDirectory(), { recursive: true });
    const fullpath = path.join(process.cwd(), "data", "images", filename);
    await writeFile(fullpath, data, { mode: 0o600 });
    try {
      return json(
        await db.referenceImage.create({
          data: { characterId: id, filename, label: file.name.slice(0, 100) },
          select: { id: true, label: true, createdAt: true },
        }),
        201,
      );
    } catch (error) {
      await unlink(fullpath).catch(() => {});
      throw error;
    }
  });
}
