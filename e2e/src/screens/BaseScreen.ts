import { $ } from '@wdio/globals';

/**
 * Every screen has a root element with a test id (`<Name>-screen`). The app sets
 * `testID` on iOS and `accessibilityLabel` on Android (src/config/TestProperties.ts),
 * so the accessibility-id selector `~id` is one locator that works on both.
 *
 * Screens expose intent-level methods and element getters. Assertions stay in specs.
 */
export abstract class BaseScreen {
  constructor(private readonly rootId: string) {}

  protected byId(id: string): ChainablePromiseElement {
    return $(`~${id}`);
  }

  get root(): ChainablePromiseElement {
    return this.byId(this.rootId);
  }

  async waitForOpen(timeout?: number): Promise<this> {
    await this.root.waitForDisplayed({ timeout, timeoutMsg: `${this.rootId} did not open` });
    return this;
  }

  async isOpen(): Promise<boolean> {
    return this.root.isDisplayed();
  }
}

type ChainablePromiseElement = ReturnType<typeof $>;
