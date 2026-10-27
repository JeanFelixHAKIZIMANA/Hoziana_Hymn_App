import book from './hymns.json';

// hymns.json is produced by scripts/parse_hymnal.py from the choir's book.
export type LyricLine = {
  text: string;
  repeat?: number;
  part?: string;
  // Starts a new section inside the stanza (e.g. where a Gore/Bose exchange begins).
  gap?: boolean;
  // A cue printed in the book, such as "Inyikirizo:" (sing the refrain here).
  heading?: 'refrain';
};

export type Stanza = {
  // 'spoken' is a reading ("Ijambo:") between sung parts.
  type: 'verse' | 'refrain' | 'spoken';
  number?: number;
  lines: LyricLine[];
  inferred?: boolean;
  // The rest of a verse or refrain after a spoken passage.
  continued?: boolean;
};

// Stanzas the reader offers as verse chips: not spoken passages or continuations.
export const isNavigable = (s: Stanza) => s.type !== 'spoken' && !s.continued;

export type Hymn = {
  number: number;
  title: string;
  titleUpper: string;
  key: string | null;
  scripture: string | null;
  volume: string | null;
  volumeYear: number | null;
  stanzas: Stanza[];
  credit: string | null;
  author: string | null;
  year: number | null;
};

export type Playlist = {
  id: string;
  label: string;
  year: number;
  hymns: Hymn[];
};

export const hymns = book.hymns as Hymn[];

const byNumber = new Map(hymns.map((h) => [h.number, h]));

export function getHymn(number: number): Hymn | undefined {
  return byNumber.get(number);
}

export function neighbours(number: number) {
  return { previous: byNumber.get(number - 1), next: byNumber.get(number + 1) };
}

// The book has no themes, so version 1 offers one playlist per volume.
export const playlists: Playlist[] = (() => {
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
  return [...map.values()];
})();

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

const index: Indexed[] = hymns.map((hymn) => ({
  hymn,
  title: fold(hymn.title),
  lines: hymn.stanzas.flatMap((s) => s.lines.map((l) => ({ text: l.text, folded: fold(l.text) }))),
}));

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
