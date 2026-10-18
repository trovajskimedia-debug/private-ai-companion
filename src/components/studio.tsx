"use client";
import { useState, type FormEvent } from "react";
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
import type { Character, CharacterInput } from "@/lib/types";
import { Avatar } from "./avatar";

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
  wardrobeOnly = false,
}: {
  character: Character | null;
  onSave: (character: Character) => void;
  onCancel: () => void;
  wardrobeOnly?: boolean;
}) {
  const [draft, setDraft] = useState<CharacterInput>(
    character ? { ...character } : { ...newCompanion },
  );
  const [tab, setTab] = useState(wardrobeOnly ? "wardrobe" : "identity");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function set<K extends keyof CharacterInput>(
    key: K,
    value: CharacterInput[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = await api<Character>(
        character ? `/api/characters/${character.id}` : "/api/characters",
        { method: character ? "PATCH" : "POST", body: JSON.stringify(draft) },
      );
      onSave(saved);
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
              <Sparkles size={12} /> LIVE PREVIEW
            </span>
            <span>18+</span>
          </div>
          <Avatar character={draft} className="studio-avatar" />
          <div className="preview-caption">
            <h2>
              {draft.name || "Your companion"}
              <span>{draft.age}</span>
            </h2>
            <p>{draft.personality}</p>
            <span>
              Illustrated preview · Generated photos available in chat
            </span>
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
                { id: "identity", label: "Personality", icon: UserRound },
                {
                  id: "appearance",
                  label: "Appearance",
                  icon: SlidersHorizontal,
                },
                { id: "wardrobe", label: "Wardrobe", icon: Shirt },
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
              </>
            )}
            {tab === "appearance" && (
              <>
                <h2>A look that’s their own.</h2>
                <p className="section-description">
                  Adjust their silhouette and see the illustration change in
                  real time.
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
                        <Avatar character={{ ...draft, outfit: item.id }} />
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
              {character ? "Save changes" : "Create companion"}
            </button>
          </div>
        </section>
      </form>
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
