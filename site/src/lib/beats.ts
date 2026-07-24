// "Beats" — the reflective story format: an ordered deck of insight cards, each
// one headline + a sentence or two + a single chart that *is* the punchline.
// Rendered by BeatsDeck.astro (swipe on mobile, vertical sequence on desktop)
// through the dashboard runtime (buildPanel). Figures shown precisely by the
// charts come from build-time data (beats.json); the prose carries the meaning.
import type { PanelSpec } from './dashboards/runtime';
import type { Theme } from './themes';
import { dataUrl } from './data-url';

export interface Beat {
  id: string;
  kicker: string;
  headline: string;
  body: string;
  dataKey: string; // key into the deck's dataset object (beats.json)
  panel: PanelSpec;
}

export interface BeatDeck {
  slug: string;
  theme: Theme; // subject cluster within the section (kicker label + grouping)
  title: string;
  deck: string; // standfirst on the intro card
  dataset: string; // a {key: rows[]} object
  source?: string; // attribution caption rendered under every chart (legal load-bearing)
  beats: Beat[];
}

export const BEAT_DECKS: Record<string, BeatDeck> = {
  payments: {
    slug: 'payments',
    theme: 'payments',
    title: 'Six things India’s payment data knows',
    deck: 'A swipe through what the numbers reveal about how the country moves money. One chart, one idea at a time.',
    dataset: dataUrl('/data/economy/beats.json'),
    beats: [
      {
        id: 'rise', kicker: 'The rail', dataKey: 'upi-rise',
        headline: 'UPI went six-fold in four years',
        body: 'In 2021 Indians made <span class="num" data-count="37890000000">3,789 crore</span> UPI payments; by 2025, more than six times as many. It’s now the world’s largest real-time payment system.',
        panel: { id: 'rise', title: '', chart: 'bar', encoding: { x: 'year', y: 'volume_cr' } },
      },
      {
        id: 'fails', kicker: 'Reliability', dataKey: 'reliability',
        headline: 'UPI got more reliable as it got bigger',
        body: 'Six times the volume, and UPI’s technical-failure rate still fell the whole way, from about 1.5% of payments to 0.4%. Systems usually strain under that kind of load. This one hardened.',
        panel: { id: 'fails', title: '', chart: 'line', encoding: { x: 'year', y: 'td_pct' } },
      },
      {
        id: 'duopoly', kicker: 'Who owns the rail', dataKey: 'app-share',
        headline: 'Two apps run 83% of UPI',
        body: 'PhonePe and Google Pay have split four-fifths of UPI volume between them for four straight years, even as the regulator’s 30% market-share cap keeps getting deferred.',
        panel: { id: 'duopoly', title: '', chart: 'area', encoding: { x: 'year', series: 'key', y: 'share_pct' } },
      },
      {
        id: 'shift', kicker: 'One constant', dataKey: 'rank-shift',
        headline: 'Groceries stayed #1 while everything below it reshuffled',
        body: 'Rank India’s UPI categories by number of payments and only groceries never moves, #1 every year. Beneath it the order churns: fast food climbs from last to second, loans and stocks sink to the bottom.',
        panel: { id: 'shift', title: '', chart: 'bump', encoding: { x: 'year', series: 'key', y: 'volume_mn' } },
      },
      {
        id: 'cards', kicker: 'Cards', dataKey: 'credit-debit',
        headline: 'UPI killed the debit card, not the credit card',
        body: 'Debit-card payments have collapsed since 2021 as people scan a QR code instead. Credit kept climbing and overtook debit in 2023, because a credit card isn’t really a payment tool: it’s a loan.',
        panel: { id: 'cards', title: '', chart: 'line', encoding: { x: 'year', series: 'key', y: 'volume_cr' } },
      },
      {
        id: 'ticket', kicker: 'What each rail is for', dataKey: 'ticket-spread',
        headline: 'One RTGS transfer is worth 5,000 UPI payments',
        body: 'The average RTGS transfer moves about <span class="num" data-inr="6600000">₹66 lakh</span>; an average UPI payment, ₹1,313; a FASTag toll, ₹181. “Payments” is really many systems: one for corporate fortunes, one for chai.',
        panel: { id: 'ticket', title: '', chart: 'bar', encoding: { x: 'key', y: 'ticket_rs', sort: 'desc', horizontal: true } },
      },
    ],
  },
};

export const getDeck = (slug: string) => BEAT_DECKS[slug];
