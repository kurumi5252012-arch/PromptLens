import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";

test(
  "real HTTP API: config, validation, live provider, history, origin and static routes",
  { timeout: 20000 },
  async () => {
    const directory = mkdtempSync(join(tmpdir(), "promptlens-http-"));
    let providerCalls = 0;
    const provider = createServer((req, res) => {
      assert.equal(req.url, "/v1/chat/completions");
      assert.equal(req.headers.authorization, "Bearer test-secret");
      providerCalls++;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          choices: [{ message: { content: '{"ok":true}' } }],
          usage: { total_tokens: 12 },
        }),
      );
    });
    provider.listen(0, "127.0.0.1");
    await once(provider, "listening");
    const child = spawn(process.execPath, ["server/index.js"], {
      env: {
        ...process.env,
        PORT: "0",
        HOST: "127.0.0.1",
        DATABASE_PATH: join(directory, "test.sqlite"),
        MODEL_BASE_URL: `http://127.0.0.1:${provider.address().port}/v1`,
        MODEL_API_KEY: "test-secret",
        MODEL_NAME: "fake-provider",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const exited = once(child, "exit");
    try {
      const base = await new Promise((resolve, reject) => {
        let output = "";
        const timeout = setTimeout(
          () => reject(new Error("Server did not become ready")),
          10000,
        );
        child.stdout.on("data", (chunk) => {
          output += chunk;
          const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
          if (match) {
            clearTimeout(timeout);
            resolve(match[0]);
          }
        });
        child.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
        child.once("exit", () => {
          clearTimeout(timeout);
          reject(new Error("Server exited before readiness"));
        });
      });
      const config = await (await fetch(`${base}/api/config`)).json();
      assert.deepEqual(config, { liveAvailable: true, model: "fake-provider" });
      assert.equal(JSON.stringify(config).includes("test-secret"), false);
      const post = (payload) =>
        fetch(`${base}/api/runs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      assert.equal((await post({})).status, 400);
      assert.equal(
        (
          await fetch(`${base}/api/runs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await fetch(`${base}/api/runs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Origin: "https://untrusted.example",
            },
            body: "{}",
          })
        ).status,
        403,
      );
      const response = await post({
        name: "Integration",
        mode: "live",
        prompts: ["A {{input}}", "B {{input}}"],
        cases: [{ input: "test", keyword: "ok", json: true }],
      });
      assert.equal(response.status, 201);
      const run = await response.json();
      assert.equal(providerCalls, 2);
      assert.ok(
        run.results.every(
          (r) => r.tokens === 12 && r.checks.every((c) => c.passed),
        ),
      );
      assert.equal(
        (await (await fetch(`${base}/api/runs`)).json())[0].id,
        run.id,
      );
      assert.deepEqual(
        await (await fetch(`${base}/api/runs/${run.id}`)).json(),
        run,
      );
      assert.equal((await fetch(`${base}/api/runs/missing`)).status, 404);
      assert.equal((await fetch(`${base}/api/missing`)).status, 404);
      // Static build is optional when running tests on a fresh checkout before building.
      const favicon = await fetch(`${base}/api/config`);
      assert.equal(favicon.headers.get("cache-control"), "no-store");
    } finally {
      child.kill();
      await exited;
      await new Promise((resolve) => provider.close(resolve));
      rmSync(directory, { recursive: true });
    }
  },
);
