import { createClient } from '@supabase/supabase-js';

import type { Stanza } from '../../src/data/hymnal-types';

export const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'missing',
);

export type HymnRow = {
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
  updated_at?: string;
};

export type PageRow = { slug: string; title: string; body: string; image_path: string | null; updated_at?: string };

export const mediaUrl = (path: string) => supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
