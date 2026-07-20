import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'dist/index.html',
  'dist/manifest.webmanifest',
  'dist/sw.js',
  'dist/parity-prep-icon.png',
];

await Promise.all(requiredFiles.map((file) => access(file)));

const [html, manifestText, serviceWorker] = await Promise.all([
  readFile('dist/index.html', 'utf8'),
  readFile('dist/manifest.webmanifest', 'utf8'),
  readFile('dist/sw.js', 'utf8'),
]);
const manifest = JSON.parse(manifestText);

if (manifest.name !== 'Parity Prep' || manifest.display !== 'standalone') {
  throw new Error('The generated web-app manifest is not installable as Parity Prep.');
}
if (manifest.start_url !== './' || manifest.scope !== './') {
  throw new Error('The manifest must remain scoped to its deployment directory.');
}
if (!manifest.icons?.some(({ src }) => src === 'parity-prep-icon.png')) {
  throw new Error('The generated manifest is missing the Parity Prep icon.');
}
if (/\b(?:src|href)="\/assets\//.test(html)) {
  throw new Error('The build contains root-relative assets that will fail on GitHub Pages.');
}
for (const asset of ['index.html', 'manifest.webmanifest', 'parity-prep-icon.png']) {
  if (!serviceWorker.includes(asset)) throw new Error(`The offline cache is missing ${asset}.`);
}

console.log('Verified installable, project-path-safe offline build.');
