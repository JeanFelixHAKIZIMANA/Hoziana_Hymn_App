# Hoziana Hymn App

The Korali Hoziyana hymnal (ADEPR Nyarugenge) for iPhone and Android, built with Expo and React Native. All 136 hymns ship inside the app, so it works offline and needs no server.

The design source is the Figma page **Screens · Glass** in [Hymnal iOS App](https://www.figma.com/design/MBhju7BR4cf6QztslAceRH/Hymnal-iOS-App).

## Run it on your phone (Windows, macOS or Linux)

1. Install [Node.js](https://nodejs.org) 22 or later.
2. Install the **Expo Go** app on your iPhone or Android phone.
3. In this folder:

   ```bash
   npm install
   npx expo start
   ```

4. Scan the QR code with the phone's camera (iPhone) or with Expo Go (Android).

Store builds are made in the cloud with EAS (`npx eas-cli@latest build`), so no Mac is needed for the iPhone version.

## Project layout

| Path | What it holds |
| --- | --- |
| `src/app/` | Screens, one file per route (Expo Router) |
| `src/design-system/` | Tokens, text styles, icons and the components from the Figma file |
| `src/data/hymns.json` | The hymnal as shipped in the app, generated from the book |
| `src/data/content.ts` | Downloads edits from the content website and keeps them on the device |
| `src/data/hymnal.ts` | Hymn lookup, volumes (used as playlists) and search |
| `src/data/user-store.ts` | Favorites, recent hymns, reading position and settings, stored on the device |
| `src/i18n/` | Interface text. English now; Kinyarwanda is planned for version 2 |
| `scripts/` | The hymnal converter, the database seed builder and the icon generator |
| `admin/` | The content website for choir editors (Vite + React) |
| `supabase/` | Database tables, access rules and the starting data |
| `design/` | Source tokens and the latest hymnal conversion report |

## Updating content

- **Hymns and the About page**: edited on the content website. Setup is in [docs/content-website.md](docs/content-website.md).
- **First import from the book**: export the book's text and run `python3 -I scripts/parse_hymnal.py <book.txt> src/data/hymns.json design/hymnal-conversion-report.md`. The report lists hymns that need a human check (mostly where the refrain starts).
- **Icons**: put Figma SVG exports in `assets/icons/` and run `npm run build:icons`.

## Checks

```bash
npm run typecheck
npx eslint .
npm run check:hymn-text   # every hymn survives the website's text format
```
Igitabo cy'indirimbo za chorale Hoziana
