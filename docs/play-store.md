# Publishing Hoziana on Google Play

Everything the app side needs is in this repository: the build, the privacy policy, the store
listing text and the graphics. The Play Console steps below are done by hand, by whoever owns the
developer account.

| What | Where |
| --- | --- |
| App bundle (.aab) | GitHub **Actions → Android Play bundle → Run workflow** (`.github/workflows/android-aab.yml`) |
| Privacy policy | https://hoziana-hymn-app.vercel.app/privacy (`admin/public/privacy.html`) |
| Icon, feature graphic, screenshots | `store/google-play/` (rebuild with `python3 scripts/build-store-graphics.py`) |
| Listing text and form answers | This file, sections 4 and 5 |

## 1. Create the developer account (once)

1. Go to https://play.google.com/console/signup and sign in with the Google account that should
   own the app. Use an account the choir can keep long term, not a personal one you may lose.
2. Choose **Yourself** (personal account) or **An organization**.
   - **Personal:** pay the one-time USD 25, verify your ID and phone. Before you can publish to
     everyone, Google requires a **closed test with at least 12 testers who stay opted in for
     14 days in a row** (section 3).
   - **Organization:** needs a D-U-N-S number for the choir or church (free from Dun & Bradstreet,
     takes days to weeks). It skips the 12-tester rule.
3. Verification can take a few days. You can prepare everything else meanwhile.

## 2. Create the app and upload the first bundle

1. Play Console → **Create app**. Name `Hoziana Hymnal`, language **English (United States)**,
   **App**, **Free**. Tick the two declarations.
2. Build the bundle: on GitHub, open **Actions → Android Play bundle → Run workflow** on `main`.
   When it finishes (about 15–20 minutes), open the run and download **hoziana-play-bundle-…**
   under *Artifacts*. Unzip it to get `hoziana-<number>.aab`.
3. Play Console → **Test and release → Testing → Internal testing → Create new release**.
   - When asked about app signing, keep **Google-generated key** (Play App Signing). The key in the
     `HOZIANA_*` GitHub secrets becomes your **upload key**: Play remembers it from this first
     upload and only accepts bundles signed with it later. Don't delete those secrets, and keep
     the backup of the `.p12` file and its password from `docs/android-signing.md`.
   - Upload the `.aab`, release name e.g. `1.0.0 (101)`, notes "First release".
   - **Next → Save → Release**.
4. **Testers** tab: create an email list with your own Gmail address (and the Airtel phone's Google
   account), save, and copy the **join link**. Open it on the phone, accept, then install from
   Play. Internal testing has no review, so this works within minutes.

   This is the quickest way to check the "App wasn't installed" problem on the Airtel Imagine
   phone: Play builds the exact version that phone needs from the bundle.

Every new upload needs a higher version code. The workflow handles that (101, 102, …). To change
the version people see (1.0.0 → 1.0.1), change `"version"` in `app.json`.

## 3. Closed test (personal accounts: 12 testers × 14 days)

1. **Testing → Closed testing → Create track** (or use the default *Alpha*). Create a release and
   **promote** the internal release to it, or upload the same `.aab`.
2. **Testers**: add an email list of at least 12 people, ideally 15 to 20 so a few dropping out
   doesn't reset the count. Each tester needs a Google account (the Gmail they use in Play Store
   on their Android phone). Choir members are ideal.
3. Send them the join link. Each tester must open it, tap **Become a tester**, and install the app
   from Play. They must stay opted in for 14 days; using the app a little helps.
4. The closed release goes through review first (usually a few days). Fill in sections 4 and 5
   before you submit it, because review needs them.
5. After 14 days, **Dashboard → Apply for production**. Google asks a few questions about the test
   (answers below), then reviews again before you can release to everyone.

Suggested answers for the production application:

- *How did you recruit testers?* Members of Korali Hoziyana and the congregation of ADEPR
  Nyarugenge, the people the app is made for.
- *How did testers use the app?* Reading hymns during rehearsals and services, searching by title
  and number, saving favourites, switching between light and dark mode and text sizes.
- *What feedback did you get and what did you change?* Write down what the testers actually said
  and any fixes you made; reviewers look for real answers here.

## 4. Store listing

**Grow users → Store presence → Main store listing.**

**App name** (30 characters max)

> Hoziana Hymnal

**Short description** (80 characters max)

> The hymns of Korali Hoziyana, ADEPR Nyarugenge. Read offline, search, sing.

**Full description** (4,000 characters max)

> Hoziana brings the hymnal of Korali Hoziyana (ADEPR Paruwasi ya Nyarugenge) to your phone: all 136 hymns from ten volumes, 1986 to 2010, in Kinyarwanda.
>
> • Read every hymn with verses, refrains and call-and-response parts laid out clearly.
> • Find a hymn fast by number or by any word of its title.
> • Browse by volume, or keep the hymns you love in Favourites.
> • Pick up where you left off: the app remembers the hymn and verse you were reading.
> • Comfortable to read anywhere: adjustable text size, serif or sans-serif lyrics, light and dark mode, and an option to keep the screen on while you sing.
> • Works offline. When you are connected, corrections and new hymns from the choir arrive automatically.
> • Share a hymn's words with family and friends.
>
> No account, no ads, no tracking. Published with the choir's permission.

**Graphics** (all in `store/google-play/`)

- App icon: `icon-512.png` (512 × 512)
- Feature graphic: `feature-graphic.png` (1024 × 500)
- Phone screenshots: `screenshots/1-home.png` to `6-settings-dark.png` (1080 × 1920; upload all six,
  in order)

**Store settings** (Store presence → Store settings)

- App category: **Books & Reference** (the app has words, not audio; *Music & Audio* also fits if
  you prefer).
- Tags: Books & Reference, Religion/Spirituality if offered.
- Contact email: the choir's email (required, shown publicly).
- Website: leave empty, or a choir page if there is one. (The content website is the editors'
  sign-in page, so don't list it.)

## 5. App content (policy forms)

**Monitor and improve → Policy and programs → App content.** Answers below match what the app
does today. If you add sign-in, analytics, crash reporting or ads later, these must change.

**Privacy policy**

> https://hoziana-hymn-app.vercel.app/privacy

**Ads:** No, my app does not contain ads.

**App access:** All functionality is available without special access (no sign-in).

**Content rating** (IARC questionnaire)

- Email: the contact email. Category: **Reference, News, or Educational**.
- Violence, fear, sexuality, language, controlled substances, crude humour, gambling: **No** to all.
- Can users interact or exchange content with each other? **No.** (Sharing goes through the
  phone's own share menu; there is no chat or user posting in the app.)
- Does the app share the user's physical location? **No.**
- Does the app allow purchases of digital goods? **No.**
- Is the app a web browser or search engine? **No.**
- Expected result: Everyone / PEGI 3 / IARC 3+.

**Target audience and content**

- Target age groups: **13–15, 16–17 and 18 and over.**
- Could the app unintentionally appeal to children? **No.**

  Why not include under-13s? It is allowed (the app has no ads and collects nothing), but it opts
  the app into Google's Families policy with extra review. Children can still install it, since the
  rating is Everyone. You can add the younger age groups later if the choir wants it listed for
  children.

**Data safety**

- Does your app collect or share any of the required user data types? **No.**
- That's the whole form: answering No skips the detailed sections. The summary will read
  "No data collected" and "No data shared with third parties".

  Why No is correct: favourites, playlists, history and settings stay on the phone. The only
  network request downloads hymn updates and carries no personal data or identifiers. The app
  has no accounts, analytics, crash reporting, advertising ID or location access. Android backup
  is turned off (`allowBackup: false`).

**Advertising ID:** No, the app does not use an advertising ID.

**Government app:** No. **Financial features:** none. **Health:** No (none of the listed
features). **News app:** No.

**Data deletion:** Not needed, because the app has no accounts and collects no data.

## 6. Updating the app later

1. Merge the change into `main`.
2. If people should see a new version number, raise `"version"` in `app.json` first (e.g. 1.0.1).
3. Run **Android Play bundle** again, download the `.aab`, and create a new release on the track
   you want (internal, closed or production). Play reviews production updates, usually within a day
   or two.

## Building with EAS instead

`eas.json` has a `production` profile that also makes an `.aab`
(`eas build -p android --profile production`). EAS signs with its own stored key, so before using
it, upload the Hoziana release key in **expo.dev → project → Credentials → Android → Upload
keystore**; otherwise Play rejects the bundle for having the wrong upload key. The GitHub workflow
above already uses the right key, so it is the simpler route.
