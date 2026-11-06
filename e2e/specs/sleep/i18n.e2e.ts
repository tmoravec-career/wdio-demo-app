import { expect } from '@wdio/globals';
import { COPY, FREE_SESSION, PREMIUM_SESSION } from '../../src/data/sleep.js';
import { app } from '../../src/support/app.js';
import { paywallScreen, playerScreen, sleepScreen } from '../../src/screens/index.js';

describe('Sleep: Spanish localisation', () => {
  before(async () => {
    await app.baseline();
    await app.seed({ lang: 'es' });
  });

  afterEach(async () => {
    if (await playerScreen.isOpen()) await playerScreen.close();
    if (await paywallScreen.isOpen()) await paywallScreen.close();
  });

  after(async () => {
    await app.seed({ lang: 'en' });
  });

  it('shows the Sleep screen in Spanish', async () => {
    await expect(sleepScreen.title).toHaveText(COPY.es.sleepTitle);
  });

  // Assert on single text elements with their own test id: a row's id sits on the
  // pressable container, whose text Android does not report (its children hold it).
  it('shows session content in Spanish', async () => {
    await sleepScreen.openSession(FREE_SESSION.id);
    await playerScreen.waitForOpen();
    await expect(playerScreen.title).toHaveText(FREE_SESSION.title.es);
    await expect(playerScreen.status).toHaveText(COPY.es.playing);
  });

  it('shows the Paywall in Spanish', async () => {
    await sleepScreen.openSession(PREMIUM_SESSION.id);
    await paywallScreen.waitForOpen();
    await expect(paywallScreen.title).toHaveText(COPY.es.paywallTitle);
  });
});
