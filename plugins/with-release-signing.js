// Signs Android release builds with the Hoziana release key when one is provided, instead of the
// debug key every React Native project shares (security audit M-2). The key is an elliptic-curve
// (P-256) key in a PKCS12 keystore; see docs/android-signing.md for how to make one.
//
// Set these when building (GitHub Actions sets them from repository secrets):
//   HOZIANA_KEYSTORE_FILE      path to the .p12 keystore
//   HOZIANA_KEYSTORE_PASSWORD  its password (PKCS12 uses the same password for the key)
//   HOZIANA_KEY_ALIAS          the key's alias
// Without them, local release builds keep using the debug key, which is fine on your own phone only.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_CONFIG = `
        release {
            if (System.getenv('HOZIANA_KEYSTORE_FILE')) {
                storeFile file(System.getenv('HOZIANA_KEYSTORE_FILE'))
                storePassword System.getenv('HOZIANA_KEYSTORE_PASSWORD')
                keyAlias System.getenv('HOZIANA_KEY_ALIAS')
                keyPassword System.getenv('HOZIANA_KEYSTORE_PASSWORD')
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (gradle.includes('HOZIANA_KEYSTORE_FILE')) return config;

    const withConfig = gradle.replace(/signingConfigs \{/, (m) => m + RELEASE_CONFIG);
    const withRelease = withConfig.replace(
      /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig System.getenv('HOZIANA_KEYSTORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
    if (withConfig === gradle || withRelease === withConfig) {
      throw new Error('with-release-signing: android/app/build.gradle no longer looks as expected; update the plugin.');
    }
    config.modResults.contents = withRelease;
    return config;
  });
};
