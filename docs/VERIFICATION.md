# Initial verification

Date: 2026-10-19 (Asia/Shanghai). Environment: Windows, Node v24.15.0, npm 11.12.1.

## Automated

- `npm test`: 11 tests passed. Covers malformed inputs and limits; literal `$&` placeholder substitution; JSON/keyword/no-rule checks; deterministic demo; fake live provider payloads and usage; incomplete config; HTTP/timeout/network/malformed-response isolation; two-worker concurrency and matrix ordering; SQLite reopening and 50-record retention; real HTTP configuration, validation, forbidden origin, live fake provider and history roundtrip.
- `npm run build`: TypeScript checks and Vite production build passed.
- Production smoke: root HTML and favicon return 200 from the running server.
- `npm audit --omit=dev`: unavailable. The configured mirror does not implement the audit endpoint; the official registry connection failed during TLS setup. No clean dependency-audit result is claimed.

## Browser

Used a real Chromium session against the production server at localhost:3001.

- Inspected desktop 1440×1100 and mobile 390×844.
- Ran included demo: six responses returned; A failed the strict JSON rule and B passed, as specified by the fixed fixtures.
- Opened complete response and check details; closed dialog with Escape.
- Opened history and restored a saved run.
- Added, edited and deleted a test case; empty added input disabled the main run button.
- Downloaded JSON and Markdown reports; JSON contained all six responses and Markdown carried the offline-fixture disclaimer.
- Keyboard ArrowLeft switched results to cases and focused `tab-cases`.
- Browser console had zero errors and warnings during the inspected flow.
- Screenshots: `docs/images/workbench.png`, `docs/images/results.png`; additional mobile captures in ignored `output/playwright/`.

## Not verified

- No external paid model was called. Live behavior was exercised through a local fake Chat Completions provider, not a claim of provider-wide compatibility.
- Docker configuration was not built or run.
- CI configuration was written; hosted GitHub Actions has not run because the repository has not been published.
- No user adoption, GitHub stars, semantic answer quality or statistical improvement is claimed.
