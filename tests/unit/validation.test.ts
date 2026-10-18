import { describe, expect, it } from "vitest";
import { characterSchema, chatSchema } from "@/lib/validation";
import { newCompanion } from "@/lib/defaults";
import { connectionProgress, relationshipLevel } from "@/lib/relationship";

describe("character boundaries", () => {
  it("accepts an adult with valid sliders and hex wardrobe colors", () => {
    expect(
      characterSchema.parse({
        ...newCompanion,
        age: 18,
        outfit: "yoga",
        outfitColor: "#112233",
        height: 205,
      }).age,
    ).toBe(18);
  });
  it.each([
    { age: 17 },
    { build: 101 },
    { curves: -1 },
    { height: 230 },
    { outfitColor: "url(evil)" },
    { name: " " },
    { age: 26.5 },
  ])("rejects invalid input %j", (override) => {
    expect(
      characterSchema.safeParse({ ...newCompanion, ...override }).success,
    ).toBe(false);
  });
  it("rejects empty and oversized messages", () => {
    expect(chatSchema.safeParse({ content: "   " }).success).toBe(false);
    expect(chatSchema.safeParse({ content: "x".repeat(4001) }).success).toBe(
      false,
    );
  });
});
describe("relationship progression", () => {
  it("advances at the documented boundaries and starts the next progress bar", () => {
    expect(relationshipLevel(24).name).toBe("A new beginning");
    expect(relationshipLevel(25).name).toBe("Getting closer");
    expect(relationshipLevel(80).name).toBe("Close companions");
    expect(relationshipLevel(200).name).toBe("Deep connection");
    expect(connectionProgress(25)).toBe(0);
    expect(connectionProgress(1000)).toBe(100);
  });
});
