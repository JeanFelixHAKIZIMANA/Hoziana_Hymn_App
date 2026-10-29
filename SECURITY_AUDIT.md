# Security audit: Hoziana hymnal app, content website and Supabase

Audited 2026-10-28 against `main` at `84a44b7`. Standards: OWASP ASVS L2, MASVS, Top 10.
Status (2026-10-29): **Phase 3 done for the approved set.** Approved: fix 7 using an EC (P-256) signing key,
plus safe fixes 1, 3, 4, 6, 8, 9 and 10. On hold: fix 2 (sign-in codes) and fix 5 (website headers).
The four database migrations were run on the live project by stark on 2026-10-29 and checked read-only
afterwards (see "Live check" below). APKs are signed with the choir's EC key (CI run #15).

## Finding status

| ID | Status | What changed |
|---|---|---|
| H-1 | **Deferred** (on hold) | Needs MFA in the website first, then an `aal2` rule. Waiting for your go-ahead. |
| H-2 | **Fixed** (app) / **Fixed** (DB) | `shared/hymn-validate.ts`; `src/data/content.ts`, `content-cache.ts`, `hymnal.ts`: bad rows skipped, bad saved copy dropped, startup falls back to the shipped book. `supabase/migrations/20261029100000_content_checks.sql`. |
| M-1 | **Fixed** | `20261029100100_edit_history_and_policies.sql`: `content_revisions` history, insert/update policies only, no delete. How to undo an edit: `docs/content-website.md`. |
| M-2 | **Fixed** | `plugins/with-release-signing.js` + `.github/workflows/android-apk.yml`: EC P-256 key from secrets, build fails without it and refuses a debug-signed APK. Steps: `docs/android-signing.md`. |
| M-3 | **Deferred** (on hold) | Waiting for your go-ahead to add `admin/vercel.json` and check it on a preview. |
| M-4 | **Fixed** | `20261029100200_media_bucket_limits.sql`: 5 MB, JPEG/PNG/WebP. Also lets editors see the bucket, so "remove old photo" actually deletes it. |
| L-1 | **Fixed** | `20261029100300_tighten_grants.sql`. |
| L-2 | **Fixed** | `(select auth.uid())`, per-operation policies, `updated_by` indexes. |
| L-3 | **Accepted** (free plan) | Leaked-password protection needs the Supabase Pro plan. stark confirmed 2026-10-29: sign-ups off, anonymous sign-ins off, email confirmation on. Covered instead by long unique editor passwords and, later, MFA (H-1). Turn it on if the project moves to Pro. |
| L-4 | **Fixed** (website) / **Fixed** (policy) | `admin/src/AboutEditor.tsx` re-encodes photos to JPEG (EXIF/GPS removed, max 2400 px); update policy has `with check`. |
| L-5 | **Fixed** | `app.json`: `allowBackup: false`; `SYSTEM_ALERT_WINDOW` and storage permissions removed (checked in the generated manifest). |
| L-6 | **Fixed** | `src/app/hymn/[number].tsx`: the back label from a link is shown only if it's one of the app's screen names. |
| L-7 | **Deferred** | Forcing zod 4 into Expo's CLI risks breaking `expo start`, for an advisory that only affects the dev server on your laptop. The audit job fails on Critical for the app until Expo ships the patch. |
| L-8 | **Partly fixed** | APK workflow: read-only token except the release job, stale branch removed. Actions are still pinned by version tag, not commit SHA; Dependabot (`.github/dependabot.yml`) now keeps them updated. |
| L-9 | **Fixed** | `.github/workflows/security.yml` runs gitleaks on every push and PR (`.gitleaks.toml` only exempts publishable keys). Also turn on push protection (action 13). |

**Verification (Phase 4, 2026-10-29).** Type-check and lint are clean. `check:hymn-text` passes for 136/136 hymns,
and the new `check:content` accepts all 136 hymns and rejects 12 kinds of damaged rows. The website builds. RLS
tests: 48 role checks and one database check pass on Postgres 16 with all migrations applied twice. The same tests fail against the old
schema, as expected. `npm audit`: website 0; app unchanged (3 High / 5 Low in Expo's CLI, L-7). Secret scan of
the full history found no secrets. The APK build was verified in CI: run #15 signed it with
`CN=Hoziana Choir, C=RW` (apksigner v2), not the debug key. Not verified here: Semgrep, because its rule registry is
blocked here. On the PR, CI ran everything green: gitleaks clean, Semgrep 0 findings on 74 rules (the job now
fails on any new finding), RLS tests pass on GitHub's Postgres, dependency audit passes.

**Live check (2026-10-29, after the migrations, read-only).** On project `iellhbnzlofqbjqdsmro`:
all 8 check constraints exist on `hymns` and `pages`; `content_revisions` exists with the `hymns_history` and
`pages_history` triggers; `hymns` and `pages` have only read, insert and update policies (no delete);
`content_revisions` is readable by editors only; the `media` bucket is limited to 5 MB and JPEG/PNG/WebP and has
select, insert, update and delete policies for editors; both `updated_by` indexes exist. Security advisor: only
`auth_leaked_password_protection` remains (L-3, manual action 2). Performance advisor: the earlier
`unindexed_foreign_keys`, `auth_rls_initplan` and `multiple_permissive_policies` warnings are gone; the only notes
are "unused index" on the four new indexes, which is expected because they were just created.

## Executive summary

The setup is in good shape. There are no secrets in the code or git history (both Supabase keys are
**publishable** keys), RLS is on for every table, the editor check lives in a non-exposed schema with a
locked `search_path`, there are no views, RPC functions, edge functions, realtime channels, or GraphQL,
and React escapes everything (no `dangerouslySetInnerHTML`). The phone app has no sign-in at all, so most of
the mobile session checks don't apply.

The real risks are about **what happens if the one editor account is misused or makes a mistake**: every
edit goes straight to every phone, with no second factor, no history and no validation.

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 2 |
| Medium | 4 |
| Low | 9 |

**Top 5 risks**

1. **H-1** The only account that can rewrite every hymn on every phone is protected by a password alone (no MFA).
2. **H-2** One malformed hymn row (bad edit, bug, or attacker) makes the app crash on every launch on every phone, permanently, until reinstalled.
3. **M-1** No edit history: a bad or malicious edit can't be seen or undone, and hymns can be hard-deleted through the API.
4. **M-2** Test APKs in the public GitHub Releases are signed with Android's public debug key, so anyone can build a fake "update" that installs over the real app.
5. **M-3** The content website sends no security headers (no CSP, clickjacking protection), and the editor session lives in localStorage.

## Fix plan (in order)

"Safe" means no change to how anything works for you or the phones. "Risky" needs your OK because it
changes a flow or could lock you out if done in the wrong order.

| # | Finding | Fix | Type |
|---|---|---|---|
| 1 | H-2 | App: validate each downloaded row and drop bad ones; if the saved copy can't be loaded, discard it and fall back to the built-in hymns. DB: `check` constraints on `stanzas` (must be an array) and sane `number`/`year` ranges. | Safe |
| 2 | H-1 | Website: add an authenticator-app (TOTP) step to sign-in, with a one-time enrolment screen. Then a migration that makes editor writes require `aal2`. | **Risky**: you must enrol your authenticator before the migration runs, or you're locked out of editing. I'd ship it in two steps. |
| 3 | M-1 | Migration: `hymn_revisions` / `page_revisions` tables filled by a trigger (who, when, old row, new row), readable only by editors; replace the `for all` policies with separate insert/update policies and **no delete** policy. | Safe (the website never deletes; the Supabase dashboard is unaffected) |
| 4 | M-4, L-4 | Migration: `media` bucket limited to 5 MB and `image/jpeg, image/png, image/webp`; add `with check` to the storage update policy. Website: re-encode photos in the browser before upload, which also strips EXIF/GPS. | Safe |
| 5 | M-3 | `admin/vercel.json` with CSP, HSTS, `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy. | **Risky (mild)**: a too-strict CSP can blank the site. I'd check it on a Vercel preview first. |
| 6 | L-1, L-2 | Migration: revoke `TRUNCATE/TRIGGER/REFERENCES` and all writes from `anon`; `(select auth.uid())` in policies; index the two `updated_by` foreign keys. | Safe |
| 7 | M-2 | CI signs APKs with your own keystore from GitHub secrets (or switch testers to EAS preview builds). | **Risky**: testers must uninstall the current test app once, because the signature changes. Needs you to create the keystore secret. |
| 8 | L-5, L-6 | `app.json`: `android.allowBackup: false`, block unused permissions (`SYSTEM_ALERT_WINDOW`, storage). Allow-list the `from` deep-link param. | Safe |
| 9 | L-7, L-8, L-9 | CI: pin actions to commit SHAs, narrow token permissions, drop the stale branch trigger, add a security workflow (gitleaks, `npm audit`, Semgrep). `npm` override for `zod` if Expo still compiles. | Safe |
| 10 | — | RLS test script that calls the API as anon, a signed-in non-editor, and the editor, and proves only the editor can write. | Safe (needs a throwaway non-editor test user, see manual actions) |

## Manual actions for you

Nothing here can be done from code. None of these were changed by me.

**Run the new migrations** (approved fixes; I didn't touch the live database)
0. ~~Run the four files in `supabase/migrations/` in the SQL editor.~~ Done 2026-10-29. Future database
   changes go in new files there, run in name order.

**Android signing key** (fix 7)
0b. ~~Create the EC key and add the three `HOZIANA_*` secrets.~~ Done 2026-10-29. Still to do: delete the
    plaintext password file next to the key, keep the key and password only in a password manager or encrypted
    backup, and have testers uninstall the old build once.

**Supabase dashboard** (project `iellhbnzlofqbjqdsmro`)
1. ~~Confirm **Allow new users to sign up** is off.~~ Done 2026-10-29 (screenshot from stark).
2. ~~Leaked password protection~~: needs the Pro plan, accepted for now (L-3). Editors should use long, unique passwords from a password manager. Sign-ups, anonymous sign-ins and email confirmation were checked 2026-10-29 and are set correctly.
3. Authentication → Multi-Factor: make sure **TOTP** is enabled (needed for fix 2).
4. Authentication → Attack Protection: consider **CAPTCHA** (Turnstile) on sign-in. Optional for a single editor; the built-in rate limits already apply.
5. ~~Authentication → URL Configuration: Site URL `https://hoziana-hymn-app.vercel.app`, and remove any wildcard redirect URLs.~~ Done 2026-10-29 (stark; website sign-in still works).
6. Database → Settings: turn on **Enforce SSL**. Network restrictions are optional (the phones need public access to the API, not the database port).
7. Backups: the free plan has daily backups only, no PITR. The revision tables in fix 3 cover content recovery.
8. Your Supabase **account**: turn on MFA for your login to supabase.com (Account → Security). Whoever holds this account holds everything.

**Vercel**
9. ~~Settings → Deployment Protection: turn on **Vercel Authentication** for preview deployments.~~ Done 2026-10-29 (stark).
10. Settings → Environment Variables: nothing secret is needed today; if you ever add one, mark it **Sensitive** and scope it to Production.
11. ~~Your Vercel account: turn on MFA.~~ Done 2026-10-29 (stark).

**GitHub**
12. ~~Your GitHub account: confirm 2FA is on.~~ Done 2026-10-29 (stark).
13. ~~Settings → Code security: turn on **Secret scanning**, **Push protection** and **Dependabot alerts**.~~ Done 2026-10-29 (stark).
14. ~~Settings → Branches: protect `main` (require a pull request).~~ Done 2026-10-29 (verified: `main` shows as protected).
15. ~~Create the release keystore and add it as repository secrets.~~ Done 2026-10-29 (see 0b). **Back the keystore up**: losing it means testers must reinstall again.

---

## Phase 0: Discovery

- **Layout**: one public repo. Expo app at the root (`src/`), content website in `admin/`, shared hymn types and text format in `shared/`, database in `supabase/schema.sql` + `supabase/seed.sql` (no `supabase/migrations/` yet; the live project has no recorded migrations, the schema was run by hand in the SQL editor).
- **Mobile**: Expo SDK 58, managed workflow (CNG; `android/` and `ios/` are generated and ignored), **expo-router**, Hermes on, R8 minify on in release (Expo default for this SDK). `eas.json` has `preview` (internal APK) and `production` profiles. **expo-updates is not installed.**
- **Website**: **Vite 8 + React 19 single-page app**, not Next.js. Static files on Vercel (root dir `admin`), hash routes, no server code, no API routes, no Server Actions.
- **Supabase**: tables `public.hymns` (136 rows), `public.pages` (1), `public.editors` (1); function `private.is_editor()` (security definer); trigger function `public.touch()`; triggers `hymns_touch`, `pages_touch`; public bucket `media` (1 object). No views, no RPC-style functions, no edge functions, no realtime publications, `pg_graphql` not installed. Auth: email + password only, used only by the website.
- **Clients and keys**:
  - App (`src/data/content.ts`): no Supabase client; plain `fetch` to PostgREST with `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` (a `sb_publishable_` key). Read-only, no session.
  - Website (`admin/src/supabase.ts`): `createClient` with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (also `sb_publishable_`). Default options: session in localStorage.
- **Roles**: one role, "editor" = a row in `public.editors`. Checked in RLS via `private.is_editor()` and, for UI only, by the website reading its own `editors` row.
- **Env and CI**: `.env` and `admin/.env` are **committed on purpose** (publishable values only; `.gitignore` ignores `.env*.local`). `.github/workflows/android-apk.yml` builds a release APK and publishes it as a public pre-release. Lockfiles committed for both packages.
- **Supabase MCP**: available; used **read-only** (advisors, table list, extensions, edge functions, one `select` over `pg_policies`, `pg_proc`, grants, buckets, constraints).

## Phase 1: Findings

### High

**H-1 · High · Editor account is single-factor; RLS doesn't require MFA**
Where: `supabase/schema.sql:41-44` (`private.is_editor`), policies `editors write hymns` / `editors write pages`; `admin/src/Login.tsx:20`.
What: Writing hymns and pages needs only a password session. No MFA exists in the website and RLS doesn't check `aal`.
Exploit: A phished or reused password lets anyone rewrite or blank all 136 hymns, and the change reaches every phone on its next launch.
Fix: TOTP enrolment and challenge in the website (`supabase.auth.mfa.*`), then `private.is_editor()` (or the write policies) also require `(select auth.jwt()->>'aal') = 'aal2'`.

**H-2 · High · Malformed content crash-loops the app on every phone**
Where: `src/data/content.ts:72-75` (rows used without validation), `src/data/hymnal.ts:119` (`applyContent(readCache().hymns)` at module load), `:60` (`hymn.stanzas.flatMap(... s.lines.map ...)`); DB has no constraints on `stanzas` (`supabase/schema.sql:14`).
What: Whatever the API returns is cached and then applied at startup. If `stanzas` isn't an array of `{lines: [...]}` (a bad edit, a bug, or a deliberate write), the app throws before the first screen, every launch, with the bad copy saved on the device.
Exploit: One `update hymns set stanzas = '{}'` from a compromised editor session (or a typo in the dashboard) bricks the app for every user until they reinstall.
Fix: Validate each row in `syncContent` and skip invalid ones; wrap the startup `applyContent` so a bad cache is discarded; DB `check (jsonb_typeof(stanzas) = 'array')` plus range checks.

### Medium

**M-1 · Medium · No change history, and hymns can be hard-deleted**
Where: policies `editors write hymns`/`pages` are `for all` (`supabase/schema.sql:66,71`); `touch()` keeps only the last `updated_by`.
What: There's no record of what changed or who changed it, and `for all` also allows `DELETE`, although the design says hymns are only ever hidden.
Exploit: A bad edit or a mass delete can't be traced or reverted except from the 136-hymn seed.
Fix: Revision tables written by trigger, readable by editors only; per-operation policies with no `delete` on `hymns`. (OWASP A09.)

**M-2 · Medium · Public test APKs are signed with the public Android debug key**
Where: `.github/workflows/android-apk.yml:46-49` (prebuild template's `signingConfig signingConfigs.debug` for release), releases published publicly (repo is public).
What: The debug keystore is the same well-known file in every React Native template.
Exploit: Someone builds a modified "Hoziana" APK signed with the same key; Android accepts it as an update over the real one on any tester's phone.
Fix: Sign with your own keystore from GitHub secrets via a small config plugin or a gradle step, or distribute through EAS preview builds (EAS manages the key).

**M-3 · Medium · Content website has no security headers**
Where: no `admin/vercel.json`; `admin/index.html`. (I couldn't fetch the live site from here; this is inferred from the repo. Vercel adds HSTS by default but nothing else.)
What: No CSP, no `frame-ancestors`/`X-Frame-Options`, no `Referrer-Policy`/`Permissions-Policy`. The Supabase session (access + refresh token) is in localStorage, so any future XSS (for example via a compromised npm package) can take it.
Exploit: The editor page can be framed by another site for clickjacking; a script injection would read the refresh token and keep editor access.
Fix: `vercel.json` headers with a CSP limited to `'self'`, Google Fonts, and the Supabase project URL. Cookie-based sessions (`@supabase/ssr`) need a server and aren't worth it for this static site; MFA (H-1) plus CSP is the better trade.

**M-4 · Medium · `media` bucket has no size or file-type limits**
Where: live bucket `media` (`file_size_limit` none, `allowed_mime_types` any); only client-side checks in `admin/src/AboutEditor.tsx:44-45`.
What: The 5 MB and image-only checks run in the browser and can be skipped with a direct API call.
Exploit: A stolen editor session uploads large files to exhaust the free 1 GB storage, or HTML/SVG files served from the project's public storage URL.
Fix: Set bucket limits in a migration (5 MB; JPEG/PNG/WebP).

### Low

**L-1 · Low · Broad table grants to `anon` and `authenticated`**
Where: live grants on `hymns`, `pages`, `editors` (Supabase defaults: `INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES` to `anon`).
What: RLS is the only barrier; `TRUNCATE` isn't covered by RLS (not reachable through the REST API today, but it's defence in depth).
Fix: Revoke all from `anon`/`authenticated`, then grant `select` on `hymns`/`pages` to both, `insert, update` on `hymns`/`pages` and `select` on `editors` to `authenticated`.

**L-2 · Low · Policy uses bare `auth.uid()`; duplicate permissive policies**
Where: `editors see themselves` (`supabase/schema.sql:74`); `for all` + `select` policies overlap on `hymns`/`pages` (Performance Advisor).
Fix: `(select auth.uid())`; per-operation policies (done together with M-1).

**L-3 · Low · Leaked-password protection is off**
Where: Supabase Auth setting (Security Advisor `auth_leaked_password_protection`).
Fix: Manual action 2.

**L-4 · Low · Storage update policy has no `with check`; photos keep EXIF**
Where: `editors change media` (`supabase/schema.sql:83`); `admin/src/AboutEditor.tsx:49`.
What: Update rows aren't re-checked after the change; uploaded phone photos keep GPS metadata, and they're public.
Fix: Add `with check (bucket_id = 'media' and private.is_editor())`; re-encode through a canvas before upload.

**L-5 · Low · Android backup on, unused permissions**
Where: generated manifest from `app.json`: `android:allowBackup="true"`, `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`.
What: Favourites and settings aren't sensitive, so this is hygiene. The permissions aren't used by anything in the app.
Fix: `"allowBackup": false` and `"blockedPermissions": [...]` in `app.json`.

**L-6 · Low · Deep-link `from` param shown unfiltered**
Where: `src/app/hymn/[number].tsx:33,37` (`from` becomes the back-button label).
What: `hoziana://hymn/1?from=...` from any website or app shows arbitrary text in the app's back button. No action is triggered; it's a spoofing nuisance only.
Fix: Accept only the known screen labels.

**L-7 · Low · Build-tool dependency advisories**
Where: root `package-lock.json`. `npm audit`: 3 High, 5 Low, all inside `@expo/cli`/`@expo/config` (`zod <4.6.6`, GHSA-mrhx-c7xc-m3w5; `deepmerge`, GHSA-gcqx-w48m-w2h4). `admin/`: 0 vulnerabilities.
What: These run on your laptop and in CI, not in the app or the website. npm's suggested "fix" (downgrade to Expo 51) is wrong.
Fix: `overrides: { "zod": "^4.6.6" }` if Expo still builds, otherwise wait for the next Expo patch.

**L-8 · Low · CI hardening**
Where: `.github/workflows/android-apk.yml`: actions pinned by tag (`softprops/action-gh-release@v2` is third-party), `contents: write` for the whole job (including `npm ci` install scripts), push trigger still lists the old branch `claude/project-thread-if83et`.
Fix: Pin to commit SHAs, give write only to the release step's job, remove the stale branch.

**L-9 · Low · Committed `.env` files in a public repo**
Where: `.env`, `admin/.env` (tracked on purpose; values are publishable keys, verified by prefix without printing).
What: Fine today, but a secret added there later would be published instantly.
Fix: A gitleaks job in CI plus GitHub push protection (manual action 13).

### Checklist results

**A. Secrets and config**
- Service-role / secret key anywhere: **Pass.** None in code or `.env`; history scan for `sb_secret_`, `service_role`, `SUPABASE_SERVICE`, `sk_live/sk_test`, private-key headers and JWTs across all 20 commits found nothing. (gitleaks isn't installed here; pattern grep used.)
- Other secrets in `EXPO_PUBLIC_*`/`VITE_*`: **Pass.** Only URL and publishable key.
- `.env` tracked: deliberate, publishable only (L-9).
- Third-party keys from the client: **N/A**, no third-party APIs.

**B. Database and RLS**
- RLS on every exposed table: **Pass** (`hymns`, `pages`, `editors`).
- Per-operation policies / `using (true)`: `using (true)` only on public-read `select` of hymns and pages, which is intended. `for all` on writes (M-1).
- `WITH CHECK` / ownership spoofing: **Pass.** Writes check `is_editor()`; `updated_by` is forced by the `touch()` trigger, so it can't be spoofed. `editors` has no insert/update/delete policies, so nobody can add themselves.
- `(select auth.uid())`: one bare use (L-2).
- `user_metadata` for authorization: **Pass**, not used. Roles come from the `editors` table.
- Admin writes need `aal2`: **Fail** (H-1).
- Views: **N/A**, none.
- Security definer: `private.is_editor()` has `search_path = ''`, lives in an unexposed schema, `execute` revoked from `public`/`anon`. **Pass.**
- Public functions as RPC: `public.touch()` returns `trigger`, so it can't be called through RPC. **Pass.**
- `pg_graphql`: **Pass**, not installed.
- Advisors. Security: `auth_leaked_password_protection` (L-3). Performance: `unindexed_foreign_keys` on `hymns.updated_by`, `pages.updated_by` (fix 6); `auth_rls_initplan` on `editors` (L-2); `multiple_permissive_policies` on `hymns`, `pages` (L-2).

**C. Storage, Realtime, Edge Functions**
- Bucket visibility: `media` is public, which is right (About photo shown in the app). Not listable (no `select` policy on `storage.objects`).
- Storage policies: editor-only insert/update/delete. **Pass**, except L-4.
- MIME/size limits: **Fail** (M-4).
- Signed URLs: **N/A**, no private files.
- Realtime: **N/A**, not used, no publication tables.
- Edge Functions: **N/A**, none deployed.

**D. Auth (code side)**
- PKCE: **N/A**, password sign-in only, no OAuth or magic links.
- Redirect allowlist / open redirects: **N/A**, the website has no redirect params (hash routes only).
- Account enumeration: **Pass.** Sign-in shows Supabase's generic "Invalid login credentials"; there's no sign-up or reset form.

**E. React Native / Expo**
- Session storage, client options, AppState refresh: **N/A**, the app has no sign-in or sessions; it reads public content with the publishable key.
- Deep links: scheme `hoziana` routes to read-only screens; params are parsed as numbers or looked up in a fixed list; nothing privileged. One cosmetic issue (L-6). Universal links not needed until there's something to protect.
- expo-updates code signing: **N/A**, expo-updates isn't installed. (If you add OTA updates later, turn on code signing then.)
- Release build: Hermes on, R8 minify on, cleartext allowed only in the debug manifest. `console.*` isn't used anywhere in `src/`, so the remove-console plugin isn't needed. **Pass.**
- `allowBackup`, permissions: L-5. iOS ATS: no exceptions in `app.json`. **Pass.**
- Screenshot protection: **N/A**, no sensitive screens (public hymn text).
- WebViews: **N/A**, none.
- Logs, Sentry, clipboard: **N/A**, no logging or crash reporting; sharing sends only hymn text.
- Client-side role checks: **N/A** in the app; the website's editor check is UI-only and RLS backs it. **Pass.**
- Content downloaded from Supabase: H-2.

**F. Content website (Vite SPA on Vercel, adapted from the Next.js list)**
- `@supabase/ssr`, `getUser` vs `getSession` on the server, Server Components/Actions, service-role client, `server-only`: **N/A**, no server code. Every check happens in RLS, which is the correct place for a static site. The client uses `getSession()` only to decide what to show.
- `dangerouslySetInnerHTML` / HTML sanitising: **Pass**, none; lyrics and About text are rendered as plain text.
- Security headers: **Fail** (M-3).
- Cookies, CSRF: **N/A**, auth uses a bearer token, not cookies. Token in localStorage noted in M-3.
- Uploads: client checks only (M-4), EXIF (L-4). File names are sanitised and prefixed with a timestamp. **Pass** on renaming.
- SSRF: **N/A**, no server.
- Rate limiting: handled by Supabase Auth's built-in limits; CAPTCHA is a manual option (action 4).
- Errors: Supabase error messages are shown to the signed-in editor only; there are no stack traces. **Pass.**
- Framework versions: React 19.3.0, Vite 8.3.5, supabase-js 2.118.0; `npm audit` clean.
- Audit logging: **Fail** (M-1).

**G. Dependencies and CI**
- `npm audit`: L-7 (root, build tools only); `admin/` clean.
- Lockfiles: committed for both. **Pass.**
- Suspicious packages: none. All dependencies are Expo, React, Supabase or Vite official packages.
- CI: L-8. Proposed: a `security.yml` workflow running gitleaks, `npm audit --audit-level=high` for both packages (allowing the known Expo build-tool advisory until it's patched), and Semgrep's JavaScript/TypeScript rules. Supabase advisor checks need an access token in CI; I'd rather keep that as a step you run (or I run through the read-only connector) after each DB change.
