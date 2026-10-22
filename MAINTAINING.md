# Maintaining

Everything a maintainer needs to run this list. The repository is self-contained: no step depends on another
repository or on private tooling.

## Layout

| Path | What it is |
|---|---|
| `entries/<slug>.yml` | One entry per file, the source of truth. |
| `registry/categories.yml` | The category tree: order, titles, one-line scopes, aliases for old anchors. |
| `registry/tags.yml` | Controlled tags; `derived: true` marks tags computed from fields. |
| `registry/licenses.yml` | License ids and their kind (osi, open-content, source-available, proprietary, unknown). |
| `registry/agent-types.yml` | Kinds of agents for the optional `agent_types` field. |
| `registry/link-check-exclude.yml` | URL patterns the link checker skips, each with a reason. |
| `schema/entry.schema.json` | JSON Schema of an entry; each YAML file points to it for editor validation. |
| `templates/README.md.tmpl` | Header, legend and footer of the README, with `{{placeholders}}`. |
| `scripts/` | build, validate, refresh and link check (below). `scripts/lib/` holds the shared code. |
| `test/` | Unit tests for validate, build and refresh (`node:test`). |
| `README.md`, `entries.json`, `llms.txt` | Generated. Never edit by hand. |

The scripts use Node.js 24 (`.nvmrc`) with two small dependencies: `yaml` (ISC, no dependencies) to read and write
entry files without losing comments, and `ajv` (MIT) so the JSON Schema file is what enforces the entry format.
Node.js was chosen because its built-in `fetch` and `node:test` cover the link check and the tests without more
packages. Set up with `nvm use && npm ci`.

## Scripts

| Command | What it does | Network |
|---|---|---|
| `npm run build` | Writes README.md, entries.json and llms.txt from the entries and registries. Deterministic: the same input gives byte-identical output (no dates, no metadata that changes daily in the README). `node scripts/build.mjs --check` only reports drift. | no |
| `npm run validate` | Schema, registries, file names, duplicate `url` and `repo_url`, description rules (one sentence, at most 160 characters, ends with a dot, no links, no promotional words), no em dash in any field, alphabetical order, drift of the generated files, and categories or subcategories with 1 or 2 visible entries. Prints entries per category and every field set to `unknown`. Warnings (not failures): empty categories and subcategories, tags with fewer than 3 entries, missing license, OTel fields without evidence, repositories without a push for 12 months. Flags: `--no-drift`, `--strict` (warnings fail), `--quiet`. | no |
| `npm run refresh` | For every entry with a GitHub repository, reads `gh api repos/OWNER/REPO` and `releases/latest` and writes `stars`, `archived`, `pushed_at`, `last_release` and `last_checked` (UTC date) into the YAML file. Prints repositories that moved (the API answers with another owner or name) or are archived. Flags: `--only <slug>`, `--dry-run`. Needs the GitHub CLI logged in, or `GH_TOKEN` set. | GitHub API |
| `npm run links` | Requests every `url`, `repo_url`, `docs_url`, `otel_evidence`, `telemetry_docs` and `evidence_url` (HEAD, then GET on an error status), 8 at a time, and fails on status 400 or above or no connection. Flags: `--only <slug>`, `--timeout <ms>`. | yes |
| `npm test` | Unit tests. | no |

## Jobs (`.github/workflows/`)

| Workflow | When | What |
|---|---|---|
| `ci.yml` | every pull request and push to `main` | Pull request: `npm test`, `npm run validate -- --no-drift`, at most one added entry, link check of the entries the pull request adds or changes. Push to `main`: `npm test`, `build`, a bot commit "chore: regenerate README, entries.json and llms.txt" when the output changed (rebuilt on the latest `main`, up to 3 attempts), then `validate` including drift. The build job needs `contents: write`; its bot commit does not start another run. |
| `refresh.yml` | daily at 03:17 UTC, or by hand | `refresh`, `build`, `validate`, then a bot commit "chore: refresh repository metadata" when something changed. Needs `contents: write`. Shares the `write-main` concurrency group with the build job, so the two never push at the same time. |
| `links.yml` | weekly on Monday at 04:41 UTC, or by hand | Full link check; writes the failures (at most 30) into one standing issue titled "Entries to review", creating it on the first failure. Needs `issues: write`. |

## Review

1. Run `npm ci && npm run validate -- --no-drift`; read the warnings for the new entry.
2. Open `otel_evidence` and `telemetry_docs` and check that the page says what the fields claim. A page that only
   loads is not evidence.
3. Check the license in the project's LICENSE file. The root license goes in `license`; it is `OSS` only when it is
   OSI-approved. A repository with an `ee/` or `enterprise/` directory also gets the tag `open-core`, and the
   directory goes in `license_note`. A root license that is not OSI-approved (ELv2, BSL, SSPL, ...) is
   source-available. Hosted products: `proprietary`.
4. Check the description: factual, neutral, one sentence.
5. If the submitter works on the project, `vendor_affiliation` must be set.
6. Merge. The build job on `main` regenerates README.md, entries.json and llms.txt. If a pull request still carries
   generated files, merging works the same; the job overwrites them.

## Lifecycle

- Archived upstream, gone, or no push for 12 months: the validator or the weekly job flags it. Wait 14 days, then
  move it to "Archived and historical" (set `historical` with the reason) or delete the file. One removal per commit,
  with the reason in the commit message.
- A finished project that is still useful: set `mature` with a one-line reason.
- A repository that moved: update `url` or `repo_url` to the new home and rename the entry if the project was renamed.

## Categories and tags

- A category or subcategory needs 3 visible entries: 1 or 2 fail validation, so add entries or merge the section
  into another one. An empty one is hidden from the README and only warns. Archived and historical entries do not
  count. Split a category at about 40 entries.
- When a category is renamed, add its old anchor to `aliases`, so old links keep working.
- New tags need a description and should reach 3 entries.
- Category changes are maintainer decisions, made in their own pull request.

## Neutrality

- No sponsored placement, no paid listings, no affiliate links. Order is alphabetical only.
- The README states the maintainer's own projects in its disclosure paragraph; those entries set
  `vendor_affiliation` like everyone else's.
- Findings link only public evidence: upstream issues, pull requests or public documentation.

## Release and handover

There are no releases; `main` is the list. To hand the list over, transfer the repository and give the new owner
write access; nothing else holds state.
