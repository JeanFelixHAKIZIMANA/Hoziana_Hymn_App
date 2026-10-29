import type { Hymn } from '../../shared/hymnal-types';
import { isHymn } from '../../shared/hymn-validate';
import { storage } from './storage';

// Content edited on the website, as last downloaded. Kept on the device so the
// app works offline and starts with the latest edits it has seen.
export type Page = { slug: string; title: string; body: string; imageUrl: string | null };

export type ContentCache = {
  hymns: Record<number, Hymn | null>; // null: hidden on the website
  pages: Record<string, Page>;
  since: string | null; // newest updated_at seen, for the next sync
};

const KEY = 'hoziana/content/v1';

export function readCache(): ContentCache {
  try {
    const raw = storage.get(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as ContentCache;
      // Drop anything damaged, so a bad copy on the phone can't stop the app from opening.
      const hymns: ContentCache['hymns'] = {};
      for (const [number, h] of Object.entries(saved.hymns ?? {})) if (h === null || isHymn(h)) hymns[Number(number)] = h;
      const pages: ContentCache['pages'] = {};
      for (const [slug, p] of Object.entries(saved.pages ?? {}))
        if (typeof p?.title === 'string' && typeof p.body === 'string') pages[slug] = p;
      return { hymns, pages, since: typeof saved.since === 'string' ? saved.since : null };
    }
  } catch {
    // A damaged cache only costs a full download on the next sync.
  }
  return { hymns: {}, pages: {}, since: null };
}

export function writeCache(cache: ContentCache) {
  storage.set(KEY, JSON.stringify(cache));
}

export function clearCache() {
  writeCache({ hymns: {}, pages: {}, since: null });
}
