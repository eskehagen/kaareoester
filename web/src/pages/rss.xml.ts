import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { cms } from '~/lib/cms';

/** Feed med alt indhold på tværs af de tre kategorier. */
export async function GET(context: APIContext) {
  const settings = await cms.getSettings();
  const entries = await cms.getEntries();

  return rss({
    title: settings.title,
    description: settings.description,
    site: context.site!,
    trailingSlash: false,
    customData: '<language>da-dk</language>',
    items: entries.map((entry) => ({
      title: entry.title,
      description: entry.summary,
      pubDate: entry.date,
      link: entry.href,
      categories: entry.tags,
    })),
  });
}
