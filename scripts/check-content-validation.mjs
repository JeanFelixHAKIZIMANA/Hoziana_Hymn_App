// Checks that the app's content validation accepts every shipped hymn and rejects
// the kinds of damage that used to crash the app on launch.
// Run: node --experimental-strip-types scripts/check-content-validation.mjs
import { readFileSync } from 'node:fs';
import { isHymn } from '../shared/hymn-validate.ts';

const { hymns } = JSON.parse(readFileSync(new URL('../src/data/hymns.json', import.meta.url), 'utf8'));
let failed = 0;
const expect = (ok, label) => {
  if (!ok) {
    failed++;
    console.log('FAIL', label);
  }
};

for (const h of hymns) expect(isHymn(h), `shipped hymn ${h.number} is accepted`);

const good = hymns[0];
const bad = {
  'stanzas is an object': { ...good, stanzas: {} },
  'stanzas is null': { ...good, stanzas: null },
  'stanza without lines': { ...good, stanzas: [{ type: 'verse', number: 1 }] },
  'unknown stanza type': { ...good, stanzas: [{ type: 'chorus', lines: [] }] },
  'line text is a number': { ...good, stanzas: [{ type: 'verse', lines: [{ text: 5 }] }] },
  'line is a string': { ...good, stanzas: [{ type: 'verse', lines: ['hello'] }] },
  'title missing': { ...good, title: undefined },
  'number is text': { ...good, number: '12' },
  'number is zero': { ...good, number: 0 },
  'year is text': { ...good, year: '1990' },
  'not an object': 'hymn',
  null: null,
};
for (const [label, h] of Object.entries(bad)) expect(!isHymn(h), `rejects: ${label}`);

console.log(failed ? `${failed} checks failed` : `${hymns.length} hymns accepted, ${Object.keys(bad).length} damaged rows rejected`);
process.exit(failed ? 1 : 0);
