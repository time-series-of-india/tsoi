// Themes — subject clusters inside a section (the newspaper metaphor: section =
// top-level nav like Economy; theme = Payments within it). URLs stay flat;
// theme is metadata used for grouping and kicker labels only.
export type Section = 'economy';

export const SECTION_LABELS: Record<Section, string> = {
  economy: 'Economy',
};

export type Theme = 'payments';

export const THEME_LABELS: Record<Theme, string> = {
  payments: 'Payments',
};
