import type { Entry } from './cms/types';

/**
 * Udvælger indhold til forsidens vinduer.
 *
 * Nyeste først er sjældent det rigtige på en portefølje: et indlæg uden
 * billede fylder dårligt i en visuel sektion. Rækkefølgen er derfor
 *   1. fremhævet i CMS'et og har et billede
 *   2. har et billede
 *   3. fremhævet uden billede
 *   4. resten
 * — og inden for hver gruppe bevares den oprindelige (dato-)sortering.
 */
export function curate(entries: Entry[], limit?: number): Entry[] {
  const rank = (entry: Entry) => {
    if (entry.featured && entry.cover) return 0;
    if (entry.cover) return 1;
    if (entry.featured) return 2;
    return 3;
  };

  const sorted = entries
    .map((entry, index) => ({ entry, index, rank: rank(entry) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((item) => item.entry);

  return limit ? sorted.slice(0, limit) : sorted;
}
