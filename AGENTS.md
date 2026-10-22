# AGENTS.md

Instructions for coding agents that help someone contribute to this list.

## What you may do

- Draft one entry file, `entries/<slug>.yml`, following [CONTRIBUTING.md](CONTRIBUTING.md) and
  [schema/entry.schema.json](schema/entry.schema.json).
- Check the facts before you write them: read the project's LICENSE file, and read the documentation page you put in
  `otel_evidence` or `telemetry_docs`. A page that loads is not evidence; its text must say what the field claims.
  When you cannot confirm a value, write `unknown`.
- Run the checks and fix what they report:

  ```sh
  nvm use && npm ci
  npm run validate -- --no-drift
  npm test
  ```

  Commit only the entry file. README.md, entries.json and llms.txt are regenerated on `main` after the merge.

- Fix an existing entry that is wrong, with the source of the correction.

## What a person does

- A person opens the pull request or issue, fills in the template and answers the review. Do not open issues or pull
  requests on your own, and do not post comments for the person.
- One entry per pull request. Do not batch entries.

## Rules for entry text

- One factual sentence, at most 160 characters, ending with a dot. No promotional words, no emoji, no links in the
  description, no em dash.
- Neutral: describe what the resource does for agent observability, nothing about how good it is.
- Never fill `stars`, `archived`, `pushed_at`, `last_release` or `last_checked`.
- Never edit README.md, entries.json or llms.txt by hand; `npm run build` writes them.
- Findings need public evidence (an upstream issue, pull request or public documentation).
- If the person works on the project, set `vendor_affiliation`.

## Files

- `entries/`: one YAML file per entry.
- `registry/`: categories, tags, licenses, agent types, link check exclusions.
- `scripts/`: `build.mjs`, `validate.mjs`, `refresh.mjs` (GitHub metadata through `gh api`), `check-links.mjs`.
- `test/`: unit tests (`node:test`).
- [MAINTAINING.md](MAINTAINING.md) explains every script and job.
