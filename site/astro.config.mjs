// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { READS } from './src/lib/reads-index.ts';

// Retired short reads — unlisted everywhere, so out of the sitemap too. Read
// from the reads registry rather than restated here, so retiring a read is
// still a one-word change in that one file.
const SHORT_PATHS = READS.filter((r) => r.kind === 'short').map(
  (r) => `/economy/read/${r.slug}/`,
);

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://timeseriesofindia.com',
  // Sitemap of the indexable pages only: the payments dashboard is canonical
  // and indexable since the desks fold (Jul 2026); the explore index stays
  // noindex until it carries more than one product, and the theme stubs
  // ([theme].astro "coming soon" pages) are noindex until they carry real
  // content. The retired payments deck is unlisted from the play rack, so it
  // leaves the sitemap too: still served, just no longer advertised to
  // crawlers. Retired short reads leave it for the same reason (Jul 2026) —
  // they were listed here while being unlisted in the UI, which is how search
  // kept sending readers to pages no index links to.
  integrations: [
    sitemap({
      filter: (page) =>
        (page.includes('/explore/payments') || !page.includes('/explore')) &&
        !page.includes('/play/payments') &&
        !SHORT_PATHS.some((p) => page.endsWith(p)) &&
        !/\/(environment|infrastructure|demographics|governance)\/$/.test(page),
    }),
  ],
  // Static fallback redirects (meta-refresh pages). In production Cloudflare's
  // public/_redirects serves proper 301s for the same paths and wins; these
  // keep `astro dev`/`preview` behaving the same. Destinations match the
  // _redirects targets exactly so neither path double-hops.
  // '/' is a real page now — the dispatch front page (src/pages/index.astro).
  // Format rename (Jul 2026): beats → play, reads → read, dashboards →
  // explore. '/economy' 301s to the read shelf (its default view); /economy
  // stays reserved for a future real section front. The dynamic pairs cover
  // deck/dashboard deep links; old per-read URLs (individual .astro pages, no
  // dynamic destination route to pair with) are covered by _redirects only —
  // in production every old deep link 301s.
  // Desks fold (Jul 2026): the six standalone dashboard pages retired into
  // /economy/explore/payments, so both the old /dashboards/* names and the
  // retired /explore/* slugs point straight at it (no dynamic destination
  // route remains to pair a [slug] redirect with).
  // Retired formats point at listed pages, not at the unlisted survivor: the
  // old beats URL goes to the front page, retired shorts to the read shelf
  // (see the _redirects header for why). The old /beats/[deck] pair is gone
  // with it — a static destination has no dynamic segment to pair with, and
  // prod covers the deep link through _redirects.
  redirects: {
    '/economy': '/economy/read',
    '/economy/reads': '/economy/read',
    '/economy/beats': '/',
    '/economy/dashboards': '/economy/explore',
    ...Object.fromEntries(
      [
        'overview',
        'product-view',
        'bank-performance',
        'upi-ecosystem',
        'mcc',
        'state-wise',
      ].flatMap((slug) => [
        [`/economy/dashboards/${slug}`, '/economy/explore/payments'],
        [`/economy/explore/${slug}`, '/economy/explore/payments'],
      ]),
    ),
  },
  vite: {
    server: {
      // Allow access over the Tailscale tailnet (and any *.ts.net magic-DNS host)
      // in addition to localhost — dev server is reached remotely.
      allowedHosts: ['.ts.net'],
    },
  },
});
