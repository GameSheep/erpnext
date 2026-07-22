// Cross-platform replacement for banking/'s `cp` in the build script.
// Copies the Vite-produced index.html from erpnext/public/desk2/index.html
// to erpnext/www/desk2.html so Frappe serves it as a Jinja page.
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const SRC = resolve(root, '../erpnext/public/desk2/index.html');
const DEST = resolve(root, '../erpnext/www/desk2.html');

try {
	await stat(SRC);
} catch {
	console.error(`[copy-html-entry] source not found: ${SRC}`);
	console.error('Did you forget to run "vite build" first?');
	process.exit(1);
}

await mkdir(dirname(DEST), { recursive: true });
await copyFile(SRC, DEST);
console.log(`[copy-html-entry] copied ${SRC} -> ${DEST}`);
