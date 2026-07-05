// Build-time reading-time estimate for a read, derived from the prose in its
// page source. Runs only in Astro's SSG server context (uses node:fs). Strips
// the frontmatter fence, <script>/<style> blocks and HTML/expression markup,
// counts remaining words, and divides by an average reading speed. Approximate
// by nature — surfaced as "N min read" on the index cards and read headers.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WPM = 200;
const cache = new Map<string, number>();

export function readingMinutes(slug: string): number {
  if (cache.has(slug)) return cache.get(slug)!;
  let words = 0;
  try {
    // Anchored to cwd (site/) — reliable under Astro's bundling, unlike
    // import.meta.url which points into the build output once bundled.
    const path = resolve(process.cwd(), 'src/pages/economy/reads', `${slug}.astro`);
    let src = readFileSync(path, 'utf8');
    src = src.replace(/^---[\s\S]*?---/, ' ');          // frontmatter fence
    src = src.replace(/<script[\s\S]*?<\/script>/gi, ' '); // client scripts
    src = src.replace(/<style[\s\S]*?<\/style>/gi, ' ');   // styles
    src = src.replace(/\{[^{}]*\}/g, ' ');                // JSX expressions
    src = src.replace(/<[^>]+>/g, ' ');                   // tags
    src = src.replace(/&[a-z]+;/gi, ' ');                 // entities
    words = (src.match(/[A-Za-z0-9’']+/g) || []).length;
  } catch {
    words = 0;
  }
  const minutes = Math.max(2, Math.round(words / WPM));
  cache.set(slug, minutes);
  return minutes;
}
