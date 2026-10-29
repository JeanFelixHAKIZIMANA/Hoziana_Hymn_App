import { useEffect, useState } from 'react';

import { mediaUrl, supabase, type PageRow } from './supabase';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIDE = 2400;

// Redraws the photo as a fresh JPEG: drops camera metadata such as GPS location (the photo is
// public), applies the camera's rotation, and scales very large photos down.
async function reencode(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; // transparent PNG areas become white, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.88),
  );
}

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
    if (!PHOTO_TYPES.includes(file.type)) return setStatus({ kind: 'error', text: 'Choose a JPG, PNG or WebP photo.' });
    setBusy(true);
    const photo = await reencode(file).catch(() => null);
    if (!photo) {
      setBusy(false);
      return setStatus({ kind: 'error', text: 'That photo couldn’t be read. Try another one.' });
    }
    if (photo.size > 5 * 1024 * 1024) {
      setBusy(false);
      return setStatus({ kind: 'error', text: 'That photo is over 5 MB. Choose a smaller one.' });
    }
    // A new name each time, so phones never show an old cached photo.
    const name = file.name.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').slice(0, 60);
    const path = `about/${Date.now()}-${name || 'photo'}.jpg`;
    const { error } = await supabase.storage.from('media').upload(path, photo, { contentType: 'image/jpeg' });
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
                  accept="image/jpeg,image/png,image/webp"
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
