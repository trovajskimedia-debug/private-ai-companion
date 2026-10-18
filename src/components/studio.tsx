"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Check,
  ChevronLeft,
  LoaderCircle,
  Palette,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from "lucide-react";
import { newCompanion } from "@/lib/defaults";
import { api } from "@/lib/client";
import type { Character, CharacterInput, ImageJob } from "@/lib/types";
import { Avatar } from "./avatar";
import { readProfile, type CharacterProfile } from "@/lib/profile";
import { visualSpec } from "@/lib/visual-prompt";
import { ProfileFields } from "./profile-fields";
import { Gallery } from "./gallery";
import { ReferencePicker } from "./reference-picker";

const clothes = [
  {
    id: "yoga",
    name: "Yoga essentials",
    description: "Yoga pants & a soft sports top",
  },
  {
    id: "casual",
    name: "Everyday ease",
    description: "Relaxed trousers & a favorite tee",
  },
  {
    id: "dress",
    name: "Sunday dress",
    description: "Something light, just because",
  },
];
const swatches = [
  "#747e63",
  "#8276ad",
  "#9c7984",
  "#333b44",
  "#b48862",
  "#a5b4bb",
  "#e5d8c5",
  "#765544",
];
export function Studio({
  character,
  onSave,
  onCancel,
  onPersist,
  wardrobeOnly = false,
}: {
  character: Character | null;
  onSave: (character: Character) => void;
  onCancel: () => void;
  onPersist?: (character: Character) => void;
  wardrobeOnly?: boolean;
}) {
  const [draft, setDraft] = useState<CharacterInput>(
    character
      ? {
          ...character,
          profile: readProfile(character.profile, character.relationship?.kind),
        }
      : { ...newCompanion, profile: readProfile(newCompanion.profile) },
  );
  const [record, setRecord] = useState<Character | null>(character);
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [galleryKey, setGalleryKey] = useState(0);
  const [previewNotice, setPreviewNotice] = useState("");
  const [scene, setScene] = useState(
    "Full-length portrait in soft window light, neutral photographic background",
  );
  const pollBusy = useRef(false);
  const [tab, setTab] = useState(wardrobeOnly ? "wardrobe" : "identity");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const profile = readProfile(draft.profile);
  const setProfile = <K extends keyof CharacterProfile>(
    key: K,
    value: CharacterProfile[K],
  ) =>
    setDraft((prev) => ({
      ...prev,
      profile: { ...readProfile(prev.profile), [key]: value },
    }));
  useEffect(() => {
    if (record?.id)
      api<ImageJob[]>(`/api/characters/${record.id}/images`)
        .then((data) =>
          setJobs((current) => [
            ...current,
            ...data.filter(
              (job) => !current.some((item) => item.id === job.id),
            ),
          ]),
        )
        .catch((e) => setError(e.message));
  }, [record?.id]);
  useEffect(() => {
    if (!jobs.length) return;
    let active = true;
    const timer = setInterval(async () => {
      if (pollBusy.current) return;
      pollBusy.current = true;
      try {
        const results = await Promise.all(
          jobs.map((job) =>
            api<ImageJob>(`/api/jobs/${job.id}`, { method: "POST" }),
          ),
        );
        if (!active) return;
        const failed = results.find((job) => job.status === "failed");
        if (failed) setError(failed.error || "Image generation failed.");
        for (const job of results)
          if (job.status === "completed") {
            if (job.character) {
              setRecord(job.character);
              onPersist?.(job.character);
            }
            setGalleryKey((key) => key + 1);
            setPreviewNotice("Your generated image has been saved locally.");
          }
        setJobs(
          results.filter(
            (job) => job.status === "running" || job.status === "queued",
          ),
        );
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        pollBusy.current = false;
      }
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [jobs, onPersist]);
  function set<K extends keyof CharacterInput>(
    key: K,
    value: CharacterInput[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }
  async function persist() {
    const saved = await api<Character>(
      record ? `/api/characters/${record.id}` : "/api/characters",
      { method: record ? "PATCH" : "POST", body: JSON.stringify(draft) },
    );
    setRecord(saved);
    onPersist?.(saved);
    return saved;
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSave(await persist());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function generatePreview() {
    setBusy(true);
    setError("");
    setPreviewNotice("");
    try {
      const saved = await persist();
      const job = await api<ImageJob>(`/api/characters/${saved.id}/images`, {
        method: "POST",
        body: JSON.stringify({ prompt: scene, purpose: "portrait" }),
      });
      setJobs([job]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!wardrobeOnly && (
        <>
          <button className="text-button back-button" onClick={onCancel}>
            <ChevronLeft size={15} /> Back to your companions
          </button>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> A LITTLE IMAGINATION GOES A LONG WAY
              </div>
              <h1>
                {character
                  ? `The little things that make ${character.name}.`
                  : "Someone, imagined by you."}
              </h1>
              <p>
                A personality, a look, a world of possibility. Start wherever
                you like.
              </p>
            </div>
          </div>
        </>
      )}
      <form onSubmit={submit} className="studio-layout">
        <aside className="preview-panel">
          <div className="preview-top">
            <span className="pill">
              <Sparkles size={12} />{" "}
              {record?.portraitId
                ? "GENERATED PORTRAIT"
                : "ILLUSTRATED FALLBACK"}
            </span>
            <span>18+</span>
          </div>
          <Avatar
            character={{ ...draft, portraitId: record?.portraitId }}
            className="studio-avatar"
          />
          <div className="preview-caption">
            <h2>
              {draft.name || "Your companion"}
              <span>{draft.age}</span>
            </h2>
            <p>{draft.personality}</p>
            <span>
              {record?.portraitId
                ? "AI-generated photograph · stored privately"
                : "Generate a real photo with your local ComfyUI workflow."}
            </span>
            {record?.portraitId &&
              record.portraitSpec !== visualSpec(draft) && (
                <p className="portrait-stale">
                  Your settings differ from this saved photo. Generate a new
                  preview to apply them.
                </p>
              )}
            <label className="preview-scene">
              Portrait scene
              <textarea
                rows={2}
                maxLength={1500}
                minLength={3}
                value={scene}
                onChange={(e) => setScene(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="button primary generate-preview"
              disabled={busy || !!jobs.length}
              onClick={generatePreview}
            >
              {busy || jobs.length ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              Generate realistic preview
            </button>
            {jobs.length > 0 && (
              <p className="preview-progress" role="status">
                ComfyUI is generating an image… The job is saved if you leave
                this page.
              </p>
            )}
            {previewNotice && (
              <p className="save-notice" role="status">
                {previewNotice}
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <small className="input-hint">
              Current character settings are saved before generation. A seed
              helps repeat a render; it does not guarantee the same face in
              every scene.
            </small>
          </div>
        </aside>
        <section className="studio-panel">
          {!wardrobeOnly && (
            <div
              className="studio-tabs"
              role="tablist"
              aria-label="Character options"
            >
              {[
                { id: "identity", label: "Basic info", icon: UserRound },
                { id: "personality", label: "Personality", icon: UserRound },
                { id: "history", label: "Backstory", icon: UserRound },
                {
                  id: "appearance",
                  label: "Appearance",
                  icon: SlidersHorizontal,
                },
                { id: "wardrobe", label: "Wardrobe", icon: Shirt },
                { id: "relationship", label: "Relationship", icon: UserRound },
                { id: "advanced", label: "Advanced", icon: SlidersHorizontal },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={tab === id ? "active" : ""}
                  onClick={() => setTab(id)}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="studio-fields">
            {tab === "identity" && (
              <>
                <h2>A personality to connect with.</h2>
                <p className="section-description">
                  The small details are where a character comes to life.
                </p>
                <div className="two-fields">
                  <label>
                    Name
                    <input
                      value={draft.name}
                      onChange={(e) => set("name", e.target.value)}
                      maxLength={40}
                      required
                    />
                  </label>
                  <label>
                    Age · adults only
                    <input
                      type="number"
                      min={18}
                      max={120}
                      value={draft.age}
                      onChange={(e) => set("age", Number(e.target.value))}
                      required
                    />
                  </label>
                </div>
                <label>
                  A little about them
                  <textarea
                    value={draft.bio}
                    onChange={(e) => set("bio", e.target.value)}
                    maxLength={600}
                    rows={4}
                    required
                  />
                </label>
                <label>
                  What lights them up?
                  <input
                    value={draft.interests}
                    onChange={(e) => set("interests", e.target.value)}
                    maxLength={250}
                    placeholder="Yoga, art, slow mornings…"
                  />
                  <small>Separate their interests with commas.</small>
                </label>
                <span className="field-label">Their energy</span>
                <div className="personality-options">
                  {[
                    "Warm & thoughtful",
                    "Playful & curious",
                    "Calm & grounded",
                    "Bold & adventurous",
                  ].map((p, index) => (
                    <button
                      type="button"
                      key={p}
                      className={`option-button ${draft.personality === p ? "selected" : ""}`}
                      aria-pressed={draft.personality === p}
                      onClick={() => set("personality", p)}
                    >
                      <span>{["☀", "✳", "❋", "↗"][index]}</span>
                      {p}
                      {draft.personality === p && <Check size={14} />}
                    </button>
                  ))}
                </div>
                <ProfileFields
                  section="identity"
                  profile={profile}
                  onChange={(value) => set("profile", value)}
                />
              </>
            )}
            {["personality", "history", "relationship"].includes(tab) && (
              <ProfileFields
                section={tab}
                profile={profile}
                onChange={(value) => set("profile", value)}
              />
            )}
            {tab === "advanced" && (
              <>
                <h2>Full character description</h2>
                <p className="section-description">
                  Write the complete character in your own words. This context
                  is kept separately from chat history.
                </p>
                <label>
                  Full character description
                  <textarea
                    rows={12}
                    maxLength={12000}
                    value={profile.fullDescription}
                    onChange={(e) =>
                      setProfile("fullDescription", e.target.value)
                    }
                  />
                </label>
                <ProfileFields
                  section="conversation"
                  profile={profile}
                  onChange={(value) => set("profile", value)}
                />
                <label>
                  Image generation seed
                  <input
                    type="number"
                    min={0}
                    max={4294967295}
                    step={1}
                    value={profile.seed}
                    onChange={(e) => setProfile("seed", Number(e.target.value))}
                  />
                </label>
                <ReferencePicker
                  characterId={record?.id}
                  selected={profile.referenceImageId}
                  onSelect={(id) => setProfile("referenceImageId", id)}
                  ensureSaved={persist}
                />
              </>
            )}
            {tab === "appearance" && (
              <>
                <h2>A look that’s their own.</h2>
                <p className="section-description">
                  Describe a fictional adult in detail. Generate a new photo to
                  apply changes to the saved portrait.
                </p>
                <Slider
                  label="Height"
                  unit="cm"
                  value={draft.height}
                  min={145}
                  max={205}
                  onChange={(v) => set("height", v)}
                />
                <Slider
                  label="Body build"
                  value={draft.build}
                  min={0}
                  max={100}
                  start="Slender"
                  end="Broad"
                  onChange={(v) => set("build", v)}
                />
                <Slider
                  label="Curves"
                  value={draft.curves}
                  min={0}
                  max={100}
                  start="Subtle"
                  end="Fuller"
                  onChange={(v) => set("curves", v)}
                />
                {(
                  [
                    { key: "bust", label: "Bust size" },
                    { key: "waist", label: "Waist" },
                    { key: "hips", label: "Hips" },
                    { key: "butt", label: "Buttocks size" },
                  ] as const
                ).map((item) => (
                  <Slider
                    key={item.key}
                    label={item.label}
                    value={profile[item.key]}
                    min={0}
                    max={100}
                    start="Subtle / slender"
                    end="Exaggerated / full"
                    onChange={(value) => setProfile(item.key, value)}
                  />
                ))}
                <label>
                  Body proportions
                  <input
                    value={profile.proportions}
                    onChange={(e) => setProfile("proportions", e.target.value)}
                    maxLength={1500}
                  />
                </label>
                <label>
                  Detailed appearance description
                  <textarea
                    aria-label="Detailed appearance description"
                    rows={7}
                    value={profile.appearanceDescription}
                    onChange={(e) =>
                      setProfile("appearanceDescription", e.target.value)
                    }
                    maxLength={4000}
                  />
                  <small>
                    Included directly in ComfyUI photo prompts. Exaggerated
                    proportions must remain clearly fictional and adult.
                  </small>
                </label>
                {(
                  [
                    { key: "eyeColor", label: "Eye color" },
                    { key: "faceShape", label: "Face shape" },
                    { key: "facialFeatures", label: "Facial features" },
                    { key: "makeup", label: "Makeup" },
                    { key: "clothingStyle", label: "Clothing style" },
                    { key: "environment", label: "Background and environment" },
                  ] as const
                ).map((item) => (
                  <label key={item.key}>
                    {item.label}
                    <input
                      value={profile[item.key]}
                      onChange={(e) => setProfile(item.key, e.target.value)}
                      maxLength={1500}
                    />
                  </label>
                ))}
                <ColorPicker
                  label="Skin tone"
                  color={draft.skinColor}
                  colors={[
                    "#f4d8bd",
                    "#efd0ad",
                    "#d4a484",
                    "#b77d59",
                    "#8c5d43",
                    "#593e30",
                  ]}
                  onChange={(v) => set("skinColor", v)}
                />
                <ColorPicker
                  label="Hair color"
                  color={draft.hairColor}
                  colors={[
                    "#251e22",
                    "#342720",
                    "#765544",
                    "#8c4b34",
                    "#c2a273",
                    "#d7cbb9",
                  ]}
                  onChange={(v) => set("hairColor", v)}
                />
                <label>
                  Hair style
                  <select
                    value={draft.hairStyle}
                    onChange={(e) => set("hairStyle", e.target.value)}
                  >
                    <option value="long">Long & flowing</option>
                    <option value="short">Soft bob</option>
                    <option value="bun">Easy updo</option>
                  </select>
                </label>
                <span className="field-label">Their backdrop</span>
                <div className="backdrop-options">
                  {["sage", "rose", "sand", "sky"].map((bg) => (
                    <button
                      type="button"
                      className={`backdrop-swatch ${bg} ${draft.avatar === bg ? "selected" : ""}`}
                      aria-label={`${bg} backdrop`}
                      aria-pressed={draft.avatar === bg}
                      key={bg}
                      onClick={() => set("avatar", bg)}
                    >
                      {draft.avatar === bg && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </>
            )}
            {tab === "wardrobe" && (
              <>
                <h2>Something that feels like them.</h2>
                <p className="section-description">
                  From a slow morning stretch to a spontaneous afternoon out.
                </p>
                <div className="outfit-options">
                  {clothes.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={draft.outfit === item.id}
                      className={`outfit-option ${draft.outfit === item.id ? "selected" : ""}`}
                      onClick={() => set("outfit", item.id)}
                    >
                      <div className="outfit-art">
                        <Avatar
                          character={{ ...draft, outfit: item.id }}
                          illustrationOnly
                        />
                      </div>
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                      {draft.outfit === item.id && (
                        <span className="outfit-check">
                          <Check size={13} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <ColorPicker
                  label={
                    draft.outfit === "dress" ? "Dress color" : "Bottoms color"
                  }
                  color={draft.outfitColor}
                  colors={swatches}
                  onChange={(v) => set("outfitColor", v)}
                />
                {draft.outfit !== "dress" && (
                  <ColorPicker
                    label="Top color"
                    color={draft.topColor}
                    colors={["#efe9db", ...swatches]}
                    onChange={(v) => set("topColor", v)}
                  />
                )}
                <div className="gentle-note">
                  <Palette size={17} />
                  <p>
                    Your wardrobe choices are included in photo prompts. Exact
                    appearance depends on your image model; the illustration is
                    a preview.
                  </p>
                </div>
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="studio-actions">
            <button
              className="button secondary"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Check size={16} />
              )}
              {record ? "Save changes" : "Create companion"}
            </button>
          </div>
        </section>
      </form>
      {record && (
        <Gallery
          characterId={record.id}
          refreshKey={galleryKey}
          onPortrait={(saved) => {
            setRecord(saved);
            onPersist?.(saved);
          }}
        />
      )}
    </>
  );
}
function Slider({
  label,
  value,
  min,
  max,
  onChange,
  unit = "%",
  start,
  end,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit?: string;
  start?: string;
  end?: string;
}) {
  return (
    <label className="slider-field">
      <span>
        {label}
        <output>
          {value}
          {unit}
        </output>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="slider-ends">
        <small>{start || `${min}${unit}`}</small>
        <small>{end || `${max}${unit}`}</small>
      </span>
    </label>
  );
}
function ColorPicker({
  label,
  color,
  colors,
  onChange,
}: {
  label: string;
  color: string;
  colors: string[];
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="color-picker">
      <legend>{label}</legend>
      <div>
        {colors.map((value) => (
          <button
            type="button"
            key={value}
            style={{ backgroundColor: value }}
            className={`color-swatch ${color === value ? "selected" : ""}`}
            aria-label={`${label} ${value}`}
            aria-pressed={color === value}
            onClick={() => onChange(value)}
          >
            {color === value && <Check size={14} />}
          </button>
        ))}
        <label className="custom-color" title="Choose a custom color">
          <Palette size={16} />
          <input
            aria-label={`Custom ${label.toLowerCase()}`}
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
        <span className="color-value">{color.toUpperCase()}</span>
      </div>
    </fieldset>
  );
}
