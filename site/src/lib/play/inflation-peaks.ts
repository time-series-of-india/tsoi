// Shared identity for the Inflation Peaks game. The slug lives here and
// nowhere else: the page directory, the play rack's card and (from M2) the
// dispatch item all read it from this one constant.
export const INFLATION_PEAKS_SLUG = 'inflation-peaks';
export const INFLATION_PEAKS_HREF = `/economy/play/${INFLATION_PEAKS_SLUG}/`;
export const INFLATION_PEAKS_TITLE = 'Inflation Peaks';
/* What you say to an auto driver before the ride starts. It earns its place
   twice over: it is the vehicle you are actually driving, and a meter running
   is the plainest picture of a cost that only goes one way, which is the
   subject. Two earlier tries missed for opposite reasons — one borrowed its
   identity from a phone game, "The Driving Game" described the controls and
   nothing else. */
export const INFLATION_PEAKS_KICKER = 'Meter Down';

/* The two sentences that describe the game wherever it is described: the
   social card's deck and the page's own meta description.
   "Drive over", not "drive a wheel" or "drive an auto" — the card and the page
   both put the vehicle in the picture, and naming it in the sentence as well
   spends a word to say what the reader can already see.
   "Monthly series", not "monthly rate": the values are year-on-year measured
   every month, and "rate" invited the reading that each month's number is that
   month's own price change. "Series" is what it is and carries no such offer. */
export const INFLATION_PEAKS_DECK =
  'Drive over India’s inflation, 1969 to 2026. The terrain is the actual monthly series, and the score is how many months you survive.';

// M1 ships on a hand-shaped placeholder terrain, so the sources line says so
// in the plainest words available. It is replaced, not softened, in M2.
export const INFLATION_PEAKS_SOURCES = 'Placeholder data — real series lands in M2.';
