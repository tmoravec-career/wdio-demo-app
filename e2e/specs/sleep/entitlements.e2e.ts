import { expect } from '@wdio/globals';
import { ENTITLEMENTS, FREE_SESSION, PREMIUM_SESSION } from '../../src/data/sleep.js';
import { app } from '../../src/support/app.js';
import { paywallScreen, playerScreen, sleepScreen } from '../../src/screens/index.js';

/**
 * Data-driven: one test per subscription state, generated from the entitlement table.
 * State is seeded by deep link, so each case costs one link instead of a trip through Settings.
 */
describe('Sleep: premium entitlements', () => {
  beforeEach(async () => {
    await app.baseline();
  });

  afterEach(async () => {
    if (await playerScreen.isOpen()) await playerScreen.close();
    if (await paywallScreen.isOpen()) await paywallScreen.close();
  });

  it('plays free sessions without a subscription', async () => {
    await sleepScreen.openSession(FREE_SESSION.id);
    await expect(playerScreen.root).toBeDisplayed();
  });

  for (const { sub, premium } of ENTITLEMENTS) {
    it(`${premium ? 'plays' : 'paywalls'} premium sessions when subscription is "${sub}"`, async () => {
      await app.seed({ sub });
      await sleepScreen.openSession(PREMIUM_SESSION.id);
      if (premium) {
        await playerScreen.waitForOpen();
        await expect(playerScreen.title).toHaveText(PREMIUM_SESSION.title.en);
      } else {
        await paywallScreen.waitForOpen();
        await expect(playerScreen.root).not.toBeDisplayed();
      }
    });
  }

  it('unlocks premium after starting a trial from the paywall', async () => {
    await sleepScreen.openSession(PREMIUM_SESSION.id);
    await paywallScreen.waitForOpen();
    await paywallScreen.startTrial();

    await expect(sleepScreen.subscriptionChip('trial')).toBeSelected();
    await sleepScreen.openSession(PREMIUM_SESSION.id);
    await playerScreen.waitForOpen();
  });
});
