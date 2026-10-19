# PromptLens design

Approved direction: a Chinese-friendly prompt comparison workbench for individual developers.

## Outcome
Compare two prompt versions against identical cases and inspect response text, deterministic checks, provider-reported tokens and measured latency. Never imply that passing checks means factual accuracy. A clearly labeled offline demo requires no API key.

## Architecture
React/TypeScript with Vite; Node/Express API; SQLite stores completed runs locally. A server-only environment config supplies the model endpoint and credentials. Each run evaluates two prompts over at most 12 cases, using two workers. Failures are isolated per response. Requests time out after 45 seconds. Runs survive browser refresh via history API; credentials never enter browser bundles or reports.

## Scope
Editable prompt pair, {{input}} substitution, editable cases with optional keyword and JSON checks, demo/live modes, results matrix, response inspection, history and JSON/Markdown exports. Responsive light interface with a left navigation rail and prominent comparison workspace. No accounts, billing, arbitrary per-request URLs or AI-generated quality rankings.

## State and verification
Disable duplicate submissions; retain input on failure; distinguish empty, running, completed and failed responses. Validate on server. Test validation, checks, prompt substitution, provider failures and SQLite persistence. Build/typecheck and exercise demo workflow in a browser.
