/**
 * App bundle CLI: get a build onto disk in the layout the suite expects, and say what it is.
 *
 *   npm run app:fetch -- --variant test                 latest green build-android run on main
 *   npm run app:fetch -- --variant release --run 123    a specific CI run
 *   npm run app:fetch -- --platform ios --tag v2.3.0    a GitHub release asset
 *   npm run app:info                                    what the suite would install right now
 *   npm run app:info -- path/to/app.apk                 any bundle
 *
 * Writes apps/<variant>/<bundle> + apps/<variant>/manifest.json (run id, commit, when),
 * so every test report can be traced back to the commit that produced the binary.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { APPS_ROOT, assertExpectedBundle, inspectBundle, resolveAppPath, type Platform } from '../config/app-bundle.js';

const BUILD_WORKFLOW = 'build-android.yml';

const gh = (...args: string[]) => execFileSync('gh', args, { encoding: 'utf8' }).trim();

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    platform: { type: 'string', default: 'android' },
    variant: { type: 'string', default: 'release' },
    run: { type: 'string' },
    tag: { type: 'string' },
  },
});
const [command = 'info', target] = positionals;
const platform = values.platform as Platform;

function fetchFromRun(dir: string): Record<string, unknown> {
  if (platform !== 'android') throw new Error('CI runs only build Android; use --tag for iOS');
  const runId =
    values.run ??
    gh('run', 'list', '--workflow', BUILD_WORKFLOW, '--branch', 'main', '--status', 'success', '-L', '1', '--json', 'databaseId', '-q', '.[0].databaseId');
  if (!runId) throw new Error(`No successful ${BUILD_WORKFLOW} run on main`);
  const run = JSON.parse(gh('run', 'view', runId, '--json', 'headSha,createdAt,url')) as Record<string, string>;
  gh('run', 'download', runId, '--name', `demo-app-${values.variant}`, '--dir', dir);
  return { source: 'ci-run', runId, commit: run.headSha, builtAt: run.createdAt, url: run.url };
}

function fetchFromRelease(dir: string): Record<string, unknown> {
  const pattern = platform === 'android' ? '*.apk' : '*.zip';
  gh('release', 'download', values.tag!, '--pattern', pattern, '--dir', dir, '--clobber');
  // Unpack the iOS zip: Appium accepts .zip, but an .app is quicker to install and inspect.
  for (const zip of readdirSync(dir).filter((f) => f.endsWith('.zip'))) {
    execFileSync('unzip', ['-q', '-o', join(dir, zip), '-d', dir]);
    rmSync(join(dir, zip));
  }
  return { source: 'release', tag: values.tag };
}

function fetch(): void {
  const dir = join(APPS_ROOT, values.variant!);
  // One bundle per variant directory: no guessing which of three APKs got tested.
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const source = values.tag ? fetchFromRelease(dir) : fetchFromRun(dir);
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ ...source, variant: values.variant, fetchedAt: new Date().toISOString() }, null, 2));
  process.env.APP_VARIANT = values.variant;
  info(resolveAppPath(platform));
}

function info(path: string | undefined): void {
  if (!path) {
    console.log('No bundle found: the suite will test the app already installed on the device.');
    return;
  }
  const bundle = inspectBundle(path);
  assertExpectedBundle(bundle);
  console.log(JSON.stringify(bundle, null, 2));
}

if (command === 'fetch') fetch();
else if (command === 'info') info(target ?? resolveAppPath(platform));
else throw new Error(`Unknown command "${command}" (fetch | info)`);
