import { requireAuth } from "@/lib/auth";
import { json, route, sameOrigin } from "@/lib/http";
import { resolveImageJob } from "@/lib/image-storage";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return route(async () => {
    sameOrigin(request);
    await requireAuth();
    const { id } = await context.params;
    const job = await resolveImageJob(id);
    return json({ id: job.id, status: job.status, error: job.error });
  });
}
