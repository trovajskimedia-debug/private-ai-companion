import type { CharacterProfile } from "./profile";
export type View =
  "companions" | "studio" | "wardrobe" | "relationships" | "chat" | "settings";
export type Relationship = {
  id: string;
  kind: string;
  points: number;
  interactions: number;
  lastActivity: string;
};
export type Character = {
  id: string;
  name: string;
  age: number;
  bio: string;
  personality: string;
  interests: string;
  avatar: string;
  skinColor: string;
  hairColor: string;
  hairStyle: string;
  height: number;
  build: number;
  curves: number;
  outfit: string;
  outfitColor: string;
  topColor: string;
  profile?: CharacterProfile;
  portraitId?: string | null;
  portraitSpec?: string | null;
  relationship: Relationship | null;
};
export type CharacterInput = Omit<
  Character,
  "id" | "relationship" | "portraitId" | "portraitSpec"
>;
export type Message = {
  id: string;
  role: string;
  content: string;
  kind: string;
  imagePath: string | null;
  provider: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};
export type Services = {
  ollama: {
    connected: boolean;
    model: string;
    models: string[];
    error?: string;
  };
  comfyui: {
    connected: boolean;
    checkpointConfigured: boolean;
    ready?: boolean;
    model?: string;
    issues?: string[];
    error?: string;
  };
};
export type ImageJob = {
  id: string;
  status: string;
  error: string | null;
  purpose?: string;
  character?: Character;
};
