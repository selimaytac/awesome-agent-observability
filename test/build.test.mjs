import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, slugify, anchor, compareEntries } from '../scripts/lib/data.mjs';
import { entryLine } from '../scripts/lib/render.mjs';
import { buildOutputs } from '../scripts/build.mjs';
import { applyFields } from '../scripts/refresh.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRoot, entry } from './helpers.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('build is deterministic', () => {
  const root = makeRoot({ alpha: entry(), beta: entry({ name: 'Beta', url: 'https://example.com/beta' }) });
  assert.deepEqual(buildOutputs(root), buildOutputs(root));
});

test('entries are sorted case-insensitively inside a section', () => {
  const root = makeRoot({
    zeta: entry({ name: 'Zeta', url: 'https://example.com/z' }),
    alpha: entry(),
    'mid-name': entry({ name: 'mid name', url: 'https://example.com/m' }),
  });
  const readme = buildOutputs(root)['README.md'];
  const names = [...readme.matchAll(/^- \[([^\]]+)\]\(https/gm)].map((m) => m[1]);
  assert.deepEqual(names, ['Alpha', 'mid name', 'Zeta']);
});

test('empty categories and subcategories are left out; aliases become anchors', () => {
  const root = makeRoot({ alpha: entry(), hosted: entry({ name: 'Hosted', url: 'https://example.com/h', category: 'platforms', subcategory: 'hosted' }) });
  const readme = buildOutputs(root)['README.md'];
  assert.ok(readme.includes('## Platforms'));
  assert.ok(readme.includes('### Hosted platforms'));
  assert.ok(!readme.includes('Empty sub'));
  assert.ok(!readme.includes('Empty category'));
  assert.ok(readme.includes('<a id="old-tools"></a>\n## Tools'));
  assert.ok(readme.includes('  - [Hosted platforms](#hosted-platforms)'));
  assert.ok(readme.includes('**[Back to top](#contents)**'));
});

test('archived and historical entries move to their own section', () => {
  const root = makeRoot({
    alpha: entry({ archived: true }),
    beta: entry({ name: 'Beta', url: 'https://example.com/b', historical: 'Superseded by Alpha.' }),
    gamma: entry({ name: 'Gamma', url: 'https://example.com/g' }),
  });
  const readme = buildOutputs(root)['README.md'];
  const [main, archived] = readme.split('## Archived and historical');
  assert.ok(main.includes('[Gamma]') && !main.includes('[Alpha]') && !main.includes('[Beta]'));
  assert.ok(archived.includes('[Alpha]') && archived.includes('Kept because: Superseded by Alpha.'));
  assert.ok(readme.includes('Count: 1'));
});

test('an archived entry never renders in a main section, a See also line or llms.txt', () => {
  const template = readFileSync(join(REPO_ROOT, 'templates', 'README.md.tmpl'), 'utf8');
  const root = makeRoot(
    {
      alpha: entry({ archived: true, also_in: ['platforms'] }),
      gamma: entry({ name: 'Gamma', url: 'https://example.com/g', category: 'platforms', subcategory: 'hosted' }),
    },
    { template },
  );
  const out = buildOutputs(root);
  const readme = out['README.md'];
  const start = readme.indexOf('## Archived and historical');
  const details = readme.indexOf('<details>', start);
  const end = readme.indexOf('</details>', details);
  assert.ok(start > 0 && details > start && end > details, 'the real template keeps the archived section collapsed');
  const archivedAt = readme.indexOf('[Alpha](');
  assert.ok(archivedAt > details && archivedAt < end, 'the archived entry is inside the collapsed block');
  assert.equal(readme.split('[Alpha](').length, 2, 'the archived entry appears once');
  assert.ok(!readme.includes('See also: [Alpha]'));
  assert.ok(!out['llms.txt'].includes('[Alpha]'));
  const json = JSON.parse(out['entries.json']).entries.find((e) => e.slug === 'alpha');
  assert.equal(json.historical_section, true);
});

test('entry line: links and badges', () => {
  const data = load(makeRoot({}));
  const line = entryLine(data, entry({
    url: 'https://example.com/alpha',
    repo_url: 'https://github.com/example/alpha',
    docs_url: 'https://example.com/docs',
    otlp: ['ingest'],
    conventions: ['genai-semconv'],
    hosting: 'both',
  }));
  assert.equal(
    line,
    '- [Alpha](https://example.com/alpha) - Library that does one thing for agent traces. ([Docs](https://example.com/docs), [Source](https://github.com/example/alpha)) `OTel` `GenAI semconv` `OSS` `Self-hosted` `SaaS`',
  );
  assert.ok(entryLine(data, entry({ license: 'Elastic-2.0' })).endsWith('`Source-available`'));
  assert.ok(!entryLine(data, entry({ license: 'unknown' })).includes('`'));
  // Open-core: an OSI root license keeps the OSS badge and adds Open-core; a non-OSI root license is Source-available only.
  assert.ok(entryLine(data, entry({ license: 'MIT', tags: ['open-core'] })).endsWith('`OSS` `Open-core`'));
  assert.ok(!entryLine(data, entry({ license: 'Elastic-2.0' })).includes('Open-core'));
  const finding = entry({ type: 'finding', status: 'fixed', fixed_in: 'lib 1.2' });
  assert.ok(entryLine(data, finding).endsWith('`Fixed in lib 1.2`'));
});

test('entries.json carries derived tags and agent types', () => {
  const root = makeRoot({ alpha: entry({ tags: ['tracing'], agent_types: ['coding'], languages: ['python'] }) });
  const json = JSON.parse(buildOutputs(root)['entries.json']);
  assert.deepEqual(json.entries[0].tags, ['oss', 'python', 'tracing']);
  assert.deepEqual(json.entries[0].agent_types, ['coding']);
  assert.equal(json.entries[0].slug, 'alpha');
});

test('llms.txt lists entries by category', () => {
  const root = makeRoot({ alpha: entry() });
  const llms = buildOutputs(root)['llms.txt'];
  assert.ok(llms.startsWith('# Awesome Agent Observability\n'));
  assert.ok(llms.includes('## Tools\n\n- [Alpha](https://github.com/example/alpha): Library that does one thing for agent traces.'));
});

test('llms.txt links the data by absolute URL and the table of contents leaves out Contributing and License', () => {
  const root = makeRoot({ alpha: entry() }, { template: '{{toc}}' });
  const out = buildOutputs(root);
  assert.ok(out['llms.txt'].includes('https://raw.githubusercontent.com/'));
  assert.ok(!out['llms.txt'].includes('](entries.json)'));
  assert.ok(!out['README.md'].includes('#contributing'));
  assert.ok(!out['README.md'].includes('#license'));
});

test('unknown template placeholders fail loudly', () => {
  const root = makeRoot({ alpha: entry() }, { template: '{{nope}}' });
  assert.throws(() => buildOutputs(root), /nope/);
});

test('slugify, anchor and compareEntries', () => {
  assert.equal(slugify('OpenTelemetry .NET'), 'opentelemetry-net');
  assert.equal(slugify('Weights & Biases Weave'), 'weights-and-biases-weave');
  assert.equal(slugify('LangChain.js'), 'langchain-js');
  assert.equal(anchor('LLM and agent observability platforms'), 'llm-and-agent-observability-platforms');
  assert.equal(anchor('Articles, guides and talks'), 'articles-guides-and-talks');
  assert.ok(compareEntries({ name: 'a', _slug: 'a' }, { name: 'B', _slug: 'b' }) < 0);
});

test('refresh keeps hand-written keys and comments, and puts bot fields last', () => {
  const text = '# yaml-language-server: $schema=../schema/entry.schema.json\nname: Alpha\nurl: https://github.com/example/alpha\nlicense: MIT\n';
  const out = applyFields(text, { stars: 5, archived: false, last_release: null, last_checked: '2026-10-20' });
  assert.ok(out.startsWith('# yaml-language-server'));
  assert.match(out, /license: MIT\nstars: 5\narchived: false\nlast_release: null\nlast_checked: 2026-10-20\n$/);
});

