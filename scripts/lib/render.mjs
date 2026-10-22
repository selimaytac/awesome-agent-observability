// Pure rendering: data in, file contents out. No clock, no network, no randomness, so output is deterministic.
import { anchor, compareEntries, allTags, isHistorical, licenseKind } from './data.mjs';

const CONVENTION_BADGE = { 'genai-semconv': 'GenAI semconv', openinference: 'OpenInference' };
const LICENSE_BADGE = { osi: 'OSS', 'source-available': 'Source-available', proprietary: 'Proprietary' };
const HOSTING_BADGE = { 'self-hosted': ['Self-hosted'], saas: ['SaaS'], both: ['Self-hosted', 'SaaS'] };

export function hasOtel(e) {
  return (Array.isArray(e.otlp) && e.otlp.length > 0) || e.telemetry === 'otel';
}

export function badges(data, e) {
  const out = [];
  if (e.type === 'finding') {
    out.push(e.status === 'fixed' ? `Fixed in ${e.fixed_in}` : e.status === 'open' ? 'Open' : 'Status unknown');
    return out;
  }
  if (hasOtel(e)) out.push('OTel');
  if (Array.isArray(e.conventions)) for (const c of e.conventions) out.push(CONVENTION_BADGE[c]);
  const lb = LICENSE_BADGE[licenseKind(data, e.license)];
  if (lb) out.push(lb);
  if ((e.tags ?? []).includes('open-core')) out.push('Open-core');
  out.push(...(HOSTING_BADGE[e.hosting] ?? []));
  return out;
}

export function entryLine(data, e) {
  const links = [];
  if (e.docs_url && e.docs_url !== e.url) links.push(`[${e.type === 'finding' ? 'Notes' : 'Docs'}](${e.docs_url})`);
  if (e.telemetry_docs && e.telemetry_docs !== e.url && e.telemetry_docs !== e.docs_url) links.push(`[Telemetry](${e.telemetry_docs})`);
  if (e.repo_url && e.repo_url !== e.url) links.push(`[Source](${e.repo_url})`);
  if (e.evidence_url && e.evidence_url !== e.url) links.push(`[Evidence](${e.evidence_url})`);
  let line = `- [${e.name}](${e.url}) - ${e.description}`;
  if (links.length) line += ` (${links.join(', ')})`;
  const b = badges(data, e);
  if (b.length) line += ' ' + b.map((x) => `\`${x}\``).join(' ');
  return line;
}

/** Groups visible entries by category and subcategory, in registry order, entries sorted. */
export function group(data) {
  const visible = data.entries.filter((e) => !isHistorical(e));
  return data.categories.map((c) => {
    const inCat = visible.filter((e) => e.category === c.id).sort(compareEntries);
    const subs = (c.subcategories ?? []).map((s) => ({ ...s, entries: inCat.filter((e) => e.subcategory === s.id) }));
    const seeAlso = visible.filter((e) => (e.also_in ?? []).includes(c.id)).sort(compareEntries);
    return { ...c, entries: subs.length ? [] : inCat, subs, seeAlso, total: inCat.length };
  });
}

function sectionMarkdown(data, c) {
  const lines = [];
  for (const a of c.aliases ?? []) if (a !== anchor(c.title)) lines.push(`<a id="${a}"></a>`);
  lines.push(`## ${c.title}`, '', c.scope, '');
  if (c.entries.length) lines.push(...c.entries.map((e) => entryLine(data, e)), '');
  for (const s of c.subs) {
    if (!s.entries.length) continue;
    lines.push(`### ${s.title}`, '', s.scope, '', ...s.entries.map((e) => entryLine(data, e)), '');
  }
  if (c.seeAlso.length) lines.push(`See also: ${c.seeAlso.map((e) => `[${e.name}](${e.url})`).join(', ')}.`, '');
  lines.push('**[Back to top](#contents)**', '');
  return lines.join('\n');
}

export function renderReadme(data, template) {
  const groups = group(data).filter((c) => c.total > 0);
  const toc = groups
    .map((c) => {
      const subs = c.subs.filter((s) => s.entries.length).map((s) => `  - [${s.title}](#${anchor(s.title)})`);
      return [`- [${c.title}](#${anchor(c.title)})`, ...subs].join('\n');
    })
    .concat(['- [Archived and historical](#archived-and-historical)'])
    .join('\n');
  const sections = groups.map((c) => sectionMarkdown(data, c)).join('\n').trimEnd();
  const hist = data.entries.filter(isHistorical).sort(compareEntries);
  const archived = hist.length
    ? hist.map((e) => `${entryLine(data, e)}${e.historical ? ` Kept because: ${e.historical}` : ' Archived upstream.'}`).join('\n')
    : 'No entries yet.';
  const count = data.entries.filter((e) => !isHistorical(e)).length;
  return fill(template, { toc, sections, archived, count: String(count) });
}

export function fill(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (m, k) => {
    if (!(k in values)) throw new Error(`template placeholder {{${k}}} has no value`);
    return values[k];
  });
}

/** Machine-readable export: every entry with its derived tags, in README order. */
export function renderEntriesJson(data) {
  const order = new Map(data.categories.map((c, i) => [c.id, i]));
  const subOrder = (e) => {
    const c = data.categories.find((x) => x.id === e.category);
    return (c?.subcategories ?? []).findIndex((s) => s.id === e.subcategory);
  };
  const entries = [...data.entries]
    .sort((a, b) => (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99) || subOrder(a) - subOrder(b) || compareEntries(a, b))
    .map((e) => {
      const out = { slug: e._slug };
      for (const [k, v] of Object.entries(e)) if (!k.startsWith('_') && k !== 'tags') out[k] = v;
      out.tags = allTags(data, e);
      out.otel = hasOtel(e);
      out.historical_section = isHistorical(e);
      return out;
    });
  const categories = data.categories.map((c) => ({
    id: c.id,
    title: c.title,
    scope: c.scope,
    subcategories: (c.subcategories ?? []).map((s) => ({ id: s.id, title: s.title, scope: s.scope })),
  }));
  return JSON.stringify({ name: 'Awesome Agent Observability', license: 'CC0-1.0', categories, entries }, null, 2) + '\n';
}

/** Where the generated files are served from. Change it when the repository moves (see MAINTAINING.md). */
export const RAW_BASE = 'https://raw.githubusercontent.com/selimaytac/awesome-agent-observability/main';

/** llms.txt (https://llmstxt.org): title, summary, how to use the data, then one list per category. */
export function renderLlms(data) {
  const lines = [
    '# Awesome Agent Observability',
    '',
    '> A neutral list of resources for observing AI agents: standards, instrumentation, frameworks, platforms, gateways, evaluation, cost, safety signals, and on-chain agents and payments, with an OpenTelemetry focus.',
    '',
    `Every entry is one YAML file in entries/. All fields, including OTel support with an evidence link, license and repository metadata, are in ${RAW_BASE}/entries.json.`,
    '',
    'To choose a tool, filter entries.json by `category`, `tags`, `otlp`, `conventions`, `telemetry`, `license`, `hosting`, `languages` and `agent_types`, and skip entries with `historical_section: true`. A missing or `unknown` value means not confirmed, not no. Each OTel claim links its evidence in `otel_evidence` or `telemetry_docs`. Order is alphabetical and says nothing about quality.',
    '',
  ];
  for (const c of group(data)) {
    if (!c.total) continue;
    lines.push(`## ${c.title}`, '');
    const all = c.subs.length ? c.subs.flatMap((s) => s.entries) : c.entries;
    for (const e of all) lines.push(`- [${e.name}](${e.url}): ${e.description}`);
    lines.push('');
  }
  lines.push('## Optional', '', `- [entries.json](${RAW_BASE}/entries.json): all entries with every field, for programs and agents.`, '');
  return lines.join('\n');
}
