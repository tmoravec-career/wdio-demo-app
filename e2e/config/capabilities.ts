/**
 * Device auto-detection → Appium capabilities.
 *
 * Anything you set explicitly wins; anything you leave unset is detected from
 * what is booted/connected right now:
 *
 *   PLATFORM         ios | android     unset → whichever platform has a device (iOS if both do)
 *   IOS_DEVICE       simulator name    unset → first booted simulator
 *   IOS_VERSION      iOS version       unset → that simulator's runtime
 *   ANDROID_DEVICE   adb serial        unset → first entry in `adb devices`
 *   ANDROID_VERSION  Android version   unset → read from the device via adb
 *
 * Lifecycle policy: `noReset: true` everywhere. Appium never wipes the app between
 * sessions; each spec decides how much state to reset (see src/support/app.ts).
 * That keeps sessions fast and makes resets explicit, visible, and testable.
 */
import { execFileSync } from 'node:child_process';
import { APP_IDS, resolveAppPath, type Platform } from './app-bundle.js';

const env = process.env;

function run(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

interface IosSim { name: string; udid: string; version: string }

/** Booted iOS simulators; runtime key "com.apple.CoreSimulator.SimRuntime.iOS-18-4" → "18.4". */
function bootedIosSims(): IosSim[] {
  const out = run('xcrun', ['simctl', 'list', 'devices', 'booted', '-j']);
  if (!out) return [];
  const { devices } = JSON.parse(out) as { devices: Record<string, { name: string; udid: string }[]> };
  return Object.entries(devices).flatMap(([runtime, list]) => {
    const m = runtime.match(/iOS-(\d+)-(\d+)/);
    if (!m) return [];
    return list.map((d) => ({ name: d.name, udid: d.udid, version: `${m[1]}.${m[2]}` }));
  });
}

interface AndroidDevice { serial: string; model: string; emulator: boolean }

/** Devices in state "device" (skips "offline"/"unauthorized"). */
function connectedAndroid(): AndroidDevice[] {
  return run('adb', ['devices', '-l'])
    .split('\n')
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p[1] === 'device')
    .map((p) => ({
      serial: p[0],
      model: p.find((x) => x.startsWith('model:'))?.slice(6) ?? p[0],
      emulator: p[0].startsWith('emulator-'),
    }));
}

/**
 * Shared by both platforms: never auto-wipe. When the device is known, wdio.conf.ts
 * installs the bundle itself in onPrepare; only for a simulator Appium still has to boot
 * (no udid yet) is the bundle handed to Appium as `appium:app`.
 */
function appCaps(platform: Platform, udid: string | undefined): WebdriverIO.Capabilities {
  const app = udid ? undefined : resolveAppPath(platform);
  return {
    ...(app ? { 'appium:app': app } : {}),
    'appium:noReset': true,
    'appium:fullReset': false,
    'appium:newCommandTimeout': 240,
  };
}

function iosCapabilities(): WebdriverIO.Capabilities {
  const sims = bootedIosSims();
  const match = sims.find(
    (s) => (!env.IOS_DEVICE || s.name === env.IOS_DEVICE) && (!env.IOS_VERSION || s.version === env.IOS_VERSION),
  );
  if (!match && !(env.IOS_DEVICE && env.IOS_VERSION)) {
    throw new Error(
      'No matching booted iOS simulator. Boot one (xcrun simctl boot "iPhone 16") ' +
        'or set IOS_DEVICE and IOS_VERSION so Appium can boot it.',
    );
  }
  const name = env.IOS_DEVICE ?? match!.name;
  const version = env.IOS_VERSION ?? match!.version;
  console.log(`[config] iOS → ${name} (${version})${match ? ` udid=${match.udid}` : ' (Appium will boot it)'}`);
  return {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': name,
    'appium:platformVersion': version,
    ...(match ? { 'appium:udid': match.udid } : {}),
    'appium:bundleId': APP_IDS.ios,
    'appium:wdaLaunchTimeout': 240_000,
    ...appCaps('ios', match?.udid),
  };
}

function androidCapabilities(): WebdriverIO.Capabilities {
  const devices = connectedAndroid();
  const device = env.ANDROID_DEVICE ? devices.find((d) => d.serial === env.ANDROID_DEVICE) : devices[0];
  if (!device) {
    throw new Error(
      env.ANDROID_DEVICE
        ? `ANDROID_DEVICE="${env.ANDROID_DEVICE}" is not in \`adb devices\` (or is offline/unauthorized).`
        : 'No Android device in `adb devices`. Start an emulator or plug in a phone with USB debugging on.',
    );
  }
  const version =
    env.ANDROID_VERSION ?? (run('adb', ['-s', device.serial, 'shell', 'getprop', 'ro.build.version.release']).trim() || undefined);
  console.log(
    `[config] Android → ${device.model} serial=${device.serial} ` +
      `(${device.emulator ? 'emulator' : 'real device'}${version ? `, Android ${version}` : ''})`,
  );
  return {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': device.model,
    'appium:udid': device.serial,
    ...(version ? { 'appium:platformVersion': version } : {}),
    'appium:appPackage': APP_IDS.android,
    'appium:appActivity': '.MainActivity',
    'appium:uiautomator2ServerInstallTimeout': 120_000,
    ...appCaps('android', device.serial),
  };
}

export function resolvePlatform(): Platform {
  if (env.PLATFORM) {
    const p = env.PLATFORM.toLowerCase();
    if (p !== 'ios' && p !== 'android') throw new Error(`PLATFORM must be "ios" or "android", got "${p}"`);
    return p;
  }
  if (env.IOS_DEVICE || env.IOS_VERSION) return 'ios';
  if (env.ANDROID_DEVICE || env.ANDROID_VERSION) return 'android';
  if (bootedIosSims().length) return 'ios';
  if (connectedAndroid().length) return 'android';
  throw new Error('No booted iOS simulator or connected Android device found, and PLATFORM is not set.');
}

export function capabilitiesFor(platform: Platform): WebdriverIO.Capabilities {
  return platform === 'ios' ? iosCapabilities() : androidCapabilities();
}
