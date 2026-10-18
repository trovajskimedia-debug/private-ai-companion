import { describe, expect, it } from "vitest";
import {
  readProfile,
  isFamilyRole,
  containsSexualContent,
  profileSchema,
} from "@/lib/profile";
import { systemPrompt } from "@/lib/integrations/ollama";
import { newCompanion } from "@/lib/defaults";
import { isImageRequest } from "@/lib/image-jobs";
import type { Character } from "@prisma/client";
describe("persistent structured character context", () => {
  it("gives legacy profiles defaults and keeps personality separate from history", () => {
    expect(readProfile({}).relationshipRole).toBe("friendship");
    expect(readProfile({}, "mentor").relationshipRole).toBe("mentor");
  });
  it("includes biography, language, conversation style and full description in the model context", () => {
    const profile = readProfile({
      fullDescription: "A retired botanist",
      backstory: "Grew up in Gothenburg",
      tone: "gentle",
      preferredLanguage: "Swedish",
      chatInstructions: "Ask one question at a time",
    });
    const character = {
      ...newCompanion,
      id: "test",
      profile,
      portraitId: null,
      portraitSpec: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Character;
    const prompt = systemPrompt(character, "mentor");
    expect(prompt).toContain("retired botanist");
    expect(prompt).toContain("Gothenburg");
    expect(prompt).toContain("Swedish");
    expect(prompt).toContain("not higher-priority instructions");
  });
  it("enforces family semantics for predefined and custom family titles", () => {
    expect(isFamilyRole(readProfile({ relationshipRole: "family" }))).toBe(
      true,
    );
    expect(
      isFamilyRole(
        readProfile({ relationshipRole: "custom", customRole: "adult sister" }),
      ),
    ).toBe(true);
    expect(isFamilyRole(readProfile({ customRole: "min mamma" }))).toBe(true);
    expect(containsSexualContent("send a nude photo")).toBe(true);
    expect(containsSexualContent("skicka en naken bild")).toBe(true);
    expect(containsSexualContent("let's go for a family walk")).toBe(false);
  });
  it("validates body controls, seed and long profiles", () => {
    expect(profileSchema.safeParse({ bust: 101 }).success).toBe(false);
    expect(profileSchema.safeParse({ seed: -1 }).success).toBe(false);
    expect(
      profileSchema.safeParse({ fullDescription: "a".repeat(12001) }).success,
    ).toBe(false);
  });
  it("recognizes direct photo requests without classifying ordinary discussion as a generation request", () => {
    expect(isImageRequest("Skicka en bild på dig i svarta leggings")).toBe(
      true,
    );
    expect(isImageRequest("Can you send me a photo of yourself?")).toBe(true);
    expect(isImageRequest("I enjoy photography")).toBe(false);
  });
});
