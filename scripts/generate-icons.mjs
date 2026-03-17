import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, '..', 'public');

// Read the SVG icon
const svgIcon = readFileSync(join(publicDir, 'icon.svg'));

// Generate 192x192 icon
await sharp(svgIcon)
  .resize(192, 192)
  .png()
  .toFile(join(publicDir, 'pwa-192x192.png'));

// Generate 512x512 icon
await sharp(svgIcon)
  .resize(512, 512)
  .png()
  .toFile(join(publicDir, 'pwa-512x512.png'));

console.log('PWA icons generated successfully!');
