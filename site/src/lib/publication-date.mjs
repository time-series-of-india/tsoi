/** Parse a maintainer-set publication day at midnight in India. */
export function publicationDate(value) {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw Error('Publication date must be YYYY-MM-DD, or null until publication.');
  }
  const utc = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 10) !== value) {
    throw Error('Publication date is not a real calendar day.');
  }
  return new Date(`${value}T00:00:00+05:30`);
}

export function requirePublicationDate(value, now = new Date()) {
  const date = publicationDate(value);
  if (!date) throw Error('Set weather-wings-publication.json published to the agreed release date before deploying.');
  if (date > now) throw Error('Weather Wings publication date is in the future.');
  return date;
}
