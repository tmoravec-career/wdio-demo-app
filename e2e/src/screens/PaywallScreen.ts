import { BaseScreen } from './BaseScreen.js';
import { sleepScreen } from './SleepScreen.js';

class PaywallScreen extends BaseScreen {
  constructor() {
    super('Paywall-screen');
  }

  get title() {
    return this.byId('Paywall-title');
  }

  async startTrial(): Promise<void> {
    await this.byId('Paywall-startTrial').click();
  }

  /** Returns only once the Paywall is gone and Sleep is back. */
  async close(): Promise<void> {
    await this.byId('Paywall-close').click();
    await this.root.waitForDisplayed({ reverse: true });
    await sleepScreen.waitForOpen();
  }
}

export const paywallScreen = new PaywallScreen();
