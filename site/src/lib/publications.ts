// Front-page listing adapter. Authored titles and descriptions remain in their
// existing registries; a piece does not need a dispatch to appear here.
import { DISPATCHES } from './dispatches';
import { READS } from './reads-index';

export type Publication = {
  id: string;
  href: string;
  title: string;
  description: string;
  /** Short, verbatim excerpt for catalogue cards; full source prose is retained. */
  cardDescription?: string;
  format: 'Read' | 'Play' | 'Explore';
  section?: 'economy' | 'environment' | 'history';
  theme?: 'payments' | 'inflation';
  published?: string;
  coverage?: string;
  thumb?: string;
  art?: 'peaks' | 'gauge';
  initialRank: number;
};

const dispatchItems = Object.values(DISPATCHES).flatMap(d => d.items.map(item => ({ ...item, published: d.date, theme: d.theme })));
const byHref = (href: string) => {
  const item = dispatchItems.find(item => item.href === href);
  const read = READS.find(entry => href.endsWith(`/${entry.slug}`));
  return { title: read?.title ?? item?.title, description: read?.deck ?? item?.blurb,
    published: read?.published ?? item?.published, theme: read?.theme ?? item?.theme };
};

// A future independent piece can supply its authored fields and original date
// here directly. Historical dispatch membership is only a metadata source for
// the existing games and tools, never a condition for listing a piece.
type RecordInput = Pick<Publication, 'id' | 'href' | 'format'> & Partial<Pick<Publication, 'title' | 'description' | 'cardDescription' | 'published' | 'coverage' | 'theme' | 'thumb' | 'art'>>;
const records: RecordInput[] = [
  { id: 'peaks', href: '/economy/play/inflation-peaks/', format: 'Play', art: 'peaks', cardDescription: 'A driving game where the terrain is the inflation series.' },
  { id: 'upi', href: '/economy/read/upi-architecture', format: 'Read', thumb: '/thumbs/read/upi-seven-parties', cardDescription: 'Seven parties make it happen' },
  { id: 'inflation-explore', href: '/economy/explore/inflation', format: 'Explore', thumb: '/thumbs/explore/inflation', cardDescription: 'Every inflation desk on one page' },
  { id: 'inflation-read', href: '/economy/read/price-of-nearly-everything', format: 'Read', thumb: '/thumbs/read/price-of-nearly-everything', cardDescription: 'One number claims to describe a billion baskets.' },
  { id: 'off-by-how-much', href: '/economy/play/off-by-how-much/', format: 'Play', art: 'gauge', cardDescription: 'Four real numbers from India’s payment systems.' },
  { id: 'rupee-time-machine', href: '/economy/explore/rupee-time-machine', format: 'Explore', thumb: '/thumbs/explore/rupee-time-machine', cardDescription: 'Any amount, any two months since August 1969' },
  { id: 'payments-explore', href: '/economy/explore/payments', format: 'Explore', thumb: '/thumbs/explore/payments', cardDescription: 'Every rail on one board' },
];

export const LEAD_ID = 'weather-wings';
export const lead: Publication = {
  id: LEAD_ID, href: '/play/weather-wings/', title: 'Weather Wings',
  description: 'Fly through India’s seasons.',
  cardDescription: 'Each city’s climate data shapes the course you fly.',
  format: 'Play', section: 'environment', initialRank: -1,
};

export const economyPublications: Publication[] = records.map((record, initialRank) => {
  const source = byHref(record.href);
  const title = record.title ?? source.title;
  const description = record.description ?? source.description;
  if (!title || !description) throw new Error(`Missing authored publication metadata: ${record.id}`);
  return { ...record, title, description, section: 'economy', theme: record.theme ?? source.theme,
    published: record.published ?? source.published, initialRank };
});

export const publications: Publication[] = [
  { id: 'walk', href: '/independence/', title: 'The Walk through Midnight',
    description: 'Walk four and a quarter centuries of India, from Akbar’s court to now.',
    cardDescription: 'Walk four and a quarter centuries of India, from Akbar’s court to now.',
    format: 'Play', section: 'history', published: '2026-08-15',
    thumb: '/independence/rack.jpg', initialRank: 0 },
  ...economyPublications.map((piece, index) => ({ ...piece, initialRank: index + 1 })),
];
