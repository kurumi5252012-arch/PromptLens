# Contributing

Start with an issue describing the problem, an example input, and expected behavior. Keep changes focused. Never include API keys, personal feedback, or private model responses.

Use Node 24.15+, run `npm ci`, then `npm run dev`. For changes to evaluation behavior, add a regression test under `tests/` using `node:test`; model tests must use a fake provider and never require paid API calls. Run `npm test` and `npm run build` before opening a PR.

For visible changes, include desktop and mobile screenshots and explain empty, loading and error behavior. Rule checks must remain deterministic and clearly distinguish unavailable metrics from zero values.
