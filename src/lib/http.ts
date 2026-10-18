import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function route(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ZodError)
      return json({ error: error.issues[0]?.message ?? "Invalid input." }, 400);
    if (error instanceof ApiError)
      return json({ error: error.message }, error.status);
    // Never log request contents, model responses, passwords, or database parameters.
    console.error(
      "Request failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}

export async function body(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 24_000)
    throw new ApiError(413, "Request is too large.");
  const text = await request.text();
  if (text.length > 24_000) throw new ApiError(413, "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "Invalid JSON.");
  }
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  // Next's Node server may normalize request.url to localhost. The Host header
  // preserves the browser-facing authority; browsers cannot override it.
  let source: URL;
  try {
    source = new URL(origin);
  } catch {
    throw new ApiError(403, "Cross-site requests are not allowed.");
  }
  const authority = request.headers.get("host") || new URL(request.url).host;
  const protocol =
    process.env.COOKIE_SECURE === "true"
      ? "https:"
      : new URL(request.url).protocol;
  if (
    !/^https?:$/.test(source.protocol) ||
    source.host !== authority ||
    source.protocol !== protocol
  )
    throw new ApiError(403, "Cross-site requests are not allowed.");
}
