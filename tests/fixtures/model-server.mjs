// Protocol fixture only. It does not perform inference or generate photographs.
import http from "node:http";
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
  "base64",
);
const jobs = new Map();
let lastChat = null;
let lastPrompt = null;
let chatCalls = 0;
const uploaded = [];
let counter = 0;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:3141");
  const json = (data, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  let body = "";
  for await (const chunk of req) body += chunk;
  if (url.pathname === "/upload/image") {
    const filename = /filename="([^"]+)"/.exec(body)?.[1] || "reference.png";
    uploaded.push(filename);
    return json({ name: filename, subfolder: "", type: "input" });
  }
  const data = body ? JSON.parse(body) : {};
  if (url.pathname === "/fixture/requests")
    return json({ lastChat, lastPrompt, chatCalls });
  if (url.pathname === "/object_info")
    return json({
      UNETLoader: {
        input: {
          required: {
            unet_name: [["z_image_turbo_bf16.safetensors"]],
            weight_dtype: [["default"]],
          },
        },
        output: ["MODEL"],
      },
      CLIPLoader: {
        input: {
          required: {
            clip_name: [["qwen_3_4b.safetensors"]],
            type: [["lumina2"]],
            device: [["default", "cpu"]],
          },
        },
        output: ["CLIP"],
      },
      VAEDecode: {
        input: { required: { samples: ["LATENT"], vae: ["VAE"] } },
        output: ["IMAGE"],
      },
      VAELoader: {
        input: { required: { vae_name: [["ae.safetensors"]] } },
        output: ["VAE"],
      },
      CLIPTextEncode: {
        input: { required: { text: ["STRING"], clip: ["CLIP"] } },
        output: ["CONDITIONING"],
      },
      ConditioningZeroOut: {
        input: { required: { conditioning: ["CONDITIONING"] } },
        output: ["CONDITIONING"],
      },
      EmptySD3LatentImage: {
        input: {
          required: { width: ["INT"], height: ["INT"], batch_size: ["INT"] },
        },
        output: ["LATENT"],
      },
      ModelSamplingAuraFlow: {
        input: { required: { model: ["MODEL"], shift: ["FLOAT"] } },
        output: ["MODEL"],
      },
      KSampler: {
        input: {
          required: {
            seed: ["INT"],
            steps: ["INT"],
            cfg: ["FLOAT"],
            sampler_name: [["res_multistep"]],
            scheduler: [["simple"]],
            denoise: ["FLOAT"],
            model: ["MODEL"],
            positive: ["CONDITIONING"],
            negative: ["CONDITIONING"],
            latent_image: ["LATENT"],
          },
        },
        output: ["LATENT"],
      },
      SaveImage: {
        input: { required: { images: ["IMAGE"], filename_prefix: ["STRING"] } },
        output: [],
      },
      LoadImage: {
        input: { required: { image: [uploaded] } },
        output: ["IMAGE", "MASK"],
      },
    });
  if (url.pathname === "/api/tags")
    return json({ models: [{ name: "fixture-model" }] });
  if (url.pathname === "/api/chat") {
    lastChat = data;
    chatCalls++;
    if (data.messages?.at(-1)?.content.includes("[fail]"))
      return json({ error: "fixture failure" }, 503);
    return json({
      message: {
        role: "assistant",
        content: "A reply from the Ollama protocol fixture.",
      },
    });
  }
  if (url.pathname === "/system_stats")
    return json({ system: { os: "fixture" } });
  if (url.pathname === "/prompt") {
    lastPrompt = data;
    if (
      !Object.values(data.prompt || {}).some(
        (node) => node.class_type === "SaveImage",
      )
    )
      return json({ error: "missing SaveImage" }, 400);
    const id = `fixture-${++counter}`;
    jobs.set(id, {
      failed: JSON.stringify(data.prompt).includes("[execution-error]"),
      polls: 0,
    });
    return json({ prompt_id: id });
  }
  if (url.pathname.startsWith("/history/")) {
    const id = url.pathname.split("/").at(-1);
    const job = jobs.get(id);
    if (!job) return json({});
    if (job.failed)
      return json({
        [id]: { status: { completed: true, status_str: "error" } },
      });
    if (++job.polls === 1) return json({});
    return json({
      [id]: {
        status: { completed: true, status_str: "success" },
        outputs: {
          7: {
            images: [
              { filename: "fixture.png", subfolder: "", type: "output" },
            ],
          },
        },
      },
    });
  }
  if (url.pathname === "/view") {
    res.writeHead(200, { "Content-Type": "image/png" });
    return res.end(pixel);
  }
  json({ error: "not found" }, 404);
});
server.listen(3141, "127.0.0.1");
