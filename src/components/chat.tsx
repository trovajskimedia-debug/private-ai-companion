"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Heart,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type {
  Character,
  ImageJob,
  Message,
  Relationship,
  Services,
} from "@/lib/types";
import { api } from "@/lib/client";
import { Avatar } from "./avatar";
import { relationshipLevel } from "@/lib/relationship";

type MessagesPage = { messages: Message[]; hasMore: boolean };
export function Chat({
  character,
  services,
  onRelationship,
}: {
  character: Character;
  services: Services | null;
  onRelationship: (r: Relationship) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"ollama" | "demo">(
    services?.ollama.connected ? "ollama" : "demo",
  );
  const [requestImages, setRequestImages] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showImage, setShowImage] = useState(false);
  const [prompt, setPrompt] = useState(
    "Enjoying a quiet morning in a sunlit café, warm natural light",
  );
  const [queuing, setQueuing] = useState(false);
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingPoll = useRef(false);
  const base = `/api/characters/${character.id}`;

  const reload = useCallback(async () => {
    const data = await api<MessagesPage>(`${base}/messages`);
    setMessages(data.messages);
    setHasMore(data.hasMore);
  }, [base]);
  useEffect(() => {
    let active = true;
    Promise.all([
      api<MessagesPage>(`${base}/messages`),
      api<ImageJob[]>(`${base}/images`),
    ])
      .then(([data, jobs]) => {
        if (active) {
          setMessages(data.messages);
          setHasMore(data.hasMore);
          setJobs(jobs);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [base]);
  useEffect(() => {
    if (scrollRef.current && !loadingEarlier)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, sending, jobs.length, loadingEarlier]);
  useEffect(() => {
    if (!jobs.length) return;
    let active = true;
    const poll = async () => {
      if (pendingPoll.current) return;
      pendingPoll.current = true;
      try {
        const results = await Promise.all(
          jobs.map((job) =>
            api<ImageJob>(`/api/jobs/${job.id}`, { method: "POST" }),
          ),
        );
        if (!active) return;
        const failed = results.find((job) => job.status === "failed");
        if (failed) setError(failed.error || "Image generation failed.");
        setJobs(
          results.filter(
            (job) => job.status === "running" || job.status === "queued",
          ),
        );
        if (results.some((job) => job.status === "completed")) await reload();
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        pendingPoll.current = false;
      }
    };
    const timer = setInterval(() => void poll(), 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [jobs, reload]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const data = await api<{
        messages: Message[];
        relationship: Relationship;
        job?: ImageJob;
      }>(`${base}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, mode, requestImages }),
      });
      setMessages((prev) => [...prev, ...data.messages]);
      setContent("");
      onRelationship(data.relationship);
      if (data.job) setJobs((prev) => [...prev, data.job!]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  async function generate(e: FormEvent) {
    e.preventDefault();
    setQueuing(true);
    setError("");
    try {
      const job = await api<ImageJob>(`${base}/images`, {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      setJobs((prev) => [...prev, job]);
      setShowImage(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setQueuing(false);
    }
  }
  async function clear() {
    if (
      !window.confirm(
        "Permanently delete this conversation and its generated images? Connection points are kept.",
      )
    )
      return;
    try {
      await api(`${base}/messages`, { method: "DELETE" });
      setMessages([]);
      setHasMore(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function earlier() {
    setLoadingEarlier(true);
    try {
      const data = await api<MessagesPage>(
        `${base}/messages?before=${messages[0].id}`,
      );
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingEarlier(false);
    }
  }

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <Avatar character={character} compact className="chat-avatar" />
        <div>
          <h1>
            {character.name}
            <span>{character.age}</span>
          </h1>
          <p>
            <Heart size={11} />
            {relationshipLevel(character.relationship?.points || 0).name}
            <span>·</span>AI companion
          </p>
        </div>
        <button
          className="icon-button"
          onClick={clear}
          disabled={sending || !!jobs.length}
          aria-label="Clear conversation"
        >
          <Trash2 size={17} />
        </button>
      </header>
      <div className="chat-mode">
        <span>
          <ShieldCheck size={13} />
          Your conversation stays on your server
          {mode === "ollama" ? " and your Ollama service" : ""}.
        </span>
        <label>
          Reply mode
          <select
            aria-label="Reply mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as "ollama" | "demo")}
            disabled={sending}
          >
            <option value="demo">Demo · preset responses</option>
            <option value="ollama">
              Ollama · {services?.ollama.model || "local model"}
            </option>
          </select>
        </label>
      </div>
      <div
        className="messages"
        ref={scrollRef}
        aria-live="polite"
        aria-label="Conversation"
      >
        {loading ? (
          <div className="chat-loading">
            <LoaderCircle className="spin" size={25} />
            Opening your conversation…
          </div>
        ) : (
          <>
            {hasMore && (
              <button
                className="text-button load-earlier"
                onClick={earlier}
                disabled={loadingEarlier}
              >
                Load earlier messages
              </button>
            )}
            <div className="chat-day">
              <span />
              {messages.length ? "Your shared story" : "A fresh page"}
              <span />
            </div>
            {!messages.length && (
              <div className="empty-chat">
                <MessageCircle size={27} />
                <p>A little hello can be the start of something lovely.</p>
              </div>
            )}
            {messages.map((message) => (
              <div
                className={`message-row ${message.role === "user" ? "outgoing" : "incoming"}`}
                key={message.id}
              >
                {message.role !== "user" && (
                  <Avatar
                    character={character}
                    compact
                    className="message-avatar"
                  />
                )}
                <div className="message-wrap">
                  <span className="message-author">
                    {message.role === "user" ? "You" : character.name}
                    {message.provider === "demo" && (
                      <span className="demo-tag">Demo response</span>
                    )}
                    {message.provider === "ollama" && (
                      <span className="demo-tag">Ollama</span>
                    )}
                  </span>
                  <div
                    className={`message-bubble ${message.kind === "image" ? "image-bubble" : ""}`}
                  >
                    {message.kind === "image" && message.imagePath && (
                      <a
                        href={`/api/images/${message.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open full-size image"
                      >
                        <img
                          src={`/api/images/${message.id}`}
                          alt={`${character.name}: ${message.content}`}
                          loading="lazy"
                        />
                      </a>
                    )}
                    <p>{message.content}</p>
                    {message.kind === "image" && (
                      <small>
                        <Sparkles size={11} />
                        AI-generated with ComfyUI
                      </small>
                    )}
                  </div>
                  <time className="message-time" dateTime={message.createdAt}>
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              </div>
            ))}
            {sending && (
              <>
                <div className="message-row outgoing">
                  <div className="message-wrap">
                    <span className="message-author">You</span>
                    <div className="message-bubble">
                      <p>{content}</p>
                    </div>
                  </div>
                </div>
                <div className="typing-indicator" role="status">
                  <span />
                  <span />
                  <span />
                  <small>
                    {character.name} is thinking
                    {mode === "demo" ? " · demo" : ""}
                  </small>
                </div>
              </>
            )}
            {jobs.length > 0 && (
              <div className="image-progress" role="status">
                <LoaderCircle size={18} className="spin" />
                <span>
                  ComfyUI is creating your image…
                  <small>
                    You can keep chatting. This job is saved if you leave the
                    page.
                  </small>
                </span>
              </div>
            )}
          </>
        )}
      </div>
      {error && (
        <div className="alert chat-alert" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {showImage && (
        <form className="image-prompt" onSubmit={generate}>
          <div>
            <strong>
              <Sparkles size={14} /> Imagine a moment
            </strong>
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowImage(false)}
              aria-label="Close image prompt"
            >
              <X size={15} />
            </button>
          </div>
          <p>
            Their current appearance and outfit are included automatically.
            Photos may vary between generations.
          </p>
          <label htmlFor="image-scene">Describe the scene</label>
          <textarea
            id="image-scene"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            minLength={3}
            maxLength={1500}
            required
            rows={2}
          />
          <button
            className="button primary"
            disabled={queuing || !!jobs.length}
          >
            {queuing ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <ImagePlus size={15} />
            )}
            Generate with ComfyUI
          </button>
          {!services?.comfyui.ready && (
            <small>
              ComfyUI needs a running service and a validated API workflow with
              installed models. Configure it in Settings & integrations.
            </small>
          )}
        </form>
      )}
      <form className="composer" onSubmit={send}>
        <div className="composer-input">
          <textarea
            aria-label={`Message ${character.name}`}
            placeholder={`Share a thought with ${character.name}…`}
            value={content}
            maxLength={4000}
            onChange={(e) => setContent(e.target.value)}
            disabled={sending || loading}
            rows={2}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="composer-tools">
            <button
              type="button"
              className={`image-tool ${showImage ? "active" : ""}`}
              onClick={() => setShowImage((prev) => !prev)}
            >
              <ImagePlus size={17} />
              <span>Imagine a photo</span>
            </button>
            <button
              className="send-button"
              aria-label="Send message"
              disabled={sending || loading || !content.trim()}
            >
              {sending ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Send size={17} />
              )}
            </button>
          </div>
        </div>
        <label className="image-request-toggle">
          <input
            type="checkbox"
            checked={requestImages}
            onChange={(e) => setRequestImages(e.target.checked)}
          />
          Generate photos for requests like “Skicka en bild på dig i svarta
          leggings”
        </label>
        <div className="composer-hint">
          <span>
            <LockIcon />
            Just for you and {character.name}.
          </span>
          <span>
            {mode === "demo"
              ? "Demo mode · preset replies, no AI model"
              : "AI-generated replies may be inaccurate."}
          </span>
        </div>
      </form>
    </section>
  );
}
function LockIcon() {
  return <ShieldCheck size={11} />;
}
