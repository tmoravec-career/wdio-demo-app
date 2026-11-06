# E2E suite: WebdriverIO + Appium + TypeScript

Cross-platform (iOS simulator / Android emulator or device) UI tests for the sleep-app screens.

```
e2e/
├── wdio.conf.ts            runner config: suites, reporters, retries, failure evidence
├── config/
│   ├── capabilities.ts     device auto-detection → Appium capabilities (noReset policy)
│   └── app-bundle.ts       which build is under test; read + verify its metadata
├── src/
│   ├── support/app.ts      app lifecycle: warm / cold / fresh / reinstall, background, deep links
│   ├── screens/            page objects, one per screen, `~test-id` locators
│   └── data/sleep.ts       test data + the entitlement table
├── specs/
│   ├── smoke/              does the build launch and navigate
│   ├── lifecycle/          state across relaunch, clear data, background audio
│   └── sleep/              entitlements (data-driven), Spanish
└── scripts/
    ├── app-bundle.ts       fetch builds from CI / releases, inspect any bundle
    └── ci-run.sh           CI entry point; inverts the result for seeded-bug runs
```

## Run locally

```bash
appium                                        # own terminal
xcrun simctl boot "iPhone 16"                 # or start an emulator

npm run app:fetch -- --variant test           # latest green CI build → ../apps/test/
npm run app:info                              # what would be installed, and is it ours?

npm test                                      # whatever device is up
APP_VARIANT=test npm run test:sleep           # a suite against the test build
APP_VARIANT=test SEEDED_BUG=paywall npm run test:sleep   # should FAIL: proves the tests bite
APP=/path/to/any.apk npm run test:smoke       # any bundle
```

## Design decisions

**Lifecycle is explicit.** Appium runs with `noReset: true`; nothing is wiped behind the
suite's back. Each spec picks how much reset it needs from `src/support/app.ts`:

| call          | what happens                         | use for                     |
|---------------|--------------------------------------|-----------------------------|
| `warm()`      | foreground if needed                 | default, cheapest           |
| `cold()`      | terminate + activate, data kept      | persistence across relaunch |
| `fresh()`     | terminate + clear data + activate    | first-run behaviour         |
| `reinstall()` | uninstall + install                  | install / upgrade paths     |

All of it goes through `mobile:` extension commands (`queryAppState`, `terminateApp`,
`clearApp`, `backgroundApp`, `deepLink` …), so iOS and Android share one code path.

**"Foreground" is not "ready".** After `activateApp` the OS says the app is in front while
React Native is still loading JS; a deep link sent then is silently dropped (seen on Android).
`activate()` waits for any `*-screen` root to render before returning.

**State through the back door.** Subscription, language and seeded bug are set by deep link
(`wdio://state?sub=trial&lang=es`, `wdio://debug?bug=paywall`) instead of tapping through
Settings. A link replaces the screen with an animation; `seed()` waits until exactly one
Sleep screen exists, instead of a fixed sleep.

**Crashes can't hide.** `mobile: deepLink` relaunches a dead app, so a crash followed by a
deep link looked like a pass (this hid a real Player-close crash on iOS for a whole day of
green runs). `openDeepLink()` now refuses to run unless the app is alive, and `close()` on
Player/Paywall returns only once Sleep is back on screen.

**Tests that are proven to bite.** The `test` build has seeded bugs. CI runs each targeted
suite with one bug switched on and fails the job if the suite *passes*.

**Evidence on every failure.** Screenshot + UI hierarchy XML (+ video with `RECORD=1`) per
failed test *or hook*, JUnit XML for CI, Android logcat and crash buffer per CI job.

**Flake policy.** In CI a failed spec file is retried once, deferred to the end of the run.
Locally there are no retries, so flakes stay visible. Waits are condition-based everywhere.

## App bundle management

- Bundles live in `../apps/<variant>/` (git-ignored), one per directory, with `manifest.json`
  recording the CI run, commit, and fetch time.
- Before any session starts, `onPrepare` reads the bundle's own metadata (Info.plist /
  `aapt2 dump badging`), refuses a wrong bundle id, and writes `reports/app-under-test.json`.
- `onPrepare` then installs it itself, once per run (`adb install -r -d` / `simctl install`),
  instead of passing `appium:app`. With `noReset`, UiAutomator2 installs only when the package
  is missing, so a rebuilt APK with an unchanged versionCode was silently skipped and the
  suite tested the previous build.
- `APP=<path>` overrides everything; with no bundle at all the suite tests the installed app.

## CI

- `build-android.yml`: builds `test` and `release` APKs on every push to main.
- `e2e-android.yml`: triggered by a finished build; downloads *that run's* APKs (build once,
  test many), checks out the same commit, runs on an API 34 emulator (KVM, cached AVD
  snapshot). Matrix: release full, test clean, and three seeded-bug jobs that must fail.
  Dispatch it by hand with `build_run_id` to re-test any earlier build.
- `e2e-ios.yml`: on demand (macOS minutes are expensive); simulator `.app` cached by a hash
  of its sources so re-runs skip the Xcode build.
