import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { AboutEditor } from './AboutEditor';
import { HymnEditor } from './HymnEditor';
import { HymnList } from './HymnList';
import { Login } from './Login';
import { configured, supabase } from './supabase';

// Routes live in the URL hash so the site can be hosted as static files anywhere.
function useRoute() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return hash.replace(/^#\/?/, '').split('/');
}

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [editor, setEditor] = useState<boolean | undefined>(undefined);
  const route = useRoute();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return setEditor(undefined);
    supabase
      .from('editors')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setEditor(Boolean(data)));
  }, [session]);

  if (!configured) {
    return (
      <main className="narrow">
        <h1>Hoziana editor</h1>
        <p className="notice">
          This site isn’t connected to a database yet. Copy <code>.env.example</code> to <code>.env.local</code> and fill
          in the Supabase URL and anon key (see <code>docs/content-website.md</code>).
        </p>
      </main>
    );
  }
  if (session === undefined) return null;
  if (!session) return <Login />;

  const [section, id] = route;
  return (
    <>
      <header className="topbar">
        <a href="#/" className="brand">
          Hoziana <span>editor</span>
        </a>
        <nav>
          <a href="#/" className={section !== 'about' ? 'active' : ''}>
            Hymns
          </a>
          <a href="#/about" className={section === 'about' ? 'active' : ''}>
            About page
          </a>
        </nav>
        <div className="who">
          <span>{session.user.email}</span>
          <button className="link" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>
      {editor === false ? (
        <main className="narrow">
          <p className="notice">
            You’re signed in, but this account isn’t an editor yet. Ask the project owner to add{' '}
            <strong>{session.user.email}</strong> to the editors list.
          </p>
        </main>
      ) : editor === undefined ? null : section === 'about' ? (
        <AboutEditor />
      ) : section === 'hymns' && id ? (
        <HymnEditor key={id} number={id === 'new' ? null : Number(id)} />
      ) : (
        <HymnList />
      )}
    </>
  );
}
