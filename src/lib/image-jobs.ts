import { db } from "./db";
import { ApiError } from "./http";
import { withChatLock } from "./chat-lock";
import { queueImage } from "./integrations/comfyui";
import { containsSexualContent, isFamilyRole, readProfile } from "./profile";
import { visualSpec } from "./visual-prompt";

export async function createImageJob(
  characterId: string,
  prompt: string,
  purpose: "chat" | "portrait",
) {
  return withChatLock(`image:${characterId}`, async () => {
    const character = await db.character.findUnique({
      where: { id: characterId },
      include: { relationship: true },
    });
    if (!character) throw new ApiError(404, "Companion not found.");
    const profile = readProfile(
      character.profile,
      character.relationship?.kind,
    );
    if (
      isFamilyRole(profile, character.relationship?.kind) &&
      containsSexualContent(prompt)
    )
      throw new ApiError(
        400,
        "Family relationships are strictly non-sexual. Choose a clothed, non-sexual scene.",
      );
    if (
      await db.imageJob.count({
        where: { characterId, status: { in: ["queued", "running"] } },
      })
    )
      throw new ApiError(
        409,
        "An image is already queued for this companion. Open their chat or studio to check it.",
      );
    const job = await db.imageJob.create({
      data: {
        characterId,
        prompt,
        purpose,
        renderSpec: visualSpec({ ...character, profile }),
      },
    });
    try {
      const queued = await queueImage(character, prompt);
      return await db.imageJob.update({
        where: { id: job.id },
        data: {
          promptId: queued.promptId,
          serverUrl: queued.serverUrl,
          metadata: queued.metadata,
          status: "running",
        },
        select: { id: true, status: true, error: true, purpose: true },
      });
    } catch (error) {
      await db.imageJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          error:
            error instanceof ApiError
              ? error.message
              : "Image generation failed.",
        },
      });
      throw error;
    }
  });
}
export function isImageRequest(content: string) {
  return /\b(skicka|visa|generera|rita|gör|send|show|generate|create|draw|take)\b[\s\S]{0,100}\b(bild|foto|photo|picture|image|selfie)\b/iu.test(
    content,
  );
}
