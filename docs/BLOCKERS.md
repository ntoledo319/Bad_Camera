# Blockers and owner actions

What could not be finished here, and exactly what unblocks it.

## Needs the owner

1. **Publish the data site (≈5 min, you chose to do this later).** Run `npm run data:deploy`
   — it logs in to Cloudflare in your browser, uploads the site, and stores a Pages-only token as a
   GitHub secret so it rebuilds daily. Steps: `docs/DEPLOY.md`. Until then the app's "Download
   camera data" falls back to asking OpenStreetMap directly (user-confirmed).
2. **Android build.** Install Android Studio (SDK 36 + NDK) or run `eas build -p android`
   (free Expo account). Then: `npm ci && npm run prebuild && npm run android`.
3. **iOS build.** Needs a Mac with Xcode 26+ and an Apple Developer account for device installs
   (`npm run ios`, or `eas build -p ios`). Simulator builds need no paid account.
4. **Device checks.** VoiceOver/TalkBack, 200% system text, native share sheet + cancel, camera
   capture, Keychain/Keystore, app lock, offline cold start, performance (A18, A21, A24, A25, A29).
5. **Legal (you chose not to hire a lawyer):** every legal statement is now source-checked
   claim by claim (`docs/LEGAL_REVIEW.md`). Re-check two moving targets: the ruling in
   *United States v. Connecticut* (No. 3:26-cv-758) and the *Schmidt v. Norfolk* appeal. The app
   says "Source-checked · not lawyer-reviewed"; never change that to "reviewed".
6. **Name/trademark.** "Sightline" is a working name; clearance not done.

## Unfinished enhancements (spec §22, optional)

- Silent 9:16 MP4 export — no vetted mobile encoder validated; Story PNG covers vertical sharing.
- Inbound share extension (receive photos/URLs from other apps) — in-app picker works instead.
- User-provided GeoJSON import — the "download this area" path covers the same need online.
- SQLCipher for the notebook database — photos are encrypted; the SQLite file is not (D8).
- Store privacy questionnaires (App Privacy / Play Data Safety) — the privacy policy now exists
  (`/privacy.html` on the data site); fill the questionnaires from it, D8 and D14 once native
  builds exist.

## Known limits (by design)

- Coverage is only as good as OpenStreetMap; absence of a pin is not absence of a camera.
- Phone time/GPS and photo metadata are not independently attested; checksums prove integrity,
  not authenticity.
