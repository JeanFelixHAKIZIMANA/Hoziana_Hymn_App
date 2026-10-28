import { useState, type FormEvent } from 'react';

import { clearIdleReason, signedOutForIdle, touchActivity } from './idle';
import { supabase } from './supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idle] = useState(signedOutForIdle);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // Start the idle clock fresh, or an old timestamp would sign the editor straight back out.
    touchActivity();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else clearIdleReason();
    setBusy(false);
  };

  return (
    <main className="narrow login">
      <h1>Hoziana editor</h1>
      <p className="muted">Sign in to edit the hymns and the About page in the app.</p>
      {idle ? <p className="notice">You were signed out after an hour of inactivity. Sign in again to continue.</p> : null}
      <form onSubmit={submit} className="card stack">
        <label>
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
