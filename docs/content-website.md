# Content website

Choir editors can change hymns and the About page (text and photo) on a small
website. Phones download the changes the next time the app opens and keep a copy,
so the app still works offline. If nothing is set up, the app simply uses the
hymns it ships with.

The data lives in a free [Supabase](https://supabase.com) project. The website
in `admin/` is plain static files, hosted for free on [Vercel](https://vercel.com).

## 1. Create the Supabase project (once)

1. Sign up at supabase.com and create a new project. Any name and region work;
   pick a region close to Rwanda (e.g. Frankfurt). Keep the database password somewhere safe.
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, and press **Run**.
3. Open another query, paste all of `supabase/seed.sql`, and press **Run**.
   This loads the 136 hymns and the About page. (Running it again changes nothing.)
4. **Authentication → Sign In / Providers**: turn off **Allow new users to sign up**.
   Editors are added by hand, so nobody else can create an account.

## 2. Add editors

For each person who should edit:

1. **Authentication → Users → Add user → Create new user**. Enter their email and a
   password, and tick **Auto confirm user**.
2. In the SQL Editor, run (with their email):

   ```sql
   insert into public.editors (user_id, email)
   select id, email from auth.users where email = 'editor@example.com';
   ```

To remove an editor, delete the row from `editors` (Table Editor) or delete the user.

## 3. Connect the app

The app and the website read the project URL and its **publishable** key from
`.env` (app) and `admin/.env` (website). Both are already filled in for the
Hoziana project (`iellhbnzlofqbjqdsmro`). For a different project, copy the values
from **Project Settings → API Keys** into both files.

The publishable key is meant to be public: the rules in `schema.sql` only let
signed-in editors change anything. Never put the secret (service role) key in
either file. `.env` is committed so EAS builds pick it up too.

## 4. Run the website

On your laptop:

```bash
cd admin
npm install
npm run dev                  # opens on http://localhost:5173
```

To put it online, in Vercel: **Add New → Project**, import the GitHub repo, set
**Root Directory** to `admin`, and deploy (it reads `admin/.env`). Every push to `main` redeploys it.

## Editing lyrics

The editor shows each hymn as text, with a live preview of how phones will show it:

```
# Verse 1
Umunsi umwe isi izahinda umushyitsi
Umwami w’abami nagaruka

Gabo: Icyo gihe kizaba ari igihe /2
Bose: Benshi bazajarajara bashaka ijambo ry’Imana baribure /2

# Refrain
...
```

- `# Verse 1`, `# Refrain`, `# Spoken` start a stanza; `# Verse 1 (continued)`
  continues a verse after a spoken passage.
- `Gore:`, `Bose:`, `Gabo:`, `Basse:`, `Solo:` (and `Mume:`, `Mke:`, `Wote:`) mark parts.
- `/2` at the end of a line repeats it.
- An empty line inside a stanza adds a little space before the next section.
- `[Refrain] first words…` is a cue to sing the refrain.

Hymns can be hidden from the app (**Hide from app**) but are never deleted.

## Good to know

- Once the database is in use, it is the source of truth. `scripts/parse_hymnal.py`
  and `src/data/hymns.json` are only the starting copy that ships inside the app;
  regenerate `supabase/seed.sql` (`npm run build:seed`) only for a fresh project.
- Supabase pauses free projects after about a week with no activity. Phones opening
  the app keep it active. If it is ever paused, the app keeps working with its saved
  copy; resume the project from the Supabase dashboard.
- `npm run check:hymn-text` checks that every hymn survives the editor's text format unchanged.
- Editors are signed out after 60 minutes with no mouse, keyboard, scroll or touch
  activity, counted across all open tabs and including time the computer was asleep.
  A warning appears five minutes before. Change `IDLE_LIMIT_MS` in `admin/src/idle.ts`
  to adjust it.
