import { z } from "zod";
import { profileSchema, relationshipRoles } from "./profile";

const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color.");
export const characterSchema = z.object({
  name: z.string().trim().min(1).max(40),
  age: z.number().int().min(18, "Companions must be adults (18+).").max(120),
  bio: z.string().trim().min(1).max(600),
  personality: z.enum([
    "Warm & thoughtful",
    "Playful & curious",
    "Calm & grounded",
    "Bold & adventurous",
  ]),
  interests: z.string().trim().max(250),
  avatar: z.enum(["sage", "rose", "sand", "sky"]),
  skinColor: color,
  hairColor: color,
  hairStyle: z.enum(["long", "short", "bun"]),
  height: z.number().int().min(145).max(205),
  build: z.number().int().min(0).max(100),
  curves: z.number().int().min(0).max(100),
  outfit: z.enum(["yoga", "casual", "dress"]),
  outfitColor: color,
  topColor: color,
  profile: profileSchema.optional(),
});
export const chatSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  mode: z.enum(["ollama", "demo"]).default("ollama"),
  requestImages: z.boolean().default(true),
});
export const imageSchema = z.object({
  prompt: z.string().trim().min(3).max(1500),
  purpose: z.enum(["chat", "portrait"]).default("chat"),
});
export const relationshipSchema = z.object({
  kind: z.enum(relationshipRoles),
});
export const passwordSchema = z.object({
  password: z.string().min(12, "Use at least 12 characters.").max(200),
});
