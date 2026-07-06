// RSS feed of the Reads (the longform pieces — the beats deck and dashboards
// are interactive surfaces, not feed items). Items come from the reads
// registry, the same single source the /economy index renders from.
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { READS } from '../lib/reads-index';

export function GET(context: APIContext) {
  return rss({
    title: 'Time Series of India — Reads',
    description:
      'Short data-driven reads on India’s payment systems — UPI, cards, RTGS and the banks behind them — charted from official RBI and NPCI releases.',
    site: context.site!,
    items: READS.map((read) => ({
      title: read.title,
      description: read.deck,
      link: `/economy/reads/${read.slug}/`,
      pubDate: new Date(`${read.published}T00:00:00+05:30`),
    })),
    customData: '<language>en-in</language>',
  });
}
