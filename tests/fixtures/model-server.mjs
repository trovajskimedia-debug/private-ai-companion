// Protocol fixture only. It does not perform inference or generate photographs.
import http from "node:http";
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
  "base64",
);
const jobs = new Map();
let counter = 0;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:3141");
  const json = (data, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  let body = "";
  for await (const chunk of req) body += chunk;
  const data = body ? JSON.parse(body) : {};
  if (url.pathname === "/api/tags")
    return json({ models: [{ name: "fixture-model" }] });
  if (url.pathname === "/api/chat") {
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
