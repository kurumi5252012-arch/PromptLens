# PromptLens Implementation Plan

**Goal:** Ship a portfolio-ready local prompt comparison app.

**Architecture:** React client calls a local Express API. SQLite persists run records. Environment-only model settings prevent credential disclosure.

**Tech Stack:** Node >=24.15, React, TypeScript, Vite, Express, node:sqlite, node:test.

## Global constraints
- 2 prompts, 1–12 cases, 2 workers, 45-second request timeout.
- Clearly labeled demo data; no invented tokens or quality scores.
- No credentials in client or exports; bind server to loopback by default.

## Task 1: Evaluation engine and persistence
Files: server/engine.js, server/store.js, server/index.js, tests/engine.test.js.
Interface: validateRun(body), evaluateRun(body, config), checkOutput(text, checks); GET /api/config; POST /api/runs; GET /api/runs; GET /api/runs/:id.
- [x] Add deterministic tests: JSON parsing, keyword checks, invalid payload rejection, substitution without placeholder, provider failure and storage roundtrip.
- [x] Implement validation with explicit 400 errors, demo fixtures with stable explanations, provider timeout/HTTP/format failures and concurrency limit.
- [x] Persist only completed records in SQLite; list metadata newest first, cap history at 50 runs.
- [x] Run `npm test` and verify all assertions pass.

## Task 2: Comparison workspace
Files: src/App.tsx, src/styles.css, src/main.tsx, index.html, vite.config.ts, tsconfig.json.
Interface: Run contains id, name, mode, prompts, cases, results; each result includes caseIndex, variant, output, checks, latencyMs, tokens, error.
- [x] Build labeled editors, case controls, config status, mode selector and run action.
- [x] Render results matrix, selectable response detail, history, JSON/Markdown export, recoverable errors and live region.
- [x] Run `npm run build`; exercise demo run, edit/add/remove cases, history and responsive layout in browser.

## Task 3: Release package
Files: README.md, README.zh-CN.md, .env.example, LICENSE, Dockerfile, .github/workflows/ci.yml.
- [x] Document exact setup, live config, supported checks, limitations, privacy and architecture.
- [x] Add production start and Docker configuration, CI test/build, MIT license and screenshots.
- [x] Run tests and build, smoke-test production routes, record verification and commit sources.

Execution: completed in the current session. See docs/VERIFICATION.md for evidence and limits.
