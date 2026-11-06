import { BaseScreen } from './BaseScreen.js';
import { sleepScreen } from './SleepScreen.js';

class PlayerScreen extends BaseScreen {
  constructor() {
    super('Player-screen');
  }

  get title() {
    return this.byId('Player-title');
  }

  get status() {
    return this.byId('Player-status');
  }

  get elapsed() {
    return this.byId('Player-elapsed');
  }

  /** "1:23" → 83. */
  async elapsedSeconds(): Promise<number> {
    const [m, s] = (await this.elapsed.getText()).split(':').map(Number);
    return m * 60 + s;
  }

  /** Elapsed time has moved past `from`: proves audio is actually advancing. */
  async waitForElapsedAbove(from: number, timeout = 10_000): Promise<number> {
    let now = from;
    await this.elapsed.waitUntil(async () => (now = await this.elapsedSeconds()) > from, {
      timeout,
      timeoutMsg: `elapsed time stuck at ${from}s`,
    });
    return now;
  }

  /** Returns only once the Player is gone and Sleep is back: the next tap must not hit the pop animation. */
  async close(): Promise<void> {
    await this.byId('Player-close').click();
    await this.root.waitForDisplayed({ reverse: true });
    await sleepScreen.waitForOpen();
  }
}

export const playerScreen = new PlayerScreen();
