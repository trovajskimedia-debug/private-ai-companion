import { z } from "zod";

export const relationshipRoles = [
  "friendship",
  "romantic",
  "spouse",
  "colleague",
  "mentor",
  "family",
  "creative",
  "custom",
] as const;
export const roleLabels: Record<string, string> = {
  friendship: "Friend",
  romantic: "Partner",
  spouse: "Spouse",
  colleague: "Colleague",
  mentor: "Mentor",
  family: "Family member · strictly non-sexual",
  creative: "Creative partnership",
  custom: "Custom role",
};
const text = z.string().trim().max(1500).default("");
export const profileSchema = z
  .object({
    gender: text,
    genderIdentity: text,
    pronouns: text,
    nationality: text,
    culturalBackground: text,
    languages: text,
    occupation: text,
    relationshipRole: z.enum(relationshipRoles).default("friendship"),
    customRole: text,
    personalityDescription: z.string().trim().max(8000).default(""),
    traits: text,
    temperament: text,
    humor: text,
    socialStyle: text,
    hobbies: text,
    values: text,
    strengthsWeaknesses: text,
    fearsInsecurities: text,
    habitsQuirks: text,
    situationalReactions: text,
    careStyle: text,
    likesDislikes: text,
    backstory: z.string().trim().max(12000).default(""),
    upbringing: text,
    familyRelationships: text,
    lifeEvents: text,
    educationWork: text,
    dreamsGoals: text,
    hometown: text,
    currentHome: text,
    privateDetails: text,
    howTheyKnowUser: text,
    relationshipHistory: text,
    addressUser: text,
    behaviorTowardUser: text,
    closeness: text,
    boundaries: text,
    conversationStyle: text,
    preferredLanguage: text,
    responseLength: z
      .enum(["short", "balanced", "detailed"])
      .default("balanced"),
    appearanceDescription: z.string().trim().max(4000).default(""),
    fullDescription: z.string().trim().max(12000).default(""),
    tone: text,
    vocabulary: text,
    emojiUse: z.enum(["never", "sparingly", "often"]).default("sparingly"),
    exampleDialogue: z.string().trim().max(3000).default(""),
    chatInstructions: z.string().trim().max(3000).default(""),
    proportions: text,
    bust: z.number().int().min(0).max(100).default(50),
    waist: z.number().int().min(0).max(100).default(50),
    hips: z.number().int().min(0).max(100).default(50),
    butt: z.number().int().min(0).max(100).default(50),
    eyeColor: text,
    faceShape: text,
    facialFeatures: text,
    makeup: text,
    clothingStyle: text,
    environment: text,
    seed: z.number().int().min(0).max(4294967295).default(42),
    referenceImageId: z.string().max(100).default(""),
  })
  .refine(
    (value) => JSON.stringify(value).length <= 60_000,
    "Keep the complete profile under 60,000 characters.",
  );
export type CharacterProfile = z.infer<typeof profileSchema>;
export function readProfile(value: unknown, kind?: string): CharacterProfile {
  const data =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return profileSchema.parse({
    ...data,
    ...(kind &&
    relationshipRoles.includes(kind as (typeof relationshipRoles)[number])
      ? { relationshipRole: kind }
      : {}),
  });
}
const familyTerms =
  /\b(family|familj|mother|father|sister|brother|daughter|son|parent|sibling|aunt|uncle|cousin|grandmother|grandfather|mamma|pappa|mormor|morfar|farmor|farfar|syster|bror|dotter|förälder|kusin|moster|faster|morbror|farbror)\b/iu;
export function isFamilyRole(profile: CharacterProfile, kind?: string) {
  return (
    kind === "family" ||
    profile.relationshipRole === "family" ||
    familyTerms.test(profile.customRole)
  );
}
export const familyBoundaryReply =
  "Our family connection stays caring, platonic, and strictly non-sexual. We can talk, share everyday moments, or explore a different topic together.";
export function containsSexualContent(text: string) {
  return /\b(sex|sexual\w*|sexy|erotic\w*|nude\w*|naked|porn\w*|orgasm\w*|masturbat\w*|incest\w*|genital\w*|penis|vagina|fuck\w*|blowjob\w*|naken\w*|nakna|samlag|sexuell\w*|erotik\w*|kåt\w*|knulla\w*|avklädd\w*)\b/iu.test(
    text,
  );
}
export type ProfileField = {
  key: keyof CharacterProfile;
  label: string;
  long?: boolean;
  private?: boolean;
};
export const profileSections: {
  id: string;
  title: string;
  description: string;
  fields: ProfileField[];
}[] = [
  {
    id: "identity",
    title: "Basic information",
    description: "Identity, language and the role they play in your world.",
    fields: [
      { key: "gender", label: "Gender" },
      { key: "genderIdentity", label: "Gender identity" },
      { key: "pronouns", label: "Pronouns" },
      { key: "nationality", label: "Nationality" },
      { key: "culturalBackground", label: "Cultural background" },
      { key: "languages", label: "Languages" },
      { key: "occupation", label: "Occupation" },
    ],
  },
  {
    id: "personality",
    title: "Personality",
    description:
      "Go beyond a preset. Describe a complete, individual personality.",
    fields: [
      {
        key: "personalityDescription",
        label: "Full personality description",
        long: true,
      },
      { key: "traits", label: "Personality traits" },
      { key: "temperament", label: "Temperament" },
      { key: "humor", label: "Sense of humor" },
      { key: "socialStyle", label: "Social style" },
      { key: "hobbies", label: "Interests and hobbies" },
      { key: "values", label: "Values" },
      { key: "strengthsWeaknesses", label: "Strengths and weaknesses" },
      { key: "fearsInsecurities", label: "Fears and insecurities" },
      { key: "habitsQuirks", label: "Habits and quirks" },
      {
        key: "situationalReactions",
        label: "Reactions to different situations",
      },
      { key: "careStyle", label: "How they show care" },
      { key: "likesDislikes", label: "Likes and dislikes" },
    ],
  },
  {
    id: "history",
    title: "Background and life story",
    description: "The experiences, places and people that shaped them.",
    fields: [
      { key: "backstory", label: "Full life story", long: true },
      { key: "upbringing", label: "Upbringing" },
      { key: "familyRelationships", label: "Family and relationships" },
      { key: "lifeEvents", label: "Important life events" },
      { key: "educationWork", label: "Education and work" },
      { key: "dreamsGoals", label: "Dreams and goals" },
      { key: "hometown", label: "Hometown" },
      { key: "currentHome", label: "Current home" },
      {
        key: "privateDetails",
        label: "Secrets and private details",
        private: true,
      },
    ],
  },
  {
    id: "relationship",
    title: "Relationship and behavior",
    description:
      "Define your shared history, closeness and boundaries. Family roles are always non-sexual.",
    fields: [
      { key: "howTheyKnowUser", label: "How they know you" },
      { key: "relationshipHistory", label: "Your relationship history" },
      { key: "addressUser", label: "How they address you" },
      { key: "behaviorTowardUser", label: "How they behave toward you" },
      { key: "closeness", label: "How close you are" },
      { key: "boundaries", label: "Relationship boundaries and preferences" },
    ],
  },
  {
    id: "conversation",
    title: "Conversation style",
    description:
      "Optional starting settings. You can write freely in your preferred language.",
    fields: [
      { key: "conversationStyle", label: "How they speak" },
      { key: "preferredLanguage", label: "Preferred conversation language" },
      { key: "tone", label: "Tone of voice" },
      { key: "vocabulary", label: "Vocabulary and language use" },
      {
        key: "exampleDialogue",
        label: "Typical dialogue examples",
        long: true,
      },
      {
        key: "chatInstructions",
        label: "Custom chat instructions",
        long: true,
      },
    ],
  },
];
