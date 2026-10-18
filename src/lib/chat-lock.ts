import { ApiError } from "./http";
const active = new Set<string>();
export async function withChatLock<T>(
  id: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (active.has(id))
    throw new ApiError(409, "A reply is already being written. Please wait.");
  active.add(id);
  try {
    return await fn();
  } finally {
    active.delete(id);
  }
}
