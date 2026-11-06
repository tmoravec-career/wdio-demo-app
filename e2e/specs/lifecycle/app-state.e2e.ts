import { expect } from '@wdio/globals';
import { COPY, PREMIUM_SESSION } from '../../src/data/sleep.js';
import { app, AppState } from '../../src/support/app.js';
import { homeScreen, paywallScreen, playerScreen, sleepScreen } from '../../src/screens/index.js';

/**
 * The app's own lifecycle: what survives a relaunch, what a clean install looks like,
 * and what the OS reports at each step. These tests drive the lifecycle on purpose;
 * other specs only use it to set up.
 */
describe('Lifecycle: app state across launches', () => {
  it('reports foreground, background, and not-running to the OS', async () => {
    await app.cold();
    expect(await app.state()).toBe(AppState.Foreground);

    await app.background(-1);
    // iOS may suspend an idle app (2); Android reports plain background (3).
    await app.waitForState([AppState.Background, AppState.BackgroundSuspended]);

    await app.terminate();
    expect(await app.state()).toBe(AppState.NotRunning);

    await app.activate();
    await homeScreen.waitForOpen();
  });

  it('keeps subscription and language after a cold start', async () => {
    await app.baseline();
    await app.seed({ sub: 'trial', lang: 'es' });
    await expect(sleepScreen.title).toHaveText(COPY.es.sleepTitle);

    await app.cold();
    await app.seed({}); // no params: just opens Sleep
    await expect(sleepScreen.title).toHaveText(COPY.es.sleepTitle);
    await sleepScreen.openSession(PREMIUM_SESSION.id);
    await playerScreen.waitForOpen(); // trial still entitled
    await playerScreen.close();
  });

  it('starts from defaults after app data is cleared', async () => {
    await app.seed({ sub: 'active', lang: 'es' });
    await app.fresh();

    await expect(sleepScreen.title).toHaveText(COPY.en.sleepTitle);
    await sleepScreen.openSession(PREMIUM_SESSION.id);
    await paywallScreen.waitForOpen(); // back to free
    await paywallScreen.close();
  });

  it('resumes on the same screen after a short trip to the background', async () => {
    await app.baseline();
    await sleepScreen.openSession(PREMIUM_SESSION.id);
    await paywallScreen.waitForOpen();

    await app.background(3); // returns by itself after 3 s
    await app.waitForState(AppState.Foreground);
    await expect(paywallScreen.root).toBeDisplayed();
    await paywallScreen.close();
  });
});
