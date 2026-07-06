// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://timeseriesofindia.com',
  // Sitemap of the indexable pages only: dashboards are noindex (interactive
  // tools / experimental), and the theme stubs ([theme].astro "coming soon"
  // pages) are noindex until they carry real content.
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/dashboards') &&
        !/\/(environment|infrastructure|demographics|governance)\/$/.test(page),
    }),
  ],
  // Static fallback redirects (meta-refresh pages). In production Cloudflare's
  // public/_redirects serves proper 301s for the same paths and wins; these
  // keep `astro dev`/`preview` behaving the same. Destinations match the
  // _redirects targets exactly so neither path double-hops.
  // '/' also redirects to /economy/beats (src/pages/index.astro) until a second
  // section ships and '/' becomes a real section-picker landing page.
  redirects: {
    '/economy/beats/payments': '/economy/beats',
    '/economy/reads': '/economy',
  },
  // Dev-only: proxy the Grafana /g/ sub-path to the local Grafana so kiosk
  // iframes work on the `astro dev` server (:4321). In production nginx serves
  // this proxy; the built static site is unaffected.
  vite: {
    server: {
      // Allow access over the Tailscale tailnet (and any *.ts.net magic-DNS host)
      // in addition to localhost — dev server is reached remotely.
      allowedHosts: ['.ts.net'],
      proxy: {
        '/g': {
          target: 'http://localhost:3100',
          changeOrigin: true,
          // Rewrite Origin/Referer to Grafana's own root_url host so its origin
          // check passes regardless of which tailnet host the browser used.
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('origin', 'http://localhost');
              proxyReq.setHeader('referer', 'http://localhost/g/');
            });
          },
        },
      },
    },
  },
});
