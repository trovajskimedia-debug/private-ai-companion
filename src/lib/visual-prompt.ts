import { readProfile } from "./profile";
import type { CharacterInput } from "./types";

export function visualSpec(character: CharacterInput) {
  const p = readProfile(character.profile);
  return JSON.stringify({
    name: character.name,
    age: character.age,
    height: character.height,
    build: character.build,
    curves: character.curves,
    skinColor: character.skinColor,
    hairColor: character.hairColor,
    hairStyle: character.hairStyle,
    outfit: character.outfit,
    outfitColor: character.outfitColor,
    topColor: character.topColor,
    gender: p.gender,
    genderIdentity: p.genderIdentity,
    appearanceDescription: p.appearanceDescription,
    bust: p.bust,
    waist: p.waist,
    hips: p.hips,
    butt: p.butt,
    proportions: p.proportions,
    eyeColor: p.eyeColor,
    faceShape: p.faceShape,
    facialFeatures: p.facialFeatures,
    makeup: p.makeup,
    clothingStyle: p.clothingStyle,
    environment: p.environment,
  });
}
export function portraitPrompt(character: CharacterInput, scene: string) {
  const p = readProfile(character.profile);
  const outfit =
    character.outfit === "yoga"
      ? "yoga pants / leggings and a sports top"
      : character.outfit === "dress"
        ? "a casual dress"
        : "relaxed trousers and a top";
  const size = (value: number) =>
    value < 30
      ? "small/slender"
      : value > 75
        ? "exaggerated, full"
        : value > 60
          ? "full"
          : "moderate";
  return [
    `Photorealistic photograph of one fictional adult ${p.gender || "person"}, ${character.age} years old. Clearly adult face and adult anatomy.`,
    `${character.height} cm tall, ${character.build < 35 ? "slender" : character.build > 65 ? "athletic, broad-shouldered" : "balanced build"}, ${character.curves > 65 ? "curvy figure" : "natural proportions"}.`,
    `Adult body proportions: bust ${size(p.bust)}, waist ${size(p.waist)}, hips ${size(p.hips)}, buttocks ${size(p.butt)}. ${p.proportions}`,
    `${character.hairStyle} hairstyle, hair color ${character.hairColor}, skin tone ${character.skinColor}.`,
    [
      p.eyeColor && `Eyes: ${p.eyeColor}`,
      p.faceShape && `Face shape: ${p.faceShape}`,
      p.facialFeatures && `Facial features: ${p.facialFeatures}`,
      p.makeup && `Makeup: ${p.makeup}`,
    ]
      .filter(Boolean)
      .join(". "),
    `Wearing ${outfit} in ${character.outfitColor}, top color ${character.topColor}. ${p.clothingStyle}`,
    p.appearanceDescription,
    `Scene requested by user: ${scene}. ${p.environment}`,
    /svarta?\s+(leggings|yoga|tights)/iu.test(scene)
      ? "For this image wear black leggings; this overrides the default bottoms color."
      : "Explicit clothing/color requests in the scene override outfit defaults for this image only.",
    "Realistic skin texture, natural hair, detailed face, realistic fabric, natural lighting, photographic lens, fully clothed adult. No illustration, no cartoon.",
  ]
    .filter(Boolean)
    .join("\n");
}
