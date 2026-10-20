// Import a reviewed release bundle, verifying the manifest before copying it.
// Usage: node scripts/import-weather-wings.mjs /absolute/path/to/build/release
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2]) throw Error('Pass the reviewed Weather Wings release directory');
const release = resolve(process.argv[2]);
const manifest = JSON.parse(await readFile(resolve(release, 'release-manifest.json'), 'utf8'));
if (!/^r-[a-f0-9]{16}$/.test(manifest.revision)) throw Error('Invalid release revision');
const source = resolve(release, manifest.revision);
const output = resolve(site, 'public/weather-wings', manifest.revision);
const excluded = new Set(['src/rainfall.html', 'src/sound-lab.html', 'src/sound-lab.mjs']);
const files = [];
for (const file of manifest.files) {
  if (file.path.includes('..') || file.path.startsWith('/') || file.path.split('/').includes('secrets')) throw Error('Invalid release path');
  const bytes = await readFile(resolve(source, file.path));
  if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw Error(`Release hash mismatch: ${file.path}`);
  if (excluded.has(file.path)) continue;
  await mkdir(dirname(resolve(output, file.path)), { recursive: true });
  await copyFile(resolve(source, file.path), resolve(output, file.path));
  files.push(file);
}
await writeFile(resolve(site, 'src/lib/weather-wings-release.json'), JSON.stringify({ revision: manifest.revision, files }, null, 2) + '\n');
const artSource = await readFile(resolve(source, 'src/prepared-art.mjs'), 'utf8');
const art = JSON.parse(artSource.match(/export const PREPARED_ART=(.*);/)[1]);
const { DEFAULT_CITY } = await import(pathToFileURL(resolve(source, 'src/climate-cities.mjs')).href);
const { defaultBirdForCity } = await import(pathToFileURL(resolve(source, 'src/birds.mjs')).href);
await copyFile(resolve(source, 'src', art.previews[DEFAULT_CITY]), resolve(site, 'public/weather-wings/cover.webp'));
await copyFile(resolve(source, 'src', art.birds[defaultBirdForCity(DEFAULT_CITY)][2].src), resolve(site, 'public/weather-wings/bird.webp'));
const revisions = (await readdir(resolve(site, 'public/weather-wings'))).filter(name => /^r-[a-f0-9]{16}$/.test(name)).sort();
const headers = resolve(site, 'public/_headers');
const text = await readFile(headers, 'utf8');
const policy = '# The Weather Wings revision directories are immutable; the entry page revalidates.\n'
  + revisions.map(name => `/weather-wings/${name}/*\n  ! Cache-Control\n  Cache-Control: public, max-age=31536000, immutable\n`).join('\n');
await writeFile(headers, text.replace(/# The Weather Wings revision[^\n]*\n(?:\/weather-wings\/[^\n]*\n(?:  [^\n]*\n)*\n?)+/, policy + '\n'));
console.log(`Weather Wings: ${manifest.revision}, ${files.length} verified public files`);
