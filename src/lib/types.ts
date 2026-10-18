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
  relationship: Relationship | null;
};
export type CharacterInput = Omit<Character, "id" | "relationship">;
export type Message = {
  id: string;
  role: string;
  content: string;
  kind: string;
  imagePath: string | null;
  provider: string;
  createdAt: string;
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
    error?: string;
  };
};
export type ImageJob = { id: string; status: string; error: string | null };
