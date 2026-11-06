import { expect } from '@wdio/globals';
import { app } from '../../src/support/app.js';
import { formsScreen, homeScreen, sleepScreen, tabBar } from '../../src/screens/index.js';

/** Smoke: the build launches and the main navigation works. Runs on every build variant. */
describe('Smoke: navigation', () => {
  before(async () => {
    // Cold start so we land on Home, not wherever the last run left off.
    await app.cold();
  });

  it('opens on the Home screen', async () => {
    await expect(homeScreen.root).toBeDisplayed();
  });

  it('switches tabs via the tab bar', async () => {
    await tabBar.open('Forms');
    await expect(formsScreen.root).toBeDisplayed();
    await tabBar.open('Sleep');
    await expect(sleepScreen.root).toBeDisplayed();
  });
});
