"use client";
import { useEffect, useState, type ChangeEvent } from "react";
import { Check, LoaderCircle, Upload, FlaskConical, Save } from "lucide-react";
import { api } from "@/lib/client";
import {
  bindingOptions,
  comfySettingsSchema,
  inferBindings,
  workflowSchema,
  type ComfySettings,
  type Bindings,
  type Workflow,
} from "@/lib/comfy-workflow";

type Inspection = {
  connected: boolean;
  ready: boolean;
  issues: string[];
  models: {
    diffusion: string[];
    checkpoints: string[];
    textEncoders: string[];
    vaes: string[];
  };
};
export function ComfySettingsPanel({ onSaved }: { onSaved: () => void }) {
  const [settings, setSettings] = useState<ComfySettings | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [jsonText, setJsonText] = useState("");
  useEffect(() => {
    api<ComfySettings>("/api/settings/comfyui")
      .then((data) => {
        setSettings(data);
        setJsonText(
          data.workflow ? JSON.stringify(data.workflow, null, 2) : "",
        );
      })
      .catch((e) => setError(e.message));
  }, []);
  function change<K extends keyof ComfySettings>(
    key: K,
    value: ComfySettings[K],
  ) {
    setSettings((old) => (old ? { ...old, [key]: value } : old));
    setInspection(null);
    setNotice("");
  }
  function importGraph(value: unknown) {
    if (
      value &&
      typeof value === "object" &&
      Array.isArray((value as { nodes?: unknown }).nodes)
    )
      throw new Error(
        "This is a visual ComfyUI workflow. Open it in ComfyUI, then export API format. You can also use the official Z-Image-Turbo template button below.",
      );
    const parsed = workflowSchema.safeParse(value);
    if (!parsed.success)
      throw new Error(
        "Invalid API workflow. Export API format from ComfyUI; it must contain nodes with class_type and inputs.",
      );
    const workflow = parsed.data;
    const bindings = inferBindings(workflow);
    const importedValue = (key: "model" | "clip" | "vae") => {
      const field = bindings[key];
      const value = field ? workflow[field.nodeId].inputs[field.input] : "";
      return typeof value === "string" ? value : "";
    };
    setSettings((old) =>
      old
        ? {
            ...old,
            workflow,
            bindings,
            model: importedValue("model"),
            clip: importedValue("clip"),
            vae: importedValue("vae"),
          }
        : old,
    );
    setJsonText(JSON.stringify(workflow, null, 2));
    setInspection(null);
    setError("");
    setNotice(
      "Workflow imported. Check the prompt/model bindings, then Test connection & workflow.",
    );
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1_900_000)
        throw new Error("Workflow files must be under 1.9 MB.");
      importGraph(JSON.parse(await file.text()));
    } catch (e) {
      setError((e as Error).message);
    }
    event.target.value = "";
  }
  async function template() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{
        workflow: Workflow;
        models: { model: string; clip: string; vae: string };
      }>("/api/settings/comfyui/template");
      importGraph(data.workflow);
      setSettings((old) => (old ? { ...old, ...data.models } : old));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function perform(test: boolean) {
    if (!settings) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const config = comfySettingsSchema.parse(settings);
      if (test)
        setInspection(
          await api<Inspection>("/api/settings/comfyui/test", {
            method: "POST",
            body: JSON.stringify(config),
          }),
        );
      else {
        await api("/api/settings/comfyui", {
          method: "PUT",
          body: JSON.stringify(config),
        });
        setNotice("Settings saved locally. No restart needed.");
        onSaved();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!settings)
    return (
      <section className="panel comfy-settings">
        <h2>ComfyUI image generation</h2>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : (
          <LoaderCircle className="spin" size={20} />
        )}
      </section>
    );
  const options = settings.workflow ? bindingOptions(settings.workflow) : [];
  const labels: Record<keyof Bindings, string> = {
    prompt: "Positive prompt field",
    seed: "Seed field",
    model: "Diffusion model / checkpoint field",
    clip: "Text encoder field",
    vae: "VAE field",
    width: "Width field",
    height: "Height field",
    reference: "Reference image field (optional)",
  };
  return (
    <section className="panel comfy-settings">
      <h2>ComfyUI · real photographs</h2>
      <p className="section-description">
        Connect the ComfyUI Desktop service running on your Windows computer.
        Import your working API graph or start with the official Z-Image-Turbo
        template.
      </p>
      <label>
        ComfyUI server address
        <input
          type="url"
          value={settings.baseUrl}
          onChange={(e) => change("baseUrl", e.target.value)}
          placeholder="http://127.0.0.1:8000"
        />
        <small>
          Copy the address shown by ComfyUI Desktop. Desktop often uses port
          8000; standalone often uses 8188. This address is reached from the app
          server.
        </small>
      </label>
      <div className="settings-actions">
        <button className="button secondary" onClick={template} disabled={busy}>
          Load official Z-Image-Turbo template
        </button>
        <label className="button secondary file-button">
          <Upload size={15} />
          Import API workflow
          <input
            type="file"
            accept=".json,application/json"
            onChange={upload}
          />
        </label>
      </div>
      <p className="input-hint">
        <a href="/workflows/z-image-turbo.comfy.json" download>
          Download the official visual ComfyUI workflow
        </a>{" "}
        · Source and license are in workflows/SOURCE.md.
      </p>
      <details className="workflow-editor">
        <summary>View or paste API workflow JSON</summary>
        <textarea
          aria-label="API workflow JSON"
          rows={9}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
        />
        <button
          className="button secondary"
          onClick={() => {
            try {
              importGraph(JSON.parse(jsonText));
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Apply pasted JSON
        </button>
      </details>
      {settings.workflow && (
        <>
          <p className="workflow-summary">
            <Check size={14} />
            {Object.keys(settings.workflow).length} API nodes imported · node
            IDs are read from your graph
          </p>
          <div className="two-fields binding-grid">
            {Object.entries(labels).map(([key, label]) => {
              const target = settings.bindings[key as keyof Bindings];
              return (
                <label key={key}>
                  {label}
                  <select
                    value={
                      target
                        ? JSON.stringify([target.nodeId, target.input])
                        : ""
                    }
                    onChange={(e) => {
                      const pair = e.target.value
                        ? JSON.parse(e.target.value)
                        : null;
                      change("bindings", {
                        ...settings.bindings,
                        [key]: pair
                          ? { nodeId: pair[0], input: pair[1] }
                          : null,
                      });
                    }}
                  >
                    <option value="">
                      {key === "prompt"
                        ? "Select the positive prompt input"
                        : "Keep workflow value / unused"}
                    </option>
                    {options.map((option) => (
                      <option
                        key={JSON.stringify([option.nodeId, option.input])}
                        value={JSON.stringify([option.nodeId, option.input])}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </>
      )}
      <div className="model-fields">
        {[
          {
            key: "model",
            label: "Diffusion model / checkpoint",
            list: [
              ...(inspection?.models.diffusion || []),
              ...(inspection?.models.checkpoints || []),
            ],
          },
          {
            key: "clip",
            label: "Text encoder",
            list: inspection?.models.textEncoders || [],
          },
          { key: "vae", label: "VAE", list: inspection?.models.vaes || [] },
        ].map((item) => (
          <label key={item.key}>
            {item.label}
            <input
              list={`models-${item.key}`}
              value={settings[item.key as "model" | "clip" | "vae"]}
              onChange={(e) =>
                change(item.key as "model" | "clip" | "vae", e.target.value)
              }
              placeholder="Exact installed filename"
            />
            <datalist id={`models-${item.key}`}>
              {item.list.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
        ))}
      </div>
      <div className="two-fields">
        <label>
          Image width
          <input
            type="number"
            min={256}
            max={2048}
            step={64}
            value={settings.width}
            onChange={(e) => change("width", Number(e.target.value))}
          />
        </label>
        <label>
          Image height
          <input
            type="number"
            min={256}
            max={2048}
            step={64}
            value={settings.height}
            onChange={(e) => change("height", Number(e.target.value))}
          />
        </label>
      </div>
      <p className="input-hint">
        Start at 512 × 768 and batch size 1 on RTX 3060. GPU memory and model
        precision affect what fits. The official model also needs its Qwen text
        encoder and VAE.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="save-notice" role="status">
          {notice}
        </p>
      )}
      {inspection && (
        <div
          className={inspection.ready ? "save-notice" : "form-error"}
          role="status"
        >
          <strong>
            {inspection.ready
              ? "Connection and workflow validation passed"
              : "Configuration needs attention"}
          </strong>
          {inspection.issues.map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
          {inspection.ready && (
            <p>
              All required node types and selected model names are present.
              Generate a preview to test actual GPU execution.
            </p>
          )}
        </div>
      )}
      <div className="settings-actions">
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => perform(true)}
        >
          {busy ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <FlaskConical size={15} />
          )}
          Test connection & workflow
        </button>
        <button
          className="button primary"
          disabled={busy}
          onClick={() => perform(false)}
        >
          <Save size={15} />
          Save ComfyUI settings
        </button>
      </div>
    </section>
  );
}
