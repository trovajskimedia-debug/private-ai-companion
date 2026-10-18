import path from "node:path";
import { unlink } from "node:fs/promises";
import { ApiError } from "./http";

export async function purgeImages(filenames: (string | null)[]) {
  for (const filename of filenames) {
    if (!filename || !/^[a-f0-9-]+\.(png|jpg|webp)$/.test(filename)) continue;
    try {
      await unlink(path.join(process.cwd(), "data", "images", filename));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT")
        throw new ApiError(
          500,
          "An image file could not be deleted. Check server filesystem permissions and retry.",
        );
    }
  }
}
