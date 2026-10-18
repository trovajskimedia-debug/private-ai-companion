"use client";
import { useEffect, useState } from "react";
import { Upload, LoaderCircle } from "lucide-react";
import type { Character } from "@/lib/types";
import { api } from "@/lib/client";
type Reference = { id: string; label: string };
export function ReferencePicker({
  characterId,
  selected,
  onSelect,
  ensureSaved,
}: {
  characterId?: string;
  selected: string;
  onSelect: (id: string) => void;
  ensureSaved: () => Promise<Character>;
}) {
  const [images, setImages] = useState<Reference[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (characterId)
      api<Reference[]>(`/api/characters/${characterId}/references`)
        .then(setImages)
        .catch((e) => setError(e.message));
  }, [characterId]);
  return (
    <section className="reference-picker">
      <h3>Reference images</h3>
      <p className="input-hint">
        Use fictional adult reference images you are allowed to use. Your
        workflow must have reference/identity nodes and an image input binding.
        The standard Z-Image-Turbo text-to-image template does not use reference
        images.
      </p>
      <label className="button secondary file-button">
        {busy ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          <Upload size={15} />
        )}
        Upload reference
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError("");
            try {
              const record = characterId
                ? { id: characterId }
                : await ensureSaved();
              const form = new FormData();
              form.set("image", file);
              const response = await fetch(
                `/api/characters/${record.id}/references`,
                { method: "POST", body: form },
              );
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              setImages((prev) => [data, ...prev]);
              onSelect(data.id);
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      <label>
        Selected reference
        <select value={selected} onChange={(e) => onSelect(e.target.value)}>
          <option value="">None · text-to-image only</option>
          {images.map((image) => (
            <option key={image.id} value={image.id}>
              {image.label}
            </option>
          ))}
        </select>
      </label>
      <div className="reference-thumbnails">
        {images.map((image) => (
          <button
            type="button"
            key={image.id}
            aria-pressed={selected === image.id}
            onClick={() => onSelect(image.id)}
          >
            <img src={`/api/references/${image.id}`} alt={image.label} />
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
