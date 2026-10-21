/**
 * Generates the SelfVibe PWA / favicon icons from the logo (neon mic badge).
 * Run with: npm run icons
 * Output: public/icons/*.png, src/app/icon.svg, src/app/apple-icon.png
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NEON = "#22C55E";

/**
 * Build the logo SVG.
 * @param {Object} options
 * @param {number} options.badgeScale - Badge size as a fraction of the canvas (maskable icons need ≤ 0.8)
 * @param {boolean} options.glow - Draw the neon glow behind the badge
 * @returns {string} SVG markup on a 512×512 canvas
 */
function buildLogoSvg({ badgeScale, glow }) {
  const size = 512;
  const badge = size * badgeScale;
  const offset = (size - badge) / 2;
  const radius = badge * 0.24;
  const iconScale = (badge * 0.5) / 24; // lucide icons are drawn on a 24×24 grid
  const iconOffset = offset + badge * 0.25;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${badge * 0.06}" />
    </filter>
  </defs>
  <rect width="${size}" height="${size}" fill="#000000"/>
  ${glow ? `<rect x="${offset}" y="${offset}" width="${badge}" height="${badge}" rx="${radius}" fill="none" stroke="${NEON}" stroke-width="${badge * 0.05}" opacity="0.7" filter="url(#glow)"/>` : ""}
  <rect x="${offset}" y="${offset}" width="${badge}" height="${badge}" rx="${radius}" fill="#000000" stroke="${NEON}" stroke-width="${badge * 0.025}"/>
  <g transform="translate(${iconOffset} ${iconOffset}) scale(${iconScale})" fill="none" stroke="${NEON}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 19v3"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <rect x="9" y="2" width="6" height="13" rx="3"/>
  </g>
</svg>`;
}

async function main() {
  const iconsDir = path.join(ROOT, "public", "icons");
  await mkdir(iconsDir, { recursive: true });

  const standard = Buffer.from(buildLogoSvg({ badgeScale: 0.78, glow: true }));
  // Maskable: badge kept inside the 80% safe zone so Android masks never crop it
  const maskable = Buffer.from(buildLogoSvg({ badgeScale: 0.6, glow: true }));

  const outputs = [
    { file: path.join(iconsDir, "icon-192.png"), source: standard, size: 192 },
    { file: path.join(iconsDir, "icon-512.png"), source: standard, size: 512 },
    { file: path.join(iconsDir, "icon-maskable-192.png"), source: maskable, size: 192 },
    { file: path.join(iconsDir, "icon-maskable-512.png"), source: maskable, size: 512 },
    { file: path.join(ROOT, "src", "app", "apple-icon.png"), source: maskable, size: 180 },
  ];

  for (const { file, source, size } of outputs) {
    await sharp(source).resize(size, size).png().toFile(file);
    console.log(`[icons] wrote ${path.relative(ROOT, file)}`);
  }

  // Favicon as SVG: crisp at every size
  const faviconFile = path.join(ROOT, "src", "app", "icon.svg");
  await writeFile(faviconFile, buildLogoSvg({ badgeScale: 0.92, glow: false }));
  console.log(`[icons] wrote ${path.relative(ROOT, faviconFile)}`);
}

main().catch((error) => {
  console.error("[icons] generation failed:", error);
  process.exit(1);
});
