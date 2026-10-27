// Plain-text form of a hymn's stanzas, used by the content website so editors
// can write lyrics as they appear in the book. No React Native imports: the
// website imports this file too.
//
//   # Refrain                    a stanza starts with a heading line
//   Gore: Yesu Mwami /2          "Part: text", and " /N" for a repeat
//   Bose: Uri mwiza
//                                a blank line starts a new section (extra space)
//   [Refrain] Ningera mu ijuru…  a cue to sing the refrain
//   # Verse 1
//   # Spoken                     a reading ("Ijambo")
//   # Verse 1 (continued)        the rest of a verse after a spoken passage

import type { LyricLine, Stanza } from './hymnal-types';

export const PARTS = ['Gore', 'Bose', 'Gabo', 'Basse', 'Solo', 'Abagabo', 'Abagore', 'Bamwe', 'Umwe', 'Mume', 'Mke', 'Wote'];

const HEADING = /^#\s*(refrain|verse|spoken)\s*(\d+)?\s*(\(continued\))?\s*$/i;
const PART = new RegExp(`^(${PARTS.join('|')})\\s*:\\s*(.*)$`, 'i');
const REPEAT = /\s+\/\s*(\d+)\s*$/;
const CUE = /^\[refrain\]\s*(.*)$/i;

export function stanzasToText(stanzas: Stanza[]): string {
  return stanzas
    .map((s) => {
      const heading =
        s.type === 'refrain' ? 'Refrain' : s.type === 'spoken' ? 'Spoken' : `Verse ${s.number ?? 1}`;
      const lines = s.lines.map((l) => {
        const text = l.heading ? `[Refrain] ${l.text}` : l.part ? `${l.part}: ${l.text}` : l.text;
        return `${l.gap ? '\n' : ''}${text}${l.repeat ? ` /${l.repeat}` : ''}`;
      });
      return [`# ${heading}${s.continued ? ' (continued)' : ''}`, ...lines].join('\n');
    })
    .join('\n\n');
}

export type ParseResult = { stanzas: Stanza[]; errors: string[] };

export function textToStanzas(text: string): ParseResult {
  const stanzas: Stanza[] = [];
  const errors: string[] = [];
  let gapPending = false;

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) {
      gapPending = true;
      return;
    }
    const h = HEADING.exec(line);
    if (h) {
      const type = h[1].toLowerCase() as Stanza['type'];
      const stanza: Stanza = { type, lines: [] };
      if (type === 'verse') stanza.number = h[2] ? Number(h[2]) : stanzas.filter((s) => s.type === 'verse' && !s.continued).length + 1;
      if (h[3]) stanza.continued = true;
      stanzas.push(stanza);
      gapPending = false;
      return;
    }
    if (line.startsWith('#')) {
      errors.push(`Line ${i + 1}: unknown heading “${line}”. Use # Verse 1, # Refrain or # Spoken.`);
      return;
    }
    if (!stanzas.length) {
      errors.push(`Line ${i + 1}: lyrics before the first heading. Start with # Verse 1 or # Refrain.`);
      return;
    }
    const stanza = stanzas[stanzas.length - 1];
    const out: LyricLine = { text: line };
    const rep = REPEAT.exec(out.text);
    if (rep) {
      out.repeat = Number(rep[1]);
      out.text = out.text.slice(0, rep.index);
    }
    const cue = CUE.exec(out.text);
    const part = PART.exec(out.text);
    if (cue) {
      out.heading = 'refrain';
      out.text = cue[1];
    } else if (part) {
      out.part = PARTS.find((p) => p.toLowerCase() === part[1].toLowerCase());
      out.text = part[2];
    }
    if (gapPending && stanza.lines.length) out.gap = true;
    gapPending = false;
    stanza.lines.push(normalise(out));
  });

  stanzas.forEach((s, i) => {
    if (!s.lines.length && s.type !== 'spoken') errors.push(`Stanza ${i + 1} (${s.type}) has no lines.`);
  });
  return { stanzas, errors };
}

// Same key order as the converter writes, so unchanged hymns compare equal.
function normalise(l: LyricLine): LyricLine {
  const o: LyricLine = { text: l.text.replace(/\s+/g, ' ').trim() };
  if (l.repeat) o.repeat = l.repeat;
  if (l.part) o.part = l.part;
  if (l.heading) o.heading = l.heading;
  if (l.gap) o.gap = true;
  return o;
}
