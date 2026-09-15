import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SIZES = [16, 32, 48, 128];
const OUTPUT_DIR = resolve(__dirname, '../public/icons');

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#bg)"/>
  <text x="64" y="82" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="700" fill="white" text-anchor="middle" letter-spacing="-2">E</text>
  <circle cx="100" cy="32" r="8" fill="rgba(255,255,255,0.3)"/>
</svg>`;

async function generateIcons() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const size of SIZES) {
    const outputPath = resolve(OUTPUT_DIR, `icon-${size}.png`);
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated ${outputPath}`);
  }

  console.log('All icons generated successfully.');
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
