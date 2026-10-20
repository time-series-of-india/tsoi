import { readFileSync } from 'node:fs';
import { requirePublicationDate } from '../src/lib/publication-date.mjs';

const config = JSON.parse(readFileSync(new URL('../src/lib/weather-wings-publication.json', import.meta.url), 'utf8'));
try {
  requirePublicationDate(config.published);
  console.log(`Weather Wings publication date: ${config.published}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
