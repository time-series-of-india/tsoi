// The walk engine for /independence — R2c, the narrative-light world.
//
// A reader HOLDS ▶ on the stage (or the right half of it, or ArrowRight) and a
// small ink figure walks India's GDP-per-capita line (Maddison to 2022, chained
// to 2026) as terrain. Holding ◀ (or the left half, or ArrowLeft) turns him
// around and walks him back the way he came, the path un-drawing behind him.
// Release and he stops mid-stride. One unbroken hold covers the whole journey:
// the story years are card thresholds, not stops, and the card fades up under
// the reader as each one arrives and takes decades to leave.
//
// TWO GESTURES, and they are the same drive underneath. Since R2g the control
// is THE PICTURE — no bar, no chevrons, no buttons: the stage's own halves,
// split 33/67 so the centre of the screen walks forward, with two floating
// labels in the middle of the frame that retire on the reader's first press.
//
//  · HOLD — the drive, exactly as a stage-hold has always been. R2b had it in a
//    band of page furniture under the stage, R2c put chevrons back on the
//    picture, R2d replaced them with a bar along the foot of the film, and R2g
//    took the last of the chrome away: what walks is the film.
//  · TAP — a short step. A press shorter than TAP_MS releases itself after
//    STEP_MS of hold, so the momentum ramp gives it its ease in and out and a
//    tap covers about a second and a half of walking.
//
// …and BEFORE either of them, R2g's opening. The stage lands as a dark poster —
// the 1600 frame at a seventh of its own light, one word breathing on the sky —
// and the press that answers it blooms the world to full over three seconds —
// the top of the frame first and the ground last — lifts a few birds up through
// the sky to where the date is about to be, brings the date in behind them, and
// sets the walker down on a runway of flat ground west of 1600 so
// that reaching the first year is something he does. See the opening section
// below, and `coarse` for where the film plays on which device.
//
// …and there is a third way, and it is an OFFER rather than a default. R2b had
// an autopilot — a held forward input the engine owned rather than the reader —
// and the feel-check retired it: a piece whose whole argument is that the
// reader should FEEL four centuries pass under their thumb should not do the
// walking for them. Release weekend brings it back as a small ▷ at the foot of
// the frame, because the first day's readers answered the feel-check with a
// feel-report: one tapped their way across four centuries a step at a time and
// called it exhausting, which it is. The default is untouched — the film still
// opens asking for the reader's thumb, and the third opening hint names the
// offer — but a reader who ASKS to be carried is carried: the button plants
// the same held forward input R2b owned. Three things bound the carry. ANY
// press the reader makes on the film takes the walk back — the thumb outranks
// the engine, always, and the ▷ is there to ask again. THE FLAG IS NEVER THE
// ENGINE'S TO RAISE: the carry stands down at the gate (its hold is excluded
// from the eight-second creep, see manualDir), the whisper asks for a tap,
// and the tap that answers runs the hoist and hands the walk back to the
// carry on the other side. And the carry ends at the arrival, where the
// ending's pages are the reader's to turn. See startPlay.
//
// R2 gave the thresholds weight without giving them a stop, and R2b retuned it
// after a feel-check that said he nearly halts. Every caption year is a
// CHECKPOINT: an effective speed cap eases the WALKER down over the last ~130px
// of approach and back out the other side, with no dwell anywhere in it. Caps
// COMBINE BY MIN and never by product — the old stacking of a checkpoint on a
// famine trudge took him to a fifth of his pace, which is a stall and not a
// beat. (See CHECKPOINT_WINDOW_PX.)
//
// There are exactly two places he is brought to a halt. The end of the series is
// one. The other is 1947, and it is the only interactive moment in the piece:
// the walk clamps at the flagpole until the reader HAULS THE FLAG UP, and the
// dawn comes up with it. A flag that reached the masthead stays there; a hoist
// the reader abandoned and walked away from lowers itself. See the hoist section
// below.
//
// (There is a third place he stands still, and it is a wall rather than a beat:
// the start of the runway, west of 1600, which is as far back as the world goes.)
//
// (R1b hard-stopped at every story year and disarmed the held input there. The
// feel-check rejected it: pressing again thirteen times made the walk a
// tap-through with extra steps, and the pauses fell in the middle of the two
// long declines, which are the part that has to feel long. R1c was forward-only;
// the R1d feel-check asked for the way back, so a reader who missed a card can
// go and re-read the ground under it.)
//
// He walks the ground rather than floating over it: a small pose machine keyed
// on the SMOOTHED on-screen slope under his feet picks between a normal gait, a
// scrambling climb, a careful knees-bent descent, and a short picking-his-way
// step on rough ground — and his
// legs are reach-clamped, so on ground that would once have stretched them he
// crouches instead. Backward travel mirrors the lot: a descent walked forward is
// a climb walked back.
//
// The reader is NOT told what the ground is. Until the reveal there is no
// y-axis, no gridlines, no unit label, no world track and no reference rule —
// only a landscape: a black landmass whose top edge IS the data line, catching
// a thin rim light over the ground he has already walked, two parallax ridges
// behind it, fog on the horizon, and a quiet ticking year at the foot of the
// stage, which is the reader's whole orientation. At the END OF THE SERIES the
// caption names the ground — two sentences, arriving one after the other on a
// slow fade — and the chart chrome comes up behind them.
//
// What follows is three more presses of the same forward control, and R2f is
// what put the camera in two of them rather than one:
//
//  · LEVEL ONE, the crane. The x window does not move at all; the top of the
//    frame goes up until the world's last value is in it, the figure looks up
//    with it, and the world average arrives as a teal mark high overhead with a
//    line naming it. The ride is a neck being craned rather than a camera
//    leaving, which is the point of it being its own press.
//  · LEVEL TWO, the pull-back. The whole line, end to end, at one scale from
//    zero, with the chart chrome, the dashed 1947 and the world drawn as a track
//    the mark settles onto. Three sentences stack up over the settled frame on
//    the same slow fade the reveal takes.
//  · The colophon, which is the only thing on the stage that is a lockup.
//
// Every one of those stages steps BACKWARD too, rides and all, and the last step
// back puts the reader on the ground at the end of the series with the walk
// controls under them again (see endingPress).
//
// "The end of the series" is deliberately not a year in this file. The walk ends
// where the DATA ends (see endYear, patched from economy.json at load), so a
// year added to the source moves the arrival, the readout and the reveal frame
// together and none of them can drift apart.
//
// R1e re-lit the stage. There is no light theme and no dark theme here any more:
// this is a film frame with ONE continuous sky whose colour is a pure function of
// the walker's year (see LIGHT_STOPS) — a golden late afternoon over the Mughal
// empire, the AMBER draining out of it across the next century and a half while
// the brightness holds, a fall into night that starts at the Mutiny, the famine
// decades as a lifted moonlit floor rather than a blackout, first light on the
// horizon at 1947, then a morning that takes decades and burns into full daylight
// on TSOI paper by the last row of the table. R2e is what made the first leg a
// PLATEAU: the reader spends the first two centuries lit, and what tells them the
// empire is going is the colour of the light rather than the amount of it.
// Because the light is a function of the year and of nothing else, walking
// backward rewinds the dawn for free. The article around the stage still follows
// the site theme; the stage does not.
//
// This replaces the tap-through build (authored travel tweens, PREV, an n/13
// counter, per-beat camera windows), which was rejected in review: authored
// tweens owned the pace, the terrain read small on a phone, and the piece named
// its own subject in the first sentence. What carried over untouched is the
// part that was right — PCHIP terrain and one sample() for curve, walker height
// and lean; the three poses; the flagpole; the washes and the 1947 dawn; the
// stepping stones; theme plumbing; and the pull-back framing.
//
// TWO RULES THIS MODULE DOES NOT BREAK:
//
//  1. The page's scroll belongs to the reader. No wheel, touchmove or scroll
//     listener exists here and no CSS snap is set. The stage is one ordinary
//     section in normal document flow.
//
//     R2d amends this in exactly one place and it is worth stating plainly: the
//     THEATRE banks window.scrollY on the way in, fixes the body behind the
//     fullscreen film, and puts the reader back on the pixel they were standing
//     on when they walked out. That is a lock and a restore, not a hijack; it
//     runs only on a press the reader made, and it is the only scroll this file
//     has ever touched. Nothing scrolls the page during the walk itself.
//
//     preventDefault is called in four places and nowhere else: ArrowRight and
//     ArrowLeft (only on the keydowns this module is actually driving the walk
//     with), ArrowUp (only while the walk is held at the flagpole), Escape (only
//     while the theatre is open), and Enter/Space (only on the poster, and only
//     when the stage itself is the target). PageUp/PageDown, Home/End and
//     ArrowDown are never touched.
//
//  2. The terrain and the history agree. Every drawn pixel of ground comes out
//     of one monotone interpolant through the exact data values, so the walk
//     cannot flatter or dramatise the series. The reveal shows the reader they
//     were on real data all along.
//
// Deliberately NOT ECharts (unlike charts.ts next door): the camera re-frames x
// AND y every frame, which is a full option rebuild per frame in ECharts. This
// hand-renders to a 2D canvas instead. What it does borrow from charts.ts is
// the house wiring — design tokens read off the stage with getComputedStyle, a
// data-theme MutationObserver to re-read them, a ResizeObserver for size, and
// dataUrl() for the content-hashed JSON.
import { dataUrl } from '../data-url';

/* -------------------------------------------------------------- the stops --- */
/**
 * The itinerary. One row per story year: the year its card takes over at, and
 * how many years of history the stage is that wide there. The window is
 * authored in YEARS rather than in pixels, so every viewport sees the same
 * slice of history and a wide screen simply draws it at more px per year.
 *
 * These are THRESHOLDS, not stops. The walk runs straight through them — the
 * card in force is the last row whose year the walker has passed, and both the
 * card and the camera's window cross-fade under him while he keeps walking.
 * Only the last row is a place he is actually brought to a halt.
 *
 * The y-fit is not in the table: it is computed per frame from the terrain
 * inside the window (see frameFor), so a window can be retuned in review
 * without anyone hand-computing dollar ranges to go with it.
 *
 * The last row is the reveal, and its YEAR IS NOT AUTHORED: it is overwritten
 * from the series' own last year when the data lands (see endYear). The value
 * written here is the current series end and exists only so the table is
 * readable and so a failed fetch still leaves a sane camera. The pull-back after
 * it is a phase, not a row: it covers no ground, so it has no year of its own.
 *
 * `prefers-reduced-motion` is the one reader who still gets the rows as stops:
 * a press takes the next one as a hard cut, with no walk in between.
 */
interface Stop {
  year: number;
  /** Years across the full stage width as the walker passes this year. */
  span: number;
}

const STOPS: Stop[] = [
  { year: 1600, span: 150 }, //  1 the Mughal court, walk stone to stone
  { year: 1750, span: 170 }, //  2 two and a half centuries downhill
  { year: 1870, span: 100 }, //  3 Naoroji
  { year: 1900, span: 45 }, //   4 the record turns annual; the famines
  { year: 1918, span: 32 }, //   5 the deepest cut
  { year: 1932, span: 32 }, //   6 the stall
  { year: 1943, span: 26 }, //   7 Bengal — the full stop
  { year: 1947, span: 26 }, //   8 the dawn
  { year: 1967, span: 38 }, //   9 back past where it stood in 1600
  { year: 1975, span: 38 }, //  10 the slow climb
  { year: 1991, span: 38 }, //  11 the bend
  { year: 2021, span: 38 }, //  12 the pandemic dip behind him
  { year: 2026, span: 38 }, //  13 THE REVEAL — year patched from the data
];

/** Index of the reveal stop. */
const REVEAL_STOP = STOPS.length - 1;

/** The stop table read straight, with nothing over it. */
function authoredSpanAt(at: number): number {
  if (at <= STOPS[0].year) return STOPS[0].span;
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (at >= b.year) continue;
    const t = b.year > a.year ? clamp((at - a.year) / (b.year - a.year), 0, 1) : 0;
    return lerp(a.span, b.span, t);
  }
  return STOPS[STOPS.length - 1].span;
}

/**
 * THE TRAILHEAD, and it is the R2j feel-check's other complaint about the
 * opening: the first descent draws as a cliff and is walked as one.
 *
 * NOTHING IN THE DATA MOVES HERE. The first row of the table is 150 years across
 * a phone's 390px, which is two and a half pixels a year — so the two-hundred-odd
 * dollars India's line loses between 1600 and 1620 is drawn across fifty
 * horizontal pixels and comes out at a slope the frame's own steepness cap then
 * has to fight. The ground is not steep; the CAMERA is standing too far back to
 * show it as anything else, at exactly the moment the reader is meeting the piece
 * and the walker is under his deepest dwell.
 *
 * So the opening span starts at TRAILHEAD_FRAC of the authored one and eases out
 * to it by TRAILHEAD_TO. Same years, same values, more horizontal room for the
 * first stretch of them — a gentler unfolding rather than a zoom, which is why
 * the ease is a smoothstep over eighty years of ground and not a timed move: it
 * is a function of WHERE THE WALKER IS, so it rewinds for free when he walks back
 * and there is no state in it. The runway west of 1600 sits at the clamped end of
 * it and therefore opens at the same width as 1600 itself.
 *
 * Two knock-ons, both deliberate and both verified rather than assumed:
 *
 *  · R2i's DWELL CAPS are derived from ground speed through pxPerYearDrive (see
 *    dwellCap), so a narrower opening frame makes the same ten years of budget
 *    cost a shallower cap — 1600's goes from the DWELL_CAP_MIN floor to about
 *    0.14. That is the derivation working, not a number to re-author: the budget
 *    is the ground, and the cap has always been whatever produces it here.
 *  · The RUNWAY is authored in seconds of walking and resolves its length in
 *    years through the span (see armRunway), so it too must read the eased span
 *    or the walk opens on three seconds of runway measured in the wrong frame.
 */
const TRAILHEAD_FRAC = 0.65;
const TRAILHEAD_TO = 1680;

function trailheadK(at: number): number {
  const from = STOPS[0].year;
  if (at >= TRAILHEAD_TO) return 1;
  if (at <= from) return TRAILHEAD_FRAC;
  return lerp(TRAILHEAD_FRAC, 1, smoothstep((at - from) / (TRAILHEAD_TO - from)));
}

/* ------------------------------------------------------------ the sky text --- */
/**
 * The captions, which are a DIFFERENT table from the stops and always were a
 * different job. STOPS says how wide the camera's window is on each leg;
 * CAPTION_YEARS says WHICH years have words, and the words themselves live in
 * independence.astro, in this order.
 *
 * R1e cut fourteen cards down to eight captions plus the two the ending owns.
 * R2 took it back to ten, on dated events rather than on round decades. R2b
 * makes it twelve: Roe at Jahangir's court (1615) and the three villages on the
 * Hooghly (1690) fill the two-century hole between the charter and Plassey,
 * where the ground falls furthest with nothing said over it, and the old 1967
 * beat moves to 1966 and becomes the new wheat rather than a milestone about
 * the line's own height. Every card now carries a place and a date under it.
 *
 * EVERY ONE OF THESE IS ALSO A CHECKPOINT: the walker slows through it (see
 * CHECKPOINT_WINDOW_PX). The two tables were separate in R1e and are one thing
 * now — a beat worth words is a beat worth reading the ground at.
 *
 * The last SIX cards in the deck are not years he walks past at all: the reveal
 * owns two of them and the ending four, and every one after the first is turned
 * by a press (see REVEAL_CARDS and END_CARDS). 1947's card is the one exception
 * in the other direction — he reaches the year long before the card, because the
 * card waits for the flag (see HOIST_*).
 *
 * THE MYSTERY RULE APPLIES TO EVERY ONE OF THE TWELVE. Nothing in the sky may
 * name money, income, output, prices or a series before the reveal. The single
 * approved exception is Plassey's "revenue", which is a fact about the Company
 * rather than a description of the ground, and is meant to be recognised in
 * hindsight.
 */
const CAPTION_YEARS = [
  1600, 1615, 1690, 1757, 1857, 1876, 1919, 1930, 1943, 1947, 1966, 1991,
];
/**
 * THE REVEAL, IN TWO PARTS, and R2e is what split it.
 *
 * It used to be one card that named the ground, explained why an average can
 * rise over a famine, and pointed at a mark overhead — all delivered to a reader
 * looking at a stationary landscape, with the pull-back saved for the press
 * after it. Three claims in one breath, and the only one with a picture behind
 * it was the first.
 *
 * So the first part now says one thing: the ground is money. The press that
 * answers it is what looks the figure up, starts the pull-back and brings the
 * world onto the frame — and the second part arrives over that picture, once the
 * camera has come far enough back to read words on. The Bengal-averaging
 * sentence is cut rather than moved; it was a footnote, and a footnote is not a
 * thing to say at the top of an ending.
 *
 * Part one is the only card in the piece shown by a CLOCK (arriveEnd, at the end
 * of the series). Part two, and everything after it, is a press.
 */
const REVEAL_CARDS = [CAPTION_YEARS.length, CAPTION_YEARS.length + 1];
/**
 * The ending, and R2f makes it TWO cards where R2e had four.
 *
 * R2b had one long pull-back card; the feel-check asked for it in parts, so R2e
 * cut it into three presses. The feel-check on THAT says the presses were doing
 * work a fade should be doing: three page-turns over a frame that had already
 * stopped moving, and the spine fact of the whole piece — 1966 — arriving too
 * fast to land. So the three sentences are three LINES on one card now (see
 * LINE_UP_MS), stacking up over the settled chart on one clock, and the reader's
 * press is back to meaning what it means everywhere else in the piece: turn the
 * page. Two entries, therefore: the ending screen, and the sign-off.
 *
 * The sign-off is the site's masthead device in the flag's colours and is a
 * lockup rather than a caption. It is also the only card that is not inside
 * .walk-cards — see the block's note in independence.astro. R2m makes it the
 * END-CARD: the same lockup, with a thumbnail of the card the reader can send,
 * two actions and a ✕ that closes it. It is still one .walk-card and the deck
 * still latches it exactly as before.
 *
 * R2M RETIRES END_PART_MIN_MS. It was a debounce on the two stages the reader
 * turned by hand while everything around them ran on a clock — without it, a
 * double tap took the ending screen away with its lines still rising. Nothing in
 * the ending runs on a clock any more (see endingPress): every stage is a press,
 * the line dissolves are consumed by the press gate above the page turn, and a
 * tap in the ending fires exactly once (startStep is inert outside 'walk'). What
 * is left of the guard is a window in which a deliberate press does nothing, and
 * on a chain the reader is driving nine presses down, a press that does nothing
 * is the only real failure available.
 */
const END_CARDS = [CAPTION_YEARS.length + 2, CAPTION_YEARS.length + 3];
/** The end-card, which is the last card in the deck and the only one that is a
 *  lockup rather than a sentence. Looked up off the end of END_CARDS so adding a
 *  part cannot leave this pointing at prose. */
const SIGNOFF_CARD = END_CARDS[END_CARDS.length - 1];

/* ---------------------------------------------------- the cross-dissolve --- */
/**
 * R2f's one new piece of choreography, and R2l changes what it does. It belongs
 * to two cards — reveal part one and the ending screen — each built out of LINES
 * (.walk-line spans in the markup).
 *
 * R2f had the lines come up one after another and STAY, which stacked them into
 * a paragraph. They REPLACE each other now: one line is up at a time, the
 * outgoing one fades out as the incoming one fades in, and at rest only the last
 * line of the card remains. The reason is the feel-check's: at the end of four
 * centuries the reader should be given one sentence to look at, and a second
 * sentence arriving under the first turns both of them into a block of text on a
 * frame that has stopped moving. The lines all live in ONE RESERVED GRID CELL
 * (see the stylesheet), so nothing reflows during a swap and the only property
 * that ever animates is opacity — which is R2f's flicker lesson kept intact.
 *
 * The DURATIONS are in the stylesheet, not here — they are CSS transitions on
 * .walk-line, switched by class — and this file's copies of them exist for one
 * purpose, which is knowing when a stage has finished so the next can be
 * scheduled behind it. Keep the two in agreement.
 *
 *  · LINE_IN_MS is the FIRST line's arrival, out of an empty slot: twice the
 *    cross-dissolve, because it is the line that names what the reader has been
 *    looking at and it arrives over a frame that has just stopped moving. It is
 *    .walk-line.is-slow in the stylesheet.
 *  · LINE_UP_MS is one half of a cross-dissolve, and both halves run it.
 *  · LINE_HOLD_MS was how long a line had the slot to ITSELF before the swap
 *    that took it away began, and R2m retires it with the schedule it belonged
 *    to. The hold is the reader's now: a line has the slot until they press for
 *    the next one (see advanceLines), which is the same thing this number was
 *    guessing at and is not a guess.
 *
 * A press part-way through the sequence ADVANCES IT ONE STAGE, as a cut, and is
 * consumed by that rather than turning the page. Nobody is ever locked out of
 * their own forward control; they simply cannot use it to skip a sentence they
 * have not been shown. (R2f completed the whole stack on that press, which is no
 * longer a thing that can be shown — completing a dissolve means jumping to the
 * last line, and the reader would lose the sentences in between.)
 *
 * A reader who has asked for less motion runs the same schedule with every
 * transition suppressed (see the reduced-motion block in the stylesheet), so
 * each line arrives as a CUT and replaces the one before it. That is a change
 * from R2f, where that reader got the whole stack at once — which is exactly the
 * thing this round retired, and showing three sentences on top of one another in
 * one slot is not an option.
 */
const LINE_UP_MS = 1800;
const LINE_IN_MS = 3600;
/**
 * Release day: how much of a line's fade a press may still CUT, as a fraction
 * of the fade. The rule "a press inside the fade completes it" ran the full
 * duration, and the first line's is 3.6 seconds — but an ease's last stretch
 * is visually flat, so a reader who finished reading the sentence and pressed
 * at the 90%-opacity mark was spending a press on a cut they could not see.
 * Reported from the field as the first correct-text needing two taps. Past
 * this fraction the sentence has been legible for a while, nothing can be
 * skipped that has not been shown, and the press means what the reader meant:
 * next. The LOOP still waits on the true duration (lineFading) — this governs
 * only what a press does.
 */
const LINE_CUT_FRAC = 0.6;

/** The 1947 card, which the hoist gates. Looked up rather than written down so
 *  reordering the table above cannot silently point this at Dandi. */
const NEHRU_CARD = CAPTION_YEARS.indexOf(1947);

/** The beats the walk is brought to a dead stop ON rather than walked past, and
 *  whose cards are therefore read at the far end of their own fade-in rather
 *  than across an approach the walker never makes — see paintCards.
 *
 *  There is ONE of them now. 1600 used to be the other: the walk opened against
 *  it as a wall, on a frame the reader had not moved yet, so its card had no
 *  approach to rise across. R2g's runway (see RUNWAY_SECONDS) gives it one — the
 *  walker starts on flat ground west of the series and CROSSES 1600 at full
 *  stride — so the opening title fades in like every other beat in the table and
 *  the exception it needed is gone. What is left is the flagpole, where he
 *  genuinely stands still until the flag is up. */
const WALL_CARDS = new Set([NEHRU_CARD]);

/* ------------------------------------------------------- the caption fade --- */
/**
 * How a card comes and goes, and R2c is the second time the RULE has changed
 * rather than the timing.
 *
 * Until R2b a caption was STICKY: the card in force was the last year walked
 * past and it held until the next one took over, so there were words in the sky
 * for every frame of four centuries. The feel-check called it what it is — a
 * subtitle track. A landscape with nothing happening in it should have nothing
 * written over it. R2b answered that with a SYMMETRIC bell on |year − beat|:
 * full for five years either side, gone by fourteen, clamped by a directional
 * half-gap so two close beats could not both be up.
 *
 * The R2b feel-check killed the symmetry, and the complaint is exact: "a 1930
 * text comes way before, like in 1926". A card that fades UP on the approach is
 * the frame announcing an event before it has happened — the piece narrating
 * ahead of the walker, which is the one thing this stage must never do.
 *
 * So the fade is asymmetric now, and the asymmetry is the whole idea:
 *
 *  · BEFORE the year, nothing. Not a hint, not a per cent. A card that has not
 *    happened yet is not on the sky. This is also what makes walking back free:
 *    stepping back over a beat takes its card off with no state to unwind.
 *  · ON the year the card starts, eases up over CARD_IN_YEARS, holds, and then
 *    takes a long time to go — up to CARD_GONE_AFTER years, which is decades
 *    rather than the old fourteen. An event's words should stay in the sky for
 *    as long as the ground it happened on is still under him.
 *  · …clamped to CARD_GAP_FRAC of the distance to the NEXT beat, so the next
 *    card always gets clean sky before it speaks. Because that fraction is under
 *    one, no two cards are ever lit at once — the overlap the old directional
 *    half-gap existed to police cannot arise at all.
 *
 * There is no left-hand clamp any more because there is no left-hand fade.
 *
 * The last beat has no neighbour to be clamped by, so its fade is clamped to the
 * SERIES instead: the ending owns the last frames of the walk and a beat card
 * must not still be on the sky when the reveal's prose arrives. See
 * clampLastCard(), which is called once the data has told us where the walk
 * ends.
 */
const CARD_IN_YEARS = 2;
const CARD_GONE_AFTER = 30;
const CARD_GAP_FRAC = 0.85;
/** The plateau is a fraction of the fade-out rather than a fixed count of
 *  years: a tightly clamped card (Bengal, with four years of room before the
 *  flagpole) would otherwise hold at full right up to the moment it vanishes. */
const CARD_HOLD_FRAC = 0.4;
const CARD_HOLD_MAX = 6;

/** Per-beat fade-out distance, in years, measured FORWARD from the beat: the
 *  authored fade, clamped by the gap to the next beat. Precomputed because it is
 *  read for every card on every frame; mutable because the last row's clamp is
 *  the series' own end, which is not known until the data lands. */
const CARD_GONE: number[] = CAPTION_YEARS.map((y, i) =>
  i < CAPTION_YEARS.length - 1
    ? Math.min(CARD_GONE_AFTER, CARD_GAP_FRAC * (CAPTION_YEARS[i + 1] - y))
    : CARD_GONE_AFTER,
);

/**
 * The last beat's fade, clamped to the walk's own end. Called when the series
 * lands, because "gone before he reaches the end" is a fact about the data and
 * not about this table. At the current series (1991 → 2026) the authored thirty
 * years already lands six years clear and this changes nothing; it exists so a
 * shorter series cannot leave 1991's card on the sky under the reveal.
 */
function clampLastCard(endYear: number): void {
  const i = CAPTION_YEARS.length - 1;
  const room = CARD_GAP_FRAC * (endYear - CAPTION_YEARS[i]);
  if (room > 0) CARD_GONE[i] = Math.min(CARD_GONE[i], room);
}

/* ------------------------------------------------------ the reading floor --- */
/**
 * R2d, and the R2c fade's one remaining hole: it is measured entirely in YEARS
 * WALKED, and a reader holding forward on a wide screen covers a beat's whole
 * fade in less time than the sentence takes to read. The fade was tuned by
 * walking it at a phone's zoom; at a desktop's px-per-year the same card is up
 * for under two seconds.
 *
 * So the fade-out gets a wall-clock floor UNDER it, and nothing else changes.
 * From the moment a card first reaches full (CARD_FULL_AT), the distance-driven
 * fade may not take it below full for CARD_FLOOR_MS. When the floor lets go it
 * lets go over CARD_FLOOR_EASE_MS rather than at a step, and because the frame
 * publishes max(distance fade, floor) the distance fade simply takes over
 * wherever it has got to — there is no jump at either end.
 *
 * R2g REPLACES the floor's escape hatch with a queue, and it is the round's one
 * change of rule rather than of number. The floor used to be multiplied down by
 * the NEXT card's own rise — a crossfade, so that two cards could not be lit at
 * once. What the feel-check found is that on the crowded pairs (1600→1615,
 * 1919→1930, the famine cluster) the next card's ground arrives a second after
 * the last one's, so the crossfade was firing while the reader was still on the
 * first line: the words were legible for under two seconds and then dissolved
 * into the next sentence.
 *
 * So the sky is a QUEUE now. Exactly one beat card is on it at a time; it keeps
 * it until BOTH its distance fade and its wall-clock life are spent, then there
 * is CARD_BREATH_MS of empty sky, and only then does the next card in the table
 * take over. A card released late — one whose ground the walker covered while an
 * earlier card was still speaking — arrives on its own CARD_RISE_MS fade rather
 * than appearing, and the price of the whole arrangement is stated plainly: the
 * cards can trail the walker. On the crowded pairs the sentence is read over
 * ground a few decades past the year it belongs to. That is the trade the round
 * asked for, and the gap-aware trudge above is what keeps the trailing bounded.
 *
 * Two things still override everything, and both are older rules winning:
 *
 *  · Walking BACK past the beat's own year. That takes the card off for free, as
 *    it always has, resets the floor's clock, and needs no breath after it: the
 *    reader took the words away themselves.
 *  · A reader who has asked for less motion gets NONE of the wall clock. Their
 *    press is a cut to the next beat exactly, so the distance fade alone is the
 *    whole rule and all twelve cards still light one press at a time.
 */
const CARD_FULL_AT = 0.95;
/** How long a card holds at full before the distance fade may take it down.
 *
 *  R2g raises it from four seconds to five, and the reason is that the round's
 *  own acceptance asks for five seconds of legibility and this is the only thing
 *  in the file that produces legible seconds: at a phone's zoom the distance fade
 *  spends well under a second above CARD_FULL_AT even at the deepest reading cap.
 *  A four-second floor cannot make a five-second acceptance true, so the number
 *  moved and the mechanism did not. */
const CARD_FLOOR_MS = 5000;
const CARD_FLOOR_EASE_MS = 600;
/** The breath of empty sky between one card leaving and the next arriving. A
 *  landscape with nothing written over it is the piece's resting state, and two
 *  sentences that touch read as one. */
const CARD_BREATH_MS = 600;
/**
 * …and the fade a card released LATE comes up on. A card whose ground is still
 * under the walker rises on the distance fade, which is faster than this and
 * wins the max(); this is only ever what a queued card arrives on.
 *
 * R2m: 700 → 1000, and it is the device feel-check's word for what 700 does —
 * the 1615 card POPS. The number was set when the rise was competing with the
 * distance fade under it and mostly lost; since R2j's lead the queue hands a
 * card the sky BEFORE its ground arrives, so this fade is what the reader
 * actually sees on most of the twelve, and seven tenths of a second is a
 * caption appearing rather than a sentence condensing out of the frame.
 *
 * It costs ground, and the ground is paid for rather than absorbed: a card's
 * DWELL window is its rise plus its floor (see DWELL_MS), so a longer rise
 * deepens the cap that spends the same DWELL_YEARS across it. The budget is the
 * ground and does not move; only the cap does.
 */
const CARD_RISE_MS = 1000;

/**
 * R2l: THE OPENING CARD ARRIVES SLOWLY, and only the opening card.
 *
 * Every other sentence in the deck is answering ground the reader has walked to,
 * and 700ms is the right amount of "here it is" for that. The first one is not
 * answering anything: it is the first words in the piece, arriving over a
 * landscape the reader has been looking at for three seconds of runway with
 * nothing written on it, and at the standard rise it SNAPS up — a caption
 * appearing rather than a sentence condensing out of the world. So beat 0 takes
 * this multiple of the standard rise and the other eleven take exactly what they
 * took before.
 *
 * TWO KNOCK-ONS, both handled here rather than left to be discovered:
 *
 *  · A card's DWELL WINDOW is its rise plus its floor plus the floor's ease (see
 *    DWELL_MS), so a longer rise is a longer window and the same ten years of
 *    authored budget must be spent across all of it. Hence the per-beat table
 *    below and dwellCap reading it: the budget is the GROUND, which does not
 *    move, and the cap is whatever produces it. Beat 0's cap goes from about
 *    0.14 of full stride to about 0.12, still clear of the DWELL_CAP_MIN floor at
 *    the trailhead's own narrower frame.
 *  · The card therefore reaches full a little further east than it used to — the
 *    walker covers about 2.5 years under the rise instead of about 1.1 — which is
 *    the ONE row of the R2j pacing table this round is allowed to move.
 *
 * 1925ms rather than 1750 or 2100: at the shorter the arrival still reads as an
 * arrival on a phone, and at the longer the sentence is not fully up until the
 * walker is most of a decade into the seventeenth century.
 *
 * R2m holds the opening card at the 1925ms it has always been while the
 * standard rise goes from 700 to 1000, so the multiple is 1.925 rather than
 * 2.75. The number that was authored is the DURATION; the multiple was only
 * ever how it was written down.
 */
const OPENING_RISE_MULT = 1.925;
/**
 * 1947's own rise, and R2m gives it one because it did not have one.
 *
 * Nehru's card does not arrive from the walk: the flag reaches the masthead and
 * the card's gate opens (see the NEHRU_CARD term in paintCards). At that instant
 * the walker is standing two years east of 1947 by the WALL rule, so its
 * distance fade is ALREADY at 1 — and speakerAlpha maxes the distance fade into
 * the rise, so the card did not fade in at all. It cut. On the piece's most
 * sacred frame, under a flag the reader has just hauled up by hand, the words
 * appeared.
 *
 * R2m's answer is general — a queued card now rises on its authored fade with
 * the ground kept out of it entirely (see speakerAlpha) — and this constant is
 * what 1947 gets to rise ON. It is the slowest fade in the deck outside the
 * opening title. Slower than E's thousand milliseconds on
 * purpose: the dawn behind it comes up over seconds, and the words should arrive
 * with it rather than in front of it.
 *
 * Reduced motion is untouched and is still a cut — that reader's card carries no
 * wall clock at all (see the queue's `speakerAt`).
 */
const NEHRU_RISE_MS = 1500;
/** Per beat, the fade its card comes up on when the queue releases it. */
const CARD_RISE_AT: number[] = CAPTION_YEARS.map((_, i) =>
  i === 0
    ? Math.round(CARD_RISE_MS * OPENING_RISE_MULT)
    : i === NEHRU_CARD
      ? NEHRU_RISE_MS
      : CARD_RISE_MS,
);

/* ------------------------------------------------------- the reading trudge --- */
/**
 * …and the same complaint answered at the other end: not how long the words stay
 * up, but how fast the ground goes past under them.
 *
 * For the READ_WINDOW years after any beat the walker is capped to READ_CAP of
 * full pace. It is the checkpoint machinery's own channel — a cap combined into
 * capK by MIN, never by product (see capK) — so it cannot compound with the
 * checkpoint bell it overlaps or with the famine trudge, and the strongest
 * single reason to slow down still wins.
 *
 * R2g made it GAP-AWARE — where the next beat was closer than twenty years the
 * window STRETCHED to the whole gap and the cap DEEPENED with it — because the
 * queue could leave a crowded pair's second sentence arriving over ground the
 * walker had already run through at full pace.
 *
 * R2i RETIRES that stretch, and it is a consequence of the dwell rather than a
 * change of mind. The stretch was the read cap doing the DWELL's job across a
 * whole gap: smearing a cap over eleven or nineteen years to slow the ground
 * under words that had not caught up yet. With the ground now held at the beat
 * itself (see the dwell), the words never fall behind, and what is left of the
 * stretch is a walk that cannot open out between two sentences it has finished
 * reading. So the window goes back to the authored pair everywhere — eight years
 * at READ_CAP — and the space between the beats is walked at the stride the
 * checkpoint bell and the mood leave it at.
 *
 * It is still one MIN term and it still cannot compound: a read cap inside a
 * checkpoint bell inside the famine trudge is whichever of the three is lowest,
 * exactly as it was.
 *
 * Eased in and out over READ_EASE years so there is no step in the feel, and a
 * pure function of the year, so it applies identically walking back through the
 * window.
 */
const READ_WINDOW = 8;
const READ_CAP = 0.6;
const READ_EASE = 1;

/** The reading cap at a point on the walk: 1 everywhere, READ_CAP across the
 *  READ_WINDOW years after any beat, with a year of ease on each side. The
 *  lowest cap wins, which is the same MIN the caller combines with — so two
 *  windows that overlap on a crowded pair simply hand over. */
function readingCap(at: number): number {
  let cap = 1;
  for (let i = 0; i < CAPTION_YEARS.length; i++) {
    const d = at - CAPTION_YEARS[i];
    if (d <= -READ_EASE || d >= READ_WINDOW + READ_EASE) continue;
    const w =
      d < 0
        ? smoothstep((d + READ_EASE) / READ_EASE)
        : d > READ_WINDOW
          ? 1 - smoothstep((d - READ_WINDOW) / READ_EASE)
          : 1;
    const k = lerp(1, READ_CAP, w);
    if (k < cap) cap = k;
  }
  return cap;
}

/* -------------------------------------------------------------- the dwell --- */
/**
 * R2i, and it is the reading trudge FINISHED rather than a fifth reason to slow
 * down. The piece runs two clocks — the stamp is the walker's position and the
 * cards are narrative time — and R2g let them drift: a card holds the sky on its
 * wall clock while the ground keeps going past at READ_CAP, so the queue's debt
 * compounds. Measured on R3: by Plassey the words trailed the ground by 62–71
 * years, and every card after 1615 spoke over a landscape it was not about.
 *
 * The fix is at the source. While a QUEUED card is rising or inside its
 * wall-clock floor the drive's cap deepens from READ_CAP to a DWELL, and the
 * walker covers only as much ground as the sentence is worth. Nothing is added
 * to the frame: this is the fourth MIN term in capK retuned (see the drive), and
 * a RE-LIT card — one the reader walked back into rather than one the queue
 * released — keeps READ_CAP exactly as it was. That reader is browsing, not
 * being read to.
 *
 * THE CAP IS COMPUTED FROM GROUND, NOT AUTHORED AS A FRACTION, and that is the
 * one place this deviates from the round's brief. A fraction of full stride
 * cannot produce a constant ground cost here, because the camera's own window
 * runs from 150 years wide at 1600 to 26 at Bengal (see STOPS): the same 0.175
 * of stride is 20 years of ground at 1600 and 3 at 1943. So the round's real
 * number is the GROUND — DWELL_YEARS of it across a card's whole wall-clock life
 * — and the cap is whatever produces that at the zoom the walker is standing in.
 * It lands between about 0.08 and 0.5 of full stride across the twelve beats,
 * and it is deepest exactly where the drift was worst.
 *
 * GAP-ADAPTIVE by the same arithmetic: where the next beat is nearer than
 * DWELL_YEARS of ground the budget shrinks to the gap less DWELL_MARGIN, so the
 * card finishes before the walker arrives at the next beat rather than queueing
 * a debt onto it. 1943→1947 is four years and cannot be satisfied at any sane
 * cap; the gate's own rule is the catch for that pair (see the gate fade in
 * paintCards).
 *
 * Under prefers-reduced-motion none of it runs, exactly like the other three.
 *
 * R2l makes the window PER BEAT rather than one number, because the opening card
 * now rises over nearly two seconds rather than 0.7 (see OPENING_RISE_MULT) and
 * the ground it costs must not grow with it. Eleven of the twelve entries are the
 * number this was before.
 */
const DWELL_MS: number[] = CARD_RISE_AT.map((rise) => rise + CARD_FLOOR_MS + CARD_FLOOR_EASE_MS);
/** The ground an open-gap card's whole life is worth, in years. */
const DWELL_YEARS = 10;
/** …and the clearance kept before the next beat on a crowded pair. */
const DWELL_MARGIN = 2;
/** The deepest the ground is ever held. Deep is the point — but this is a walk
 *  slowed to a crawl and never a walk stopped, and below about a tenth of stride
 *  the gait's own footfalls stop landing (see STAND_SPEED). */
const DWELL_CAP_MIN = 0.09;
/**
 * How fast the cap itself moves between the dwell and the open stride. A cap
 * that stepped would read as the walker being shoved.
 *
 * R2m makes it ASYMMETRIC, and the asymmetry is what a body does rather than a
 * tuning knob. Slowing down is something he can do quickly — it is his own
 * weight and his own decision, and a walker checking his stride reads as a
 * walker checking his stride. Speeding up is an acceleration, and an
 * acceleration that arrives in a tenth of a second reads as a shove. So the cap
 * DEEPENS on TAU_DWELL_IN and RELEASES on TAU_DWELL_OUT, which is the number
 * this always was.
 *
 * It is here because of the gentle rise (see CARD_RISE_MS). A card the queue
 * releases LATE is handed the sky while the walker is at open stride, and every
 * millisecond of the ease is ground covered at a zoom where 1615 is eighteen
 * years a second: measured, the symmetric ease put 1615's card at full five
 * years past its own beat and 1876's at nearly four. Entering the dwell in a
 * tenth of a second rather than a fifth is most of that back.
 */
const TAU_DWELL_IN = 90;
const TAU_DWELL_OUT = 220;

/** Per beat, the ground its card's life may cost. */
const DWELL_BUDGET: number[] = CAPTION_YEARS.map((y, i) => {
  const gap = i < CAPTION_YEARS.length - 1 ? CAPTION_YEARS[i + 1] - y : Infinity;
  return Math.min(DWELL_YEARS, Math.max(DWELL_MARGIN, gap - DWELL_MARGIN));
});

/* --------------------------------------------------------- the card lead --- */
/**
 * R2j, and it is the last of the drift rather than a new idea.
 *
 * R2i's dwell closed the gap at the moment a card ARRIVES — the stamp is within a
 * few years of the beat when the words reach full — and left the rest of it open,
 * because a card's life is five seconds long and the walker spends all five of
 * them covering ground. The budget is DWELL_YEARS of it, so by the middle of the
 * sentence the reader is looking at a date five years past the thing they are
 * reading about, and by the end of it ten. The feel-check put it plainly: the
 * words are about where he WAS.
 *
 * The fix is to move the trigger rather than the ground. A queued card becomes
 * due CARD_LEAD years BEFORE its beat, so the dwell's ten years of budget are
 * spent astride the beat instead of entirely after it: full at about the year it
 * is about, and the floor expires a few years past it rather than a dozen.
 *
 * Nothing else moves. It is a DUE date and not a claim on the sky — the one-card
 * invariant is untouched, and a lead that lands while the previous card is still
 * speaking simply waits in the queue exactly as a late card does. The lead
 * YIELDS; it never evicts.
 *
 * Three clamps, all of them arithmetic off the table:
 *
 *  · 1600 takes none. The walk starts there (the runway is west of it and carries
 *    no cards), so there is no ground before it to be early on. What that card's
 *    opening feels like is the gait's problem and not the queue's — see
 *    PACE_SPLIT.
 *  · No lead may reach back past the PREVIOUS beat's own clearance. On a tight
 *    pair the lead is cut to the gap less DWELL_MARGIN, which is the same two
 *    years the dwell budget already keeps: 1943→1947 is four years apart and
 *    gets two. (It is inert there in any case — Nehru's card waits for the flag,
 *    and the gate owns the sky in front of it — but the rule is the table's and
 *    not the gate's, and it should read as the table's.)
 *  · A reader who has asked for less motion gets none of it, like the dwell, the
 *    floor and the breath: their press is a CUT to the next beat, so a card that
 *    became due early would be a card speaking about ground they are standing two
 *    steps short of.
 *
 * FOUR AND NOT FIVE, and it is a measured number rather than a preference. The
 * lead buys a fixed number of YEARS, but what it is paying for is the second and
 * a half between the card being handed the sky and the reader having it — and
 * how much ground that second and a half costs depends on how wide the camera's
 * window is where it happens. Scripted continuous hold, all twelve beats, stamp
 * at card-full: with no lead every beat lands at about +1.5 of its own year;
 * at four it lands between −2.6 (1919, where the window is 32 years and the rise
 * buys almost no ground) and +1.8, mean −0.05. At five the whole distribution
 * moves a year earlier and the tail goes to −3.6, and a sentence read over a
 * date four years short of it is the same fault the round was called to fix,
 * pointing the other way.
 */
const CARD_LEAD_YEARS = 4;
const CARD_LEAD: number[] = CAPTION_YEARS.map((y, i) => {
  if (i === 0) return 0;
  const gap = y - CAPTION_YEARS[i - 1];
  return Math.max(0, Math.min(CARD_LEAD_YEARS, gap - DWELL_MARGIN));
});

/**
 * THE GATE OWNS THE SKY, and it is the dwell's one admitted failure handled
 * rather than argued with. 1943 and 1947 are four years apart; a reader who
 * walks back into the famine's card and drives forward, or any pair the dwell
 * cannot separate, can arrive at the flagpole with somebody else's sentence
 * still up. A flag going up under the wrong words is the one frame in the piece
 * that must not happen, so parking at the gate takes the sky: whatever is on it
 * that is not Nehru's card eases off over GATE_FADE_MS whatever its own clock
 * says, is marked spoken so it cannot come back over the raised flag, and the
 * hoist runs on an empty sky. Walking back OUT of the gate is untouched — the
 * ordinary walk-back rules are what un-mark a card, here as everywhere.
 */
const GATE_FADE_MS = 600;

/** The cap that spends exactly that budget over a card's life, at the zoom the
 *  walker is standing in. `full` is years per second at full stride. */
function dwellCap(i: number, full: number): number {
  if (i < 0 || i >= DWELL_BUDGET.length || full <= 0) return READ_CAP;
  return clamp(DWELL_BUDGET[i] / (full * (DWELL_MS[i] / 1000)), DWELL_CAP_MIN, READ_CAP);
}

/**
 * A card's opacity at a point on the walk: nothing before its year, up over
 * CARD_IN_YEARS, a plateau, and then a long ease down to nothing.
 */
function cardAlpha(i: number, at: number): number {
  const d = at - CAPTION_YEARS[i];
  if (d < 0) return 0;
  const gone = CARD_GONE[i];
  if (d >= gone) return 0;
  // A card whose whole life is shorter than its fade-in gets a proportionally
  // shorter one rather than never reaching full.
  const rise = Math.min(CARD_IN_YEARS, gone * 0.5);
  if (d <= rise) return smoothstep(d / rise);
  const hold = Math.min(CARD_HOLD_MAX, gone * CARD_HOLD_FRAC);
  const from = rise + hold;
  if (d <= from) return 1;
  return 1 - smoothstep((d - from) / (gone - from));
}

/* --------------------------------------------------------- the checkpoints --- */
/**
 * Every caption year is a place the walk SLOWS DOWN, and nowhere is it a place
 * the walk stops.
 *
 * R1b hard-stopped at the story years and the feel-check killed it: thirteen
 * re-presses made the walk a tap-through with extra steps. But running past
 * Jallianwala Bagh at full stride is the opposite failure, so R2 takes the third
 * option — the reader's hold is never touched and the WALKER slows instead. An
 * effective cap on his speed eases from 1 down to CHECKPOINT_CAP across the last
 * CHECKPOINT_WINDOW_PX of approach and back out the other side.
 *
 * R2b retuned all of it, because the R2 build read as a walk that keeps stalling:
 *
 *  · The cap was 0.32 and it MULTIPLIED the famine trudge's own cap, so the
 *    approach to Bengal 1943 ran at 0.22 of walking pace — a man wading. Caps
 *    combine by MIN now (see capK): the strongest single reason to slow down
 *    wins, and nothing compounds.
 *  · The floor came up from 0.32 to 0.55. Half pace reads as reading the ground;
 *    a third of it reads as a fault.
 *  · The 600ms DWELL after the crossing is gone entirely. It was there to stop
 *    him accelerating away as the caption arrived, but with the distance-fade
 *    (see cardAlpha) the caption is at full for five years either side of the
 *    beat, so the words no longer need him pinned to their year. What is left is
 *    one smooth ease in and out.
 *  · The window widened from 90px to 130px to go with it: with no dwell to carry
 *    the beat, the slowing itself has to be gradual enough to feel deliberate.
 *
 * The window is in SCREEN px rather than in years, so it is the same approach at
 * every zoom, and it is clamped per beat to half the distance to its neighbours
 * — without that, 1919 and 1930 at a phone's zoom are one continuous trough and
 * the walk never returns to full pace between them.
 *
 * Under prefers-reduced-motion none of this runs: that reader takes the beats as
 * cuts and there is no approach to slow.
 */
const CHECKPOINT_WINDOW_PX = 130;
const CHECKPOINT_CAP = 0.55;

/** Half the gap to the nearest neighbouring beat, per beat, in years: the
 *  widest the slow-down window is ever allowed to be there. */
const CHECKPOINT_MAX_YEARS = CAPTION_YEARS.map((y, i) => {
  const prev = i > 0 ? (y - CAPTION_YEARS[i - 1]) / 2 : Infinity;
  const next = i < CAPTION_YEARS.length - 1 ? (CAPTION_YEARS[i + 1] - y) / 2 : Infinity;
  return Math.min(prev, next);
});

/* ------------------------------------------------------------- the hoist --- */
/**
 * 1947, and the only thing in this piece the reader does rather than watches.
 *
 * The walk clamps at the flagpole. He brakes, stands, looks up at the masthead,
 * and nothing goes forward until the flag is up — and the DAWN COMES UP WITH IT.
 * Arriving at the gate is true midnight: the 1947 stop's first light is
 * multiplied out by the hoist, so the reader hauls the light into the frame on
 * the halyard. That is the whole reason this moment is interactive and not a
 * cutscene; it is the one place in four centuries where something is done rather
 * than endured, and the piece should ask the reader to do it.
 *
 * Nobody is ever stuck. Four inputs raise it and they are all equivalent:
 *
 *  - DRAG DOWN on the rope. Half a stage-height of accumulated downward travel
 *    is a full hoist. Upward drag does nothing at all — the hoist ratchets, the
 *    way a halyard cleated off at every pull does.
 *  - A PLAIN FORWARD HOLD, the same gesture that has walked the whole piece —
 *    the stage's right half, ▶, or ArrowRight. Eight seconds. Deliberately slow
 *    enough that the rope is the better answer and fast enough that a reader who
 *    never finds the rope still gets there.
 *  - ArrowUp, at twice the hold rate, for a reader on a keyboard.
 *
 * R2c removed the fourth: a small chevron used to ride down the halyard on a
 * slow loop while the flag was down, saying "there is a rope here and it is
 * meant to be pulled DOWN" in a picture rather than in words. The feel-check
 * did not want an arrow on the rope, so the rope is a rope. What is left is the
 * whisper — offered after HOIST_HINT_MS of standing there with nothing moving,
 * retired on the first progress, and never shown at all to a reader who found
 * the rope on their own.
 *
 * Walking BACKWARD out of the gate is always allowed and it is never a failure:
 * the walk is the reader's and the pole will still be there. What R2g changes is
 * what the flag does about it. A hoist that reached the masthead STAYS there for
 * the life of the page — that is the ratchet, and it is the whole point of the
 * moment. A hoist that was abandoned part way up does not: it lowers itself over
 * HOIST_LOWER_MS, because a tricolour left hanging half way up a pole is not a
 * saved state, it is a flag at half-mast, and this piece does not get to say that
 * by accident. Coming back to the pole re-offers the whole hoist from the furled
 * bundle, exactly as it was the first time.
 *
 * Reduced motion gets none of the hauling: any forward input completes it over
 * HOIST_REDUCED_MS and the flag does not wave afterwards.
 */
const HOIST_HOLD_MS = 8000;
/** …and how long a PARTIAL hoist takes to come back down when the reader walks
 *  back out of the gate. It is the whole descent's duration rather than a rate,
 *  so a flag three quarters of the way up and one barely off the ground are both
 *  lowered at the pace of a thing being lowered — which is the point of it, and
 *  a rate would have made a small hoist vanish. Eased at both ends for the same
 *  reason. A hoist that reached the masthead never lowers at all. */
const HOIST_LOWER_MS = 2600;
const HOIST_ARROWUP_RATE = 2;
/** Downward drag that makes a full hoist, in stage heights. */
const HOIST_DRAG_HEIGHTS = 0.5;
const HOIST_REDUCED_MS = 600;
/** Release weekend: the hoist a TAP runs, for a reader being carried. The
 *  carry stands down at the gate — the flag is never the engine's to raise —
 *  and the whisper asks for a tap instead of the rope, because a reader who
 *  chose to watch is not going to be sent hunting for a halyard. The answer
 *  still has to be a ceremony rather than a cut (the dawn is multiplied out
 *  of the hoist), so it takes seconds rather than HOIST_REDUCED_MS's beat —
 *  but not the patient thumb's eight. */
const HOIST_TAP_MS = 2600;
/** The beat between the flag reaching the masthead and the walk going on again.
 *  Long enough for the Nehru card to have started arriving, short enough that a
 *  reader still holding forward does not think it has jammed. */
const HOIST_OPEN_MS = 400;
/** How long a reader may stand at the pole making no progress before the second
 *  whisper offers the rope. */
const HOIST_HINT_MS = 3000;
/** …and how long an ending frame stands settled, with nothing pressed, before
 *  the tap whisper is offered (see showTapHint). Longer than the rope's,
 *  because an ending line is something the reader is READING — the whisper
 *  should arrive about when the sentence has been finished, not race it. */
const END_HINT_MS = 4000;
/** Release weekend: the whisper is a standing offer rather than a one-time
 *  lesson. It used to retire forever on the first ending press, and the field
 *  said that is one press too early — a reader who tapped once and then stood
 *  reading the next frame had no way to know the film was waiting on them
 *  AGAIN. So every settled ending frame re-offers it, and only the delay
 *  remembers: the first offer keeps END_HINT_MS's patience, and once the
 *  gesture has been taught the reminder comes at reading pace. */
const END_REHINT_MS = 2000;
/** How near the mast line a pointer-down counts as taking hold of the rope. */
const ROPE_HIT_PX = 44;

/**
 * A TAP on ▶ or ◀ — a press shorter than TAP_MS — is a short step rather than a
 * held walk: the engine holds the same input for STEP_MS and then lets go of it
 * itself. Doing it that way rather than as a separate impulse is what gets the
 * ease for free at both ends: the press ramps in over TAU_ACCEL and the release
 * lets down over TAU_BRAKE, so a tap is a step taken and not a jump cut. About a
 * second and a half of ground, less whatever the ramps cost.
 */
const TAP_MS = 250;
const STEP_MS = 1500;

/* ----------------------------------------------------------- the zones --- */
/**
 * WHERE THE READER'S HANDS ARE, and R2g retires the furniture that used to say
 * so.
 *
 * R2d built a hold bar along the foot of the film because the year lived down
 * there and the reader's thumb was already in the neighbourhood. R2d also moved
 * the year to the TOP of the frame, and the bar spent two rounds advertising
 * hold zones at the one edge of the picture nothing else was happening at. So
 * the bar is gone — chrome, rule, tick, labels and both buttons — and what is
 * left is what was always underneath it: the stage's own halves.
 *
 * The split is the bar's, kept exactly: the left ZONE_SPLIT of the width walks
 * back and everything right of it walks on, so the horizontal CENTRE of the
 * screen is forward. A thumb that lands where a thumb lands walks on, and going
 * back is a thing the reader has to reach left for.
 *
 * The instruction moves with it: two floating labels in the middle of the frame,
 * one per zone, in the caption's own sky ink. They are offered when the intro's
 * bloom finishes — the words start when the picture does — and they retire on
 * the FIRST press of any kind after that, permanently for the life of the page.
 * R2d retired the bar's labels on 1.5s of successful forward walking; a hint in
 * the middle of the picture cannot wait that long, because it is standing in the
 * film.
 *
 * Session-only on purpose. Nothing here touches localStorage: a reader who comes
 * back tomorrow gets the offer again, which costs them one press and is the
 * right side to err on.
 */
const ZONE_SPLIT = 0.33;

/* ---------------------------------------------------------- the opening --- */
/**
 * THE FILM DOES NOT START EXPLAINED, and R2g is what fixed that.
 *
 * Every round up to R2f opened with the lights already on: a fully lit 1600
 * frame, a year stamped over it, and the opening title card printed on the sky
 * before the reader had done anything at all. A reader who is told where and
 * when they are before they have moved has been handed a caption, not a world.
 *
 * The opening is now four things in one gesture, and all four of them are over
 * inside five seconds:
 *
 *  · THE DARK POSTER. The 1600 frame is composed exactly as it always was and
 *    then multiplied down to INTRO_EXPOSURE — a landscape sensed rather than
 *    seen. No stamp, no ribbon, no card, no hints. One word on the sky, and it
 *    breathes (see the poster's own pulse in independence.astro).
 *  · THE BLOOM. The press that answers the poster eases that multiplier up to 1
 *    over BLOOM_MS. It is ONE number over the composed light rather than a second
 *    palette, so it costs a handful of lerps while it is running and NOTHING at
 *    all once it has arrived: past 1 the code path is a single comparison for the
 *    rest of the page's life.
 *
 *    R2i gives it a DIRECTION. The light used to arrive over the whole frame at
 *    once, which is a lamp being turned up rather than a day starting; it washes
 *    DOWN now — the sky at full exposure first, the ridges behind it, then the
 *    fog, the land, and the walker last, all inside the same BLOOM_MS. It is the
 *    same one multiplier with a per-BAND lead on its clock (see exposePalette),
 *    which is why it is a wash and not a wipe: the sky's three stops are at three
 *    different points of the same curve and the gradient between them does the
 *    rest, so there is no edge anywhere to travel down the frame. Past the bloom
 *    it costs exactly what it cost before, which is one comparison.
 *  · THE BIRDS. Three to five silhouettes, and R2i turns them upward: they lift
 *    from the mid-sky toward the top-centre region the stamp is about to occupy
 *    and dissolve into it as the date arrives, so the eye is taken to the top of
 *    the frame by something alive rather than by a caption appearing. Intro only,
 *    in both senses: they are never spawned again, and the array they live in is
 *    empty for every frame of the walk, so the draw is one length test.
 *  · THE YEAR, AFTER THE LIGHT. The stamp and the era ribbon fade in across the
 *    LAST THIRD of the bloom. Atmosphere first, then the date.
 *
 * A reader who has asked for less motion gets the bloom as a cut — no sweep,
 * because there is no bloom to sweep — no birds, and the stamp with them.
 */
const INTRO_EXPOSURE = 0.13;
/**
 * R2j SLOWS THE DAWN, and it is one number rather than a re-choreography. The
 * feel-check on a real device said the world arrives too fast to be watched: the
 * sky lightens, the birds go, the year lands and the runway is walkable inside
 * three seconds, which is a transition rather than a daybreak. So the whole
 * envelope doubles — every lead, the stamp's last third and the grain's own
 * arrival are all fractions OF this, so stretching it stretches all of them
 * together and the ordering R2i tuned is untouched. The birds are the one thing
 * that also had to move, because their rise is authored in seconds of their own
 * (see BIRD_RISE_S) rather than as a fraction of the bloom.
 */
const BLOOM_MS = 5600;
/** How far into the bloom the date stamp starts arriving. */
const BLOOM_STAMP_FROM = 2 / 3;
/** How much of the bloom's own length the top-to-bottom wash is spread over. The
 *  top of the frame finishes at (1 − BLOOM_SWEEP) of the way through and the
 *  ground at the end of it, so every band is still at full exposure the moment
 *  the bloom is over and nothing has to be cleaned up afterwards. Kept under a
 *  half: past that the ground is still dark when the stamp lands, and the frame
 *  reads as broken rather than as dawn. */
const BLOOM_SWEEP = 0.42;
/**
 * R2j: THE POSTER IS NOT ORANGE. Three numbers, all of them multiplied by a
 * weight that is 1 on the dark poster and 0 by POSTER_CLEAR of the bloom, so the
 * frame the bloom arrives at is untouched and nothing survives into the walk.
 * See exposePalette for why a plain exposure multiplier could not do this.
 *
 *  · POSTER_DESAT — how far the sky, the ridges and the fog are pulled toward
 *    their own grey. Enough to take the brown out; well short of monochrome,
 *    because a colourless poster is a different picture rather than a darker one.
 *  · POSTER_EMBER — what the horizon glow's colour is multiplied by ON TOP of
 *    its own exposure, which is what turns a band across the sky into a low
 *    ember. Its alpha is untouched, exactly like every other coverage here.
 *  · POSTER_EMBER_DESAT — and how far that ember is greyed with it. Less than
 *    the sky's, deliberately: the one warm thing left in the frame should still
 *    be warm.
 */
const POSTER_CLEAR = 0.32;
const POSTER_DESAT = 0.42;
const POSTER_EMBER = 0.62;
const POSTER_EMBER_DESAT = 0.18;

/**
 * THE RUNWAY, and it is the other half of not starting explained.
 *
 * The walk used to open ON 1600, against it as a wall, which meant the first
 * card was already up on the first frame and the reader's first press moved the
 * ground under a sentence they had not read. So the walker now starts west of
 * the series on synthetic flat ground — no data under it; sample() is flat off
 * the end of the record and the land, the rim light and the fog all draw it in
 * the terrain's own register without a special case anywhere — and CROSSES 1600
 * at full stride. The world's left wall moves with him: holding back walks him
 * to the runway's start and no further.
 *
 * Authored in SECONDS of walking rather than in years, because years are a
 * function of the zoom and the zoom is a function of the stage width. The length
 * is resolved from the stage's own size (see armRunway) and frozen the moment
 * the walk begins.
 *
 * A reader who has asked for less motion gets a short one: their press is a cut
 * to the next beat, so the runway is one step's worth of ground rather than a
 * walk, and it exists only so that the first press is what lights the first card.
 */
const RUNWAY_SECONDS = 3.2;
const RUNWAY_REDUCED_YEARS = 6;

/**
 * The birds. Silhouettes, not characters: a shallow open curve per wing, soft at
 * the edges.
 *
 * R2i GIVES THEM A JOB, and it is the only reason they are in the piece. R2g had
 * them crossing the upper sky left to right, which is decoration: pretty, and it
 * takes the eye ACROSS a frame whose next event is at the top of it. So they
 * climb now. They spawn low — mid-sky, under the band the stamp will land in —
 * lean toward the middle of the frame as they rise, and dissolve near the top
 * just as the year fades in behind them. The reader's eye is walked up to where
 * the date is about to appear and arrives a beat before it does.
 *
 * R2l REWORKS THE FLIGHT and keeps the job. The birds were cut in review for
 * being unnatural and were un-cut on the condition that the flying becomes
 * something to be soothed by rather than something to notice, which is four
 * changes and no new ideas:
 *
 *  · SMALLER. Two thirds of the old wingspan. At the R2i size they were the same
 *    order of drawing as the walker, which reads as birds ten feet away rather
 *    than as birds a long way off; at this size they are specks with a shape.
 *  · BEAT-BEAT-GLIDE. Two wingbeats and then a long stretched-wing glide, rather
 *    than a continuous sine. Continuous flapping is the tell — nothing that flies
 *    flaps without resting — and the glide is where the calm is. Each bird runs
 *    its own cycle at its own phase, so the flock never beats in unison.
 *  · CURVED PATHS. The climb's lateral part is eased rather than linear and
 *    carries a slow lateral wander over it, so a bird arcs and drifts toward the
 *    top-centre instead of running a straight diagonal at it. The convergence is
 *    still a REGION and still loose (see BIRD_TO_SPREAD): a flock that meets at a
 *    point is an arrow, and an arrow pointing at the date is the piece explaining
 *    its own composition.
 *  · DEPTH. One random per bird — how near it is — and size, alpha and pace all
 *    come off it, so the far ones are small, faint and slow and the near ones are
 *    bigger, darker and quicker. Three birds at one size read as a formation;
 *    three at three depths read as sky.
 *
 * Unchanged: three to five of them, the palette's own ink, the BIRD_ALPHA
 * register, the R2j rise timing and its spread, the dissolve into the band the
 * stamp is arriving in, none at all for a reader who asked for less motion, and
 * never a respawn. On every frame of the walk the pool is empty and drawBirds is
 * one length test.
 *
 * Their y is a fraction of the STAGE height and their x is in stage px, both of
 * which are wrong the instant the box resizes. That is deliberate and it is
 * cheap: the intro is over in five seconds, and the alternative — anchoring them
 * to the camera the way the dust is — would put them on the ground rather than
 * in the air.
 */
const BIRD_MIN = 3;
const BIRD_MAX = 5;
/** Seconds a bird's whole climb takes — from the mid-sky band to the top of the
 *  frame — and the spread across the flock. Sized against BLOOM_MS so the last
 *  of them has gone by the time the stamp has finished arriving.
 *
 *  R2j roughly DOUBLES both with the bloom (R2i: 2.3 ± 0.7). The relationship is
 *  what is being kept rather than the numbers: the flock lands between 4.1 and
 *  5.3 seconds and the stamp comes up from 3.7 to 5.6, so they still dissolve
 *  into the date as it fades in and the last of them is gone before it is
 *  finished. */
const BIRD_RISE_S = 4.7;
const BIRD_RISE_SPREAD = 1.2;
/** The band they spawn in, as fractions of the stage height: mid-sky, low
 *  enough to be a rise rather than a hover and high enough to be sky. Both are
 *  above HORIZON, so they are never seen against the land. */
const BIRD_Y_FROM = 0.34;
const BIRD_Y_TO = 0.50;
/** The height they are dropped at, and the band above which they are already
 *  dissolving into it. */
const BIRD_Y_GONE = 0.03;
const BIRD_FADE_BAND = 0.13;
/** Where the climb leans: the top-centre region the year stamp occupies, as a
 *  fraction of the stage width, and how loosely the flock converges on it. The
 *  lean is a drift and not a homing — birds that all met at one point would be
 *  an arrow rather than a flock. */
const BIRD_TO_X = 0.5;
const BIRD_TO_SPREAD = 0.15;
/** …and where they set off from, across the width. */
const BIRD_FROM_X = 0.1;
const BIRD_FROM_SPAN = 0.8;
/**
 * Wingspan in stage px at mid depth, and the two ends of the depth ramp. R2l
 * takes the base from 12 to 8 — the flock now spans 6.4 to 10 px against 9 to
 * 16.2 before, which is between 0.62 and 0.71 of what it was, right through the
 * band the round asked for.
 */
const BIRD_SPAN = 8;
const BIRD_SPAN_FAR = 0.8;
const BIRD_SPAN_NEAR = 1.25;
/** How much of the wingspan the bird rises and falls by over one beat. */
const BIRD_BOB = 0.5;
/** The loudest a bird ever is, and how much of that the furthest one keeps.
 *  Depth is one random per bird and everything else is a ramp off it. */
const BIRD_ALPHA = 0.5;
const BIRD_ALPHA_FAR = 0.55;
/**
 * The wing cycle: two beats and then a glide, as one period in seconds and the
 * fraction of it spent beating. 0.52 of 3.3s is about 0.85s per wingbeat with a
 * second and a half of stretched wing after the pair — a slow bird a long way
 * off, which is what the size says too.
 *
 * BIRD_GLIDE_SET is where the wings sit through the glide, in the same units the
 * beat swings through: a little above level, which is the shallow dihedral a
 * soaring bird holds. It is a HELD pose rather than a bump — the beats are
 * offset to start and end on it, so the cycle has no step in it anywhere and the
 * silhouette never passes through dead flat. That last part is the point: this
 * drawing's wings are two curves whose depth is the beat, so a bird at exactly
 * zero is a horizontal dash, and a sky with four dashes in it is a sky with four
 * dashes in it.
 */
const BIRD_CYCLE_S = 3.3;
const BIRD_BEATS = 2;
const BIRD_BEATS_FRAC = 0.52;
const BIRD_GLIDE_SET = 0.15;
/** The lateral wander laid over the eased climb, in stage px, and how much of a
 *  turn of it a bird gets through on the way up. Under one turn: this is a
 *  drift, not a wave. */
const BIRD_DRIFT = 9;
const BIRD_DRIFT_TURNS = 0.8;

/* ---------------------------------------------------------- body language --- */
/**
 * MOOD. How he carries himself, as a pure function of the year — same shape and
 * same interpolation as LIGHT_STOPS, and for the same reason: walking backward
 * has to rewind it for free, with no state to unwind.
 *
 * Two channels, both 0..1 and both deliberately small in their effects. This is
 * body language, not mime: at full `trudge` the stride is 18% shorter and the
 * head is under three pixels forward of where it would otherwise be. It should
 * be felt a beat before it is noticed, and anything that reads as pantomime gets
 * halved rather than argued about.
 *
 *  - `trudge` is the ground resisting: short steps, feet that barely leave it, a
 *    bowed head and rounded shoulders, and a real speed cap, so the famine
 *    decades take longer in held seconds than the plan years do.
 *  - `pride` is the opposite and arrives only after 1947: a longer step, an open
 *    chest, a little more suspension in the gait.
 *
 * The rows are the UNION of the two channels' own breakpoints, because one table
 * of complete rows is the LIGHT_STOPS contract. Where a row is a breakpoint of
 * only one channel the other carries its interpolated value (1950's pride of
 * 0.32 is the 1947→1991 line read at 1950), so adding a row never changes a
 * curve.
 */
interface MoodStop {
  year: number;
  trudge: number;
  pride: number;
}

const MOOD_STOPS: MoodStop[] = [
  { year: 1600, trudge: 0, pride: 0 },
  { year: 1755, trudge: 0, pride: 0 }, //    the fall begins
  { year: 1770, trudge: 0.7, pride: 0 }, //  the Bengal famine of 1770
  { year: 1790, trudge: 0.2, pride: 0 },
  { year: 1860, trudge: 0.2, pride: 0 },
  { year: 1876, trudge: 1, pride: 0 }, //    the Great Famine
  { year: 1902, trudge: 0.8, pride: 0 },
  { year: 1920, trudge: 0.5, pride: 0 },
  { year: 1939, trudge: 0.6, pride: 0 },
  { year: 1943, trudge: 1, pride: 0 }, //    Bengal
  { year: 1946, trudge: 0.8, pride: 0 },
  { year: 1947, trudge: 0.3, pride: 0.3 }, // he straightens up
  { year: 1950, trudge: 0, pride: 0.32 },
  { year: 1991, trudge: 0, pride: 0.6 },
  { year: 2026, trudge: 0, pride: 1 },
];

/** Stride, foot lift and drive under a full trudge; stride and bob under a full
 *  pride. Every one of them is a multiplier applied on top of the pose machine's
 *  own, so rough famine ground compounds instead of overriding. */
const TRUDGE_STRIDE = 0.18;
const TRUDGE_LIFT = 0.3;
/** …and the one that is not a look: how much the ground itself holds him back.
 *  R2b halved it and then some, 0.30 → 0.15. The posture and the gait are
 *  untouched — what changed is that this cap no longer MULTIPLIES a checkpoint's
 *  (see capK), and a cap that is now the strongest reason on its own has to be
 *  gentle enough to live alone. */
const TRUDGE_DRIVE = 0.15;
const PRIDE_STRIDE = 0.08;
const PRIDE_BOB = 0.35;

/**
 * …and the posture, as OFFSETS on the pose in force rather than as a fourth
 * keyframe. A keyframe blend is right for the look-up, which happens standing
 * still; blending the walk cycle toward a static bowed pose would flatten the
 * gait it is supposed to be colouring. These are added to whatever the pose
 * machine produced, in the pose's own units (fractions of the figure's height,
 * x forward, y up), so the legs keep walking underneath.
 *
 * Pride is the same offsets with the sign flipped and roughly a third of the
 * amplitude: an open chest is a smaller gesture than a bowed head.
 */
const TRUDGE_HEAD_FWD = 0.07;
const TRUDGE_HEAD_DOWN = 0.04;
const TRUDGE_SH_FWD = 0.028;
const TRUDGE_SH_DOWN = 0.02;
const TRUDGE_HAIR = 0.008;
const TRUDGE_HAIR_TILT = 0.45;
const PRIDE_HEAD_BACK = 0.022;
const PRIDE_HEAD_UP = 0.012;
const PRIDE_SH_BACK = 0.016;
const PRIDE_SH_UP = 0.01;

interface Mood {
  trudge: number;
  pride: number;
}

const MOOD_NEUTRAL: Mood = { trudge: 0, pride: 0 };

/** The mood at a year. Clamped flat off both ends of the table, like the light. */
function moodAt(year: number, out: Mood): Mood {
  const last = MOOD_STOPS.length - 1;
  if (year <= MOOD_STOPS[0].year) {
    out.trudge = MOOD_STOPS[0].trudge;
    out.pride = MOOD_STOPS[0].pride;
    return out;
  }
  if (year >= MOOD_STOPS[last].year) {
    out.trudge = MOOD_STOPS[last].trudge;
    out.pride = MOOD_STOPS[last].pride;
    return out;
  }
  let i = 0;
  while (i < last - 1 && MOOD_STOPS[i + 1].year <= year) i++;
  const a = MOOD_STOPS[i];
  const b = MOOD_STOPS[i + 1];
  const span = b.year - a.year;
  const t = span > 0 ? clamp((year - a.year) / span, 0, 1) : 0;
  out.trudge = lerp(a.trudge, b.trudge, t);
  out.pride = lerp(a.pride, b.pride, t);
  return out;
}

/* --------------------------------------------------------------- the era --- */
/**
 * The persistent period label under the ticking year. The cards are events and
 * they come and go; this is the reader's standing answer to "when am I", and it
 * is on screen for every frame of the walk.
 *
 * The era in force is the LAST row at or before the walker's year, so it falls
 * back correctly when he turns around and walks back over a boundary.
 *
 * THE MYSTERY RULE APPLIES HERE. These are political periods and nothing else:
 * no row may name money, income, output, prices or a series. If a future row
 * wants to say "the licence raj" or "the Nehruvian plans", check it against that
 * first — the reader must reach the end without having been told what the ground
 * is.
 *
 * R2 finalised the spans. The two R1e rows that were flagged as soft are gone:
 * "between the wars" put the First World War inside the Crown Raj, and "war and
 * Partition" was named for an event outside its own span. What replaces them is
 * one row on 1905 — the Bengal partition, and the start of the mass movement the
 * next forty years belong to. The boundaries are now the events that changed who
 * governed or who was contesting it: 1707 Aurangzeb dies, 1765 the Diwani (the
 * grant of Bengal's revenue, which is when the Company actually starts ruling
 * rather than when it wins the battle), 1858 the Crown takes over, 1905, 1947,
 * 1991.
 */
export interface Era {
  year: number;
  label: string;
}

export const ERAS: Era[] = [
  { year: 1600, label: 'Mughal rule' },
  { year: 1707, label: 'the empire frays' }, //     Aurangzeb dies
  { year: 1765, label: 'Company rule' }, //         the Diwani of Bengal
  { year: 1858, label: 'Crown rule' }, //           the Company is wound up
  { year: 1905, label: 'the freedom struggle' }, // the partition of Bengal
  { year: 1947, label: 'independence' },
  { year: 1991, label: 'the climb' },
];

/** Index of the era in force at `year`; 0 before the table starts. */
export function eraAt(year: number): number {
  let i = 0;
  for (let k = 0; k < ERAS.length; k++) if (ERAS[k].year <= year + 1e-9) i = k;
  return i;
}

/* -------------------------------------------------------------- the drive --- */
/**
 * The whole pacing model, in one number: holding an input moves the GROUND
 * under the walker at a constant screen speed. Not a constant number of years
 * per second — a leg the camera has zoomed out for covers more history in the
 * same seconds, which is what makes two and a half centuries of decline feel
 * long without ever feeling slow.
 *
 * Exported because it is the first thing a feel-check retunes.
 */
export const WALK_SPEED_PX_S = 45;

/**
 * The speed is authored at a phone's width. Because every width shares the same
 * year-window, a constant px/s would make the same leg take three times the held
 * seconds on a desktop stage — so the speed scales up with stage width, never
 * down.
 *
 * It scales with the SQUARE ROOT of the width ratio rather than linearly, which
 * is a deliberate trade and worth stating plainly: a desktop leg now takes
 * LONGER in held seconds than the same leg on a phone. Duration parity was the
 * linear scaling's whole justification, and it cost too much — a 1440px stage
 * moving the ground at 166px/s is a figure travelling at a run across a frame
 * that is meant to read as a landscape being crossed. The root splits the
 * difference: 45px/s on a phone, ~86px/s at 1440 (the linear rule said 166), so
 * the desktop leg is about half again as long in seconds and calm at every size.
 */
const WALK_SPEED_REF_W = 390;

/** The width scaling, in one place because both the drive and the probes want
 *  it. Never below 1: a stage narrower than the reference is not sped up. */
function widthScale(w: number): number {
  return Math.max(1, Math.sqrt(w / WALK_SPEED_REF_W));
}

/** Where the walker stands in the frame, as a fraction of stage width. Behind
 *  centre: there is more history behind him than road ahead, and the frame
 *  should say so. */
const ANCHOR_X = 0.42;

/**
 * Momentum. R1e gave the drive weight: a press ramps it up over ~350ms and a
 * release lets it down over ~250ms, both as exponential eases (which are
 * ease-out by construction — most of the change is in the first time constant).
 * Three time constants is ~95% of the way there, so 120 and 85 are the two
 * numbers the brief asks for.
 *
 * This is deliberately the only thing between the hold and the ground. The
 * gait's cadence follows ground covered, so the legs pick up and wind down with
 * the ramp without knowing it exists.
 */
const TAU_ACCEL = 120;
const TAU_BRAKE = 85;

/**
 * …and the turn. A reader who reverses at speed does not get mirrored
 * mid-stride: he brakes to a stop, stands for TURN_HOLD_MS while he comes round,
 * and then accelerates the other way. Both alternatives were tried and both are
 * worse — an instant mirror teleports his planted feet, and tweening the mirror
 * through zero folds the whole figure into a vertical line on the way past.
 */
const TURN_HOLD_MS = 160;

/* ----------------------------------------------------------- the figure --- */
/**
 * The walker is a person on the path, not a marker on a series — so he is drawn
 * in ink (--tsoi-color-on-surface), never in the line's saffron, and he stands
 * ON the line rather than sitting on it.
 *
 * He is the "youth in a kurta" silhouette the user picked out of the round-two
 * mockups: a solid body in the Limbo register — real mass, head and torso one
 * shape, tapered two-segment limbs, a small crop of hair, and a torso that
 * falls to a loose knee-length hem. Young-adult proportions (the head is about
 * a seventh of the height, not a child's quarter). Faceless: no eyes, no
 * features, nothing that would make him a particular person. Nothing period or
 * regional beyond the hem, and none of the protected Common Man's markers.
 *
 * The geometry below is lifted number for number from that mockup, in
 * fractions of the figure's height, measured from the ground up — so a pose is
 * a table of points and the poses can be blended by lerping them.
 *
 * The figure does NOT scale with the camera — with one authored exception. At
 * the pull-back the whole line is on screen and a full-size person at its tip
 * had feet straddling thirty years of history, which read as a giant on a
 * needle rather than a man dwarfed by the distance. So the pull eases him down
 * to PULL_WALKER_SCALE of his size: still him, still visible, more dwarfed —
 * the shrink serves the ending's point instead of undoing it.
 *
 * R2M TAKES THAT MUCH FURTHER, on the device feel-check's own words: "very
 * small figure, or a dot; right now it feels too large". 0.6 of 36px is 22px on
 * a phone, which at the end of a full pull-back is a person standing on the
 * chart rather than a person the chart has left behind. The ending's whole
 * argument is scale — four centuries at one zoom, and the reader somewhere on
 * it — and a figure you can still read the hem of is arguing the other way.
 *
 * He DOES scale with the STAGE, and R2k is where that stopped being two tiers
 * and became one rule: HE SCALES EXACTLY AS THE DRIVE'S SPEED DOES. The drive
 * moves the ground at WALK_SPEED_PX_S · widthScale(w), so a 1232px desktop stage
 * pushes 1.78× the pixels per second under him — and while his legs were a flat
 * 40px on every stage, his cadence scaled with the stage width right along with
 * it: 197 steps a minute on a desktop against 125 on a phone, which the device
 * feel-check called comical and was. Sizing him by the same widthScale takes the
 * width out of the cadence entirely (see STRIDE_CYCLE_PER_H), and it fixes the
 * second half of the same bug, which is that a 40px man on a 1232px stage reads
 * as a speck rather than as the person the reader has been for four centuries.
 *
 * Below the reference width nothing scales down — widthScale is clamped at 1 —
 * so THE PHONE FIGURE IS UNCHANGED AT 36px, to the pixel. The old two-tier rule
 * put the step from 36 to 40 at a 480px stage; this rule reaches 39.9 there, so
 * it is the same figure at both of the widths the old one named and a continuous
 * ramp between and above them instead of a jump on resize.
 *
 * The flagpole scales with him — see PROP_H. It has to: R2b sized it so it
 * "clearly stands over him", and that is a RATIO, not a number of pixels.
 */
const WALKER_H = 36;
/**
 * What is left of him at the end of the pull-back, as a fraction.
 *
 * R2m: 0.6 → 0.24, inside the round's 0.20–0.28 band and chosen off the phone,
 * which is the binding case. At 0.24 he is 8.6px tall on a 390px stage: two or
 * three pixels of head over a body with a suggestion of legs in it, which is a
 * FIGURE at a distance rather than a dot (0.20 is 7.2px, where the head merges
 * into the torso and he genuinely becomes a smudge) and is nowhere near a person
 * standing on the chart (0.28 is 10px, where the hem starts reading again). He
 * is still the darkest ink in the frame, which is what keeps him findable at
 * that size — the pull-back lightens the land toward PULL_LAND and he does not
 * go with it.
 *
 * The HALO had to move with him and did not, which is the one thing this number
 * could have broken: the backlight is a radial of BACKLIGHT_R × his DRAWN height
 * and the drawn height is unshrunk, so at 0.6 the pool of light was already
 * three times his width and at 0.24 it would have been nine — a lit patch of
 * chart with a speck in the middle of it. Both the halo and the rim glow now
 * take the shrink (see drawBacklight and the edge pass), so the light stays his.
 */
const PULL_WALKER_SCALE = 0.24;

/** The figure's BASE height at a given stage width — before the era curve (see
 *  eraScaleK) and before the pull-back's shrink. Shared by the loop (which needs
 *  it to place the feet in years) and the draw, so the two cannot disagree. */
function walkerHeight(w: number): number {
  return WALKER_H * widthScale(w);
}

/**
 * THE ERA SCALE CURVE, and it is a fact about the STORY rather than about the
 * stage: how big the walker is in his own century.
 *
 * Through the open Mughal hundred and the long gaps of the 1800s he is at
 * ERA_SCALE_LOW of himself — the world is the subject there, the road runs for
 * decades between one sentence and the next, and the frame should say he is
 * small in it. From ERA_SCALE_RISE_FROM he grows, slowly, across the eighty-odd
 * years in which the story stops being something done to him; he is at
 * ERA_SCALE_HIGH through the famine years, because that stretch is HIS. Then he
 * eases back to exactly 1, and the reveal, the pull-back and the ending are the
 * frames they always were, to the pixel.
 *
 * R2M MOVES WHERE THAT EASE HAPPENS, and it is the one shape change this curve
 * has had. R2k held the peak across 1943–1955 — through the gate, the hoist,
 * Nehru's card and the first decade of the morning — and eased it out over the
 * thirty years after. What the device feel-check found is what a 1.3× figure
 * costs at the ONE frame in the piece that is composed rather than walked: the
 * mast is sized as a ratio of the walker (see PROP_H), so a walker a third
 * bigger is a mast a third bigger standing in the same sky, and on a phone the
 * flag arrived at the masthead THROUGH HIS HEAD. The pole stopped standing over
 * him at the exact moment the whole piece is about him standing under it.
 *
 * The other end of that trade — 1.30 at the mast, and let the frame open up to
 * hold it — was offered and was not the one taken. So the curve now comes back
 * DOWN across the gate approach: peak held through ERA_SCALE_HIGH_TO, eased to
 * exactly 1 by ERA_SCALE_FLAT_BY, and 1 from there through the gate, the hoist,
 * Nehru, the morning and everything after it. The tail that used to run to 1985
 * is gone because it has nothing left to do: the curve has already arrived.
 *
 * The ease is 2.5 YEARS OF GROUND and it is not a size event, which is the one
 * thing about it that had to be measured rather than asserted. It is the
 * steepest stretch of this curve by a long way — about 12% of his height per
 * year against the rise's 0.7% — but it falls exactly where the walk is
 * slowest: 1943 and 1947 are four years apart, so the famine card's dwell holds
 * the ground to about a third of a year per second across the whole of it (see
 * DWELL_BUDGET). Held forward from 1943, the shrink plays out over some eight
 * seconds at a few per cent a second, which is under the rate the rise itself
 * runs at where the ground is open.
 *
 * It is a pure function of the year, like the light and like the trailhead's
 * span: walking back rewinds it for free and no state can drift out of step
 * with it. It composes MULTIPLICATIVELY with walkerHeight above and with the
 * pull-back's PULL_WALKER_SCALE below, and it is 1 everywhere the pull-back
 * exists, so the two never meet.
 *
 * Every ramp is measured in DECADES. The steepest point of the rise is about
 * 0.7% of his height per year, which at the pace the drive covers 1857–1943 is
 * on the order of a percent a second — under a card, where the ground barely
 * moves, it is nothing at all. The reader is never meant to catch him growing.
 *
 * `?flatscale` in the URL turns the whole thing off (ERA_SCALE_ON below): it is
 * the comparison switch this was built behind, it is read once at module load,
 * and it costs one multiply by 1 per frame when it is off.
 */
const ERA_SCALE_LOW = 0.92;
const ERA_SCALE_HIGH = 1.3;
const ERA_SCALE_RISE_FROM = 1857;
const ERA_SCALE_HIGH_FROM = 1943;
/** The end of the plateau: the famine years keep the whole of the peak. */
const ERA_SCALE_HIGH_TO = 1944;
/** …and where the curve is back at exactly 1, which is a year and a half short
 *  of the gate. Everything from here on — 1947, the hoist, Nehru, the morning,
 *  the reveal — is drawn at the stage's own figure. */
const ERA_SCALE_FLAT_BY = 1946.5;
/** Read once, at module load, in the browser only. Never advertised in the UI. */
const ERA_SCALE_ON =
  typeof window === 'undefined' ||
  !new URLSearchParams(window.location.search).has('flatscale');

function eraScaleK(year: number): number {
  if (!ERA_SCALE_ON) return 1;
  if (year <= ERA_SCALE_RISE_FROM) return ERA_SCALE_LOW;
  if (year >= ERA_SCALE_FLAT_BY) return 1;
  if (year < ERA_SCALE_HIGH_FROM) {
    const t = (year - ERA_SCALE_RISE_FROM) / (ERA_SCALE_HIGH_FROM - ERA_SCALE_RISE_FROM);
    return lerp(ERA_SCALE_LOW, ERA_SCALE_HIGH, smoothstep(t));
  }
  if (year <= ERA_SCALE_HIGH_TO) return ERA_SCALE_HIGH;
  const t = (year - ERA_SCALE_HIGH_TO) / (ERA_SCALE_FLAT_BY - ERA_SCALE_HIGH_TO);
  return lerp(ERA_SCALE_HIGH, 1, smoothstep(t));
}

/** The height he is actually DRAWN at: the stage's figure through the era
 *  curve. Everything measured off the body — the leg clamp, the foot offsets,
 *  the halo, the feet's own years — reads this one, so nothing can be sized off
 *  a height he is not. The gait's CADENCE deliberately does not; see
 *  STRIDE_CYCLE_PER_H. */
function drawnWalkerH(w: number, year: number): number {
  return walkerHeight(w) * eraScaleK(year);
}

/** Body widths and stroke weights, all fractions of the height. The limbs are
 *  strokes and the torso is a fill in the same ink, so their unions just merge
 *  into one silhouette. */
const W_HEAD_R = 0.075;
const W_HAIR_R = W_HEAD_R * 1.13;
const W_SH_W = 0.21;
const W_HIP_W = 0.135;
/** Height of the kurta hem above the ground, and how far it flares past the
 *  hip. 0 would be a bare waist; this is the drape. */
const W_HEM = 0.36;
const W_HEM_FLARE = 1.45;
const W_THIGH = 0.065;
const W_SHIN = 0.042;
const W_UPPER_ARM = 0.048;
const W_FOREARM = 0.034;
const W_NECK = 0.042;

/** Degrees → radians. The pose tunables below are written in degrees because a
 *  pose is thought about in degrees. */
const DEG = Math.PI / 180;

/**
 * The gait. The stride phase advances with GROUND COVERED, not with the clock:
 * every frame adds the walker's screen-space displacement (Δyear read through
 * the camera's current scale) divided by half a cycle's worth of pixels. Since
 * the drive holds that displacement at a constant px/s, this is what makes the
 * legs turn over at one steady rate whatever the zoom is doing.
 *
 * The cycle length is in units of the figure's height so every stage turns its
 * legs over at the same rate relative to its own stride: 1.30·H is ~47px at the
 * phone's 36px figure. Longer than the geometric stride (the feet do slip a
 * little) because at 36px a true no-slip cadence reads as a scurry.
 *
 * R2k raises it from 1.22 and the arithmetic is the whole argument. With the
 * figure now sized by widthScale (see walkerHeight) the ground per step is
 * WALK_SPEED_PX_S · widthScale / (STRIDE_CYCLE_PER_H · WALKER_H · widthScale / 2)
 * — the width cancels, and ONE number sets the tempo on every stage there is.
 * At 1.22 that number was 123 steps a minute, the top of a natural walking band
 * and the thing the feel-check called fast; at 1.30 it is 115, the middle of it.
 * The eighth of a body-height of extra slip is the price and it is the smaller
 * of the two errors.
 *
 * It is measured against the STAGE's figure and not the drawn one, which is the
 * one place the era curve is deliberately not followed: a cycle in units of the
 * drawn height would hand a 1.30× walker 88 steps a minute and a 0.92× one 125,
 * i.e. the cadence would swing by half again across the piece, which is the bug
 * this round exists to kill. It follows the SQUARE ROOT of the era scale
 * instead — a longer pendulum does swing slower, and √ keeps both ends of the
 * curve (103 and 122) inside the band. See the loop's halfCyclePx.
 */
const STRIDE_CYCLE_PER_H = 1.3;

/**
 * Standing. Below STAND_SPEED strides/second he is not walking, and the gait
 * amplitude eases to 0 so he blends to the stand pose instead of freezing
 * mid-stride. TAU_SWING is that blend (~200ms), and EPS_SWING is what still
 * lets the render loop stop.
 */
const STAND_SPEED = 0.05;
const TAU_SWING = 200;

/**
 * THE DWELL GAIT, which is the same one question asked three times now.
 *
 * The gait's whole contract is that the stride phase advances with GROUND
 * COVERED (see STRIDE_CYCLE_PER_H): the legs turn over in step with the world
 * going past, so a stride is never a rate the reader can catch out. Which is
 * exactly right while the ground is moving at a walk, and something has to give
 * the moment it is not — a dwell holds the ground at an eighth of open pace
 * while a card is being read, and one eighth of the ground is one eighth of
 * SOMETHING.
 *
 *  · R2i let it all come off the CADENCE. One eighth of the tempo at full stride
 *    length is a step every four seconds with the legs at full scissor: slow
 *    motion, and the feel-check said so.
 *  · R2j let it all come off the STRIDE, by flooring the cadence at 0.62 of open
 *    and shrinking the step to pay for it. The tempo was right and the steps went
 *    to a fifth of themselves: pitter-patter, and the feel-check said so.
 *
 * A person slowing down does BOTH, moderately, so R2k splits it — and there is
 * exactly one degree of freedom to split, because ground covered is cadence times
 * stride and the ground is set by the drive, not here. Write the drive's own
 * fraction of open pace as `u`; then any pair (stride, cadence) with
 * stride · cadence = u is available and no other pair is. R2i took (1, u); R2j
 * took (u/0.62, 0.62). R2k takes (u^PACE_SPLIT, u^(1−PACE_SPLIT)) — a power
 * split, which is the only one-parameter family that is smooth, has no threshold
 * anywhere in it, and passes through (1,1) at open stride with no kink for the
 * reader to catch. At PACE_SPLIT slightly over a half the stride gives up a
 * little more than the cadence does, which is the direction a tiring walker
 * actually goes.
 *
 * The numbers it lands on, measured: at a mid-walk dwell (u≈0.32 on a desktop
 * stage) he is at 0.52 of his stride and 0.61 of his tempo; at the deepest dwell
 * the piece reaches (u≈0.125, 1600 on a phone) he is at 0.30 and 0.41. The
 * authored intent asked for cadence in 0.55–0.75 AND stride no shorter than
 * 0.3–0.4, and those two bands multiply out to a floor of 0.165 of the ground —
 * so at u=0.125 they cannot both be met by any gait that does not skate. Holding
 * the stride at its floor and letting the tempo go under the band is the reading
 * the round asked for in the same breath ("the deepest dwells may read as a
 * heavy, deliberate trudge"), and it is what PACE_STRIDE_MIN does.
 *
 * `u` is normalised by the terrain's own cycle before any of this, so the split
 * is ONE tempo everywhere rather than a fraction of whatever the slope has
 * already set — R2j's reasoning, kept intact. And both `stride` and `cycle` take
 * the identical multiplier, which is what keeps the feet travelling exactly the
 * ground he travels: the no-slip contract is a statement about that pairing and
 * it is untouched here.
 *
 * Standing proper is still the swing blend's job at STAND_SPEED. The stride
 * floor cannot lift a walker the reader has let go of: it floors the STEP
 * LENGTH, and a step length multiplied by a ground speed of zero is a walker
 * standing still.
 */
const PACE_SPLIT = 0.58;
const PACE_STRIDE_MIN = 0.3;

/**
 * Where each foot lands. The walk pose's two feet are the extremes of a
 * sinusoid: the front foot reaches +0.205 of the height ahead of him and the
 * back foot trails 0.15 behind, which is exactly the mockup's walk keyframe at
 * phase π/2. Mid is the midpoint of those two, amp is half the distance.
 */
const FOOT_MID = 0.0275;
const FOOT_AMP = 0.1775;
/** Ground clearance of the swinging foot, and the extra bend the swinging knee
 *  takes, both peaking in mid-swing. */
const FOOT_LIFT = 0.055;
const KNEE_LIFT = 0.05;
/** The knee sits ahead of the straight hip-to-foot line by this much: legs bend
 *  forwards. Taken off the mockup's two knee points. */
const KNEE_FWD = 0.024;

/**
 * The suspension. Each foot stands on the terrain under it — sample() at the
 * foot's own x, not at the walker's — and the hip rides the AVERAGE of the two,
 * low-pass filtered over TAU_RIDE. Two contact points a third of a body-height
 * apart already average out most of a one-year wiggle; the filter takes the
 * rest. This is what stops the annual era shaking him.
 *
 * The filter carries a VELOCITY term: before each step toward the target it
 * advances the current ride along the terrain's own (smoothed) slope by the
 * ground he covered this frame. A plain low-pass has a steady-state lag
 * proportional to how fast the ground under it is moving, and on the annual
 * era's steep stretches that lag was most of a body height — which is what used
 * to stretch his legs, and would now come out as a permanent crouch instead.
 * With the feed-forward, a constant slope has no lag at all and the filter is
 * left doing only the job it exists for: taking the wiggle off.
 *
 * On top of that, and only that, a small bob at twice the stride frequency:
 * highest with the feet together, lowest at double support. ±0.01·H is about a
 * third of a pixel at phone size — felt as life, never seen as a bounce.
 */
const TAU_RIDE = 120;
const BOB = 0.01;

/**
 * The slope lean: he leans into climbs and braces back on descents, by a
 * fraction of the terrain's slope under his feet measured in SCREEN px (so a
 * climb the camera has flattened does not bend him double). The slope comes
 * straight out of sample(), the same evaluator that drew the ground he is
 * standing on, so the lean cannot disagree with the picture.
 *
 * Softer than the stickman's was, and applied to the upper body about the hip
 * rather than to the whole figure about the feet: the feet are planted now, and
 * rotating the figure under them would lift them off their own ground.
 */
const SLOPE_LEAN = 0.22;
const SLOPE_LEAN_MAX = 9 * DEG;

/**
 * …and the two things R2b added to it, both from one complaint: on the opening
 * descent out of 1600 the walker on a phone leans back like a man falling
 * downstairs, and the same terrain on a desktop barely tips him.
 *
 * The cause is not the terrain, it is the FRAME. The screen slope the lean reads
 * is (px of rise)/(px of run), and a narrow stage draws the same slice of
 * history at a third of the px per year with the same plot height over it — so
 * the identical ground is three times steeper on a phone by construction. The
 * fix is to read the lean off a slope normalised to the aspect the pose was
 * authored at (a 1440-wide desktop band): the wide stage is untouched, the
 * narrow one stops shouting, and the two now read as the same posture.
 *
 * Note where it is applied — to the SLOPE, before the arctangent, because the
 * arctangent is not linear and normalising the angle afterwards leaves the two
 * stages a fifth of a lean apart at the steepest. The pose machine's own modes
 * still read the unnormalised screen slope: how steep the ground LOOKS is the
 * right question for whether he takes it carefully, and the wrong one for how
 * far his spine goes over.
 */
const LEAN_ASPECT_REF = 0.44;

/** How long the look-up takes to come in. The pose itself is a keyframe below,
 *  blended in on this ease. */
const TAU_LOOK = 320;

/* ------------------------------------------------------ the pose machine --- */
/**
 * THE LEG REACH CLAMP, and the one rule the rest of this section exists to keep.
 *
 * Each foot stands on the terrain at its own x, which is what makes him straddle
 * a dip instead of falling into it — but taken alone it also means that on steep
 * ground the two feet are far apart vertically and the legs simply GROW to reach
 * them. Measured on the 1918 drop before this landed, the hip-to-foot distance
 * peaked at 1.60·H: legs three times their own length.
 *
 * So the hip is not where the pose says any more. It is the nearest point to
 * where the pose says that BOTH feet can still be reached inside LEG_MAX·H — a
 * one-line interval intersection, solved exactly, every frame. If that means
 * dropping the hip he crouches; if it means lifting it (a step up onto a shelf)
 * he stands taller. Legs may reach full extension; they never grow.
 *
 * 0.52·H is the figure's own leg: the walk pose puts the hip at 0.53·H and the
 * feet on the ground, so a straight leg is about that long by construction.
 */
const LEG_MAX = 0.52;
/**
 * If the crouch is deep the torso packs down with it rather than riding the
 * lowered hip bolt upright: everything above the hip compresses toward it, by
 * enough to bring the shoulders down TORSO_SQUASH·H at a full crouch. Applied as
 * a scale on the pose's y offsets from the hip, so the head stays a circle and
 * only moves down.
 */
const TORSO_SQUASH = 0.02;
/** The crouch depth, in H, at which that compression is at full. */
const TORSO_SQUASH_AT = 0.09;

/**
 * The mode thresholds, all in SCREEN slope under the walker (px of rise per px
 * of run, after the camera's y-scale and the low-pass below) and all measured in
 * his DIRECTION OF TRAVEL: positive is uphill ahead of him, so walking back down
 * a hill he climbed reads as a descent and walking back up one he slid down
 * reads as a climb, with no separate bookkeeping.
 *
 * Each threshold is a ramp rather than a line, and the weight it produces is
 * then eased over TAU_MODE, so nothing about this switches — the mode weights
 * are blend amounts fed to the same mixPose() the three original poses use.
 */
const TAU_SLOPE = 200;
/** …and the mode weights' own ease. An exponential is most of the way there in
 *  two time constants, so 110 is the ~220ms blend the brief says: fast enough
 *  that a one-year gouge is over before he has finished sitting down for it,
 *  slow enough that nothing switches. */
const TAU_MODE = 110;

/** Climb: on at 0.35, fully committed by 0.60. */
const CLIMB_ON = 0.35;
const CLIMB_FULL = 0.6;
/** …and the second gear, where both arms come into it. */
const CLIMB_HARD_ON = 1.4;
const CLIMB_HARD_FULL = 1.8;
const DESC_ON = 0.35;
const DESC_FULL = 0.6;
/** Careful descent: on at 0.35 downhill, fully committed by 0.6, and it is now
 *  the ONLY thing that happens on a descent however steep it gets.
 *
 *  R1e retired the sit-and-slide. It was a fourth keyframe for a handful of
 *  frames on two gouges in the whole walk, and on a stage lit like this one it
 *  read as the figure falling over rather than as a decision. The leg clamp and
 *  the crouch already give him the reach for the steepest ground the slope cap
 *  allows, so a careful descent is what he takes down all of it. */

/** Stride length multipliers per mode. Short steps are most of what reads as
 *  care; they multiply, so rough ground inside a climb is shorter still.
 *
 *  R2g deepens the descent from 0.75 to 0.62, and the change that matters is not
 *  the number but what happens to the CADENCE underneath it (see `cycle` in
 *  GaitMod). The complaint was that on the opening descent he keeps his
 *  flat-ground stride and posture and therefore skates down a ramp; a man going
 *  downhill takes short quick careful steps, and short steps at the old cadence
 *  are just a slower man. So the slope modes now get their stride shortening
 *  compensated in full at the cadence — same travel speed, more steps — while
 *  the body-language multipliers below keep the root rule they were authored
 *  with. */
const STRIDE_CLIMB = 0.7;
const STRIDE_CLIMB_HARD = 0.5;
const STRIDE_DESC = 0.62;
const STRIDE_ROUGH = 0.75;
/** Ground clearance multipliers: he picks his feet up on a climb and picks his
 *  way over rough ground. */
const LIFT_CLIMB = 1.6;
const LIFT_ROUGH = 1.5;

/** The lean about the hip, per mode. Into the hill on a climb; back on a
 *  descent.
 *
 *  R2b added a CAP on the backward brace — 60% of what the slope lean and a
 *  committed careful descent could reach between them — because the two used to
 *  be ADDED and sixteen degrees of back-lean is a man about to sit down. R2g
 *  removes the cap by removing the addition: on a descent the slope lean is eased
 *  TOWARD this brace rather than stacked under it (see drawWalker), so a
 *  committed careful descent produces exactly DESC_LEAN wherever it happens, at
 *  any stage aspect, and there is nothing left to clip. Climbing is untouched and
 *  was never capped: leaning INTO a hill stays legible however far it goes. */
const CLIMB_LEAN = 14 * DEG;
const DESC_LEAN = -7 * DEG;

/**
 * HIP COMPLIANCE ON A DESCENT, which is the third of the three things that made
 * him float downhill.
 *
 * The hip rides the MEAN of the two feet, and on a straight ramp the mean of two
 * points a stride apart is itself a straight ramp — so however careful his legs
 * are, his centre of mass glides. A person going downhill does not glide: the
 * body drops onto each planted foot in turn.
 *
 * So on a descent the ride is pulled from the mean toward the LOWER of the two
 * feet, which on a downhill alternates between them twice a stride and therefore
 * traces the step itself. And the ride filter is loosened at the same time,
 * because TAU_RIDE was chosen to smooth exactly this kind of sawtooth away. Both
 * are scaled by the careful-descent weight, so flat ground is untouched.
 */
const DESC_HIP_LOW = 0.55;
const TAU_RIDE_SLOPE = 55;

/**
 * Rough ground: how bumpy the terrain is under a stride, independent of how
 * steep it is. Probed as the RMS departure of the ground from the straight line
 * joining the two ends of a stride, in units of the figure's height — a ramp,
 * however steep, has roughness 0; the annual era's one-year gouges do not.
 *
 * ROUGH_PROBES points across ±half a stride is enough to catch a single-year
 * notch at the zooms the annual era is walked at, and it costs five sample()
 * calls a frame.
 */
const ROUGH_PROBES = 7;
/** Measured across the walk before these were set: the 1929-34 stall reads
 *  0.02-0.05, the flat plan years under 0.07, the annual era's famine decade
 *  0.20-0.46. So the band is drawn between those two populations rather than
 *  guessed — under the old placeholder pair the whole annual era was "rough"
 *  and the normal gait never appeared once after 1884. */
const ROUGH_ON = 0.1;
const ROUGH_FULL = 0.28;

/* ------------------------------------------------------------- framing --- */
/**
 * The reveal frame, derived from the data at load rather than written down:
 * a margin in years either side of the series' own span, and headroom above
 * the taller of the two lines.
 *
 * yMin is not a tunable. The pull-back is the one moment the whole line is on
 * screen at one scale, and it is zero-based — a truncated axis is how you make
 * three centuries of near-flatness look like progress, and this piece is about
 * exactly that flatness.
 */
const REVEAL_PAD_LEFT_YEARS = 20;
/**
 * The right margin is a FRACTION of the frame, not a count of years: the walker
 * stands on the final point through the pull-back, and a fixed 18 years of pad
 * came to 15px on a phone — half of him hung off the stage. Placing the last
 * data year at this fraction of the width buys the same breathing room at every
 * size (23px on a 390 phone, more on anything wider).
 */
const REVEAL_END_FRAC = 0.94;
const REVEAL_PAD_TOP = 1.08;

/**
 * The vertical fit. Whatever the terrain does inside the visible window, its
 * low sits FIT_BOTTOM down the plot and its high sits FIT_TOP down it — so the
 * ground always fills the middle two-fifths of the stage at real amplitude
 * rather than shrinking to a wobble whenever a leg happens to be flat.
 */
const FIT_TOP = 0.55;
const FIT_BOTTOM = 0.89;

/**
 * …and where that band sits in the frame. Only the DIFFERENCE of the two numbers
 * above sets the terrain's amplitude; this one says how much sky is over it.
 *
 * R1e pushed it down from the middle, and narrowed the band above from 0.40 to
 * 0.34 to go with it. The walk is a landscape now and a landscape needs a sky:
 * the caption lives a fifth of the way down and the two ridge bands sit on the
 * horizon, and everything below the ground line is filled black, so a band of
 * 0.40 centred at 0.50 turned the long 1600-1750 decline into a frame that was
 * three-quarters landmass with the horizon buried under it.
 *
 * The post-build review pushed it further: at 0.62 the phone frame was still
 * ~55% landmass with the walker riding near the middle, where the approved
 * mockups are sky-dominant with the ground line in the lower third. 0.72 puts
 * the visible ground between 0.55 and 0.89 of the plot at full band amplitude
 * (the band was left at 0.34 — placement moved, drama did not).
 *
 * The cost is real and worth naming: the terrain's on-screen amplitude is 15%
 * shallower than R1d's, so a given hill is a slightly gentler hill. Nothing is
 * cropped, smoothed or moved — this is a scale, and the steepness cap above it
 * is unchanged.
 */
const FIT_CENTRE = 0.72;

/**
 * …but never at any exaggeration. The band fit is a ratio, so on a window whose
 * whole range is a few dollars — the famine years, where the record turns
 * annual and every wiggle is one year wide — it magnifies a 2% wobble into a
 * cliff, and the walker spends the era climbing walls.
 *
 * So the fit also asks how steep the visible ground actually gets ON SCREEN:
 * the terrain's own slope (dollars per year, straight out of sample()) times
 * px-per-dollar over px-per-year. If the steepest visible pixel exceeds this
 * cap the vertical scale shrinks until it does not.
 *
 * The cap reads the PCHIP's instantaneous slope, which is a good deal steeper
 * than the year-to-year secant, so it bites harder than the angle suggests:
 * at 1.6 the famine era flattened to ~3% of the canvas and "the ground turns
 * rough" stopped being visibly true. 2.6 keeps the era's dips clearly rough
 * while the planted-feet ride keeps the walker's own motion calm.
 *
 * Nothing is smoothed or cropped by this: every dip the data contains is still
 * drawn, at the same shape, just not near-vertical. The frame takes the min of
 * the band fit and this cap, and the result eases in exactly like the rest of
 * the camera.
 */
const SLOPE_MAX_SCREEN = 2.6;
/** How often the visible ground is probed for that slope, in CSS px. The curve
 *  is drawn every 2px; 4 is plenty to find its steepest stretch. */
const SLOPE_PROBE_PX = 4;

/**
 * Exponential-smoothing time constants, milliseconds. The pan is smoothed hard
 * enough to absorb a resize or a stop without snapping but not so hard that the
 * walker drifts off his anchor while a hold is running; the zoom is slower
 * still, because a zoom that keeps up with the pan reads as a lens rather than
 * as distance.
 */
const TAU_CAMERA = 300;
const TAU_ZOOM = 500;

/* -------------------------------------------------------------- terrain --- */

/** The year the source data turns annual. Before it, Maddison gives scattered
 *  benchmark years and the line between them is an inference, not a record —
 *  so it is drawn dashed with the benchmarks marked. */
const SOLID_FROM = 1884;

/** Pre-1884 the record is a handful of benchmark years and the ground between
 *  them is an inference. The rim light says so: dashed over those years, solid
 *  after, and a shade dimmer in the dash so it reads as the same light
 *  flickering rather than as a second colour.
 *
 *  The SAME treatment runs at the other end. Maddison stops at 2022 and the last
 *  three years are chained onto it from published growth rates (see
 *  `estimated_from` in economy.json and the generator's note), which is an
 *  inference of a different kind but an inference all the same. So the walk
 *  starts on dashes and ends on dashes, and the solid stretch in the middle is
 *  exactly the century and a half of annual record. That symmetry is deliberate:
 *  it is the only thing on the stage that can say where the record is firm
 *  without naming what the record is. */
const STEPPING_STONE_DASH_ALPHA = 0.62;
const STEPPING_STONE_DASH: [number, number] = [4, 6];

/** How often the curve is evaluated when it is drawn, in CSS px. The
 *  interpolant is cubic, so 2px is already past the point where more samples
 *  change any pixel. */
const CURVE_STEP_PX = 2;

/* ------------------------------------------------------------ the land --- */
/**
 * The rim light is the data line, and it burns only over ground he has walked.
 * Ahead of him the landmass is unlit silhouette and the fog does the separating,
 * so the shape of what is coming is visible without the path being drawn. The
 * lit end is not a wall: it runs a short lead past him and fades out over it, so
 * the edge travels with him rather than reading as a wipe. Walking backward
 * un-lights the ground he gives back.
 */
const RIM_WIDTH = 1.6;
const RIM_LEAD = 40;

/** Where the horizon sits, as a fraction of the plot height, and how the two
 *  decorative ridges hang off it. The fit (see FIT_CENTRE) keeps the walked
 *  ground below this line; the ridges are behind it, so they read as distance
 *  rather than as data. */
const HORIZON = 0.34;
const RIDGE_FAR_DROP = 0.02;
const RIDGE_NEAR_DROP = 0.07;
const RIDGE_FAR_AMP = 0.028;
const RIDGE_NEAR_AMP = 0.022;
/** Parallax: the far band crawls, the near one keeps up a little better. */
const RIDGE_FAR_PARALLAX = 0.25;
const RIDGE_NEAR_PARALLAX = 0.45;
/** Ridge shapes are precomputed on resize at this x-resolution, in CSS px, and
 *  the tile is at least this many screens wide so the wrap never repeats inside
 *  one frame. */
const RIDGE_STEP = 3;
const RIDGE_TILES = 2;

/** The fog that straddles the horizon: how far above and below it the band
 *  reaches, in fractions of the plot height, and its peak alpha. */
const FOG_UP = 0.05;
const FOG_DOWN = 0.22;
const FOG_PEAK = 0.6;

/** The light he walks toward: a radial glow sitting on the horizon, to the
 *  right, at this fraction of the width and this radius in widths. */
const GLOW_X = 0.78;
const GLOW_R = 0.6;

/* ------------------------------------------------- carrying his own light --- */
/**
 * THE WALKER MUST READ AS A SHAPE IN THE DARK. From 1876 to 1946 the sky is
 * nearly the same value as the land he is standing on, and a near-black
 * silhouette on near-black ground is nothing at all — which is exactly what the
 * first cut of this build did. (R2e's lit plateau moved the problem's start
 * date: 1757 is a pewter afternoon now and needs almost none of this, which is
 * why its `backlight` came down from 0.55 to 0.15.)
 *
 * So he carries a light. Two mechanisms, both scaled by the palette's own
 * `backlight` (0 in daylight, where the sky already separates him, 1 at the
 * darkest hour):
 *
 *  1. A soft warm pool in the air behind him, centred on his torso and moving
 *     with him — Limbo's trick, and the reason his outline exists at all at 1943.
 *  2. A thin lit edge: the figure drawn once slightly larger in warm light, then
 *     the black silhouette over the top of it.
 *
 * Both are deliberately weak enough to stay a glow rather than a spotlight; the
 * probe in the R1e verification measures the result rather than trusting it.
 */
const BACKLIGHT_R = 2.2;
const BACKLIGHT_ALPHA = 0.17;
const BACKLIGHT_RGB = '255,170,110';
const EDGE_GLOW_SCALE = 1.06;
const EDGE_GLOW_ALPHA = 0.35;
const EDGE_GLOW_RGB = '240,150,80';

/* ------------------------------------------------------------- the dust --- */
/** Two or three specks kicked up at each footfall, drifting back and up and
 *  gone inside half a second. Pooled, so a long walk allocates nothing; skipped
 *  outright under reduced motion. */
const DUST_MAX = 24;
const DUST_PER_STEP = 3;
const DUST_LIFE = 400;
const DUST_RISE = 26;
const DUST_DRIFT = 18;
const DUST_R = 1.1;
const DUST_ALPHA = 0.5;

/** The two stride phases at which a foot is planted, and a test for having
 *  crossed one of them this frame in either direction (the cycle wraps at 2, and
 *  it runs backward when he does). */
const PLANT_PHASE = [0.5, 1.5];

function crossedPlant(a: number, b: number, delta: number, i: number): boolean {
  if (delta === 0) return false;
  const m = PLANT_PHASE[i];
  if (delta > 0) return b >= a ? a < m && b >= m : a < m || b >= m;
  return b <= a ? a > m && b <= m : a > m || b <= m;
}

/* ------------------------------------------------- the flagpole's scale --- */
/**
 * ONE object on the path, and R2l is what made it one. There used to be three —
 * a marker stone at 1600, an unlit street lamp at 1929, and the flagpole — drawn
 * as flat ink line-art standing on the terrain at their own year.
 *
 * The two decorative ones are GONE. Line-art at twenty-six reference pixels
 * cannot say what it is: the feel-check read the stone as "an inverted-U door"
 * and the lamp as "a lamp-like icon", which is a reader spending attention on
 * identifying furniture in a frame whose subject is the ground. A prop nobody
 * can name is a distraction with a rationale attached, and the rationale is not
 * visible on the stage. (R2c had already removed a fourth for a related reason —
 * a banded milestone at 1967 that commented on the line's own height.)
 *
 * What survives is this table of numbers, because the FLAGPOLE is sized off it
 * (MAST_H, the halyard, the gap it stands behind the walker at) and the flagpole
 * is not a prop: it has state, it takes input, and it is the one object in the
 * piece the reader touches. The names keep the PROP_ prefix rather than being
 * renamed to MAST_: the mast's own constants are derived from these and written
 * as multiples of them, and a rename would make that arithmetic read as arbitrary
 * numbers rather than as a ratio to a common unit.
 *
 * Every number here is AT THE REFERENCE STAGE and gets multiplied by
 * widthScale(w) at the point of drawing — the same factor that sizes the walker
 * (see walkerHeight) and drives the ground speed. R2k had to make them scale:
 * the pole is sized off PROP_H and R2b sized it "so it clearly stands over him",
 * which is a RATIO. Leaving the props at a flat CSS size while the figure grew
 * with the stage would have put a man on a desktop stage a quarter taller than
 * the flagpole he is raising. Nothing about the drawing changes — the flag's
 * bands, its 3:2 fly-to-drop and the chakra rule are all fractions of MAST_H and
 * come along untouched — and on any stage at or below the reference width the
 * factor is exactly 1, so the phone is the phone.
 */
const PROP_H = 26;
const PROP_STROKE = 1.5;
const PROP_ALPHA = 0.7;
/**
 * How far behind the walker the flagpole stands, CSS px at the reference stage.
 * It sits on a stop's own year, which is exactly where the walker is standing
 * when the card for it arrives — without this it would be drawn through him.
 * Behind rather than ahead: he has just reached the pole, and he turns to it.
 */
const PROP_GAP = 22;

/* ---------------------------------------------------------- world track --- */
/** The world-average reference track at the pull-back, where it is the second
 *  subject of the frame. It exists nowhere before the reveal. */
const WORLD_WIDTH = 1.5;
const WORLD_ALPHA = 0.6;

/**
 * The world mark: the one glimpse of the world average before the pull-back
 * draws it, at the world's LAST value if that were in frame — which it is not,
 * by a factor of two, so it is clamped into the top of the stage with a chevron
 * above it that says the true value is further up still.
 *
 * R1e restyled it from a chart dash into what the mockups' reveal frame has: a
 * small warm star with a soft glow around it. A dash-and-tick belongs to the
 * chart register, and at the moment it appears the frame is still a landscape.
 */
const WORLD_STAR_R = 22;
const WORLD_STAR_CORE = 2.4;
/** How far down the frame the star is allowed to be pushed when the true value
 *  is off the top, as a fraction of the stage height rather than a fixed pixel
 *  ceiling — a fixed one reads as a different position on a short stage and a
 *  tall one. It is only ever the FLOOR of the mark's travel; what actually
 *  places it on most frames is the dodge around the caption block below. */
const WORLD_MARK_TOP = 0.16;
const WORLD_MARK_LABEL_GAP = 7;
const WORLD_CHEVRON_W = 7;
const WORLD_CHEVRON_H = 4;
const WORLD_CHEVRON_GAP = 7;

/** End labels at the pull-back: gap left of the final point, and lift above it. */
const END_LABEL_GAP = 8;
const END_LABEL_LIFT = 10;

/* ---------------------------------------------------------- the reveal --- */
/**
 * REVEAL PART ONE, on the wall clock: the words, and — behind them, once the
 * first sentence is under way — the apparatus that proves it. R2e moved the
 * figure's look-up and the world mark out of this schedule and onto the press
 * that follows it, because both of them are reactions to something the frame had
 * not shown yet. `prefers-reduced-motion` gets the end state with no schedule at
 * all.
 *
 * R2f's two lines run on their own schedule (LINE_UP_MS) and are LONGER than
 * this one: the chart chrome arrives behind the first sentence rather than after
 * the last. That is the right order — the reader is told the ground is money and
 * the axes come up under the claim while it is still landing — but it does mean
 * REVEAL_TOTAL_MS is now the CHROME's clock and nothing else. What gates the
 * press out of part one is the line sequence, not this. (It is still what the
 * loop waits on to know the chrome fade is over and it may sleep.)
 */
const REVEAL_CHROME_MS = 1200;
const REVEAL_CHROME_FADE_MS = 800;
const REVEAL_TOTAL_MS = REVEAL_CHROME_MS + REVEAL_CHROME_FADE_MS;

/**
 * …and how it comes back off, when a reader walks backward out of the end rather
 * than pressing on into the pull-back. Not the arrival in reverse: the arrival
 * is a choreography with an order to read, and leaving is one gesture. Whatever
 * the mark and the chrome had reached simply fades out together, quickly, while
 * he walks. The look-up unrolls on its own TAU_LOOK, because it is a pose.
 */
const REVEAL_EXIT_MS = 300;

/* ------------------------------------------------------ the two-level zoom --- */
/**
 * R2f splits the camera's one flight into two rides a press apart, and the split
 * is the whole point of the round.
 *
 * R2e answered reveal part one with the full pull-back: one press took the
 * reader from standing on the ground at 2026 to the finished 1600–2026 chart,
 * and the world's mark — the thing part two is about — arrived somewhere in the
 * middle of a frame that was still travelling four centuries. The reader was
 * asked to look at a mark and to let go of the ground in the same second.
 *
 * So there are two levels now:
 *
 *  · LEVEL 1 (`lift`) is VERTICAL ONLY. The x window does not move at all — the
 *    same thirty-eight years he has been walking — and the top of the frame goes
 *    up until the world's last value is in it. He looks up; the teal mark fades
 *    in high overhead; the words naming it arrive once the ride has settled. It
 *    is a neck being craned, not a camera leaving, and because x is untouched the
 *    ground under his feet is still the ground he was standing on.
 *  · LEVEL 2 (`pull`) is the R2e pull-back exactly as it was: the whole series
 *    end to end from a zero baseline, the chart chrome, the land easing out of
 *    brown, the dashed 1947, the world drawn as a track rather than as a mark.
 *
 * Everything in the file that keyed off `pull` still does and still means level
 * two, which is why nothing about the finished frame changed. What level one
 * owns is the ride itself, the look-up, and the mark's arrival — and the mark's
 * FLOOR and its dodge around the caption, which relax with whichever of the two
 * levels has got further (see the render's `settle`), because the mark stops
 * needing to be parked the moment a frame reaches it.
 */
const LIFT_MS = 1600;
/** How long a ride has left once a press has asked it to hurry up. Short enough
 *  to read as "answered at once" and long enough not to be a jump cut. */
const RIDE_SNAP_MS = 260;
/** How far down the plot the world's endpoint sits when the lift has settled, as
 *  a fraction of the plot's height. It is the mark's headroom: at 0.12 the star
 *  is high in the frame and clear of the caption band at 20%, at every stage
 *  height the layout allows. */
const LIFT_MARK_HEAD = 0.12;
/** When in the lift he starts to look up. A beat rather than instantly: the
 *  press moves the camera first and the head follows it. */
const LIFT_LOOK_MS = 250;
/** The mark's fade, as a function of the LIFT rather than of a clock of its own.
 *  A pure function of the ride is a fade that reverses for free when the reader
 *  presses back down out of level one — which R2f's back controls need and a
 *  second wall clock would have had to be told about. */
const LIFT_MARK_FROM = 0.3;
const LIFT_MARK_TO = 0.8;
/**
 * …and reveal part two's words, which wait for the MARK rather than for the
 * ride. Late rather than early: the sentence names a thing that has to be in the
 * frame before it is worth naming.
 *
 * R2l moves the gate off the camera and onto a wall clock hung on the mark, and
 * the reason is that the old gate did not buy what it looked like it bought. The
 * card came up at LIFT_CARD_AT — 0.9 of the ride — and the mark finishes fading
 * at LIFT_MARK_TO, 0.8 of it; but `lift` is smoothstepped, so the last tenth of
 * the ride is about 130ms of wall clock. The words landed on the mark's heels.
 *
 * What the round asked for is that the mark arrives ALONE, is seen to be there,
 * and is then named. R2l bought that with a wall clock — MARK_WORDS_GAP_MS,
 * measured from the frame the mark was substantially up.
 *
 * R2M RETIRES BOTH CLOCKS, and the constants with them. The mark still arrives
 * alone at the top of the crane, and it is now named on the PRESS after it (see
 * endingPress). The gap is however long the reader looks at it, which is the
 * only honest answer to "seen to be there" and the same answer the rest of the
 * ending gives. .walk-card.is-late is kept and still does its job: the card
 * arrives on a fade several times the deck's ordinary one, because it is
 * arriving over a picture rather than over a page turn.
 *
 * The same sentence retires PULL_CARD_AT, which brought the ending screen in at
 * 0.62 of the pull-back's flight. The flight is unchanged; what waits at the end
 * of it is a press.
 */

/** The pull-back is no ground and four centuries of camera, so it is timed as a
 *  camera move rather than as a walk. */
const PULLBACK_MS = 3200;

/* --------------------------------------------------------- chart chrome --- */
/** Everything below exists ONLY from the reveal onward. Before it the stage
 *  carries no axis, no gridline and no unit of any kind. */
const UNIT_LABEL = 'average income per year, 2011 international $';
/** Candidate y gridline steps, ascending. The first that puts 3-6 lines on
 *  screen wins. */
const Y_STEPS = [100, 200, 250, 500, 1000, 2000, 2500, 5000];
/** Strip at the foot of the stage kept clear of terrain for the pull-back's
 *  year labels. Reserved on every frame so the ground does not shift when the
 *  axis arrives. */
const AXIS_BAND = 20;
/** Minor ticks at the pull-back, one per decade, under the labelled majors. */
const DECADE_TICK = 4;
const AXIS_ALPHA = 0.75;
/** R2m: air left around the ENDING'S PROSE where a hairline fades out for it,
 *  and how many px the fade takes to do it. The clearance is generous because
 *  the band is a box and the words inside it are ragged: a line that stopped at
 *  the box's own edge would still be touching the longest row of type in it.
 *  The fade is longer than the clearance on purpose — the point is that nobody
 *  can see where the gridline goes, which is what makes it a knockout rather
 *  than a gap. */
const TEXT_CLEAR = 12;
const TEXT_FADE = 34;
/** Air left around the sign-off lockup where a gridline breaks for it. */
const SIGN_CLEAR = 14;

/**
 * What the landmass becomes at the pull-back.
 *
 * Through the walk the land is a near-black silhouette and the rim light on its
 * top edge is the only thing drawn: that is a landscape, and it is right. The
 * pull-back is not a landscape — it is the chart the whole piece has been
 * withholding — and at that scale a bright saffron edge on a black mass reads as
 * a horizon rather than as a series. So the fill eases to a light warm tint as
 * the camera goes, and the rim becomes a LINE OVER AN AREA, which is the house
 * chart grammar everywhere else on this site.
 *
 * The tint is a compromise and the trade is worth stating. Two things are wanted
 * of it: enough contrast under the rim that the line reads as a line, and enough
 * separation from the paper sky above that the area reads as an area. They pull
 * opposite ways — the sky at 2022 is a warm cream at relative luminance 0.77 and
 * the rim is a mid-orange at 0.23, so a fill bright enough to give the rim 3:1
 * would have to be brighter than the sky it sits under. This value takes the
 * separation from the sky (which is what makes it an area at all) and gives the
 * rim about 2.3:1, which on a 1.6px stroked edge over a flat fill is a clearly
 * drawn line. The walker, in the palette's own ink, has better than 10:1 on it.
 */
const PULL_LAND: RGB = [224, 203, 164];

/**
 * The one year the finished chart names on its own. A dashed hairline from the
 * top of the plot down to the ground at 1947, with a small label at its head,
 * arriving and leaving with the rest of the chrome.
 *
 * It is the only vertical rule in the piece and it earns that by being the year
 * the walk stopped at: a reader looking at four centuries at one scale should be
 * able to find the moment they raised the flag without counting decades along
 * the axis.
 */
const MARK_YEAR = 1947;
const MARK_DASH: [number, number] = [3, 4];
/** Below the unit label's own line, not beside it: at a phone's width the unit
 *  runs most of the way across the top and a year set on the same baseline lands
 *  a few pixels off the end of it. */
const MARK_LABEL_TOP = 30;

/* ---------------------------------------------------------- the light --- */
/**
 * THE LIGHT ARC. One sky, lit by the year.
 *
 * There is no theme fork on this stage. The colour of every pixel the canvas
 * paints comes out of this table, interpolated channel by channel from the
 * walker's CURRENT YEAR — which is what makes the light a pure function of where
 * he is standing, so walking backward rewinds the dawn with no state to unwind
 * and no second code path to keep honest.
 *
 * THE ARC IS A PLATEAU AND THEN A FALL, and R2e is what made it one. R2c had
 * built a V — 1600 lit as brightly as 1966 and every year after it darker than
 * the last, night by Plassey — and the feel-check killed the middle of it: two
 * hundred years of the walk were too dark to read the ground in, and a reader
 * held forward through them was holding forward through a blackout.
 *
 * What replaced it keeps the editorial claim and drops the dimmer. The claim was
 * always that the ground at 1600 and the ground at the Green Revolution stand at
 * the same height and should be lit the same amount; the mistake was making
 * everything BETWEEN them the descent. So:
 *
 *  · 1600 opens at the brightness of the ending — a warm golden late afternoon,
 *    at roughly the 2026 paper sky's luminance.
 *  · THE BRIGHTNESS HOLDS from 1600 to 1757. What changes across the Mughal
 *    century and a half is TEMPERATURE: the amber drains out of the sky, the
 *    ridges lose their warmth, and by Plassey the light is flat and pewter. Lit,
 *    and going grey. An empire ending in daylight is a harder picture than an
 *    empire ending at night, and it is also the true one — nothing about 1757
 *    was dark to the people standing in it.
 *  · THE FALL STARTS AT 1857. The rising is the first twilight frame, and from
 *    there the sky goes down to the famine floor by 1876 and holds flat to 1929,
 *    so the whole Raj stretch stays low.
 *  · THE FLOOR IS MOONLIT, not black. 1943 is still the darkest frame in the
 *    piece and must stay so — but ridge and land forms separate, and a caption
 *    over Bengal is comfortable rather than survivable.
 *  · Then, at the stroke of the midnight hour, a band of first light on the
 *    horizon; then a morning that takes decades and does not finish until the
 *    frame is simply TSOI paper in daylight. The morning rows are R2c's,
 *    untouched.
 *
 * The measured contract is therefore: mean stage luminance is a PLATEAU from
 * 1600 to 1757 and falls monotonically from 1757 to 1876. There is no longer any
 * claim about 1600 being non-increasing all the way down, because it is not.
 *
 * Rules for editing this table:
 *  - Every row carries every field. A gap is not "inherit", it is a compile
 *    error, because interpolation needs both ends of every channel.
 *  - Rows are in year order and the lerp between two of them is linear. If a
 *    change needs to happen faster than the neighbouring rows allow, add a row.
 *  - `backlight` is not a colour: it is how much of his own light the walker has
 *    to carry to still read as a shape (see BACKLIGHT_ALPHA). Dark rows need it,
 *    daylight rows must not have it or he glows in broad daylight. A BRIGHT row
 *    must not have much of it either — a near-black figure against a bright sky
 *    needs no rim help, and the whole lit plateau carries near-zero (0.02 at
 *    1600, still only 0.15 at Plassey) for exactly that reason. It is the fall
 *    after 1857 that buys it back.
 *  - `ink` is the walker, the props and everything else the stage draws solid,
 *    and it is THE DARKEST THING IN THE FRAME in every row. On the lit plateau
 *    that no longer means near-black: a #060505 figure on a golden afternoon
 *    reads as a hole punched in the picture, so the plateau's ink is a warm
 *    charcoal (#241f18) which is still far darker than its own land (#4a3624).
 *    Whatever a row does, ink must stay under `land`.
 *  - There is no `text` column any more. It used to be a hand-authored crossfade
 *    from cream to ink and it was WRONG BY CONSTRUCTION: a per-channel lerp
 *    between the two passes through mid-grey at exactly the years the sky is
 *    also mid-grey, which is why the 1966 caption was barely visible. The
 *    overlay's ink is resolved per frame against the background each piece of it
 *    actually sits on — see resolveInk(). `textA` and `dimA` survive as the
 *    alphas, because how LOUD the overlay is remains an editorial decision.
 */
interface LightStop {
  year: number;
  skyTop: string;
  skyMid: string;
  skyLow: string;
  glow: string;
  glowA: number;
  ridgeFar: string;
  ridgeNear: string;
  land: string;
  rim: string;
  rimA: number;
  rimBlur: number;
  fog: string;
  vig: number;
  /** The walker and the flagpole: the darkest thing in the frame, always. */
  ink: string;
  textA: number;
  dimA: number;
  backlight: number;
}

const LIGHT_STOPS: LightStop[] = [
  // 1600 — golden late afternoon, and it is as bright as the 2026 paper sky the
  // piece ends on. Mauve overhead, warm amber through the middle, a low sun
  // burning gold along the horizon he is walking toward, and the hills he is
  // crossing lit rather than silhouetted. Matched in luminance to the ending and
  // matched to it in nothing else, so the two moments the ground stands at the
  // same height are lit the same amount and coloured completely differently.
  //
  // The vignette is at its shallowest here (0.10) and the backlight at nothing
  // (0.02): a warm-charcoal figure against a bright sky is already a shape, and
  // any rim help on this row reads as him glowing in daylight.
  {
    year: 1600,
    skyTop: '#8e7aa6', skyMid: '#e8a866', skyLow: '#ffcf7a',
    glow: '255,215,150', glowA: 0.5,
    ridgeFar: '#dcbb9e', ridgeNear: '#b3907c', land: '#4a3624',
    rim: '#f0a050', rimA: 0.95, rimBlur: 7,
    fog: '#e8a866', vig: 0.1, ink: '#241f18',
    textA: 0.85, dimA: 0.48, backlight: 0.02,
  },
  // 1650 — not a historical beat: an intermediate row, and it survives the
  // re-light for the reason it was added. A straight line from 1600 to 1757
  // spends its first fifty years barely moving and then falls off a shelf; with
  // this row the temperature drains evenly across the whole Mughal century while
  // the brightness stays where it is.
  {
    year: 1650,
    skyTop: '#8c81a0', skyMid: '#dcae7e', skyLow: '#f0c07a',
    glow: '252,210,150', glowA: 0.42,
    ridgeFar: '#cfae94', ridgeNear: '#a5846f', land: '#43311f',
    rim: '#eda04e', rimA: 0.94, rimBlur: 7,
    fog: '#dcae7e', vig: 0.12, ink: '#241f18',
    textA: 0.85, dimA: 0.48, backlight: 0.04,
  },
  // 1707 — Aurangzeb dies and most of the amber has gone with him. Still a lit
  // frame: what has left it is the colour, not the light.
  {
    year: 1707,
    skyTop: '#8a8496', skyMid: '#c9ae94', skyLow: '#e6bd83',
    glow: '244,205,155', glowA: 0.34,
    ridgeFar: '#bfa58c', ridgeNear: '#977c68', land: '#3c2f20',
    rim: '#e09a4c', rimA: 0.92, rimBlur: 6,
    fog: '#c9ae94', vig: 0.14, ink: '#211d18',
    textA: 0.84, dimA: 0.46, backlight: 0.08,
  },
  // 1757 — Plassey. The end of the plateau, and the flattest light in the piece:
  // pewter overhead, the horizon down to a dull ochre, no warmth left anywhere.
  // Not night. The empire ends in daylight and the sky simply stops meaning
  // anything.
  {
    year: 1757,
    skyTop: '#7d8292', skyMid: '#adaaa4', skyLow: '#c9b391',
    glow: '230,200,160', glowA: 0.24,
    ridgeFar: '#a89e90', ridgeNear: '#837a6c', land: '#2e2820',
    rim: '#d08a44', rimA: 0.88, rimBlur: 5,
    fog: '#adaaa4', vig: 0.18, ink: '#1e1b18',
    textA: 0.82, dimA: 0.44, backlight: 0.15,
  },
  // 1857 — the Mutiny, and the first twilight frame. The fall begins here: a
  // deep blue overhead with the last of the day burning out low and to the
  // right, which is the one row in the table where the sky is visibly GOING
  // rather than being somewhere.
  {
    year: 1857,
    skyTop: '#3a3c50', skyMid: '#565064', skyLow: '#7a5a48',
    glow: '235,175,120', glowA: 0.18,
    ridgeFar: '#4a4656', ridgeNear: '#332f3e', land: '#14100c',
    rim: '#c07a40', rimA: 0.82, rimBlur: 4,
    fog: '#565064', vig: 0.28, ink: '#100e12',
    textA: 0.8, dimA: 0.44, backlight: 0.45,
  },
  // 1876 — the Great Famine, and the floor. MOONLIT, not moonless: a blue-grey
  // night with enough separation left in it that the two ridge bands and the
  // landmass are three distinguishable things. R2c had this row at #090b10 and
  // the feel-check called the whole stretch illegible; the floor came up here
  // and the walk kept its darkest hour at 1943.
  {
    year: 1876,
    skyTop: '#151a26', skyMid: '#1d2230', skyLow: '#2a2836',
    glow: '200,150,110', glowA: 0.08,
    ridgeFar: '#252a38', ridgeNear: '#181c28', land: '#0b0d12',
    rim: '#b06838', rimA: 0.75, rimBlur: 3,
    fog: '#1d2230', vig: 0.36, ink: '#050507',
    textA: 0.78, dimA: 0.4, backlight: 0.75,
  },
  // 1929 — held at the famine floor, so the whole Raj stretch stays low rather
  // than brightening back up across the decades between the famines.
  {
    year: 1929,
    skyTop: '#151a26', skyMid: '#1d2230', skyLow: '#2a2836',
    glow: '200,150,110', glowA: 0.08,
    ridgeFar: '#252a38', ridgeNear: '#181c28', land: '#0b0d12',
    rim: '#b06838', rimA: 0.75, rimBlur: 3,
    fog: '#1d2230', vig: 0.36, ink: '#050507',
    textA: 0.78, dimA: 0.4, backlight: 0.75,
  },
  // 1943 — Bengal. THE DARKEST FRAME OF THE WALK, and it must stay that: a
  // shade under the 1876 floor everywhere, with the rim guttering down to
  // embers. Lifted with the rest of the floor, so sky and land are no longer one
  // mass — but nothing in the piece may be printed darker than this row.
  {
    year: 1943,
    skyTop: '#0f131d', skyMid: '#141824', skyLow: '#1b1c28',
    glow: '180,125,95', glowA: 0.06,
    ridgeFar: '#1c202c', ridgeNear: '#12151f', land: '#080a10',
    rim: '#9a5530', rimA: 0.62, rimBlur: 2,
    fog: '#141824', vig: 0.42, ink: '#040406',
    textA: 0.74, dimA: 0.36, backlight: 0.9,
  },
  // 1946 — darkest still. The dawn band is starting to exist behind the ridge,
  // at nothing; DAWN_BAND below owns its own ramp.
  {
    year: 1946,
    skyTop: '#0f131d', skyMid: '#141824', skyLow: '#1b1c28',
    glow: '180,125,95', glowA: 0.06,
    ridgeFar: '#1c202c', ridgeNear: '#12151f', land: '#080a10',
    rim: '#9a5530', rimA: 0.62, rimBlur: 2,
    fog: '#141824', vig: 0.42, ink: '#040406',
    textA: 0.74, dimA: 0.36, backlight: 0.9,
  },
  // 1947 — midnight, first light. Night overhead, dawn on the horizon.
  {
    year: 1947,
    skyTop: '#101423', skyMid: '#1a1a2c', skyLow: '#42302a',
    glow: '255,150,70', glowA: 0.4,
    ridgeFar: '#282332', ridgeNear: '#181522', land: '#080810',
    rim: '#e08a4a', rimA: 0.95, rimBlur: 7,
    fog: '#1a1a2c', vig: 0.36, ink: '#030304',
    textA: 0.85, dimA: 0.45, backlight: 0.6,
  },
  // 1975 — a morning that takes decades: grey-pink haze, the sun up but
  // muffled, the land still a silhouette.
  {
    year: 1975,
    skyTop: '#8b8fa2', skyMid: '#b3a49a', skyLow: '#d9b489',
    glow: '255,235,200', glowA: 0.4,
    ridgeFar: '#9d94a0', ridgeNear: '#7d7484', land: '#2e2921',
    rim: '#cf6820', rimA: 0.9, rimBlur: 4,
    fog: '#b3a49a', vig: 0.16, ink: '#25211a',
    textA: 0.82, dimA: 0.45, backlight: 0,
  },
  // 2005 — day. (1991 is deliberately not a row: the haze burning off between
  // 1975 and 2005 is exactly the straight line between these two.)
  {
    year: 2005,
    skyTop: '#cdd6de', skyMid: '#e4ddc9', skyLow: '#f0dcb2',
    glow: '255,245,220', glowA: 0.55,
    ridgeFar: '#c2bba6', ridgeNear: '#a89e85', land: '#332d20',
    rim: '#cf6820', rimA: 0.95, rimBlur: 4,
    fog: '#e4ddc9', vig: 0.12, ink: '#25211a',
    textA: 0.85, dimA: 0.48, backlight: 0,
  },
  // 2022 — full light, and the sky is TSOI paper. The reveal's chart chrome
  // fades in over a frame that is already the page it lives on.
  //
  // This is the LAST row, and paletteAt clamps off the end of the table, so the
  // daylight holds flat across the estimated tail (2023-2026) with no duplicate
  // row to keep in step. If the series ever ends before 2022 the table would
  // need trimming; a series that ends after it needs nothing.
  {
    year: 2022,
    skyTop: '#f2ecdc', skyMid: '#eee2c8', skyLow: '#e6d3ab',
    glow: '255,250,235', glowA: 0.6,
    ridgeFar: '#d3c9ae', ridgeNear: '#b9ad8e', land: '#352e21',
    rim: '#cf6820', rimA: 0.95, rimBlur: 3,
    fog: '#eee2c8', vig: 0.1, ink: '#25211a',
    textA: 0.85, dimA: 0.48, backlight: 0,
  },
];

/**
 * The 1947 dawn band: a low strip of light hugging the horizon, under the sky
 * and over nothing else.
 *
 * It is the one part of the light that is NOT a column of the stop table. Its
 * whole life is ten years wide — nothing before 1945, full at 1947, gone by 1955
 * as the morning takes over — and giving it a column would have meant three
 * extra rows in LIGHT_STOPS carrying eighteen interpolated fields each just to
 * hold the shape of one alpha. Still a pure function of the year, so it rewinds
 * with everything else.
 */
const DAWN_BAND_RGB = '230,120,50';
const DAWN_BAND_FROM = 1945;
const DAWN_BAND_PEAK = 1947;
const DAWN_BAND_TO = 1955;
const DAWN_BAND_UP = 0.16;
const DAWN_BAND_DOWN = 0.06;

/** Idle: once everything has converged and nothing has happened for this long,
 *  the rAF loop stops until the next event. */
const IDLE_MS = 300;

/** Convergence epsilons, in the units of each camera parameter. */
const EPS_YEAR = 0.02;
const EPS_VALUE = 0.5;
/** …and for the gait and look-up eases, in amplitude units (1 = full). 0.01 of
 *  a stride is a fraction of a pixel: he has finished settling into the stand
 *  pose long before the loop admits it. */
const EPS_SWING = 0.01;
/** …and for the smoothed screen slope the pose machine reads, in slope units.
 *  A hundredth of a slope is nothing any mode threshold can see. */
const EPS_SLOPE = 0.01;

/* ----------------------------------------------------------------- data --- */

type Point = [number, number];

interface PanelSeries {
  id: string;
  entity: string;
  points: Point[];
  /** Present only on a series with an estimated tail. Snake case because it is
   *  the JSON's own key, not this module's. */
  estimated_from?: number;
}

interface PanelData {
  series: PanelSeries[];
}

/* --------------------------------------------------------------- tokens --- */

type RGB = [number, number, number];

/**
 * What is left of the theme plumbing.
 *
 * R1e took the stage out of the theme system: it is a film frame with its own
 * light (LIGHT_STOPS) and it must look identical to two readers sitting side by
 * side with opposite toggles. So there is no surface, no ink, no grid and no
 * line token read here any more — every colour on the canvas comes from the
 * palette, and only two things are still read off the page:
 *
 *  - the mono face, because the reveal's figures are numbers and numbers are set
 *    in the house mono wherever they appear on this site;
 *  - the world track's teal, PINNED to the light-theme value rather than read
 *    live, because it is drawn on a paper-coloured daylight sky whichever theme the
 *    article around it is in.
 */
interface Theme {
  mono: string;
}

/** --tsoi-color-chart-2 at its light-theme value. The pull-back's sky is TSOI
 *  paper by construction, so the world track wants the ink-on-paper teal even
 *  when the article around the stage is in dark theme. R2e gives the world MARK
 *  the same value — it is the same series, glimpsed before the track draws it —
 *  which is why the channels are pulled out beside it: the star's glow is an
 *  alpha ramp and needs the numbers. */
const WORLD_COLOUR = '#2A8A84';
const WORLD_RGB: RGB = [42, 138, 132];

/**
 * Parse a colour into rgb components. Hex by construction here (the light table
 * is authored in hex, the way the mockups are), but rgb()/rgba() is accepted
 * too. Anything else returns null, which every caller reads as "no colour, draw
 * nothing" — a missing value must not become a black wash across the frame.
 */
function toRgb(css: string): RGB | null {
  const v = css.trim();
  if (v.startsWith('#')) {
    const hex = v.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const n = parseInt(hex.slice(0, 3), 16);
      if (Number.isNaN(n)) return null;
      const r = (n >> 8) & 0xf;
      const g = (n >> 4) & 0xf;
      const b = n & 0xf;
      return [r * 17, g * 17, b * 17];
    }
    if (hex.length === 6 || hex.length === 8) {
      const n = parseInt(hex.slice(0, 6), 16);
      if (Number.isNaN(n)) return null;
      return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
    }
    return null;
  }
  const nums = v.match(/-?\d+(?:\.\d+)?/g);
  if (nums && nums.length >= 3) return [+nums[0], +nums[1], +nums[2]];
  return null;
}

function rgba(c: RGB, a: number): string {
  return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${a})`;
}

function rgbCss(c: RGB): string {
  return `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Weighted brightness on the 0-255 scale. Near enough for deciding how lit a
 *  flag is; NOT the thing to reach for when a contrast ratio is wanted. */
function lum(c: RGB): number {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** One channel, sRGB → linear. */
function toLinear(v: number): number {
  const x = clamp(v, 0, 255) / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance, 0-1. This is the one the ink resolution uses, and
 *  it has to be the real thing rather than the weighted average above: the
 *  whole question being asked is "can a reader see this glyph", and that
 *  question has an answer with a standard behind it. */
function relLum(c: RGB): number {
  return 0.2126 * toLinear(c[0]) + 0.7152 * toLinear(c[1]) + 0.0722 * toLinear(c[2]);
}

/** WCAG contrast ratio between two relative luminances. */
function contrastOf(a: number, b: number): number {
  return a >= b ? (a + 0.05) / (b + 0.05) : (b + 0.05) / (a + 0.05);
}

function readTheme(el: Element): Theme {
  const s = getComputedStyle(el);
  return { mono: s.getPropertyValue('--tsoi-font-mono').trim() || 'monospace' };
}

/* -------------------------------------------------------------- helpers --- */

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Hermite ease, clamped. Flat at both ends, so the pull-back leaves the walk
 *  and arrives at the reveal frame without a corner at either boundary. */
function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/** One step of exponential smoothing toward `target` over `dt` ms. */
function ease(current: number, target: number, dt: number, tau: number): number {
  if (tau <= 0) return target;
  return current + (target - current) * (1 - Math.exp(-dt / tau));
}

/* ------------------------------------------------------------- palettes --- */
/**
 * LIGHT_STOPS, parsed once at module init and then interpolated per frame.
 *
 * The hex→rgb parse happens exactly once for the life of the page; what runs
 * sixty times a second is a handful of lerps between two adjacent rows. There is
 * no state in here at all: paletteAt(1757) is the same palette on the way out as
 * it was on the way in, which is the whole reason the light rewinds.
 */
interface Palette {
  skyTop: RGB;
  skyMid: RGB;
  skyLow: RGB;
  glow: RGB;
  glowA: number;
  ridgeFar: RGB;
  ridgeNear: RGB;
  land: RGB;
  rim: RGB;
  rimA: number;
  rimBlur: number;
  fog: RGB;
  vig: number;
  ink: RGB;
  textA: number;
  dimA: number;
  backlight: number;
  /** Not a column: the 1947 dawn band's own ramp, folded in here so the render
   *  reads one object per frame. */
  dawnA: number;
  /** Not columns either, and this is the R2c fix, widened by R2d. All three are
   *  RESOLVED per frame by resolveInk() against the thing the ink in question is
   *  actually drawn over: `text` against the sky behind the caption block,
   *  `stampText` against the sky at the TOP of the frame where R2d's date stamp
   *  sits, and `landText` against the landmass the bar and `start over` stand
   *  on. Two sky inks rather than one because the sky is a vertical gradient
   *  with a horizon glow in it: at 1600 and across the 1947 dawn the top of the
   *  frame and the caption band are far enough apart to want different answers,
   *  and resolving the stamp against the caption's sky is the same class of bug
   *  as R2c's caption resolved against nothing at all. */
  text: RGB;
  stampText: RGB;
  landText: RGB;
  /** …and how far each of them had to be pushed toward its extreme and toward
   *  opaque to get there, 0-1. The alphas ride these: an ink that had to reach
   *  for white also had to stop being translucent. */
  textPush: number;
  stampPush: number;
  landPush: number;
  /** The stamp's DIM ink is resolved a second time, at the dim alpha, and it is
   *  the only dim ink in the file that is. The era ribbon is the one piece of
   *  10px type on this stage that is read rather than glanced at, and a dim ink
   *  is a translucent one — at the piece's authored dim alpha it sits around
   *  2.4:1 on the famine floor and 2.8:1 on the 1600 afternoon, which is a label
   *  nobody can read.
   *  Resolving at the dim alpha lets the bisection raise it only as far as the
   *  background actually demands, so on a comfortable sky it is still visibly
   *  quieter than the year above it and on a hard one it stops being decorative.
   *
   *  BOTH halves come out of that second resolution, and they have to. The other
   *  three dim inks in this file are the full ink's COLOUR published at the dim
   *  ALPHA, which is the R2c shorthand: it holds while the push is zero and
   *  quietly under-delivers when it is not, because a colour that was pushed to
   *  clear the target at 0.85 is not the colour that clears it at 0.48. Probed
   *  at 2026: the shorthand gave the era ribbon 4.48:1 where its own resolution
   *  gives 4.85:1.
   *
   *  R3 PAYS OFF THE REST OF THAT DEBT WITHOUT A FOURTH BISECTION. The three
   *  remaining shorthand dims — the caption's, the land's, and the ✕'s borrowed
   *  copy of the caption's — are no longer CONSUMED by anything that has to be
   *  read. Each element that used to take a dim ink now takes the nearest ink
   *  that was actually resolved against ITS OWN background: the card sub-lines
   *  and the two hints take the caption's full `text` (same sky, guaranteed at
   *  INK_TARGET); `start over` and the download control take the land's full
   *  `landText`; the ✕ and the ⛶ take `stampDimText`, which is resolved in the
   *  same corner of the same sky they sit in. --walk-text-dim and
   *  --walk-land-text-dim are still published, because the fallbacks in the
   *  stylesheet and any future glanced-at furniture want them, but nothing the
   *  round measures depends on them any more. */
  stampDimText: RGB;
  stampDimPush: number;
  /** How ambiguous the sky is AT THE STAMP'S OWN BOX — the same number `inkOn`
   *  already computes for the caption, kept rather than discarded.
   *
   *  R3. The overlay's halo is computed from the CAPTION's ambiguity and pushed
   *  out to the whole of .walk-ui, and for most of the walk that is right,
   *  because the two boxes cross over together. They do not at the two stamp
   *  dips: the top of the frame passes through the crossover luminance about
   *  fifteen years before the caption band does on the way down (~1786) and
   *  about eight years after it on the way back up (~1965), because the horizon
   *  glow is worth a quarter of the pixel under the caption and nothing at all
   *  at the top of the frame. Across those two windows the caption's ambiguity
   *  is near zero, so the shared halo is at its WEAKEST exactly where the stamp
   *  needs it most. Giving the stamp its own halo off its own signal is a value
   *  that was already being computed and thrown away — no new bisection. */
  stampAmbiguity: number;
  /** …and the background `text` was resolved against, kept so the halo does not
   *  have to work it out a second time. `stampBg` is the same thing one box up,
   *  kept for R3's second halo. */
  capBg: RGB;
  stampBg: RGB;
  /** How close the caption's background is to the point where neither ink has
   *  much of an advantage, 0-1. The halo rides this: at 1 it is at its
   *  strongest, because that is the moment the glyph edges have nothing else. */
  ambiguity: number;
}

const BLACK: RGB = [0, 0, 0];
const hex = (v: string): RGB => toRgb(v) ?? BLACK;

const LIGHT: Palette[] = LIGHT_STOPS.map((s) => ({
  skyTop: hex(s.skyTop),
  skyMid: hex(s.skyMid),
  skyLow: hex(s.skyLow),
  glow: hex(s.glow),
  glowA: s.glowA,
  ridgeFar: hex(s.ridgeFar),
  ridgeNear: hex(s.ridgeNear),
  land: hex(s.land),
  rim: hex(s.rim),
  rimA: s.rimA,
  rimBlur: s.rimBlur,
  fog: hex(s.fog),
  vig: s.vig,
  ink: hex(s.ink),
  textA: s.textA,
  dimA: s.dimA,
  backlight: s.backlight,
  dawnA: 0,
  text: hex(s.ink),
  stampText: hex(s.ink),
  landText: hex(s.ink),
  textPush: 0,
  stampPush: 0,
  landPush: 0,
  stampDimText: hex(s.ink),
  stampDimPush: 0,
  stampAmbiguity: 0,
  capBg: hex(s.skyMid),
  stampBg: hex(s.skyTop),
  ambiguity: 0,
}));

const DAWN_RGB: RGB = hex(DAWN_BAND_RGB);

/**
 * The last row before first light, and the palette it holds — the darkest frame
 * in the piece. The 1947 gate blends the light back to EXACTLY this while the
 * flag is down, so arriving at the pole is true midnight and the dawn is
 * something the reader raises rather than something that happens to them.
 * Looked up rather than indexed by hand so a new row cannot silently point it at
 * the wrong night.
 */
const DAWN_NIGHT_YEAR = 1946;
const NIGHT_PALETTE = LIGHT[LIGHT_STOPS.findIndex((s) => s.year === DAWN_NIGHT_YEAR)];

/** The dawn band's alpha at a year: nothing, up to full at 1947, then out again
 *  as the morning takes over. Rounded at both ends so it has no corners. */
function dawnAt(year: number): number {
  if (year <= DAWN_BAND_FROM || year >= DAWN_BAND_TO) return 0;
  return year <= DAWN_BAND_PEAK
    ? smoothstep((year - DAWN_BAND_FROM) / (DAWN_BAND_PEAK - DAWN_BAND_FROM))
    : 1 - smoothstep((year - DAWN_BAND_PEAK) / (DAWN_BAND_TO - DAWN_BAND_PEAK));
}

function mixPalette(a: Palette, b: Palette, t: number, out: Palette): Palette {
  out.skyTop = lerpRgb(a.skyTop, b.skyTop, t);
  out.skyMid = lerpRgb(a.skyMid, b.skyMid, t);
  out.skyLow = lerpRgb(a.skyLow, b.skyLow, t);
  out.glow = lerpRgb(a.glow, b.glow, t);
  out.glowA = lerp(a.glowA, b.glowA, t);
  out.ridgeFar = lerpRgb(a.ridgeFar, b.ridgeFar, t);
  out.ridgeNear = lerpRgb(a.ridgeNear, b.ridgeNear, t);
  out.land = lerpRgb(a.land, b.land, t);
  out.rim = lerpRgb(a.rim, b.rim, t);
  out.rimA = lerp(a.rimA, b.rimA, t);
  out.rimBlur = lerp(a.rimBlur, b.rimBlur, t);
  out.fog = lerpRgb(a.fog, b.fog, t);
  out.vig = lerp(a.vig, b.vig, t);
  out.ink = lerpRgb(a.ink, b.ink, t);
  out.textA = lerp(a.textA, b.textA, t);
  out.dimA = lerp(a.dimA, b.dimA, t);
  out.backlight = lerp(a.backlight, b.backlight, t);
  // The three resolved inks, their three pushes, the two backgrounds and the two
  // ambiguities are deliberately NOT interpolated: they are resolved from the
  // finished palette by resolveInk(), after every blend this function is used
  // for (including the 1947 gate's blend back to night).
  return out;
}

/** The light at a year, written into `out` so the loop allocates nothing. */
function paletteAt(year: number, out: Palette): Palette {
  const last = LIGHT.length - 1;
  if (year <= LIGHT_STOPS[0].year) mixPalette(LIGHT[0], LIGHT[0], 0, out);
  else if (year >= LIGHT_STOPS[last].year) mixPalette(LIGHT[last], LIGHT[last], 0, out);
  else {
    let i = 0;
    while (i < last - 1 && LIGHT_STOPS[i + 1].year <= year) i++;
    const a = LIGHT_STOPS[i];
    const b = LIGHT_STOPS[i + 1];
    const span = b.year - a.year;
    mixPalette(LIGHT[i], LIGHT[i + 1], span > 0 ? clamp((year - a.year) / span, 0, 1) : 0, out);
  }
  out.dawnA = dawnAt(year);
  return out;
}

/**
 * THE BLOOM, and it is one multiplier over a finished palette.
 *
 * R2g opens the film dark: the 1600 frame composed exactly as it always was and
 * then stopped down, so what the reader lands on is the real landscape at a
 * fraction of its own light rather than a different picture. The press that
 * answers the poster runs `k` from INTRO_EXPOSURE up to 1, and at 1 the caller
 * does not call this at all — which is the point of it being a multiplier and
 * not a second table. Nothing downstream knows the intro exists: the inks are
 * resolved against the darkened sky and come out cream, the walker's own ink
 * goes down with the land he is standing on, and all of it crosses back to the
 * authored 1600 row as the bloom arrives.
 *
 * Alphas are deliberately untouched. `dawnA`, `rimA`, `glowA` and the rest are
 * coverages rather than colours, and dimming a coverage is not the same
 * operation as dimming a light: what would come out is a paler frame rather than
 * a darker one.
 *
 * R2i GIVES IT A DIRECTION and does not give it a second pass to do it in. The
 * argument is the bloom's own progress rather than the exposure, and every
 * member gets that progress with a LEAD subtracted — how far down the frame the
 * thing it paints lives — so the sky's top stop finishes its climb first and the
 * walker's ink finishes last. The list below is therefore in vertical order, and
 * that is the only thing keeping it honest.
 *
 * It is a WASH rather than a wipe because the frame is built out of gradients
 * between these members: skyTop, skyMid and skyLow are three points on one
 * vertical gradient and they are at three points of the same exposure curve, so
 * what travels down the frame is a change of slope and never an edge. Nothing
 * here is per-pixel and nothing is per-band geometry; it is the same ten
 * multiplies it always was, with ten different multipliers.
 */
function exposePalette(P: Palette, p: number): void {
  // The exposure a band whose lead is `l` has reached at bloom progress `p`.
  // Every lead lands on 1 at p = 1, which is what makes the bloom's end the same
  // frame for all of them and leaves nothing to unwind.
  const at = (l: number): number =>
    lerp(INTRO_EXPOSURE, 1, smoothstep(clamp((p - l * BLOOM_SWEEP) / (1 - BLOOM_SWEEP), 0, 1)));
  const down = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
  // …and R2j's POSTER CORRECTION over the top of it, which is gone before the
  // bloom is a third done and is exactly nothing for the rest of the page.
  //
  // The bloom is one multiplier per channel, and a multiplier cannot change a
  // HUE: the 1600 row is a warm dusk, so a seventh of it is a warm dusk in the
  // dark — and because the horizon glow's own ALPHA is a coverage and is
  // deliberately never dimmed (see the note above), that warm band is the only
  // lit thing in a near-black frame and takes the whole sky with it. The device
  // feel-check read the result as "grainy orange", which is what it is.
  //
  // So on the poster the sky is pulled toward its own grey and the ember is
  // pulled DOWN as well as toward grey, until what is left is a dark sky with a
  // faint warm low on the horizon. Both terms are multiplied by `murk`, which is
  // 1 on the poster and 0 by POSTER_CLEAR of the bloom — so the frame the bloom
  // lands on is the authored 1600 row to the last digit, and this function is
  // still only ever called while `exposure < 1`.
  const murk = 1 - smoothstep(clamp(p / POSTER_CLEAR, 0, 1));
  const grey = (c: RGB, s: number): RGB => {
    if (s <= 0) return c;
    const l = lum(c);
    return [lerp(c[0], l, s), lerp(c[1], l, s), lerp(c[2], l, s)];
  };
  const skyS = POSTER_DESAT * murk;
  P.skyTop = grey(down(P.skyTop, at(0)), skyS);
  P.skyMid = grey(down(P.skyMid, at(0.28)), skyS);
  P.skyLow = grey(down(P.skyLow, at(0.5)), skyS);
  P.glow = grey(down(P.glow, at(0.55) * lerp(1, POSTER_EMBER, murk)), POSTER_EMBER_DESAT * murk);
  P.ridgeFar = grey(down(P.ridgeFar, at(0.6)), skyS);
  P.fog = grey(down(P.fog, at(0.66)), skyS);
  P.ridgeNear = grey(down(P.ridgeNear, at(0.76)), skyS);
  P.rim = down(P.rim, at(0.84));
  P.land = down(P.land, at(0.9));
  P.ink = down(P.ink, at(1));
}

/** A palette object to write into. */
function blankPalette(): Palette {
  const p = mixPalette(LIGHT[0], LIGHT[0], 0, {} as Palette);
  p.text = LIGHT[0].text;
  p.stampText = LIGHT[0].stampText;
  p.landText = LIGHT[0].landText;
  p.textPush = 0;
  p.stampPush = 0;
  p.landPush = 0;
  p.stampDimText = LIGHT[0].stampDimText;
  p.stampDimPush = 0;
  p.stampAmbiguity = 0;
  p.capBg = LIGHT[0].capBg;
  p.stampBg = LIGHT[0].stampBg;
  p.ambiguity = 0;
  return p;
}

/* -------------------------------------------------------- the overlay ink --- */
/**
 * WHAT COLOUR THE WORDS ARE, and why it is computed rather than authored.
 *
 * Until R2c the light table carried a `text` column that crossed, channel by
 * channel, from a cream at 1947 to an ink at 1975. That is wrong by
 * construction and the feel-check found it exactly where the arithmetic says it
 * would: at 1966 the interpolation lands around rgb(105,96,85) and the sky it is
 * written on is around rgb(105,100,110). The caption crossfades THROUGH the
 * sky's own tone at precisely the years the sky is passing through the same
 * tone, so for a decade of the walk the words are a rumour. Nudging the row
 * would have moved the dead spot rather than removed it.
 *
 * So the ink is a function of the BACKGROUND now, resolved every frame:
 *
 *  1. Work out what the words are actually sitting on. The captions float in the
 *     sky, so their background is the sky gradient sampled at the caption
 *     block's own screen band; the year, the era, the whispers and the two
 *     control chevrons stand at the foot of the frame on the LANDMASS, so
 *     theirs is the land fill (including the lightening the pull-back gives it).
 *  2. Take the two inks the piece owns — a warm cream and the palette's own ink
 *     — and push each of them toward its extreme (white, black) by exactly as
 *     much as it takes to clear INK_TARGET against that background, and no
 *     further. On a comfortable background neither moves at all and the authored
 *     colours are what is drawn; only in the narrow band where the background is
 *     awkward does either reach for white or black, and then only as far as it
 *     has to.
 *  3. Pick the one with the better contrast, crossfading between them over a
 *     NARROW window of background luminance around the crossover — narrow
 *     because the mid-point of that crossfade is the one genuinely unreadable
 *     colour, and the piece should spend as few years there as possible.
 *  4. Report how close to the crossover we are, so the halo can be at its
 *     strongest exactly there. The shadow carries the few frames the ink cannot.
 *
 * There is a mathematical ceiling here worth writing down, because it is the
 * reason step 2 exists: for ANY pair of inks the best contrast available against
 * the worst-case background is sqrt((Lmax + 0.05) / (Lmin + 0.05)), which for a
 * true black-and-white pair is 4.58:1 and for a cream-and-charcoal pair is under
 * 4.3:1. Guaranteeing 4.5:1 at every background therefore requires reaching all
 * the way to white and black when the background demands it, which is what the
 * push in step 2 does — and it is also why the window in step 3 must stay small
 * rather than being widened for smoothness.
 */
const OVERLAY_CREAM: RGB = [244, 236, 222];
const OVERLAY_WHITE: RGB = [255, 255, 255];
const OVERLAY_CREAM_L = relLum(OVERLAY_CREAM);
/** The contrast every resolved ink aims for. A little over the 4.5:1 the piece
 *  is held to, so rounding never decides it. */
const INK_TARGET = 4.85;
/**
 * Half-width of the crossfade between the light ink and the dark one, in
 * relative luminance.
 *
 * DELIBERATELY TINY. The mid-point of this crossfade is the one genuinely
 * unreadable colour on the stage — a mid-grey on a mid-grey sky — and the only
 * thing that limits how long a reader spends looking at it is how narrow this
 * is. 0.0025 is about half a year of the 1960s sky, which is a fifth of a second
 * of held walking; the caption's own 300ms colour transition is longer than the
 * window is, so what a reader actually sees is one dissolve rather than a step.
 * The halo is at its strongest across exactly this band (see `ambiguity`), which
 * is what carries the glyph edges through it.
 */
const INK_MIX_WINDOW = 0.0025;

/**
 * The sky's colour at a point on the stage, in stage px.
 *
 * This is drawSky's three layers evaluated at one pixel instead of painted
 * across a frame: the vertical gradient, then the 1947 dawn band, then the
 * horizon glow. All three are repeated here rather than shared with drawSky
 * because that function builds gradient objects and this one wants a colour —
 * if either set of stops moves, both move, and there is no third place they are
 * written down.
 *
 * The glow is not a detail that can be skipped. At 1600 and at 1947 it is worth
 * a quarter of the pixel under the caption, which is the difference between an
 * ink that reads and an ink that lands on the crossover; a model of the
 * background that is not the background is how the bug this file is fixing got
 * in.
 *
 * …and R2d adds a FOURTH layer that is not drawSky's at all: the VIGNETTE.
 * It is a CSS overlay (.walk-vignette, driven by --walk-vig) and it sits
 * BETWEEN the canvas and the words, so it is part of what the overlay is read
 * against however it is painted. Leaving it out was the same class of mistake
 * the paragraph above is about, and it was measured rather than reasoned: at the
 * 1968 crossover, where both inks are already near the pair's mathematical
 * ceiling, the year came out at 4.47:1 against the true composite while the
 * model believed it had cleared 4.85. Modelling it lets the bisection spend the
 * headroom it actually has.
 *
 * The GRAIN is the one layer still left out, and deliberately: it is zero-mean
 * noise in an overlay blend, so across a glyph box it averages to the pixel it
 * is sitting on. It changes the texture of the background, not its luminance.
 *
 * The distance and the fog are deliberately NOT here either. They live on the
 * horizon, and the caption is deliberately kept in the air above it — see
 * HORIZON and FIT_CENTRE. If a future round moves the caption block down onto
 * the ridges, this function is what has to grow.
 */
/** The vignette's geometry, mirroring .walk-vignette's radial-gradient in
 *  independence.astro: an ellipse of these half-extents centred here, clear to
 *  VIG_CLEAR of the way out and at full --walk-vig at its edge. If the CSS
 *  moves, these move. */
const VIG_RX = 0.78;
const VIG_RY = 0.82;
const VIG_CX = 0.5;
const VIG_CY = 0.46;
const VIG_CLEAR = 0.4;
const VIG_RGB: RGB = [6, 4, 2];

function skyAtPoint(P: Palette, x: number, y: number, w: number, h: number, plotH: number): RGB {
  if (w <= 0 || h <= 0) return P.skyMid;
  const f = clamp(y / h, 0, 1);
  let c: RGB =
    f <= 0.45
      ? lerpRgb(P.skyTop, P.skyMid, f / 0.45)
      : f <= 0.82
        ? lerpRgb(P.skyMid, P.skyLow, (f - 0.45) / 0.37)
        : P.skyLow;
  const horizonY = plotH * HORIZON;
  if (P.dawnA > 0) {
    const top = horizonY - h * DAWN_BAND_UP;
    const bottom = horizonY + h * DAWN_BAND_DOWN;
    if (y > top && y < bottom && bottom > top) {
      const t = (y - top) / (bottom - top);
      const a =
        (t <= 0.75 ? (0.55 * t) / 0.75 : lerp(0.55, 0.15, (t - 0.75) / 0.25)) * P.dawnA;
      c = lerpRgb(c, DAWN_RGB, a);
    }
  }
  if (P.glowA > 0) {
    const r = w * GLOW_R;
    const d = Math.hypot(x - w * GLOW_X, y - horizonY);
    if (d < r) c = lerpRgb(c, P.glow, P.glowA * (1 - d / r));
  }
  if (P.vig > 0) {
    const d = Math.hypot((x - VIG_CX * w) / (VIG_RX * w), (y - VIG_CY * h) / (VIG_RY * h));
    const a = P.vig * clamp((d - VIG_CLEAR) / (1 - VIG_CLEAR), 0, 1);
    if (a > 0) c = lerpRgb(c, VIG_RGB, a);
  }
  return c;
}

/**
 * How far `base` has to be pushed toward `toward` — and toward opaque — to clear
 * `target` against a background of relative luminance `bgL`. Returns that
 * distance, 0 for "not at all" and 1 for "as far as it goes and still short".
 *
 * The ALPHA is part of the push and has to be, because the overlay is drawn at
 * textA over the sky and what a reader sees is the composite. At the piece's own
 * 0.85 the best contrast available at the worst background is under 4:1 whatever
 * the ink is, so an ink resolution that ignored the alpha would be answering a
 * question nobody asked. On a comfortable background the push is zero and the
 * authored alpha is exactly what is published; it only rises in the same narrow
 * band where the colour is reaching for white or black.
 *
 * Bisection rather than a closed form because the luminance of an sRGB lerp is
 * monotone in t but very much not linear in it; ten halvings is a thousandth of
 * the way, which is finer than a colour channel.
 */
function pushFor(base: RGB, toward: RGB, alpha: number, bg: RGB, bgL: number): number {
  const seen = (t: number) =>
    contrastOf(relLum(lerpRgb(bg, lerpRgb(base, toward, t), lerp(alpha, 1, t))), bgL);
  if (seen(0) >= INK_TARGET) return 0;
  if (seen(1) < INK_TARGET) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 10; i++) {
    const m = (lo + hi) / 2;
    if (seen(m) >= INK_TARGET) hi = m;
    else lo = m;
  }
  return hi;
}

/**
 * The ink for one background: which of the two, how far it had to be pushed, and
 * how ambiguous the background is.
 *
 * `push` comes back out because the alphas have to follow it — see publishLight.
 */
function inkOn(bg: RGB, dark: RGB, alpha: number): { ink: RGB; push: number; ambiguity: number } {
  const bgL = relLum(bg);
  const tLight = pushFor(OVERLAY_CREAM, OVERLAY_WHITE, alpha, bg, bgL);
  const tDark = pushFor(dark, BLACK, alpha, bg, bgL);
  // The crossover: the background luminance at which the two AUTHORED inks are
  // equally hard to read. Closed form — equal contrast means (L+.05)² is the
  // product of the two inks' own (L+.05). It is computed on the unpushed pair,
  // which puts it within one window width of the composited crossover; inside
  // the window both sides are pushed to their extremes anyway, so the anchor
  // being a few thousandths out costs nothing.
  const cross = Math.sqrt((OVERLAY_CREAM_L + 0.05) * (relLum(dark) + 0.05)) - 0.05;
  const mix = smoothstep((bgL - cross + INK_MIX_WINDOW) / (2 * INK_MIX_WINDOW));
  return {
    ink: lerpRgb(lerpRgb(OVERLAY_CREAM, OVERLAY_WHITE, tLight), lerpRgb(dark, BLACK, tDark), mix),
    push: lerp(tLight, tDark, mix),
    ambiguity: 1 - Math.abs(2 * mix - 1),
  };
}

/** How many points down the speaking card the sky is sampled at. The card is
 *  two or three lines and the sky barely moves across it, so five is already
 *  past the point where another changes the answer. */
const INK_PROBES = 5;

/** The mean sky over a box, in stage px: INK_PROBES samples down its middle. */
function skyOverBox(
  P: Palette,
  x: number,
  top: number,
  bot: number,
  w: number,
  h: number,
  plotH: number,
): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < INK_PROBES; i++) {
    const y = lerp(top, bot, (i + 0.5) / INK_PROBES);
    const c = skyAtPoint(P, x, y, w, h, plotH);
    r += c[0];
    g += c[1];
    b += c[2];
  }
  return [r / INK_PROBES, g / INK_PROBES, b / INK_PROBES];
}

/**
 * Resolve all three overlay inks into the palette.
 *
 * The caption's background is the MEAN sky over the box the words actually
 * occupy — `capX` is the box's centre and `capTop`/`capBot` its own top and
 * bottom in stage px, which is the currently speaking CARD rather than the grid
 * cell it is stacked in. The cell is as tall as the longest card in the deck
 * (the reveal's five lines of prose) and every title card sits at the top of it,
 * so resolving against the cell would be asking about sky a foot below the
 * words.
 *
 * R2d adds the second sky ink, and it is the same argument one box further up.
 * The date stamp moved to the top of the frame, which is not the sky the caption
 * band is in: the sky is a vertical gradient with the horizon glow burning into
 * its lower half, so at 1600 and across the 1947 dawn the two boxes differ by
 * enough to change which side of the crossover the ink lands on. `stampTop` /
 * `stampBot` are that box, and a stamp resolved against the caption's sky would
 * be the R2c bug with a new address.
 *
 * `pull` is how far the pull-back has taken the land toward its light tint,
 * because the bar and `start over` have to follow the ground they stand on
 * there too.
 */
function resolveInk(
  P: Palette,
  capX: number,
  capTop: number,
  capBot: number,
  stampX: number,
  stampTop: number,
  stampBot: number,
  w: number,
  h: number,
  plotH: number,
  pull: number,
): void {
  P.capBg = skyOverBox(P, capX, capTop, capBot, w, h, plotH);
  const sky = inkOn(P.capBg, P.ink, P.textA);
  P.text = sky.ink;
  P.textPush = sky.push;
  P.ambiguity = sky.ambiguity;
  P.stampBg = skyOverBox(P, stampX, stampTop, stampBot, w, h, plotH);
  const stamp = inkOn(P.stampBg, P.ink, P.textA);
  P.stampText = stamp.ink;
  P.stampPush = stamp.push;
  // R3: the ambiguity this call already computed, kept rather than dropped. It
  // is the stamp halo's signal — see stampAmbiguity.
  P.stampAmbiguity = stamp.ambiguity;
  // …and again at the dim alpha, which is the era ribbon's. Colour AND push come
  // out of this second call: see stampDimText.
  const stampDim = inkOn(P.stampBg, P.ink, P.dimA);
  P.stampDimText = stampDim.ink;
  P.stampDimPush = stampDim.push;
  const ground = inkOn(pull > 0 ? lerpRgb(P.land, PULL_LAND, pull) : P.land, P.ink, P.textA);
  P.landText = ground.ink;
  P.landPush = ground.push;
}

/* -------------------------------------------------------------- terrain --- */
/**
 * The ground, as a monotone cubic Hermite interpolant (PCHIP) through the exact
 * data values. Lifted from Inflation Peaks' terrain build
 * (site/src/lib/play/peaks-engine.ts) and generalised: the game's knots are one
 * a month, evenly spaced, while Maddison hands us benchmark years at 1600, 1650,
 * 1700, 1750, then decades, then every year from 1884. So the tangents use the
 * proper non-uniform PCHIP weighting rather than the even-spacing shortcut.
 *
 * Why this interpolant and not a spline that looks nicer: monotone cubics
 * cannot overshoot between two knots. Every data point is hit exactly, and no
 * hill, dip or wobble appears anywhere in between that is not in the data. The
 * walk's whole justification is that the terrain and the history agree; a
 * Catmull-Rom would have invented a famine somewhere by now.
 *
 * sample() is the single source of truth for the drawn curve, the walker's
 * height and the walker's lean. The three cannot disagree because there is only
 * one of them.
 */
interface Sample {
  value: number;
  /** d(value)/d(year). Not per pixel: the camera's scale is applied by the
   *  caller, which is what keeps the lean honest when the frame is squashed. */
  slope: number;
}

interface Terrain {
  points: Point[];
  first: number;
  last: number;
  firstValue: number;
  /** The first year that is an estimate chained onto the source rather than a
   *  value from it, or null if the whole series is sourced. Comes straight off
   *  the JSON's `estimated_from`; the rim light dashes from here on. */
  estimatedFrom: number | null;
  sample(year: number): Sample;
  /** The value envelope over [from, to], sampled at both edges so the frame
   *  does not pop when a peak crosses in or out between data points. */
  extent(from: number, to: number): { min: number; max: number };
  /** Index of the last knot at or before `year`, -1 before the series. */
  indexAtOrBefore(year: number): number;
}

/**
 * Endpoint tangent, one-sided with the monotonicity clamp. `a` is the interval
 * that touches the end, `b` the one inside it. Without the clamp a steep first
 * interval can hand the end a tangent that overshoots on the way in, which is
 * the one place the interior weighting cannot protect us.
 */
function endTangent(hA: number, hB: number, dA: number, dB: number): number {
  let m = ((2 * hA + hB) * dA - hA * dB) / (hA + hB);
  if (m * dA <= 0) m = 0;
  else if (dA * dB <= 0 && Math.abs(m) > 3 * Math.abs(dA)) m = 3 * dA;
  return m;
}

function buildTerrain(points: Point[], estimatedFrom: number | null): Terrain | null {
  const n = points.length;
  if (n < 2) return null;

  const xs = new Float64Array(n);
  const vs = new Float64Array(n);
  const ms = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = points[i][0];
    vs[i] = points[i][1];
  }

  // Interval widths and secants. Non-uniform h is the whole reason this is not
  // a copy-paste of the game's loop.
  const h = new Float64Array(n - 1);
  const d = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1] - xs[i];
    d[i] = (vs[i + 1] - vs[i]) / h[i];
  }

  for (let i = 1; i < n - 1; i++) {
    // A knot that is a local max or min gets a flat tangent. Without this the
    // averaged tangent points against the secant and the curve humps above the
    // peak year — a peak the series does not contain.
    if (d[i - 1] * d[i] <= 0) {
      ms[i] = 0;
      continue;
    }
    // Weighted harmonic mean of the two neighbouring secants. On even spacing
    // this reduces to Fritsch-Carlson; on uneven spacing it is what keeps a
    // fifty-year interval from dictating the tangent of the one-year interval
    // next to it. It satisfies the no-overshoot condition by construction, so
    // no clamping pass is needed for the interior.
    const w1 = 2 * h[i] + h[i - 1];
    const w2 = h[i] + 2 * h[i - 1];
    ms[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }

  if (n === 2) {
    ms[0] = d[0];
    ms[1] = d[0];
  } else {
    ms[0] = endTangent(h[0], h[1], d[0], d[1]);
    ms[n - 1] = endTangent(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
  }

  function indexAtOrBefore(year: number): number {
    if (year < xs[0]) return -1;
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (xs[mid] <= year) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  // Outside the span the ground is flat at the end value: the series is the
  // whole world, and a tangent extended past its last year would be a forecast.
  function sample(year: number): Sample {
    if (year <= xs[0]) return { value: vs[0], slope: 0 };
    if (year >= xs[n - 1]) return { value: vs[n - 1], slope: 0 };
    const i = indexAtOrBefore(year);
    const hi = h[i];
    const t = (year - xs[i]) / hi;
    const t2 = t * t;
    const t3 = t2 * t;
    const v0 = vs[i];
    const v1 = vs[i + 1];
    const m0 = ms[i];
    const m1 = ms[i + 1];
    return {
      value:
        (2 * t3 - 3 * t2 + 1) * v0 +
        (t3 - 2 * t2 + t) * hi * m0 +
        (-2 * t3 + 3 * t2) * v1 +
        (t3 - t2) * hi * m1,
      // d/dt of the same basis, divided back through to per-year
      slope:
        ((6 * t2 - 6 * t) * v0 + (-6 * t2 + 6 * t) * v1) / hi +
        (3 * t2 - 4 * t + 1) * m0 +
        (3 * t2 - 2 * t) * m1,
    };
  }

  function extent(from: number, to: number): { min: number; max: number } {
    let min = Infinity;
    let max = -Infinity;
    const take = (v: number) => {
      if (v < min) min = v;
      if (v > max) max = v;
    };
    take(sample(from).value);
    take(sample(to).value);
    // The interpolant cannot overshoot, so the extremes between the two edges
    // are the extremes of the knots between them. No sampling loop needed.
    for (let i = Math.max(0, indexAtOrBefore(from) + 1); i < n; i++) {
      if (xs[i] > to) break;
      if (xs[i] >= from) take(vs[i]);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
    return { min, max };
  }

  return {
    points,
    first: xs[0],
    last: xs[n - 1],
    firstValue: vs[0],
    estimatedFrom,
    sample,
    extent,
    indexAtOrBefore,
  };
}

/* ------------------------------------------------------------ furniture --- */

/** Step for the y gridlines: the first candidate showing 3-6 lines, else the
 *  one that misses that band by least. */
function chooseYStep(yMin: number, yMax: number): number {
  const count = (step: number) => Math.floor(yMax / step) - Math.ceil(yMin / step) + 1;
  let best = Y_STEPS[0];
  let bestMiss = Infinity;
  for (const step of Y_STEPS) {
    const n = count(step);
    if (n >= 3 && n <= 6) return step;
    const miss = n < 3 ? 3 - n : n - 6;
    if (miss < bestMiss) {
      bestMiss = miss;
      best = step;
    }
  }
  return best;
}

/** Step for the labelled year gridlines: coarser the wider the window. */
function chooseXStep(xWidth: number): number {
  if (xWidth > 250) return 50;
  if (xWidth > 140) return 25;
  if (xWidth > 45) return 10;
  return 5;
}

// `|| 0` folds the -0 a hair-below-zero gridline value rounds to, which
// otherwise prints as "$-0".
const dollars = (v: number) => `$${(Math.round(v) || 0).toLocaleString('en-US')}`;

/* ---------------------------------------------------------------- state --- */

interface Camera {
  xMin: number;
  xWidth: number;
  yMin: number;
  yMax: number;
}

interface Size {
  w: number;
  h: number;
  dpr: number;
}

/**
 * The walker's gait. Every component integrates, eases or samples the ground,
 * so none of them is a function of the walker's year alone and all of them live
 * in the loop rather than in render().
 */
interface WalkerGait {
  /** Stride phase in steps. The legs read sin(phase·π), so it has period 2. */
  phase: number;
  /** Gait amplitude: 0 is the stand pose, 1 a full stride. Eased. */
  swing: number;
  /** How much of the looking-up pose is in force, 0-1. Eased. */
  look: number;
  /**
   * The two feet: horizontal offset from the walker's own x in units of the
   * figure's height, and the terrain VALUE the foot is standing on there. The
   * loop computes both because only it can turn an offset in px into a year.
   */
  feet: { dx: number; at: number; value: number }[];
  /** The value the hip rides: the mean of the two feet, low-pass filtered. */
  ride: number;
  /** Which way he is pointing: +1 forward through history, -1 back. The whole
   *  figure is drawn mirrored at -1, so the gait runs unchanged in a flipped
   *  space and "forward" means "the way he is going" everywhere below. */
  facing: number;
  /** The screen slope AHEAD of him — px of rise per px of run, already signed
   *  by `facing` and already low-passed. The draw takes it from here rather
   *  than off sample() so the lean cannot disagree with the mode weights that
   *  were computed from the same number, and so it does not flicker a degree
   *  either way once a frame across the annual era's gouges. */
  slope: number;
  /** The pose machine's verdict for this frame. The loop computed it; the draw
   *  must use the same one it sampled the ground with. */
  mod: GaitMod;
  /** …and the mood, for exactly the same reason. */
  mood: Mood;
}

/** Everything render() is allowed to know. It reaches back into neither the DOM
 *  nor module scope from inside the draw. */
interface WalkState {
  camera: Camera;
  /** The walked series: India. Never named in the frame before the reveal. */
  india: Terrain | null;
  /** The world average, same measure. The other journey, not a walked path. */
  world: Terrain | null;
  /** LEVEL TWO. 0 through the walk AND through the vertical lift, 1 at the end
   *  of the full pull-back. Gates the world track, the end labels, the land's
   *  tint and the fade-out of everything that is clutter at that scale. Its
   *  meaning is unchanged from R2e, which is why the finished frame is. */
  pull: number;
  /** LEVEL ONE. 0 through the walk, 1 when the camera has craned up far enough
   *  to have the world's endpoint in frame. It draws nothing of its own: what it
   *  changes is where the mark is allowed to sit (see the mark's floor and its
   *  dodge below) and, through the loop, the camera and the walker's gaze. */
  lift: number;
  /** The chart chrome — gridlines, y values, unit label, year axis. 0 for the
   *  entire mystery walk; it arrives at the reveal and stays. */
  chrome: number;
  /** The world mark high in the frame. Arrives at the reveal, leaves as the
   *  pull-back draws the real thing. */
  mark: number;
  /** Where the walker is standing. `value` and `slope` come out of sample(), so
   *  he is on the line by construction. */
  walker: { year: number; value: number; slope: number };
  /** …and how he is standing there. */
  pose: WalkerGait;
  /** The light in force this frame — a pure function of walker.year, resolved
   *  once by the loop so the draw and the DOM cannot disagree about it. */
  light: Palette;
  /** How far the ground has travelled under the walker since the page loaded,
   *  CSS px, signed. The two parallax ridges scroll off this rather than off the
   *  camera's year window, so a zoom change slides them instead of jumping them. */
  scroll: number;
  /** The two ridge bands, precomputed on resize: y offsets from the horizon,
   *  one tile's worth, wrapping. */
  ridges: Ridge[] | null;
  /** Live dust, oldest first. Empty under reduced motion. */
  dust: Dust[];
  /** The intro's birds, and EMPTY for every frame of the walk. They are spawned
   *  once, on the press that blooms the world, and dropped as each one leaves the
   *  frame; nothing refills the pool. See drawBirds, which is a length test on
   *  every frame that is not one of the five seconds this list is not empty. */
  birds: Bird[];
  /** How far up the mast the flag is, 0-1. Permanent at 1 — the reader raises it
   *  once and it stays up — and the reader's hands below it: an abandoned hoist
   *  lowers itself when they walk back out of the gate. */
  hoist: number;
  /** The wave's phase in radians, or 0 for a flag that must hold still (reduced
   *  motion, or a mast nowhere near the frame). */
  flagWave: number;
  /** The caption block's box in stage px — the whole grid cell, which is the
   *  tallest card's height whether or not that card is the one showing, so it is
   *  a constant of the layout rather than of the frame. The world mark dodges
   *  around it at the reveal (see WORLD_MARK_*). `capBottom <= capTop` means
   *  there is nothing to dodge. */
  capTop: number;
  capBottom: number;
  /** …and the same box's left and right edges, which the y-axis labels need for
   *  a collision of their own: the pull-back moves the caption into the upper
   *  LEFT, which is exactly the gutter those labels are set in. */
  capLeft: number;
  capRight: number;
  /** The sign-off lockup's own box, and null on every other frame of the piece.
   *  It is the one card that is a MASTHEAD rather than a caption, and a gridline
   *  ruled through a masthead reads as a printing fault rather than as a chart,
   *  so the gridlines break around it. Skipping the value the way the prose cards
   *  do is not enough here: the lockup is centred, and what crosses it is the
   *  line. */
  signBox: { left: number; right: number; top: number; bottom: number } | null;
  /** R2m: the box of the PROSE card the stage has latched — the reveal's two
   *  parts and the ending screen — and null on every frame that has no such card
   *  up, which is the whole of the walk. The chart's hairlines and its dashed
   *  1947 fade out inside it (see softLine). The sign-off is deliberately not
   *  here: it has the harder break above, and the two rules are about two
   *  different kinds of object. */
  textBox: { left: number; right: number; top: number; bottom: number } | null;
  /** OUT. Where render() actually drew the world's mark this frame, in stage px,
   *  or -1 on the frames it drew none. It is written rather than read because the
   *  mark's height is the ONE thing on the stage the words have to get out of the
   *  way of: the sentence names a mark the reader is looking at, so the mark's
   *  position is the fact and the sentence's position is the variable (see
   *  wordsShift in the loop, which reads this). It was the other way round until
   *  the release-day pass — the mark dodged the prose — and a mark that moves to
   *  avoid the words is a chart lying about where a value is. */
  worldMarkY: number;
  theme: Theme;
  size: Size;
  /** Height of the plot: the stage minus the strip kept clear at the foot for
   *  the pull-back's year labels. The sky and the land fill the whole stage. */
  plotH: number;
}

/**
 * A parallax ridge band. `ys` holds one tile of vertical OFFSETS FROM THE
 * HORIZON in CSS px, sampled every RIDGE_STEP px and periodic across the tile,
 * so the same array wraps forever and the horizon can move under it without
 * anything being rebuilt.
 *
 * Offsets rather than absolute y, and a path fill rather than a bitmap, because
 * the ridge COLOUR changes every frame with the light: a pre-tinted offscreen
 * canvas would have to be repainted on every frame that moved, which is the
 * thing pre-rendering was supposed to avoid. What is cached here is the
 * expensive half — four sines per sample — and what runs per frame is a
 * few hundred lineTo calls, exactly as in the mockups.
 */
interface Ridge {
  ys: Float32Array;
  tile: number;
  parallax: number;
}

/**
 * One speck of dust, in the coordinates that survive a moving camera: the year
 * it was kicked up at and the ground value there, plus a screen-space drift off
 * that anchor. Stored this way so the dust stays put on the ground while the
 * world slides past, at any zoom.
 */
interface Dust {
  year: number;
  value: number;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  /** Milliseconds lived. Dead at DUST_LIFE. */
  age: number;
}

/**
 * One of the intro's birds. Stage coordinates rather than world ones — x in
 * stage px, y as a fraction of the stage height — because a bird is in the AIR
 * and the dust is on the GROUND, and only one of those wants to be dragged
 * around by the camera.
 */
interface Bird {
  /** Stage px, and R2l does NOT integrate it: the lateral part of the climb is a
   *  pure function of how far up the climb the bird is, which is what makes the
   *  path a curve rather than a diagonal. Written by stepBirds each frame. */
  x: number;
  /** Fraction of the stage height, and it DECREASES: R2i's birds climb. Also
   *  derived from `p` rather than integrated. */
  y: number;
  /** How far through its whole climb it is, 0 at the spawn band and 1 at the
   *  height it is dropped at, plus how fast that runs. */
  p: number;
  pRate: number;
  /** Where it set off from and where its lean is aiming, both in stage px, and
   *  the height it set off at. */
  x0: number;
  toX: number;
  yFrom: number;
  /** The lateral wander over the eased path: how far, where in it the bird
   *  starts, and how much of a turn it gets through over the whole climb. */
  drift: number;
  driftPhase: number;
  driftTurns: number;
  /** Wingspan in stage px, and how dark it is drawn — both off its depth. */
  span: number;
  alpha: number;
  /** Where in its own beat-beat-glide cycle it is, 0-1, and how fast that runs
   *  in cycles per second. */
  wing: number;
  wingRate: number;
}

/**
 * The wing's own shape over one beat-beat-glide cycle, in the units the drawing
 * swings the wingtips through: +1 is fully up and -1 fully down.
 *
 * Two full sine beats across the first BIRD_BEATS_FRAC of the cycle, swung about
 * the glide's own pose rather than about zero — so the pair begins and ends
 * exactly where the glide sits and the hand-over is continuous at both edges —
 * and then a long held glide. Nothing here is a branch a reader can see: the
 * whole point is that the bird stops flapping for a while, which is the thing a
 * real one does and the thing continuous flapping never looks like.
 */
function birdWing(t: number): number {
  if (t >= BIRD_BEATS_FRAC) return BIRD_GLIDE_SET;
  const beat = Math.sin((t / BIRD_BEATS_FRAC) * Math.PI * 2 * BIRD_BEATS);
  return BIRD_GLIDE_SET + (1 - BIRD_GLIDE_SET) * beat;
}

/* ----------------------------------------------------------- the world --- */
/**
 * The scene, in the order the mockups paint it. Everything here is decoration
 * EXCEPT the land and its rim light, which are the data and nothing else: the
 * top edge of the landmass is sample(), evaluated every two pixels, and the rim
 * is that same edge stroked over the part of it he has walked.
 */

/** Deterministic noise, so a ridge is the same ridge on every load and between
 *  two readers looking at the same frame. */
function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * One ridge band, built on resize. The waves are INTEGER harmonics of the tile
 * so the two ends of the array meet exactly and the band can wrap forever
 * without a seam; the mockups' four-sine shape and its amplitude taper are
 * otherwise unchanged.
 */
function buildRidge(
  seed: number,
  w: number,
  h: number,
  drop: number,
  amp: number,
  parallax: number,
): Ridge {
  const tile = RIDGE_STEP * Math.max(8, Math.ceil((RIDGE_TILES * Math.max(w, 1)) / RIDGE_STEP));
  const n = Math.round(tile / RIDGE_STEP);
  const r = rng(seed);
  const waves: { a: number; k: number; p: number }[] = [];
  for (let i = 0; i < 4; i++) {
    waves.push({
      a: amp * h * (0.6 - i * 0.12),
      k: i + 1 + Math.floor(r() * 2),
      p: r() * Math.PI * 2,
    });
  }
  const ys = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / n) * Math.PI * 2;
    let y = drop * h;
    for (const wv of waves) y += wv.a * Math.sin(wv.k * x + wv.p);
    ys[i] = y;
  }
  return { ys, tile, parallax };
}

function buildRidges(w: number, h: number): Ridge[] {
  return [
    buildRidge(11, w, h, RIDGE_FAR_DROP, RIDGE_FAR_AMP, RIDGE_FAR_PARALLAX),
    buildRidge(34, w, h, RIDGE_NEAR_DROP, RIDGE_NEAR_AMP, RIDGE_NEAR_PARALLAX),
  ];
}

function drawRidge(
  ctx: CanvasRenderingContext2D,
  r: Ridge,
  scroll: number,
  horizonY: number,
  colour: RGB,
  alpha: number,
  w: number,
  h: number,
): void {
  const n = r.ys.length;
  const step = r.tile / n;
  let off = (scroll * r.parallax) % r.tile;
  if (off < 0) off += r.tile;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = rgbCss(colour);
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += RIDGE_STEP) {
    const t = (x + off) / step;
    const i0 = Math.floor(t);
    const f = t - i0;
    const a = r.ys[i0 % n];
    const b = r.ys[(i0 + 1) % n];
    ctx.lineTo(x, horizonY + a + (b - a) * f);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * The sky, the dawn band and the horizon glow: three fills, in that order,
 * before anything with a shape in it exists.
 */
/**
 * The sky is a VERTICAL gradient, which means every one of its columns is the
 * same column — so it is evaluated once into a one-pixel-wide strip and then
 * stretched across the frame. A full-frame createLinearGradient fill was, by
 * some way, the most expensive single call in the render (8ms of a 24ms frame on
 * a CPU-rastered stage at 4x throttling, measured); the strip costs one column
 * of gradient plus a blit and does not change a pixel of the result.
 */
let skyStrip: HTMLCanvasElement | null = null;
let skyStripCtx: CanvasRenderingContext2D | null = null;

function drawSky(ctx: CanvasRenderingContext2D, s: WalkState, horizonY: number): void {
  const { w, h, dpr } = s.size;
  const P = s.light;

  const rows = Math.max(1, Math.round(h * dpr));
  if (!skyStrip || skyStrip.height !== rows) {
    skyStrip = document.createElement('canvas');
    skyStrip.width = 1;
    skyStrip.height = rows;
    skyStripCtx = skyStrip.getContext('2d');
  }
  // The 1947 dawn band — a low strip of first light hugging the horizon — is a
  // vertical gradient too, so it goes into the SAME one-pixel strip, over the
  // sky and under everything with an edge. It used to be its own full-width
  // fillRect, and that one call was the whole reason the frames between 1945 and
  // 1955 were the only frames in the piece over budget: 18.8ms/frame against
  // 16.7 at 4x throttle on a 390x844 stage, with every other stretch of the walk
  // at 16.66. Folded into the strip it costs a 1px-wide gradient and the blit
  // that was already happening.
  const dawnTop = horizonY - h * DAWN_BAND_UP;
  const dawnBottom = horizonY + h * DAWN_BAND_DOWN;
  if (skyStripCtx) {
    const sky = skyStripCtx.createLinearGradient(0, 0, 0, rows);
    sky.addColorStop(0, rgbCss(P.skyTop));
    sky.addColorStop(0.45, rgbCss(P.skyMid));
    sky.addColorStop(0.82, rgbCss(P.skyLow));
    skyStripCtx.fillStyle = sky;
    skyStripCtx.fillRect(0, 0, 1, rows);
    if (P.dawnA > 0) {
      const t = dawnTop * dpr;
      const b = dawnBottom * dpr;
      const band = skyStripCtx.createLinearGradient(0, t, 0, b);
      band.addColorStop(0, rgba(DAWN_RGB, 0));
      band.addColorStop(0.75, rgba(DAWN_RGB, 0.55 * P.dawnA));
      band.addColorStop(1, rgba(DAWN_RGB, 0.15 * P.dawnA));
      skyStripCtx.fillStyle = band;
      skyStripCtx.fillRect(0, Math.max(0, t), 1, b - Math.max(0, t));
    }
    ctx.drawImage(skyStrip, 0, 0, w, h);
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgbCss(P.skyTop));
    sky.addColorStop(0.45, rgbCss(P.skyMid));
    sky.addColorStop(0.82, rgbCss(P.skyLow));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    if (P.dawnA > 0) {
      const band = ctx.createLinearGradient(0, dawnTop, 0, dawnBottom);
      band.addColorStop(0, rgba(DAWN_RGB, 0));
      band.addColorStop(0.75, rgba(DAWN_RGB, 0.55 * P.dawnA));
      band.addColorStop(1, rgba(DAWN_RGB, 0.15 * P.dawnA));
      ctx.fillStyle = band;
      ctx.fillRect(0, Math.max(0, dawnTop), w, dawnBottom - Math.max(0, dawnTop));
    }
  }

  // The light he is walking toward, always to the right of him. Bounded to the
  // footprint of its own gradient rather than to the frame: canvas pads a
  // gradient past its last stop, so filling the whole rect is correct but pays
  // for a screenful of blending to lay down nothing.

  if (P.glowA > 0) {
    const gx = w * GLOW_X;
    const gr = w * GLOW_R;
    const glow = ctx.createRadialGradient(gx, horizonY, 0, gx, horizonY, gr);
    glow.addColorStop(0, rgba(P.glow, P.glowA));
    glow.addColorStop(1, rgba(P.glow, 0));
    ctx.fillStyle = glow;
    const x0 = Math.max(0, gx - gr);
    const y0 = Math.max(0, horizonY - gr);
    ctx.fillRect(x0, y0, Math.min(w, gx + gr) - x0, Math.min(h, horizonY + gr) - y0);
  }
}

/**
 * The intro's birds, and the whole of this function's contract is its first
 * line: on every frame of the walk the list is empty and this costs one property
 * read and one comparison. They exist for the five seconds of the opening bloom
 * and are never spawned again (see BIRD_MIN and the intro section).
 *
 * A bird is two shallow curves meeting at a body, drawn as one stroked path in
 * the palette's own ink so it belongs to the same frame as the ridges — a
 * silhouette against the sky rather than a mark on it. The beat is a lift of the
 * wingtips and a small rise and fall of the whole shape on the same phase, and
 * it runs the beat-beat-glide cycle rather than a continuous sine (see
 * birdWing); a wing that folds at six pixels reads as a bug.
 *
 * Drawn after the sky and before the ridges: they are further away than the near
 * hills and closer than nothing at all.
 */
function drawBirds(ctx: CanvasRenderingContext2D, s: WalkState): void {
  if (!s.birds.length) return;
  const { w, h } = s.size;
  ctx.save();
  ctx.strokeStyle = rgbCss(s.light.ink);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const b of s.birds) {
    if (b.x < -b.span || b.x > w + b.span) continue;
    const beat = birdWing(b.wing);
    const y = b.y * h + beat * b.span * BIRD_BOB;
    const half = b.span / 2;
    // The wingtips ride the beat; the elbows lag it, which is what keeps the
    // shape a curve rather than a chevron.
    const tip = -beat * half * 0.42;
    const mid = -beat * half * 0.16;
    // …and they dissolve into the top of the frame rather than reaching an edge
    // and vanishing off it. The stamp is arriving in that band as they go. The
    // alpha it dissolves from is the bird's own, which is its depth.
    ctx.globalAlpha = b.alpha * clamp((b.y - BIRD_Y_GONE) / BIRD_FADE_BAND, 0, 1);
    ctx.lineWidth = Math.max(0.8, b.span * 0.11);
    ctx.beginPath();
    ctx.moveTo(b.x - half, y + tip);
    ctx.quadraticCurveTo(b.x - half * 0.45, y + mid, b.x, y);
    ctx.quadraticCurveTo(b.x + half * 0.45, y + mid, b.x + half, y + tip);
    ctx.stroke();
  }
  ctx.restore();
}

/** Fog straddling the horizon, the last thing between the distance and the
 *  land. Retires with the pull-back, which wants a clean chart. */
function drawFog(ctx: CanvasRenderingContext2D, s: WalkState, horizonY: number): void {
  const { w, h } = s.size;
  const clarity = 1 - s.pull;
  if (clarity <= 0) return;
  const top = horizonY - s.plotH * FOG_UP;
  const bottom = horizonY + s.plotH * FOG_DOWN;
  const fog = ctx.createLinearGradient(0, top, 0, bottom);
  fog.addColorStop(0, rgba(s.light.fog, 0));
  fog.addColorStop(0.5, rgba(s.light.fog, FOG_PEAK * clarity));
  fog.addColorStop(1, rgba(s.light.fog, 0));
  ctx.fillStyle = fog;
  const y0 = Math.max(0, top);
  ctx.fillRect(0, y0, w, Math.min(h, bottom) - y0);
}

/** The pool of light he carries, so a black figure on black ground is still a
 *  figure. Drawn over the land and under him.
 *
 *  R2m sizes it off the height he is actually DRAWN at, shrink and all. It used
 *  to read the unshrunk height, which was survivable while the pull-back left
 *  him at 0.6 of himself and stopped being so at 0.24: a halo of 2.2 unshrunk
 *  heights around an 8px figure is a lit patch of chart with a speck in the
 *  middle of it. The alpha still fades out with the pull on top of that, so at
 *  the settled frame there is no halo at all; this is about the seconds of the
 *  flight in between, where there is. */
function drawBacklight(
  ctx: CanvasRenderingContext2D,
  s: WalkState,
  x: number,
  groundY: number,
): void {
  const k = s.light.backlight * (1 - s.pull);
  if (k <= 0.001) return;
  const H = drawnWalkerH(s.size.w, s.walker.year) * (1 - (1 - PULL_WALKER_SCALE) * s.pull);
  const cy = groundY - H * 0.55;
  const r = H * BACKLIGHT_R;
  // Seen once, in a probe, on the frame a theatre exit re-lays the stage out:
  // createRadialGradient THROWS on a non-finite argument, and a throw inside
  // render() takes the requestAnimationFrame loop down with it — the film
  // simply stops, mid-walk, with no way back. Not reproducible in six runs
  // afterwards and not diagnosed, so this does not pretend to be a fix for the
  // cause: it is a guarantee that the worst case is one frame with no halo on
  // it rather than a dead film. Two comparisons, on a function that has already
  // returned early for every frame the backlight is off.
  if (!Number.isFinite(cy) || !(r > 0)) return;
  const halo = ctx.createRadialGradient(x, cy, 0, x, cy, r);
  const rgb = toRgb(BACKLIGHT_RGB) ?? BLACK;
  halo.addColorStop(0, rgba(rgb, BACKLIGHT_ALPHA * k));
  halo.addColorStop(0.55, rgba(rgb, BACKLIGHT_ALPHA * k * 0.42));
  halo.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Footfall dust: a few specks in the rim's own colour, so they are invisible
 *  in the dark years and just about there in daylight. */
function drawDust(
  ctx: CanvasRenderingContext2D,
  s: WalkState,
  px: (year: number) => number,
  py: (value: number) => number,
): void {
  if (!s.dust.length || s.pull >= 1) return;
  ctx.save();
  for (const d of s.dust) {
    const t = clamp(d.age / DUST_LIFE, 0, 1);
    const a = (1 - t) * (1 - t) * DUST_ALPHA * (1 - s.pull);
    if (a <= 0.002) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = rgbCss(s.light.rim);
    ctx.beginPath();
    ctx.arc(px(d.year) + d.dx, py(d.value) + d.dy, DUST_R * (1 + t), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------ the mast --- */

/**
 * 1947: the flagpole, and since R2l the ONLY object standing on the terrain.
 * Drawn with its origin at the point where it meets the ground and its own y
 * running upward, the way the two retired props were (see the PROP_ table
 * above). It needs the light and the hoist to draw itself at all, which is most
 * of why it never belonged to a table of static line-art.
 *
 * THE FLAG IS THE INDIAN TRICOLOUR AND IT IS NEVER DRAWN WRONG. Saffron band on
 * top, white in the middle, green at the bottom, in a 3:2 fly-to-drop the way
 * the flag code has it, hoisted so it flies at the masthead.
 *
 * R2b made the whole thing bigger, because at PROP_H it was a mast the walker
 * overtopped and a flag the size of his head — a moment the piece stops for, and
 * the smallest object on the path. The pole is MAST_H now, a little over half
 * again the props' height, so it clearly stands over him; the flag is half again
 * its old fly, at the true ratio.
 *
 * It never emits light. Every band is its true colour multiplied down by the
 * frame's own ambient (see mastAmbient), so at the moment the reader arrives —
 * true midnight, hoist 0 — the folded bundle at the foot of the pole is a dark
 * shape, and the colour comes up with the dawn the reader is hauling up.
 */
const MAST_H = PROP_H * 1.6;
const MAST_FLAG_FLY = MAST_H * 0.4;
const MAST_FLAG_DROP = (MAST_FLAG_FLY * 2) / 3;
/** How far below the masthead the flag's top edge sits at full hoist, and how
 *  far above the ground the folded bundle sits at zero. */
const MAST_TOP_GAP = MAST_H * 0.06;
const MAST_FOOT_GAP = MAST_H * 0.1;
/**
 * Below this much white band, in device-independent px, there is no chakra at
 * all. Above it, the ring and its spoke wash together (see drawMast).
 *
 * The gate came DOWN in R2b, from 14px to 3.2: 14px of white band means a flag
 * with a 42px drop — taller than the walker, and a mast the size of a building
 * to carry it — so the old gate could never be met by any flag this piece could
 * draw; it read as "no chakra ever". At the R2b flag the white band is 3.7 CSS
 * px, which is 7.4 device px on the phone this is authored for, and a hairline
 * mark inside it is clean rather than a blur.
 *
 * The R2b doctrine here used to be "ring, never spokes" — twenty-four countable
 * lines in a three-pixel band would be a smudge with a lie in it. The
 * release-morning feel-check found the other half of that truth: R2k's
 * width-scaled mast made the desktop flag big enough that a bare ring reads as
 * the chakra MISSING. The resolution is that the spokes are drawn as a hairline
 * wash below the ring's own alpha (see drawMast), which resolves at every size
 * the way spokes on a small printed flag do — texture, not diagram — so the
 * doctrine's fear and the desktop's complaint are both answered by one mark.
 */
const CHAKRA_MIN_BAND_PX = 3.2;
const SAFFRON: RGB = [255, 153, 51];
const WHITE_BAND: RGB = [255, 255, 255];
const GREEN_BAND: RGB = [19, 136, 8];
/** The chakra's navy, the flag code's own #000080. */
const CHAKRA_NAVY: RGB = [0, 0, 128];
/** The halyard: the one thing at the gate that catches the light. A hairline
 *  with a little sag in it, warm, and never a glow blob. */
const HALYARD_WIDTH = 1;
const HALYARD_SAG = PROP_H * 0.05;
const HALYARD_OFFSET = PROP_H * 0.11;
const HALYARD_ALPHA = 0.55;
/** The wave at full hoist: about two pixels of travel at the fly edge, slow. */
const FLAG_WAVE_PX = 2;
const FLAG_WAVE_HZ = 0.55;

/** The year the flagpole stands at. The dawn band peaks on the same year by
 *  construction, and the gate below holds the walk here until the flag is up. */
const GATE_YEAR = DAWN_BAND_PEAK;

/**
 * How lit the flag is, 0..1. It catches the frame's light and never makes any:
 * a base that keeps it from being pure black in the dark, plus the dawn it is
 * itself raising, plus whatever daylight the sky has by then. At the gate with
 * the hoist at zero this comes out around a quarter, which is a folded bundle
 * you can see the shape of and not the colour of; at full hoist under the 1947
 * dawn it is nearly one.
 */
function mastAmbient(P: Palette): number {
  return clamp(0.25 + P.dawnA * 0.55 + lum(P.skyLow) / 300, 0.25, 1);
}

/**
 * The flagpole at 1947, and the flag on it.
 *
 * `hoist` is 0 at the foot and 1 at the masthead, and everything visible here is
 * a function of it: the bundle unfolds into a flag as it leaves the ground, the
 * halyard's two runs cross where the flag is, and only at 1 does the flag wave.
 *
 * The origin is the point where the pole meets the ground, y running up, exactly
 * like a prop.
 */
function drawMast(
  ctx: CanvasRenderingContext2D,
  P: Palette,
  hoist: number,
  wave: number,
  alpha: number,
): void {
  const k = clamp(hoist, 0, 1);
  const lit = mastAmbient(P);
  const shade = (c: RGB): string => rgba(lerpRgb(P.ink, c, lit), 1);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // The pole, in the same ink as every other object on the path.
  ctx.strokeStyle = rgbCss(P.ink);
  ctx.lineWidth = PROP_STROKE;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -MAST_H);
  ctx.stroke();

  // The halyard: down the near side of the pole, round the foot, back up. Drawn
  // with a quadratic so it sags rather than hanging as a ruled line, and in the
  // rim's own warm colour, because it is the only thing at the gate that catches
  // the light. A hairline at just over half alpha is a shimmer; anything more is
  // a rope with a lamp behind it.
  const ropeTop: [number, number] = [0, -MAST_H + MAST_TOP_GAP * 0.5];
  const ropeCtl: [number, number] = [HALYARD_OFFSET + HALYARD_SAG, -MAST_H * 0.5];
  const ropeEnd: [number, number] = [HALYARD_OFFSET, -MAST_FOOT_GAP];
  ctx.strokeStyle = rgba(P.rim, HALYARD_ALPHA * P.rimA);
  ctx.lineWidth = HALYARD_WIDTH;
  ctx.beginPath();
  ctx.moveTo(...ropeTop);
  ctx.quadraticCurveTo(...ropeCtl, ...ropeEnd);
  ctx.stroke();

  // (R2c retired the cue chevron that used to ride down this rope on a loop.
  // The feel-check wanted a rope to be a rope. The whisper at HOIST_HINT_MS is
  // what is left, and it is enough — it is offered only to a reader who is
  // genuinely stuck, and it retires the moment anything moves.)

  // Where the flag's top edge is: the foot at hoist 0, just under the masthead
  // at 1.
  const bottom = -MAST_FOOT_GAP;
  const top = -MAST_H + MAST_TOP_GAP;
  const y = lerp(bottom - MAST_FLAG_DROP * 0.35, top, k);

  // The bands. At hoist 0 the flag is FOLDED: a short fat bundle at the foot of
  // the pole with the three colours stacked in it, which is what a flag waiting
  // to be raised looks like. It opens out to its full fly as it climbs, so
  // nothing pops into existence.
  const fly = lerp(MAST_FLAG_FLY * 0.42, MAST_FLAG_FLY, smoothstep(k));
  const drop = lerp(MAST_FLAG_DROP * 0.72, MAST_FLAG_DROP, smoothstep(k));
  const band = drop / 3;
  // The wave: a small horizontal shear on the fly edge, on at full hoist only,
  // and zero when the caller passes wave = 0 (reduced motion, or off screen).
  const sway = k >= 1 ? Math.sin(wave) * FLAG_WAVE_PX : 0;

  const bands: RGB[] = [SAFFRON, WHITE_BAND, GREEN_BAND];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = shade(bands[i]);
    ctx.beginPath();
    ctx.moveTo(0, y + band * i);
    ctx.lineTo(fly, y + band * i + sway * 0.5);
    ctx.lineTo(fly, y + band * (i + 1) + sway * 0.5);
    ctx.lineTo(0, y + band * (i + 1));
    ctx.closePath();
    ctx.fill();
  }

  // The chakra, and the rule that keeps it honest: below CHAKRA_MIN_BAND_PX of
  // white band there is nothing at all (see the constant for why that number
  // moved in R2b, and for how the spokes came back on release morning). In the
  // flag code's own navy, and lit by the same ambient as the bands so it comes
  // up with the dawn rather than sitting on the flag in the dark.
  //
  // R2g puts it where the flag code says it goes. It was drawn at 0.45 of the fly
  // and 0.34 of the band, which is a ring pushed toward the hoist edge at
  // two-thirds the diameter the code specifies; the ring is now CENTRED in the
  // white band (fly * 0.5) at a diameter of three quarters of the band's height
  // (radius band * 0.375). Neither the ring-never-spokes doctrine nor the 3.2px
  // gate moves with it.
  if (band >= CHAKRA_MIN_BAND_PX) {
    const chakraX = fly * 0.5;
    const chakraY = y + band * 1.5 + sway * 0.35;
    const chakraR = band * 0.375;
    ctx.strokeStyle = rgba(CHAKRA_NAVY, 0.85 * lit);
    ctx.lineWidth = Math.min(1, band * 0.22);
    ctx.beginPath();
    ctx.arc(chakraX, chakraY, chakraR, 0, Math.PI * 2);
    ctx.stroke();
    // The spokes, release-morning 2026-08-15, from the desktop feel-check:
    // R2k's width-scaled mast made the desktop flag big enough that a bare
    // ring reads as a hoop with the chakra missing. Twenty-four of them, one
    // vertical as the flag code draws it, hub to rim — but as a WASH, not a
    // diagram: hairline width and a shade under the ring's alpha, so at any
    // size this piece renders they resolve the way spokes on a small printed
    // flag do, a radial texture inside the ring rather than countable lines.
    // Same gate as the ring; below it the white band gets nothing, as before.
    ctx.strokeStyle = rgba(CHAKRA_NAVY, 0.6 * lit);
    ctx.lineWidth = Math.max(0.35, band * 0.055);
    ctx.beginPath();
    for (let s = 0; s < 24; s++) {
      const a = -Math.PI / 2 + (s * Math.PI) / 12;
      ctx.moveTo(chakraX + Math.cos(a) * chakraR * 0.14, chakraY + Math.sin(a) * chakraR * 0.14);
      ctx.lineTo(
        chakraX + Math.cos(a) * (chakraR - ctx.lineWidth / 2),
        chakraY + Math.sin(a) * (chakraR - ctx.lineWidth / 2),
      );
    }
    ctx.stroke();
  }

  ctx.restore();
}

/* --------------------------------------------------------------- figure --- */

/**
 * A pose, in the mockup's own coordinates: fractions of the figure's height, x
 * forward from the walker's year, y measured UP from the ground he stands on.
 * Arms hang off the shoulder (their x is relative to it) so a shoulder that
 * moves carries them with it.
 *
 * There are exactly three poses, and every frame of the walk is a blend of
 * them: stand → walk by the gait amplitude, then → look-up by the reveal's
 * ease. Blending point tables is why they are written as tables.
 */
interface Limb {
  elbow: [number, number];
  hand: [number, number];
}

interface Pose {
  hip: [number, number];
  sh: [number, number];
  head: [number, number];
  /** How far BEHIND the head's centre the hair crop sits. Negative rolls it
   *  forward over the crown, which is what a head tipped back does. */
  hair: number;
  /** …and how far the crop itself is rotated, radians, negative backward. The
   *  offset alone slides the cap across a head that is still sitting level; the
   *  tilt is what makes the head read as tipped rather than as shifted. */
  hairTilt: number;
  /** Height of the kurta hem above the ground. In the pose rather than a
   *  constant because a crouch takes it down with the hip. */
  hem: number;
  /** Foot offsets, one per leg. No heights: the feet are planted on the
   *  terrain under them, not on the pose. */
  feet: [number, number];
  arms: [Limb, Limb];
}

/**
 * What the pose machine does to the walk cycle. Every field is a blended,
 * already-eased quantity computed once per frame in the loop and handed to
 * poseAt() — the loop and the draw both call poseAt() and MUST pass the same
 * one, or the feet the ground was sampled at are not the feet that get drawn.
 */
interface GaitMod {
  /** Stride length multiplier: short steps are most of what reads as care. */
  stride: number;
  /**
   * …and the stride CYCLE's own length multiplier, which is what turns a short
   * step into a quick one. R2g splits it out of `stride` because the two halves
   * of that product want different answers: the SLOPE modes shorten the step to
   * keep the feet under the body and the travel speed should not change with it,
   * so their shortening is compensated in full here (a third off the stride is
   * half again the step rate); the BODY-LANGUAGE multipliers — the famine
   * trudge, rough ground, the post-1947 swagger — keep the square-root rule they
   * were authored with, because a trudge that raised the cadence to compensate
   * would not be a trudge.
   */
  cycle: number;
  /** Ground-clearance multiplier on the swinging foot and knee. */
  lift: number;
  /** How much of the forward-and-down climbing reach is in the leading arm. */
  reach: number;
  /** …and how much of it the trailing arm shares, at the steepest. */
  reachBoth: number;
  /** How much the hip drops and the knees bend for a careful descent. */
  crouch: number;
  /** Extra lean about the hip, radians, forward-positive in travel space. The
   *  CLIMB's only: the descent's brace is `brace` below, and it is a blend
   *  target rather than an addition. */
  lean: number;
  /** How committed the careful descent is, 0-1. The slope lean is eased toward
   *  DESC_LEAN by this rather than having it added on top (see drawWalker). */
  brace: number;
}

const GAIT_NEUTRAL: GaitMod = {
  stride: 1,
  cycle: 1,
  lift: 1,
  reach: 0,
  reachBoth: 0,
  crouch: 0,
  lean: 0,
  brace: 0,
};

/** Feet together, weight even, arms at rest. Where he blends to ~200ms after
 *  the reader lets go. */
const POSE_STAND: Pose = {
  hip: [0, 0.53],
  sh: [0.0126, 0.815],
  head: [0.0246, 0.905],
  hair: 0.008,
  hairTilt: 0,
  hem: W_HEM,
  feet: [0.05, -0.055],
  arms: [
    { elbow: [0.006, 0.615], hand: [-0.006, 0.46] },
    { elbow: [0.026, 0.615], hand: [0.034, 0.46] },
  ],
};

/**
 * The reveal: the spine unrolls, the shoulders come back over the hips and the
 * head tips back at whatever is high overhead.
 *
 * Retuned in R1d. The mocked keyframe was read at 36px as a man standing up
 * straighter rather than as a man looking up — there was no tilt in it, only a
 * head slid backward on a level neck. The head now lifts 0.015·H further and
 * sits a further 0.018·H behind the shoulder, and the hair crop rotates with the
 * skull instead of sliding across it, which is the part that actually reads:
 * the flat edge of the cap is the hairline, and a hairline that has swung round
 * is a face pointing up.
 */
const POSE_LOOKUP: Pose = {
  hip: [0, 0.535],
  sh: [-0.008, 0.822],
  head: [-0.055, 0.935],
  hair: 0.014,
  hairTilt: -0.7,
  hem: W_HEM,
  feet: [0.05, -0.055],
  arms: [
    { elbow: [-0.015, 0.615], hand: [-0.047, 0.465] },
    { elbow: [0.01, 0.615], hand: [-0.017, 0.46] },
  ],
};

/**
 * The walk, as a continuous cycle rather than a keyframe. The mockup's walk
 * pose is this function at θ = π/2 — front foot at +0.205, back foot at −0.15,
 * one arm forward and one back — and the rest of the cycle is that same pair of
 * extremes on a sinusoid.
 *
 * Leg 1 runs exactly half a cycle behind leg 0, and each arm runs opposite its
 * own leg, which is what walking is.
 *
 * `g` is the pose machine's business with it: shorter steps, a hip that drops
 * for a careful descent, and a leading arm that reaches forward and down for the
 * ground on a climb. All of it is already blended and eased by the time it gets
 * here, so this stays a pure function of phase.
 */
const CLIMB_REACH_LIMB: Limb = { elbow: [0.115, 0.66], hand: [0.2, 0.52] };

function poseWalk(theta: number, g: GaitMod): Pose {
  const s = Math.sin(theta);
  const arm = (a: number): Limb => {
    const base: Limb = {
      elbow: [0.005 + 0.06 * a, 0.6175 + 0.0025 * a],
      hand: [0.005 + 0.1 * a, 0.475 + 0.005 * a],
    };
    if (g.reach <= 0) return base;
    // Only the arm that is swinging forward reaches for the ground — until the
    // slope is steep enough that the trailing one is helping too.
    const fwd = lerp(Math.max(0, a), 0.35 + 0.65 * Math.max(0, a), g.reachBoth);
    return mixLimb(base, CLIMB_REACH_LIMB, clamp(g.reach * fwd, 0, 1));
  };
  // A careful descent takes the hip down and the shoulders with it: knees bent,
  // centre of gravity low and back over the heels.
  const drop = 0.035 * g.crouch;
  const amp = FOOT_AMP * g.stride;
  const mid = FOOT_MID * g.stride;
  return {
    hip: [0.005, 0.53 - drop],
    sh: [0.048, 0.81 - drop],
    head: [0.068, 0.9 - drop],
    hair: 0.008,
    hairTilt: 0,
    hem: W_HEM - drop,
    feet: [mid + amp * s, mid - amp * s],
    arms: [arm(-s), arm(s)],
  };
}

function mixPt(a: [number, number], b: [number, number], t: number): [number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

function mixLimb(a: Limb, b: Limb, t: number): Limb {
  return { elbow: mixPt(a.elbow, b.elbow, t), hand: mixPt(a.hand, b.hand, t) };
}

function mixPose(a: Pose, b: Pose, t: number): Pose {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    hip: mixPt(a.hip, b.hip, t),
    sh: mixPt(a.sh, b.sh, t),
    head: mixPt(a.head, b.head, t),
    hair: lerp(a.hair, b.hair, t),
    hairTilt: lerp(a.hairTilt, b.hairTilt, t),
    hem: lerp(a.hem, b.hem, t),
    feet: [lerp(a.feet[0], b.feet[0], t), lerp(a.feet[1], b.feet[1], t)],
    arms: [mixLimb(a.arms[0], b.arms[0], t), mixLimb(a.arms[1], b.arms[1], t)],
  };
}

/**
 * The mood posture, applied to whatever pose came out of the machine above.
 *
 * Offsets rather than a keyframe, and the reason is in the MOOD_STOPS comment:
 * a blend toward a static bowed figure would flatten the walk cycle it is meant
 * to be colouring. This returns a NEW pose — the mixers above hand back the
 * shared POSE_STAND object at t <= 0, and writing into that would bow the
 * constant for the rest of the page's life.
 *
 * The look-up is the one thing mood defers to: a man with his head back looking
 * at the masthead is not also bowing, so both channels are scaled out by it.
 */
function applyMood(p: Pose, m: Mood, look: number): Pose {
  const t = m.trudge * (1 - look);
  const r = m.pride * (1 - look);
  if (t <= 0 && r <= 0) return p;
  const dx = TRUDGE_HEAD_FWD * t - PRIDE_HEAD_BACK * r;
  const dy = -TRUDGE_HEAD_DOWN * t + PRIDE_HEAD_UP * r;
  const sx = TRUDGE_SH_FWD * t - PRIDE_SH_BACK * r;
  const sy = -TRUDGE_SH_DOWN * t + PRIDE_SH_UP * r;
  return {
    hip: p.hip,
    sh: [p.sh[0] + sx, p.sh[1] + sy],
    head: [p.head[0] + dx, p.head[1] + dy],
    // The crop rolls forward over the crown as the head goes down, which is what
    // makes a bow read as a bow rather than as a head slid forward.
    hair: p.hair - TRUDGE_HAIR * t,
    hairTilt: p.hairTilt + TRUDGE_HAIR_TILT * t,
    hem: p.hem,
    feet: p.feet,
    arms: p.arms,
  };
}

/**
 * The pose in force. Pure, and called from BOTH the loop (which needs the foot
 * offsets a frame ahead of the draw, to ask the terrain what is under them) and
 * the draw itself — so the feet the ground was sampled at and the feet that get
 * drawn are the same feet by construction.
 *
 * Three keyframes, in the order they override each other: stand → walk by the
 * gait amplitude, → look-up by the reveal (and by the flagpole). Then the mood
 * bows or opens whatever came out. (R1e retired the fourth keyframe, the
 * sit-and-slide; see DESC_ON.)
 */
function poseAt(phase: number, swing: number, look: number, g: GaitMod, m: Mood): Pose {
  const gait = mixPose(POSE_STAND, poseWalk(phase * Math.PI, g), swing);
  return applyMood(mixPose(gait, POSE_LOOKUP, look), m, look);
}

/**
 * The walker, standing on the line.
 *
 * A solid silhouette in ink at a fixed CSS size whatever the camera is doing.
 * Everything that moves is handed in on `pose` or derived from the camera here
 * and now — this function has no memory, so the same state always draws the
 * same figure.
 *
 * The build order is the mockup's, and it matters: limbs first as tapered
 * strokes, then the torso as one filled shape over their roots, then the neck
 * and head. Everything is the same ink, so the unions merge into a single
 * silhouette with no seams to see.
 *
 * FOUR THINGS ARE TRUE OF EVERY FRAME:
 *
 *  1. Each foot stands on the ground at its OWN x — py(the terrain value the
 *     loop sampled there) — not at the walker's. He straddles a dip instead of
 *     falling into it.
 *  2. The hip rides `pose.ride`, the filtered mean of those two, so the body is
 *     suspended over the terrain rather than welded to one point of it. The
 *     lean is applied about the hip, never about the feet, for the same reason:
 *     rotating the figure would lift a planted foot off its own ground.
 *  3. NO LEG IS LONGER THAN LEG_MAX·H. The hip is moved off the pose's height
 *     to whatever nearby height reaches both planted feet, which also quietly
 *     absorbs the suspension's own lag: what used to come out as a stretched
 *     leg on a fast descent now comes out as a crouch, which is what a body
 *     does.
 *  4. He faces the way he is going. At `facing < 0` the whole figure is drawn
 *     in a mirrored frame, so every number below is in TRAVEL space and the
 *     gait, the lean and the pose machine need no cases for walking backward.
 *
 * `paint` is R1e's edge glow: the whole figure is drawn TWICE on a dark frame,
 * once a few per cent larger in warm light and then again in near-black over the
 * top, which leaves a thin lit rim around the silhouette. Same geometry both
 * times — the scale is applied about his ground point, after the origin
 * translate, so his feet do not lift off the terrain in the glow pass.
 */
interface WalkerPaint {
  colour: string;
  scale: number;
  alpha: number;
}

function drawWalker(
  ctx: CanvasRenderingContext2D,
  s: WalkState,
  px: (year: number) => number,
  py: (value: number) => number,
  paint?: WalkerPaint,
): void {
  const { pose, size } = s;

  // The drawn height — the stage's figure through the era curve. Everything
  // below is a fraction of it, so the leg clamp, the foot offsets, the hem and
  // the head all follow the curve for free. The loop places the feet in years
  // off the same number, so the two cannot disagree.
  const H = drawnWalkerH(size.w, s.walker.year);
  const look = clamp(pose.look, 0, 1);
  const swing = clamp(pose.swing, 0, 1);
  const mod = pose.mod;
  const theta = pose.phase * Math.PI;
  const p = poseAt(pose.phase, swing, look, mod, pose.mood);
  const facing = pose.facing < 0 ? -1 : 1;

  // --- the lean ---
  // The slope ahead of him, in screen px per px, smoothed and already signed by
  // `facing` up in the loop: the camera rescales y constantly, so a lean off the
  // raw dollars-per-year would have him bracing against a hill the frame has
  // already flattened — and a lean off the UNSMOOTHED screen slope shook him a
  // degree either way once a frame all the way across the annual era.
  //
  // Everything from here is in the mirrored travel frame, where a positive
  // rotation is always forward.
  //
  // …and normalised for the frame's own aspect first (see LEAN_ASPECT_REF): the
  // same ground on a phone is three times steeper in screen px than on a desktop
  // band, and a posture that changes with the window is not a posture.
  const aspect = size.w > 0 ? s.plotH / size.w : LEAN_ASPECT_REF;
  const leanK = Math.min(1, LEAN_ASPECT_REF / Math.max(aspect, 1e-6));
  let lean =
    clamp(Math.atan(pose.slope * leanK) * SLOPE_LEAN, -SLOPE_LEAN_MAX, SLOPE_LEAN_MAX) +
    mod.lean * leanK;
  // …and the descent's brace, which is a BLEND rather than a second term.
  //
  // R2b added the two together and then clipped the sum at LEAN_BACK_MAX, which
  // is a cap doing the authoring: what a descent actually produced depended on
  // the stage's aspect ratio and on where the clip happened to bite. On a phone
  // in theatre the pair came to about three degrees of back-lean on the opening
  // descent, which is the feel-check's "he floats downhill" in one number. Easing
  // the slope lean TOWARD the authored brace means a committed careful descent
  // produces DESC_LEAN exactly, at every width, and there is no sum left to clip.
  if (mod.brace > 0) lean = lerp(lean, DESC_LEAN, mod.brace);
  // The slope lean is a walking posture: a figure that has stopped stands
  // upright even on a hillside, and the look-up unrolls him completely.
  lean = lean * swing * (1 - look);

  // The bob is the only vertical motion that is not the ground's: highest with
  // the feet together, lowest at double support, gone when he stands.
  // …and a touch more of it after 1947: pride is partly a bounce.
  const bob =
    -BOB * (1 + PRIDE_BOB * pose.mood.pride) * H * Math.cos(2 * theta) * swing * (1 - look);
  const originX = px(s.walker.year);
  const originY = py(pose.ride) + bob;

  const ink = paint ? paint.colour : rgbCss(s.light.ink);
  ctx.save();
  ctx.translate(originX, originY);
  if (paint && paint.scale !== 1) ctx.scale(paint.scale, paint.scale);
  if (paint) ctx.globalAlpha = paint.alpha;
  // He turns around rather than moonwalking. Everything from here is drawn in
  // travel space: +x is the way he is going.
  if (facing < 0) ctx.scale(-1, 1);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const hipX = p.hip[0] * H;
  const hipY0 = -p.hip[1] * H;

  // --- where the feet actually are, before anything is drawn ---
  // Both of them first, because the hip's height is a function of the pair.
  const fx: number[] = [];
  const fy: number[] = [];
  const cyc: number[] = [];
  for (let i = 0; i < 2; i++) {
    const planted = pose.feet[i];
    cyc[i] = Math.max(0, Math.cos(theta + i * Math.PI)) * swing;
    fx[i] = (planted ? planted.dx : p.feet[i]) * H;
    fy[i] =
      py(planted ? planted.value : pose.ride) - originY - FOOT_LIFT * mod.lift * H * cyc[i];
  }

  // --- the leg reach clamp ---
  // The pose puts the hip at hipY0. Both feet have to be reachable from
  // wherever it ends up, and "reachable" is a disc of radius LEG_MAX·H about
  // each foot — which, at a fixed hip x, is an interval of heights. Intersect
  // the two intervals and take the point in it closest to where the pose wanted
  // to be: no crouch at all on level ground, exactly as much as it takes on a
  // slope, and a lift rather than a crouch when he is stepping up onto a shelf.
  const maxR = LEG_MAX * H;
  let hipY = hipY0;
  if (
    Math.hypot(fx[0] - hipX, fy[0] - hipY0) > maxR ||
    Math.hypot(fx[1] - hipX, fy[1] - hipY0) > maxR
  ) {
    let lo = -Infinity;
    let hi = Infinity;
    for (let i = 0; i < 2; i++) {
      const r2 = maxR * maxR - (fx[i] - hipX) * (fx[i] - hipX);
      if (r2 <= 0) {
        lo = NaN;
        break;
      }
      const r = Math.sqrt(r2);
      lo = Math.max(lo, fy[i] - r);
      hi = Math.min(hi, fy[i] + r);
    }
    hipY = Number.isFinite(lo) && lo <= hi ? clamp(hipY0, lo, hi) : (fy[0] + fy[1]) / 2;
  }
  // Belt and braces. The intersection above is exact whenever it exists; this
  // is the one line that makes "no leg is ever longer than LEG_MAX·H" true
  // without an argument, including on ground no camera cap ever allows.
  for (let i = 0; i < 2; i++) {
    const d = Math.hypot(fx[i] - hipX, fy[i] - hipY);
    if (d > maxR) {
      const k = maxR / d;
      fx[i] = hipX + (fx[i] - hipX) * k;
      fy[i] = hipY + (fy[i] - hipY) * k;
    }
  }
  const crouch = hipY - hipY0;
  // A deep crouch packs the torso down as well as riding the lowered hip: the
  // shoulders come TORSO_SQUASH·H closer to the hip on top of the drop itself.
  // Applied as a scale on the y offsets from the hip, so the head stays a
  // circle and simply sits lower.
  const torso = Math.max(p.sh[1] - p.hip[1], 1e-3);
  const ySquash =
    1 - (clamp(Math.abs(crouch) / (TORSO_SQUASH_AT * H), 0, 1) * TORSO_SQUASH) / torso;

  // --- legs: thigh and shin, hip to a planted foot ---
  // The knee sits on the midpoint of hip-to-foot, pushed forward (legs bend
  // that way) and lifted while the leg is swinging through. A crouched hip
  // pushes the knees out further, which is what a bent leg looks like from the
  // side.
  const kneeFwd = KNEE_FWD + clamp(crouch / H, 0, 0.3) * 0.22;
  for (let i = 0; i < 2; i++) {
    const kx = (hipX + fx[i]) / 2 + kneeFwd * H;
    const ky = (hipY + fy[i]) / 2 - KNEE_LIFT * H * cyc[i];
    ctx.lineWidth = W_THIGH * H;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kx, ky);
    ctx.stroke();
    ctx.lineWidth = W_SHIN * H;
    ctx.beginPath();
    ctx.moveTo(kx, ky);
    ctx.lineTo(fx[i], fy[i]);
    ctx.stroke();
  }

  // --- everything above the hip, which is what the slope leans ---
  ctx.translate(hipX, hipY);
  ctx.rotate(lean);
  /** Pose coordinates, now relative to the hip we are rotating about. */
  const P = (dx: number, dy: number): [number, number] => [
    (dx - p.hip[0]) * H,
    -(dy - p.hip[1]) * H * ySquash,
  ];
  const shX = p.sh[0];

  // Arms first, so the torso fill closes over the shoulder joint.
  for (const arm of p.arms) {
    ctx.lineWidth = W_UPPER_ARM * H;
    ctx.beginPath();
    ctx.moveTo(...P(shX, p.sh[1]));
    ctx.lineTo(...P(shX + arm.elbow[0], arm.elbow[1]));
    ctx.stroke();
    ctx.lineWidth = W_FOREARM * H;
    ctx.beginPath();
    ctx.moveTo(...P(shX + arm.elbow[0], arm.elbow[1]));
    ctx.lineTo(...P(shX + arm.hand[0], arm.hand[1]));
    ctx.stroke();
  }

  // The torso: shoulders, a waist that pulls in, and the kurta falling to a
  // knee-length hem that flares past the hip. Four quadratics and a fill.
  //
  // The shoulder line and the hem are read OFF THE POSE (a fixed offset under
  // the shoulder joint, and the pose's own hem) rather than written down as
  // heights above the ground. On the three standing poses that is the same
  // rectangle to within a quarter of a pixel, and reading it off the pose is
  // what lets a crouch take the hem down with the hip.
  const shHalf = W_SH_W / 2;
  const hipHalf = W_HIP_W / 2;
  const flare = hipHalf * W_HEM_FLARE;
  const shTop = p.sh[1] - 0.025;
  const LS: [number, number] = [shX - shHalf, shTop];
  const RS: [number, number] = [shX + shHalf, shTop];
  const LB: [number, number] = [p.hip[0] - flare, p.hem];
  const RB: [number, number] = [p.hip[0] + flare, p.hem];
  ctx.beginPath();
  ctx.moveTo(...P(...LB));
  ctx.quadraticCurveTo(
    ...P((LB[0] + LS[0]) / 2 - 0.014, (LB[1] + LS[1]) / 2),
    ...P(...LS),
  );
  ctx.quadraticCurveTo(...P(shX, p.sh[1] + 0.035), ...P(...RS));
  ctx.quadraticCurveTo(
    ...P((RB[0] + RS[0]) / 2 + 0.014, (RB[1] + RS[1]) / 2),
    ...P(...RB),
  );
  ctx.quadraticCurveTo(...P(p.hip[0], p.hem - 0.025), ...P(...LB));
  ctx.closePath();
  ctx.fill();

  // Neck, head, and a crop of hair — a half-disc a shade wider than the skull,
  // which is the whole haircut. The crop's flat edge is the hairline, and it
  // ROTATES with the skull: sliding it across a level head reads as a man
  // standing straighter, which is what the first look-up did.
  ctx.lineWidth = W_NECK * H;
  ctx.beginPath();
  ctx.moveTo(...P(shX, p.sh[1] - 0.015));
  ctx.lineTo(...P(...p.head));
  ctx.stroke();
  const [hx, hy] = P(...p.head);
  ctx.beginPath();
  ctx.arc(hx, hy, W_HEAD_R * H, 0, Math.PI * 2);
  ctx.fill();
  const [ax, ay] = P(p.head[0] - p.hair, p.head[1] + 0.012);
  ctx.beginPath();
  ctx.arc(ax, ay, W_HAIR_R * H, Math.PI + p.hairTilt, 2 * Math.PI + p.hairTilt);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/* --------------------------------------------------------------- render --- */

/**
 * Pure: same state in, same pixels out. No DOM reads, no time, no globals.
 *
 * The layer order is the mockups' drawFrame, and it is the whole look:
 *
 *   1  sky            three-stop vertical gradient, the colour of the year
 *   2  dawn band      1947 only, a strip of first light on the horizon
 *   3  horizon glow   a radial to the RIGHT — the direction he walks
 *   3b birds          the intro's only, and the list is empty ever after
 *   4  ridges         two parallax bands, decoration, never data
 *   5  fog            straddling the horizon, killing the join
 *   6  the land       THE DATA: sample() from edge to edge, filled to the foot
 *   7  the rim        THE DATA AGAIN: the same edge, lit only where he has been
 *   8  the walker     his own backlight, his lit edge, then the silhouette
 *   9  grain          one overlay pass
 *  10  vignette       not here — a CSS overlay driven by --walk-vig
 *
 * The chart chrome (gridlines, the unit, the year axis, the world) sits between
 * 7 and 8 and does not exist at all before the reveal.
 */
function render(ctx: CanvasRenderingContext2D, s: WalkState): void {
  const { camera: cam, theme, size, light: P } = s;
  const { w, h } = size;
  const plotH = s.plotH;
  const xMax = cam.xMin + cam.xWidth;
  const ySpan = cam.yMax - cam.yMin || 1;

  const px = (year: number) => ((year - cam.xMin) / cam.xWidth) * w;
  const py = (value: number) => plotH - ((value - cam.yMin) / ySpan) * plotH;

  // The horizon is a fixed fraction of the plot, and the fit (FIT_CENTRE) keeps
  // the walked ground below it — so the ridges are always behind the land and
  // the frame keeps its sky. The pull-back is the one exception: it is a chart,
  // not a landscape, and the distance fades out for it (see drawFog and below).
  const horizonY = plotH * HORIZON;

  ctx.clearRect(0, 0, w, h);
  drawSky(ctx, s, horizonY);
  drawBirds(ctx, s);

  const clarity = 1 - s.pull;
  if (s.ridges && clarity > 0) {
    drawRidge(ctx, s.ridges[0], s.scroll, horizonY, P.ridgeFar, clarity, w, h);
    drawRidge(ctx, s.ridges[1], s.scroll, horizonY, P.ridgeNear, clarity, w, h);
  }
  drawFog(ctx, s, horizonY);

  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  const label = `11px ${theme.mono}`;

  // How many years one CURVE_STEP_PX of screen buys at this zoom. Both series
  // are drawn by walking the frame in pixels and asking sample() for the ground,
  // rather than by joining knots: the ground is a cubic, and segments between
  // knots would put back the sawtooth the terrain exists to remove.
  const stepYears = (CURVE_STEP_PX / Math.max(w, 1)) * cam.xWidth;

  /** Append [a, b] of a terrain to the current path. */
  const traceCurve = (t: Terrain, a: number, b: number, move: boolean) => {
    if (move) ctx.moveTo(px(a), py(t.sample(a).value));
    for (let year = a + stepYears; year < b; year += stepYears) {
      ctx.lineTo(px(year), py(t.sample(year).value));
    }
    ctx.lineTo(px(b), py(t.sample(b).value));
  };

  const walked = Math.min(xMax, s.walker.year);

  // --- the land ---
  // Edge to edge, not just as far as he has walked: the world ahead of him is
  // visible as silhouette, and it is only the LIGHT that stops at his feet. Off
  // both ends of the series sample() is flat, so the ground simply continues.
  //
  // Except through the pull-back. The pull-back is a chart, and a chart's area
  // ends where its data ends — the flat extrapolation past the last year put the walker
  // in the middle of a plateau instead of at the end of the line. The tail
  // retracts with the pull, and at pull=1 the ground stops under his feet.
  // …and its COLOUR is the one thing about the land that the pull-back changes.
  // See PULL_LAND: a black mass under a bright edge is a landscape, and the
  // frame the camera arrives at is a chart.
  const landFill = s.pull > 0 ? lerpRgb(P.land, PULL_LAND, s.pull) : P.land;
  if (s.india) {
    const india = s.india;
    const landTo = lerp(xMax, Math.min(xMax, india.last), s.pull);
    ctx.fillStyle = rgbCss(landFill);
    ctx.beginPath();
    ctx.moveTo(0, h + 2);
    traceCurve(india, cam.xMin, landTo, false);
    ctx.lineTo(px(landTo), h + 2);
    ctx.closePath();
    ctx.fill();

    // The strip at the foot the pull-back's year labels live in. Reserved on
    // every frame (see AXIS_BAND) but only PAINTED once there is an axis in it:
    // the land is opaque now, and ink labels on a black landmass are no labels.
    if (s.chrome > 0 && h > plotH) {
      ctx.save();
      ctx.globalAlpha = s.chrome;
      ctx.fillStyle = rgbCss(P.skyLow);
      ctx.fillRect(0, plotH, w, h - plotH);
      ctx.restore();
    }
  }

  // --- chart chrome: NOTHING here exists before the reveal ---
  // Until s.chrome leaves zero the stage carries no axis, no gridline and no
  // unit. The terrain is unexplained ground and the ticking year overhead is
  // the reader's only orientation. This is the mystery the ending pays off.
  //
  // Drawn over the land rather than under it, in the palette's own text ink:
  // by 2022 the sky is TSOI paper and these are hairlines on paper.
  if (s.chrome > 0) {
    ctx.save();
    ctx.globalAlpha = s.chrome;

    /**
     * R2m: THE FURNITURE GETS OUT OF THE WAY OF THE WORDS.
     *
     * The ending is prose over a finished chart, and the chart's hairlines were
     * drawn straight through it: the $10,000 gridline ran across the middle of
     * the ending's second line, and the dashed 1947 vertical crossed the last
     * one. Reported off a phone, and it is the sort of thing that is invisible
     * on a desktop where the same text is a third of the frame wide and the
     * gridlines are further apart.
     *
     * The answer is a SOFT KNOCKOUT and deliberately not a plate. A panel behind
     * the text would be the first opaque box in a piece that has never put one
     * between the reader and the frame; the whole grammar here is words floating
     * IN the picture. So the strokes themselves fade out as they enter the text's
     * band and come back on the other side — a gradient on the stroke, which
     * costs one gradient per line that actually crosses and nothing at all on
     * the frames where no text is up. The chart is still a chart with its scale
     * readable at both ends of every line; it simply stops writing on the
     * sentence.
     *
     * The band is the LATCHED CARD'S OWN BOX, measured in measureCaption like
     * every other box on this stage, so it follows the type scale, the theatre
     * and the wrap without a number here. The sign-off is not in it — it has its
     * own harder rule (see signBox), because a masthead is not a caption.
     */
    const band = s.textBox;
    const softLine = (y: number, base: number): string | CanvasGradient => {
      if (!band || y <= band.top - TEXT_CLEAR || y >= band.bottom + TEXT_CLEAR) {
        return rgba(P.text, base);
      }
      const a = band.left - TEXT_CLEAR - TEXT_FADE;
      const b = band.right + TEXT_CLEAR + TEXT_FADE;
      const g = ctx.createLinearGradient(a, 0, b, 0);
      const t = TEXT_FADE / Math.max(b - a, 1);
      g.addColorStop(0, rgba(P.text, base));
      g.addColorStop(t, rgba(P.text, 0));
      g.addColorStop(1 - t, rgba(P.text, 0));
      g.addColorStop(1, rgba(P.text, base));
      return g;
    };

    // Horizontal gridlines, each carrying its own value.
    const yStep = chooseYStep(cam.yMin, cam.yMax);
    ctx.strokeStyle = rgba(P.text, 0.3);
    ctx.lineWidth = 0.75;
    ctx.font = label;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // The land is opaque, so a value that falls inside it takes the LAND's own
    // resolved ink rather than the sky's: a label is drawn against whatever is
    // behind it, and the two backgrounds here are different objects. (Both inks
    // come out of resolveInk, so this follows the pull-back's lightening of the
    // ground for free — a cream label on a pale fill would be the same bug this
    // rule exists to prevent, just at the other end of the walk.) The ground at
    // the left margin is where they sit, so that is what is asked.
    const labelGround = s.india ? py(s.india.sample(cam.xMin + (8 / Math.max(w, 1)) * cam.xWidth).value) : Infinity;
    for (let v = Math.ceil(cam.yMin / yStep) * yStep; v <= cam.yMax; v += yStep) {
      const y = Math.round(py(v)) + 0.5;
      // The line runs edge to edge, except across the sign-off, where it breaks
      // and leaves the lockup its own air. Nothing else on the stage gets this:
      // a caption is words IN a frame and a hairline behind them is the chart
      // carrying on underneath, but the sign-off is the paper's own masthead and
      // a rule through it is a misprint.
      const gap =
        s.signBox && y > s.signBox.top - SIGN_CLEAR && y < s.signBox.bottom + SIGN_CLEAR
          ? s.signBox
          : null;
      // …and R2m's soft one for the prose. The sign-off's break above is a HARD
      // one and stays hard: it is a masthead, and a rule dissolving into it
      // would read as a printing fault rather than as air. A caption is words in
      // a frame, so the chart carries on underneath and only stops writing
      // across the letters themselves.
      ctx.strokeStyle = softLine(y, 0.3);
      ctx.beginPath();
      if (gap) {
        ctx.moveTo(0, y);
        ctx.lineTo(Math.max(0, gap.left - SIGN_CLEAR), y);
        ctx.moveTo(Math.min(w, gap.right + SIGN_CLEAR), y);
        ctx.lineTo(w, y);
      } else {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
      // The line always; the VALUE only where there is room for it. The
      // pull-back puts the ending's prose in the upper left, which is the same
      // gutter these are set in, and a dollar figure struck through a sentence
      // is worse than a gridline a reader has to count. The neighbours above and
      // below it still carry the scale, and the line itself is untouched.
      const text = dollars(v);
      // …and the same rule against the unit label, which is set on the same left
      // margin at a fixed height. A gridline that lands in the first two lines
      // of the frame would otherwise print its value straight through it.
      if (y - 4 < 22) continue;
      const clash =
        s.capBottom > s.capTop &&
        y - 4 > s.capTop &&
        y - 15 < s.capBottom &&
        8 + ctx.measureText(text).width > s.capLeft &&
        s.capRight > 8;
      if (clash) continue;
      ctx.fillStyle = rgba(y - 4 > labelGround ? P.landText : P.text, P.dimA + 0.2);
      ctx.fillText(text, 8, y - 4);
    }

    // The year axis: labelled majors, a minor tick per decade under them.
    // The stroke is set back explicitly: the loop above may have left a gradient
    // on it, and the ticks live at the foot of the frame where no card ever is.
    const xStep = chooseXStep(cam.xWidth);
    ctx.strokeStyle = rgba(P.text, 0.3);
    ctx.textAlign = 'center';
    ctx.globalAlpha = s.chrome * AXIS_ALPHA;
    for (let year = Math.ceil(cam.xMin / 10) * 10; year <= xMax; year += 10) {
      const x = Math.round(px(year)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, plotH);
      ctx.lineTo(x, plotH + (year % xStep === 0 ? DECADE_TICK * 2 : DECADE_TICK));
      ctx.stroke();
      // A major whose centred text would run off the stage keeps its tick and
      // loses its label: half a "2050" at the edge reads as a glitch.
      if (year % xStep === 0 && x <= w - 15) {
        ctx.fillText(String(year), x, plotH + AXIS_BAND - 3);
      }
    }

    // 1947, named. The one vertical rule in the piece, and the only year the
    // finished chart calls out by itself: a dashed hairline from under its own
    // label down to the ground it stands on, so it stops short of the year axis
    // rather than colliding with the majors along the foot. Drawn in the same
    // ink and at the same alpha as the axis, so it arrives and leaves with the
    // rest of the chrome and never reads as an annotation someone added.
    if (s.india && MARK_YEAR > cam.xMin && MARK_YEAR < xMax) {
      const mx = Math.round(px(MARK_YEAR)) + 0.5;
      const my = Math.min(plotH, py(s.india.sample(MARK_YEAR).value));
      ctx.save();
      ctx.globalAlpha = s.chrome * AXIS_ALPHA;
      // R2m: the same soft knockout, turned on its side. This is the stroke the
      // phone screenshot caught crossing the ending's last line, and it is the
      // worst of them — it is dashed, it is vertical, and it runs straight down
      // through the middle of the frame where every card in the piece is
      // centred.
      const across =
        band && mx > band.left - TEXT_CLEAR && mx < band.right + TEXT_CLEAR
          ? (() => {
              const a = band.top - TEXT_CLEAR - TEXT_FADE;
              const c = band.bottom + TEXT_CLEAR + TEXT_FADE;
              const g = ctx.createLinearGradient(0, a, 0, c);
              const t = TEXT_FADE / Math.max(c - a, 1);
              g.addColorStop(0, rgba(P.text, 0.55));
              g.addColorStop(t, rgba(P.text, 0));
              g.addColorStop(1 - t, rgba(P.text, 0));
              g.addColorStop(1, rgba(P.text, 0.55));
              return g;
            })()
          : rgba(P.text, 0.55);
      ctx.strokeStyle = across;
      ctx.lineWidth = 0.75;
      ctx.setLineDash(MARK_DASH);
      // The sign-off (and R2m's end-card, which reuses its slot) gets the same
      // HARD break the horizontals give it: the masthead rule above says why.
      // The dashed vertical runs down the centre of the frame, which is
      // exactly where that card sits, so without this it wrote through the
      // greeting and the share label.
      const sgn =
        s.signBox && mx > s.signBox.left - SIGN_CLEAR && mx < s.signBox.right + SIGN_CLEAR
          ? s.signBox
          : null;
      ctx.beginPath();
      if (sgn) {
        const gapTop = sgn.top - SIGN_CLEAR;
        const gapBottom = sgn.bottom + SIGN_CLEAR;
        if (gapTop > MARK_LABEL_TOP + 5) {
          ctx.moveTo(mx, MARK_LABEL_TOP + 5);
          ctx.lineTo(mx, Math.min(gapTop, my));
        }
        if (gapBottom < my) {
          ctx.moveTo(mx, gapBottom);
          ctx.lineTo(mx, my);
        }
      } else {
        ctx.moveTo(mx, MARK_LABEL_TOP + 5);
        ctx.lineTo(mx, my);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = rgba(P.text, P.dimA + 0.2);
      ctx.font = label;
      ctx.textAlign = 'center';
      ctx.fillText(String(MARK_YEAR), mx, MARK_LABEL_TOP);
      ctx.restore();
    }

    // The unit, once and quietly, in the corner the terrain never reaches.
    ctx.globalAlpha = s.chrome;
    ctx.textAlign = 'left';
    ctx.font = `10px ${theme.mono}`;
    ctx.fillText(UNIT_LABEL, 8, 14);
    ctx.restore();
  }

  // --- the world average, at the pull-back only ---
  if (s.world && s.pull > 0) {
    ctx.save();
    ctx.globalAlpha = WORLD_ALPHA * s.pull;
    ctx.strokeStyle = WORLD_COLOUR;
    ctx.lineWidth = WORLD_WIDTH;
    ctx.beginPath();
    traceCurve(s.world, s.world.first, s.world.last, true);
    ctx.stroke();
    ctx.restore();
  }

  // --- the rim light: the data line, over walked ground only ---
  // One gradient does the whole job: full strength from the left edge of the
  // frame to wherever he is standing, then out over RIM_LEAD px of lead so the
  // lit end travels with him instead of reading as a wipe. Walk backward and the
  // gradient's end comes back with him, un-lighting the ground he gives back.
  //
  // Pre-1884 the same light is dashed and a shade dimmer: those years are an
  // inference between benchmarks, and the rim is the only place left on the
  // stage that can say so.
  if (s.india) {
    const india = s.india;
    // From the left EDGE of the frame rather than from the first data year: the
    // ground behind him off the left of the series is the flat extrapolation the
    // land is already drawn from, and leaving it unlit opened the piece on a
    // black plateau with no light on it anywhere.
    const from = cam.xMin;
    const litTo = Math.min(xMax, walked);
    if (litTo > from) {
      const endX = Math.min(px(litTo) + RIM_LEAD, w);
      const litX = px(litTo);
      const grad = ctx.createLinearGradient(0, 0, Math.max(endX, 1), 0);
      const stop = clamp(litX / Math.max(endX, 1), 0, 1);
      grad.addColorStop(0, rgba(P.rim, P.rimA));
      grad.addColorStop(stop, rgba(P.rim, P.rimA));
      grad.addColorStop(1, rgba(P.rim, 0));

      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = RIM_WIDTH;
      ctx.lineJoin = 'round';
      ctx.shadowColor = rgba(P.rim, P.rimA);
      ctx.shadowBlur = P.rimBlur;

      // Three stretches, and the middle one is the only firm record: dashes to
      // SOLID_FROM, solid to the start of the estimated tail, dashes again to
      // the end. Same dash and same dimming at both ends, because they are the
      // same statement — the line here is an inference between known values.
      const estFrom = india.estimatedFrom ?? Infinity;
      const dashed = (a: number, b: number) => {
        if (b <= a) return;
        ctx.save();
        ctx.globalAlpha = STEPPING_STONE_DASH_ALPHA;
        ctx.setLineDash(STEPPING_STONE_DASH);
        ctx.beginPath();
        traceCurve(india, a, b, true);
        ctx.stroke();
        ctx.restore();
      };
      const solidFrom = Math.max(from, SOLID_FROM);
      const solidTo = Math.min(litTo, estFrom);
      dashed(from, Math.min(litTo, SOLID_FROM));
      if (solidTo > solidFrom) {
        ctx.beginPath();
        traceCurve(india, solidFrom, solidTo, true);
        ctx.stroke();
      }
      dashed(Math.max(from, estFrom), litTo);
      ctx.restore();
    }
  }

  // --- the flagpole, which is the one object the reader touches ---
  // Drawn before the walker, so he can stand in front of it. (It used to be
  // drawn after two decorative props as well, so that its flag was never under
  // one; R2l retired both — see the mast's note.)
  if (s.india && s.pull < 1 && s.walker.year >= GATE_YEAR) {
    const propK = widthScale(w);
    const gapYears = w > 0 ? ((PROP_GAP * propK) / w) * cam.xWidth : 0;
    const at = GATE_YEAR - gapYears;
    if (at >= cam.xMin - cam.xWidth * 0.1 && at <= xMax + cam.xWidth * 0.1) {
      ctx.save();
      ctx.translate(px(at), py(s.india.sample(at).value));
      ctx.scale(propK, propK);
      drawMast(ctx, P, s.hoist, s.flagWave, PROP_ALPHA * (1 - s.pull));
      ctx.restore();
    }
  }

  // --- the world mark, high overhead ---
  // R1e restyle: a small star with a glow around it, the way the reveal frame in
  // the mockups has it, rather than a dash-and-chevron off a chart. It still says
  // "further up than this frame reaches" — the chevron survives, because that is
  // information and not decoration.
  //
  // R2e moves it onto the pull-back and colours it TEAL. Both follow from the
  // same fact: it is the world average, the world average is a comparison series,
  // and this site draws a comparison series in --tsoi-color-chart-2 wherever it
  // appears (see WORLD_COLOUR, which the track and its end label already use).
  // Drawing the mark in the palette's warm rim was R1e's landscape logic — a
  // point of light in a sky — and it made the one glimpse of the world look like
  // part of the weather rather than like the second line of a chart.
  //
  // The mark and the track are two views of one value, so the mark SETTLES ONTO
  // the track as the camera arrives. Its floor, its dodge around the caption and
  // its own label all fade out with the pull; at pull = 1 the star is sitting on
  // the end of the teal line, which the chart's own "World" label names.
  if (s.world && s.mark > 0) {
    const value = s.world.sample(s.world.last).value;
    const trueY = py(value);
    // How far the camera has got toward a frame with the world's endpoint
    // actually in it, by whichever of the two levels is further along. R2e had
    // only the pull; R2f's vertical lift reaches the same place first and by a
    // shorter road, and both of the rules below are about a mark PARKED in a
    // frame that cannot hold it. Once either level has arrived, the mark's real
    // position is its position.
    const settle = Math.max(s.pull, s.lift);
    // The floor is where the mark is parked while the true value is off the top
    // of the frame, and it relaxes to nothing across the flight. Math.max keeps
    // the whole thing continuous: the moment the moving camera brings the real
    // position below the (shrinking) floor, the real position is what is drawn,
    // and the star has travelled there rather than jumped.
    let y = Math.max(trueY, h * WORLD_MARK_TOP * (1 - settle));
    // …and out of the prose. The mark arrives while the reveal's caption is on
    // the sky, and on a tall stage the world's true height lands inside it —
    // a star, a label and a chevron drawn through five lines of italic.
    //
    // The dodge is DOWNWARD, and that is the only direction it can be. The
    // chevron means "the true value is further up than this", so drawing the
    // mark BELOW where it belongs keeps the sentence true and only understates
    // it; clamping it up into the clear sky above the caption would be the
    // frame telling a lie in the reader's favour. So when the drawn position
    // falls anywhere in the caption's box, the star drops to just under it,
    // clear by its own radius, and the chevron comes on to say so.
    // The dodge fades out with the pull for the same reason the floor does: it
    // is a rule about a mark parked in open sky, and once the star is on the
    // line the line is where it has to be, caption or no caption.
    if (s.capBottom > s.capTop && settle < 1) {
      const clear = WORLD_STAR_R + 4;
      if (y > s.capTop - clear && y < s.capBottom + clear) {
        y = lerp(s.capBottom + clear, y, settle);
      }
    }
    // …and the LATCHED card is not dodged at all, which is the release-day
    // correction. R2m put a second dodge here against the live card's box: the
    // words are a card now, up precisely when the lift has arrived (settle = 1,
    // the dodge above dead), and on a tall stage the world's true height lands
    // inside the sentence that names it. Dodging worked and read wrong — the
    // reader watches the mark slide down as the sentence about it arrives, and
    // a mark that gives way to prose is a chart moving a value to make room for
    // a caption. So the mark now holds its ground and the SENTENCE moves: `y`
    // is published to the loop, which pushes the card clear of it (wordsShift).
    // The caption-band dodge above stays as it is — that one is about a mark
    // parked in a frame that cannot hold it, which is a different rule.
    s.worldMarkY = y;
    const x = px(s.walker.year);
    ctx.save();
    ctx.globalAlpha = s.mark;
    const star = ctx.createRadialGradient(x, y, 0, x, y, WORLD_STAR_R);
    star.addColorStop(0, rgba(WORLD_RGB, 0.7));
    star.addColorStop(1, rgba(WORLD_RGB, 0));
    ctx.fillStyle = star;
    ctx.beginPath();
    ctx.arc(x, y, WORLD_STAR_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = WORLD_COLOUR;
    ctx.beginPath();
    ctx.arc(x, y, WORLD_STAR_CORE, 0, Math.PI * 2);
    ctx.fill();
    if (trueY < y - 1) {
      ctx.strokeStyle = rgba(WORLD_RGB, 0.8);
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - WORLD_CHEVRON_W / 2, y - WORLD_CHEVRON_GAP);
      ctx.lineTo(x, y - WORLD_CHEVRON_GAP - WORLD_CHEVRON_H);
      ctx.lineTo(x + WORLD_CHEVRON_W / 2, y - WORLD_CHEVRON_GAP);
      ctx.stroke();
    }
    // The mark's own label hands over to the chart's. At pull = 1 the star sits
    // on the end of the world track, which already carries a "World" end label
    // eight pixels to its left; two names on one point is a misprint.
    if (s.pull < 1) {
      ctx.globalAlpha = s.mark * (1 - s.pull);
      ctx.fillStyle = rgba(P.text, P.textA);
      ctx.font = `10px ${theme.mono}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('the world', x + WORLD_STAR_R + WORLD_MARK_LABEL_GAP, y);
    }
    ctx.restore();
    ctx.lineCap = 'butt';
    ctx.textBaseline = 'alphabetic';
  }

  // --- the walker, standing on the line, carrying his own light ---
  // He LEAVES with the pull-back, and release morning is when that reversed:
  // every round to here kept him at full opacity on the reasoning that the
  // reader who has been this figure for four centuries does not get dismissed
  // at the end — and the device pass answered it. At the full 1600–2026 frame
  // he is a speck ("an ant") standing on a finished chart, which reads as a
  // smudge on the line rather than as a figure, so the flight that turns the
  // world into a chart is also the one that lets him go: gone by two-thirds
  // of the pull, and walking back brings him back the same way. The shrink
  // stays underneath the fade — while he IS visible mid-flight his feet must
  // not straddle thirty years of the chart (see PULL_WALKER_SCALE).
  const walkerX = px(s.walker.year);
  const shrink = 1 - (1 - PULL_WALKER_SCALE) * s.pull;
  const presence = 1 - smoothstep(clamp(s.pull / 0.66, 0, 1));
  if (presence > 0.001) {
    drawBacklight(ctx, s, walkerX, py(s.pose.ride));
  }
  drawDust(ctx, s, px, py);
  const edge = P.backlight * (1 - s.pull);
  if (presence > 0.001 && edge > 0.001) {
    drawWalker(ctx, s, px, py, {
      colour: `rgba(${EDGE_GLOW_RGB},1)`,
      // R2m: the rim goes down with him. The glow pass is the whole figure a few
      // per cent larger with the silhouette drawn over it, so a rim drawn at
      // full size around a figure at a quarter of it is not a rim — it is a
      // second, larger, lit walker with a speck standing in him.
      scale: EDGE_GLOW_SCALE * shrink,
      alpha: EDGE_GLOW_ALPHA * edge * presence,
    });
  }
  if (presence > 0.001) {
    drawWalker(ctx, s, px, py, {
      colour: rgbCss(s.light.ink),
      scale: shrink,
      alpha: presence,
    });
  }

  // --- end labels, once there are two lines to tell apart ---
  if (s.pull > 0) {
    ctx.save();
    ctx.globalAlpha = s.pull;
    ctx.font = label;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    const endLabel = (t: Terrain | null, text: string, colour: string, lift: number) => {
      if (!t) return;
      const [year, value] = t.points[t.points.length - 1];
      ctx.fillStyle = colour;
      ctx.fillText(text, px(year) - END_LABEL_GAP, py(value) - lift);
    };
    // Both sit above their own endpoint. India's endpoint has the walker
    // standing on it, so that label clears his head rather than his shins.
    endLabel(s.world, 'World', WORLD_COLOUR, END_LABEL_LIFT);
    endLabel(
      s.india,
      'India',
      rgbCss(P.rim),
      END_LABEL_LIFT + drawnWalkerH(w, s.walker.year) * shrink,
    );
    ctx.restore();
  }

  // Grain is NOT here. It is .walk-grain in independence.astro — one tiled PNG
  // with mix-blend-mode: overlay, handed to the compositor once. On canvas it was
  // one 'overlay' fillRect across the whole frame per frame, and the measured
  // cost of that one call on a CPU-rastered 390x844 stage at dpr 2 was half the
  // frame budget (74ms/frame with it, 39ms without, at 4x throttling). Same
  // picture, none of the per-frame cost.
  //
  // R2h gives it an era, and that does not change the sentence above: its
  // STRENGTH is --walk-grain, an opacity on a layer that is already composited,
  // written by publishLight on the frames the light moves and never touched on
  // the ones it does not.
}

/* ----------------------------------------------------------------- init --- */

/**
 * Mount the walk on a .walk-stage element. EVERYTHING the engine drives is
 * inside that element now: a .walk-canvas box with a <canvas> in it, a
 * .walk-cards overlay with one .walk-card.is-beat per caption year plus the
 * reveal's card and the ending's three parts, the two .walk-whisper lines, the
 * .walk-rope hit zone, the .walk-live region, and the control row —
 * .walk-back, .walk-fwd, the .walk-year readout, the .walk-era ribbon and
 * .walk-restart. R2b had the last five in a band of page furniture outside the
 * stage and this module reached out to the enclosing .walk-frame for them;
 * nothing does that any more, and --walk-foot is published on the stage itself.
 *
 * The stage is an ordinary block in normal document flow. Nothing here reads or
 * writes the page's scroll position, and the only preventDefault in the file is
 * on the two horizontal arrows and on the two walk buttons' own pointerdown.
 */
export function initWalk(stage: HTMLElement): void {
  const box = stage.querySelector<HTMLElement>('.walk-canvas');
  const canvas = stage.querySelector<HTMLCanvasElement>('canvas');
  if (!box || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const yearEl = stage.querySelector<HTMLElement>('.walk-year');
  const eraSlots = Array.from(stage.querySelectorAll<HTMLElement>('.walk-era span'));
  const cardsBox = stage.querySelector<HTMLElement>('.walk-cards');
  // Document order, and it is the deck's order: the twelve beats, the reveal's
  // two parts, the ending screen, and — from a slot of its own outside the
  // block — the sign-off. See CAPTION_YEARS / REVEAL_CARDS / END_CARDS.
  const cards = Array.from(stage.querySelectorAll<HTMLElement>('.walk-card'));
  /** R2f: the lines inside each card, per card, for the sequential fade. Most
   *  cards have none and get an empty list, which is what makes startLines a
   *  no-op everywhere except the two cards that are built out of sentences. */
  const lineSets = cards.map((el) => Array.from(el.querySelectorAll<HTMLElement>('.walk-line')));
  // The twelve year-driven beats, in CAPTION_YEARS order, and the four the
  // ending owns. Split by the class rather than by index arithmetic so a card
  // added to the deck without a year in the table cannot silently shift the
  // ending's.
  const beatCards = cards.filter((el) => el.classList.contains('is-beat'));
  const ropeHintEl = stage.querySelector<HTMLElement>('.walk-whisper-rope');
  const tapHintEl = stage.querySelector<HTMLElement>('.walk-whisper-tap');
  const freshBtn = stage.querySelector<HTMLButtonElement>('.walk-poster-fresh');
  const ropeEl = stage.querySelector<HTMLElement>('.walk-rope');
  const liveEl = stage.querySelector<HTMLElement>('.walk-live');
  const restartBtn = stage.querySelector<HTMLButtonElement>('.walk-restart');
  /**
   * R2m's end-card, which is the deck's last card with three controls in it.
   *
   * R3 had a ROW of two text links along the bottom edge of the pulled-back
   * frame, gated by syncControls, plus a floating lockup in the middle of it.
   * There is nothing left to gate: the card IS the offer, it is latched by the
   * deck like every other card, and everything in it comes and goes with it.
   *
   *  · `endCardEl` — the card, which takes focus when it opens.
   *  · `endThumb` — the picture of what `Share this card` would send. Its src is
   *    set once, from data-src, when the pull-back starts. See the markup.
   *  · `shareBtn` — the action; `sendLink` is the download it falls back to,
   *    kept as the anchor it has always been.
   *  · `endCloseBtn` — the ✕ that puts the card away and leaves the film.
   */
  const endCardEl = stage.querySelector<HTMLElement>('.walk-endcard');
  const endThumb = stage.querySelector<HTMLImageElement>('.walk-endcard-thumb');
  const endCloseBtn = stage.querySelector<HTMLButtonElement>('.walk-endcard-close');
  const shareBtn = stage.querySelector<HTMLButtonElement>('.walk-share');
  const sendLink = stage.querySelector<HTMLAnchorElement>('.walk-send');
  // R2g: the two floating hints, which are all that is left of R2d's hold bar.
  // They label the stage's own halves rather than a strip of chrome along the
  // foot of the film, and they are not controls — the zones under them are (see
  // ZONE_SPLIT and the stage's pointerdown).
  const hintEls = Array.from(stage.querySelectorAll<HTMLElement>('.walk-hint'));
  const posterEl = stage.querySelector<HTMLElement>('.walk-poster');
  const exitBtn = stage.querySelector<HTMLButtonElement>('.walk-exit');
  /** R2g: the way IN to the theatre, offered only where the theatre is not the
   *  default — see `coarse`. */
  const fullBtn = stage.querySelector<HTMLButtonElement>('.walk-full');
  const playBtn = stage.querySelector<HTMLButtonElement>('.walk-play');
  const stampEl = stage.querySelector<HTMLElement>('.walk-foot');

  let india: Terrain | null = null;
  let world: Terrain | null = null;
  // The frame the pull-back arrives at. Null until the data lands, which is
  // what makes the pull-back a no-op on an empty stage.
  let reveal: Camera | null = null;
  let theme = readTheme(stage);
  let size: Size = { w: 0, h: 0, dpr: 1 };
  let plotH = 1;
  let ridges: Ridge[] | null = null;

  /* -- the light -- */
  // One palette object, rewritten in place every frame from the walker's year,
  // and the last values published to the DOM so the overlay's colour follows the
  // sky without the loop touching the stage's style sixty times a second.
  const light = blankPalette();
  let cssText = '';
  let cssDim = '';
  let cssStamp = '';
  let cssStampDim = '';
  let cssLand = '';
  let cssLandDim = '';
  let cssHalo = '';
  let cssStampHalo = '';
  let cssVig = -1;
  /** The foot readout's opacity, which is 1 - pull: the year and the era ribbon
   *  dissolve as the x-axis that replaces them arrives underneath. */
  let cssFoot = -1;

  /* -- the dust -- */
  const dust: Dust[] = [];

  /* -- the opening (R2g) -- */
  /** The birds. Spawned once by the bloom and never refilled; empty for every
   *  frame of the walk, which is what makes drawBirds free. */
  const birds: Bird[] = [];
  /** The global multiplier over the composed light. INTRO_EXPOSURE on the dark
   *  poster, 1 once the bloom has arrived, and 1 for the rest of the page. */
  let exposure = INTRO_EXPOSURE;
  /** …and the bloom's own progress, 0-1, which is what the SWEEP is a function
   *  of: `exposure` is the whole thing as one number and the gate on the pass,
   *  and this is the clock each band reads with its own lead subtracted. Held at
   *  1 past the bloom, so a restart is the only thing that puts it back. */
  let bloomP = 0;
  /** How much of the date stamp has arrived, 0-1. Folded into --walk-foot with
   *  the pull-back's own dissolve, so the readout has one opacity and not two. */
  let stampIn = 0;
  /** Whether the bloom is running, and when it started.
   *
   *  The flag is not redundant with the clock, and finding that out cost a
   *  probe: the reduced-motion path backdates the start by the whole duration so
   *  the next frame reads as finished, and a page pressed inside the first
   *  BLOOM_MS of its own life backdates it to a NEGATIVE performance.now() — at
   *  which point a `bloomT0 > 0` test says the bloom is not running and the film
   *  stays dark for ever. Ask the flag; the clock is only ever arithmetic. */
  let blooming = false;
  let bloomT0 = 0;
  /** True once the bloom has finished. A walk that has already been begun does
   *  not replay it — leaving the theatre and pressing the poster again resumes
   *  the film, and the opening belongs to a fresh walk. `restart` puts it back. */
  let introDone = false;
  /** Where the runway starts: the world's left wall, west of 1600. Resolved from
   *  the stage's own width (see armRunway) and frozen once the walk begins. */
  let runwayFrom = STOPS[0].year;
  /** Whether the two mid-screen hints are on the sky, and whether they have been
   *  retired for the life of the page. */
  let hintsUp = false;
  let hintsRetired = false;

  /* -- the drive -- */
  // `latch` is the one card the STAGE forces on rather than the year: the
  // reveal's or the pull-back's, or -1 for none, in which case the sky is the
  // twelve beats' to fade in and out of (see paintCards).
  // `armed` is the disarm rule, and the end of the series is the only thing left
  // that disarms it. (1947 CLAMPS the walk but does not disarm it: the reader's
  // hold is what raises the flag, so it must keep meaning something.)
  /**
   * Where in the piece the reader is. R2f adds `lift` between the reveal and the
   * pull-back, and the four of them are the four stages the back control steps
   * through (see stepBack):
   *
   *   walk → reveal (part one, two lines) → lift (level 1: the vertical crane,
   *   part two's words, the mark) → pull (level 2: the full frame, the ending
   *   screen, the sign-off)
   *
   * A camera ride and the phase it belongs to are NOT the same thing, and the
   * back controls are why: stepping back out of level one sets the phase to
   * 'reveal' immediately and then runs `lift` down to zero underneath it, so the
   * gaze lowers and the mark fades while the camera is still coming home.
   */
  type Phase = 'walk' | 'reveal' | 'lift' | 'pull';
  let phase: Phase = 'walk';
  let latch = -1;
  /**
   * Which part of the ENDING is on the sky. See END_CARDS and endingPress().
   *
   * `partAt` — when it arrived — went with END_PART_MIN_MS in R2m. It existed
   * for one reader: the one who double-tapped while the ending ran itself. There
   * is nothing left running for a press to arrive in the middle of, so there is
   * nothing to time.
   *
   * -1 is "the pull-back has arrived and the sky is empty". 0 is the ending
   * screen; 1 is the end-card. Both are presses since R2m — the camera used to
   * bring the first of them in at PULL_CARD_AT of the flight — and -1 is a
   * sentinel rather than a third entry in END_CARDS because it is not a card.
   *
   * It survives the end-card being CLOSED (see the ✕): closing takes the latch
   * off and leaves this at its last index, which is what makes "the piece has
   * finished" and "the card is on the stage" two different questions and lets a
   * forward press summon it back.
   */
  let endPart = -1;
  let era = -1;
  let eraSlot = 0;
  let year = STOPS[0].year;
  let armed = false;

  /**
   * Where the walk ends. NOT a year written down anywhere: it is the last year
   * the series actually contains, read off the data when it lands. Until then it
   * holds the table's own last row so a failed fetch still leaves a sane camera.
   * Everything keyed to the end of the walk — the arrival, the clamp, the big
   * year readout, the reveal frame — goes through this and cannot drift apart
   * from the numbers.
   */
  let endYear = STOPS[REVEAL_STOP].year;

  /* -- the hoist -- */
  // Page-lifetime once it ARRIVES: at 1 the gate is gone for good and the dawn
  // stays. Below 1 it is the reader's hands and nothing else, so walking back out
  // of the gate lowers it again (see HOIST_LOWER_MS). A reload starts the story
  // over, which is right — the flag is worth raising once per reading.
  let hoist = 0;
  /** When it reached 1, so the walk can wait a beat before going on. */
  let hoistDoneAt = 0;
  /** Downward drag banked since the last frame, CSS px. */
  let dragPx = 0;
  let dragId = -1;
  let dragY = 0;
  /** ArrowUp, held. */
  let hoistKey = false;
  /** An ABANDONED hoist on its way back down: when the lowering started and what
   *  it started from. 0 means nothing is being lowered. See HOIST_LOWER_MS. */
  let lowerT0 = 0;
  let lowerFrom = 0;
  /** A reduced-motion reader's one-shot: any forward input completes it. */
  let reducedHoisting = false;
  /** Time spent at the pole making no progress, and whether the rope has been
   *  offered yet. The offer retires permanently on the first progress. */
  let gateIdleMs = 0;
  let ropeHinted = false;
  let ropeRetired = false;
  /** The ending's own version of the pair above: time an ending frame has stood
   *  settled with nothing pressed, and whether "tap to go on" is currently up.
   *  Release weekend retires the retirement: the whisper used to die for good
   *  on the first ending press, and the field said the frames AFTER that one
   *  went back to being unexplained. Now every settled ending frame re-offers
   *  it; a press hides it and resets the clock rather than ending it.
   *  `tapTaught` only remembers whether the offer has ever been made, so the
   *  first one keeps its reading-length patience and the reminders come
   *  quicker (see END_REHINT_MS). `tapHideT` is the fade-out's timer, held so
   *  a re-offer landing inside the 400ms fade does not have its `hidden` set
   *  out from under it. */
  let endIdleMs = 0;
  let tapHinted = false;
  let tapTaught = false;
  let tapHideT = 0;

  /* -- the carry (release weekend) -- */
  /** Whether the engine is holding the walk forward on the reader's behalf —
   *  the ▷ at the foot of the frame, R2b's autopilot returned as an offer.
   *  The whole mode is one entry in `inputs` under the id 'play': the ramps,
   *  the checkpoints and the famine trudge treat it as the thumb it stands in
   *  for. What does NOT: any manual press ends it (see pressInput), and the
   *  gate's hoist never counts it (see manualDir), so the carry stands at the
   *  pole until the reader answers. See startPlay / stopPlay. */
  let playing = false;
  /** The carried reader's answer at the gate: a tap while the carry stands at
   *  the pole runs the hoist over HOIST_TAP_MS. Cleared when the flag reaches
   *  the masthead, and whenever the carry itself ends. */
  let carryHoisting = false;

  /* -- the way in, and the way out (R2d) -- */
  /** Whether the reader has entered the film. Before this the stage is a POSTER:
   *  the 1600 frame at its in-flow size, the bar hidden and one word on the sky.
   *  It goes back to false on the way out, so the poster is also the way back
   *  in — and the film keeps its year across the round trip. */
  let started = false;

  /* -- the walk, surviving the browser (release morning) -- */
  /**
   * A locked phone or a navigation away can cost the page its life, and a
   * five-minute walk that restarts from Akbar's court every time the screen
   * goes dark is a film almost nobody finishes. So the year is BANKED — on
   * every hide and pagehide, into sessionStorage, which is exactly the scope
   * this wants: it survives the tab being discarded and restored, and it dies
   * with the tab, so tomorrow's visit starts at the poster like everyone
   * else's. On a reload with a banked walk the poster's word becomes "resume
   * the walk" and a real button under it offers the decline; the first press
   * then opens at the banked year with the flag wherever the reader left it.
   * A walk banked from inside the ending resumes just west of the arrival, so
   * a short hold brings the reveal again rather than dropping the reader into
   * the middle of a press-chain they have lost the thread of. Nothing else is
   * banked: cards re-light off the ground as they always did.
   */
  const RESUME_KEY = 'tsoi-walk-resume';
  let pendingResume: { y: number; h: number } | null = null;

  function saveResume(): void {
    if (!started) return;
    // …but only for a walk that is still IN PROGRESS, which is the whole point
    // of the bank. A reader who has been shown the greeting has finished the
    // piece: there is nothing to resume, and banking their last year offered
    // them "resume the walk" and then put them down two years short of an
    // arrival they had already made — the ending re-firing after a three-second
    // hold, which reads as the film having forgotten they got there. They get
    // the poster's ordinary "begin the walk" instead.
    //
    // The second clause is the reader who finished and then walked BACK into
    // the piece to re-read a card: they are mid-walk again, and their walk is
    // worth banking exactly like anyone else's.
    if (seenSignoff && !(phase === 'walk' && year < endYear - 2)) {
      clearResume();
      return;
    }
    try {
      sessionStorage.setItem(
        RESUME_KEY,
        JSON.stringify({ y: Math.min(year, endYear - 2), h: hoist >= 1 ? 1 : 0 }),
      );
    } catch {
      /* storage full or forbidden: the reader just gets a fresh walk */
    }
  }

  function clearResume(): void {
    pendingResume = null;
    try {
      sessionStorage.removeItem(RESUME_KEY);
    } catch {
      /* nothing to clear */
    }
    if (posterEl) posterEl.textContent = 'begin the walk';
    if (freshBtn) freshBtn.hidden = true;
  }
  /** Whether the stage is currently the whole viewport. Not the same question as
   *  `started` for exactly one frame at each end, and not the same question as
   *  document.fullscreenElement ever: real fullscreen is an enhancement on top
   *  of this and may simply be refused. */
  let theatre = false;
  /** The page's scroll, banked on the way in and put back on the way out. The
   *  stage leaves normal flow in theatre, which shortens the document under a
   *  locked body. */
  let scrollLock = 0;
  /**
   * WHERE THE FILM PLAYS, and R2g splits it by form factor.
   *
   * R2d made the theatre the answer everywhere: one press and the stage becomes
   * the viewport. On a phone that is plainly right — the in-flow deck is a
   * postcard and the walk is a landscape — and on a desktop it is plainly wrong,
   * because a 27-inch takeover for a piece the reader arrived at by scrolling an
   * article is a modal, and the article's own column already gives the film a
   * frame the size of a film.
   *
   * The test is the PRIMARY pointing device rather than the width, and that is
   * the deliberate choice: `(pointer: coarse)` is true for a phone and a tablet —
   * both of which want the takeover — and false for a mouse or a trackpad,
   * including on a touch laptop, whose primary device is the trackpad and whose
   * screen is a desktop screen. A touch laptop therefore gets the in-frame walk
   * with the ⛶ sitting in the corner, which is the right offer to make it: the
   * theatre is one tap away rather than imposed.
   *
   * Read once. A reader who plugs in a mouse mid-walk is not a case worth a
   * listener.
   */
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  /** Whether the poster is currently wanted on the stage. See showPoster. */
  let posterWanted = false;
  /** Whether the live region is currently announcing the gate. */
  let announcing = false;
  /** Last written position of the rope's hit box, so it is not re-laid out on a
   *  frame where it has not moved. */
  let ropeX = NaN;
  let ropeY = NaN;

  /* -- the checkpoints -- */
  /** The cap in force this frame, published to the probe. 1 is no cap.
   *
   *  R2b deleted the dwell that used to sit beside it, and with it the
   *  bookkeeping that stopped a reader rocking across one year from
   *  re-triggering it. There is nothing left to re-trigger: the cap is a pure
   *  function of where he is standing, so it is already symmetric, already
   *  identical walking back, and has no state to get wrong. */
  let capK = 1;
  /** …and R2d's reading trudge on its own, published to the probe beside it so
   *  the two MIN terms can be told apart from outside. */
  let readK = 1;
  /** …and R2i's dwell, which is the fourth term with its own ease under it: the
   *  cap the words are asking for, approached rather than jumped to. Unlike the
   *  other three this one carries state, and the state is one number. */
  let dwellK = 1;
  /** Whether the walker actually covered ground on the last frame — the drive's
   *  own `driving`, published out of the loop because the deck needs it (see the
   *  card clock's suspension in paintCards). Not the same question as `speedK >
   *  0`: a walker held against the runway wall or the flagpole is pressing and
   *  going nowhere, and for the card clock's purposes he is standing still. */
  let walkerMoving = false;

  /* -- the tap step -- */
  /** How long a tapped step has left to hold itself down for, and which button
   *  is holding it. */
  let stepLeft = 0;
  let stepId = '';
  /** When each control went down, so a release can tell a tap from a hold. */
  const downAt = new Map<string, number>();

  /* -- the caption's box -- */
  // Measured off the DOM rather than assumed, because the world mark has to
  // dodge it at the reveal and the block's height is whatever the longest card
  // wraps to at this width. The cards are stacked in one grid cell and the
  // hidden ones still take their space, so this is a constant of the layout: it
  // is read on resize and after the webfonts land, never in a frame.
  let capTop = -1;
  let capBottom = -1;
  let capLeft = -1;
  let capRight = -1;
  /**
   * …and each CARD's own box inside that cell, which is a different question and
   * is the one the ink resolution asks. The cell is as tall as the longest card
   * in the deck and every title card sits at the top of it, so the sky behind
   * "the caption" and the sky behind the caption BLOCK are two different
   * colours. Measured here for the same reason the block is — it is a constant
   * of the layout, read on resize and after the webfonts land, never in a frame.
   *
   * The x is in it because the horizon glow is a radial to the RIGHT of the
   * frame: how much of it is behind the words depends on where across the stage
   * they are, and the ending's parts are not where the beats are.
   */
  const cardBox = cards.map(() => ({ x: 0, top: 0, bottom: 0, left: 0, right: 0 }));
  /** …and R2d's date stamp, which is a third box in a third piece of sky. Same
   *  constant-of-the-layout rule: read on resize and after the webfonts land,
   *  never in a frame. Falls back to the top twelfth of the stage if the element
   *  is missing, which is roughly where it sits. */
  const stampBox = { x: 0, top: 0, bottom: 0 };

  function measureCaption(): void {
    const b = stage.getBoundingClientRect();
    if (stampEl && b.height > 0) {
      const s = stampEl.getBoundingClientRect();
      stampBox.x = (s.left + s.right) / 2 - b.left;
      stampBox.top = s.top - b.top;
      stampBox.bottom = s.bottom - b.top;
    }
    if (!cardsBox) return;
    const a = cardsBox.getBoundingClientRect();
    capTop = a.top - b.top;
    capBottom = a.bottom - b.top;
    capLeft = a.left - b.left;
    capRight = a.right - b.left;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i].getBoundingClientRect();
      cardBox[i].x = (c.left + c.right) / 2 - b.left;
      cardBox[i].top = c.top - b.top;
      cardBox[i].bottom = c.bottom - b.top;
      cardBox[i].left = c.left - b.left;
      cardBox[i].right = c.right - b.left;
    }
  }

  /** The mood in force, rewritten in place from the year every frame. */
  const mood: Mood = { ...MOOD_NEUTRAL };

  /**
   * Held inputs, newest last. Speed is a property of the walk and not of the
   * input, so three fingers and a key held at once is still exactly one walking
   * pace — but they may now disagree about the DIRECTION, and the newest press
   * is the one that means it. Re-pressing an id that is already down moves it to
   * the end rather than adding a second entry.
   */
  interface Input {
    id: string;
    dir: number;
  }
  const inputs: Input[] = [];
  const heldDir = () => (inputs.length ? inputs[inputs.length - 1].dir : 0);
  /** …and the newest input the READER is holding, the carry's engine-owned
   *  hold excluded. The gate reads this one: the eight-second creep answers a
   *  patient thumb, and the carry has no patience to offer — a carried walk
   *  stands at the pole until the reader raises the flag themselves (a tap,
   *  the rope, or the key). */
  const manualDir = () => {
    for (let i = inputs.length - 1; i >= 0; i--) {
      if (inputs[i].id !== 'play') return inputs[i].dir;
    }
    return 0;
  };
  function addInput(id: string, dir: number): void {
    const i = inputs.findIndex((x) => x.id === id);
    if (i >= 0) inputs.splice(i, 1);
    inputs.push({ id, dir });
  }
  function dropInput(id: string): void {
    const i = inputs.findIndex((x) => x.id === id);
    if (i >= 0) inputs.splice(i, 1);
  }

  // The reveal and the two camera levels are the only wall-clock motion in the
  // file, and all of it is authored one-shots rather than anything scrubbed.
  let revealT0 = 0;

  /**
   * The two camera rides, and both are run the same way so that FORWARD and BACK
   * are one code path rather than two.
   *
   * A ride is (A → B) over its own duration: `lift` eases from liftA to liftB
   * across LIFT_MS from liftT0, and `pull` from pullA to pullB across
   * PULLBACK_MS from pullT0. Going forward is (0 → 1) and stepping back is
   * (1 → 0); interrupting one starts a new ride from wherever the value had got
   * to, so nothing ever jumps. A reader who has asked for less motion gets every
   * ride as a cut by the file's usual trick — the clock is backdated by the
   * whole duration, so the very next frame reads as finished with no second code
   * path anywhere.
   *
   * `liftFrom` and `pullFrom` are the camera each ride starts from, and
   * `liftCam` is level one's target: the frame it started in with its top opened
   * up until the world's endpoint is in it. Computed at the press rather than
   * with the reveal frame, because it is a fact about where he is standing.
   */
  let lift = 0;
  let liftT0 = 0;
  let liftA = 0;
  let liftB = 0;
  /** …and how long the ride in force has, which is the authored length normally
   *  and RIDE_SNAP_MS when a press has asked it to finish. */
  let liftMs = LIFT_MS;
  let liftFrom: Camera | null = null;
  let liftCam: Camera | null = null;
  let pull = 0;
  let pullT0 = 0;
  let pullA = 0;
  let pullB = 0;
  let pullMs = PULLBACK_MS;
  let pullFrom: Camera | null = null;
  // Leaving the reveal by walking back out of the end: the moment the exit began
  // and what the chrome had reached by then, so it fades from where it was
  // rather than from full. There is no exiting mark any more — the mark belongs
  // to the pull-back now, and the pull-back cannot be walked out of.
  let exitT0 = 0;
  let exitChrome = 0;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  /** Headless-probe hook, ?probe only. Never true on the published page. */
  const probing = new URLSearchParams(window.location.search).has('probe');

  /* -- momentum -- */
  /**
   * He has weight now. A press ramps the drive from 0 to full over ~350ms and a
   * release lets it down over ~250ms, so a hold starts as a lean into the walk
   * rather than as a step function — and because the stride cadence is driven by
   * GROUND COVERED, the legs pick up and wind down with it for free.
   *
   * `driveDir` is the direction the ramp is running in, which is not the same as
   * the direction being held: on a turn he finishes stopping in the old
   * direction before the new one starts.
   */
  let speedK = 0;
  let driveDir = 0;
  /**
   * …and the turn itself. Changing direction at speed is three beats — brake to
   * a stop, a beat of standing still while he comes round, then accelerate — and
   * it exists because the alternative reads as a glitch: mirroring the figure
   * mid-stride teleports his feet, and tweening the mirror through zero folds him
   * into a vertical line on the way past.
   */
  type Turn = 'none' | 'brake' | 'hold';
  let turn: Turn = 'none';
  let turnDir = 0;
  let turnLeft = 0;

  /** Ground travelled under him since load, CSS px, signed. Only the parallax
   *  ridges read it. */
  let scroll = 0;
  let prevCamX = 0;

  // The gait integrates, so it lives here rather than in render(): the stride
  // phase is a running total of ground covered and the two amplitudes are
  // eases, none of them recoverable from the walker's year alone.
  let stridePhase = 0;
  let swing = 0;
  let look = 0;
  let prevYear = year;
  // Which way he is pointing. He keeps facing the way he last walked when he
  // stops, which is what a person does.
  let facing = 1;
  // The suspension's filtered ride height, in the terrain's own units. NaN
  // until the first frame has two feet to average, which is what makes the
  // first frame a snap rather than a fall from zero.
  let ride = NaN;
  /** …and the terrain's own slope under him, filtered on the same constant.
   *  This is the ride filter's feed-forward term, in value per year. */
  let slopeVal = 0;

  /* -- the pose machine's own state -- */
  // The screen slope under him, low-passed: read raw it flickers between modes
  // once a frame on the annual era's gouges, and a mode that flickers is worse
  // than no mode at all. Roughness gets the same treatment.
  let slopeS = 0;
  let roughS = 0;
  // The eased mode weights. Every one of them is a blend amount, and every
  // change of mode is those numbers moving over TAU_MODE.
  let mClimb = 0;
  let mClimbHard = 0;
  let mDesc = 0;
  let mRough = 0;
  let gait: GaitMod = { ...GAIT_NEUTRAL };
  const cam: Camera = { xMin: 0, xWidth: 1, yMin: 0, yMax: 1 };
  // Until the first frame there is nothing to ease FROM, so the first frame
  // snaps the camera onto its targets instead of flying in from zero. Reduced
  // motion and start-over set it again, which is exactly the hard cut.
  let primed = false;

  /* -- sizing -- */
  /**
   * How far west of 1600 the walk starts, resolved from the stage's own size.
   *
   * The runway is authored in SECONDS of walking (RUNWAY_SECONDS) and every
   * width walks the same span of years at a different px-per-year, so the length
   * in years is a function of the box. It is re-resolved on every resize until
   * the walk begins — entering the theatre is a resize, and the runway should be
   * three seconds long in the frame it is actually walked in — and frozen from
   * the first press onward, so a rotation mid-walk can never move the wall the
   * walker is standing on.
   *
   * THE GUARD IS `introDone` AND NOT `started`, and the difference is a bug that
   * cost a probe. Until R2j, leaving the theatre on a coarse pointer put
   * `started` back to false — the poster was the way back in — and it resizes the
   * box on the way out, so a `!started` guard re-armed the runway and PUT THE
   * READER BACK AT 1568 having walked to 1580. R2j's exit keeps the walk going
   * and no longer clears `started`, so that particular trap is closed at the
   * other end too; the guard stays as it is because the question it is really
   * asking has not changed. It is "has the opening happened yet", which is what
   * `introDone` means, and `restart` is still the one thing that answers it no a
   * second time — deliberately, so that starting over re-arms the runway in the
   * box the reader is actually in.
   *
   * A reader who has asked for less motion gets a fixed short one: their press
   * is a cut to the next beat, so the runway is a place to stand rather than
   * ground to cover, and it exists only so their first press is what lights the
   * first card.
   */
  function armRunway(): void {
    if (started || introDone) return;
    // The span the runway is actually walked in, which since R2j is the authored
    // first row through the trailhead ease (see TRAILHEAD_FRAC) rather than the
    // row itself. Read at 1600 because the runway is clamped ground west of it
    // and the ease is flat there.
    const span = spanAt(STOPS[0].year);
    const years = reduceMotion.matches
      ? RUNWAY_REDUCED_YEARS
      : size.w > 0
        ? (RUNWAY_SECONDS * WALK_SPEED_PX_S * widthScale(size.w) * span) / size.w
        : RUNWAY_REDUCED_YEARS;
    runwayFrom = STOPS[0].year - Math.max(RUNWAY_REDUCED_YEARS, years);
    year = runwayFrom;
    prevYear = year;
  }

  function resize(): void {
    measureCaption();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = box!.clientWidth;
    const h = box!.clientHeight;
    // A strip at the foot for the year labels the pull-back brings. Reserved
    // always, so the ground does not shift when the axis arrives.
    plotH = Math.max(h - AXIS_BAND, 1);
    if (w === size.w && h === size.h && dpr === size.dpr) return;
    size = { w, h, dpr };
    // R2m: THE DECK'S TYPE SCALE, and it is published from here because it is a
    // fact about the STAGE rather than about the viewport. The film has two
    // homes — the article's column and the theatre — and on a desktop they are
    // hundreds of pixels apart at the same viewport width, so a media query
    // would size the words for a box the words are not in. One property write
    // per resize, read by a clamp() in the stylesheet; nothing per frame, and
    // measureCaption() above has already re-read the boxes the ink resolution
    // depends on. Unitless, so the CSS can do arithmetic on it.
    stage.style.setProperty('--walk-stage-w', String(Math.round(w)));
    canvas!.width = Math.round(w * dpr);
    canvas!.height = Math.round(h * dpr);
    canvas!.style.width = `${w}px`;
    canvas!.style.height = `${h}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The ridge bands are shapes in px, so they are rebuilt with the box and
    // never inside a frame.
    ridges = w > 0 && h > 0 ? buildRidges(w, plotH) : null;
    // …and the runway is measured in seconds, so it belongs to the box too.
    // No-ops the moment the walk has begun.
    armRunway();
    // …and once more, because the property written above CHANGED THE TYPE. The
    // measure at the top of this function read the deck at the old scale; the
    // caption boxes are what the ink is resolved against and what the world mark
    // dodges, so they have to be read after the size the cards are actually set
    // at. Still not in a frame: this runs on resize and nowhere else.
    measureCaption();
  }

  /**
   * The frame the whole piece has been withholding: both series end to end at
   * one scale, from a zero baseline. Derived from the data, computed once when
   * it lands — it must not be a magic rectangle that quietly stops matching the
   * series after a Maddison update.
   */
  function computeReveal(): Camera | null {
    if (!india) return null;
    const xMin = india.first - REVEAL_PAD_LEFT_YEARS;
    const xMax = xMin + (india.last - xMin) / REVEAL_END_FRAC;
    let peak = 0;
    for (const [, v] of india.points) if (v > peak) peak = v;
    if (world) for (const [, v] of world.points) if (v > peak) peak = v;
    return {
      xMin,
      xWidth: Math.max(xMax - xMin, 1),
      yMin: 0,
      yMax: peak > 0 ? REVEAL_PAD_TOP * peak : 1,
    };
  }

  /**
   * LEVEL ONE's frame: the one he is standing in, with the ceiling raised.
   *
   * x is copied across untouched — that is the whole character of the ride, and
   * it is why the ground under his feet does not move while the sky opens above
   * it. yMin is untouched too, so nothing is cropped off the bottom. What moves
   * is yMax, and it moves exactly far enough to put the world's last value
   * LIFT_MARK_HEAD of the plot down from the top: solve for the span that does
   * that and the mark lands high in the frame at any stage height, on any
   * series, without a pixel constant anywhere in it.
   *
   * Null when there is no world series to crane up to, in which case the press
   * has nothing to do and the piece goes straight on (see press()).
   */
  function computeLift(from: Camera): Camera | null {
    if (!world) return null;
    const top = world.sample(world.last).value;
    if (!(top > from.yMin)) return null;
    const yMax = from.yMin + (top - from.yMin) / (1 - LIFT_MARK_HEAD);
    // A frame that already holds the world's endpoint has nothing to open up,
    // and shrinking it would be a zoom IN rather than a crane.
    if (yMax <= from.yMax) return null;
    return { xMin: from.xMin, xWidth: from.xWidth, yMin: from.yMin, yMax };
  }

  /** Years across the stage at a given point on the walk: the stop table,
   *  interpolated along the leg the walker is on, and then R2j's trailhead ease
   *  over the top of it (see TRAILHEAD_FRAC). */
  function spanAt(at: number): number {
    return authoredSpanAt(at) * trailheadK(at);
  }

  /**
   * The walking frame, given where the walker actually is.
   *
   * x is the authored span with the walker on his anchor. y is fitted to the
   * terrain inside that window, and the fit puts the low and the high of that
   * ground at FIT_BOTTOM and FIT_TOP of the plot, so the terrain always has real
   * amplitude instead of flattening out on a quiet leg.
   *
   * R1e widened the fit from the WALKED window to the VISIBLE one, and that is a
   * change of rule rather than of number, so it is worth being explicit about.
   *
   * Until R1e the ground stopped dead at the walker: nothing ahead of him was
   * drawn, and the fit read only what he had covered — "the undrawn future must
   * not dictate the frame". The re-lit stage draws the whole landmass edge to
   * edge and lets the LIGHT stop at his feet instead, which is the thing that
   * makes it a world rather than a chart. With the old fit that world fell off a
   * cliff: from 1600 to 1750 the walker stood on a plateau whose far edge
   * dropped out of the bottom of the frame, because the ground he could see was
   * an order of magnitude outside the range the camera had been scaled to.
   *
   * So the fit now reads what is on screen. What it costs is that a big climb
   * flattens the ground a little as it scrolls into view; what it buys is that
   * the picture is always a landscape and never a precipice. Nothing about the
   * mystery changes: the frame names nothing, and the ground ahead was already
   * being drawn.
   */
  function frameFor(at: number): Camera {
    const xWidth = spanAt(at);
    const xMin = at - ANCHOR_X * xWidth;
    const xMax = xMin + xWidth;
    if (!india) return { xMin, xWidth, yMin: 0, yMax: 1 };
    const { min, max } = india.extent(
      clamp(xMin, india.first, india.last),
      clamp(xMax, india.first, india.last),
    );
    // A dead-flat window has no range to fit, so give it one rather than
    // dividing the frame by zero.
    const range = max - min > 1e-6 ? max - min : Math.max(Math.abs(max) * 0.1, 1);
    let span = range / (FIT_BOTTOM - FIT_TOP);

    // …and then the steepness cap. The band fit is a ratio and knows nothing
    // about how big the range it is stretching actually is, so on the annual
    // era's one-year wiggles it hands back a cliff. Ask the ground how steep it
    // gets on SCREEN, and if that is past the cap, widen the value span until
    // it is not. Widening is the same picture at a smaller vertical scale: no
    // dip is cropped, smoothed or moved.
    //
    // The cap reads the same visible window the fit does, for the same reason.
    const drawnTo = Math.min(xMax, india.last);
    if (size.w > 0 && drawnTo > xMin) {
      const pxPerYear = size.w / Math.max(xWidth, 1e-6);
      const stepYears = SLOPE_PROBE_PX / Math.max(pxPerYear, 1e-6);
      let steepest = 0;
      // The grid is anchored to ABSOLUTE years, not to the window's left edge
      // — and the step itself is quantized to quarter-years so the anchor is
      // real. Release morning's fix, found on a device as "the ground shakes
      // at the end of the walk": with the grid starting at xMin, every frame
      // of camera drift slid the whole sampled set against the annual era's
      // kinks, so `steepest` alternated between catching and missing the 2020
      // cliff, the capped span flipped between two answers, and the entire
      // terrain rescaled a few percent per frame. Anchored and quantized, the
      // sampled positions are identical from frame to frame; they change only
      // at the window's edges, or when the zoom crosses a quarter-year of
      // probe spacing — single steps the camera ease absorbs.
      const step = Math.max(0.25, Math.round(stepYears * 4) / 4);
      const gridFrom = Math.max(xMin, india.first);
      for (let y = Math.ceil(gridFrom / step) * step; y <= drawnTo; y += step) {
        const g = Math.abs(india.sample(y).slope);
        if (g > steepest) steepest = g;
      }
      if (steepest > 0) {
        // px per dollar the cap allows, versus what the band fit is asking for.
        const capScale = (SLOPE_MAX_SCREEN * pxPerYear) / steepest;
        const fitScale = plotH / span;
        if (fitScale > capScale) span = plotH / capScale;
      }
    }

    // Placed rather than bottom-anchored, so a span the cap has widened opens
    // out both above and below the ground instead of pushing it up the frame.
    // FIT_CENTRE is where the middle of the visible ground sits down the plot.
    const centre = (min + max) / 2;
    const yMin = centre - (1 - FIT_CENTRE) * span;
    return { xMin, xWidth, yMin, yMax: yMin + span };
  }

  function mixFrames(a: Camera, b: Camera, t: number): Camera {
    return {
      xMin: lerp(a.xMin, b.xMin, t),
      xWidth: lerp(a.xWidth, b.xWidth, t),
      yMin: lerp(a.yMin, b.yMin, t),
      yMax: lerp(a.yMax, b.yMax, t),
    };
  }

  /* -- the cards and the furniture -- */

  /**
   * The stage's own card: one of the reveal's two parts, one of the ending's
   * four, or -1 for none, in which case the sky belongs to the twelve beats and
   * their distance fade. These six are latched because none of them is a place
   * on the walk — one arrives on a clock and the other five on presses.
   */
  function showCard(i: number): void {
    // R2m: the end-card is the one card in the deck with focusable things in
    // it, so it is the one card that can be taken off the stage with the
    // reader's focus inside it. Whatever takes it off — the ✕, a backward
    // press, `start over` — hands focus back to the stage first, or the next
    // Tab starts from a detached point in the page and the arrow keys go to a
    // button that is no longer visible.
    if (latch === SIGNOFF_CARD && i !== SIGNOFF_CARD && endCardEl?.contains(document.activeElement)) {
      stage.focus({ preventScroll: true });
    }
    latch = i;
    // Release day: the stage knows when the greeting is up, so narrow screens
    // can put a veil over the settled chart under it — at a phone's size the
    // lockup, the thumbnail, two actions and the whole revealed picture in one
    // small frame read as commotion. Toggled here rather than in the open/close
    // pair because every path that changes the latch runs through this call.
    stage.classList.toggle('has-sign', i === SIGNOFF_CARD);
    for (let k = 0; k < cards.length; k++) cards[k].classList.toggle('is-shown', k === i);
    // R2f took the two block-level classes off this function, and that is the
    // FLICKER FIX rather than a tidy-up. They were set on the same call that
    // latched the incoming card, which is to say while the outgoing one was
    // still fading: .is-wide changed the block's measure, so the sentence
    // dissolving in it re-wrapped from three lines to five under the reader's
    // eye, and .is-signoff moved the block from 20% of the stage to 50%, so the
    // last ending line slid down the frame on its way out. Both were reflows
    // under a live card, which is why the opacity trace was clean and the reader
    // still saw text jump.
    //
    // Neither class exists now. The block's geometry is a constant, the MEASURE
    // belongs to the card (.walk-card.is-prose), and the colophon has a place on
    // the stage of its own (.walk-signoff) instead of dragging the deck to it.
    // Nothing this function does can lay out a card that is not the one being
    // latched.
    startLines(i);
  }

  /* -- the sequential fade -- */
  /**
   * The lines of the card the stage has just latched, and when each of them goes
   * up. Two cards have them — reveal part one and the ending screen — and every
   * other card in the deck has none, in which case there is nothing to schedule
   * and this is a loop over an empty list.
   *
   * The timers are the only setTimeouts in the ending, and they are cancelled by
   * anything that changes the latch, so a reader pressing back through the piece
   * cannot leave a line arriving on a card that has gone.
   */
  const lineTimers: number[] = [];
  let lineRaf = 0;
  /** The lines of the latched card, or an empty list. */
  let liveLines: HTMLElement[] = [];
  /**
   * R2m: WHEN THE STAGE THE SLOT IS IN STARTED, and how long its own fade runs
   * for. 0 for "nothing is fading".
   *
   * The schedule used to be the answer to both questions — a stage began when
   * its timer fired and the next timer was already armed behind it — and with
   * the timers gone the press gate needs to know one thing the latch cannot
   * tell it: whether the dissolve the reader is looking at has FINISHED. A press
   * inside it completes it as a cut (R2l's rule, kept exactly); a press after it
   * advances the sequence. Without this the two are indistinguishable and the
   * reader either cannot cut a fade or cannot advance past a finished one.
   */
  let lineAt = 0;
  let lineMs = 0;
  /** Which STAGE of the dissolve the card is in, counted as "how many lines have
   *  had the slot": 1 means the first line is up, 2 means the second has replaced
   *  it, and `liveLines.length` means the last one is up and the card is done.
   *  The press gate reads it — a press with stages still to come advances the
   *  sequence instead of turning the page. */
  let linesUp = 0;

  function clearLineTimers(): void {
    for (const t of lineTimers) window.clearTimeout(t);
    lineTimers.length = 0;
    if (lineRaf) cancelAnimationFrame(lineRaf);
    lineRaf = 0;
  }

  /**
   * Put a card's slot into stage `k` — line k up, every other line down — with
   * every transition on the card suppressed, so the change is a CUT and not a
   * dissolve. `k < 0` empties the slot, which is how a card is reset before it is
   * shown again.
   *
   * Three callers, and all of them need it to be a cut for the same reason: a
   * line's own multi-second ease running at the same time as its card's 220ms one
   * is two fades on one piece of text.
   *
   * The forced layout read in the middle is what makes it a cut rather than a
   * suggestion: .is-cut takes the transition off, the read commits the new
   * opacity under it, and putting the class back cannot start a transition
   * because there is no longer a change left to transition.
   */
  function cutLines(card: HTMLElement | null, lines: HTMLElement[], k: number): void {
    if (!lines.length) return;
    card?.classList.add('is-cut');
    for (let j = 0; j < lines.length; j++) {
      // …and a line the target is standing INSIDE stays up with it: the
      // ending's last stage is a coda nested in the line it follows, so
      // lighting the coda must not put out the sentence it belongs to. For
      // every card in the deck but that one this is exactly `j === k`.
      lines[j].classList.toggle('is-up', j === k || (k >= 0 && lines[j].contains(lines[k])));
      // The slow arrival belongs to the first line and only while it is arriving.
      if (j !== k || k !== 0) lines[j].classList.remove('is-slow');
    }
    if (card) {
      void card.offsetHeight;
      card.classList.remove('is-cut');
    }
  }

  /**
   * The dissolve itself: take the slot from whatever stage it is in to stage `k`,
   * as two crossing fades. The outgoing line loses .is-slow FIRST, so that a
   * first line which arrived over LINE_IN_MS leaves over the ordinary
   * cross-dissolve and the two halves of the swap are the same length.
   */
  function dissolveTo(k: number): void {
    for (let j = 0; j < liveLines.length; j++) {
      // Same rule as cutLines': the line the incoming one is nested in stays.
      if (j === k || liveLines[j].contains(liveLines[k])) continue;
      liveLines[j].classList.remove('is-slow');
      liveLines[j].classList.remove('is-up');
    }
    liveLines[k].classList.add('is-up');
    if (linesUp < k + 1) linesUp = k + 1;
  }

  function startLines(i: number): void {
    clearLineTimers();
    liveLines = i >= 0 ? lineSets[i] : [];
    linesUp = 0;
    lineAt = 0;
    lineMs = 0;
    if (!liveLines.length) return;
    // The INCOMING card's lines are reset here and nowhere else, and the reset is
    // a cut taken while that card is still at zero — stepping back onto a card
    // has to find it as new as it was the first time. The OUTGOING card's lines
    // are deliberately left alone: it is fading out on its own transition and
    // taking its lines down separately would put a second, slower fade under a
    // card that is already leaving. (Traced: it showed up as a 0.006 wobble on a
    // line caught mid-rise by the press that took its card away.)
    cutLines(cards[i], liveLines, -1);
    // One frame in the tree at zero before the class, or the first line has
    // nothing to transition from and simply appears — the same rule the poster
    // and the rope's whisper are held to. A reader who has asked for less motion
    // has no transition to give it anyway, and takes the same path: the schedule
    // is the same, and the stylesheet turns every stage of it into a cut.
    const first = liveLines[0];
    first.classList.add('is-slow');
    lineRaf = requestAnimationFrame(() => {
      lineRaf = 0;
      if (liveLines[0] !== first || linesUp > 0) return;
      first.classList.add('is-up');
      linesUp = 1;
      // The first line's own arrival is the one thing in the ending that is not
      // a press: it is what the press that turned to this card BOUGHT. Stamped
      // here rather than above so the clock starts when the fade does.
      armLine(LINE_IN_MS);
      wake();
    });
    // …and NOTHING is scheduled behind it. R2m: every stage after the first is a
    // press (see advanceLines and endingPress). The card arrives, says one
    // sentence, and waits — which is the same contract the twelve beats have had
    // since R2g and the only one the ending did not.
  }

  /**
   * The LAST line, at once and as a cut, with the whole schedule cancelled — the
   * card's finished state. What stepping BACK onto a card the reader has already
   * read does, and nothing else: a dissolve cannot be "completed" the way a stack
   * could, because the stages in between are sentences and jumping to the end of
   * the sequence would lose them. A press part-way through advances one stage
   * instead (see advanceLines).
   */
  function completeLines(): void {
    clearLineTimers();
    if (!liveLines.length) return;
    cutLines(latch >= 0 ? cards[latch] : null, liveLines, liveLines.length - 1);
    linesUp = liveLines.length;
    lineAt = 0;
    lineMs = 0;
  }

  /** Start the clock on a stage of the slot. A reader who has asked for less
   *  motion gets ZERO, and that is not a shortcut: their stage arrived as a CUT
   *  (the stylesheet takes the transition off), so there is no fade for a press
   *  to land inside, and arming a clock they cannot see would spend one of their
   *  nine presses cutting something that had already finished. Measured: without
   *  this the reduced-motion chain took twelve presses to the end-card. */
  function armLine(ms: number): void {
    lineAt = performance.now();
    lineMs = reduceMotion.matches ? 0 : ms;
  }

  /** Is the stage the slot is in still fading? Bounded by construction — the
   *  longest fade in the piece is LINE_IN_MS — which is what lets the loop's
   *  settle test wait on it without waiting on the reader. */
  function lineFading(): boolean {
    return lineMs > 0 && lineAt > 0 && performance.now() - lineAt < lineMs;
  }

  /** …and the press gate's narrower version of the same question: is the fade
   *  still young enough that a press should cut it rather than advance? The
   *  loop waits on the whole fade; the reader only on the part that reads as
   *  motion. See LINE_CUT_FRAC. */
  function lineCutting(): boolean {
    return lineMs > 0 && lineAt > 0 && performance.now() - lineAt < lineMs * LINE_CUT_FRAC;
  }

  /**
   * …and what a forward press on a card built out of lines does. R2m makes it
   * the whole of the sequence rather than an interruption of one.
   *
   * TWO ANSWERS, and which one the reader gets is whether the fade they are
   * looking at has finished:
   *
   *  · MID-FADE — the press means "get on with it". The stage completes AS A
   *    CUT, exactly as R2l had it, and the press is consumed by that. Nobody is
   *    made to wait out a fade they have asked to skip, and nobody can use a
   *    press to jump a sentence they have not been shown.
   *  · SETTLED — the press turns to the next line, as the ordinary
   *    cross-dissolve at its authored LINE_UP_MS. This is the stage R2l ran on a
   *    timer and R2m hands to the reader.
   *
   * LINE_HOLD_MS has no job left here and is not read: it was the pause between
   * a line finishing and the schedule taking it away, and there is no schedule.
   * The hold is now however long the reader looks at the sentence.
   *
   * Returns false when the press belongs to the page turn instead.
   */
  function advanceLines(): boolean {
    if (!liveLines.length || linesUp <= 0) return false;
    if (lineCutting()) {
      cutLines(latch >= 0 ? cards[latch] : null, liveLines, linesUp - 1);
      lineAt = 0;
      lineMs = 0;
      return true;
    }
    if (linesUp >= liveLines.length) return false;
    dissolveTo(linesUp);
    armLine(LINE_UP_MS);
    return true;
  }

  /** Is the latched card still speaking? True while any of its lines has yet to
   *  have had the slot, and while the stage it is in is still arriving — the
   *  press gate's whole question, and the reason a press at the last line's own
   *  fade cuts it rather than turning the page. */
  function linesPending(): boolean {
    // The press window, not the loop's: a press in the settled-looking tail of
    // the LAST line's fade turns the page rather than dying on an invisible
    // cut — the same dead tap the first line had, at the other end of the card.
    return linesUp < liveLines.length || lineCutting();
  }

  /** Last opacity written per beat card, so a frame that changes nothing writes
   *  nothing. Rounded to a hundredth: below that is not a visible step and is
   *  not worth a style invalidation. */
  const cardA = beatCards.map(() => -1);
  /** The distance fade for every card this frame, before the queue. Reused
   *  rather than reallocated: paintCards runs every frame. */
  const raw = beatCards.map(() => 0);
  /**
   * R2g's queue, and it is four numbers and two flags per card.
   *
   *  · `cardDue` — the walker has entered this card's ground and it has not had
   *    its turn on the sky yet. Set the frame he crosses the year, cleared when
   *    it takes the sky, and cleared for free if he walks back off the beat.
   *  · `cardSpoken` — it has HAD its turn. Kept so that a card whose ground the
   *    walker is still standing on does not immediately queue itself again, and
   *    cleared the moment he steps back before its year, which is the gesture a
   *    reader makes when they want to read it again.
   *  · `speaker` — the one card on the sky, or -1 for empty sky. Every other
   *    beat card is at zero by construction: this is the "never two cards lit"
   *    invariant, and it is now a fact about the machinery rather than a clamp.
   *  · `speakerAt` — when it took the sky, and 0 for a card that was RE-LIT by
   *    the walker wandering back into its own fade rather than released from the
   *    queue. A re-lit card carries no wall clock: it is the distance fade's, the
   *    way it was in R2c.
   *  · `speakerFullAt` — when it first reached CARD_FULL_AT, which is when the
   *    floor's clock starts. 0 while it is still rising.
   *  · `skyClearAt` — when the sky last went empty, so the breath can be
   *    measured. Zeroed rather than stamped when the reader takes a card off by
   *    walking back, because that is not a card finishing.
   */
  const cardDue = beatCards.map(() => false);
  const cardSpoken = beatCards.map(() => false);
  let speaker = -1;
  let speakerAt = 0;
  let speakerFullAt = 0;
  /**
   * Release day: whether the speaker's own GROUND has finished arriving — the
   * walker is at or past the end of the beat's rise — since it took the sky.
   * The floor's ease may not begin before this is true. (Measured off the
   * walker's position rather than off the fade touching 1, because a card the
   * queue releases late is already past its plateau and its fade will never
   * touch 1 again — a guard waiting on the value would keep that card on the
   * sky for good.)
   *
   * The bug it closes is the read-pause's other end. A reader stops inside a
   * led card's rise, reads, and walks on; the resume below credits the pause
   * against the floor (correctly — the sentence was read), which parks the
   * card at the top of its ease. But the walker is still inside the beat's own
   * two-year rise, so the composite's other term — the distance fade — is low,
   * and the ease dives the sentence from full to wherever the half-risen
   * ground happens to be before the ground climbs it back up. On the stage:
   * the text a reader just finished goes out under them and comes straight
   * back. Traced at 1615: alpha 1.00 → 0.34 → 0.95 inside a second.
   *
   * The rule was always meant to be "the ease hands over to the ground": the
   * monotone note on speakerAlpha assumes the rise ends at 1 before the floor
   * lets go. This makes that assumption a fact — the wall clock's term holds
   * at full until the ground is actually there to take the card, and the
   * handover happens at 1 exactly, whatever the two clocks did in between.
   */
  let speakerGroundFull = false;
  let skyClearAt = 0;
  /** When the gate started taking the sky off a card that is not Nehru's, and 0
   *  when it is not — see GATE_FADE_MS. */
  let gateFadeAt = 0;
  /**
   * R2m, AND IT IS THE LEAD'S ONE BUG: when the speaker's wall clock was
   * stopped, and 0 while it is running.
   *
   * R2j made a card DUE a few years before its beat so the dwell's budget is
   * spent astride the year rather than entirely after it (see CARD_LEAD). A led
   * card therefore rises while the walker is still short of the beat — and
   * `raw` is zero before the beat, because the distance fade is asymmetric by
   * design and a card that has not happened yet is not on the sky. So for those
   * few years the card is being carried by the wall clock ALONE.
   *
   * Which is fine while the reader is walking, and wrong the moment they stop.
   * Reported at Jallianwala: the card rises, the reader releases to read it,
   * five and a bit seconds later the floor expires, the composite falls to
   * max(0, expired floor) — and the sentence VANISHES off the sky under them,
   * mid-read, and comes back only when they walk on. A card the reader is
   * standing still in front of is the one card that must not be on a timer.
   *
   * So the wall clock is the WALKER'S clock while he is short of the beat: it
   * runs while he is driving, and it stops while he is not. Implemented as a
   * suspension rather than a floor, because a floor would hold the card at full
   * and then drop it to wherever the expired clock had got to the instant he
   * moved again. This holds the clock still and hands the card back exactly the
   * life it had left.
   *
   * Two things it deliberately is not:
   *
   *  · It is NOT a rule about reading. Past the beat the ground is under the
   *    words and the distance fade is the whole answer, exactly as it was — a
   *    reader parked east of a beat still watches the card go, because that is
   *    the piece's own rule about how long an event stays in the sky.
   *  · It is NOT a claim on the loop. The deck reports itself IDLE while the
   *    clock is stopped (see cardsBusy), so a reader parked in front of a led
   *    card lets the stage fall asleep under a card at full, which is the
   *    cheapest frame in the piece rather than an unbounded raf.
   */
  let cardHoldAt = 0;
  /** …and whether any of that is still on a clock, which the loop's settle test
   *  reads. Written by paintCards, never anywhere else. */
  let cardsBusy = false;
  /** Whether there are words on the sky at all, which the drive's cap reads —
   *  see the fourth MIN term in capK. Written by paintCards, never anywhere
   *  else. */
  let wordsUp = false;
  /** …and whether those words are a QUEUED card still rising or still inside its
   *  wall-clock floor, which is the window the ground is held across (see the
   *  dwell). A re-lit card is never dwelt on: `speakerAt === 0` is a reader
   *  browsing ground they have already walked. */
  let dwelling = false;

  /**
   * The alpha of the card currently holding the sky: the louder of its distance
   * fade and its wall-clock life. A card released from the queue rises over
   * CARD_RISE_MS, holds at full until CARD_FLOOR_MS has passed since it first got
   * there, and then eases off over CARD_FLOOR_EASE_MS — but the distance fade is
   * maxed in the whole way, so a card whose ground is still under the walker is
   * governed by the ground, exactly as it was in R2c, and the wall clock only
   * shows where the ground has run out from under the words.
   *
   * A RE-LIT card (speakerAt === 0) has no wall clock at all — see the queue's
   * note above.
   *
   * R2M: A QUEUED CARD RISES ON ITS OWN FADE, FULL STOP — the distance fade is
   * no longer maxed into the RISE at all. R2l made beat 0 an exception to that
   * max(); R2m's first pass made 1947 a second one; the measurement then said
   * the rule itself was the bug rather than the list of exceptions.
   *
   * What the max() did was this: a card the queue releases LATE — one whose
   * ground the walker covered while the previous card was still speaking, which
   * on this deck is 1615, 1876 and anything after a crowded pair — has a
   * distance fade already sitting at 1 when it is handed the sky. max(d, rise)
   * is therefore 1 on its first frame, and the card CUTS. Measured on a
   * continuous hold: 1615's authored rise was 0ms and 1876's was 117, against
   * 867 for the beats that arrived on time. That is exactly the "the 1615 card
   * pops" the device feel-check reported, and no amount of lengthening
   * CARD_RISE_MS could ever have reached it.
   *
   * So the three states are now clean and each answers one question:
   *
   *  · speakerAt === 0 — a RE-LIT card, walked back into. The ground is the
   *    whole rule, exactly as it was in R2c. No wall clock, no authored fade:
   *    that reader is browsing and the fade is the one their feet are making.
   *  · rising — the AUTHORED fade alone (CARD_RISE_AT, per beat). The card is
   *    arriving, and how it arrives is a decision the piece has made.
   *  · past full — max(distance fade, floor), unchanged in every respect. This
   *    is where the ground has to win: a card whose beat is still under the
   *    walker must not be taken off by a clock.
   *
   * Nothing can jump at either handover: the rise ends at 1 and the floor holds
   * 1 from there, so the composite is monotone all the way through.
   */

  function speakerAlpha(now: number): number {
    const d = raw[speaker];
    let base: number;
    if (speakerAt === 0) base = d;
    else if (speakerFullAt === 0) {
      // R2l: the rise is PER BEAT, and beat 0's is nearly three times the rest.
      // See OPENING_RISE_MULT.
      base = smoothstep(clamp((now - speakerAt) / CARD_RISE_AT[speaker], 0, 1));
    } else {
      // `speakerGroundFull` holds the wall-clock term at full until the ground
      // has arrived to take the handover — see its note above. For a card that
      // arrived on time it flips exactly as d touches 1, so nothing steps; for
      // a late-released card it is true from the first frame and this guard is
      // inert, which is R2c's behaviour unchanged.
      base = Math.max(
        d,
        now - speakerFullAt <= CARD_FLOOR_MS || !speakerGroundFull
          ? 1
          : 1 -
            smoothstep(clamp((now - speakerFullAt - CARD_FLOOR_MS) / CARD_FLOOR_EASE_MS, 0, 1)),
      );
    }
    // …and over ALL of it, the gate. One multiplier rather than a branch, so a
    // card taken off by the flagpole leaves from wherever it had got to (see
    // GATE_FADE_MS). Zero off the gate, which is the whole of the walk.
    if (gateFadeAt === 0) return base;
    return base * (1 - smoothstep(clamp((now - gateFadeAt) / GATE_FADE_MS, 0, 1)));
  }

  /**
   * The twelve beats, every frame, and R2g turns them into a QUEUE.
   *
   * Each card's distance fade is what it always was: how near the walker is to
   * its year (see cardAlpha). What changed is what happens when two of those
   * fades arrive closer together in TIME than a sentence takes to read. Exactly
   * one card is on the sky; it holds it until both its ground and its wall clock
   * are spent; then there is CARD_BREATH_MS of nothing; then the next card in the
   * table takes over, however far past its own year the walker has got. See
   * CARD_FLOOR_MS for what that trade costs and why it was made.
   *
   * Nehru's card is the exception it has always been — he does not speak into an
   * unraised flag — and while the stage has a card of its own the whole deck is
   * off.
   */
  function paintCards(): void {
    const live = phase === 'walk' && latch < 0;
    const now = performance.now();
    // The distance fade for every card first, and the queue's own bookkeeping
    // with it: a card becomes DUE the frame the walker enters its ground.
    for (let i = 0; i < beatCards.length; i++) {
      // A card is read at the walker's year, except where he STANDS on the beat
      // instead of walking through it. There the asymmetric fade works against
      // itself: a rule that starts a card at nothing on its own year and eases it
      // up over the next two leaves the moment it belongs to wordless, because
      // the walker never travels those two years. It happens two ways, and they
      // are one rule:
      //
      //  · The WALL. 1947 is the gate, where he stands until the flag is up.
      //    (1600 used to be the other one; R2g's runway means he now walks
      //    through it — see WALL_CARDS.)
      //  · EVERY beat, for a reader who has asked for less motion — that reader's
      //    press is a CUT to the caption year exactly (see jumpStep), so there is
      //    no approach for a card to rise across, and without this the whole deck
      //    stays at zero and the piece has no words in it at all.
      //
      // Both are the same instruction — read this card at the far end of its own
      // rise — and both apply only from the beat's year ONWARD, so walking or
      // stepping back off it still takes the card off for free. The Math.max is
      // what keeps them from compounding where they overlap.
      const settled = reduceMotion.matches || WALL_CARDS.has(i);
      const at = settled && year >= CAPTION_YEARS[i]
        ? Math.max(year, CAPTION_YEARS[i] + CARD_IN_YEARS)
        : year;
      // R2j's lead: where the card's CLAIM begins, which is a few years west of
      // where its ink does. `raw` is the distance fade and is still nothing at
      // all before the beat — a led card rises on its own wall clock (see
      // speakerAlpha) and the ground catches it up — so the only thing the lead
      // moves is when the queue may hand it the sky. See CARD_LEAD.
      const lead = reduceMotion.matches ? 0 : CARD_LEAD[i];
      const claim = live && !(i === NEHRU_CARD && hoist < 1) && at >= CAPTION_YEARS[i] - lead;
      const speaking = claim && at >= CAPTION_YEARS[i];
      raw[i] = speaking ? cardAlpha(i, at) : 0;
      if (!claim) {
        // He has stepped back before the beat, or the stage has taken the sky, or
        // the flag is still down. Either way the card has no claim on anything and
        // its whole queue state goes — which is also what makes walking back and
        // forth over a beat re-offer it rather than remember it. A card taken off
        // this way owes the sky no breath: the reader took the words away, and
        // making them wait for the next one would be the piece sulking.
        cardDue[i] = false;
        cardSpoken[i] = false;
        if (speaker === i) {
          speaker = -1;
          speakerGroundFull = false;
          skyClearAt = 0;
        }
      } else if ((raw[i] > 0 || !speaking) && !cardSpoken[i] && i !== speaker) cardDue[i] = true;
      // The ground's arrival for the SPEAKER, read off this card's own `at`:
      // once the walker is at or past the end of the beat's rise, the ground
      // has finished arriving — it is at full, or already into its tail for a
      // card the queue released late — and the floor's ease is free to hand
      // over to it. Deliberately the rise's END rather than "the fade touched
      // 1": a late-released card past its own plateau would never touch 1
      // again, and a guard waiting for it would hold that card on the sky for
      // good. One-way until the sky changes hands.
      if (i === speaker && at - CAPTION_YEARS[i] >= Math.min(CARD_IN_YEARS, CARD_GONE[i] * 0.5))
        speakerGroundFull = true;
      // `raw[i] > 0 || !speaking` is the lead written out: a card is due either
      // because its ground is live under the walker (the R2g rule) or because he
      // is inside its lead and has not reached the beat yet (`claim` without
      // `speaking`, which is the only way that second term can be true here). It
      // is deliberately NOT "claim && !spoken": a card whose whole fade the walker
      // has already run past — raw back at zero, years east of the beat — must
      // stay unqueued, exactly as it was, or a reader who covers a lot of ground
      // under one sentence collects every card behind them.
      //
      // …and `i !== speaker` is load-bearing rather than tidy. A card holds the
      // sky for seconds after its own ground has arrived, and for most of that
      // time its distance fade is still above zero — so without the test it
      // re-queues ITSELF while it is speaking, and the queue hands it the sky a
      // second time the moment it lets go of it. Traced: the opening title spoke
      // from 1600 to 1680, went out, and came straight back for another six
      // seconds, which put every card after it a whole turn late for the rest of
      // the walk and lost 1991's entirely.
    }

    // THE GATE, before anything is asked about the card's own clocks: parked at
    // the flagpole with the flag still down, any sentence that is not Nehru's is
    // being taken off (see GATE_FADE_MS). Cleared the moment the sky is his, or
    // empty, or the reader walks back out of the gate.
    const gateHold = live && hoist < 1 && year >= GATE_YEAR - 1e-9;
    if (gateHold && speaker >= 0 && speaker !== NEHRU_CARD) {
      if (gateFadeAt === 0) gateFadeAt = now;
    } else gateFadeAt = 0;

    // R2m: THE LED CARD'S CLOCK, STOPPED WHILE HE STANDS SHORT OF ITS BEAT.
    // Evaluated here, before anything is asked about the card's own life, and
    // on the speaker the last frame left behind. See cardHoldAt for the bug.
    // `speakerFullAt > 0` is the one refinement measured rather than reasoned:
    // the clock is suspended once the card is UP, not while it is arriving. A
    // reader who stops inside the rise (1943's card, caught at 0.61 in the
    // probe) would otherwise be left looking at a sentence frozen at
    // four-fifths of its ink for as long as they stood there — which is not the
    // bug, but is not a card either. The rise is bounded and short; it finishes,
    // and the suspension takes the card from there.
    //
    // R2M DROPS THE `year < beat` TERM, which is the same fault found again at
    // the other end. R2m's first pass suspended the clock only where the card
    // was LED — standing short of its own beat, carried by the wall clock alone.
    // The device feel-check found the case that misses: stop anywhere east of a
    // beat, with the card up and the ground still under it, and the floor
    // expires under a stationary reader exactly as before. The composite falls
    // to the distance fade, which is frozen (it is a function of `year` and the
    // year is not moving) but is BELOW full — so the sentence visibly dims and a
    // tap brings it back. Reported precisely that way.
    //
    // So the rule is the simple one it should always have been: a card in front
    // of a reader who is standing still is theirs to keep. Both clocks stop —
    // the wall clock because this suspends it, and the distance fade because the
    // ground is not moving — and both start again on the frame he does. Walking
    // BACK past a beat still takes its card off for free; nothing about the
    // queue, the breath or the gate changes.
    const parked = speaker >= 0 && speakerAt > 0 && speakerFullAt > 0 && !walkerMoving;
    if (parked) {
      if (cardHoldAt === 0) cardHoldAt = now;
    } else if (cardHoldAt > 0) {
      // Handing the clock back. Both stamps move forward by exactly the pause,
      // so the card resumes with the life it had when it stopped and nothing
      // steps at either end of it.
      const held = now - cardHoldAt;
      speakerAt += held;
      // Release morning, second cut. The first cut refunded the floor in full
      // and banked the pause against the dwell alone — and the device pass
      // caught what that misses: the reader resumes at reading pace but the
      // card still owes its whole refunded floor in wall time, so it squats on
      // the sky while the ground runs, the one-card rule holds the NEXT beat's
      // sentence hostage, and 1615's card arrived in the 1650s. The pause is
      // floor SERVED, not floor deferred: the reader spent it reading. So the
      // held time advances the card's own life — capped at the floor's edge,
      // so the ease still leaves from alpha 1 and nothing steps on the frame
      // the thumb comes back down. A pause shorter than the remaining floor
      // credits exactly itself; a longer one parks the card at the top of its
      // ease. Nothing here can move speakerFullAt backward.
      if (speakerFullAt > 0) {
        const atPark = cardHoldAt - speakerFullAt;
        speakerFullAt = now - Math.max(atPark, Math.min(atPark + held, CARD_FLOOR_MS));
      }
      cardHoldAt = 0;
    }
    /** The clock the SPEAKER'S OWN LIFE is read on: frozen while the card is
     *  held, the wall clock otherwise. The queue's own clocks — the breath, the
     *  gate's fade — are deliberately not on it: they are facts about the sky
     *  rather than about the card, and neither can be running here anyway (a
     *  held card is holding the sky, and the gate is east of every beat). */
    const clock = cardHoldAt > 0 ? cardHoldAt : now;

    // Does the card on the sky still hold it? It does until BOTH its ground and
    // its wall clock are spent, which is the whole of the sequencing rule.
    if (speaker >= 0 && speakerAlpha(clock) <= 0) {
      cardSpoken[speaker] = true;
      cardDue[speaker] = false;
      skyClearAt = now;
      speaker = -1;
      speakerGroundFull = false;
      cardHoldAt = 0;
    }
    // …and if it does not, who is next. The queue in table order first; failing
    // that, whichever card the walker happens to be standing in the fade of,
    // which is how walking back into ground you have already read gives you its
    // words again without a wall clock.
    if (speaker < 0 && now - skyClearAt >= (reduceMotion.matches ? 0 : CARD_BREATH_MS)) {
      let pick = -1;
      let queued = false;
      for (let i = 0; i < beatCards.length; i++) {
        if (!cardDue[i]) continue;
        pick = i;
        queued = true;
        break;
      }
      // …and NOT at the gate, where the sky belongs to the flag. Without this
      // the card the gate has just faded off is standing in its own distance
      // fade and the re-light below hands it straight back (it is spoken, which
      // the queue above respects and this branch deliberately does not).
      if (pick < 0 && !gateHold) {
        for (let i = 0; i < beatCards.length; i++) {
          if (raw[i] > 0) {
            pick = i;
            break;
          }
        }
      }
      if (pick >= 0) {
        speaker = pick;
        speakerGroundFull = false;
        cardDue[pick] = false;
        // A queued card carries the wall clock; a re-lit one does not. Reduced
        // motion never carries it: that reader's press is a cut and the next cut
        // must take the last card away with it.
        speakerAt = queued && !reduceMotion.matches ? now : 0;
        speakerFullAt = 0;
      }
    }

    wordsUp = speaker >= 0;
    let a = 0;
    if (speaker >= 0) {
      a = speakerAlpha(clock);
      if (speakerAt > 0 && speakerFullAt === 0 && a >= CARD_FULL_AT) speakerFullAt = clock;
      // Which card the ink is being resolved for. Held rather than cleared when
      // the sky is empty: see voiceCard.
      voiceCard = speaker;
    }
    // The window the ground is held across, and it is the wall clock's own two
    // parts and nothing else: a queued card rising, or a queued card inside its
    // floor. Past the floor the card is leaving, the sentence has been read, and
    // the drive goes back to READ_CAP for the tail of the distance fade — which
    // is what stops a deep cap turning a thirty-year fade into half a minute.
    // A parked read needs no term of its own here: the resume above credits
    // the pause into the floor clock itself, so this window closes for a
    // parked-out card exactly as it closes for a walked-out one. A continuous
    // hold never parks and is untouched — which is also why none of the
    // lead/tempo calibration moves, all of it measured on holds.
    dwelling =
      speaker >= 0 &&
      speakerAt > 0 &&
      gateFadeAt === 0 &&
      (speakerFullAt === 0 || clock - speakerFullAt <= CARD_FLOOR_MS + CARD_FLOOR_EASE_MS);
    for (let i = 0; i < beatCards.length; i++) {
      const r = i === speaker ? Math.round(a * 100) / 100 : 0;
      if (r === cardA[i]) continue;
      cardA[i] = r;
      beatCards[i].style.opacity = String(r);
      beatCards[i].classList.toggle('is-lit', r > 0);
    }

    // …and whether the deck still owes the loop a frame. Two things it can be
    // waiting on and both are bounded: a wall clock that has not run out, and a
    // card queued behind the breath. Without this the stage falls asleep in the
    // gap between one card leaving and the next arriving, which is exactly the
    // half-second the queue exists to create.
    cardsBusy = false;
    if (speaker >= 0) {
      cardsBusy =
        // …plus a third, and it is the only one the reader is not holding a
        // press through: the gate's own fade, which runs while the walker stands
        // still at the flagpole and would otherwise be slept through.
        gateFadeAt > 0 ||
        // R2m: a STOPPED clock owes the loop nothing. This is the whole reason
        // the suspension is a suspension and not an unbounded raf: the deck says
        // it is idle, the stage settles, and the card sits at full over a frame
        // nothing is being drawn into until the reader moves again.
        (cardHoldAt === 0 &&
          speakerAt > 0 &&
          (speakerFullAt === 0 || now - speakerFullAt <= CARD_FLOOR_MS + CARD_FLOOR_EASE_MS));
    } else {
      for (let i = 0; i < beatCards.length; i++) {
        if (cardDue[i]) {
          cardsBusy = true;
          break;
        }
      }
    }
  }

  function paintYear(): void {
    if (!yearEl) return;
    const shown = String(Math.floor(year));
    if (yearEl.textContent !== shown) yearEl.textContent = shown;
  }

  /**
   * The era ribbon: the reader's standing answer to "when am I", under the
   * ticking year for every frame of the walk.
   *
   * Two stacked spans rather than one, cross-faded, for the same reason the
   * cards are stacked: a label that fades out and then fades in has a beat of
   * nothing in the middle, and a persistent label must not blink. -1 is "no era
   * at all", which is where the pull-back leaves it — the chart has its own
   * year axis by then and does not need a period name over it.
   */
  function setEra(i: number): void {
    if (i === era) return;
    era = i;
    if (eraSlots.length < 2) return;
    if (i >= 0) {
      eraSlot = 1 - eraSlot;
      eraSlots[eraSlot].textContent = ERAS[i].label;
    }
    for (let k = 0; k < eraSlots.length; k++) {
      eraSlots[k].classList.toggle('is-shown', i >= 0 && k === eraSlot);
    }
  }

  /**
   * The way back to the start, and it is offered exactly once: after the last
   * part of the ending.
   *
   * R2b showed it from the first step of the walk, in a third cell of a band
   * that no longer exists, and R2c parked it in the foot row's middle cell with
   * the year. A reader mid-walk who wants to see something again walks back to
   * it, which is the whole point of the piece having a reverse, so it stays
   * hidden until the ending is over. R2d gives it a slot of its own —
   * bottom-centre — because the year it used to share a cell with is at the top
   * of the frame now, and R2g's retirement of the hold bar leaves it the whole
   * bottom edge to sit on with nothing but the safe area under it.
   *
   * The rope's whisper and the poster are NOT synced here. Each is a one-way
   * fade of its own, and setting `hidden` from the same press that starts the
   * fade would take it out of the tree before a frame of it had rendered.
   * retireRopeHint() and showPoster() own them, start to finish.
   */
  function syncControls(): void {
    // R2m: nothing to gate for the ending any more. The two controls that used
    // to be a row along the foot of the frame are inside the end-card, which is
    // an ordinary card in the deck: the latch shows it, the latch hides it, and
    // "is the piece finished" and "is the offer on the stage" cannot disagree
    // because there is only one of them. (That disagreement was the failure mode
    // when `start over` and the card link each had a gate of their own.)
    // R2g's ⛶: offered only where the theatre is not already the default, only
    // once the reader is in the film, and never at the same time as the ✕ it
    // shares a corner with.
    // R2j drops the `coarse` term, and it is R2j's exit rule showing up here
    // rather than a second decision. A phone that has left the theatre is now
    // watching the film in the article's frame exactly as a desktop is, so it
    // needs the same way back into it — and it is still never up at the same time
    // as the ✕ it shares a corner with, because `theatre` is the other term.
    if (fullBtn) fullBtn.hidden = !started || theatre;
    // Release weekend's ▷, and its gate is the drive's own: it is an offer to
    // hold the walk, so it exists exactly where a hold would do something —
    // in the film, with the drive live, in the walk phase. The ending hides it
    // (the pages there are the reader's to turn), the poster never shows it,
    // and reduced motion never offers it at all: a carry under reduce-motion
    // would be the engine jump-cutting on the reader's behalf, which is a
    // slideshow nobody asked for.
    if (playBtn) {
      playBtn.hidden = !started || !inputLive() || phase !== 'walk' || reduceMotion.matches;
    }
  }

  /* -- the end-card -- */
  /**
   * R2m. Open it, and put the reader's focus on it.
   *
   * The card is a card and nothing here changes that: showCard latches it, the
   * deck fades it up, and the whole of its life is the deck's. What this adds is
   * the two things a card with controls in it owes a reader who is not using a
   * mouse — focus lands on the region rather than on its first button, so it is
   * ANNOUNCED (the lockup, the wish) before it is operable, and the ✕ and the
   * two actions are one Tab away behind it.
   *
   * preventScroll because the theatre fixes the body: without it, focusing an
   * element in a fixed subtree can scroll the document under the film and the
   * reader lands somewhere else when they leave.
   */
  /** Whether the reader has ever been shown the sign-off, i.e. whether they
   *  have FINISHED the piece. It decides one thing only: where leaving the film
   *  puts them down (see exitTheatre). Never reset — a reader who reaches the
   *  end and then walks back into the 1800s has still finished it. */
  let seenSignoff = false;
  /**
   * Release day: when the greeting was summoned, for the ghost-click guard.
   *
   * The ninth press is a tap on the stage, and the card it summons renders its
   * controls under the exact point the finger just left — the share control is
   * in the middle of the frame, which is where thumbs press. A mobile browser
   * then dispatches its synthesized click a few hundred milliseconds after the
   * tap, at that same point, and the click lands on a control that did not
   * exist when the reader pressed. Reported from the field as the card image
   * downloading itself on arrival (the share's no-files fallback is the
   * download anchor); the same ghost on `Start over` would restart the film.
   * So for the first beat of the card's life its clicks are swallowed — a
   * capture-phase listener, so nothing inside the card sees them.
   */
  let endOpenedAt = 0;
  const END_GHOST_MS = 500;

  function openEndCard(): void {
    endOpenedAt = performance.now();
    showCard(SIGNOFF_CARD);
    seenSignoff = true;
    // The piece is complete, so the walk that was banked against a locked
    // phone is spent. Cleared here as well as guarded in saveResume, so a tab
    // that dies between the greeting and the next hide is covered too.
    clearResume();
    warmEndThumb();
    endCardEl?.focus({ preventScroll: true });
    wake();
  }

  /**
   * …and the ✕. The card goes and the settled chart is left, exactly as it was
   * under it — the film is finished either way, it is still walkable backward,
   * and a forward press summons the card again (see endingPress). `endPart` is
   * deliberately untouched: closing the offer is not stepping back through the
   * ending.
   *
   * Escape is NOT bound to this. Escape already leaves the theatre and has since
   * R2d, and a key that means "close the card" at the end of the piece and
   * "leave the film" everywhere else is a key the reader cannot trust.
   */
  function closeEndCard(): void {
    if (latch !== SIGNOFF_CARD) return;
    showCard(-1);
    stage.focus({ preventScroll: true });
    wake();
  }

  /** The thumbnail's one fetch, at the latest moment that is still early enough
   *  to be invisible: the press that starts the pull-back, which is a whole
   *  camera flight and one more press before the card can be on screen. Idempotent
   *  — the second call is a property read. See the markup for why it is not an
   *  ordinary src. */
  function warmEndThumb(): void {
    if (!endThumb || endThumb.getAttribute('src')) return;
    const src = endThumb.dataset.src;
    if (src) endThumb.setAttribute('src', src);
  }

  /* -- the poster, the theatre, and the one word between them -- */

  /**
   * The poster's invitation, shown or taken away. Shown means faded up a frame
   * after it enters the tree, so it arrives rather than appears; a reader who has
   * asked for less motion gets it as a cut, like everything else on this stage.
   */
  function showPoster(on: boolean): void {
    if (!posterEl) return;
    // The wanted state is tracked rather than read back off the class, because
    // the fade OUT takes it out of the tree on a timer and a reader who leaves
    // the film inside that window would otherwise have the timer hide the
    // poster it had just put back.
    posterWanted = on;
    if (on) {
      posterEl.hidden = false;
      if (reduceMotion.matches) posterEl.classList.add('is-shown');
      else requestAnimationFrame(() => posterEl && posterWanted && posterEl.classList.add('is-shown'));
      return;
    }
    posterEl.classList.remove('is-shown');
    if (reduceMotion.matches) posterEl.hidden = true;
    else {
      window.setTimeout(() => {
        if (posterEl && !posterWanted) posterEl.hidden = true;
      }, 700);
    }
  }

  /**
   * Into the theatre.
   *
   * Two layers, and the second one is optional. The first is CSS: .is-theatre
   * fixes the stage to the viewport and the body's scroll is locked behind it.
   * That is the whole effect, and it is complete on its own. The second is the
   * browser's real fullscreen, requested inside the same user gesture so it is
   * allowed to be granted at all — and .catch()ed to nothing, because a refusal
   * (an iframe without allowfullscreen, iOS Safari on an iPhone, a permissions
   * policy) must be invisible rather than an error in a reader's console.
   *
   * The scroll lock preserves the position rather than assuming zero: the stage
   * leaving normal flow shortens the document under it, and a browser that
   * clamps scrollTop to the new height would otherwise put the reader back at the
   * top of the page on the way out.
   */
  function enterTheatre(): void {
    if (theatre) return;
    theatre = true;
    scrollLock = window.scrollY;
    stage.classList.add('is-theatre');
    // The lock is body{position:fixed} pulled up by the banked offset rather
    // than overflow:hidden on the root. Probed, not assumed: overflow:hidden on
    // <html> makes Chromium drop the scroll position to zero on the spot, so the
    // "restore" on the way out had nothing to restore to. Pulling the body up by
    // the offset keeps the page looking exactly as it did underneath, which is
    // also what makes the exit a cut back rather than a jump.
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollLock}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    if (exitBtn) exitBtn.hidden = false;
    /**
     * The real-fullscreen enhancement, and R2m makes it COARSE-POINTER ONLY.
     *
     * On a phone it earns its place: it takes the browser's URL bar and its
     * chrome off the glass, which on a 390px stage is a tenth of the film.
     *
     * On a desktop it costs more than it buys, and the cost is not ours to fix.
     * Chrome on macOS puts an un-suppressable "Press Esc to exit full screen"
     * toast at the top centre of the screen for several seconds after the
     * request is granted — which is the exact corner the date stamp arrives in,
     * over the exact seconds the birds are carrying the reader's eye up to it.
     * The one composed moment of the opening is spent behind a browser
     * notification about a key. `navigationUI: 'hide'` does not touch it and
     * nothing in the page can.
     *
     * The theatre itself is unchanged on both: .is-theatre is the takeover, the
     * body is locked behind it, the ✕ and the ⛶ mean what they meant, and the
     * poster's caption is still true — a desktop press still fills the window
     * with the film. What a fine pointer does not get is the OS-level frame,
     * and the difference between 100dvh and a fullscreen 100dvh on a desktop is
     * the menu bar.
     */
    if (coarse) {
      try {
        void stage.requestFullscreen?.({ navigationUI: 'hide' })?.catch(() => {});
      } catch {
        /* a browser without the promise form, or one that simply says no */
      }
    }
    // The box just changed size; the ResizeObserver will fire, but the caption
    // and stamp boxes are read here too so the first frame in theatre already
    // has them.
    resize();
    measureCaption();
    syncControls();
    // The theatre is one of the two states the screen is kept lit for.
    syncWakeLock();
    wake();
  }

  /**
   * …and out again. One exit path, three ways to ask for it: the ✕, Esc, and the
   * browser's own fullscreen exit (see the fullscreenchange listener). The film
   * keeps its year either way.
   *
   * WHERE IT LANDS, and R2j makes it ONE answer where R2d and R2g had two.
   *
   * It used to follow the form-factor split: a fine pointer's ✕ un-maximised and
   * the walk carried on in the article's own frame, but a coarse pointer's ✕ put
   * `started` back to false and brought the poster up, on the reasoning that the
   * theatre is the phone's only home for the film. The device feel-check is what
   * retired that reasoning. Leaving full screen is a thing a reader does for
   * dozens of reasons — to check where they are on the page, to answer something,
   * because the gesture is muscle memory — and every one of them was answered by
   * the film STOPPING and offering itself again from the top. The walk was not
   * lost (the year survived, and pressing the word resumed it), but it read as
   * lost, which on a piece that has to be walked by hand is the same thing.
   *
   * So the exit is now the same everywhere: the stage drops back into the
   * article's column at its in-flow size and KEEPS GOING. The canvas is re-sized
   * DPR-aware by the resize() below, the zones are the stage's own halves and
   * therefore came with it, and everything the reader has earned — the year, the
   * queue's spoken cards, the flag, the checkpoint they are standing in — is
   * untouched because none of it was ever theatre state. What comes back is the
   * ⛶ in the corner it left from, which is the way back in on every form factor
   * now (see syncControls).
   *
   * The one thing the phone loses is the poster as a second way in, and it is not
   * a loss: the poster is the way into a film that has not started, and this one
   * has.
   */
  function exitTheatre(): void {
    if (!theatre) return;
    theatre = false;
    stage.classList.remove('is-theatre');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    if (exitBtn) exitBtn.hidden = true;
    releaseAll();
    // Unfixing the body puts the document back at scroll 0; this puts the reader
    // back where they were standing when they walked in.
    //
    // Three times, and the repetition is the fix rather than belt-and-braces:
    // LEAVING FULLSCREEN RESETS THE SCROLL, and it does it asynchronously, after
    // whatever this function does synchronously. Probed: restoring once, before
    // the exitFullscreen promise settles, put the reader back at the top of the
    // page every time the enhancement had been granted. So the restore runs now
    // (for the reader whose browser refused fullscreen and has nothing pending),
    // again when the fullscreen exit resolves, and once more on the next frame
    // for a browser that resets after its own promise.
    /**
     * …unless they have FINISHED it, in which case they are put down at the
     * newsletter box instead.
     *
     * This is the piece's whole subscribe affordance and it is deliberately not
     * on the greeting: the end-card is a card the reader is being given, and an
     * email field in it turns the last thing the film says into a pitch. The
     * ask lives where it lives on every other page — the footer's one compact
     * signup — and what the ending does is LAND them on it. Leaving a film is
     * the reader saying they are done; landing them on the article they have
     * already read would be the page pretending otherwise.
     *
     * Measured each time rather than once, because this runs up to three times
     * (see below) and the layout is not settled until fullscreen has gone.
     * Falls back to where they walked in if the footer is not on the page.
     */
    const landing = (): number => {
      if (!seenSignoff) return scrollLock;
      const box = document.querySelector('[data-signup]');
      if (!box) return scrollLock;
      const r = box.getBoundingClientRect();
      // A hair above centre, so the box arrives with the page under it rather
      // than pinned to the bottom edge of the window.
      return Math.max(0, window.scrollY + r.top - (window.innerHeight - r.height) * 0.45);
    };
    const restoreScroll = () => window.scrollTo(0, landing());
    restoreScroll();
    if (document.fullscreenElement) {
      const done = document.exitFullscreen?.();
      if (done) void done.then(restoreScroll).catch(() => {});
    }
    requestAnimationFrame(restoreScroll);
    if (!started) showPoster(true);
    resize();
    measureCaption();
    syncControls();
    // …and the glass is handed back: releaseAll() above already ended any
    // carry, and with the theatre gone too there is nothing left to keep lit.
    syncWakeLock();
    wake();
  }

  /* -- the carry, and the screen it keeps lit (release weekend) -- */
  /**
   * R2b's autopilot, returned as an offer. See the file's header for why it
   * was retired and why it is back: the short of it is that the default is
   * still the reader's thumb, and the ▷ is for the reader who has asked to be
   * carried.
   *
   * The whole mode is ONE HELD INPUT under the id 'play', planted through
   * pressInput like every other press in the piece. That is the entire trick,
   * and it is what keeps the carry honest: the ramps, the checkpoints, the
   * famine trudge and the 1947 clamp all shape it because none of them can
   * tell it from a thumb. Two things CAN tell, and both are deliberate: any
   * manual press ends the carry (pressInput — the thumb outranks the engine),
   * and the gate's hoist never counts it (manualDir — the flag is the
   * reader's, and at the pole the carry stands and asks for a tap). Beyond
   * those, the carry ends at the arrival (see arriveEnd), on a toggle of its
   * own button, and wherever the piece already lets go of everything
   * (releaseAll — the blur, the hidden tab, the theatre's exit).
   *
   * The BUTTON'S FACE is two glyphs in one svg, gated by .is-playing on the
   * button (see the stylesheet): the offer is a hairline ▷, the standing carry
   * a pause pair, and syncPlay is the only writer of both the class and the
   * label. `hidden` stays syncControls' job so the two cannot disagree about
   * when the corner is occupied.
   */
  function startPlay(): void {
    if (playing || !started || phase !== 'walk' || reduceMotion.matches || !inputLive()) return;
    playing = true;
    syncPlay();
    pressInput('play', 1);
    syncWakeLock();
  }

  function stopPlay(): void {
    if (!playing) return;
    playing = false;
    carryHoisting = false;
    dropInput('play');
    syncPlay();
    syncWakeLock();
    wake();
  }

  function syncPlay(): void {
    if (!playBtn) return;
    playBtn.classList.toggle('is-playing', playing);
    playBtn.setAttribute('aria-label', playing ? 'pause the walk' : 'watch him walk');
  }

  /**
   * THE SCREEN STAYS LIT WHILE THE FILM HAS THE READER, and this is the field
   * report that built it: a phone dimming mid-walk. A held thumb keeps most
   * screens awake by itself; what does not is the reader WATCHING — the carry,
   * the arrival they let run, the flag creeping up the eight-second way — so
   * the sentinel is asked for whenever the film plausibly owns the glass (the
   * theatre, or a carry running in the article's frame) and let go when it
   * does not (the poster, the in-flow film left idle, a hidden tab — where the
   * browser revokes it anyway, which is why the sentinel's own `release` event
   * is listened to rather than trusted to our bookkeeping).
   *
   * Everything here is best-effort and silent: a browser without the API, a
   * denied request, a revoked sentinel — the film's behaviour is identical in
   * every case, minus the favour. `wakeWanted` is re-read when a request
   * resolves, because the reader can leave the theatre inside the round-trip.
   */
  let wakeSentinel: WakeLockSentinel | null = null;
  let wakeAsking = false;
  const wakeWanted = (): boolean => started && !document.hidden && (theatre || playing);

  function syncWakeLock(): void {
    const want = wakeWanted();
    if (want && !wakeSentinel && !wakeAsking && navigator.wakeLock) {
      wakeAsking = true;
      navigator.wakeLock
        .request('screen')
        .then((s) => {
          wakeAsking = false;
          if (!wakeWanted()) {
            void s.release().catch(() => {});
            return;
          }
          wakeSentinel = s;
          s.addEventListener('release', () => {
            if (wakeSentinel === s) wakeSentinel = null;
          });
        })
        .catch(() => {
          wakeAsking = false;
        });
      return;
    }
    if (!want && wakeSentinel) {
      const s = wakeSentinel;
      wakeSentinel = null;
      void s.release().catch(() => {});
    }
  }

  /**
   * The press that answers the poster. It is the FIRST press of any kind on the
   * stage after load or after an exit, and it does not also walk: entering the
   * film and taking a step are two different intentions and running them
   * together means a reader's first touch moves the ground before they have seen
   * the frame it moves in.
   *
   * R2g gave it two jobs it did not have. It decided WHERE the film plays — the
   * theatre on a coarse pointer, the article's own frame on a fine one (see
   * `coarse`) — and on a FRESH walk it starts the bloom. A walk that has already
   * been begun and left does not get the opening again: the reader has seen the
   * world arrive once, and replaying it on the way back in would be the piece
   * introducing itself to somebody it has already met.
   *
   * R2m TAKES THE FORM-FACTOR SPLIT OUT OF THE ENTRY, and it is the device
   * feel-check's call. The desktop walk began in the article's column with the
   * theatre offered in the corner, on the R2g reasoning that a takeover for a
   * piece the reader arrived at by scrolling is a modal. What the feel-check
   * found is that almost nobody presses the ⛶: the film is played at 58dvh of a
   * page column, which is a postcard on a 27-inch exactly as it is on a phone,
   * and the reader who never finds the corner never sees the piece at the size
   * it was composed at. So the poster's press enters the theatre EVERYWHERE, and
   * the note under the word ("Opens in full screen.") is shown everywhere with
   * it — the surprise R2j fixed for the phone was never a phone-only surprise.
   *
   * THE EXIT CONTRACT IS UNCHANGED AND IS NOW UNIVERSAL, which is what makes
   * this safe rather than a modal: ✕ drops the stage back into the article's
   * column with the walk still running (see exitTheatre), and NOTHING re-enters
   * the theatre except the ⛶. `started` is what guarantees it — this function is
   * the only caller of enterTheatre() besides the ⛶'s own click, and it returns
   * at the first line for the whole of the rest of the page's life.
   *
   * `coarse` still exists and is still read: it is what the two hint strings are
   * chosen by (see the pointer-type copy at the foot of init).
   */
  function begin(): void {
    if (started) return;
    started = true;
    // The banked walk, applied on the press that answers "resume the walk":
    // the year moves before the intro starts so the bloom opens on the sky
    // the reader actually left, and `primed` is dropped so the camera SNAPS
    // to that frame instead of flying four centuries to reach it.
    if (pendingResume) {
      year = Math.min(Math.max(pendingResume.y, runwayFrom), endYear - 2);
      prevYear = year;
      if (pendingResume.h) hoist = 1;
      primed = false;
      pendingResume = null;
      if (freshBtn) freshBtn.hidden = true;
      // …and everything that is written only WHEN THE YEAR MOVES has to be
      // brought here by hand, because on a resume it has already moved: the
      // stamp, the era ribbon and the walker's mood are all painted from the
      // drive (see the drive's `next !== year` branch), so without this the
      // bloom opens on the resumed sky with the RUNWAY's year under it — 1568
      // over a 2015 landscape until the first step, device-reported — and a
      // walker still carrying 1600's posture.
      setEra(eraAt(year));
      paintYear();
      moodAt(year, mood);
    }
    stage.classList.remove('is-poster');
    showPoster(false);
    if (!introDone) startIntro();
    else showHints();
    enterTheatre();
    syncControls();
    wake();
  }

  /* -- the opening -- */

  /**
   * The bloom, the birds, and the runway frozen behind them.
   *
   * The clock is backdated by the whole duration for a reader who has asked for
   * less motion, which is the file's usual trick: the very next frame reads as
   * finished and there is no second code path anywhere.
   */
  function startIntro(): void {
    blooming = true;
    bloomT0 = reduceMotion.matches ? performance.now() - BLOOM_MS : performance.now();
    // The grain's own arrival, and it is a class and a CSS transition rather than
    // anything in the frame: taking .is-intro off here starts one opacity
    // transition of --walk-bloom-ms, so the noise comes up under the light on the
    // compositor and the loop never hears about it. A reader who asked for less
    // motion has no transition at all and gets it as the cut everything else here
    // is.
    stage.classList.remove('is-intro');
    if (!reduceMotion.matches) spawnBirds();
  }

  /**
   * Three to five of them, spread across the width of the mid-sky at their own
   * heights and their own paces, each aimed loosely at the top-centre region the
   * stamp will occupy and gone inside BIRD_RISE_S give or take the spread.
   * Nothing refills the pool: this runs once per fresh walk and the list empties
   * itself.
   *
   * R2l hangs SIZE, ALPHA and PACE off one number per bird — how near it is — so
   * that the flock reads as three depths rather than as three copies. The pace
   * ramp is folded INTO the R2j spread rather than added beside it: `rise` still
   * lands between 4.1 and 5.3 seconds, and which end of that a bird gets is now
   * its depth instead of a second dice roll. The far ones are small, faint and
   * slow, which is what distance looks like.
   */
  function spawnBirds(): void {
    const w = size.w > 0 ? size.w : 390;
    const n = BIRD_MIN + Math.floor(Math.random() * (BIRD_MAX - BIRD_MIN + 1));
    for (let i = 0; i < n; i++) {
      // 0 is as far away as this flock goes, 1 as near.
      const depth = Math.random();
      const rise = BIRD_RISE_S + (0.5 - depth) * BIRD_RISE_SPREAD;
      const span = BIRD_SPAN * (BIRD_SPAN_FAR + depth * (BIRD_SPAN_NEAR - BIRD_SPAN_FAR));
      const x = w * (BIRD_FROM_X + Math.random() * BIRD_FROM_SPAN);
      const y = BIRD_Y_FROM + Math.random() * (BIRD_Y_TO - BIRD_Y_FROM);
      // Where it is aiming, and it is a REGION rather than a point: a flock that
      // converges exactly is an arrow, and an arrow pointing at the date is the
      // piece explaining its own composition.
      const to = w * (BIRD_TO_X + (Math.random() - 0.5) * BIRD_TO_SPREAD * 2);
      birds.push({
        x,
        y,
        yFrom: y,
        x0: x,
        toX: to,
        p: 0,
        // `rise` is the bird's WHOLE climb rather than the part of it over any
        // particular band: one lower and one higher must arrive together, so the
        // lower one climbs faster instead of later.
        pRate: 1 / rise,
        // The wander is a fraction of the wingspan rather than a flat number of
        // pixels, so a near bird swings wider than a far one for the same reason
        // it is drawn bigger.
        drift: BIRD_DRIFT * (0.5 + depth) * (Math.random() < 0.5 ? -1 : 1),
        driftPhase: Math.random() * Math.PI * 2,
        driftTurns: BIRD_DRIFT_TURNS * (0.7 + Math.random() * 0.6),
        span,
        alpha: BIRD_ALPHA * (BIRD_ALPHA_FAR + depth * (1 - BIRD_ALPHA_FAR)),
        wing: Math.random(),
        // …and a far bird beats slower than a near one, on the same depth ramp.
        wingRate: (1 / BIRD_CYCLE_S) * (0.8 + depth * 0.4),
      });
    }
  }

  /**
   * …and their whole physics, which is three lines of arithmetic and no
   * integration: how far up the climb the bird is, and then its place in the
   * frame as a function of that.
   *
   * The CURVE is the smoothstep. A bird's lateral travel toward the top-centre
   * runs on the eased progress while its climb runs on the raw one, so it leaves
   * almost straight up, banks through the middle of the rise and straightens as
   * it arrives — which is a path with a shape rather than a line with a slope.
   * The sine over the top of it is the drift, under one full turn across the whole
   * climb, and it is what keeps two birds on similar headings from ever looking
   * parallel. A bird at the top of the frame is dropped, and the pool never
   * refills.
   */
  function stepBirds(dt: number): void {
    if (!birds.length) return;
    const k = dt / 1000;
    for (let i = birds.length - 1; i >= 0; i--) {
      const b = birds[i];
      b.p += b.pRate * k;
      b.wing = (b.wing + b.wingRate * k) % 1;
      if (b.p >= 1) {
        birds.splice(i, 1);
        continue;
      }
      b.y = b.yFrom + (BIRD_Y_GONE - b.yFrom) * b.p;
      b.x =
        b.x0 +
        (b.toX - b.x0) * smoothstep(b.p) +
        b.drift * Math.sin(b.driftPhase + b.p * b.driftTurns * Math.PI * 2);
    }
  }

  /**
   * The opening hints, offered and retired: the two mid-screen zone labels,
   * and release weekend's third at the foot of the frame, which names the
   * carry over the ▷ it points at. They arrive when the bloom ends — the words
   * start when the picture does — and they go on the first press of any kind
   * after that, for the life of the page.
   */
  function showHints(): void {
    if (hintsUp || hintsRetired) return;
    hintsUp = true;
    for (const el of hintEls) el.classList.add('is-shown');
    // The drive just went live, and the ▷'s gate reads inputLive() — this is
    // the one moment that flips it with no other syncControls() in sight, so
    // the offer to be carried arrives with the words that explain walking.
    syncControls();
  }

  function retireHints(): void {
    if (hintsRetired) return;
    hintsRetired = true;
    hintsUp = false;
    for (const el of hintEls) el.classList.remove('is-shown');
  }

  /**
   * The second whisper, and the only other instruction in the piece: a reader
   * standing at the pole for HOIST_HINT_MS with nothing moving is told there is
   * a rope. It retires on the first progress and never comes back — including
   * for a reader who found the rope on their own, who is never told about it.
   * Since R2c took the cue chevron off the halyard this is the gate's only
   * affordance beyond the rope itself.
   */
  function showRopeHint(): void {
    if (ropeHinted || ropeRetired || !ropeHintEl) return;
    ropeHinted = true;
    // A carried reader is not sent hunting for a halyard: the carry stood
    // down at the pole waiting on them, and the gesture the whisper asks for
    // is the one they have been watching with (see carryHoisting). The rope
    // is still there, still works, and still reads as the better answer for
    // anyone who finds it.
    if (playing) ropeHintEl.textContent = 'tap to raise the flag';
    ropeHintEl.hidden = false;
    // One frame in the tree before the class, or the fade has nothing to run
    // from and the line simply appears.
    if (!reduceMotion.matches) {
      requestAnimationFrame(() => ropeHintEl.classList.add('is-shown'));
    } else ropeHintEl.classList.add('is-shown');
  }

  function retireRopeHint(): void {
    if (ropeRetired) return;
    ropeRetired = true;
    if (!ropeHintEl) return;
    ropeHintEl.classList.remove('is-shown');
    if (reduceMotion.matches) ropeHintEl.hidden = true;
    else {
      window.setTimeout(() => {
        if (ropeHintEl) ropeHintEl.hidden = true;
      }, 400);
    }
  }

  /**
   * The ending's whisper, on the rope's pattern with one difference the field
   * asked for. The film is HELD for four centuries and then TAPPED for its
   * last nine frames, and the reader whose thumb has been down the whole way
   * has been taught the wrong gesture by every minute of the piece. It used to
   * be offered once and retired forever by the first ending press — but the
   * press that hides it on THIS frame proves nothing about the reader's
   * patience on the NEXT one, and release day's readers stood on later frames
   * waiting for a film that was waiting for them. So the offer stands for the
   * whole ending: each settled frame re-offers it on its own idle clock (see
   * the whisper's clock in the frame loop), and a press hides it rather than
   * ends it.
   */
  function showTapHint(): void {
    if (tapHinted || !tapHintEl) return;
    tapHinted = true;
    tapTaught = true;
    // A re-offer can land inside the previous hide's 400ms fade; the pending
    // timeout would set `hidden` on the whisper that just came back.
    if (tapHideT) {
      window.clearTimeout(tapHideT);
      tapHideT = 0;
    }
    tapHintEl.hidden = false;
    if (!reduceMotion.matches) {
      requestAnimationFrame(() => tapHintEl.classList.add('is-shown'));
    } else tapHintEl.classList.add('is-shown');
  }

  function hideTapHint(): void {
    if (!tapHinted) return;
    tapHinted = false;
    if (!tapHintEl) return;
    tapHintEl.classList.remove('is-shown');
    if (reduceMotion.matches) tapHintEl.hidden = true;
    else {
      tapHideT = window.setTimeout(() => {
        tapHideT = 0;
        if (tapHintEl && !tapHinted) tapHintEl.hidden = true;
      }, 400);
    }
  }

  /**
   * The gate, for a reader who is not looking at it. Deliberately says what to
   * do and names nothing else: "the flag" and "the rope" are objects on the
   * stage, and neither of them gives the series away.
   */
  function announceGate(on: boolean): void {
    if (on === announcing) return;
    announcing = on;
    if (!liveEl) return;
    liveEl.textContent = on ? 'At the flagpole. Hold, or pull the rope, to raise the flag.' : '';
  }

  /**
   * Is the walk currently held at the flagpole? True from the moment he touches
   * 1947 until the flag is at the masthead, and never again after that.
   */
  function gated(): boolean {
    return phase === 'walk' && hoist < 1 && year >= GATE_YEAR - 1e-9;
  }

  /**
   * The checkpoint speed cap at a point on the walk: 1 everywhere, easing down
   * to CHECKPOINT_CAP as a caption year is approached and back out the other
   * side. A bell rather than a step, so nothing snaps, and symmetric, so it
   * works identically walking back. There is no dwell in it any more (see
   * CHECKPOINT_CAP) — this is the whole of the slow-through.
   *
   * The window is the authored one in px, clamped per beat to half the distance
   * to its nearest neighbour: without that, two close beats at a phone's zoom
   * are one long trough and the walk never comes back to pace between them.
   */
  function checkpointCap(at: number, pxPerYear: number): number {
    if (pxPerYear <= 0) return 1;
    const windowYears = CHECKPOINT_WINDOW_PX / pxPerYear;
    let nearest = Infinity;
    let cap = 1;
    for (let i = 0; i < CAPTION_YEARS.length; i++) {
      const d = Math.abs(CAPTION_YEARS[i] - at);
      if (d >= nearest) continue;
      nearest = d;
      const win = Math.max(Math.min(windowYears, CHECKPOINT_MAX_YEARS[i]), 1e-6);
      cap = lerp(1, CHECKPOINT_CAP, smoothstep(clamp(1 - d / win, 0, 1)));
    }
    return cap;
  }

  /* -- arriving -- */

  /**
   * The end of the series, and the only place the walk is over. Everything a
   * stop used to do —
   * clamp, disarm, hand the frame to the reveal's own clock — happens here and
   * nowhere else, so continuing needs a fresh press for the first time since
   * 1600.
   *
   * R2m TAKES THE FIRST CARD OFF IT. Reveal part one was the one card in the
   * piece shown by a clock, and the clock was the arrival itself: the walk
   * stopped and a sentence appeared over it. It is now the first of the ending's
   * nine presses (see endingPress) — the walk ends on the landscape it was
   * walked on, the chart chrome comes up behind it on the reveal's own clock,
   * and the words wait for the reader. The empty sky here is deliberate: it is
   * the last frame of the walk, held, which is what four centuries have earned.
   */
  function arriveEnd(): void {
    year = endYear;
    // The carry ends where the walk does. The ending's pages are the reader's
    // to turn — a held forward input there would tear through nine frames of
    // reveal — and the ▷ goes down with it (see syncControls below).
    stopPlay();
    armed = false;
    showCard(-1);
    paintCards();
    setEra(eraAt(year));
    paintYear();
    phase = 'reveal';
    exitT0 = 0;
    revealT0 = reduceMotion.matches ? -REVEAL_TOTAL_MS : performance.now();
    syncControls();
  }

  /**
   * …and out of it again. A reader who turns around at the end has not finished
   * the walk, so the ending gets put away: the chrome fades back off, the drive
   * re-arms and the phase goes back to the walk he was in the middle of. Coming
   * back to the end runs arriveEnd again, ceremony and all — the frame is
   * arriving freshly and the sentence is what the arrival is for.
   *
   * There is nothing to unroll here since R2e: the look-up and the mark belong
   * to level one, and a reader who turned round at part one never saw either.
   * What R2f does add is the CLEAR-DOWN of the two camera levels, because the
   * back controls mean a reader can now be here with a lift still riding home
   * under them.
   */
  function exitReveal(now: number): void {
    const t = now - revealT0;
    exitChrome = clamp((t - REVEAL_CHROME_MS) / REVEAL_CHROME_FADE_MS, 0, 1);
    exitT0 = reduceMotion.matches ? now - REVEAL_EXIT_MS : now;
    phase = 'walk';
    lift = liftA = liftB = 0;
    pull = pullA = pullB = 0;
    liftFrom = liftCam = pullFrom = null;
    // The stage gives the sky back to the deck; at 2026 every beat is decades
    // away, so what the reader actually sees is an empty sky until 1991 comes
    // back up under them.
    showCard(-1);
    paintCards();
    syncControls();
  }

  /** A reduced-motion press: the next story year either way, as a cut. The
   *  stops stay waypoints for a reader who has asked not to be moved through
   *  them, and the way back is a waypoint at a time too. */
  function jumpTo(to: number): void {
    // The flagpole gates the cut too. A reader who has asked for less motion
    // still raises the flag; they just do it in HOIST_REDUCED_MS rather than by
    // hauling. Without this the cut steps straight over 1947 and the one
    // interactive moment in the piece never happens for them.
    const at = hoist < 1 ? Math.min(to, GATE_YEAR) : to;
    if (at >= endYear) {
      arriveEnd();
      return;
    }
    year = clamp(at, runwayFrom, endYear);
    paintCards();
    setEra(eraAt(year));
    paintYear();
    syncControls();
  }

  /**
   * One press, for a reader who has asked not to be walked: the next STORY BEAT
   * either way, as a cut.
   *
   * The waypoints are the CAPTION years, not the camera's STOPS. R1e stepped the
   * stop table, which was right when the two tables shared their years — R2's
   * caption table does not. 1857 and 1919 are beats and not camera legs, so
   * stepping STOPS now cuts a reduced-motion reader straight past the Mutiny and
   * Jallianwala Bagh. The camera window is interpolated along the leg either
   * way, so landing between two stops costs nothing.
   */
  function jumpStep(dir: number): void {
    if (dir > 0) {
      let to = endYear;
      for (const c of CAPTION_YEARS) {
        if (c > year + 1e-9) {
          to = Math.min(to, c);
          break;
        }
      }
      jumpTo(to);
      return;
    }
    // Off the front of the table is the runway rather than 1600: stepping back
    // off the opening title puts the reader where the film started, which is the
    // only place west of 1600 there is.
    let to = runwayFrom;
    for (let k = CAPTION_YEARS.length - 1; k >= 0; k--) {
      if (CAPTION_YEARS[k] < year - 1e-9) {
        to = CAPTION_YEARS[k];
        break;
      }
    }
    jumpTo(to);
  }

  /* -- the presses -- */

  /* -- the two camera rides -- */
  /**
   * Start a ride, forward or back. `to` is 1 for "run this level up" and 0 for
   * "put it away"; the ride always starts from wherever the value actually is,
   * so interrupting one is a change of destination rather than a jump.
   *
   * The reduced-motion path is the file's usual one: backdate the clock by the
   * whole duration so the next frame reads as finished, and unprime the camera
   * so it snaps to the new frame instead of easing to it. One code path, and
   * that reader gets every level as a cut.
   */
  function rideLift(to: number): void {
    liftA = lift;
    liftB = to;
    liftMs = LIFT_MS;
    liftT0 = reduceMotion.matches ? performance.now() - LIFT_MS : performance.now();
    if (reduceMotion.matches) {
      lift = to;
      primed = false;
    }
  }

  function ridePull(to: number): void {
    pullA = pull;
    pullB = to;
    pullMs = PULLBACK_MS;
    pullT0 = reduceMotion.matches ? performance.now() - PULLBACK_MS : performance.now();
    if (reduceMotion.matches) {
      pull = to;
      primed = false;
    }
  }

  /**
   * …and what a press landing INSIDE a ride does: finish it, quickly, from where
   * it has got to. Not a jump — a camera that teleports mid-flight is the one
   * thing worse than a camera the reader has to wait for — and not a no-op
   * either, which is what R2e did and is how a reader ends up pressing at a
   * frame that appears to be ignoring them.
   */
  function snapLift(): void {
    if (lift === liftB) return;
    liftA = lift;
    liftMs = RIDE_SNAP_MS;
    liftT0 = reduceMotion.matches ? performance.now() - RIDE_SNAP_MS : performance.now();
    wake();
  }

  function snapPull(): void {
    if (pull === pullB) return;
    pullA = pull;
    pullMs = RIDE_SNAP_MS;
    pullT0 = reduceMotion.matches ? performance.now() - RIDE_SNAP_MS : performance.now();
    wake();
  }

  /* -- the four stages of the ending, forward -- */

  /** Reveal part one → LEVEL ONE. The camera cranes up, he looks up with it, and
   *  the teal mark comes in overhead ALONE. Its words are the press after this
   *  one (R2m); the sky is empty here because the sentence names a mark that is
   *  not in the frame yet. */
  function toLift(): void {
    phase = 'lift';
    liftFrom = { ...cam };
    liftCam = computeLift(liftFrom);
    showCard(-1);
    rideLift(1);
    syncControls();
    wake();
  }

  /** Level one → LEVEL TWO: the full pull-back, exactly as R2e had it. The year
   *  and the era ribbon dissolve into the x-axis that is arriving under them, and
   *  the ending screen is the press after the flight has landed (R2m). */
  function toPull(): void {
    phase = 'pull';
    // The end-card is two presses and a camera flight away, and its thumbnail is
    // the one asset on this page that is not fetched on load. Warmed here.
    warmEndThumb();
    pullFrom = { ...cam };
    endPart = -1;
    showCard(-1);
    setEra(-1);
    ridePull(1);
    syncControls();
    wake();
  }

  /* -- …and back -- */

  /** Level two → level one. The full frame un-pulls to the crane, the year comes
   *  back with --walk-foot, and part two's words are on the sky again. */
  function backToLift(): void {
    phase = 'lift';
    endPart = -1;
    ridePull(0);
    setEra(eraAt(year));
    showCard(REVEAL_CARDS[1]);
    syncControls();
    wake();
  }

  /** Level one → reveal part one. The gaze lowers, the mark fades with the lift
   *  it is a function of, and the chart chrome stays: it arrived at part one and
   *  part one is where the reader is going.
   *
   *  Part one's two lines are put up as a CUT rather than replayed. The reader
   *  has read them; a sequential fade re-run on the way back is the piece making
   *  them wait to be told something they came back from. */
  function backToReveal(): void {
    phase = 'reveal';
    rideLift(0);
    showCard(REVEAL_CARDS[0]);
    completeLines();
    syncControls();
    wake();
  }

  /**
   * Every press after the walk is over, in either direction, and it is one
   * function because the ending is one sequence with four stages in it.
   *
   * RULE ONE, at every stage and in both directions: a press lands on whatever
   * is still moving. A camera ride finishes, fast, from where it is; a sentence
   * still arriving is completed. Only when the stage has nothing left to say
   * does a press turn the page. Nobody is ever locked out of their own forward
   * control, and nobody can use it to skip a sentence they have not been shown.
   *
   * RULE TWO: forward is unchanged from R2e at every stage — reveal part one to
   * the mark, the mark to the full frame, the full frame to the end-card, and
   * nothing at all after that. What R2f adds is that BACKWARD works the whole
   * way home: end-card → ending screen → level one → reveal part one → back onto
   * the ground, where the same hold controls walk him down the series again.
   *
   * R2M MAKES THE WHOLE CHAIN THE READER'S, and it is the round's largest single
   * change to how the ending feels. Nothing in it arrives on a clock or on a
   * camera any more. Nine presses, in order, each one bringing exactly one
   * thing:
   *
   *   1  the ground you just walked is money        (its own slow 3.6s rise)
   *   2  …and what the line actually measures        (cross-dissolve)
   *   3  the crane, and the teal mark ALONE
   *   4  the mark's words
   *   5  the pull-back
   *   6  in 1966, India was still poorer than in 1600
   *   7  the climb                                   (cross-dissolve)
   *   8  and there is still a long way to go         (cross-dissolve)
   *   9  the end-card
   *
   * The R2l dissolve timings are untouched — the presses only decide WHEN each
   * one starts — and a press landing inside a fade still completes it as a cut
   * and is consumed by that (see advanceLines). Backward is R2l's exactly:
   * finished states, no dissolve replayed.
   *
   * A reader who has asked for less motion runs the same nine presses with every
   * stage as a cut, which is what they were already getting inside each card.
   */
  function endingPress(dir: number, now: number): void {
    // A press answers the whisper for THIS frame and no more: it goes down and
    // its clock starts over, so the next frame the reader stalls on can offer
    // it again (see the whisper's clock in the frame loop).
    hideTapHint();
    endIdleMs = 0;
    if (lift !== liftB) {
      snapLift();
      return;
    }
    if (pull !== pullB) {
      snapPull();
      return;
    }
    if (linesPending()) {
      // R2l: FORWARD is one stage of the dissolve — the reader is asking for the
      // next sentence, not for all of them. BACKWARD leaves the card in its
      // finished state and is consumed by that: they are going the other way,
      // and a card they are stepping off should not be mid-swap when they come
      // back to it.
      //
      // `partAt` is deliberately NOT stamped here. It is the ending's own
      // page-turn clock and the lines are not page turns; stamping it would
      // measure the last dissolve rather than the stage the reader is in.
      if (dir > 0) advanceLines();
      else completeLines();
      wake();
      return;
    }

    if (dir > 0) {
      if (phase === 'reveal') {
        // R2m: the arrival leaves the sky EMPTY (see arriveEnd), so the first
        // press of the ending is the one that brings part one in. The press
        // after it is the crane.
        if (latch !== REVEAL_CARDS[0]) {
          showCard(REVEAL_CARDS[0]);
          wake();
          return;
        }
        toLift();
        return;
      }
      if (phase === 'lift') {
        // The mark came up alone on the ride; this is the press that names it.
        if (latch !== REVEAL_CARDS[1]) {
          showCard(REVEAL_CARDS[1]);
          wake();
          return;
        }
        toPull();
        return;
      }
      // The full frame. R2m: the ending screen is the press after the flight
      // lands (endPart goes -1 → 0), and the end-card the press after its last
      // sentence (0 → 1).
      if (endPart >= END_CARDS.length - 1) {
        // …and the one press left after that: the end-card, CLOSED by its ✕,
        // summoned back. The film behind it is finished either way; what a
        // forward press means at the end of it is "show me that again".
        if (latch !== SIGNOFF_CARD) openEndCard();
        return;
      }
      endPart++;
      if (endPart >= END_CARDS.length - 1) openEndCard();
      else showCard(END_CARDS[endPart]);
      syncControls();
      wake();
      return;
    }

    if (phase === 'pull') {
      // The end-card steps back onto the ending screen with its three lines
      // already up — they have been read, and re-running the stack would be the
      // piece stalling a reader who is going the other way. It steps back from
      // the CLOSED end-card too: the piece is still finished, and back is still
      // the way out of it.
      if (endPart >= END_CARDS.length - 1) {
        endPart = END_CARDS.length - 2;
        showCard(END_CARDS[endPart]);
        completeLines();
        syncControls();
        wake();
        return;
      }
      backToLift();
      return;
    }
    if (phase === 'lift') {
      backToReveal();
      return;
    }
    // Reveal part one, and the only way out of the ending: back onto the ground,
    // facing the way he came, with the drive re-armed under him.
    facing = -1;
    exitReveal(now);
    armed = true;
    if (reduceMotion.matches) {
      primed = false;
      stridePhase = 0;
      swing = 0;
      jumpStep(-1);
      prevYear = year;
    }
    wake();
  }

  /** `dir` is +1 for a press that means forward and -1 for one that means back. */
  function press(dir: number): void {
    // After the walk, a press is a page turn rather than a step, in both
    // directions. See endingPress.
    if (phase !== 'walk') {
      endingPress(dir, performance.now());
      return;
    }

    if (reduceMotion.matches) {
      // Each press is one stop, as a cut. No leg, no camera flight.
      // …except at the flagpole, where a forward press raises the flag instead
      // of moving him, because there is nowhere for him to go until it is up.
      if (dir > 0 && gated()) {
        reducedHoisting = true;
        wake();
        return;
      }
      primed = false;
      stridePhase = 0;
      swing = 0;
      facing = dir < 0 ? -1 : 1;
      jumpStep(dir);
      prevYear = year;
      wake();
      return;
    }

    armed = true;
    syncControls();
    wake();
  }

  /**
   * R2m: IS THE DRIVE LISTENING YET?
   *
   * The film opens on about five and a half seconds of arrival — the bloom, the
   * birds, the date coming in behind them — and until R2m every one of those
   * frames was drivable. The press that answered the poster was followed, on
   * most readings, by a second press a beat later while the light was still
   * coming up, because the poster's word had just taught the reader that
   * pressing this stage does something. That press walked him: the reader met
   * 1600 with the world still arriving, the opening card's slow rise landed over
   * ground already moving, and the two hints — which are the piece's only
   * explanation of its own control — came up over a walk in progress and were
   * retired by the next press before they had been read.
   *
   * So the drive is INERT until the hints are on the sky. The gate is exactly
   * that fact and not a timer: `hintsUp` is written by showHints() at the end of
   * the bloom, and `hintsRetired` keeps the gate open for the rest of the page's
   * life once the reader has made their first real press (and covers the
   * returning reader, for whom showHints() is a no-op).
   *
   * What is NOT gated, deliberately: the poster's own press, which is the line
   * above this one and is how the film is entered at all; and the ✕, the ⛶ and
   * `start over`, which are buttons and never came through here.
   */
  function inputLive(): boolean {
    return hintsUp || hintsRetired;
  }

  function pressInput(id: string, dir: number): void {
    // The single place every path — the two bar zones, the two stage halves, the
    // two arrow keys and the rope — passes through. A reader who has not entered
    // the film yet gets the entry instead of a step: the poster's press is
    // answered by begin(), and the walk starts on the press after it.
    if (!started) {
      begin();
      return;
    }
    // …and a press made DURING the arrival is not a press at all. See inputLive.
    if (!inputLive()) return;
    // What a press means OVER the carry. The reader's thumb outranks the
    // engine, so any manual press takes the walk back — with one exception.
    // At the gate the carry is already standing, the whisper has asked for a
    // tap, and a forward press there IS the answer: it runs the hoist rather
    // than ending the carry, and the carry walks on when the flag is up. (The
    // rope lands here too, under its own id, and reads the same way: the flag
    // goes up, the carry keeps the walk.)
    if (playing && id !== 'play') {
      if (dir > 0 && gated()) {
        carryHoisting = true;
        wake();
        return;
      }
      stopPlay();
    }
    // The two mid-screen hints, retired on the first press of any kind after
    // they were offered. Here rather than beside the drive because a press that
    // does nothing else — a tap at the 1600 wall, a press during a camera ride —
    // is still a reader saying they have understood the offer. The press that
    // ANSWERS the poster never reaches this line, which is what stops the hints
    // being retired a beat before they are shown.
    if (hintsUp) retireHints();
    // A real hold cancels a tapped step that is still running itself out.
    if (id !== stepId) endStep();
    addInput(id, dir);
    press(dir);
    wake();
  }

  /* -- the tap step -- */
  /**
   * A tap is a hold the ENGINE lets go of: the same input, held for STEP_MS and
   * then released. Everything that shapes a hold shapes it — the ramp in, the
   * ramp out, the checkpoints, the gate — so a step is a step taken rather than
   * a jump cut, and there is no second path to keep honest.
   *
   * A reader who has asked for less motion has already had their whole answer on
   * the press (one beat, as a cut) and gets no step at all.
   */
  function startStep(id: string, dir: number): void {
    if (reduceMotion.matches || phase !== 'walk') return;
    // The tap's own gate. A tap is a pointerdown and a release, and the DOWN
    // already went through pressInput — but the release is a second entry point
    // into the drive, so a press storm during the arrival would otherwise get
    // its steps on the way back up. See inputLive.
    if (!started || !inputLive()) return;
    endStep();
    stepId = `step:${id}`;
    stepLeft = STEP_MS;
    addInput(stepId, dir);
    press(dir);
    wake();
  }

  function endStep(): void {
    if (!stepId) return;
    dropInput(stepId);
    stepId = '';
    stepLeft = 0;
  }

  function restart(): void {
    endStep();
    // The carry does not survive a restart: the poster's press is a choice the
    // reader makes, and the film must not walk itself out of the bloom.
    stopPlay();
    hideTapHint();
    downAt.clear();
    inputs.length = 0;
    // Start over means the bank is closed too: a reader who chose the top of
    // the piece must not be offered the old year by the next reload.
    clearResume();
    phase = 'walk';
    // R2g: start over means START OVER, which is the dark poster and the opening
    // again rather than a lit 1600 frame with the walk already under way. The
    // stage goes back to the poster it opened on — in the theatre if that is
    // where the reader is, in the article's frame if it is not — and the press
    // that answers it blooms the world a second time. `started` is what makes
    // that press the poster's rather than a step (see pressInput).
    started = false;
    introDone = false;
    blooming = false;
    bloomT0 = 0;
    bloomP = 0;
    exposure = INTRO_EXPOSURE;
    stampIn = 0;
    birds.length = 0;
    hintsUp = false;
    hintsRetired = false;
    for (const el of hintEls) el.classList.remove('is-shown');
    stage.classList.add('is-poster');
    // …and the grain goes back down with the light it arrived with. See
    // startIntro for the other half of the pair.
    stage.classList.add('is-intro');
    showPoster(true);
    // The runway is re-resolved from the box the reader is actually in, which
    // may be the theatre rather than the deck it was first measured in.
    armRunway();
    prevYear = year;
    armed = false;
    lift = liftA = liftB = 0;
    liftMs = LIFT_MS;
    liftFrom = null;
    liftCam = null;
    pull = pullA = pullB = 0;
    pullMs = PULLBACK_MS;
    pullFrom = null;
    endPart = -1;
    revealT0 = 0;
    exitT0 = 0;
    look = 0;
    swing = 0;
    stridePhase = 0;
    facing = 1;
    ride = NaN;
    slopeVal = 0;
    slopeS = 0;
    roughS = 0;
    mClimb = 0;
    mClimbHard = 0;
    mDesc = 0;
    mRough = 0;
    gait = { ...GAIT_NEUTRAL };
    speedK = 0;
    driveDir = 0;
    turn = 'none';
    turnDir = 0;
    turnLeft = 0;
    dust.length = 0;
    primed = false;
    // Start over means the STORY starts over, so the flag comes down with it and
    // 1947 is a thing to be done again rather than a thing already done. (The
    // "gone for the page's life" rule in the hoist section is about WALKING back
    // and forth over the gate, not about a reader asking for the walk again.)
    hoist = 0;
    hoistDoneAt = 0;
    dragPx = 0;
    dragId = -1;
    hoistKey = false;
    lowerT0 = 0;
    lowerFrom = 0;
    reducedHoisting = false;
    gateIdleMs = 0;
    ropeHinted = false;
    ropeRetired = false;
    if (ropeHintEl) {
      ropeHintEl.classList.remove('is-shown');
      ropeHintEl.hidden = true;
    }
    announceGate(false);
    capK = 1;
    readK = 1;
    dwellK = 1;
    // The deck's queue, back to an empty sky with nothing owed to it.
    cardDue.fill(false);
    cardSpoken.fill(false);
    speaker = -1;
    speakerAt = 0;
    speakerFullAt = 0;
    speakerGroundFull = false;
    skyClearAt = 0;
    gateFadeAt = 0;
    cardsBusy = false;
    dwelling = false;
    wordsUp = false;
    moodAt(year, mood);
    showCard(-1);
    paintCards();
    setEra(eraAt(year));
    paintYear();
    syncControls();
    wake();
  }

  /* -- the loop -- */
  let running = false;
  let raf = 0;
  /** One warning per session if render() ever throws — see the try/catch at
   *  the render call. Never true in a healthy film. */
  let renderThrew = false;
  let lastFrame = 0;
  let lastEvent = 0;

  /**
   * Publish the light to the DOM. Every word over the canvas belongs to the sky
   * rather than to the theme, and the two composited layers over the canvas — the
   * vignette's depth and, since R2h, the grain's strength — come from the same
   * table.
   *
   * SIX inks go out rather than two, because the overlay stands on three
   * different things: --walk-text / --walk-text-dim are the caption's, resolved
   * against the sky at the caption band; --walk-stamp-text /
   * --walk-stamp-text-dim are R2d's date stamp's, resolved against the sky at
   * the TOP of the frame, which is a different colour on a graded sky with a
   * horizon glow in it; and --walk-land-text / --walk-land-text-dim are the hold
   * bar's and `start over`'s, resolved against the landmass. That last split is
   * not a nicety. The land is near-black in every row of the table INCLUDING
   * full daylight, so a single ink chosen for a paper sky would put the bar's
   * rule, its labels and `start over` in dark ink on black ground from about
   * 1975 to the end of the walk — which is the exact failure the caption fix
   * exists to remove, moved to the bottom of the frame.
   *
   * Only written when a value has actually moved: a custom property assignment
   * invalidates style for the subtree, and this would otherwise run sixty times
   * a second for changes of a thousandth of an alpha.
   *
   * --walk-text-halo is computed rather than authored, and it is the second half
   * of the caption fix. resolveInk() reports how close the sky is to the
   * crossover where neither ink has much of an advantage; the halo is the sky's
   * own colour pushed AWAY from whichever side the ink is on, and it is pushed
   * hardest exactly at that crossover. The few frames the ink cannot carry are
   * carried by the shadow.
   */
  function publishLight(): void {
    // The alphas follow the push: an ink that had to reach for white to be
    // legible had to stop being translucent to get there, and publishing the
    // authored alpha under it would undo the reach.
    const text = rgba(light.text, lerp(light.textA, 1, light.textPush));
    const dim = rgba(light.text, lerp(light.dimA, 1, light.textPush));
    const stampText = rgba(light.stampText, lerp(light.textA, 1, light.stampPush));
    const stampDim = rgba(light.stampDimText, lerp(light.dimA, 1, light.stampDimPush));
    const landText = rgba(light.landText, lerp(light.textA, 1, light.landPush));
    const landDim = rgba(light.landText, lerp(light.dimA, 1, light.landPush));
    const bg = light.capBg;
    const away = relLum(light.text) >= relLum(bg) ? BLACK : ([255, 255, 255] as RGB);
    const k = lerp(0.55, 0.92, light.ambiguity);
    const halo = rgba(lerpRgb(bg, away, k), lerp(0.55, 0.85, light.ambiguity));
    // R3: the same construction at the STAMP's box, off the stamp's own
    // ambiguity. The overlay's shared halo is the caption's, and at the two
    // crossover dips (~1786 down, ~1965 up) the top of the frame and the caption
    // band are on opposite sides of the crossover — so the shared halo is at its
    // weakest exactly where the year and the era ribbon need it most. Same three
    // lines, one box up, and no new bisection: `stampAmbiguity` and `stampBg`
    // were both already computed in resolveInk and thrown away.
    const sBg = light.stampBg;
    const sAway = relLum(light.stampText) >= relLum(sBg) ? BLACK : ([255, 255, 255] as RGB);
    const sK = lerp(0.55, 0.92, light.stampAmbiguity);
    const stampHalo = rgba(lerpRgb(sBg, sAway, sK), lerp(0.55, 0.85, light.stampAmbiguity));
    const vig = Math.round(light.vig * 100) / 100;
    if (text !== cssText) {
      cssText = text;
      stage.style.setProperty('--walk-text', text);
    }
    if (dim !== cssDim) {
      cssDim = dim;
      stage.style.setProperty('--walk-text-dim', dim);
    }
    if (stampText !== cssStamp) {
      cssStamp = stampText;
      stage.style.setProperty('--walk-stamp-text', stampText);
    }
    if (stampDim !== cssStampDim) {
      cssStampDim = stampDim;
      stage.style.setProperty('--walk-stamp-text-dim', stampDim);
    }
    if (landText !== cssLand) {
      cssLand = landText;
      stage.style.setProperty('--walk-land-text', landText);
    }
    if (landDim !== cssLandDim) {
      cssLandDim = landDim;
      stage.style.setProperty('--walk-land-text-dim', landDim);
    }
    if (halo !== cssHalo) {
      cssHalo = halo;
      stage.style.setProperty('--walk-text-halo', halo);
    }
    if (stampHalo !== cssStampHalo) {
      cssStampHalo = stampHalo;
      stage.style.setProperty('--walk-stamp-halo', stampHalo);
    }
    if (vig !== cssVig) {
      cssVig = vig;
      stage.style.setProperty('--walk-vig', String(vig));
      // The GRAIN is not published here and is not published anywhere. R2h tied
      // it to this same number — a stock that got coarser as the frame got
      // darker — and the feel-check rejected it: the constant grain reads as one
      // roll of film, and a grain that breathes with the era reads as the stock
      // changing under the picture. It is a flat 0.12 in the stylesheet again
      // (see .walk-grain in independence.astro) and the engine has no opinion.
    }
    // The readout's opacity: the year and the era ribbon dissolve as the
    // pull-back's real x-axis arrives underneath to replace them — and by the
    // time `start over` takes their slot there is nothing left of them to
    // collide with. Published on the stage, because the readout is back on the
    // film and everything the engine drives is inside it again.
    // …and R2g folds the opening into the same number rather than giving the
    // stamp a second opacity to be multiplied by: the date arrives across the
    // last third of the bloom and dissolves into the x-axis at the pull-back, and
    // one property owns both ends of its life.
    const foot = Math.round((1 - pull) * stampIn * 100) / 100;
    if (foot !== cssFoot) {
      cssFoot = foot;
      stage.style.setProperty('--walk-foot', String(foot));
    }
  }

  /**
   * Which card the ink is being resolved for: the one the stage has latched, or
   * the brightest of the twelve beats, or — when the sky is empty, which is most
   * of the walk — the last one that spoke. Holding the last one is what keeps
   * the ink from lurching between empty-sky frames and the frame a card arrives
   * on; nothing is being read in between, so nothing is being got wrong, and the
   * ink is already the right colour when the words appear.
   */
  let voiceCard = 0;

  function capBoxOf(): { x: number; top: number; bottom: number } {
    const box = cardBox[latch >= 0 ? latch : voiceCard];
    if (box && box.bottom > box.top) {
      // …at the height the card is actually standing at, which is its measured
      // height plus whatever it has stepped down to clear the world's mark. The
      // ink is resolved against the sky BEHIND THE WORDS, so it has to follow
      // them; on the ending frame the sky is one flat daylight and the two
      // answers agree to a hair, but that is a property of this frame rather
      // than a rule, and the next piece to reuse this will not be on paper.
      const i = latch >= 0 ? latch : voiceCard;
      const shift = wordsShiftOf(i);
      return shift === 0 ? box : { x: box.x, top: box.top + shift, bottom: box.bottom + shift };
    }
    return { x: size.w * 0.5, top: size.h * 0.18, bottom: size.h * 0.28 };
  }

  /* -- the sentence steps out of the mark's way (release day) -- */
  /**
   * How far the latched prose card is standing below its measured place, in
   * stage px, and which element is wearing it.
   *
   * THE MARK DOES NOT MOVE. It is a value on a chart and the sentence beside it
   * says so out loud ("The mark high overhead is the world's average"), so the
   * one thing that must not shift under the reader's eye is the thing being
   * named. When the mark's drawn height lands in the card's box, the CARD goes
   * down until its first line clears the star's halo.
   *
   * The formula is deliberately branchless and therefore continuous: a mark
   * above the card's top asks for nothing, and every px it descends past that
   * line the card follows it by one. Both ends of the choreography enter and
   * leave through the TOP of the box — the crane brings the mark down to its
   * true height, the pull-back carries it up to the end of the world's own
   * track — so the card slides away and slides back with no seam at either end
   * and no transition to declare. The cap is the floor of the sentence's room:
   * past it the card would be walking into the picture's middle, and a caption
   * in the centre of the frame is the sign-off's slot, not a caption's.
   *
   * It is keyed on WHAT IS SHOWN rather than on what is latched, and it holds
   * the shift across the fade-out on top of that. Neither is a detail: the
   * press that starts the pull-back drops this card's `is-shown` and latches
   * the next one while the first is still at a third of its opacity on the way
   * out, and both of the simpler rules snapped it 107px up the frame
   * (measured, phone) in the middle of its own crossfade. So a shown card gets
   * out of the mark's way; a card that has just stopped being shown FREEZES
   * where it stood and fades out there; and only once it is really gone does
   * the offset go. Frozen rather than tracking, because a caption on its way
   * out has no business still following anything.
   */
  const WORDS_MARK_CLEAR = 13;
  const WORDS_SHIFT_LIMIT = 0.54;
  /** Long enough to cover .walk-card's own 220ms fade-out with a frame or two
   *  in hand. Nothing reads it back, so it costs a comparison per card. */
  const WORDS_FADE_MS = 280;
  const cardShift = cards.map(() => 0);
  const cardShiftHold = cards.map(() => 0);
  /** The last height render() drew the mark at, kept for the probe alone: the
   *  hook is built before render runs, so the frame's own answer is not there
   *  yet and a probe reading it would only ever see -1. */
  let lastMarkY = -1;
  /** Whether any card is standing off its measured place, so the whole pass is
   *  one boolean on the frames it has nothing to do — which is all of them
   *  until the world's mark exists. */
  let anyShift = false;

  function stepWordsClear(markY: number, now: number): void {
    lastMarkY = markY;
    if (markY < 0 && !anyShift) return;
    anyShift = false;
    for (let i = 0; i < cards.length; i++) {
      const box = cardBox[i];
      const shown = cards[i].classList.contains('is-shown');
      // The fade-out's grace: opened the frame a shifted card stops being
      // shown, closed the moment it is shown again.
      if (shown) cardShiftHold[i] = 0;
      else if (cardShift[i] !== 0 && cardShiftHold[i] === 0) cardShiftHold[i] = now + WORDS_FADE_MS;
      let want = 0;
      if (markY >= 0 && i !== SIGNOFF_CARD && box.bottom > box.top) {
        if (shown) {
          const cap = Math.max(0, size.h * WORDS_SHIFT_LIMIT - box.bottom);
          // Rounded: this is written to the DOM on every frame it changes, and
          // a sub-pixel translate on a line of italic is a re-rasterised glyph
          // run for no visible gain.
          want = Math.round(clamp(markY + WORLD_STAR_R + WORDS_MARK_CLEAR - box.top, 0, cap));
        } else if (now < cardShiftHold[i]) {
          want = cardShift[i];
        }
      } else if (!shown && now < cardShiftHold[i]) {
        // …and it holds through the end of the mark too: the star can be gone
        // before the sentence that named it has finished leaving.
        want = cardShift[i];
      }
      if (want !== cardShift[i]) {
        cardShift[i] = want;
        cards[i].style.translate = want === 0 ? '' : `0 ${want}px`;
      }
      if (want !== 0) anyShift = true;
    }
  }
  /** The latched card's own shift, which is the one the canvas has to know
   *  about: the knockout and the ink both follow the words. */
  const wordsShiftOf = (i: number): number => (i >= 0 && i < cardShift.length ? cardShift[i] : 0);

  /**
   * Two or three specks at a footfall. Spawned from the loop, which is the only
   * place that knows where his feet are in years; they then live on the ground
   * they were kicked off, so the camera can pan and zoom under them.
   */
  function kickDust(footYear: number, footValue: number, dir: number): void {
    if (reduceMotion.matches) return;
    for (let i = 0; i < DUST_PER_STEP; i++) {
      if (dust.length >= DUST_MAX) dust.shift();
      dust.push({
        year: footYear,
        value: footValue,
        dx: 0,
        dy: 0,
        vx: -dir * DUST_DRIFT * (0.4 + Math.random() * 0.9),
        vy: -DUST_RISE * (0.4 + Math.random()),
        age: 0,
      });
    }
  }

  function stepDust(dt: number): void {
    if (!dust.length) return;
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i];
      d.age += dt;
      if (d.age >= DUST_LIFE) {
        dust.splice(i, 1);
        continue;
      }
      const k = dt / 1000;
      d.dx += d.vx * k;
      d.dy += d.vy * k;
      // Air: the drift dies away rather than running off at a constant rate.
      d.vx *= 1 - Math.min(1, k * 3);
      d.vy *= 1 - Math.min(1, k * 3);
    }
  }

  function frame(now: number): void {
    // A backgrounded tab can hand back an enormous dt; cap it so nothing
    // teleports on return. Floored at ZERO as well, and the floor is a real
    // bug's fix rather than tidiness: wake() stamps lastFrame with
    // performance.now(), and the rAF timestamp handed here is the FRAME's
    // start time, which on a busy compositor (a fullscreen transition, a
    // visibility resume, a press after a settle) can be a few ms EARLIER than
    // that stamp. A negative dt runs every ease() backward past its own
    // source — capK and speedK dip below zero — and Math.pow of a negative
    // paceU is NaN, which stridePhase then latches for good: the walker's
    // transform goes non-finite and he silently never draws again while the
    // rest of the film walks on. That is the "walker disappears" of
    // 2026-08-15 morning, all three sightings.
    const dt = Math.min(Math.max(now - lastFrame, 0), 100);
    lastFrame = now;

    // The one frame that can kill the film. A theatre transition can hand
    // resize() a mid-relayout box (0×0 for a beat), and a degenerate size
    // poisons the ground mapping with NaN — which makes the gradient and arc
    // calls in render() THROW, and a throw here used to take the whole rAF
    // loop down with it. That is the "walker disappears" freeze: a frozen,
    // half-drawn frame with a dead loop behind it. So: re-read the box, and
    // if it is still not real, sit this frame out with the loop alive —
    // nothing simulates, nothing draws, and the next layout pass restores it.
    if (!(size.w > 0 && size.h > 0)) {
      resize();
      if (!(size.w > 0 && size.h > 0)) {
        raf = requestAnimationFrame(frame);
        return;
      }
    }

    // --- the drive ---
    // Ground under the walker at a constant screen speed, converted through the
    // camera's CURRENT scale. Nothing here is on a clock of its own beyond the
    // momentum ramp: let go and he takes a quarter of a second to stop.
    //
    // One hold covers 1600 to the end of the record. The story years go by under
    // him — the caption swaps as each one passes and the walk does not break
    // stride for it, it only slows through it (see capK) — and the only year
    // that takes the drive away is the last one.
    // --- the tapped step, running itself out ---
    if (stepLeft > 0) {
      stepLeft -= dt;
      if (stepLeft <= 0) endStep();
    }

    // --- the opening (R2g) ---
    // One branch, and it is dead for every frame after the first five seconds of
    // a fresh walk: past `introDone` this is a single boolean test. The bloom
    // runs the exposure multiplier up to 1, the stamp arrives across the last
    // third of it, and the mid-screen hints are offered at the end of it.
    if (blooming) {
      const p = clamp((now - bloomT0) / BLOOM_MS, 0, 1);
      bloomP = p;
      // The bloom as ONE number still, and it is the gate on the whole sweep
      // rather than any band's own exposure: it reaches 1 exactly when the last
      // band does, which is what lets the render below skip the pass entirely on
      // a comparison. What each band is actually multiplied by is `bloomP` less
      // that band's lead — see exposePalette.
      exposure = lerp(INTRO_EXPOSURE, 1, smoothstep(p));
      stampIn = smoothstep(clamp((p - BLOOM_STAMP_FROM) / (1 - BLOOM_STAMP_FROM), 0, 1));
      if (p >= 1) {
        blooming = false;
        introDone = true;
        bloomP = 1;
        exposure = 1;
        stampIn = 1;
        showHints();
      }
    }
    stepBirds(dt);

    const wanted = phase === 'walk' && armed ? heldDir() : 0;

    // The turn. He is only allowed to change direction from a standstill, so a
    // press the other way while he is moving brakes first, holds a beat in a
    // neutral stance while he comes round, and only then accelerates.
    if (turn === 'none') {
      if (wanted !== 0 && driveDir !== 0 && wanted !== driveDir && speedK > 0.02) {
        turn = 'brake';
        turnDir = wanted;
      } else if (wanted !== 0 && (driveDir === 0 || speedK <= 0.02)) {
        driveDir = wanted;
        facing = wanted;
      }
    } else if (turn === 'brake') {
      // A reader who lets go mid-turn has simply stopped; there is nothing to
      // turn toward any more.
      if (wanted === 0) turn = 'none';
      else if (wanted === driveDir) turn = 'none';
      else {
        turnDir = wanted;
        if (speedK <= 0.02) {
          turn = 'hold';
          turnLeft = TURN_HOLD_MS;
          driveDir = turnDir;
          facing = turnDir;
        }
      }
    } else {
      turnLeft -= dt;
      if (wanted === 0 || turnLeft <= 0) turn = 'none';
    }

    // The ramp itself: 0 → full over ~350ms on a press, full → 0 over ~250ms on
    // a release, and pinned to 0 for as long as the turn is running.
    const pedal = turn === 'none' && wanted !== 0 && wanted === driveDir ? 1 : 0;
    speedK = reduceMotion.matches
      ? pedal
      : ease(speedK, pedal, dt, pedal > 0 ? TAU_ACCEL : TAU_BRAKE);
    if (speedK < 0.002 && pedal === 0) speedK = 0;

    // --- the effective speed cap ---
    // NOT a change to speedK. The reader's hold and the momentum ramp are left
    // exactly as they were; this is a multiplier on the ground he covers, so a
    // checkpoint or a famine slows the WALKER and never the input. Two reasons
    // to slow down: the story beat he is approaching, and how heavy the years
    // are.
    //
    // THEY COMBINE BY MIN, and R2b's whole friction fix is in that word. Product
    // was the R2 rule and it compounded: the approach to Bengal 1943 is a
    // checkpoint (0.32 then) inside the deepest trudge (0.70 then), and 0.32 ×
    // 0.70 is 0.22 of walking pace — a man who has stopped, at the exact moment
    // the piece most needs him to keep going. Min says the strongest single
    // reason wins and nothing stacks, which is also the only rule that stays
    // legible when a third reason is added later.
    //
    // R2d is that third reason, and it went in on exactly those terms: the
    // READING TRUDGE, a cap of 0.6 across the eight years after any beat, so the
    // ground under a caption goes past at a pace the caption can be read at. One
    // more MIN term and nothing else — see readingCap().
    //
    // R2g is the fourth, and it is the third one finished rather than a new idea.
    // The reading trudge is measured in YEARS after a beat, and R2g's card queue
    // is measured in SECONDS on the sky — so a card held past its own eight years
    // by the wall clock had the ground running out from under it at full pace
    // again, which is the exact failure the trudge was written to prevent, moved
    // a few years to the right. Compounded over twelve beats it put Plassey's
    // sentence on the sky at year 1867. So the cap now holds for as long as there
    // are WORDS ON THE SKY, at the same authored READ_CAP and by the same MIN, and
    // the drift it leaves is the irreducible one: two beats fifteen years apart
    // cannot both be read at walking pace, whatever the cap is.
    //
    // A reader who has asked for less motion gets none of the four — they are
    // taking the beats as cuts and there is no approach to slow down through.
    //
    // R2i RETUNES that fourth term and adds nothing beside it. READ_CAP was one
    // number for two different jobs — holding the ground under a sentence being
    // READ TO the reader, and under one they have walked back into — and the
    // first of those needs a far deeper cap than 0.6 to keep the stamp and the
    // words on the same year (see the dwell). So the term is now the DWELL while
    // a queued card is rising or inside its floor, READ_CAP for everything else
    // that has words on the sky, and 1 when the sky is empty. Eased rather than
    // stepped, because a cap that changes by a factor of five in one frame is
    // the walker being shoved rather than slowing down.
    moodAt(year, mood);
    const pxPerYearDrive = size.w > 0 ? size.w / Math.max(cam.xWidth, 1e-6) : 0;
    readK = reduceMotion.matches ? 1 : readingCap(year);
    // Years per second at full stride, here rather than in the dwell because the
    // drive already owns both halves of it.
    const fullPerS =
      pxPerYearDrive > 0 ? (WALK_SPEED_PX_S * widthScale(size.w)) / pxPerYearDrive : 0;
    const dwellTo = dwelling ? dwellCap(speaker, fullPerS) : wordsUp ? READ_CAP : 1;
    if (reduceMotion.matches) dwellK = 1;
    else {
      dwellK = ease(dwellK, dwellTo, dt, dwellTo < dwellK ? TAU_DWELL_IN : TAU_DWELL_OUT);
      if (dwellTo === 1 && dwellK > 0.999) dwellK = 1;
    }
    capK = reduceMotion.matches
      ? 1
      : Math.min(
          checkpointCap(year, pxPerYearDrive),
          1 - TRUDGE_DRIVE * mood.trudge,
          readK,
          dwellK,
        );

    let driving = false;
    if (phase === 'walk' && speedK > 0 && driveDir !== 0 && india && size.w > 0) {
      // The world's left wall, and R2g moves it west of the series: the walk
      // opens on the runway, so holding back walks him to the runway's start and
      // stands him against that instead of against 1600.
      const start = runwayFrom;
      // The flagpole. While the flag is down the walk cannot pass 1947 — but
      // walking BACK out of it is untouched, so the gate is a wall in one
      // direction only. Once the flag is up, `limit` is the end of the series
      // again for the rest of the page's life.
      const gating = hoist < 1;
      const limit = gating ? Math.min(endYear, GATE_YEAR) : endYear;
      // …and a beat after the flag lands before the ground moves again, so the
      // frame the reader earned is not immediately walked out of.
      const opening = !gating && hoistDoneAt > 0 && now - hoistDoneAt < HOIST_OPEN_MS;
      const pxPerYear = pxPerYearDrive;
      const speed = WALK_SPEED_PX_S * widthScale(size.w) * speedK * capK;
      const step = ((speed / pxPerYear) * dt) / 1000;
      const to = year + driveDir * step;
      if (driveDir > 0 && opening) {
        // Standing at the pole with the flag up, for one beat.
      } else if (driveDir > 0 && to >= limit && limit >= endYear) arriveEnd();
      else {
        // The runway's start is a wall, not an event: he stops there and stays
        // facing back, and holding on does nothing but stand him still against
        // it. 1947 is the same wall with a way through it.
        const next = clamp(to, start, Math.max(limit, year));
        if (Math.abs(next - year) > 1e-9) {
          year = next;
          facing = driveDir;
          driving = true;
          setEra(eraAt(year));
          paintYear();
          moodAt(year, mood);
        }
      }
    }
    // …and out to the deck, which needs to know whether the ground moved (see
    // the card clock's suspension in paintCards). Written here rather than read
    // there because `driving` is the drive's own answer and there must not be a
    // second one.
    walkerMoving = driving;

    // --- the hoist ---
    // Everything that can raise the flag, in one place, and all of it additive:
    // a reader dragging the rope while holding forward gets both, which is fine.
    // Off the gate it comes back DOWN — see the lowering below.
    const atGate = gated();
    let lowering = false;
    if (atGate) {
      // Back at the pole, so any lowering in progress is over: the reader has
      // come back for the flag and it is theirs to raise from wherever it is.
      lowerT0 = 0;
      let dh = 0;
      // Whether the reader has actually FOUND the rope (or the key, or the
      // carry's tap), as opposed to still holding the same forward press that
      // walked them here. Only the first of those retires the offer of the
      // rope: the plain hold is not evidence of anything, and a reader who is
      // holding forward and watching the flag creep up eight seconds' worth is
      // exactly who the offer is for.
      let deliberate = false;
      if (reduceMotion.matches) {
        if (reducedHoisting) dh = dt / HOIST_REDUCED_MS;
      } else {
        // manualDir, not heldDir: the carry's engine-owned hold must never
        // raise the flag. A carried walk stands here — the whisper asking for
        // a tap — until the reader answers.
        if (manualDir() > 0) dh = dt / HOIST_HOLD_MS;
        if (carryHoisting) {
          dh += dt / HOIST_TAP_MS;
          deliberate = true;
        }
        if (hoistKey) {
          dh += (HOIST_ARROWUP_RATE * dt) / HOIST_HOLD_MS;
          deliberate = true;
        }
        if (dragPx > 0) {
          dh += dragPx / (HOIST_DRAG_HEIGHTS * Math.max(size.h, 1));
          deliberate = true;
        }
      }
      dragPx = 0;
      if (dh > 0) {
        hoist = Math.min(1, hoist + dh);
        gateIdleMs = 0;
        if (deliberate) retireRopeHint();
        if (hoist >= 1) {
          hoistDoneAt = now;
          reducedHoisting = false;
          // The carried reader's answer is complete; the carry itself is still
          // in `inputs`, which is the whole of how it resumes on the far side
          // of the gate's opening beat.
          carryHoisting = false;
          retireRopeHint();
          // The flag is at the masthead and Nehru can speak (paintCards, below,
          // is what lets him).
        }
      } else {
        gateIdleMs += dt;
        if (gateIdleMs >= HOIST_HINT_MS) showRopeHint();
      }
    } else {
      dragPx = 0;
      gateIdleMs = 0;
      // R2g: NO RESTING HALF-MAST. A reader who starts the hoist, changes their
      // mind and walks back out of the gate used to leave the flag hanging
      // wherever their hands left it — and a tricolour parked half way up a pole
      // is not a neutral state, it is a flag at half-mast. So an ABANDONED hoist
      // lowers itself, over a couple of seconds, in the register of a flag being
      // brought down rather than dropped; coming back to the pole re-offers the
      // whole hoist from the furled bundle.
      //
      // A FINISHED hoist is untouched and stays at the masthead for the life of
      // the page — `hoist >= 1` fails the test below, as it fails `gated()`. The
      // ratchet is still a ratchet; what it does not do any more is ratchet from
      // nowhere.
      if (hoist > 0 && hoist < 1 && phase === 'walk' && year < GATE_YEAR) {
        if (lowerT0 === 0) {
          lowerT0 = now;
          lowerFrom = hoist;
        }
        const p = reduceMotion.matches ? 1 : clamp((now - lowerT0) / HOIST_LOWER_MS, 0, 1);
        hoist = p >= 1 ? 0 : lowerFrom * (1 - smoothstep(p));
        lowering = hoist > 0;
      } else lowerT0 = 0;
    }
    announceGate(gated());
    // The sky's twelve beats, every frame, off the year he has just moved to.
    paintCards();

    // --- the two camera levels ---
    // Each is an (A → B) ease on its own clock, which is what makes forward and
    // backward the same code. A ride that has arrived writes its destination
    // exactly, so the settle test below can compare for equality rather than
    // against an epsilon.
    if (lift !== liftB) {
      const p = clamp((now - liftT0) / liftMs, 0, 1);
      lift = p >= 1 ? liftB : lerp(liftA, liftB, smoothstep(p));
      if (p >= 1) syncControls();
    }
    if (pull !== pullB) {
      const p = clamp((now - pullT0) / pullMs, 0, 1);
      pull = p >= 1 ? pullB : lerp(pullA, pullB, smoothstep(p));
      if (p >= 1) syncControls();
    }
    // R2M: THE TWO SETS OF WORDS THAT USED TO WAIT ON A CAMERA NOW WAIT ON THE
    // READER, and both gates are gone from this loop rather than retuned.
    //
    // They read the RIDE rather than a clock and that was the right rule for
    // them: a sentence about a picture goes up when the picture is there to be
    // read against. What the device feel-check asked for is a stronger version
    // of the same idea — the picture arrives, and the reader decides when they
    // have finished looking at it. So the mark's words (R2l held them
    // MARK_WORDS_GAP_MS behind the mark, alone over the settled frame) and the
    // ending screen (R2e brought it in at PULL_CARD_AT of the flight) are
    // presses now, and there is nothing left here to run. See endingPress.
    //
    // PULL_CARD_AT and MARK_WORDS_GAP_MS went with them. The mark still comes up
    // alone at the top of the crane — that is the LIFT's own ramp and is
    // untouched — it simply has no words scheduled behind it.

    // --- the reveal's own clock, forwards and (if he turned round) back ---
    // The chrome is on revealT0 and arrives at part one; the mark is a pure
    // function of the LIFT, which is what lets it fade back out for free when a
    // reader steps down out of level one. Both live in `phase !== 'walk'` because
    // the chrome, once in, stays in through both levels.
    let chrome = 0;
    let mark = 0;
    let exiting = false;
    if (phase !== 'walk') {
      const t = now - revealT0;
      mark = smoothstep(clamp((lift - LIFT_MARK_FROM) / (LIFT_MARK_TO - LIFT_MARK_FROM), 0, 1));
      chrome = clamp((t - REVEAL_CHROME_MS) / REVEAL_CHROME_FADE_MS, 0, 1);
    } else if (exitT0 > 0) {
      const t = clamp((now - exitT0) / REVEAL_EXIT_MS, 0, 1);
      chrome = exitChrome * (1 - t);
      exiting = t < 1;
      if (!exiting) exitT0 = 0;
    }
    // What is still animating on a clock of its own. The mark's ramp is inside
    // the pull-back's, which the `pull < 1` test below already keeps alive.
    const revealRunning =
      exiting || (phase !== 'walk' && now - revealT0 < REVEAL_TOTAL_MS);

    const here = india ? india.sample(year) : { value: 0, slope: 0 };
    const walking = frameFor(year);
    // The camera target, and the two levels stack: level two mixes from the frame
    // level one left behind, level one from the frame he walked in. Falling from
    // one branch to the next as a ride runs back down to zero is continuous by
    // construction, because each level's FROM is the frame the one below it
    // arrives at.
    const want =
      pull > 0 && reveal
        ? mixFrames(pullFrom ?? walking, reveal, pull)
        : lift > 0 && liftCam
          ? mixFrames(liftFrom ?? walking, liftCam, lift)
          : walking;
    const snap = !primed;
    if (!primed) {
      Object.assign(cam, want);
      prevYear = year;
      prevCamX = cam.xMin;
      stridePhase = 0;
      swing = 0;
      primed = true;
    } else {
      cam.xMin = ease(cam.xMin, want.xMin, dt, TAU_CAMERA);
      // The zoom is smoothed in px-per-year rather than in years-per-screen:
      // the two are reciprocal, and easing the span makes a zoom-out crawl at
      // the start and rush at the end.
      const curPx = size.w / Math.max(cam.xWidth, 1e-6);
      const wantPx = size.w / Math.max(want.xWidth, 1e-6);
      cam.xWidth = size.w / Math.max(ease(curPx, wantPx, dt, TAU_ZOOM), 1e-6);
      cam.yMin = ease(cam.yMin, want.yMin, dt, TAU_CAMERA);
      cam.yMax = ease(cam.yMax, want.yMax, dt, TAU_CAMERA);
    }

    // --- the pose machine ---
    // Two readings of the ground under him, both in SCREEN units and both
    // low-passed, and everything about how he moves comes off them.
    //
    // `up` is the slope AHEAD of him: the screen slope times his facing, so a
    // descent he walked down forwards is a climb when he walks back up it and
    // no mode below needs a case for the direction of travel.
    // Two heights, and they are not the same number. `walkerH0` is the STAGE's
    // figure, which is what the gait's cycle length is measured in (see
    // STRIDE_CYCLE_PER_H); `walkerH` is the height he is actually DRAWN at, the
    // stage's figure through R2k's era curve, and it is what everything measured
    // off the body reads — the feet's own years below, the roughness window, the
    // draw's leg clamp and halo.
    const walkerH0 = walkerHeight(size.w);
    const eraK = eraScaleK(year);
    const walkerH = walkerH0 * eraK;
    const pxPerYearNow = size.w > 0 ? size.w / Math.max(cam.xWidth, 1e-6) : 0;
    const pxPerValue = plotH / (cam.yMax - cam.yMin || 1);
    const slopeNow = pxPerYearNow > 0 ? (here.slope * pxPerValue) / pxPerYearNow : 0;
    slopeS = snap ? slopeNow : ease(slopeS, slopeNow, dt, TAU_SLOPE);
    const up = facing * slopeS;

    // Roughness: how far the ground departs from the straight line joining the
    // two ends of a stride, RMS, in units of the figure's height. A ramp of any
    // steepness scores zero; a single-year gouge does not. Cheap on purpose —
    // seven sample() calls, the same evaluator everything else reads.
    let roughNow = 0;
    if (india && pxPerYearNow > 0 && walkerH > 0) {
      const halfPx = FOOT_AMP * 2 * walkerH;
      const halfYears = halfPx / pxPerYearNow;
      const a = india.sample(year - halfYears).value;
      const b = india.sample(year + halfYears).value;
      let acc = 0;
      for (let i = 1; i < ROUGH_PROBES - 1; i++) {
        const t = i / (ROUGH_PROBES - 1);
        const v = india.sample(year - halfYears + 2 * halfYears * t).value;
        const d = ((v - lerp(a, b, t)) * pxPerValue) / walkerH;
        acc += d * d;
      }
      roughNow = Math.sqrt(acc / (ROUGH_PROBES - 2));
    }
    roughS = snap ? roughNow : ease(roughS, roughNow, dt, TAU_SLOPE);

    // The raw mode targets. Each is a ramp, and each is then eased over
    // TAU_MODE, so a mode change is a blend and never a switch.
    const tClimb = clamp((up - CLIMB_ON) / (CLIMB_FULL - CLIMB_ON), 0, 1);
    const tClimbHard = clamp((up - CLIMB_HARD_ON) / (CLIMB_HARD_FULL - CLIMB_HARD_ON), 0, 1);
    const tDesc = clamp((-up - DESC_ON) / (DESC_FULL - DESC_ON), 0, 1);
    const tRough = clamp((roughS - ROUGH_ON) / (ROUGH_FULL - ROUGH_ON), 0, 1);
    mClimb = snap ? tClimb : ease(mClimb, tClimb, dt, TAU_MODE);
    mClimbHard = snap ? tClimbHard : ease(mClimbHard, tClimbHard, dt, TAU_MODE);
    mDesc = snap ? tDesc : ease(mDesc, tDesc, dt, TAU_MODE);
    mRough = snap ? tRough : ease(mRough, tRough, dt, TAU_MODE);

    // The multipliers compound: rough ground inside a climb is shorter still,
    // and famine ground inside either is shorter again. R2g splits the product
    // in two, because the two halves want different CADENCES under them (see
    // GaitMod.cycle): what the SLOPE does to the stride is compensated in full,
    // so a careful descent is short quick steps at the same travel speed, and
    // what the BODY does to it keeps the square-root rule it was authored with.
    const strideSlope =
      lerp(1, STRIDE_CLIMB, mClimb) *
      lerp(1, STRIDE_CLIMB_HARD / STRIDE_CLIMB, mClimbHard) *
      lerp(1, STRIDE_DESC, mDesc);
    const strideBody =
      lerp(1, STRIDE_ROUGH, mRough) *
      (1 - TRUDGE_STRIDE * mood.trudge) *
      (1 + PRIDE_STRIDE * mood.pride);
    // …and R2k's dwell split over both of them, which is the one multiplier in
    // here that is about the CLOCK rather than about the ground. `speedK * capK`
    // is the drive's own fraction of open pace, exactly as the step below
    // computes it, so this needs no measurement of its own and no state: at open
    // stride it is 1 and every number here is what R2g left it as. See
    // PACE_SPLIT for why both halves take the same one.
    //
    // `cycle0` is in the divisor so the split is ONE tempo everywhere rather than
    // a fraction of whatever tempo the terrain mode has already set. Without it a
    // descent — whose cycle is short and quick by construction (see
    // GaitMod.cycle) — would shorten to half again the steps a minute the flat
    // ground next to it does, and the walker would change tempo as the slope
    // changed under a card he had not finished reading.
    const cycle0 = strideSlope * Math.sqrt(Math.max(strideBody, 0.2));
    // Floored at zero before the fractional pow below: Math.pow(negative,
    // 0.58) is NaN, and the drive's two eases can only reach below zero on a
    // frame whose dt was corrupt — but this is the one expression in the file
    // that turns such a frame into a permanent latch, so it wears the guard.
    const paceU = Math.max((speedK * capK) / Math.max(cycle0, 0.2), 0);
    const paceK = reduceMotion.matches
      ? 1
      : paceU >= 1
        ? 1
        : Math.max(Math.pow(paceU, PACE_SPLIT), PACE_STRIDE_MIN);
    gait = {
      stride: strideSlope * strideBody * paceK,
      cycle: cycle0 * paceK,
      lift: lerp(1, LIFT_CLIMB, mClimb) * lerp(1, LIFT_ROUGH, mRough) * (1 - TRUDGE_LIFT * mood.trudge),
      reach: mClimb,
      reachBoth: mClimbHard,
      crouch: mDesc,
      // The climb's lean only. The descent's brace is a blend target rather than
      // a second term — see `brace` and drawWalker.
      lean: CLIMB_LEAN * mClimb,
      brace: mDesc,
    };

    // --- the gait ---
    // Ground covered since the last frame, in screen px. The camera moves under
    // the walker, so his stride is Δyear read through the camera's current
    // scale, not the change in his own screen x. Read off the camera AFTER its
    // ease so a zoom change does not spike the stride.
    //
    // Divided by the cycle multiplier as well as scaling the foot offsets by the
    // stride: short steps mean MORE of them over the same ground, which is what
    // shortening a stride actually looks like.
    //
    // R2b divided by the square root of the whole stride multiplier, on the
    // grounds that full no-slip compensation at a third of a stride is three
    // times the step rate and reads as a scurry. R2g keeps that for the BODY's
    // half of the multiplier and drops it for the SLOPE's: a man picking his way
    // downhill does take short quick steps and does not slow down doing it, and
    // the root there is exactly the "floats down the ramp" the round was called
    // to fix. See GaitMod.cycle, where the two halves are separated.
    //
    // R2j drops the guard from a fifth of a cycle to a fortieth, and it is not a
    // retune: the guard exists so this cannot divide by ~0, and 0.2 was safe only
    // while the slope and body multipliers were the only things in `cycle`. The
    // dwell split multiplies it by paceK, which reaches PACE_STRIDE_MIN at the
    // deepest dwell — and a clamp that bit there would be the one thing in the
    // file that breaks the no-slip contract, because `stride` would keep
    // shrinking while the phase stopped compensating and the feet would skate.
    // Nothing reaches 0.025 in practice; it is a floor against division, not a
    // tuning knob.
    //
    // R2k measures the cycle in the STAGE's figure and not the drawn one, and
    // takes the era curve's SQUARE ROOT on top: a taller walker's legs swing
    // slower the way a longer pendulum does, and the root is what keeps both ends
    // of the era curve inside one tempo band instead of swinging the cadence by
    // half again across the piece. See STRIDE_CYCLE_PER_H.
    const halfCyclePx =
      (STRIDE_CYCLE_PER_H * walkerH0 * Math.sqrt(eraK) * Math.max(gait.cycle, 0.025)) / 2;
    const dYear = year - prevYear;
    const strides =
      cam.xWidth > 0 && size.w > 0
        ? ((Math.abs(dYear) / cam.xWidth) * size.w) / halfCyclePx
        : 0;
    prevYear = year;
    // Modulo 2 so the phase cannot drift into float mush over a long session;
    // the pose only ever reads sin(phase·π), which has period 2 anyway.
    //
    // A foot PLANTS as the cycle crosses 0.5 (the leading foot) or 1.5 (the
    // trailing one) — those are the phases where its lift factor reaches zero —
    // so a crossing either way is a footfall, and a footfall kicks up dust.
    const phaseBefore = stridePhase;
    const signed = dYear >= 0 ? strides : -strides;
    stridePhase = (stridePhase + signed) % 2;
    if (stridePhase < 0) stridePhase += 2;
    // The self-heal, same shape as ride's below: the phase is the one
    // accumulator the walker's whole figure hangs off (theta, the bob, both
    // feet), NaN % 2 is NaN, and a NaN here otherwise survives every frame
    // that follows. One bad frame costs a single blink of the legs; a latch
    // costs the walker for the rest of the session.
    if (!Number.isFinite(stridePhase)) stridePhase = 0;
    const speed = dt > 0 ? (strides / dt) * 1000 : 0;
    const swingTarget = driving && speed >= STAND_SPEED ? 1 : 0;
    swing = ease(swing, swingTarget, dt, TAU_SWING);
    // The look up is the third pose, and it has two occasions. The first is
    // LEVEL ONE: he cranes his neck as the camera cranes with him, a beat after
    // the press so the frame moves first and the head follows it. Until that
    // press he is standing in the frame he arrived in with nothing overhead to
    // look at. It then stays for the rest of the piece — and it comes back DOWN
    // if the reader steps back out of level one, because the phase does, which is
    // the whole reason this reads the phase and not a latch.
    // The other occasion is the flagpole: he brakes, and once he has actually
    // STOPPED (which is what the swing test is — the look is a standing pose and
    // blending it into a stride reads as a stumble) he looks up at the masthead
    // and stays looking up for as long as the reader is raising the flag.
    const lookTarget =
      phase === 'pull' ||
      (phase === 'lift' && liftB > 0 && now - liftT0 >= LIFT_LOOK_MS) ||
      (atGate && swing < 0.2)
        ? 1
        : 0;
    look = reduceMotion.matches ? lookTarget : ease(look, lookTarget, dt, TAU_LOOK);

    // --- the suspension ---
    // Where the two feet are, in years, and what the ground is doing under each
    // of them. The pose is asked for the offsets rather than the draw guessing
    // them, so the feet that get sampled here are the feet that get drawn — and
    // it is asked with the same `gait` the draw will use, or the two disagree.
    // The offset is signed by `facing`: his front foot is in front of him.
    const stance = poseAt(stridePhase, clamp(swing, 0, 1), clamp(look, 0, 1), gait, mood);
    const feet = [0, 1].map((i) => {
      const dx = stance.feet[i];
      const at =
        india && size.w > 0
          ? year + ((facing * dx * walkerH) / size.w) * cam.xWidth
          : year;
      return { dx, at, value: india ? india.sample(at).value : here.value };
    });
    // What the hip is asked to ride: the mean of the two feet, pulled toward the
    // LOWER of them on a descent. On a ramp the mean is itself a ramp and the
    // body glides down it; the lower foot alternates twice a stride, so mixing it
    // in is what makes him step DOWN the hill instead of skating it. See
    // DESC_HIP_LOW. Flat ground is the mean exactly, as it always was.
    const mean = (feet[0].value + feet[1].value) / 2;
    const level =
      mDesc > 0
        ? lerp(mean, Math.min(feet[0].value, feet[1].value), DESC_HIP_LOW * mDesc)
        : mean;

    // --- the dust ---
    // A foot PLANTS as the stride cycle crosses 0.5 (the leading foot) or 1.5
    // (the trailing one): those are the phases where its own lift factor reaches
    // zero. Crossing either of them in either direction is a footfall, and a
    // footfall kicks up two or three specks at that foot's own year.
    stepDust(dt);
    if (driving && india && Math.abs(signed) < 1) {
      for (let i = 0; i < 2; i++) {
        if (!crossedPlant(phaseBefore, stridePhase, signed, i)) continue;
        kickDust(feet[i].at, feet[i].value, facing);
      }
    }
    // He rides the mean of the two, filtered. Everything the terrain does under
    // one foot in a single year arrives at the body halved and late, which is
    // the whole of the annual-era fix that is not the slope cap.
    //
    // …but only the WIGGLE arrives late. The ride is first carried forward along
    // the terrain's own smoothed slope by the ground he covered this frame, so a
    // steady climb or fall has no lag in it at all. Without that the body sat
    // most of a body-height behind its feet on the steep stretches, which is
    // exactly what used to stretch the legs.
    //
    // …and the filter LOOSENS on a descent. TAU_RIDE was chosen to smooth away
    // exactly the sawtooth that DESC_HIP_LOW is now deliberately feeding it, so
    // leaving it at 120ms would have the two cancel: the step down is only worth
    // adding if the suspension is soft enough to let it through.
    const rideTau = mDesc > 0 ? lerp(TAU_RIDE, TAU_RIDE_SLOPE, mDesc) : TAU_RIDE;
    slopeVal = snap ? here.slope : ease(slopeVal, here.slope, dt, TAU_RIDE);
    const carried = Number.isFinite(ride) ? ride + dYear * slopeVal : level;
    ride = snap || !Number.isFinite(ride) ? level : ease(carried, level, dt, rideTau);

    // --- the light, and the ground's own travel ---
    // Both are pure functions of where he is standing and how far the camera has
    // moved, resolved here so the draw is handed finished values.
    paletteAt(year, light);
    // …and the one thing the reader owns about the light. The 1947 stop is first
    // light: sky lifted off midnight, the rim burning back up, the dawn band on
    // the horizon. All of it is held out by the hoist, so a reader arriving at
    // the pole with the flag down sees the 1946 night and nothing else, and the
    // dawn arrives on the halyard with the flag.
    //
    // THE BLEND IS FLAT PAST 1946, NOT A RAMP, and that is the R2c fix for a
    // real bug: it used to be weighted by (year − 1946), which meant the frame
    // was mixing a night that was fading OUT with a 1947 row that was fading IN,
    // and the product N + t(1−t)(D−N) is zero at both ends and a quarter of the
    // way to the dawn in the middle. So the approach to the flagpole brightened
    // and then went dark again — the flicker the feel-check saw at 1947. Holding
    // the night flat over the whole approach is continuous at 1946 for free,
    // because NIGHT_PALETTE *is* the 1946 row.
    //
    // The dawn band is scaled by the hoist across the WHOLE of its own ramp for
    // the same reason: DAWN_BAND_FROM is 1945, so without this the horizon
    // starts lifting two years before the reader touches the rope.
    //
    // Still a pure function of (year, hoist): walking back rewinds it, and once
    // the flag is up the multiplier is 1 for the rest of the page, so the arc
    // past 1948 is the authored one whatever the reader did here.
    if (hoist < 1) {
      const open = smoothstep(hoist);
      if (year >= DAWN_NIGHT_YEAR) mixPalette(light, NIGHT_PALETTE, 1 - open, light);
      light.dawnA *= open;
    }
    // …and the opening's one multiplier, over the finished light and nothing
    // else. Past the bloom this is a comparison and no more (see exposePalette).
    if (exposure < 1) exposePalette(light, bloomP);
    // The overlay's two inks, resolved against what each of them is drawn over.
    const cap = capBoxOf();
    // The stamp's box falls back to the top twelfth of the stage if the element
    // has not been measured yet (first frame, or a zero-height stage).
    const stampTop = stampBox.bottom > stampBox.top ? stampBox.top : size.h * 0.03;
    const stampBot = stampBox.bottom > stampBox.top ? stampBox.bottom : size.h * 0.09;
    const stampX = stampBox.bottom > stampBox.top ? stampBox.x : size.w * 0.5;
    resolveInk(
      light,
      cap.x,
      cap.top,
      cap.bottom,
      stampX,
      stampTop,
      stampBot,
      size.w,
      size.h,
      plotH,
      pull,
    );
    publishLight();
    if (!snap && size.w > 0) {
      scroll += (cam.xMin - prevCamX) * (size.w / Math.max(cam.xWidth, 1e-6));
    }
    prevCamX = cam.xMin;

    // --- the flagpole's own geometry ---
    // Where the mast stands on screen, which two things want: the wave (which
    // must not keep the render loop alive for a flag nobody can see) and the
    // rope's hit zone (which is a real DOM element, because a down-drag on a
    // full-bleed stage is the browser's scroll gesture and only touch-action on
    // an element can take it).
    // …both of them through the stage's own scale, exactly as the draw does it,
    // or the hit zone would be the phone's on a stage where the pole is not.
    const propK = widthScale(size.w);
    const mastH = MAST_H * propK;
    const mastGap = size.w > 0 ? ((PROP_GAP * propK) / size.w) * cam.xWidth : 0;
    const mastAt = GATE_YEAR - mastGap;
    const mastX = size.w > 0 ? ((mastAt - cam.xMin) / cam.xWidth) * size.w : -1e6;
    const mastGroundY = india
      ? plotH - ((india.sample(mastAt).value - cam.yMin) / (cam.yMax - cam.yMin || 1)) * plotH
      : 0;
    const mastOnScreen =
      india != null &&
      pull < 1 &&
      year >= GATE_YEAR &&
      mastX > -mastH * 2 &&
      mastX < size.w + mastH * 2;
    const flagWave =
      mastOnScreen && hoist >= 1 && !reduceMotion.matches
        ? (now / 1000) * FLAG_WAVE_HZ * Math.PI * 2
        : 0;
    // The rope is reachable only while it is the thing to do. Off the gate it is
    // out of the tree entirely, so it can never eat a press meant for the walk.
    if (ropeEl) {
      const live = atGate && mastOnScreen;
      if (ropeEl.hidden === live) ropeEl.hidden = !live;
      // Written only when it has actually moved a whole pixel. Setting four
      // inline styles every frame invalidates layout every frame for a box that
      // is standing still, and it measured as most of the gate's frame budget.
      // Sized off MAST_H, not PROP_H: the R2b pole is half again as tall and a
      // hit zone cut to the old height would leave the top third of the halyard
      // — the part the cue chevron starts on — untouchable.
      const rx = Math.round(mastX - ROPE_HIT_PX);
      const ry = Math.round(mastGroundY - mastH - ROPE_HIT_PX / 2);
      if (live && (rx !== ropeX || ry !== ropeY)) {
        ropeX = rx;
        ropeY = ry;
        ropeEl.style.left = `${rx}px`;
        ropeEl.style.top = `${ry}px`;
        ropeEl.style.width = `${ROPE_HIT_PX * 2}px`;
        ropeEl.style.height = `${Math.round(mastH + ROPE_HIT_PX * 1.5)}px`;
      }
    }

    // A read-only window onto the frame, for the headless probes only. Gated on
    // ?probe: on the published page the hook does not exist, and nothing in the
    // engine ever reads it.
    if (probing) {
      (window as unknown as Record<string, unknown>).__walk = {
        year,
        speedK,
        facing,
        turn,
        dust: dust.length,
        x: ((year - cam.xMin) / cam.xWidth) * size.w,
        groundY: plotH - ((ride - cam.yMin) / (cam.yMax - cam.yMin || 1)) * plotH,
        // R2k: `h` is the height he is DRAWN at this frame, `h0` the stage's own
        // figure before the era curve, and `eraK` the curve between them (1 flat
        // whenever ?flatscale is on). The gait's cycle is measured in h0 (times
        // the root of eraK), so a probe measuring cadence wants h0, not h.
        h: walkerH,
        h0: walkerH0,
        eraK,
        // R2f: the camera is TWO levels now and the hook reports both.
        //  · `lift` is level one, the vertical crane: 0 through the walk, 1 when
        //    the world's endpoint is in frame. X is untouched by it.
        //  · `pull` keeps exactly the meaning it had in R2e — level two, the full
        //    1600–2026 pull-back — and is still 0 for the whole of level one.
        // Neither is a settle test on its own: a probe wanting "the camera has
        // stopped" wants `riding === false`, or the old trick of polling `x`
        // until it stops moving. `lines` is how many of the latched card's lines
        // are lit, out of `lineCount`.
        lift,
        pull,
        riding: lift !== liftB || pull !== pullB,
        // The frame itself, so a probe can assert what each level did to it —
        // level one must leave xMin/xWidth alone and open yMax upward, level two
        // must arrive at the zero-based 1600–2026 rectangle.
        cam: { ...cam },
        phase,
        endPart,
        lines: linesUp,
        lineCount: liveLines.length,
        latch,
        chrome,
        mark,
        hoist,
        gated: atGate,
        capK,
        // R2d's reading trudge on its own, so a probe can tell it apart from the
        // checkpoint bell it overlaps (capK is the MIN of the three).
        readK,
        // …and R2i's dwell beside it: the fourth term as it stands this frame,
        // and whether the deck is asking for it at all.
        dwellK,
        dwelling,
        wordsUp,
        gateFade: gateFadeAt > 0,
        mastX,
        mastGroundY,
        trudge: mood.trudge,
        pride: mood.pride,
        // R2d's entry state, for the theatre probes, and R2g's form-factor split
        // beside it.
        started,
        theatre,
        coarse,
        endYear,
        // R2g's opening. `intro` is the bloom's own progress, 0 on the dark
        // poster and 1 the moment the light has arrived; `runwayFrom` is the
        // world's left wall, which is what the walker starts on and what holding
        // back walks him to.
        intro: introDone ? 1 : blooming ? clamp((now - bloomT0) / BLOOM_MS, 0, 1) : 0,
        exposure,
        stampIn,
        birds: birds.length,
        // …and the flock itself, by reference rather than copied: R2l's birds are
        // sized, paced and faded off a per-bird depth, and "measure the scale"
        // is not a question a count can answer. Costs nothing per frame (the
        // list is empty for the whole of the walk) and, like everything else on
        // this hook, exists only under ?probe.
        birdList: birds,
        runwayFrom,
        // …and the mid-screen hints that replaced R2d's bar labels.
        hints: hintsUp,
        // R2g's gait, so the descent's short-quick-steps can be MEASURED rather
        // than looked at: the stride cycle's own phase (period 2, so cadence is
        // d(gaitPhase)/dt / 2 strides a second), the two halves of the stride
        // multiplier, and how committed the careful descent is.
        gaitPhase: stridePhase,
        stride: gait.stride,
        cycle: gait.cycle,
        desc: mDesc,
        swing,
        // The one beat card on the sky, or -1 for empty sky, and its opacity. The
        // deck is a queue now (see paintCards) and a probe asking "which card is
        // speaking" gets an answer rather than twelve opacities to sort.
        card: speaker,
        cardA: speaker >= 0 ? cardA[speaker] : 0,
        // …and the speaker's two clocks, so a probe can time the lead (R2j)
        // without inferring it from an opacity: when the queue handed it the sky
        // (0 for a re-lit card, which carries no wall clock) and when it first
        // reached CARD_FULL_AT, which is when the five-second floor starts.
        speakAt: speakerAt,
        fullAt: speakerFullAt,
        // …and R2m's suspension of those two clocks: non-zero while the walker
        // is standing short of a LED card's beat, which is the one state in
        // which the card is being carried by the wall clock alone.
        cardHold: cardHoldAt,
        walkerMoving,
        // The frame's own geometry, which is all a probe needs to turn a year and
        // a value into stage px and measure the ground's ON-SCREEN slope. `cam`
        // above gives it the window; these give it the box the window is drawn in.
        plotH,
        w: size.w,
        // Release day: where the world's mark was drawn last frame and how far
        // the latched sentence has stepped down to clear it, so the collision
        // the dodge used to hide can be MEASURED rather than looked at.
        markY: lastMarkY,
        wordsShift: wordsShiftOf(latch),
        sample: (y: number) => (india ? india.sample(y).value : 0),
      };
    }

    // Hoisted out of the render() call, and it costs nothing: the same object
    // literal was already being allocated here every frame. What having a name
    // buys is the probe hook below, which needs the frame's own state to be able
    // to re-draw the figure out of it. See __walk.paintWalker.
    const state: WalkState = {
      camera: cam,
      india,
      world,
      pull,
      lift,
      chrome,
      mark,
      walker: { year, value: here.value, slope: here.slope },
      pose: { phase: stridePhase, swing, look, feet, ride, facing, slope: up, mod: gait, mood },
      light,
      scroll,
      ridges,
      dust,
      birds,
      hoist,
      flagWave,
      capTop,
      capBottom,
      capLeft,
      capRight,
      signBox: latch === SIGNOFF_CARD ? cardBox[SIGNOFF_CARD] : null,
      // Every latched card that is not the sign-off, which is exactly the three
      // prose cards of the ending. Beat cards never reach here: `latch` is -1 for
      // the whole of the walk, and the chrome the knockout applies to does not
      // exist before the reveal.
      // …and it carries wordsShift, so the knockout follows the sentence when
      // the sentence has stepped down out of the world's mark. The shifted copy
      // is allocated only on the frames a shift is actually in force.
      textBox:
        latch >= 0 && latch !== SIGNOFF_CARD
          ? wordsShiftOf(latch) === 0
            ? cardBox[latch]
            : {
                left: cardBox[latch].left,
                right: cardBox[latch].right,
                top: cardBox[latch].top + wordsShiftOf(latch),
                bottom: cardBox[latch].bottom + wordsShiftOf(latch),
              }
          : null,
      worldMarkY: -1,
      theme,
      size,
      plotH,
    };
    if (probing) {
      /**
       * R2m, and it exists for exactly one job: BAKING THE REAL FIGURE INTO A
       * STILL. The front page's Independence Day card carries the walker
       * mid-stride, and the round's instruction about him is explicit — the real
       * figure, not an approximation of it. So the generator drives the film to
       * a neutral-mood year, waits for the stride phase it wants, and asks this
       * to draw THAT frame's walker into a canvas of its own.
       *
       * It is the frame's own drawWalker with the frame's own pose: the geometry,
       * the gait, the lean, the bob, the hem and the arm swing are all the
       * engine's, and nothing about the figure on the card can drift from the
       * figure in the film. The three things the caller owns are where he
       * stands, how big he is (a multiplier on the height the frame drew him at,
       * which is what `paint.scale` has always meant) and what colour he is —
       * because the card composes him over its own sky rather than over this
       * one.
       *
       * Under ?probe and nowhere else, like everything on this hook.
       */
      (window as unknown as Record<string, unknown>).__walkPaint = (
        target: CanvasRenderingContext2D,
        x: number,
        groundY: number,
        scale: number,
        colour: string,
        alpha: number,
      ) => drawWalker(target, state, () => x, () => groundY, { colour, scale, alpha });
    }
    // The belt to the guard's braces at the top of this function: no single
    // bad frame may ever kill the loop. render() draws from scratch every
    // frame, so a skipped one costs a sixtieth of a second of picture, not
    // state. The warn fires once per session and never in a healthy film.
    try {
      render(ctx!, state);
    } catch (err) {
      if (!renderThrew) {
        renderThrew = true;
        console.warn('walk: render threw and the frame was skipped', err);
      }
    }
    // …and the sentence gets out of the mark's way, off the height the frame
    // just drew it at. After render rather than before, which is what keeps the
    // canvas and the DOM telling the same story: the shift written here is on
    // screen for the next frame, and that is the frame whose textBox carries it
    // (see the state literal above). A skipped render leaves worldMarkY at -1
    // and the card simply goes home.
    stepWordsClear(state.worldMarkY, now);

    // The ending whisper's clock, on the gate's own pattern: it advances only
    // while an ending frame is standing SETTLED — no ride, no dissolve, no
    // end-card — with nothing pressed. A hold does not reset it, deliberately:
    // the stuck reader this exists for is the one holding and waiting for a
    // film that is waiting for a tap. Release weekend makes it EVERY frame's
    // clock rather than the first stall's: a press hides the whisper and zeroes
    // this, and the frame the reader stalls on next offers it again — at the
    // first offer's reading-length patience if it has never been shown, and at
    // reminder pace once it has (see END_REHINT_MS).
    if (
      phase !== 'walk' &&
      lift === liftB &&
      pull === pullB &&
      !lineFading() &&
      latch !== SIGNOFF_CARD &&
      !tapHinted
    ) {
      endIdleMs += dt;
      if (endIdleMs >= (tapTaught ? END_REHINT_MS : END_HINT_MS)) showTapHint();
    } else endIdleMs = 0;

    const settled =
      !driving &&
      speedK <= 0 &&
      turn === 'none' &&
      dust.length === 0 &&
      !revealRunning &&
      // R2g's opening, and all three of its clocks are bounded: the bloom is
      // BLOOM_MS long, the birds leave the frame and are dropped, and the deck's
      // queue is a floor plus a breath. None of them survives the intro except
      // the last, which is what the walk is made of.
      !blooming &&
      birds.length === 0 &&
      !cardsBusy &&
      // …and a flag coming back down off an abandoned hoist. Bounded at
      // HOIST_LOWER_MS, and only ever running west of the gate.
      !lowering &&
      // Neither camera level may be mid-ride. Equality rather than an epsilon,
      // because an arrived ride writes its destination exactly (see above).
      lift === liftB &&
      pull === pullB &&
      // …and not while a line is still arriving. The fade itself is the CSS's
      // and needs no frames, but the ink under it is resolved per frame off the
      // card that is speaking, so a stage that slept mid-dissolve would hand the
      // incoming sentence the outgoing one's sky.
      //
      // R2m narrows this from linesPending() to the FADE, and it has to: with
      // the ending press-driven, "a sentence is still to come" is now true for
      // as long as the reader chooses to look at the one in front of them, and
      // an unbounded raf under a settled chart is exactly what the loop's
      // whole settle test exists to prevent. lineFading() is bounded at
      // LINE_IN_MS.
      !lineFading() &&
      // …nor while the crane is holding the frame open for the mark's words. That
      // gap is a wall clock read INSIDE this loop (see MARK_WORDS_GAP_MS), so a
      // stage that slept through it would leave the mark unnamed until the reader
      // touched something. Bounded: the ride is over and the gap is 800ms.
      !(phase === 'lift' && liftB > 0 && latch !== REVEAL_CARDS[1]) &&
      // The flag waves on a clock, so the loop cannot sleep under one. This is
      // bounded: the wave only runs while the mast is actually in frame.
      flagWave === 0 &&
      // …and a reader standing at the pole with nothing moving has a whisper
      // counting down toward them: gateIdleMs only advances on a frame, so the
      // loop has to stay alive until the offer has been made. Bounded at
      // HOIST_HINT_MS, and only at the gate. (This used to be a test on the cue
      // chevron, which was live for strictly longer; R2c retired the chevron and
      // the whisper's own timer is what is left to wait for.)
      !(atGate && !ropeHinted && !ropeRetired) &&
      // …and its twin at the other end of the piece: an ending frame with the
      // tap whisper down has a timer counting toward the (re-)offer, and the
      // timer only advances on a frame. Still bounded — at most END_HINT_MS —
      // because showTapHint flips tapHinted and this term goes quiet until the
      // next press takes the whisper down again.
      !(phase !== 'walk' && latch !== SIGNOFF_CARD && !tapHinted) &&
      // …and RAISING the flag is the one thing on this stage that moves without
      // the ground moving. speedK covers the plain forward hold, but ArrowUp and
      // the reduced-motion one-shot drive nothing else at all, so without this
      // the loop settles mid-hoist and the flag stops halfway up a pole with the
      // reader still holding the key. (Found by probe, not by reading.)
      !(atGate && (hoistKey || reducedHoisting || dragPx > 0)) &&
      Math.abs(cam.xMin - want.xMin) < EPS_YEAR &&
      Math.abs(cam.xWidth - want.xWidth) < EPS_YEAR &&
      Math.abs(cam.yMin - want.yMin) < EPS_VALUE &&
      Math.abs(cam.yMax - want.yMax) < EPS_VALUE &&
      // The two amplitudes are genuine second eases and have to be waited on:
      // they are what keep the loop alive for the second or so it takes his
      // legs to come together after he stops. Then it stops for good.
      Math.abs(swing - swingTarget) < EPS_SWING &&
      Math.abs(look - lookTarget) < EPS_SWING &&
      // …and so is the suspension: it is still settling for a tenth of a second
      // after his feet stop moving.
      Math.abs(ride - level) < EPS_VALUE &&
      // …and so is the pose machine. A reader who lets go halfway into a climb
      // is still watching him settle out of it, and the loop must be alive for
      // that; once the weights have arrived it may stop for good.
      Math.abs(slopeS - slopeNow) < EPS_SLOPE &&
      Math.abs(mClimb - tClimb) < EPS_SWING &&
      Math.abs(mClimbHard - tClimbHard) < EPS_SWING &&
      Math.abs(mDesc - tDesc) < EPS_SWING &&
      Math.abs(mRough - tRough) < EPS_SWING;

    if (settled && now - lastEvent > IDLE_MS) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function wake(): void {
    lastEvent = performance.now();
    if (running || document.hidden) return;
    running = true;
    lastFrame = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function sleep(): void {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* -- events -- */

  /**
   * THE STAGE IS THE CONTROL, and since R2g it is the only one.
   *
   * Holding anywhere on the picture walks, and WHICH ZONE decides which way. The
   * split is ZONE_SPLIT rather than half, which is R2d's hold bar's asymmetry
   * kept after the bar itself was retired: the horizontal CENTRE of the screen
   * walks forward, and going back is a thing the reader reaches left for. The two
   * mid-screen hints label the zones and are not themselves controls.
   *
   * BOTH GESTURES LIVE HERE NOW. A hold walks for as long as it is held; a press
   * shorter than TAP_MS is a tap and becomes a short step on release, which is
   * the reading the retired bar buttons used to own and which the zones had never
   * had. One handler, two readings of the same gesture, and nothing anywhere that
   * has to decide which the reader meant before they have finished making it.
   *
   * THE RELEASE IS WATCHED ON THE WINDOW and there is no pointerleave anywhere
   * near it, which is R2e's lesson and it survives the bar it was learned on: a
   * resting thumb wanders, and a single pixel past an edge must never end a hold
   * the reader has not let go of. A window-level pointerup catches the finger
   * that has drifted onto the canvas, off the stage, or out of the frame.
   *
   * Three things are exempt rather than stop-propagated, because an element that
   * has to know who is listening above it is a bug waiting for the next round:
   * the rope, the end-card (R2m — the whole card, not its three controls), and
   * the corner buttons — the ✕, the ⛶ and release weekend's ▷.
   */
  /** Which way each live stage pointer is walking, so its release can turn a
   *  short press into a step in the direction it was made in. */
  const zoneDir = new Map<number, number>();
  /** R2m: where the press that may open the film landed, and which pointer made
   *  it. Null whenever there is no candidate. See the poster's note below. */
  let posterDown: { id: number; x: number; y: number } | null = null;
  /** How far a finger may travel and still be a tap. A scroll flick covers
   *  hundreds of px; a thumb resting on glass wanders two or three. */
  const POSTER_TAP_PX = 10;

  stage.addEventListener('pointerdown', (e) => {
    const el = e.target as HTMLElement | null;
    // R2m adds .walk-endcard to the exemptions as ONE entry rather than three:
    // the card is a box the reader is meant to press things inside, and listing
    // its ✕ and its two buttons separately would leave the sky between them
    // walking the film out from under the offer.
    if (el && el.closest('.walk-rope, .walk-endcard, .walk-exit, .walk-full, .walk-play, .walk-poster-fresh, a')) return;
    /**
     * The poster: a press anywhere on the stage is the way in, and it is not
     * also a step.
     *
     * R2M MAKES IT A TAP RATHER THAN A TOUCH, and it is the device feel-check's
     * sharpest complaint. The stage is an ordinary block in the page's flow and
     * the page's scroll belongs to the reader — but the entry fired on
     * POINTERDOWN, so a reader flicking the page upward with their thumb
     * happening to land on the film was taken full screen by a gesture that
     * meant "scroll". The film ate the scroll and the reader had to find the ✕
     * to get their page back.
     *
     * So the entry waits for the RELEASE and for the gesture to have been still:
     * pointerdown banks where the finger landed, and the pointerup only begins
     * the film if it has travelled less than POSTER_TAP_PX. A scroll moves
     * hundreds of pixels and never qualifies; a tap moves two or three.
     *
     * The release is still a live user gesture, so requestFullscreen is still
     * allowed to be granted — which is the reason this could not simply be
     * moved to a click handler and the reason it is not one.
     */
    if (!started) {
      posterDown = { id: e.pointerId, x: e.clientX, y: e.clientY };
      return;
    }
    const rect = stage.getBoundingClientRect();
    const id = `p${e.pointerId}`;
    const dir = e.clientX - rect.left >= rect.width * ZONE_SPLIT ? 1 : -1;
    zoneDir.set(e.pointerId, dir);
    downAt.set(id, performance.now());
    pressInput(id, dir);
  });
  const zoneRelease = (e: PointerEvent) => {
    // The poster's candidate press, resolved. A tap opens the film; anything
    // that moved was a scroll and the page has already had it.
    if (posterDown && e.pointerId === posterDown.id) {
      const moved = Math.hypot(e.clientX - posterDown.x, e.clientY - posterDown.y);
      posterDown = null;
      if (e.type === 'pointerup' && moved <= POSTER_TAP_PX && !started) begin();
      return;
    }
    const id = `p${e.pointerId}`;
    const dir = zoneDir.get(e.pointerId);
    zoneDir.delete(e.pointerId);
    const t0 = downAt.get(id);
    downAt.delete(id);
    dropInput(id);
    if (dir !== undefined && t0 !== undefined && performance.now() - t0 < TAP_MS) {
      startStep(id, dir);
    }
    wake();
  };
  window.addEventListener('pointerup', zoneRelease);
  window.addEventListener('pointercancel', zoneRelease);

  /**
   * The rope. The one element on this page that takes a pointer for itself.
   *
   * A DOWN-DRAG is the browser's own scroll gesture, and the stage's
   * touch-action deliberately leaves vertical panning alone because the page's
   * scroll belongs to the reader. So the rope is a small element of its own with
   * `touch-action: none` on it, present in the tree ONLY while the walk is held
   * at the pole and the pole is on screen — 88px wide by about 90 tall, over the
   * mast. Everywhere and everywhen else the reader's scroll is untouched.
   *
   * Taking hold of it is also a forward hold, so a reader who grabs the rope and
   * simply holds still is not standing there wondering: the eight-second escape
   * hatch is running underneath them the whole time.
   */
  ropeEl?.addEventListener('pointerdown', (e) => {
    if (hoist >= 1) return;
    e.preventDefault();
    ropeEl.setPointerCapture(e.pointerId);
    dragId = e.pointerId;
    dragY = e.clientY;
    armed = true;
    pressInput('rope', 1);
  });
  ropeEl?.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dragId) return;
    const dy = e.clientY - dragY;
    dragY = e.clientY;
    // The ratchet: down pulls the flag up, up does nothing at all.
    if (dy > 0) dragPx += dy;
    wake();
  });
  function ropeRelease(e: PointerEvent): void {
    if (e.pointerId !== dragId) return;
    dragId = -1;
    dropInput('rope');
    wake();
  }
  ropeEl?.addEventListener('pointerup', ropeRelease);
  ropeEl?.addEventListener('pointercancel', ropeRelease);
  window.addEventListener('pointerup', ropeRelease);
  window.addEventListener('pointercancel', ropeRelease);

  restartBtn?.addEventListener('click', restart);
  endCloseBtn?.addEventListener('pointerdown', (e) => e.stopPropagation());
  endCloseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeEndCard();
  });

  // The bank, read once at init: a banked year turns the poster's word into
  // the offer of a resume, and the button under it is the decline. The press
  // that begins the walk does the rest (see begin()).
  try {
    const banked = sessionStorage.getItem(RESUME_KEY);
    if (banked) {
      const saved = JSON.parse(banked) as { y: number; h: number };
      if (Number.isFinite(saved.y) && saved.y > 1500) {
        pendingResume = { y: saved.y, h: saved.h ? 1 : 0 };
        if (posterEl) posterEl.textContent = 'resume the walk';
        if (freshBtn) freshBtn.hidden = false;
      }
    }
  } catch {
    /* no storage, no offer */
  }
  freshBtn?.addEventListener('pointerdown', (e) => e.stopPropagation());
  freshBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearResume();
  });

  /**
   * R3: the card, offered as a download and upgraded to a share sheet where —
   * and only where — the sheet can carry the FILE. R2m makes the control a real
   * BUTTON (`Share this card`, inside the end-card) and leaves the mechanism
   * exactly as it was: the anchor is still in the markup, still a plain
   * `<a download>`, and still what every failure path ends at.
   *
   * The anchor is the behaviour and everything below is an enhancement layered
   * on top of it. That ordering matters more than usual here: this is the last
   * thing in the piece and it is the one control a reader might reach for on a
   * phone, in a share sheet, at speed.
   *
   * The gate is `navigator.canShare({ files })` rather than `navigator.share`
   * existing. Plenty of browsers have share() and refuse files, and what they
   * do with a files-less fallback is send the URL — which on this page is a
   * link to a page that withholds its own subject. A reader who asked to send
   * somebody a picture and sent them a puzzle instead has been failed by the
   * upgrade, so the upgrade declines rather than degrade: no files, no share,
   * download as written.
   *
   * The fetch is deliberately inside the click. Pre-fetching a megabyte of PNG
   * for a control most readers will never press is a megabyte spent on most
   * readers, and by the time this control exists the reader has been on the page
   * for several minutes on a connection that has already proved itself. Any
   * failure at all — offline, 404, a share the reader dismisses — ends at the
   * anchor's own download.
   *
   * R2M INVERTS WHERE THE HANDLER LIVES and changes nothing else about it. R3's
   * listener was on the anchor and cancelled the anchor's own default; the
   * control is a button now, so the button asks the question and CALLS the
   * anchor when the answer is no. The fallback needs no re-entry guard any more
   * — the anchor has no listener of its own to re-enter — which is one piece of
   * state gone.
   */
  /**
   * R2m: THE SHARE IS DATE-GATED, on exactly the window the masthead's
   * tricolour dressing uses — 14 to 17 August 2026, checked client-side (see
   * the inline script in Masthead.astro).
   *
   * The reason is that the card is a GREETING for four days and a still from a
   * film for the rest of the year. Inside the window a reader is sending
   * somebody Independence Day wishes; in September they are sending somebody a
   * piece to read, and a share sheet that says "Happy Independence Day" in
   * September is a page that has not noticed the date. The window reverts on its
   * own with no redeploy, which is the whole point of it being a client check.
   *
   * THE LINK LIVES IN THE TEXT AND ONLY THERE. It used to be in both — a
   * readable bare domain inside the text and the https URL in `url`, because
   * several targets silently drop the url field when a file is attached. What
   * that produced on the targets that keep BOTH (WhatsApp on Android, first
   * real-world share) was the same address printed twice back to back, each
   * half auto-linked. So the text carries the one canonical https link — the
   * scheme kept so every target auto-links it — and `url` is not passed at
   * all: a field some targets drop and others duplicate is a field the share
   * is better off without.
   */
  const IDAY = (): boolean => {
    const d = new Date();
    return d.getFullYear() === 2026 && d.getMonth() === 7 && d.getDate() >= 14 && d.getDate() <= 17;
  };
  const SHARE_URL = 'https://timeseriesofindia.com/independence';
  const shareCopy = () =>
    IDAY()
      ? { label: 'Share the Independence Day card', text: `Happy Independence Day\n${SHARE_URL}` }
      : { label: 'Share the midnight card', text: `The Walk through Midnight\n${SHARE_URL}` };

  const shareCard = (): void => {
    if (!sendLink) return;
    const nav = navigator as Navigator & {
      canShare?: (d: unknown) => boolean;
      share?: (d: unknown) => Promise<void>;
    };
    const download = () => sendLink.click();
    const copy = shareCopy();
    if (!nav.canShare || !nav.share || !window.File) {
      download();
      return;
    }
    // Probe with a stand-in of the right type before committing to the fetch:
    // canShare() answers on the shape of the data, not on its bytes.
    const probe = new File([new Uint8Array(1)], 'card.png', { type: 'image/png' });
    if (!nav.canShare({ files: [probe] })) {
      download();
      return;
    }
    void (async () => {
      try {
        const res = await fetch(sendLink.href);
        if (!res.ok) throw new Error(String(res.status));
        const file = new File([await res.blob()], 'tsoi-independence-day.png', {
          type: 'image/png',
        });
        if (!nav.canShare!({ files: [file] })) throw new Error('files refused');
        await nav.share!({ files: [file], text: copy.text });
      } catch (err) {
        // An AbortError is the reader closing the sheet, and re-triggering a
        // download after they said no is the one wrong answer. Everything else
        // falls back to the anchor.
        if ((err as Error)?.name === 'AbortError') return;
        download();
      }
    })();
  };
  // The ghost-click guard — see endOpenedAt. Capture phase, so the swallowed
  // click reaches neither the share, the download anchor, `Start over` nor
  // the ✕; a deliberate press half a second after arrival is untouched.
  endCardEl?.addEventListener(
    'click',
    (e) => {
      if (performance.now() - endOpenedAt < END_GHOST_MS) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  shareBtn?.addEventListener('pointerdown', (e) => e.stopPropagation());
  shareBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    shareCard();
  });
  // …and the button says which of the two it is. Written once, at mount, off the
  // same window the payload reads: the markup carries the out-of-window wording
  // so a script-dead page is not lying about the date either.
  if (shareBtn) shareBtn.textContent = shareCopy().label;
  // (A poster-stage "share this walk" whisper lived here for an hour on
  // release day and was replaced the same morning: the page's share is the
  // masthead's ShareButtons control on the kicker line, where every other
  // interactive's is — see the title-block in independence.astro. The film
  // keeps exactly one share of its own, the end-card's, and that one shares
  // the card file.)
  // R2m: THE GREETING IS THE DATE'S, and it is the same window again. "wishes
  // you a happy Independence Day" is a thing a publication says on four days of
  // the year; on the other 361 it is a piece of furniture claiming an occasion
  // that is not happening, under a masthead that has taken its tricolour off.
  // Outside the window the line is REMOVED rather than hidden, so the lockup
  // closes up around the rule and reads as a masthead over a card instead of a
  // masthead with a gap under it.
  if (!IDAY()) stage.querySelector('.signoff-line')?.remove();

  /* -- the way in and the way out (R2d) -- */

  exitBtn?.addEventListener('pointerdown', (e) => {
    // The ✕ must not also be a press on the stage half it sits in.
    e.stopPropagation();
  });
  exitBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    exitTheatre();
  });

  // …and R2g's way IN. It began as the fine pointer's only entrance — the desktop
  // walk starts in the article's own frame and the theatre is an offer in the
  // corner rather than a takeover — and R2j makes it every form factor's way BACK
  // in as well, because a phone that has left the theatre is now watching the
  // film in that same frame (see exitTheatre).
  fullBtn?.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
  });
  fullBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    enterTheatre();
  });

  // Release weekend's ▷, on the corners' shared contract: the press is the
  // button's and never also the stage half it sits over.
  playBtn?.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
  });
  playBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (playing) stopPlay();
    else startPlay();
  });


  // Enter and Space on the focused stage are the poster's press, for a reader
  // who arrived by keyboard. Esc is the way out, and it is listened for on the
  // window because focus may be anywhere by then. Neither key is defaulted
  // unless this handler is the thing using it.
  stage.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target as HTMLElement | null;
    // A press on a real control inside the stage is that control's.
    if (el && el !== stage && el.closest('button, a')) return;
    if (started) return;
    e.preventDefault();
    begin();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !theatre) return;
    e.preventDefault();
    exitTheatre();
  });

  // One exit path. If the browser drops fullscreen on its own — Esc taken by the
  // OS-level fullscreen UI before it reaches the page, a tab switch, a
  // permissions change — the theatre goes with it rather than leaving the stage
  // fixed over a page the reader cannot scroll.
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && theatre) exitTheatre();
  });

  // Keys: the two HORIZONTAL arrows and nothing else. PageUp/PageDown, Home/End
  // and both vertical arrows are the reader's scroll and are never touched, so
  // the page reads like a page even mid-walk. The stage has to be in view for
  // either key to mean anything, or a reader down at the footer would be
  // walking something they cannot see; that rect read is for the keyboard alone
  // and no part of the story depends on it.
  //
  // These two preventDefaults are the only ones in the file. They fire on
  // repeats too, because a held arrow would otherwise scroll the page sideways
  // while it drives the walk — but only when this handler is the thing driving.
  const ARROWS: Record<string, { id: string; dir: number }> = {
    ArrowRight: { id: 'kR', dir: 1 },
    ArrowLeft: { id: 'kL', dir: -1 },
  };
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const target = e.target as HTMLElement | null;
    if (
      target &&
      target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')
    ) {
      return;
    }
    // ArrowUp raises the flag, and ONLY while the walk is held at the pole with
    // the flag down. This is the single amendment to the "both vertical arrows
    // are never touched" rule at the top of this file, and it is narrow on
    // purpose: outside the gate the key is not listened to, not defaulted and
    // not prevented, so it is the reader's scroll again the instant the flag is
    // up. A reader raising a flag with the up arrow and watching the page scroll
    // out from under it would be the worse bug.
    if (e.key === 'ArrowUp') {
      if (!gated()) return;
      const box = stage.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) return;
      e.preventDefault();
      hoistKey = true;
      wake();
      return;
    }
    const key = ARROWS[e.key];
    if (!key) return;
    const el = e.target as HTMLElement | null;
    if (el && el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
    const rect = stage.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    // In the ending BOTH arrows drive, and that is R2f's change here: ArrowLeft
    // used to be handed straight back to the browser the moment the pull-back
    // started, which is the same thing as saying the ending had no way out of
    // it. The one key that drives nothing is ArrowRight with the END-CARD ALREADY
    // OPEN, where the story is over and the card is on the stage — so that is
    // the one case that goes back to being the reader's scroll.
    //
    // R2m adds the second term. Closing the card leaves the piece finished and
    // the frame settled, and a forward press summons the card back (see
    // endingPress); without `latch === SIGNOFF_CARD` here the arrow key alone
    // could not do it, and the reader who closed the card with the keyboard
    // would have no way to ask for it again. The default is still only ever
    // taken while the key is actually in use.
    if (
      phase === 'pull' &&
      key.dir > 0 &&
      endPart >= END_CARDS.length - 1 &&
      latch === SIGNOFF_CARD
    ) {
      return;
    }
    e.preventDefault();
    if (e.repeat) {
      wake();
      return;
    }
    pressInput(key.id, key.dir);
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp') hoistKey = false;
    const key = ARROWS[e.key];
    if (key) dropInput(key.id);
  });

  // The focus ring's modality gate (see .is-tabbed in the stylesheet). Chromium
  // flips :focus-visible on for a CLICK-focused element the moment any key is
  // pressed, so a mouse reader driving with the arrows lit the whole stage's
  // keyboard ring. The class records how focus was actually reached: a Tab
  // press arms it, any pointer press disarms it. Capture phase on both, so the
  // stamp exists before the browser resolves :focus-visible for the frame.
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Tab') stage.classList.add('is-tabbed');
    },
    true,
  );
  window.addEventListener('pointerdown', () => stage.classList.remove('is-tabbed'), true);

  // Anything that takes the page away takes the hold with it, or he walks on
  // while nobody is touching anything.
  function releaseAll(): void {
    // …and the carry is a held input like the rest of them: a page that has
    // lost the reader must not go on walking for one. First, so its own
    // bookkeeping (the button's face, the wake lock) settles before the
    // wholesale clear below makes its dropInput a no-op.
    stopPlay();
    inputs.length = 0;
    zoneDir.clear();
    downAt.clear();
    endStep();
    hoistKey = false;
    dragId = -1;
    posterDown = null;
  }
  window.addEventListener('blur', releaseAll);

  window.addEventListener('resize', () => {
    resize();
    wake();
  });

  new ResizeObserver(() => {
    resize();
    wake();
  }).observe(box);

  new MutationObserver(() => {
    theme = readTheme(stage);
    wake();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      releaseAll();
      saveResume();
      sleep();
    } else {
      // The browser revoked any wake lock on the way out; a reader coming back
      // to the theatre gets it asked for again.
      syncWakeLock();
      wake();
    }
  });

  // …and the bank's second teller: pagehide is the one event a navigation
  // away reliably fires on every mobile browser, including the ones that
  // never say visibilitychange on the way out.
  window.addEventListener('pagehide', saveResume);

  reduceMotion.addEventListener('change', wake);

  // Webfonts land after first paint and change the label metrics — and the
  // caption block's own height, which the world mark dodges around.
  void document.fonts?.ready.then(() => {
    measureCaption();
    wake();
  });

  // The box first, because R2g's runway is measured in seconds of walking and
  // therefore in the stage's own width: resize() is what puts the walker on it,
  // and everything below reads the year it leaves him at.
  resize();
  showCard(-1);
  paintCards();
  setEra(eraAt(year));
  paintYear();
  syncControls();
  // R2j's two one-shot writes onto the stage, and neither is ever touched again:
  // the bloom's own length, so the grain's arrival is timed off the same number
  // the light is (see .walk-grain), and the form-factor split, so the poster's
  // "Opens in full screen." caption is shown by exactly the test the engine
  // entered the theatre on rather than by a second media query beside it.
  stage.style.setProperty('--walk-bloom-ms', `${BLOOM_MS}ms`);
  stage.classList.toggle('is-coarse', coarse);
  // R2m: THE HINTS SPEAK THE READER'S OWN INPUT.
  //
  // The two labels are written for a thumb — "hold to walk" over the wide zone,
  // "back" over the narrow one — and on a fine pointer that is half the offer.
  // A reader at a keyboard has two arrow keys that do exactly this and no way
  // of knowing it: the stage's aria-label says so, and nothing on the picture
  // does. So the fine-pointer strings carry the ARROW in the sentence, which
  // teaches the key silently to anyone who has one and reads as an ordinary
  // direction to anyone who does not. "Hold" stays in both, because the mouse
  // is still the thing most of them will use.
  //
  // Written once, here, off the same `coarse` test the class above uses, so
  // what the film says and what the film does cannot come apart. The coarse
  // copy is the markup's own and is untouched — there is no arrow to teach on a
  // device with no arrow keys, and a glyph on a phone would read as a control.
  if (!coarse) {
    const fwdHint = stage.querySelector<HTMLElement>('.walk-hint-fwd');
    const backHint = stage.querySelector<HTMLElement>('.walk-hint-back');
    if (fwdHint) fwdHint.textContent = 'hold → to walk';
    if (backHint) backHint.textContent = 'hold ← to go back';
  }
  // The poster. The stage carries .is-poster from the markup so the deck and the
  // date stamp are down on the very first paint rather than a frame later; the
  // one word fades up on top of it, and the light behind it is the 1600 frame
  // stopped down to INTRO_EXPOSURE until the press that blooms it.
  //
  // The GRAIN's gate (.is-intro, see .walk-grain) is on the stage in the markup
  // rather than added here, and that is the whole reason it is in the markup:
  // film grain over a near-black poster is not film, it is dirt, and adding the
  // class after first paint would start a transition FROM the walk's strength on
  // load. So the poster is at zero from the first frame and the grain rises to
  // its one authored strength across the bloom, arriving with the light.
  showPoster(true);

  fetch(dataUrl('/data/independence/economy.json'))
    .then((r) => {
      if (!r.ok) throw new Error(`independence walk: economy.json ${r.status}`);
      return r.json() as Promise<PanelData>;
    })
    .then((data) => {
      const find = (entity: string) =>
        data.series.find((s) => s.id === 'gdp_pc' && s.entity === entity);
      const build = (entity: string) => {
        const s = find(entity);
        return s ? buildTerrain(s.points, s.estimated_from ?? null) : null;
      };
      india = build('India');
      world = build('World');
      // THE WALK ENDS WHERE THE DATA ENDS. The stop table's last row carries a
      // year only so the file reads; the series overwrites it here, and with it
      // the arrival, the clamp and the big year the reader finishes on. Nothing
      // downstream may hardcode a year in its place.
      if (india) {
        endYear = india.last;
        STOPS[REVEAL_STOP].year = india.last;
        // …and the last beat's fade is clamped to it, so 1991's card can never
        // still be on the sky when the reveal's prose arrives over it.
        clampLastCard(endYear);
      }
      reveal = computeReveal();
      resize();
      primed = false;
      wake();
    })
    .catch((err: unknown) => {
      // A missing dataset leaves an empty stage; it must not take the page down.
      console.error(err);
    });
}
