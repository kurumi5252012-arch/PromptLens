<p align="center"><img src="public/favicon.svg" width="64" alt="PromptLens logo" /></p>
<h1 align="center">PromptLens</h1>
<p align="center">A small, local-first workbench for prompt experiments.<br/>Compare two prompts. Inspect every response. Catch format regressions.</p>
<p align="center"><a href="README.zh-CN.md">简体中文</a> · <a href="#quick-start">Quick start</a> · <a href="#what-it-does">Features</a> · <a href="docs/PORTFOLIO.md">Portfolio notes</a></p>

![PromptLens comparison workspace](docs/images/workbench.png)

## Why this exists

Changing a prompt is easy. Checking whether the change helped is harder. PromptLens puts two versions against the same inputs and makes the raw evidence easy to inspect. It is a focused tool for individual developers, rather than a general evaluation framework.

The initial UI is in Chinese. This is an independent project; it does not use or wrap Promptfoo. It does not provide semantic correctness scoring or claim statistical significance.

## Quick start

Requires **Node.js 24.15+** and npm. No Python, database server, or API key required for the demo.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Click **运行对比** to compare the included examples, then click a response to inspect it. Development runs the frontend on 5173 and the API on 3001.

For a production build:

```sh
npm run build
npm start
```

Open **http://127.0.0.1:3001**. The production server serves both the UI and API.

## What it does

### Companion learning skill

The repository also includes [Kaoyan English Coach](skills/README.md), a standalone Chinese-language skill for cloze tests, reading comprehension, essay feedback, and evidence-based review. It includes reusable instructions, research references, and nine behavioral acceptance scenarios. It is a separate instructional resource; the web workbench does not execute it automatically.

- **Side-by-side prompts:** `{{input}}` substitution, with input appended when no placeholder exists.
- **Shared test set:** 1–12 editable inputs; optional case-insensitive keyword and strict JSON checks.
- **Evidence, not a magic score:** original responses, individual check results, measured latency and provider-reported total tokens.
- **Response inspector:** full text and check details in a keyboard-dismissible dialog.
- **Local history:** SQLite snapshots of the latest 50 completed experiments.
- **Portable reports:** export a complete run as JSON or a readable Markdown report.
- **Offline demo:** fixed fixtures show the whole workflow before connecting a model.
- **Bounded execution:** two concurrent requests, 45-second per-request timeout, isolated response failures, one active experiment.

**The demo does not run a model.** Prompt edits do not change its fixture behavior. Its latency includes artificial delay; tokens are unavailable. Use live mode to evaluate real prompts. A passing JSON or keyword check is not a claim that an answer is correct.

![Run results with per-response checks](docs/images/results.png)

## Connect a model

Copy `.env.example` to `.env` and fill these **server-side** variables:

```dotenv
MODEL_BASE_URL=https://your-provider.example/v1
MODEL_API_KEY=your-key
MODEL_NAME=your-model-name
```

Restart the server and select **真实模型**. The endpoint must implement `POST {MODEL_BASE_URL}/chat/completions` and return `choices[0].message.content` as a string. The request uses `temperature: 0` and `max_tokens: 700`. Some reasoning-only or proprietary endpoints may require changes to `server/engine.js`.

Live runs send your prompts and cases to your configured provider and can incur charges. API keys never enter the frontend build, database records, or report exports. Responses may themselves contain sensitive data; review reports before sharing.

## Architecture

```text
React + TypeScript + Vite
          │ same-origin /api
          ▼
     Express server ─── node:sqlite ─── data/promptlens.sqlite
          │ server-only environment settings
          ▼
  Chat Completions-compatible provider
```

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Editors, results, history, guide and report export |
| `src/workspace.ts` | Shared types, sample inputs, API helper and report export |
| `src/styles.css` | Responsive workspace and interaction states |
| `server/engine.js` | Input validation, substitution, bounded execution, checks |
| `server/store.js` | SQLite snapshots and history retention |
| `server/index.js` | HTTP API and production static server |
| `tests/` | Engine, storage and real HTTP integration tests |

## API

| Endpoint | Behavior |
| --- | --- |
| `GET /api/config` | Returns model name and live availability, never credentials |
| `POST /api/runs` | Evaluates and persists a completed run; 201 on success |
| `GET /api/runs` | Latest 50 run summaries, newest first |
| `GET /api/runs/:id` | Complete immutable run snapshot |

See [examples/feedback.json](examples/feedback.json) for a request payload. Invalid input returns 400; overlapping runs return 429. Successful runs can contain failed individual responses. There is no automatic retry to avoid unexpected extra spend. A full 12-case live run can take about nine minutes if every request times out.

## Docker

```sh
docker build -t promptlens .
docker run --rm -p 127.0.0.1:3001:3001 -v promptlens-data:/app/data promptlens
```

For live mode, add `--env-file .env` before the image name. Keep the published port bound to loopback: this is a personal tool with no authentication or multi-user isolation. Docker instructions are provided but were not executed in the initial development environment.

## Development

```sh
npm test
npm run build
```

Tests use local fixtures and a fake provider; they require no external API or paid model. CI runs tests and the production build on Node 24.15.0. See [verification notes](docs/VERIFICATION.md) for the initial checks and limitations.

## Limits and roadmap

Current scope: one local user, two prompt versions, one configured model, deterministic checks. In-flight jobs are lost if the process exits. There is no streaming, cancellation, automatic semantic judge, project management or import UI. Unsaved editor changes do not survive a refresh; completed runs can be reopened from history. When browsing an old run, the result panel remains a snapshot even if you edit the prompts above it.

Potential next steps: test-set import, a provider adapter interface, schema validation checks, repeated trials, and an English UI. Contributions should include a concrete use case and a small reproducible example; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). Attribution is welcome. If the tool helps your workflow, a GitHub star helps other developers find it.
