# Blockers and owner actions

What could not be finished here, and exactly what unblocks it.

## Needs the owner

1. **Android build.** Install Android Studio (SDK 36 + NDK) or run `eas build -p android`
   (free Expo account). Then: `npm ci && npm run prebuild && npm run android`.
2. **iOS build.** Needs a Mac with Xcode 26+ and an Apple Developer account for device installs
   (`npm run ios`, or `eas build -p ios`). Simulator builds need no paid account.
3. **Device checks.** VoiceOver/TalkBack, 200% system text, native share sheet + cancel, camera
   capture, Keychain/Keystore, app lock, offline cold start, performance (A18, A21, A24, A25, A29).
4. **Legal review.** Rights pages are marked "Not attorney-reviewed". Have a lawyer review before
   calling them reviewed guidance; re-check CT Public Act 26-14 for amendments or court orders.
5. **Name/trademark.** "Sightline" is a working name; clearance not done.
6. **Production data host.** Public Overpass is fine for user-triggered development use. For a
   public release, host regional extracts on your own static server/CDN (decision D6).

## Unfinished enhancements (spec §22, optional)

- Silent 9:16 MP4 export — no vetted mobile encoder validated; Story PNG covers vertical sharing.
- Inbound share extension (receive photos/URLs from other apps) — in-app picker works instead.
- User-provided GeoJSON import — the "download this area" path covers the same need online.
- SQLCipher for the notebook database — photos are encrypted; the SQLite file is not (D8).
- Store privacy answers (App Privacy / Play Data Safety) — draft from D8, D14 and the privacy
  screen once native builds exist.

## Known limits (by design)

- Coverage is only as good as OpenStreetMap; absence of a pin is not absence of a camera.
- Phone time/GPS and photo metadata are not independently attested; checksums prove integrity,
  not authenticity.
