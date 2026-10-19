import express from "express";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "./store.js";
import { evaluateRun, ValidationError } from "./engine.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const store = createStore(
  process.env.DATABASE_PATH || resolve(root, "data/promptlens.sqlite"),
);
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "200kb" }));
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (
    req.method === "POST" &&
    req.get("origin") &&
    ![`http://${req.get("host")}`, `https://${req.get("host")}`].includes(
      req.get("origin"),
    )
  )
    return res.status(403).json({ error: "不允许跨来源请求。" });
  next();
});
const config = {
  baseUrl: process.env.MODEL_BASE_URL,
  apiKey: process.env.MODEL_API_KEY,
  model: process.env.MODEL_NAME,
};
app.get("/api/config", (_req, res) =>
  res.json({
    liveAvailable: Boolean(config.baseUrl && config.apiKey && config.model),
    model: config.model || null,
  }),
);
app.get("/api/runs", (_req, res) => res.json(store.list()));
app.get("/api/runs/:id", (req, res) => {
  const run = store.get(req.params.id);
  res.status(run ? 200 : 404).json(run || { error: "没有找到这次实验。" });
});
let busy = false;
app.post("/api/runs", async (req, res, next) => {
  if (busy)
    return res.status(429).json({ error: "已有实验运行中，请稍后重试。" });
  busy = true;
  try {
    const run = await evaluateRun(req.body, config);
    store.save(run);
    res.status(201).json(run);
  } catch (error) {
    if (error instanceof ValidationError)
      res.status(400).json({ error: error.message });
    else next(error);
  } finally {
    busy = false;
  }
});
app.use("/api", (_req, res) => res.status(404).json({ error: "接口不存在。" }));
app.use(express.static(resolve(root, "dist")));
app.get("/{*path}", (_req, res) =>
  res.sendFile(resolve(root, "dist/index.html")),
);
app.use((error, _req, res, _next) => {
  res
    .status(
      error.type === "entity.parse.failed"
        ? 400
        : error.type === "entity.too.large"
          ? 413
          : 500,
    )
    .json({
      error:
        error.type === "entity.parse.failed"
          ? "请求必须是有效 JSON。"
          : error.type === "entity.too.large"
            ? "请求内容过大。"
            : "服务发生错误，请查看服务端状态后重试。",
    });
});
const server = app.listen(
  Number(process.env.PORT || 3001),
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      `PromptLens: http://${process.env.HOST || "127.0.0.1"}:${server.address().port}`,
    ),
);
