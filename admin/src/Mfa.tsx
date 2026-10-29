import { useEffect, useState, type FormEvent } from 'react';

import { supabase } from './supabase';

// Second sign-in step (security audit H-1). After the password, every account needs a 6-digit code from an
// authenticator app; the first time, it sets one up. The database only accepts edits from sessions that passed
// this step (supabase/migrations/20261029110000_require_mfa.sql), so skipping this screen gains nothing.

type Level = 'checking' | 'enrol' | 'challenge' | 'done';

// Which step the signed-in session still needs.
export function useMfaLevel(signedIn: boolean, sessionKey: string | undefined): [Level, () => void] {
  const [level, setLevel] = useState<Level>('checking');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!signedIn) return setLevel('checking');
    let live = true;
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data, error }) => {
      if (!live) return;
      if (error || !data) return setLevel('challenge');
      if (data.currentLevel === 'aal2') setLevel('done');
      else setLevel(data.nextLevel === 'aal2' ? 'challenge' : 'enrol');
    });
    return () => {
      live = false;
    };
  }, [signedIn, sessionKey, tick]);
  return [level, () => setTick((t) => t + 1)];
}

const codeInput = (code: string, setCode: (c: string) => void) => (
  <label>
    6-digit code
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      required
      autoFocus
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
    />
  </label>
);

const signOut = (
  <button type="button" className="link" onClick={() => supabase.auth.signOut()}>
    Sign out
  </button>
);

export function MfaChallenge({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp[0];
    if (listError || !factor) {
      setError(listError?.message ?? 'No authenticator app is set up for this account.');
      return setBusy(false);
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    setBusy(false);
    if (error) {
      setError('That code didn’t work. Check the app shows “Hoziana editor” and try the newest code.');
      setCode('');
    } else onDone();
  };

  return (
    <main className="narrow login">
      <h1>Hoziana editor</h1>
      <p className="muted">Open your authenticator app and enter the 6-digit code for Hoziana editor.</p>
      <form onSubmit={submit} className="card stack">
        {codeInput(code, setCode)}
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" disabled={busy || code.length !== 6}>
          {busy ? 'Checking…' : 'Continue'}
        </button>
      </form>
      <p className="muted small">Lost your phone? Ask the project owner to reset your sign-in codes. {signOut}</p>
    </main>
  );
}

type Enrolment = { factorId: string; qr: string; secret: string };

export function MfaEnrol({ onDone }: { onDone: () => void }) {
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      // A setup that was started but never finished blocks a new one, so clear it first.
      const { data: list } = await supabase.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.factor_type === 'totp' && f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
        issuer: 'Hoziana editor',
      });
      if (!live) return;
      if (error || !data) return setError(error?.message ?? 'Couldn’t start the setup. Reload the page to try again.');
      // supabase-js hands back the SVG behind an unencoded data: prefix; encode it so a '#' in the SVG can't cut it short.
      const svg = data.totp.qr_code.replace(/^data:image\/svg\+xml;utf-8,/, '');
      const qr = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      setEnrolment({ factorId: data.id, qr, secret: data.totp.secret });
    })();
    return () => {
      live = false;
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!enrolment) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolment.factorId, code });
    setBusy(false);
    if (error) {
      setError('That code didn’t work. Wait for a new code in the app and try again.');
      setCode('');
    } else onDone();
  };

  return (
    <main className="narrow login">
      <h1>Set up sign-in codes</h1>
      <p className="muted">
        Editing the hymns now needs a code from an authenticator app as well as your password, so a stolen password
        alone can’t change what’s on everyone’s phone. You do this once.
      </p>
      <form onSubmit={submit} className="card stack">
        <p>
          1. Install an authenticator app on your phone (Google Authenticator, Microsoft Authenticator or 1Password),
          then scan this code with it.
        </p>
        {enrolment ? (
          <>
            <img className="qr" src={enrolment.qr} alt="QR code for your authenticator app" width={200} height={200} />
            <details>
              <summary>Can’t scan it?</summary>
              <p className="muted small">Type this key into the app instead:</p>
              <code className="secret">{enrolment.secret}</code>
            </details>
          </>
        ) : error ? null : (
          <p className="muted">Preparing…</p>
        )}
        <p>2. Enter the 6-digit code the app shows for Hoziana editor.</p>
        {codeInput(code, setCode)}
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" disabled={busy || !enrolment || code.length !== 6}>
          {busy ? 'Checking…' : 'Finish setup'}
        </button>
      </form>
      <p className="muted small">{signOut}</p>
    </main>
  );
}
