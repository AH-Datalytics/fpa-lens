/**
 * Generates the OpenGraph link-share image for the CMS admin panel
 * (public/admin-og.png, 1200x630) — the card that unfurls when someone pastes
 * the fpalens.org/admin link into Slack, iMessage, or email.
 *
 * Branded to match the public site: navy (#21355a) field from the header, the
 * FPA seal, and the green accent (#65bc7b). Text is baked into the PNG so it
 * renders identically everywhere regardless of the viewer's fonts.
 *
 * Re-run after changing the copy or logo:  node scripts/generate-admin-og.mjs
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "..");
const LOGO = path.join(root, "public", "fpa_logo.png");
const OUT = path.join(root, "public", "admin-og.png");

const W = 1200;
const H = 630;
const LOGO_SIZE = 424;
const LOGO_X = 96;
const LOGO_Y = Math.round((H - LOGO_SIZE) / 2);
const TX = 604; // left edge of the text column

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#274470"/>
      <stop offset="1" stop-color="#1a2a48"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.26" cy="0.5" r="0.42">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="${H - 10}" width="${W}" height="10" fill="#65bc7b"/>

  <g font-family="'Helvetica Neue', Helvetica, Arial, sans-serif">
    <rect x="${TX}" y="196" width="56" height="5" rx="2.5" fill="#65bc7b"/>
    <text x="${TX}" y="248" fill="#8fe0a6" font-size="25" font-weight="700" letter-spacing="4.5">CONTENT PORTAL</text>

    <text x="${TX}" y="336" fill="#ffffff" font-size="86" font-weight="800" letter-spacing="-1">FPA Lens</text>

    <text x="${TX}" y="398" fill="#cfd8e6" font-size="31" font-weight="600">Southeast Louisiana Flood Protection</text>
    <text x="${TX}" y="438" fill="#cfd8e6" font-size="31" font-weight="600">Authority &#8211; East</text>

    <line x1="${TX}" y1="480" x2="${TX + 300}" y2="480" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2"/>

    <text x="${TX}" y="524" fill="#93a0b8" font-size="25" font-weight="500">Staff sign-in &#183; edit page text, staff &amp; settings</text>
  </g>
</svg>`;

const logo = await sharp(LOGO)
  .resize(LOGO_SIZE, LOGO_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

await sharp(Buffer.from(svg))
  .composite([{ input: logo, left: LOGO_X, top: LOGO_Y }])
  .png()
  .toFile(OUT);

console.log(`Wrote ${path.relative(root, OUT)} (${W}x${H})`);
