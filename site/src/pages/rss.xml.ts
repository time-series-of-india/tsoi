// RSS feed of reads and puzzles (the written pieces and the numbered puzzle
// drops — the decks and dashboards are interactive surfaces, not feed items).
// Reads come from the reads registry, the same single source the
// /economy/read shelf renders from. Puzzles come from the Off by How Much?
// puzzle data, one item per released puzzle, linked to its numbered permalink.
// Retired shorts stay in the feed: they were published to it, and feeds are
// history, not a listing.
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { READS } from '../lib/reads-index';
import offByHowMuch from '../data/play/off-by-how-much.json';

export function GET(context: APIContext) {
  const readItems = READS.map((read) => ({
    title: read.title,
    description: read.deck,
    // Renaming /economy/reads → /economy/read (Jul 2026) churned these
    // links, and the link doubles as the item guid: subscribers saw the back
    // catalog flash unread once. Accepted while the audience is small —
    // never churn these casually again.
    link: `/economy/read/${read.slug}/`,
    pubDate: new Date(`${read.published}T00:00:00+05:30`),
  }));

  const puzzleItems = offByHowMuch.puzzles.map((puzzle) => ({
    title: `Off by How Much? — Puzzle No. ${puzzle.n}`,
    description:
      "Four real numbers from India's payment systems. Guess each one, then find out how far off you were.",
    // Numbered permalink, not the floating canonical /economy/play/off-by-how-much/
    // (which always points at the newest puzzle) — the link doubles as the item
    // guid above, and guids must never churn.
    link: `/economy/play/off-by-how-much/${puzzle.n}/`,
    pubDate: new Date(`${puzzle.released}T00:00:00+05:30`),
  }));

  const items = [...readItems, ...puzzleItems].sort(
    (a, b) => b.pubDate.getTime() - a.pubDate.getTime()
  );

  return rss({
    title: 'Time Series of India',
    description:
      'Data-driven reads and numbers puzzles on India in official numbers — how the country moves money — charted from RBI and NPCI data.',
    site: context.site!,
    items,
    customData: '<language>en-in</language>',
  });
}
