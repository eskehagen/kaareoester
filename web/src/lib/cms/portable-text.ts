/**
 * Minimal Portable Text → HTML-serializer.
 *
 * Dækker det, redaktøren realistisk bruger i Sanity Studio: afsnit,
 * overskrifter, citater, lister, fed/kursiv/kode og links samt
 * indlejrede billeder. Ingen afhængigheder, kører kun ved build.
 */

export interface PortableTextSpan {
  _type: 'span';
  _key?: string;
  text: string;
  marks?: string[];
}

export interface PortableTextMarkDef {
  _key: string;
  _type: string;
  href?: string;
}

export interface PortableTextBlock {
  _type: string;
  _key?: string;
  style?: string;
  level?: number;
  listItem?: 'bullet' | 'number';
  children?: PortableTextSpan[];
  markDefs?: PortableTextMarkDef[];
  // Indlejret billede
  asset?: { url?: string };
  url?: string;
  alt?: string;
  caption?: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const SIMPLE_MARKS: Record<string, [string, string]> = {
  strong: ['<strong>', '</strong>'],
  em: ['<em>', '</em>'],
  code: ['<code>', '</code>'],
  underline: ['<u>', '</u>'],
  'strike-through': ['<s>', '</s>'],
};

function renderSpans(block: PortableTextBlock): string {
  const markDefs = block.markDefs ?? [];

  return (block.children ?? [])
    .map((span) => {
      let html = escapeHtml(span.text);

      for (const mark of span.marks ?? []) {
        const simple = SIMPLE_MARKS[mark];
        if (simple) {
          html = `${simple[0]}${html}${simple[1]}`;
          continue;
        }
        const def = markDefs.find((d) => d._key === mark);
        if (def?._type === 'link' && def.href) {
          const external = /^https?:\/\//.test(def.href);
          const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
          html = `<a href="${escapeHtml(def.href)}"${attrs}>${html}</a>`;
        }
      }

      return html;
    })
    .join('');
}

function plainText(block: PortableTextBlock): string {
  return (block.children ?? []).map((span) => span.text).join('');
}

/** Serialiserer Portable Text til HTML og udtrækker overskrifter til indholdsfortegnelsen. */
export function portableTextToHtml(blocks: PortableTextBlock[] = []): {
  html: string;
  headings: { depth: number; slug: string; text: string }[];
} {
  const headings: { depth: number; slug: string; text: string }[] = [];
  const out: string[] = [];

  let openList: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (openList) {
      out.push(`</${openList}>`);
      openList = null;
    }
  };

  for (const block of blocks) {
    if (block._type === 'image') {
      closeList();
      const src = block.asset?.url ?? block.url;
      if (!src) continue;
      const img = `<img src="${escapeHtml(src)}" alt="${escapeHtml(block.alt ?? '')}" loading="lazy" decoding="async">`;
      out.push(
        block.caption
          ? `<figure>${img}<figcaption>${escapeHtml(block.caption)}</figcaption></figure>`
          : img,
      );
      continue;
    }

    if (block._type !== 'block') continue;

    if (block.listItem) {
      const tag = block.listItem === 'number' ? 'ol' : 'ul';
      if (openList !== tag) {
        closeList();
        out.push(`<${tag}>`);
        openList = tag;
      }
      out.push(`<li>${renderSpans(block)}</li>`);
      continue;
    }

    closeList();
    const style = block.style ?? 'normal';

    if (/^h[1-6]$/.test(style)) {
      const depth = Number(style.slice(1));
      const text = plainText(block);
      const slug = slugify(text);
      headings.push({ depth, slug, text });
      out.push(`<${style} id="${slug}">${renderSpans(block)}</${style}>`);
      continue;
    }

    if (style === 'blockquote') {
      out.push(`<blockquote>${renderSpans(block)}</blockquote>`);
      continue;
    }

    const content = renderSpans(block);
    if (content.trim()) out.push(`<p>${content}</p>`);
  }

  closeList();
  return { html: out.join('\n'), headings };
}
