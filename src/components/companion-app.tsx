"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Heart,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Plus,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { Character, Services, View } from "@/lib/types";
import { api } from "@/lib/client";
import { connectionProgress, relationshipLevel } from "@/lib/relationship";
import { Avatar } from "./avatar";
import { Flower } from "./flower";
import { Studio } from "./studio";
import { ComfySettingsPanel } from "./comfy-settings-panel";
import { relationshipRoles, roleLabels } from "@/lib/profile";
import { Chat } from "./chat";

const navigation = [
  { id: "companions", label: "My companions", icon: Users },
  { id: "studio", label: "Character studio", icon: SlidersHorizontal },
  { id: "wardrobe", label: "Wardrobe", icon: Sparkles },
  { id: "relationships", label: "Relationships", icon: Heart },
  { id: "chat", label: "Private chat", icon: MessageCircle },
] as const;

export function CompanionApp() {
  const [session, setSession] = useState<{
    authenticated: boolean;
    setupRequired: boolean;
  } | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState<View>("companions");
  const [editing, setEditing] = useState<Character | null>(null);
  const [services, setServices] = useState<Services | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const selected = characters.find((c) => c.id === selectedId) || characters[0];

  const checkSession = useCallback(async () => {
    try {
      setError("");
      setSession(await api("/api/session"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  const refreshServices = useCallback(async () => {
    setRefreshing(true);
    try {
      setServices(await api("/api/services"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    void checkSession();
  }, [checkSession]);
  useEffect(() => {
    if (!session?.authenticated) return;
    let active = true;
    api<Character[]>("/api/characters")
      .then((data) => {
        if (active) setCharacters(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    void refreshServices();
    return () => {
      active = false;
    };
  }, [session?.authenticated, refreshServices]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  function updated(character: Character) {
    setCharacters((prev) =>
      prev.some((c) => c.id === character.id)
        ? prev.map((c) => (c.id === character.id ? character : c))
        : [...prev, character],
    );
    setSelectedId(character.id);
  }
  function create() {
    setEditing(null);
    setView("studio");
  }
  function edit(character: Character) {
    setEditing(character);
    setSelectedId(character.id);
    setView("studio");
  }
  async function lock() {
    try {
      await api("/api/session", { method: "DELETE" });
      setCharacters([]);
      setSession({ authenticated: false, setupRequired: false });
      setView("companions");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove(character: Character) {
    if (
      !window.confirm(
        `Delete ${character.name} and all their conversations? This cannot be undone.`,
      )
    )
      return;
    try {
      await api(`/api/characters/${character.id}`, { method: "DELETE" });
      setCharacters((prev) => prev.filter((c) => c.id !== character.id));
      setNotice("Companion deleted.");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading)
    return (
      <main className="gate">
        <LoaderCircle className="spin" aria-label="Loading your space" />
      </main>
    );
  if (!session)
    return (
      <main className="gate">
        <div className="gate-card">
          <h1>Your space is taking a moment.</h1>
          <p role="alert">{error}</p>
          <button className="button primary" onClick={checkSession}>
            Try again
          </button>
        </div>
      </main>
    );
  if (!session.authenticated)
    return (
      <Gate
        setup={session.setupRequired}
        onUnlock={() => {
          setSession({ authenticated: true, setupRequired: false });
          setError("");
        }}
      />
    );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => setView("companions")}
          aria-label="PrivateCompanion home"
        >
          <span className="brand-icon">
            <Sparkles size={21} />
          </span>
          <span>
            private<span className="brand-light">companion</span>
            <small>A SPACE FOR CONNECTION</small>
          </span>
        </button>
        <div className="workspace-label">
          <span className="tiny-orb" /> Your personal space{" "}
          <ChevronDown size={13} />
        </div>
        <span className="nav-label">YOUR WORLD</span>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => {
                setView(id);
                if (id === "studio") setEditing(selected || null);
              }}
            >
              <Icon size={18} strokeWidth={1.7} />
              {label}
              {id === "companions" && (
                <span className="nav-count">{characters.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <div className="privacy-icon">
              <ShieldCheck size={20} />
            </div>
            <strong>Just between us.</strong>
            <p>Your companions. Your conversations. Your space.</p>
            <span>
              <span className="status-dot" /> Stored on your server
            </span>
          </div>
          <button
            className={`nav-item ${view === "settings" ? "active" : ""}`}
            onClick={() => setView("settings")}
          >
            <Settings2 size={18} /> Settings & integrations
          </button>
          <button className="profile" onClick={lock}>
            <span className="user-avatar">Y</span>
            <span>
              <strong>Your private space</strong>
              <small>Lock & sign out</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            Your space <ChevronRight size={13} />
            <strong>
              {view === "settings"
                ? "Settings"
                : navigation.find((n) => n.id === view)?.label}
            </strong>
          </span>
          <button className="private-badge" onClick={() => setView("settings")}>
            <LockKeyhole size={13} /> Private by design
          </button>
        </header>
        <main className={`content ${view === "chat" ? "chat-content" : ""}`}>
          {error && (
            <div className="alert" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={17} />
              </button>
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              <Check size={16} />
              {notice}
            </div>
          )}
          {view === "companions" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span /> A LITTLE CONNECTION, EVERY DAY
                  </div>
                  <h1>
                    A world that feels like you<span>.</span>
                  </h1>
                  <p>
                    Create a companion. Share a thought. Make a little space for
                    yourself.
                  </p>
                </div>
                <button className="button primary" onClick={create}>
                  <Plus size={17} /> Create companion
                </button>
              </div>
              <section className="hero">
                <div className="hero-copy">
                  <span className="pill">
                    <Sparkles size={12} /> IMAGINED BY YOU
                  </span>
                  <h2>
                    Good company,
                    <br />
                    <em>on your terms.</em>
                  </h2>
                  <p>
                    A familiar face. A fresh perspective. A conversation
                    <br className="desktop" /> that goes wherever you want it
                    to.
                  </p>
                  <button className="button dark" onClick={create}>
                    Bring someone to life <ArrowRight size={16} />
                  </button>
                  <span className="hero-footnote">
                    <ShieldCheck size={12} /> Personal. Thoughtful. Entirely
                    yours.
                  </span>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <Flower className="hero-flower flower-one" />
                  <Flower className="hero-flower flower-two" />
                  <div className="floating-note note-one">
                    <Heart size={15} /> A little more understood.
                  </div>
                  <div className="hero-portrait">
                    <Avatar
                      character={
                        characters[0] || {
                          name: "Alma",
                          age: 28,
                          bio: "",
                          personality: "",
                          interests: "",
                          avatar: "sage",
                          skinColor: "#d4a484",
                          hairColor: "#342720",
                          hairStyle: "long",
                          height: 168,
                          build: 45,
                          curves: 50,
                          outfit: "yoga",
                          outfitColor: "#747e63",
                          topColor: "#efe9db",
                        }
                      }
                    />
                  </div>
                  <div className="floating-note note-two">
                    <span className="note-spark">
                      <Sparkles size={15} />
                    </span>
                    <div>
                      Made for your world
                      <small>One conversation at a time</small>
                    </div>
                  </div>
                </div>
              </section>
              <div className="feature-strip">
                <div>
                  <span className="feature-icon green">
                    <Users size={18} />
                  </span>
                  <span>
                    <strong>{characters.length} unique companions</strong>
                    <small>Each with a world of their own</small>
                  </span>
                </div>
                <div>
                  <span className="feature-icon pink">
                    <Heart size={18} />
                  </span>
                  <span>
                    <strong>Connections that grow</strong>
                    <small>At a pace that feels right</small>
                  </span>
                </div>
                <div>
                  <span className="feature-icon purple">
                    <LockKeyhole size={17} />
                  </span>
                  <span>
                    <strong>A space just for you</strong>
                    <small>Local storage. No analytics.</small>
                  </span>
                </div>
              </div>
              <section>
                <div className="section-heading">
                  <div>
                    <h2>
                      Your companions{" "}
                      <span className="count-badge">{characters.length}</span>
                    </h2>
                    <p>Different personalities. Endless possibilities.</p>
                  </div>
                  <button className="text-button" onClick={create}>
                    Meet someone new <Plus size={15} />
                  </button>
                </div>
                <div className="companion-grid">
                  {characters.map((character) => (
                    <article className="companion-card" key={character.id}>
                      <button
                        className={`card-art ${character.avatar}`}
                        onClick={() => {
                          setSelectedId(character.id);
                          setView("chat");
                        }}
                        aria-label={`Chat with ${character.name}`}
                      >
                        <Avatar character={character} />
                        <span className="card-label">
                          <span className="status-dot" />{" "}
                          {character.portraitId
                            ? "AI-generated photo"
                            : "Illustrated fallback"}
                        </span>
                        <span className="card-spark">
                          <Sparkles size={15} />
                        </span>
                      </button>
                      <div className="card-details">
                        <div className="card-name">
                          <h3>
                            {character.name}
                            <span>{character.age}</span>
                          </h3>
                          <button
                            className="icon-button"
                            onClick={() => edit(character)}
                            aria-label={`Edit ${character.name}`}
                          >
                            <SlidersHorizontal size={16} />
                          </button>
                        </div>
                        <span className="personality">
                          {character.personality}
                        </span>
                        <p>{character.bio}</p>
                        <div className="interest-tags">
                          {character.interests
                            .split(",")
                            .slice(0, 3)
                            .filter(Boolean)
                            .map((tag) => (
                              <span key={tag}>{tag.trim()}</span>
                            ))}
                        </div>
                        <div className="card-footer">
                          <span>
                            <Heart size={12} />
                            {
                              relationshipLevel(
                                character.relationship?.points || 0,
                              ).name
                            }
                          </span>
                          <button
                            onClick={() => {
                              setSelectedId(character.id);
                              setView("chat");
                            }}
                          >
                            Let’s talk <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                  <button className="create-card" onClick={create}>
                    <span>
                      <Plus size={25} strokeWidth={1.4} />
                    </span>
                    <h3>Someone, imagined by you.</h3>
                    <p>
                      A personality, a look, a connection.
                      <br />
                      Make them your own.
                    </p>
                    <strong>
                      Create a companion <ArrowRight size={14} />
                    </strong>
                  </button>
                </div>
              </section>
              <footer className="page-footer">
                <Leaf size={13} /> A little imagination. A meaningful
                connection.{" "}
                <span>All companions are fictional adults (18+).</span>
              </footer>
            </>
          )}
          {view === "studio" && (
            <Studio
              key={editing?.id || "new"}
              character={editing}
              onPersist={updated}
              onSave={(character) => {
                updated(character);
                setNotice("Your companion has been saved.");
                setView("companions");
              }}
              onCancel={() => setView("companions")}
            />
          )}
          {view === "wardrobe" && (
            <>
              <PageHeading
                eyebrow="A LOOK THAT FEELS LIKE THEM"
                title="A little self-expression."
                description="The finishing touches make all the difference."
              />
              <CompanionPicker
                characters={characters}
                selected={selected}
                onSelect={setSelectedId}
              />
              {selected ? (
                <Studio
                  key={`wardrobe-${selected.id}`}
                  wardrobeOnly
                  character={selected}
                  onPersist={updated}
                  onSave={(character) => {
                    updated(character);
                    setNotice("Wardrobe saved.");
                  }}
                  onCancel={() => setView("companions")}
                />
              ) : (
                <Empty onCreate={create} />
              )}
            </>
          )}
          {view === "relationships" && (
            <>
              <PageHeading
                eyebrow="CONNECTION, AT YOUR PACE"
                title="Small moments. Deeper connections."
                description="Your shared conversations shape a story that's yours."
              />
              <div className="relationship-grid">
                {characters.map((c) => {
                  const points = c.relationship?.points || 0;
                  const level = relationshipLevel(points);
                  return (
                    <article className="relationship-card" key={c.id}>
                      <Avatar
                        character={c}
                        compact
                        className="relation-avatar"
                      />
                      <div className="relationship-info">
                        <h2>
                          {c.name} <span>{c.age}</span>
                        </h2>
                        <span className="personality">{level.name}</span>
                        <p>
                          {c.relationship?.interactions || 0} conversations
                          shared · {points} connection points
                        </p>
                        <div className="progress-track">
                          <span
                            style={{ width: `${connectionProgress(points)}%` }}
                          />
                        </div>
                        <small>
                          {Math.max(0, level.next - points)} points to your next
                          chapter · +5 per completed exchange
                        </small>
                        <label className="field-label" htmlFor={`kind-${c.id}`}>
                          Your connection
                        </label>
                        <select
                          id={`kind-${c.id}`}
                          value={c.relationship?.kind || "friendship"}
                          onChange={async (e) => {
                            try {
                              updated(
                                await api(
                                  `/api/characters/${c.id}/relationship`,
                                  {
                                    method: "PATCH",
                                    body: JSON.stringify({
                                      kind: e.target.value,
                                    }),
                                  },
                                ),
                              );
                            } catch (error) {
                              setError((error as Error).message);
                            }
                          }}
                        >
                          {relationshipRoles.map((role) => (
                            <option key={role} value={role}>
                              {roleLabels[role]}
                            </option>
                          ))}
                        </select>
                        <button
                          className="button secondary"
                          onClick={() => {
                            setSelectedId(c.id);
                            setView("chat");
                          }}
                        >
                          <MessageCircle size={15} /> Spend some time together
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!characters.length && <Empty onCreate={create} />}
              <p className="subtle-note">
                Connection levels are a playful reflection of your chat history.
                Your companions are AI characters.
              </p>
            </>
          )}
          {view === "chat" && (
            <>
              <CompanionPicker
                characters={characters}
                selected={selected}
                onSelect={setSelectedId}
              />
              {selected ? (
                <Chat
                  key={selected.id}
                  character={selected}
                  services={services}
                  onRelationship={(relationship) =>
                    setCharacters((prev) =>
                      prev.map((c) =>
                        c.id === selected.id ? { ...c, relationship } : c,
                      ),
                    )
                  }
                />
              ) : (
                <Empty onCreate={create} />
              )}
            </>
          )}
          {view === "settings" && (
            <>
              <PageHeading
                eyebrow="YOUR SPACE, YOUR CHOICES"
                title="Make yourself at home."
                description="Connect local AI services and keep control of your data."
              />
              <ComfySettingsPanel onSaved={refreshServices} />
              <div className="settings-grid">
                <section className="panel">
                  <div className="section-heading">
                    <h2>Local AI integrations</h2>
                    <button
                      className="text-button"
                      onClick={refreshServices}
                      disabled={refreshing}
                    >
                      {refreshing && (
                        <LoaderCircle size={14} className="spin" />
                      )}
                      Check connections
                    </button>
                  </div>
                  <ServiceRow
                    title="Ollama"
                    connected={!!services?.ollama.connected}
                    description={
                      services?.ollama.connected
                        ? `Connected · ${services.ollama.model}`
                        : services?.ollama.error || "Checking connection…"
                    }
                  />
                  <div className="setup-hint">
                    <h3>Connect your own models</h3>
                    <p>
                      Configure <code>OLLAMA_BASE_URL</code>,{" "}
                      <code>OLLAMA_MODEL</code> in the server’s{" "}
                      <code>.env</code> file for Ollama. Configure ComfyUI
                      above; saved ComfyUI settings take effect immediately.
                      Full Windows steps are in the README.
                    </p>
                    <p>
                      Demo chat uses preset responses and is labeled in each
                      conversation. Images require a running ComfyUI service and
                      a compatible installed model.
                    </p>
                  </div>
                </section>
                <section className="panel">
                  <ShieldCheck className="settings-shield" size={30} />
                  <h2>Your data stays with you.</h2>
                  <p>
                    Your passphrase is hashed, and your session uses an
                    HTTP-only cookie. Chat history and profiles are stored in
                    SQLite on this server. Generated images are served only
                    after unlocking.
                  </p>
                  <p className="subtle-note">
                    Data files and backups are not encrypted at rest. Anyone
                    with server filesystem access can read them. Connected AI
                    services receive your prompts.
                  </p>
                  <button
                    className="button secondary"
                    onClick={async () => {
                      try {
                        const data = await api("/api/export");
                        const url = URL.createObjectURL(
                          new Blob([JSON.stringify(data, null, 2)], {
                            type: "application/json",
                          }),
                        );
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "private-companion-export.json";
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <ArrowDownToLine size={15} /> Export my data
                  </button>
                  <button className="button secondary" onClick={lock}>
                    <LockKeyhole size={15} /> Lock my space
                  </button>
                </section>
              </div>
              <section className="panel manage-panel">
                <h2>Manage companions</h2>
                {characters.map((c) => (
                  <div className="manage-row" key={c.id}>
                    <span>
                      {c.name}, {c.age}
                    </span>
                    <div>
                      <button className="text-button" onClick={() => edit(c)}>
                        Edit profile
                      </button>
                      <button
                        className="text-button danger"
                        onClick={() => remove(c)}
                      >
                        Delete companion
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Gate({ setup, onUnlock }: { setup: boolean; onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/session", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      onUnlock();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="gate">
      <svg
        className="gate-decoration"
        width="400"
        height="400"
        viewBox="0 0 200 200"
        aria-hidden="true"
      >
        <g fill="currentColor">
          {[0, 45, 90, 135].map((angle) => (
            <ellipse
              key={angle}
              cx="100"
              cy="100"
              rx="13"
              ry="90"
              transform={`rotate(${angle} 100 100)`}
            />
          ))}
        </g>
      </svg>
      <section className="gate-card">
        <span className="brand-icon">
          <Sparkles size={25} />
        </span>
        <div className="eyebrow">PRIVATECOMPANION</div>
        <h1>{setup ? "A space that’s yours." : "Welcome back."}</h1>
        <p>
          {setup
            ? "Thoughtful companions. Unhurried conversations. Create a passphrase to make this space your own."
            : "Your companions are right where you left them. Unlock your private space to continue."}
        </p>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="passphrase">
            {setup ? "Create a private passphrase" : "Your passphrase"}
          </label>
          <input
            id="passphrase"
            type="password"
            minLength={12}
            maxLength={200}
            required
            autoComplete={setup ? "new-password" : "current-password"}
            placeholder="At least 12 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="input-hint">
            {setup
              ? "Keep it somewhere safe. There is no email recovery."
              : "Only you hold the key."}
          </p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <LockKeyhole size={16} />
            )}
            {setup ? "Create my private space" : "Unlock my space"}
            <ArrowRight size={16} />
          </button>
        </form>
        <div className="gate-footnote">
          <ShieldCheck size={14} /> Stored on your server · No analytics
        </div>
        {setup && (
          <small className="gate-disclaimer">
            Includes three editable fictional adult companions. 18+.
          </small>
        )}
      </section>
    </main>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          <span />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}
function CompanionPicker({
  characters,
  selected,
  onSelect,
}: {
  characters: Character[];
  selected?: Character;
  onSelect: (id: string) => void;
}) {
  return characters.length ? (
    <div className="companion-picker">
      <label htmlFor="selected-companion">Your companion</label>
      <select
        id="selected-companion"
        value={selected?.id || ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        {characters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}, {c.age}
          </option>
        ))}
      </select>
    </div>
  ) : null;
}
function Empty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="empty-state">
      <Sparkles size={32} />
      <h2>Your story starts here.</h2>
      <p>Create your first companion to make this space your own.</p>
      <button className="button primary" onClick={onCreate}>
        <Plus size={16} /> Create companion
      </button>
    </div>
  );
}
function ServiceRow({
  title,
  connected,
  description,
}: {
  title: string;
  connected: boolean;
  description: string;
}) {
  return (
    <div className="service-row">
      <span className={`service-orb ${connected ? "online" : ""}`} />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className={`service-label ${connected ? "connected" : ""}`}>
        {connected ? "Ready" : "Not ready"}
      </span>
    </div>
  );
}
