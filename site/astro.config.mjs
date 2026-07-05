// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://timeseriesofindia.com',
  // Sitemap of the indexable pages only — the dashboards and beats deck are
  // noindex (interactive tools / experimental), so keep them out of search.
  integrations: [
    sitemap({ filter: (page) => !page.includes('/dashboards') }),
  ],
  // The Beats deck is now the home page; redirect the old deck URL.
  // /economy/reads has no index page (reads list lives on /economy); send
  // trimmed read URLs there instead of a 404.
  redirects: {
    '/economy/beats/payments': '/',
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
