import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  authenticated,
  createSession,
  digest,
  hashPassword,
  SESSION_COOKIE,
  throttleLogin,
  verifyPassword,
} from "@/lib/auth";
import { ApiError, body, json, route, sameOrigin } from "@/lib/http";
import { passwordSchema } from "@/lib/validation";
import { starterCompanions } from "@/lib/defaults";

export const dynamic = "force-dynamic";
export async function GET() {
  return route(async () =>
    json({
      setupRequired: !(await db.owner.findUnique({ where: { id: "owner" } })),
      authenticated: await authenticated(),
    }),
  );
}
export async function POST(request: Request) {
  return route(async () => {
    sameOrigin(request);
    throttleLogin();
    const { password } = passwordSchema.parse(await body(request));
    const owner = await db.owner.findUnique({ where: { id: "owner" } });
    if (owner) {
      if (!(await verifyPassword(password, owner.passwordHash)))
        throw new ApiError(
          401,
          "That passphrase doesn't match. Please try again.",
        );
    } else {
      try {
        const passwordHash = await hashPassword(password);
        await db.$transaction(async (tx) => {
          await tx.owner.create({ data: { id: "owner", passwordHash } });
          for (const character of starterCompanions) {
            await tx.character.create({
              data: {
                ...character,
                relationship: { create: {} },
                messages: {
                  create: {
                    role: "assistant",
                    content: `Hi, I'm ${character.name}. It's lovely to meet you. What would you like to talk about?`,
                    provider: "welcome",
                  },
                },
              },
            });
          }
        });
      } catch {
        throw new ApiError(
          409,
          "This space has already been set up. Please unlock it.",
        );
      }
    }
    const { token, expiresAt } = await createSession();
    const response = json({ authenticated: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      expires: expiresAt,
    });
    return response;
  });
}
export async function DELETE(request: Request) {
  return route(async () => {
    sameOrigin(request);
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) await db.session.deleteMany({ where: { id: digest(token) } });
    const response = json({ ok: true });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  });
}
