# Claude Multiple

A Capacitor-based Android launcher UI for managing named Claude profiles.

## Included
- Create, rename, and delete profile cards.
- Optional custom time label beside each profile name.
- Opens Claude in the in-app browser.
- Responsive dark UI intended for Android phones.

## Important limitations
This starter does **not** isolate Claude login sessions per profile. Capacitor Browser uses the system browser / Custom Tab, where cookies are shared with the browser. Profile labels alone do not create separate Claude accounts.

File uploads and downloads rely on Claude's web interface and browser support. A custom native file picker/download manager and genuinely isolated Android WebView profiles are not implemented yet.

## Build
```sh
npm install
npm run build
npx cap add android   # only if android/ does not exist
npx cap sync android
cd android
./gradlew assembleDebug
```

Use a supported Node.js version and install Android SDK/JDK tooling before building.