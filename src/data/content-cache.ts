import type { Hymn } from '../../shared/hymnal-types';
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
    if (raw) return JSON.parse(raw) as ContentCache;
  } catch {
    // A damaged cache only costs a full download on the next sync.
  }
  return { hymns: {}, pages: {}, since: null };
}

export function writeCache(cache: ContentCache) {
  storage.set(KEY, JSON.stringify(cache));
}
