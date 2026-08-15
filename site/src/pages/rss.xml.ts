// RSS feed of reads, puzzles and publication events (the written pieces, the
// numbered puzzle drops, and the one-off releases — a game, a flagship — that
// are publications without being a series; the decks and dashboards are
// interactive surfaces, not feed items).
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

  // One item, once: a game is a publication event like a numbered puzzle,
  // even though the game itself keeps no schedule. The date is the dispatch's
  // and moves with it if the release slips (see DISPATCHES['2-inflation']).
  const gameItems = [
    {
      title: 'Inflation Peaks',
      description:
        "Drive a wheel over India's inflation series, 1969 to 2026. The terrain is the real monthly rate; the score is how many months you survive.",
      link: '/economy/play/inflation-peaks/',
      pubDate: new Date('2026-08-08T00:00:00+05:30'),
    },
  ];

  // The Independence Day flagship. Same shape as the game item above and for
  // the same reason: it is a publication event, it is an .astro page rather
  // than a collection entry, and there is no registry that owns it. The date is
  // the release date, not the build date.
  //
  // The description is the page's own standfirst verbatim, which means the feed
  // keeps the piece's withholding intact — a reader meets it in their reader
  // the same way they meet it on the site. Nothing here names the series.
  //
  // The trailing slash matches every other link in this feed, and the link IS
  // the guid: it must never churn. See the two warnings above.
  const flagshipItems = [
    {
      // R2m: the piece is named. "The walk" was the working title. See the note
      // at the head of independence.astro — "Midnight" is Nehru's and gives the
      // series away no more than "walk" did.
      title: 'The Walk through Midnight',
      description:
        'Four and a quarter centuries of India, on foot. Walk it yourself; the ground will ' +
        'explain itself at the end.',
      link: '/independence/',
      pubDate: new Date('2026-08-15T00:00:00+05:30'),
    },
  ];

  const items = [...readItems, ...puzzleItems, ...gameItems, ...flagshipItems].sort(
    (a, b) => b.pubDate.getTime() - a.pubDate.getTime()
  );

  return rss({
    title: 'Time Series of India',
    description:
      'Data-driven reads, games and explorable charts on India in official numbers — how the country moves money and what that money buys — from RBI, NPCI, MoSPI and Labour Bureau data.',
    site: context.site!,
    items,
    customData: '<language>en-in</language>',
  });
}
