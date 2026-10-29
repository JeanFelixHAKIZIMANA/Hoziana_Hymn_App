import { useSyncExternalStore } from 'react';

import { readCache, writeCache, type ContentCache, type Page } from './content-cache';
import { applyContent } from './hymnal';
import type { Hymn, Stanza } from '../../shared/hymnal-types';
import { isHymn } from '../../shared/hymn-validate';

// Downloads edits made on the content website (Supabase) and keeps them on the
// device. Without EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY the
// app simply uses the hymns it ships with.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type HymnRow = {
  number: number;
  title: string;
  key: string | null;
  scripture: string | null;
  volume: string | null;
  volume_year: number | null;
  author: string | null;
  year: number | null;
  credit: string | null;
  stanzas: Stanza[];
  hidden: boolean;
  updated_at: string;
};

type PageRow = { slug: string; title: string; body: string; image_path: string | null; updated_at: string };

let cache = readCache();
const listeners = new Set<() => void>();

const toHymn = (r: HymnRow): Hymn => ({
  number: r.number,
  title: r.title,
  titleUpper: r.title.toUpperCase(),
  key: r.key,
  scripture: r.scripture,
  volume: r.volume,
  volumeYear: r.volume_year,
  stanzas: r.stanzas,
  credit: r.credit,
  author: r.author,
  year: r.year,
});

async function get<T>(path: string): Promise<T> {
  // A publishable key goes in the apikey header only (it is not a JWT).
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: anonKey! } });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

// Photos live in the public "media" bucket; anything that isn't a plain file path there is ignored.
const mediaUrl = (path: unknown) =>
  typeof path === 'string' && /^[\w-]+(\/[\w.-]+)*$/.test(path) && !path.includes('..')
    ? `${url}/storage/v1/object/public/media/${path}`
    : null;

let syncing = false;

// Called on launch. Failures (offline, server paused) are ignored: the app keeps
// what it has and tries again next time.
export async function syncContent() {
  if (!url || !anonKey || syncing) return;
  syncing = true;
  try {
    const since = cache.since ? `&updated_at=gt.${encodeURIComponent(cache.since)}` : '';
    const [rows, pages] = await Promise.all([
      get<HymnRow[]>(`hymns?select=*&order=updated_at.asc${since}`),
      get<PageRow[]>('pages?select=*'),
    ]);
    const next: ContentCache = { hymns: { ...cache.hymns }, pages: {}, since: cache.since };
    for (const r of Array.isArray(rows) ? rows : []) {
      // A row that isn't a well-formed hymn is skipped, so the phone keeps its current copy.
      if (!r || typeof r.updated_at !== 'string' || !Number.isInteger(r.number)) continue;
      if (r.hidden === true) next.hymns[r.number] = null;
      else {
        const hymn = typeof r.title === 'string' ? toHymn(r) : null;
        if (!isHymn(hymn)) continue;
        next.hymns[r.number] = hymn;
      }
      if (!next.since || r.updated_at > next.since) next.since = r.updated_at;
    }
    for (const p of Array.isArray(pages) ? pages : []) {
      if (!p || typeof p.slug !== 'string' || typeof p.title !== 'string' || typeof p.body !== 'string') continue;
      next.pages[p.slug] = { slug: p.slug, title: p.title, body: p.body, imageUrl: mediaUrl(p.image_path) };
    }
    cache = next;
    writeCache(next);
    if (rows.length) applyContent(next.hymns);
    listeners.forEach((l) => l());
  } catch {
    // Keep the cached content.
  } finally {
    syncing = false;
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function usePage(slug: string): Page | undefined {
  return useSyncExternalStore(subscribe, () => cache.pages[slug]);
}
