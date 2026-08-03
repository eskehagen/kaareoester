import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';
import { structure } from './structure';

/**
 * Sanity Studio for kaareoester.dk
 *
 * Opsætning (engangs):
 *   npm create sanity@latest -- --project <id> --dataset production
 *   npm install
 *   npx sanity deploy      → studiet ligger på <navn>.sanity.studio
 *
 * Skemaerne i ./schemas svarer felt for felt til datamodellen i
 * web/src/lib/cms/types.ts.
 */
export default defineConfig({
  name: 'kaareoester',
  title: 'Kaare Øster',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? '',
  dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',

  plugins: [structureTool({ structure }), visionTool()],

  schema: { types: schemaTypes },
});
