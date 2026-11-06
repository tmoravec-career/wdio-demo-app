import type { Language, Subscription } from '../support/app.js';
import { BaseScreen } from './BaseScreen.js';

class SleepScreen extends BaseScreen {
  constructor() {
    super('Sleep-screen');
  }

  get title() {
    return this.byId('Sleep-title');
  }

  session(id: string) {
    return this.byId(`Session-${id}`);
  }

  subscriptionChip(sub: Subscription) {
    return this.byId(`Sub-${sub}`);
  }

  languageChip(lang: Language) {
    return this.byId(`Lang-${lang}`);
  }

  async openSession(id: string): Promise<void> {
    await this.session(id).click();
  }
}

export const sleepScreen = new SleepScreen();
