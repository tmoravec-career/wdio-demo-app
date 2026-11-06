import { $ } from '@wdio/globals';

/** Tab buttons carry accessibilityLabel = tab title (src/components/CustomBottomTabBar.tsx). */
export type Tab = 'Home' | 'Sleep' | 'Webview' | 'Login' | 'Forms' | 'Swipe' | 'Drag';

class TabBar {
  async open(tab: Tab): Promise<void> {
    await $(`~${tab}`).click();
  }
}

export const tabBar = new TabBar();
