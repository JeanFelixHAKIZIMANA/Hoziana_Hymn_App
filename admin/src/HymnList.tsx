import { useEffect, useMemo, useState } from 'react';

import { supabase, type HymnRow } from './supabase';

type Item = Pick<HymnRow, 'number' | 'title' | 'volume' | 'hidden' | 'updated_at'>;

export function HymnList() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    supabase
      .from('hymns')
      .select('number, title, volume, hidden, updated_at')
      .order('number')
      .then(({ data, error }) => (error ? setError(error.message) : setItems(data)));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!items || !q) return items;
    return items.filter((h) => String(h.number).startsWith(q) || h.title.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <main>
      <div className="pagehead">
        <div>
          <h1>Hymns</h1>
          <p className="muted">{items ? `${items.length} hymns` : 'Loading…'}</p>
        </div>
        <a className="button primary" href="#/hymns/new">
          New hymn
        </a>
      </div>
      <input
        className="search"
        placeholder="Search by number or title"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {error ? <p className="error">{error}</p> : null}
      <ul className="card list">
        {shown?.map((h) => (
          <li key={h.number}>
            <a href={`#/hymns/${h.number}`}>
              <span className="num">{h.number}</span>
              <span className="title">{h.title}</span>
              {h.hidden ? <span className="tag">Hidden</span> : null}
              <span className="muted small">Volume {h.volume ?? '–'}</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
