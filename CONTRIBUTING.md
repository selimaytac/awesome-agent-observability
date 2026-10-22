# Contributing

Thank you for helping. This list is neutral: open source and commercial resources are welcome, and so are competitors
of any listed project. Entries are ordered alphabetically, never by preference, stars or payment.

## What fits

A resource fits when it helps observe AI agents (tracing, metrics, logs, evaluation tied to traces, cost, debugging,
safety signals), or is a standard or piece of infrastructure those rely on. Every kind of agent counts: coding,
transactional and payment, commerce, personal assistants, customer support, enterprise workflows, research and devops
agents, in any industry.

It must also pass these gates:

1. A public repository or public documentation, in English.
2. At least 30 days old.
3. For a repository: not archived, and pushed within the last 12 months. A finished project without recent pushes can
   stay with a `mature` reason.
4. An honest statement of OpenTelemetry support, with a public link as evidence, or `unknown`.

## What does not fit

- General LLM tools without telemetry, prompt libraries, model hubs.
- Generic APM pages without GenAI or agent support.
- Paid listings, affiliate links, referral codes.

## How to add an entry

Add one file, `entries/<slug>.yml`, in a pull request that adds nothing else. The slug is the name in lowercase with
words joined by hyphens (`Weights & Biases Weave` becomes `weights-and-biases-weave`); the validator tells you the
exact file name. Do not edit README.md, entries.json or llms.txt: they are generated.

```yaml
# yaml-language-server: $schema=../schema/entry.schema.json
name: Example Tracer
url: https://github.com/example/example-tracer
description: Library that traces tool calls of agents and exports them over OTLP.
type: library
category: instrumentation
added: 2026-10-20
tags:
  - tracing
license: Apache-2.0
languages:
  - python
otlp:
  - export
conventions:
  - genai-semconv
otel_evidence: https://example.com/docs/opentelemetry
```

Field rules (the full list is in [schema/entry.schema.json](schema/entry.schema.json)):

- `description`: one factual sentence, at most 160 characters, ending with a dot. No promotional words ("best",
  "powerful", "seamless"), no emoji, no links (use `docs_url` and `repo_url`), no em dash.
- `category` and `subcategory`: one primary home from [registry/categories.yml](registry/categories.yml). If an entry
  really belongs in a second place, add `also_in`.
- `tags`: from [registry/tags.yml](registry/tags.yml). Tags such as `oss`, `otlp`, `python` or `self-hosted` are
  computed from other fields; set `license`, `otlp`, `languages` or `hosting` instead.
- `license`: an id from [registry/licenses.yml](registry/licenses.yml), read from the root LICENSE file. `OSS` means
  the root license is OSI-approved. If the repository also has a source-available or enterprise directory (`ee/`,
  `enterprise/`), add the tag `open-core` and name the directory in `license_note`. A root license that is not
  OSI-approved (ELv2, BSL, SSPL, a modified Apache license) is source-available and gets no `OSS` tag. A hosted
  product is `proprietary`. If you cannot tell, write `unknown`.
- `otlp`, `conventions`: only what the project's own documentation or code shows, with that page in `otel_evidence`.
  Use `[]` for none and `unknown` when not confirmed.
- `telemetry` (agent frameworks): `otel`, `own`, `external`, `none` or `unknown`, with the page in `telemetry_docs`.
- `agent_types`: only when the resource is specific to some kinds of agents, from
  [registry/agent-types.yml](registry/agent-types.yml). Leave it out for general-purpose tools.
- `vendor_affiliation`: required when you work on the project you submit. Self-submissions are fine when the entry
  reads like every other entry.
- Findings (`type: finding`) need `evidence_url` (a public upstream issue, pull request or documentation page),
  `versions` and `status`. Private notes are not evidence.
- Never fill `stars`, `archived`, `pushed_at`, `last_release` or `last_checked`; a script does.

Before you open the pull request:

```sh
nvm use            # Node.js 24
npm ci
npm run validate -- --no-drift   # schema, registries, description rules, duplicates
```

Commit only your entry file. After the merge, a job regenerates README.md, entries.json and llms.txt on `main`.
`npm run build` shows the result locally; do not commit its output.

## Pull requests

- One entry per pull request. Corrections to an existing entry are welcome in the same way.
- Say how you checked the link, the maintenance state, the license and the OTel fields.
- Submissions may be prepared with AI tools, but a person submits them and answers the review. Pull requests opened by
  bots without a person behind them are closed.
- Several entries from one organization within a short time are reviewed together.
- Pull requests without a reply for 15 days are closed; you can reopen them at any time.

## Common reasons for a no

- Out of scope (see above), or a duplicate of a listed entry.
- An OTel claim without public evidence.
- A promotional description.
- An archived or inactive repository.

## Removal

Entries that are archived, gone or inactive for 12 months are flagged, get 14 days of grace, and are then moved to
"Archived and historical" or removed, one removal per commit with the reason.
