import { BaseScreen } from './BaseScreen.js';

export { tabBar } from './TabBar.js';
export { sleepScreen } from './SleepScreen.js';
export { playerScreen } from './PlayerScreen.js';
export { paywallScreen } from './PaywallScreen.js';

/** Screens with nothing to do beyond "is it open". */
class Simple extends BaseScreen {}
export const homeScreen = new Simple('Home-screen');
export const formsScreen = new Simple('Forms-screen');
