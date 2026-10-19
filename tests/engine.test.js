import test from "node:test";
import assert from "node:assert/strict";
import {
  validateRun,
  renderPrompt,
  checkOutput,
  evaluateRun,
  ValidationError,
} from "../server/engine.js";
import { createStore } from "../server/store.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const body = () => ({
  name: "Test",
  mode: "demo",
  prompts: ["A: {{input}}", "B: {{input}}"],
  cases: [{ input: "很好用", keyword: "", json: true }],
});
test("validation rejects malformed runs and strips extra fields", () => {
  for (const invalid of [
    null,
    {},
    { ...body(), mode: "other" },
    { ...body(), name: "" },
    { ...body(), prompts: [""] },
    { ...body(), cases: [] },
    { ...body(), cases: Array(13).fill(body().cases[0]) },
    { ...body(), cases: [{ input: "x", keyword: 1, json: false }] },
    { ...body(), prompts: ["x".repeat(12001), "B"] },
  ])
    assert.throws(() => validateRun(invalid), ValidationError);
  assert.equal(validateRun({ ...body(), apiKey: "secret" }).apiKey, undefined);
});
test("substitution preserves literal input and supports missing/multiple placeholders", () => {
  assert.equal(renderPrompt("{{input}} / {{input}}", "$&"), "$& / $&");
  assert.equal(renderPrompt("Classify", "hello"), "Classify\n\nhello");
});
test("checks distinguish strict JSON, substring matches and no rules", () => {
  assert.deepEqual(
    checkOutput('{"answer":"YES"}', { keyword: "yes", json: true }).map(
      (c) => c.passed,
    ),
    [true, true],
  );
  assert.deepEqual(
    checkOutput("```json\n{}\n```", { keyword: "", json: true }).map(
      (c) => c.passed,
    ),
    [false],
  );
  assert.deepEqual(checkOutput("anything", { keyword: "", json: false }), []);
  assert.equal(
    checkOutput("no", { keyword: "yes", json: false })[0].passed,
    false,
  );
});
test("demo produces labeled deterministic fixtures with no invented tokens", async () => {
  const run = await evaluateRun(body());
  assert.equal(run.model, "Offline fixtures");
  assert.equal(run.results.length, 2);
  assert.equal(run.results[0].checks[0].passed, false);
  assert.equal(run.results[1].checks[0].passed, true);
  assert.equal(run.results[1].tokens, null);
  const edited = await evaluateRun({
    ...body(),
    prompts: ["Different", "Completely different"],
  });
  assert.equal(edited.results[1].output, run.results[1].output);
});
test("live provider receives substituted input and credentials but run never includes key", async () => {
  const requests = [];
  const fakeFetch = async (url, init) => {
    requests.push({ url, init });
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { total_tokens: 42 },
      }),
    };
  };
  const run = await evaluateRun(
    { ...body(), mode: "live" },
    {
      baseUrl: "https://example.test/v1/",
      apiKey: "top-secret",
      model: "test-model",
    },
    fakeFetch,
  );
  assert.equal(requests[0].url, "https://example.test/v1/chat/completions");
  assert.equal(
    JSON.parse(requests[0].init.body).messages[0].content,
    "A: 很好用",
  );
  assert.equal(requests[0].init.headers.Authorization, "Bearer top-secret");
  assert.equal(run.results[0].tokens, 42);
  assert.equal(JSON.stringify(run).includes("top-secret"), false);
});
test("live mode refuses incomplete config", async () => {
  await assert.rejects(
    evaluateRun({ ...body(), mode: "live" }),
    ValidationError,
  );
});
test("provider failures are isolated and sensitive errors are sanitized", async () => {
  let count = 0;
  const fakeFetch = async () => {
    count++;
    if (count === 1) throw new Error("secret-key from provider");
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: "{}" } }] }),
    };
  };
  const run = await evaluateRun(
    { ...body(), mode: "live" },
    { baseUrl: "https://example.test", apiKey: "secret", model: "test" },
    fakeFetch,
  );
  assert.ok(run.results[0].error);
  assert.equal(run.results[1].error, null);
  assert.equal(run.results[1].tokens, null);
  assert.equal(JSON.stringify(run).includes("secret-key"), false);
});
test("HTTP, timeout and malformed provider responses are recorded as errors", async () => {
  for (const fetcher of [
    async () => ({ ok: false, status: 401 }),
    async () => {
      throw new DOMException("timeout", "TimeoutError");
    },
    async () => ({ ok: true, json: async () => ({ choices: [] }) }),
  ]) {
    const run = await evaluateRun(
      { ...body(), mode: "live" },
      { baseUrl: "https://example.test", apiKey: "secret", model: "test" },
      fetcher,
    );
    assert.ok(
      run.results.every((r) => r.error && r.output === "" && r.tokens === null),
    );
  }
});
test("at most two calls run concurrently and results stay in matrix order", async () => {
  let active = 0,
    peak = 0;
  const fetcher = async () => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 5));
    active--;
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: "{}" } }] }),
    };
  };
  const run = await evaluateRun(
    { ...body(), mode: "live", cases: Array(5).fill(body().cases[0]) },
    { baseUrl: "https://example.test", apiKey: "x", model: "m" },
    fetcher,
  );
  assert.equal(peak, 2);
  assert.deepEqual(
    run.results.map((r) => `${r.caseIndex}-${r.variant}`),
    ["0-0", "0-1", "1-0", "1-1", "2-0", "2-1", "3-0", "3-1", "4-0", "4-1"],
  );
});
test("SQLite survives reopening and caps history at 50", () => {
  const dir = mkdtempSync(join(tmpdir(), "promptlens-"));
  const path = join(dir, "runs.sqlite");
  let store = createStore(path);
  try {
    for (let i = 0; i < 52; i++)
      store.save({
        ...body(),
        id: String(i),
        createdAt: new Date(1700000000000 + i * 1000).toISOString(),
        results: [],
      });
    store.close();
    store = createStore(path);
    assert.equal(store.list().length, 50);
    assert.equal(store.list()[0].id, "51");
    assert.equal(store.get("0"), null);
    assert.equal(store.get("51").name, "Test");
  } finally {
    store.close();
    rmSync(dir, { recursive: true });
  }
});
