// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://timeseriesofindia.com',
  // Sitemap of the indexable pages only: the payments dashboard is canonical
  // and indexable since the desks fold (Jul 2026); the explore index stays
  // noindex until it carries more than one product, and the theme stubs
  // ([theme].astro "coming soon" pages) are noindex until they carry real
  // content. The retired payments deck is unlisted from the play rack, so it
  // leaves the sitemap too: still served, still 301-targeted from /economy/
  // beats, just no longer advertised to crawlers.
  integrations: [
    sitemap({
      filter: (page) =>
        (page.includes('/explore/payments') || !page.includes('/explore')) &&
        !page.includes('/play/payments') &&
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
  redirects: {
    '/economy': '/economy/read',
    '/economy/reads': '/economy/read',
    '/economy/beats': '/economy/play/payments/',
    '/economy/beats/[deck]': '/economy/play/[deck]',
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
