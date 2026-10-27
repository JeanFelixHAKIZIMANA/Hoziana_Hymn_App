import { useEffect, useState } from 'react';

import { mediaUrl, supabase, type PageRow } from './supabase';

export function AboutEditor() {
  const [page, setPage] = useState<PageRow | null>(null);
  const [saved, setSaved] = useState('');
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from('pages')
      .select('slug, title, body, image_path')
      .eq('slug', 'about')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return setStatus({ kind: 'error', text: error.message });
        const p = data ?? { slug: 'about', title: 'About Hoziana choir', body: '', image_path: null };
        setPage(p);
        setSaved(JSON.stringify(p));
      });
  }, []);

  if (!page) return <main>{status ? <p className="error">{status.text}</p> : <p className="muted">Loading…</p>}</main>;

  const write = async (next: PageRow) => {
    setBusy(true);
    setStatus(null);
    const { error } = await supabase.from('pages').upsert(next);
    setBusy(false);
    if (error) {
      setStatus({ kind: 'error', text: error.message });
      return false;
    }
    setPage(next);
    setSaved(JSON.stringify(next));
    setStatus({ kind: 'ok', text: 'Saved. Phones get the change the next time the app opens.' });
    return true;
  };

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) return setStatus({ kind: 'error', text: 'Choose an image file (JPG or PNG).' });
    if (file.size > 5 * 1024 * 1024) return setStatus({ kind: 'error', text: 'That photo is over 5 MB. Choose a smaller one.' });
    setBusy(true);
    // A new name each time, so phones never show an old cached photo.
    const path = `about/${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;
    const { error } = await supabase.storage.from('media').upload(path, file, { contentType: file.type });
    setBusy(false);
    if (error) return setStatus({ kind: 'error', text: error.message });
    const old = page.image_path;
    if (await write({ ...page, image_path: path })) {
      if (old) supabase.storage.from('media').remove([old]);
    }
  };

  const removePhoto = async () => {
    const old = page.image_path;
    if (await write({ ...page, image_path: null })) {
      if (old) supabase.storage.from('media').remove([old]);
    }
  };

  const dirty = JSON.stringify(page) !== saved;

  return (
    <main className="editor">
      <div className="pagehead">
        <div>
          <h1>About page</h1>
          <p className="muted">Shown from Settings → About in the app.</p>
        </div>
        <div className="actions">
          <button className="primary" onClick={() => write(page)} disabled={busy || !dirty}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {status ? <p className={status.kind === 'ok' ? 'success' : 'error'}>{status.text}</p> : null}

      <div className="columns">
        <section className="stack">
          <div className="card stack">
            <label>
              Title
              <input value={page.title} onChange={(e) => setPage({ ...page, title: e.target.value })} />
            </label>
            <label>
              Text
              <textarea
                rows={12}
                value={page.body}
                onChange={(e) => setPage({ ...page, body: e.target.value })}
                placeholder="Leave an empty line between paragraphs."
              />
            </label>
          </div>
          <div className="card stack">
            <strong>Photo</strong>
            {page.image_path ? (
              <img className="photo" src={mediaUrl(page.image_path)} alt="" />
            ) : (
              <p className="muted">No photo yet. A landscape photo of the choir works best.</p>
            )}
            <div className="actions">
              <label className="button">
                {page.image_path ? 'Replace photo' : 'Upload photo'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={busy}
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                />
              </label>
              {page.image_path ? (
                <button onClick={removePhoto} disabled={busy}>
                  Remove photo
                </button>
              ) : null}
            </div>
            <p className="muted small">Photo changes are saved straight away.</p>
          </div>
        </section>
        <section>
          <h2 className="small muted">Preview</h2>
          <div className="phone">
            <h3 className="screen">{page.title}</h3>
            {page.image_path ? <img className="photo" src={mediaUrl(page.image_path)} alt="" /> : null}
            {page.body
              .split(/\n\s*\n/)
              .filter((p) => p.trim())
              .map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}
