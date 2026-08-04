/**
 * Migrering: Jekyll (_posts) → Astro content collections
 * ------------------------------------------------------------------
 * Kører engangs-konverteringen af det eksisterende indhold:
 *
 *   node scripts/migrate-jekyll.mjs
 *
 * - Mapper de gamle frit-satte kategorier til de tre nye typer
 *   (rejse / projekt / bog) og bevarer resten som tags.
 * - Kopierer lokale billeder til public/billeder.
 * - Samler billeder med samme datopræfiks til indlæggets galleri.
 * - Fjerner billed-referencer til det nedlagte WordPress-site, som
 *   ikke længere kan hentes (rapporteres til sidst).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..');
const REPO = path.resolve(WEB, '..');
const POSTS = path.join(REPO, '_posts');
const SRC_IMAGES = path.join(REPO, 'assets', 'images');
const OUT_IMAGES = path.join(WEB, 'src', 'assets', 'billeder');
const OUT_CONTENT = path.join(WEB, 'src', 'content');

/** Kategori → indholdstype. Første match vinder. */
const KIND_RULES = [
  { kind: 'bog', categories: ['bøger', 'udgivelser'] },
  {
    kind: 'rejse',
    categories: ['rejser', 'verden', 'arktis', 'danmark', 'samsø', 'etiopien', 'afrika'],
  },
  {
    kind: 'projekt',
    categories: [
      'projekter',
      'kursus',
      'intern',
      'biosfæren',
      'klimakrisen',
      'klimakrise',
      'klimaforandringer',
      'bæredygtighed',
      'skole',
      'kaffe',
      'diverse',
    ],
  },
];

const COLLECTION = { rejse: 'rejser', projekt: 'projekter', bog: 'boeger' };

/**
 * Håndsat facit for de indlæg, hvor de gamle kategorier ikke rakte
 * (typisk "Ikke kategoriseret" eller kun et land).
 */
const KIND_OVERRIDES = {
  'dyrevelfaerd-bognet-til-4-6-og-7-9-klassetrin-gratis-klasses': 'bog',
  'etisk-handel-fair-trade-intern': 'bog',
  'kina-megabyen-qingdao-og-tre-prinser-hoejt-fra-nord': 'rejse',
  'invasive-arter-i-danmakr-og-globalt-miljoestrelsen-2019-20': 'projekt',
};

/** Indlæg der fremhæves på forsiden. */
const FEATURED = new Set([
  'kiribati-tarawa',
  'svalbard',
  'groenland',
  'kattegat-boennerup-strand',
  'bhutan-sydasien',
  '111-steder-paa-samsoe-som-du-skal-besoege',
]);

/** Kategorier der aldrig skal ende som synlige tags. */
const DROP_TAGS = new Set([
  'ikke kategoriseret',
  'intern',
  'diverse',
  'rejser',
  'projekter',
  'udgivelser',
  'bøger',
]);

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);

/** Meget lille YAML-parser — dækker præcis den frontmatter Jekyll-sitet bruger. */
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const data = {};
  let currentKey = null;

  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;

    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && currentKey) {
      data[currentKey] = data[currentKey] ?? [];
      data[currentKey].push(unquote(listItem[1]));
      continue;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (pair) {
      currentKey = pair[1];
      data[currentKey] = pair[2] === '' ? [] : unquote(pair[2]);
    }
  }

  return { data, body: match[2] };
}

const unquote = (value) => value.trim().replace(/^["'](.*)["']$/, '$1');

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

function resolveKind(categories) {
  const lower = categories.map((c) => c.toLowerCase());
  for (const rule of KIND_RULES) {
    if (rule.categories.some((c) => lower.includes(c))) return rule.kind;
  }
  return 'projekt';
}

/** Første brugbare tekstafsnit → manchet. */
function deriveSummary(body) {
  const candidates = body
    .split(/\n{2,}/)
    // Overskrifter, billeder, rå URL'er og HTML kan ikke bruges som manchet.
    .map((block) =>
      block
        .split(/\r?\n/)
        .filter((line) => !/^\s*(#{1,6}\s|!\[|<|https?:\/\/)/.test(line))
        .join(' '),
    )
    .map((block) =>
      block
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[*_`>]/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    // Rester af HTML-attributter fra defekte links er ikke brødtekst.
    .filter((block) => block.length >= 45 && !/[a-z-]+="/i.test(block));

  const text = candidates[0] ?? '';
  if (text.length <= 190) return text;
  const cut = text.slice(0, 190);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

const DEAD_HOST = /https?:\/\/(www\.)?kaareoester\.dk\/wp-content\//i;

/** Rydder brødteksten: døde billeder ud, lokale stier peger på /billeder. */
function cleanBody(body, stats) {
  let output = body;

  output = output.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (match, url) => {
    if (DEAD_HOST.test(url)) {
      stats.removedImages += 1;
      return '';
    }
    return match.replace(url, rewriteImagePath(url));
  });

  // Bare URL'er til YouTube o.l. gøres til rigtige links.
  output = output.replace(/^(https?:\/\/\S+)$/gm, (url) => `[${url}](${url})`);

  return output
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s*##\s*$/gm, '')
    .trim();
}

const rewriteImagePath = (url) =>
  url.startsWith('/assets/images/') ? url.replace('/assets/images/', '/billeder/') : url;

/** YAML-escape af en streng-værdi. */
const yamlString = (value) => `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

async function main() {
  const stats = { removedImages: 0, byKind: { rejse: 0, projekt: 0, bog: 0 }, images: 0 };

  await fs.mkdir(OUT_IMAGES, { recursive: true });
  for (const collection of Object.values(COLLECTION)) {
    await fs.mkdir(path.join(OUT_CONTENT, collection), { recursive: true });
  }

  // 1. Kopiér billeder
  const imageFiles = (await fs.readdir(SRC_IMAGES)).filter((f) => /\.(jpe?g|png|webp|svg)$/i.test(f));
  for (const file of imageFiles) {
    await fs.copyFile(path.join(SRC_IMAGES, file), path.join(OUT_IMAGES, file));
    stats.images += 1;
  }

  // 2. Indeksér billeder pr. dato, så et indlæg får sit galleri automatisk
  const imagesByDate = new Map();
  for (const file of imageFiles) {
    const match = file.match(/^(\d{4}-\d{2}-\d{2})-(.*)$/);
    if (!match) continue;
    const list = imagesByDate.get(match[1]) ?? [];
    list.push(`/billeder/${file}`);
    imagesByDate.set(match[1], list);
  }

  // 3. Konvertér indlæg
  const postFiles = (await fs.readdir(POSTS)).filter((f) => f.endsWith('.md')).sort();

  /**
   * Flere indlæg kan dele samme dato. Så kan billederne ikke fordeles på
   * datoen alene — de tildeles kun, hvis filnavnet indeholder et ord fra
   * indlæggets slug. Ellers får indlægget intet galleri frem for et
   * forkert et.
   */
  const postsPerDate = new Map();
  for (const file of postFiles) {
    const date = file.slice(0, 10);
    postsPerDate.set(date, (postsPerDate.get(date) ?? 0) + 1);
  }

  const galleryFor = (date, slug) => {
    const candidates = imagesByDate.get(date) ?? [];
    if (candidates.length === 0) return [];
    if ((postsPerDate.get(date) ?? 0) <= 1) return candidates;

    const tokens = slug.split('-').filter((token) => token.length >= 4);
    return candidates.filter((src) => {
      const name = src.toLowerCase();
      return tokens.some((token) => name.includes(token));
    });
  };

  for (const file of postFiles) {
    const raw = await fs.readFile(path.join(POSTS, file), 'utf8');
    const { data, body } = parseFrontmatter(raw);

    const [, datePart, slugPart] = file.match(/^(\d{4}-\d{2}-\d{2})-(.*)\.md$/) ?? [];
    const categories = asArray(data.categories);
    const slug = slugify(slugPart ?? data.title ?? file);
    const kind = KIND_OVERRIDES[slug] ?? resolveKind(categories);

    const tags = [...new Set([...categories, ...asArray(data.tags)])]
      .filter((tag) => !DROP_TAGS.has(tag.toLowerCase()))
      .map((tag) => titleCase(tag.trim()))
      .filter(Boolean);

    /*
     * Admin-panelet skriver nu en eksplicit gallery-liste i frontmatter.
     * Den har altid forrang; datogrupperingen er kun et fald-tilbage for
     * de ældre indlæg, der blev skrevet før feltet fandtes.
     */
    const explicitGallery = asArray(data.gallery)
      .filter((src) => typeof src === 'string' && src && !DEAD_HOST.test(src))
      .map(rewriteImagePath);

    const gallery = explicitGallery.length ? explicitGallery : galleryFor(datePart, slug);
    const coverRaw = typeof data.image === 'string' ? data.image : '';
    const cover = DEAD_HOST.test(coverRaw)
      ? gallery[0] ?? ''
      : rewriteImagePath(coverRaw) || gallery[0] || '';

    const cleaned = cleanBody(body, stats);
    const summary = deriveSummary(cleaned);

    const frontmatter = [
      '---',
      `title: ${yamlString(data.title ?? slug)}`,
      `date: ${datePart}`,
      `summary: ${yamlString(summary)}`,
      cover ? `cover: ${yamlString(cover)}` : null,
      gallery.length
        ? `gallery:\n${gallery.map((src) => `  - src: ${yamlString(src)}\n    alt: ""`).join('\n')}`
        : null,
      tags.length ? `tags:\n${tags.map((tag) => `  - ${yamlString(tag)}`).join('\n')}` : null,
      `featured: ${FEATURED.has(slug)}`,
      '---',
      '',
    ]
      .filter((line) => line !== null)
      .join('\n');

    await fs.writeFile(
      path.join(OUT_CONTENT, COLLECTION[kind], `${slug}.md`),
      `${frontmatter}\n${cleaned}\n`,
      'utf8',
    );

    stats.byKind[kind] += 1;
  }

  console.log('Migrering færdig');
  console.log(`  Rejser:     ${stats.byKind.rejse}`);
  console.log(`  Projekter:  ${stats.byKind.projekt}`);
  console.log(`  Bøger:      ${stats.byKind.bog}`);
  console.log(`  Billeder kopieret: ${stats.images}`);
  console.log(`  Døde WordPress-billeder fjernet: ${stats.removedImages}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
