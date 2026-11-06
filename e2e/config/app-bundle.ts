/**
 * App bundle management: which build is under test, and is it the right one?
 *
 * Resolution order (first hit wins):
 *   1. APP=<path>                       explicit .app / .zip / .apk
 *   2. ../apps/<APP_VARIANT>/            newest matching bundle (variant defaults to "release")
 *   3. nothing                           test whatever is already installed on the device
 *
 * Layout written by `npm run app:fetch`:
 *   apps/release/demo-app-release.apk    apps/test/demo-app-test.apk
 *   apps/release/wdiodemoapp.app         apps/<variant>/manifest.json  (where it came from)
 *
 * Metadata (id, version, build number) is read from the bundle itself, so a run
 * can fail fast on the wrong app and the report records exactly what was tested.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Platform = 'ios' | 'android';
export type Variant = 'release' | 'test';

export const APP_IDS: Record<Platform, string> = {
  ios: 'dev.tmoravec.wdiodemoapp',
  android: 'com.wdiodemoapp',
};

export const APPS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../apps');

export interface AppBundle {
  path: string;
  platform: Platform;
  id: string;
  version: string;
  build: string;
  /** Where it came from (CI run, release tag, local build), if a manifest exists. */
  source?: Record<string, unknown>;
}

export function variant(): Variant {
  const v = (process.env.APP_VARIANT ?? 'release').toLowerCase();
  if (v !== 'release' && v !== 'test') throw new Error(`APP_VARIANT must be "release" or "test", got "${v}"`);
  return v;
}

const EXT: Record<Platform, string[]> = { ios: ['.app', '.zip'], android: ['.apk'] };

/** Path of the bundle to install, or undefined to use the already-installed app. */
export function resolveAppPath(platform: Platform): string | undefined {
  if (process.env.APP) {
    const p = resolve(process.env.APP);
    if (!existsSync(p)) throw new Error(`APP="${process.env.APP}" does not exist`);
    return p;
  }
  const dir = join(APPS_ROOT, variant());
  if (!existsSync(dir)) return undefined;
  const hits = readdirSync(dir)
    .filter((f) => EXT[platform].some((e) => f.endsWith(e)))
    .map((f) => join(dir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (hits.length > 1) console.warn(`[app] ${hits.length} bundles in ${dir}; using newest: ${hits[0]}`);
  return hits[0];
}

function sh(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** A zipped .app (what CI uploads) is unpacked to a temp dir just to read Info.plist. */
function iosAppDir(path: string): string {
  if (!path.endsWith('.zip')) return path;
  const out = mkdtempSync(join(tmpdir(), 'app-'));
  sh('unzip', ['-q', path, '-d', out]);
  const app = readdirSync(out).find((f) => f.endsWith('.app'));
  if (!app) throw new Error(`${path} contains no .app`);
  return join(out, app);
}

function readIos(path: string): Omit<AppBundle, 'path' | 'platform'> {
  const plist = join(iosAppDir(path), 'Info.plist');
  const info = JSON.parse(sh('plutil', ['-convert', 'json', '-o', '-', plist])) as Record<string, string>;
  return { id: info.CFBundleIdentifier, version: info.CFBundleShortVersionString, build: info.CFBundleVersion };
}

/** aapt2 ships in Android build-tools; pick the newest one under ANDROID_HOME. */
function aapt2(): string {
  const home = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? join(process.env.HOME ?? '', 'Library/Android/sdk');
  const tools = join(home, 'build-tools');
  if (!existsSync(tools)) throw new Error(`No Android build-tools under ${home}; set ANDROID_HOME`);
  const newest = readdirSync(tools).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop();
  return join(tools, newest!, 'aapt2');
}

function readAndroid(path: string): Omit<AppBundle, 'path' | 'platform'> {
  // package: name='com.wdiodemoapp' versionCode='21' versionName='2.3.0' ...
  const line = sh(aapt2(), ['dump', 'badging', path]).split('\n')[0];
  const attr = (k: string) => line.match(new RegExp(`${k}='([^']*)'`))?.[1] ?? '?';
  return { id: attr('name'), version: attr('versionName'), build: attr('versionCode') };
}

export function inspectBundle(path: string): AppBundle {
  const platform: Platform = path.endsWith('.apk') ? 'android' : 'ios';
  const meta = platform === 'ios' ? readIos(path) : readAndroid(path);
  const manifest = join(dirname(path), 'manifest.json');
  const source = existsSync(manifest) ? (JSON.parse(readFileSync(manifest, 'utf8')) as Record<string, unknown>) : undefined;
  return { path, platform, ...meta, source };
}

/**
 * Install the bundle onto a known device, always replacing what is there (app data is kept).
 *
 * Done here, once per run, instead of via the `appium:app` capability: with `noReset`,
 * UiAutomator2 installs only when the package is missing, so a rebuilt APK with an unchanged
 * versionCode was silently NOT installed and the suite tested the previous build.
 */
export function installBundle(bundle: AppBundle, udid: string): void {
  console.log(`[app] installing ${bundle.id} ${bundle.version} (${bundle.build}) on ${udid}`);
  if (bundle.platform === 'android') {
    sh('adb', ['-s', udid, 'install', '-r', '-d', bundle.path]); // -r replace, -d allow downgrade
  } else {
    sh('xcrun', ['simctl', 'install', udid, iosAppDir(bundle.path)]);
  }
}

/** Throws if the bundle is not our app: catches "tested the wrong APK" before a 5-minute run. */
export function assertExpectedBundle(bundle: AppBundle): void {
  const expected = APP_IDS[bundle.platform];
  if (bundle.id !== expected) {
    throw new Error(`App under test is "${bundle.id}" but this suite targets "${expected}" (${bundle.path})`);
  }
}
