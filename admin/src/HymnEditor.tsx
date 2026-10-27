import { useEffect, useMemo, useState } from 'react';

import { stanzasToText, textToStanzas } from '../../src/data/hymn-text';
import { Preview } from './Preview';
import { supabase, type HymnRow } from './supabase';

type Fields = Omit<HymnRow, 'stanzas' | 'updated_at'> & { lyrics: string };

const empty: Fields = {
  number: 0,
  title: '',
  key: null,
  scripture: null,
  volume: null,
  volume_year: null,
  author: null,
  year: null,
  credit: null,
  hidden: false,
  lyrics: '# Verse 1\n',
};

export function HymnEditor({ number }: { number: number | null }) {
  const isNew = number === null;
  const [fields, setFields] = useState<Fields | null>(null);
  const [saved, setSaved] = useState<string>('');
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) {
      // Suggest the number after the last hymn.
      supabase
        .from('hymns')
        .select('number')
        .order('number', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          const f = { ...empty, number: (data?.[0]?.number ?? 0) + 1 };
          setFields(f);
          setSaved(JSON.stringify(f));
        });
      return;
    }
    supabase
      .from('hymns')
      .select('*')
      .eq('number', number)
      .single()
      .then(({ data, error }) => {
        if (error) return setStatus({ kind: 'error', text: error.message });
        const { stanzas, updated_at: _, ...rest } = data as HymnRow;
        const f = { ...rest, lyrics: stanzasToText(stanzas) };
        setFields(f);
        setSaved(JSON.stringify(f));
      });
  }, [isNew, number]);

  const parsed = useMemo(() => textToStanzas(fields?.lyrics ?? ''), [fields?.lyrics]);
  const dirty = fields !== null && JSON.stringify(fields) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (!fields) return <main>{status ? <p className="error">{status.text}</p> : <p className="muted">Loading…</p>}</main>;

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields({ ...fields, [key]: value });
  const text = (key: 'title' | 'key' | 'scripture' | 'volume' | 'author' | 'credit') => ({
    value: fields[key] ?? '',
    onChange: (e: { target: { value: string } }) => set(key, key === 'title' ? e.target.value : e.target.value || null),
  });
  const int = (key: 'volume_year' | 'year') => ({
    value: fields[key] ?? '',
    onChange: (e: { target: { value: string } }) => set(key, e.target.value ? Number(e.target.value) : null),
  });

  const save = async (patch: Partial<Fields> = {}) => {
    const next = { ...fields, ...patch };
    if (!next.title.trim()) return setStatus({ kind: 'error', text: 'Give the hymn a title.' });
    if (parsed.errors.length) return setStatus({ kind: 'error', text: 'Fix the lyrics first (see the notes under them).' });
    setBusy(true);
    setStatus(null);
    const { lyrics, ...row } = next;
    const body = { ...row, title: row.title.trim(), stanzas: textToStanzas(lyrics).stanzas };
    const { error } = isNew
      ? await supabase.from('hymns').insert(body)
      : await supabase.from('hymns').update(body).eq('number', number);
    setBusy(false);
    if (error) {
      const taken = error.code === '23505';
      return setStatus({ kind: 'error', text: taken ? `Hymn ${row.number} already exists. Pick another number.` : error.message });
    }
    setFields(next);
    setSaved(JSON.stringify(next));
    setStatus({ kind: 'ok', text: 'Saved. Phones get the change the next time the app opens.' });
    if (isNew) location.hash = `#/hymns/${row.number}`;
  };

  return (
    <main className="editor">
      <div className="pagehead">
        <div>
          <a href="#/" className="back">
            ← All hymns
          </a>
          <h1>{isNew ? 'New hymn' : `${fields.number}. ${fields.title || 'Untitled'}`}</h1>
          {fields.hidden ? <p className="tag">Hidden from the app</p> : null}
        </div>
        <div className="actions">
          {!isNew ? (
            <button onClick={() => save({ hidden: !fields.hidden })} disabled={busy}>
              {fields.hidden ? 'Show in app' : 'Hide from app'}
            </button>
          ) : null}
          <button className="primary" onClick={() => save()} disabled={busy || (!dirty && !isNew)}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {status ? <p className={status.kind === 'ok' ? 'success' : 'error'}>{status.text}</p> : null}

      <div className="columns">
        <section className="stack">
          <div className="card grid">
            {isNew ? (
              <label>
                Number
                <input type="number" min={1} value={fields.number} onChange={(e) => set('number', Number(e.target.value))} />
              </label>
            ) : null}
            <label className="wide">
              Title
              <input {...text('title')} />
            </label>
            <label>
              Key
              <input {...text('key')} placeholder="e.g. Sol" />
            </label>
            <label>
              Scripture
              <input {...text('scripture')} placeholder="e.g. Yohana 14:6" />
            </label>
            <label>
              Volume
              <input {...text('volume')} placeholder="e.g. X" />
            </label>
            <label>
              Volume year
              <input type="number" {...int('volume_year')} />
            </label>
            <label>
              Author
              <input {...text('author')} />
            </label>
            <label>
              Year written
              <input type="number" {...int('year')} />
            </label>
            <label className="wide">
              Credit (as printed in the book)
              <input {...text('credit')} />
            </label>
          </div>

          <label className="card stack">
            Lyrics
            <textarea
              className="lyrics"
              spellCheck={false}
              value={fields.lyrics}
              onChange={(e) => set('lyrics', e.target.value)}
              rows={Math.max(16, fields.lyrics.split('\n').length + 2)}
            />
          </label>
          {parsed.errors.length ? (
            <ul className="error">
              {parsed.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
          <details className="card help">
            <summary>How to write lyrics</summary>
            <ul>
              <li>
                Start each stanza with a heading line: <code># Verse 1</code>, <code># Refrain</code> or{' '}
                <code># Spoken</code> (a reading).
              </li>
              <li>
                Write a part at the start of a line: <code>Gore: …</code>, <code>Bose: …</code>, <code>Gabo: …</code>,{' '}
                <code>Basse: …</code>, <code>Solo: …</code>.
              </li>
              <li>
                Add <code>/2</code> at the end of a line to repeat it twice.
              </li>
              <li>Leave an empty line inside a stanza to add a little space before the next section.</li>
              <li>
                <code>[Refrain] first words…</code> shows a cue to sing the refrain.
              </li>
              <li>
                After a spoken passage, continue a verse with <code># Verse 1 (continued)</code>.
              </li>
            </ul>
          </details>
        </section>

        <section>
          <h2 className="small muted">Preview</h2>
          <Preview title={fields.title} stanzas={parsed.stanzas} />
        </section>
      </div>
    </main>
  );
}
