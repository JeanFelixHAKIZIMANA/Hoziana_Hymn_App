// Checks that every hymn survives a round trip through the website's text format.
// Run: node --experimental-strip-types scripts/check-hymn-text.mjs
import { readFileSync } from 'node:fs';
import { stanzasToText, textToStanzas } from '../src/data/hymn-text.ts';

const { hymns } = JSON.parse(readFileSync(new URL('../src/data/hymns.json', import.meta.url), 'utf8'));
const strip = (stanzas) => stanzas.map(({ inferred, ...s }) => s);
// Compare content, not key order.
const canon = (v) =>
  Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v;
let failed = 0;
for (const h of hymns) {
  const { stanzas, errors } = textToStanzas(stanzasToText(h.stanzas));
  const want = JSON.stringify(canon(strip(h.stanzas)));
  const got = JSON.stringify(canon(stanzas));
  if (errors.length || got !== want) {
    failed++;
    if (failed <= 3) console.log(`Hymn ${h.number}:`, errors, '\n want', want.slice(0, 400), '\n got ', got.slice(0, 400));
  }
}
console.log(`${hymns.length - failed}/${hymns.length} hymns round-trip`);
process.exit(failed ? 1 : 0);
