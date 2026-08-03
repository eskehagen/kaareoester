# kaareoester.dk — frontend

Astro-site for fagforfatter Kaare Øster. Statisk bygget, indholdsdrevet og
forberedt til Sanity som Headless CMS.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # typecheck + statisk build til dist/
npm run preview
```

## Arkitektur

```
src/
  lib/cms/          Indholdslaget — ét interface, to kilder
    types.ts        Kanonisk datamodel (Entry, CmsImage, Biography …)
    adapter.ts      Kontrakten alle kilder opfylder
    local.ts        Markdown i src/content            ← standard
    sanity.ts       Headless CMS over HTTP-API'et
    index.ts        Vælger kilde ud fra CMS_SOURCE
  components/
    gallery/        Fuldskærmsgalleriet (se nedenfor)
  layouts/          Base, Category, Entry
  pages/            Ruterne
  content/          Indholdet når kilden er "local"
  assets/billeder/  Originalbilleder — optimeres af Astro ved build
```

Sider og komponenter importerer **kun** `~/lib/cms`. De ved ikke, om
indholdet kommer fra en markdown-fil eller fra et CMS.

## Galleriet

Billedgitrene er ren HTML uden JavaScript. En lille controller
(`components/gallery/LightboxHost.astro`) lytter på klik og henter først
selve fuldskærmsvisningen — React + Framer Motion — når nogen faktisk
åbner et billede. Modulet forhentes, når musen rammer et billede, så
åbningen føles øjeblikkelig.

| | |
|---|---|
| Åbning | Billedet folder sig ud fra miniaturen (FLIP, kun transforms) |
| Navigation | Piletaster, swipe, filmstrimmel, `Home`/`End` |
| Luk | `Esc`, træk nedad, klik på kryds, browserens tilbageknap |
| Zoom | Dobbeltklik, `Z`, ctrl/⌘ + scroll — panorer ved at trække |
| Diasshow | Mellemrum, med fremdriftsring på knappen |
| Info | `I` — sted, dato, fotograf, link til indlægget |
| Deling | URL'en følger billedet: `…/galleri#g=arkiv&i=4` |

Alt respekterer `prefers-reduced-motion`, låser baggrundens scroll og
holder tastaturfokus inde i galleriet.

### Sådan bruges det

```astro
<PhotoGallery photos={entry.gallery} id="unikt-id" title="Overskrift" />
```

Eller programmatisk:

```js
document.dispatchEvent(
  new CustomEvent('kaare:open-gallery', { detail: { photos, index: 0 } }),
);
```

## Skift til Sanity

1. Deploy studiet i `../sanity` (skemaerne ligger klar dér).
2. Kopiér `.env.example` til `.env` og udfyld projekt-id og datasæt.
3. Sæt `CMS_SOURCE=sanity`.

Ingen komponenter skal ændres. Feltnavnene i Sanity-skemaerne er
identiske med dem i `content.config.ts`.

## Migrering fra det gamle Jekyll-site

```bash
npm run migrate
```

Konverterer `../_posts` til content collections, mapper de gamle
kategorier til rejse/projekt/bog, kopierer billeder til
`src/assets/billeder` og samler billeder med samme datopræfiks til
indlæggets galleri. Scriptet er idempotent og kan køres igen.
