import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(__dirname, '..');

const SIZES = [16, 32, 48, 128];
const OUTPUT_DIR = resolve(PROJECT, 'public/icons');

const MAIN_ICON = resolve(PROJECT, 'new_icon.png');
const WHITE_ICON = resolve(PROJECT, 'icon_white.png');

async function generateIcons() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const size of SIZES) {
    if (existsSync(MAIN_ICON)) {
      const outputPath = resolve(OUTPUT_DIR, `icon-${size}.png`);
      await sharp(MAIN_ICON)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Generated ${outputPath}`);
    }

    if (existsSync(WHITE_ICON)) {
      const outputPath = resolve(OUTPUT_DIR, `icon-white-${size}.png`);
      await sharp(WHITE_ICON)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Generated ${outputPath}`);
    }
  }

  console.log('All icons generated successfully.');
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
