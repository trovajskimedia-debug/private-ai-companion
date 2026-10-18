import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ApiError, body, json, route, sameOrigin } from "@/lib/http";
import { relationshipSchema } from "@/lib/validation";
import { isFamilyRole, readProfile } from "@/lib/profile";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return route(async () => {
    sameOrigin(request);
    await requireAuth();
    const { id } = await context.params;
    const { kind } = relationshipSchema.parse(await body(request));
    const character = await db.character.findUnique({ where: { id } });
    if (!character) throw new ApiError(404, "Companion not found.");
    const profile = readProfile(character.profile);
    if (isFamilyRole(profile) && ["romantic", "spouse"].includes(kind))
      throw new ApiError(
        400,
        "Family roles are strictly non-sexual. Edit the character's family role before selecting a different relationship.",
      );
    return json(
      await db.character.update({
        where: { id },
        data: {
          profile: {
            ...profile,
            relationshipRole: kind as typeof profile.relationshipRole,
          },
          relationship: { update: { kind } },
        },
        include: { relationship: true },
      }),
    );
  });
}
