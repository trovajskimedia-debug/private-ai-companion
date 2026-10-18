"use client";
import {
  profileSections,
  relationshipRoles,
  roleLabels,
  type CharacterProfile,
} from "@/lib/profile";
export function ProfileFields({
  section,
  profile,
  onChange,
}: {
  section: string;
  profile: CharacterProfile;
  onChange: (value: CharacterProfile) => void;
}) {
  const group = profileSections.find((item) => item.id === section);
  if (!group) return null;
  const set = (key: keyof CharacterProfile, value: string) =>
    onChange({ ...profile, [key]: value });
  return (
    <div className="profile-fields">
      <h2>{group.title}</h2>
      <p className="section-description">{group.description}</p>
      {(section === "identity" || section === "relationship") && (
        <>
          <label>
            Relationship role
            <select
              value={profile.relationshipRole}
              onChange={(e) => set("relationshipRole", e.target.value)}
            >
              {relationshipRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Custom relationship role
            <input
              value={profile.customRole}
              onChange={(e) => set("customRole", e.target.value)}
              maxLength={1500}
              placeholder="For example: old friend, colleague, adult sibling…"
            />
            <small>
              Family roles, including custom family titles, are always strictly
              non-sexual.
            </small>
          </label>
        </>
      )}
      {group.fields.map((field) => (
        <label key={field.key}>
          {field.label}
          {field.long ? (
            <textarea
              rows={field.key === "backstory" ? 10 : 7}
              maxLength={
                field.key === "backstory"
                  ? 12000
                  : field.key === "personalityDescription"
                    ? 8000
                    : 3000
              }
              value={String(profile[field.key])}
              onChange={(e) => set(field.key, e.target.value)}
            />
          ) : (
            <textarea
              rows={field.private ? 4 : 2}
              maxLength={1500}
              value={String(profile[field.key])}
              onChange={(e) => set(field.key, e.target.value)}
            />
          )}{" "}
          {field.private && (
            <small>
              Stored locally. Included in your character context sent to your
              configured Ollama service, never in image prompts.
            </small>
          )}
        </label>
      ))}
      {section === "conversation" && (
        <div className="two-fields">
          <label>
            Usual response length
            <select
              value={profile.responseLength}
              onChange={(e) => set("responseLength", e.target.value)}
            >
              <option value="short">Short</option>
              <option value="balanced">Balanced</option>
              <option value="detailed">Detailed</option>
            </select>
          </label>
          <label>
            Emoji use
            <select
              value={profile.emojiUse}
              onChange={(e) => set("emojiUse", e.target.value)}
            >
              <option value="never">Never</option>
              <option value="sparingly">Sparingly</option>
              <option value="often">Often</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
