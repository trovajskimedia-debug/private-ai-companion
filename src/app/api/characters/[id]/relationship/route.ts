import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ApiError, body, json, route, sameOrigin } from "@/lib/http";
import { relationshipSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return route(async () => {
    sameOrigin(request);
    await requireAuth();
    const { id } = await context.params;
    const { kind } = relationshipSchema.parse(await body(request));
    if (!(await db.character.findUnique({ where: { id } })))
      throw new ApiError(404, "Companion not found.");
    return json(
      await db.character.update({
        where: { id },
        data: { relationship: { update: { kind } } },
        include: { relationship: true },
      }),
    );
  });
}
