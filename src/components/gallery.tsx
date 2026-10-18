"use client";
import { useCallback, useEffect, useState } from "react";
import { Expand, LoaderCircle, X } from "lucide-react";
import type { Character, Message } from "@/lib/types";
import { api } from "@/lib/client";
type Page = { images: Message[]; hasMore: boolean };
export function Gallery({
  characterId,
  onPortrait,
  refreshKey = 0,
}: {
  characterId: string;
  onPortrait: (character: Character) => void;
  refreshKey?: number;
}) {
  const [images, setImages] = useState<Message[]>([]);
  const [more, setMore] = useState(false);
  const [selected, setSelected] = useState<Message | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(
    async (before?: string) => {
      setLoading(true);
      try {
        const data = await api<Page>(
          `/api/characters/${characterId}/gallery${before ? `?before=${before}` : ""}`,
        );
        setImages((old) => (before ? [...old, ...data.images] : data.images));
        setMore(data.hasMore);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [characterId],
  );
  useEffect(() => {
    void load();
  }, [load, refreshKey]);
  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selected]);
  return (
    <section className="gallery-section">
      <div className="section-heading">
        <h2>Character gallery</h2>
        <span>{images.length} saved images</span>
      </div>
      {!images.length && !loading && (
        <p className="subtle-note">
          Generated portraits and chat photos appear here. Your original image,
          prompt, seed and workflow settings are kept together.
        </p>
      )}
      <div className="gallery-grid">
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setSelected(image)}
            aria-label="Enlarge generated image"
          >
            <img
              src={`/api/images/${image.id}`}
              alt={image.content}
              loading="lazy"
            />
            <Expand size={14} />
          </button>
        ))}
      </div>
      {loading && <LoaderCircle className="spin" size={18} />}{" "}
      {more && (
        <button
          className="text-button"
          type="button"
          onClick={() => load(images.at(-1)?.id)}
        >
          Load older images
        </button>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {selected && (
        <div
          className="image-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Generated image"
          onClick={() => setSelected(null)}
        >
          <div
            className="image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close enlarged image"
              autoFocus
              onClick={() => setSelected(null)}
            >
              <X size={21} />
            </button>
            <img src={`/api/images/${selected.id}`} alt={selected.content} />
            <p>{selected.content}</p>
            <div className="settings-actions">
              <button
                className="button primary"
                type="button"
                onClick={async () => {
                  try {
                    onPortrait(
                      await api<Character>(
                        `/api/characters/${characterId}/portrait`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({ messageId: selected.id }),
                        },
                      ),
                    );
                    setSelected(null);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Use as character portrait
              </button>
              <a
                className="button secondary"
                href={`/api/images/${selected.id}`}
                download
              >
                Save image
              </a>
            </div>
            <details>
              <summary>Prompt, seed & generation settings</summary>
              <pre>{JSON.stringify(selected.metadata || {}, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
    </section>
  );
}
