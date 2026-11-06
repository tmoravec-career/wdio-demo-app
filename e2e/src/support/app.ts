/**
 * The app-under-test lifecycle, in one place.
 *
 * Every call goes through Appium `mobile:` extensions, the same way on both platforms
 * (only the id argument differs: `bundleId` on iOS, `appId`/`package` on Android).
 *
 *   Launch kinds the specs choose between:
 *     warm()    bring to foreground if already running            cheapest, keeps screen
 *     cold()    terminate + activate, app data kept                tests persistence
 *     fresh()   terminate + clear data + activate                  first-run / clean slate
 *     reinstall(path)  uninstall + install + activate              upgrade / install paths
 *
 *   State is seeded through the app's own deep links instead of tapping through UI:
 *     wdio://state?sub=trial&lang=es     wdio://debug?bug=paywall (test builds only)
 */
import { $, $$, driver } from '@wdio/globals';
import { APP_IDS } from '../../config/app-bundle.js';

/** Values returned by `mobile: queryAppState` (identical on both drivers). */
export enum AppState {
  NotInstalled = 0,
  NotRunning = 1,
  BackgroundSuspended = 2,
  Background = 3,
  Foreground = 4,
}

export type Subscription = 'free' | 'trial' | 'active' | 'expired';
export type Language = 'en' | 'es';
export type SeededBug = 'none' | 'bg_audio' | 'paywall' | 'i18n';

/** SEEDED_BUG=<name> turns a bug on before every spec; the suite should then fail. */
export const SEEDED_BUG = (process.env.SEEDED_BUG ?? 'none') as SeededBug;

class App {
  get id(): string {
    return driver.isIOS ? APP_IDS.ios : APP_IDS.android;
  }

  private get idArg() {
    return driver.isIOS ? { bundleId: this.id } : { appId: this.id };
  }

  async state(): Promise<AppState> {
    return driver.execute('mobile: queryAppState', this.idArg) as Promise<AppState>;
  }

  async waitForState(expected: AppState | AppState[], timeout = 10_000): Promise<void> {
    const ok = Array.isArray(expected) ? expected : [expected];
    await driver.waitUntil(async () => ok.includes(await this.state()), {
      timeout,
      timeoutMsg: `app never reached state ${ok.map((s) => AppState[s]).join('|')} (now ${AppState[await this.state()]})`,
    });
  }

  async isInstalled(): Promise<boolean> {
    return driver.execute('mobile: isAppInstalled', this.idArg) as Promise<boolean>;
  }

  async terminate(): Promise<void> {
    if ((await this.state()) >= AppState.BackgroundSuspended) {
      await driver.execute('mobile: terminateApp', this.idArg);
    }
    await this.waitForState(AppState.NotRunning);
  }

  /**
   * Foreground per the OS is not "ready": on a cold start React Native is still loading
   * its JS bundle, and a deep link sent now is silently dropped (seen on Android).
   * Ready = some screen root (`*-screen`, our test-id convention) is on screen.
   */
  async waitForReady(timeout = 30_000): Promise<void> {
    const anyScreen = driver.isIOS
      ? '-ios predicate string:name ENDSWITH "-screen" AND visible == 1'
      : '//*[substring(@content-desc, string-length(@content-desc) - 6) = "-screen"]';
    await $(anyScreen).waitForDisplayed({ timeout, timeoutMsg: 'app is foreground but no screen rendered' });
  }

  async activate(): Promise<void> {
    await driver.execute('mobile: activateApp', this.idArg);
    await this.waitForState(AppState.Foreground);
    await this.waitForReady();
  }

  /** Foreground the app if needed, keeping whatever screen it is on. */
  async warm(): Promise<void> {
    if ((await this.state()) !== AppState.Foreground) await this.activate();
  }

  /** New process, same data: what a user gets after swiping the app away. */
  async cold(): Promise<void> {
    await this.terminate();
    await this.activate();
  }

  /**
   * New process, no data: first launch after install. Uses `mobile: clearApp`
   * (Android `pm clear`; iOS simulator data container wipe, simulators only).
   */
  async fresh(): Promise<void> {
    await this.terminate();
    await driver.execute('mobile: clearApp', this.idArg);
    await this.activate();
    await this.applySeededBug();
  }

  /** Uninstall then install `path`: the install/upgrade path, and the only full reset on a real iPhone. */
  async reinstall(path: string): Promise<void> {
    await driver.execute('mobile: removeApp', this.idArg);
    await driver.execute('mobile: installApp', driver.isIOS ? { app: path } : { appPath: path });
    await this.activate();
    await this.applySeededBug();
  }

  /**
   * Home button: `seconds` > 0 returns on its own; -1 stays in the background
   * until `activate()`. Use -1 when the test needs to look at the app while away.
   */
  async background(seconds = -1): Promise<void> {
    await driver.execute('mobile: backgroundApp', { seconds });
  }

  /**
   * Refuses to run if the app is not alive: `mobile: deepLink` would silently relaunch a
   * crashed app, and the test would carry on green over the crash (this hid a real
   * Player-close crash on iOS until this guard existed).
   */
  async openDeepLink(url: string): Promise<void> {
    const state = await this.state();
    if (state < AppState.BackgroundSuspended) {
      throw new Error(`app is ${AppState[state]} before deep link ${url}; did it crash?`);
    }
    await driver.execute('mobile: deepLink', driver.isIOS ? { url, bundleId: this.id } : { url, package: this.id });
  }

  /**
   * The state/debug links end in `router.replace('/sleep')`, which animates a new Sleep
   * screen over the old one. Until the animation ends both are in the UI tree and every
   * `~Sleep-*` locator is ambiguous, so wait for exactly one displayed Sleep screen.
   */
  private async waitForSleepSettled(): Promise<void> {
    // Settled = one Sleep screen, displayed, and not moving: a tap during the slide-in
    // lands but is dropped (seen on Android), so the position must match the previous poll.
    let last = '';
    await driver.waitUntil(
      async () => {
        const screens = await $$('~Sleep-screen');
        if (screens.length !== 1 || !(await screens[0].isDisplayed())) return false;
        const { x, y } = await screens[0].getLocation();
        const settled = `${x},${y}` === last;
        last = `${x},${y}`;
        return settled;
      },
      { timeout: 10_000, interval: 300, timeoutMsg: 'Sleep screen did not settle after deep link' },
    );
  }

  /** Mocked subscription and language, written by the app itself and persisted. */
  async seed(state: { sub?: Subscription; lang?: Language }): Promise<void> {
    const set = Object.entries(state).filter((e): e is [string, Subscription | Language] => e[1] !== undefined);
    const query = new URLSearchParams(set).toString();
    await this.openDeepLink(`wdio://state${query ? `?${query}` : ''}`);
    await this.waitForSleepSettled();
  }

  /**
   * Always sends the link, even for "none", so a bug left on by a previous run
   * cannot leak into this one. Release builds ignore it.
   */
  async applySeededBug(bug: SeededBug = SEEDED_BUG): Promise<void> {
    await this.openDeepLink(`wdio://debug?bug=${bug}`);
    await this.waitForSleepSettled();
  }

  /** The baseline every Sleep spec starts from: foreground, free, English, configured bug. */
  async baseline(): Promise<void> {
    await this.warm();
    await this.applySeededBug();
    await this.seed({ sub: 'free', lang: 'en' });
  }
}

export const app = new App();
