import book from './hymns.json';

import { readCache } from './content-cache';
import type { Hymn, Stanza } from '../../shared/hymnal-types';

export type { Hymn, LyricLine, Stanza } from '../../shared/hymnal-types';

// hymns.json is produced by scripts/parse_hymnal.py from the choir's book.

// Stanzas the reader offers as verse chips: not spoken passages or continuations.
export const isNavigable = (s: Stanza) => s.type !== 'spoken' && !s.continued;

export type Playlist = {
  id: string;
  label: string;
  year: number;
  hymns: Hymn[];
};

// The book as shipped, overlaid with edits made on the content website (see content.ts).
// Arrays are updated in place so modules holding them see new content.
export const hymns: Hymn[] = [];
export const playlists: Playlist[] = [];
let byNumber = new Map<number, Hymn>();

export function getHymn(number: number): Hymn | undefined {
  return byNumber.get(number);
}

export function neighbours(number: number) {
  const i = hymns.findIndex((h) => h.number === number);
  return { previous: i > 0 ? hymns[i - 1] : undefined, next: i >= 0 ? hymns[i + 1] : undefined };
}

export function applyContent(edited: Record<number, Hymn | null>) {
  const merged = new Map((book.hymns as Hymn[]).map((h) => [h.number, h]));
  for (const [number, h] of Object.entries(edited)) {
    if (h) merged.set(Number(number), h);
    else merged.delete(Number(number)); // hidden on the website
  }
  hymns.splice(0, hymns.length, ...[...merged.values()].sort((a, b) => a.number - b.number));
  byNumber = new Map(hymns.map((h) => [h.number, h]));

  // The book has no themes, so version 1 offers one playlist per volume.
  const map = new Map<string, Playlist>();
  for (const h of hymns) {
    const label = h.volume ?? '?';
    let p = map.get(label);
    if (!p) {
      p = { id: label, label, year: h.volumeYear ?? 0, hymns: [] };
      map.set(label, p);
    }
    p.hymns.push(h);
  }
  playlists.splice(0, playlists.length, ...map.values());

  index = hymns.map((hymn) => ({
    hymn,
    title: fold(hymn.title),
    lines: hymn.stanzas.flatMap((s) => s.lines.map((l) => ({ text: l.text, folded: fold(l.text) }))),
  }));
}

export function getPlaylist(id: string): Playlist | undefined {
  return playlists.find((p) => p.id === id);
}

export function playlistOf(hymn: Hymn): Playlist | undefined {
  return hymn.volume ? getPlaylist(hymn.volume) : undefined;
}

export function verseCount(hymn: Hymn) {
  return hymn.stanzas.filter((s) => s.type === 'verse' && !s.continued).length;
}

export function firstLine(hymn: Hymn) {
  return hymn.stanzas.find((s) => s.type !== 'spoken' && s.lines.length)?.lines[0]?.text ?? '';
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`]/g, "'")
    .toLowerCase();

type Indexed = { hymn: Hymn; title: string; lines: { text: string; folded: string }[] };

let index: Indexed[] = [];

export type LyricMatch = { hymn: Hymn; line: string };

export function searchHymns(query: string, within?: Playlist) {
  const q = fold(query.trim());
  const pool = within ? index.filter((i) => i.hymn.volume === within.id) : index;
  if (!q) return { titles: pool.map((i) => i.hymn), lyrics: [] as LyricMatch[] };

  const numeric = /^\d+$/.test(q);
  const titles = pool
    .filter((i) => (numeric ? String(i.hymn.number).startsWith(q) : i.title.includes(q)))
    .sort((a, b) => {
      if (numeric) return String(a.hymn.number).length - String(b.hymn.number).length || a.hymn.number - b.hymn.number;
      return Number(!a.title.startsWith(q)) - Number(!b.title.startsWith(q)) || a.hymn.number - b.hymn.number;
    })
    .map((i) => i.hymn);

  const titleSet = new Set(titles);
  const lyrics: LyricMatch[] = numeric
    ? []
    : pool.flatMap((i) => {
        if (titleSet.has(i.hymn)) return [];
        const hit = i.lines.find((l) => l.folded.includes(q));
        return hit ? [{ hymn: i.hymn, line: hit.text }] : [];
      });

  return { titles, lyrics };
}

applyContent(readCache().hymns);
