/** Danske formaterings-hjælpere. */

const LONG = new Intl.DateTimeFormat('da-DK', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const MONTH_YEAR = new Intl.DateTimeFormat('da-DK', { month: 'long', year: 'numeric' });

export const formatDate = (date: Date) => LONG.format(date);
export const formatMonthYear = (date: Date) => MONTH_YEAR.format(date);
export const formatYear = (date: Date) => String(date.getFullYear());
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** Klipper tekst ved nærmeste ordgrænse. */
export function excerpt(text: string, max = 165): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** Slår klasser sammen og filtrerer falsy værdier fra. */
export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(' ');
