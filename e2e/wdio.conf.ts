/**
 * WebdriverIO + Appium config. All knobs are environment variables, so the same
 * config runs on a laptop and in CI:
 *
 *   PLATFORM / IOS_* / ANDROID_*    device selection        → config/capabilities.ts
 *   APP / APP_VARIANT               which build to install  → config/app-bundle.ts
 *   SEEDED_BUG=<name>               turn a seeded bug on (test builds); the suite should fail
 *   RECORD=1                        record video, kept only for failed tests
 *   APPIUM_HOST / APPIUM_PORT       default 127.0.0.1:4723 (Appium must already be running)
 *   CI=true                         retries a failed spec file once, adds JUnit output
 *
 * Suites: npm test -- --suite smoke | lifecycle | sleep
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertExpectedBundle, inspectBundle, installBundle, resolveAppPath, variant } from './config/app-bundle.js';
import { capabilitiesFor, resolvePlatform } from './config/capabilities.js';

const env = process.env;
const CI = env.CI === 'true';
const REPORTS = join(process.cwd(), 'reports');
const platform = resolvePlatform();
const capabilities = capabilitiesFor(platform);

/** "Sleep: premium entitlements › paywalls … " → a safe file name. */
const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 120);

export const config: WebdriverIO.Config = {
  runner: 'local',
  hostname: env.APPIUM_HOST ?? '127.0.0.1',
  port: Number(env.APPIUM_PORT ?? 4723),
  path: '/',

  specs: ['./specs/**/*.e2e.ts'],
  suites: {
    smoke: ['./specs/smoke/**/*.e2e.ts'],
    lifecycle: ['./specs/lifecycle/**/*.e2e.ts'],
    sleep: ['./specs/sleep/**/*.e2e.ts'],
  },
  // One device → one worker. Parallelism comes from more devices (a CI matrix), not more workers.
  maxInstances: 1,
  capabilities: [capabilities],

  logLevel: 'warn',
  outputDir: join(REPORTS, 'logs'),
  waitforTimeout: 15_000,
  connectionRetryTimeout: 300_000,
  connectionRetryCount: 1,
  // Flake budget: in CI a failed spec file gets one more go; locally you see failures straight away.
  specFileRetries: CI ? 1 : 0,
  specFileRetriesDeferred: true,

  framework: 'mocha',
  mochaOpts: { ui: 'bdd', timeout: 180_000 },
  reporters: [
    'spec',
    ['junit', { outputDir: join(REPORTS, 'junit'), outputFileFormat: ({ cid }) => `results-${cid}.xml` }],
  ],

  /** Main process, once: say exactly which build is under test, refuse the wrong one, install it. */
  onPrepare() {
    mkdirSync(REPORTS, { recursive: true });
    const path = resolveAppPath(platform);
    const udid = capabilities['appium:udid'];
    const summary = path
      ? (() => {
          const bundle = inspectBundle(path);
          assertExpectedBundle(bundle);
          if (udid) installBundle(bundle, udid);
          return { ...bundle, variant: variant() };
        })()
      : { platform, path: '(already installed on device)', variant: variant() };
    console.log(`[app] ${JSON.stringify(summary)}`);
    writeFileSync(join(REPORTS, 'app-under-test.json'), JSON.stringify({ ...summary, seededBug: env.SEEDED_BUG ?? 'none' }, null, 2));
  },

  async beforeTest() {
    if (env.RECORD === '1') await driver.startRecordingScreen();
  },

  /** On failure: screenshot, UI hierarchy, and (if recording) video — the three things you need to triage. */
  async afterTest(test, _context, { passed }) {
    const recording = env.RECORD === '1' ? await driver.stopRecordingScreen() : undefined;
    if (!passed) await captureFailure(`${test.parent} ${test.title}`, recording);
  },

  /** A failing before/after hook never reaches afterTest, so capture it here too. */
  async afterHook(test, _context, { passed }) {
    if (!passed) await captureFailure(`${test.parent} ${test.title}`);
  },
};

async function captureFailure(title: string, recording?: string): Promise<void> {
  const dir = join(REPORTS, 'failures');
  mkdirSync(dir, { recursive: true });
  const name = slug(title);
  try {
    await driver.saveScreenshot(join(dir, `${name}.png`));
    writeFileSync(join(dir, `${name}.xml`), await driver.getPageSource());
  } catch (e) {
    // The driver itself may be what broke; never let evidence capture mask the real failure.
    console.warn(`[failure] could not capture ${name}: ${(e as Error).message}`);
  }
  if (recording) writeFileSync(join(dir, `${name}.mp4`), Buffer.from(recording, 'base64'));
}
