import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard CRC32 table implementation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, crcData, crcBuf]);
}

function generatePng(width, height, drawFn) {
  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image scanlines
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSig, ihdrChunk, idatChunk, iendChunk]);
}

function drawPointrIcon(x, y, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;

  const dx = x + 0.5 - cx;
  const dy = y + 0.5 - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background rounded disc / canvas
  if (dist > radius) {
    // Transparent outside circle
    if (dist > radius + 1) return [0, 0, 0, 0];
    const alpha = Math.max(0, Math.min(255, Math.round((radius + 1 - dist) * 255)));
    return [15, 23, 42, alpha]; // #0f172a
  }

  // Dark Tech Navy background #0b1329
  let r = 11;
  let g = 19;
  let b = 41;
  let a = 255;

  const strokeWidth = Math.max(1.2, width * 0.08);
  const ringRadius = width * 0.32;
  const ringDist = Math.abs(dist - ringRadius);

  // Outer target ring (#0284c7 to #38bdf8)
  if (ringDist <= strokeWidth / 2 + 0.8) {
    const intensity = Math.max(0, 1 - ringDist / (strokeWidth / 2 + 0.8));
    return [56, 189, 248, Math.round(intensity * 255)]; // #38bdf8
  }

  // Crosshair lines (horizontal and vertical reticle)
  const isHorizontalLine = Math.abs(dy) <= strokeWidth / 2 && dist >= width * 0.12 && dist <= width * 0.40;
  const isVerticalLine = Math.abs(dx) <= strokeWidth / 2 && dist >= width * 0.12 && dist <= width * 0.40;

  if (isHorizontalLine || isVerticalLine) {
    return [56, 189, 248, 255]; // #38bdf8
  }

  // Center bullseye dot (#38bdf8 / #f8fafc)
  const dotRadius = Math.max(1.2, width * 0.09);
  if (dist <= dotRadius) {
    return [248, 250, 252, 255]; // #f8fafc
  }

  return [r, g, b, a];
}

const iconsDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

// Generate 16, 48, 128 PNG icons
[16, 48, 128].forEach((size) => {
  const pngBuf = generatePng(size, size, drawPointrIcon);
  const outPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`Generated ${outPath} (${pngBuf.length} bytes)`);
});

// Also create icon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <circle cx="64" cy="64" r="58" fill="#0b1329" stroke="#1e293b" stroke-width="4"/>
  <circle cx="64" cy="64" r="42" stroke="#38bdf8" stroke-width="8" stroke-dasharray="200" stroke-linecap="round"/>
  <!-- Crosshair Reticle -->
  <line x1="64" y1="16" x2="64" y2="46" stroke="#38bdf8" stroke-width="7" stroke-linecap="round"/>
  <line x1="64" y1="82" x2="64" y2="112" stroke="#38bdf8" stroke-width="7" stroke-linecap="round"/>
  <line x1="16" y1="64" x2="46" y2="64" stroke="#38bdf8" stroke-width="7" stroke-linecap="round"/>
  <line x1="82" y1="64" x2="112" y2="64" stroke="#38bdf8" stroke-width="7" stroke-linecap="round"/>
  <!-- Center Bullseye -->
  <circle cx="64" cy="64" r="10" fill="#f8fafc"/>
  <circle cx="64" cy="64" r="4" fill="#38bdf8"/>
</svg>
`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf-8');
console.log(`Generated ${path.join(iconsDir, 'icon.svg')}`);
