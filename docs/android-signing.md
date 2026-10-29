# Android signing key

Test APKs used to be signed with the debug key that every React Native project shares, so anyone
could build a fake "Hoziana" that Android would accept as an update. They are now signed with the
choir's own elliptic-curve (P-256) key. GitHub Actions won't build an APK until the key is set up.

You do this once, on your laptop. The key never leaves your laptop except as GitHub secrets.

## 1. Make the key

You need Java's `keytool` (it comes with Android Studio, or install the free
[Temurin JDK](https://adoptium.net)). In PowerShell, in a folder that is **not** inside the repository:

```powershell
keytool -genkeypair -alias hoziana -keyalg EC -groupname secp256r1 -sigalg SHA256withECDSA `
  -validity 10000 -storetype PKCS12 -keystore hoziana-release.p12 -dname "CN=Hoziana Choir, C=RW"
```

It asks for a password twice. Pick a long one and save it in your password manager.

## 2. Back it up

Copy `hoziana-release.p12` and its password somewhere safe (a password manager, or an encrypted
USB stick). If the key is lost, every phone has to uninstall and reinstall the app to take a new one.
If the Play Store comes later, this same key can be the "upload key".

## 3. Add it to GitHub

Turn the key into text and copy it:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("hoziana-release.p12")) | Set-Clipboard
```

On GitHub: the repository → **Settings → Secrets and variables → Actions → New repository secret**.
Add three secrets:

| Name | Value |
|---|---|
| `HOZIANA_KEYSTORE_BASE64` | paste the copied text |
| `HOZIANA_KEYSTORE_PASSWORD` | the password from step 1 |
| `HOZIANA_KEY_ALIAS` | `hoziana` |

Then run **Actions → Android test APK → Run workflow**. The build checks the APK isn't signed with
the debug key before publishing it.

## 4. Testers reinstall once

Phones with an earlier test build must **uninstall it first**, because the signature changed.
Favourites and settings on that phone are lost once. After that, updates install over the top as before.

## Building on your own laptop

`plugins/with-release-signing.js` uses the key when these are set, and the debug key otherwise
(fine for your own phone, never for sharing):

```powershell
$env:HOZIANA_KEYSTORE_FILE = "C:\path\to\hoziana-release.p12"
$env:HOZIANA_KEYSTORE_PASSWORD = "..."
$env:HOZIANA_KEY_ALIAS = "hoziana"
```

EAS builds (`npx eas-cli build`) manage their own key and ignore these.
