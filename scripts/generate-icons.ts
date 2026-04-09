/**
 * SVG → PNG icon generator
 * Usage: npx tsx scripts/generate-icons.ts
 */
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const svgPath = resolve(rootDir, 'public/icons/icon.svg');
const outDir = resolve(rootDir, 'public/icons');

if (!existsSync(svgPath)) {
  console.error('SVG not found:', svgPath);
  process.exit(1);
}

const svgBuffer = readFileSync(svgPath);

const sizes = [96, 144, 192, 512];

async function main() {
  // Dynamic import for sharp (may need install)
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.log('Installing sharp...');
    const { execSync } = await import('child_process');
    execSync('npm install --save-dev sharp', { cwd: rootDir, stdio: 'inherit' });
    sharp = (await import('sharp')).default;
  }

  mkdirSync(outDir, { recursive: true });

  for (const size of sizes) {
    const outPath = resolve(outDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
    console.log(`✅ Generated: icon-${size}x${size}.png`);
  }

  // Also generate favicon (32x32)
  const faviconPath = resolve(outDir, 'favicon-32x32.png');
  await sharp(svgBuffer).resize(32, 32).png().toFile(faviconPath);
  console.log('✅ Generated: favicon-32x32.png');

  // Apple touch icon (180x180)
  const applePath = resolve(outDir, 'apple-touch-icon-180x180.png');
  await sharp(svgBuffer).resize(180, 180).png().toFile(applePath);
  console.log('✅ Generated: apple-touch-icon-180x180.png');

  console.log('\nDone! All icons generated in public/icons/');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
