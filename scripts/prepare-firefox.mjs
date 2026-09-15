import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(__dirname, '..');
const DIST_DIR = resolve(PROJECT, 'dist');
const FIREFOX_DIR = resolve(PROJECT, 'dist-firefox');
const MANIFEST_PATH = resolve(FIREFOX_DIR, 'manifest.json');

if (!existsSync(resolve(DIST_DIR, 'manifest.json'))) {
  console.error('No dist/manifest.json found. Run `npm run build` first.');
  process.exit(1);
}

// Copy the (Chrome-valid) build, then fix the copy for Firefox.
// dist/ stays valid for Chrome — this never mutates it.
rmSync(FIREFOX_DIR, { recursive: true, force: true });
cpSync(DIST_DIR, FIREFOX_DIR, { recursive: true });

try {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));

  manifest.browser_specific_settings = {
    gecko: {
      id: 'etyr@etyr.app',
      strict_min_version: '109.0',
    },
  };

  manifest.background = {
    scripts: ['background/service-worker.js'],
    type: 'module',
  };

  delete manifest.background.service_worker;

  if (manifest.options_page) {
    manifest.options_ui = {
      page: manifest.options_page,
      open_in_tab: true,
    };
    delete manifest.options_page;
  }

  if (manifest.content_security_policy) {
    delete manifest.content_security_policy;
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Firefox build ready in ${FIREFOX_DIR} (Chrome dist/ untouched).`);
} catch (err) {
  console.error('Failed to prepare Firefox manifest:', err);
  process.exit(1);
}