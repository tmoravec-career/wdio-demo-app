import { browser, expect } from '@wdio/globals';
import { COPY, FREE_SESSION } from '../../src/data/sleep.js';
import { app, AppState } from '../../src/support/app.js';
import { playerScreen, sleepScreen } from '../../src/screens/index.js';

const AWAY_SECONDS = 10;

/**
 * The product promise of a sleep app: audio keeps going when the phone is put down.
 * We can't hear the device, so we measure it: the elapsed clock must have advanced by
 * about the time we were away. The seeded `bg_audio` bug pauses on background and fails this.
 */
describe('Lifecycle: background audio', () => {
  before(async () => {
    await app.baseline();
    await sleepScreen.openSession(FREE_SESSION.id);
    await playerScreen.waitForOpen();
    await expect(playerScreen.status).toHaveText(COPY.en.playing);
  });

  after(async () => {
    await app.warm();
    if (await playerScreen.isOpen()) await playerScreen.close();
  });

  it('keeps playing while the app is in the background', async () => {
    const before = await playerScreen.waitForElapsedAbove(0);

    await app.background(-1);
    // Playing audio keeps the process running, not suspended.
    await app.waitForState(AppState.Background);
    await browser.pause(AWAY_SECONDS * 1000);
    await app.activate();

    await expect(playerScreen.status).toHaveText(COPY.en.playing);
    const after = await playerScreen.elapsedSeconds();
    // Allow 2 s of slack for the background/foreground transitions themselves.
    expect(after - before).toBeGreaterThanOrEqual(AWAY_SECONDS - 2);
  });
});
