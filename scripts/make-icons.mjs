// يولّد أيقونات التطبيق (PNG) بلا أي مكتبات: خلفية بتدرّج الشعار وعلامة «+» بيضاء.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'icons');
mkdirSync(outDir, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgb) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const A = [0x24, 0x8f, 0x8c]; // أزرق مخضرّ
const B = [0x3d, 0xae, 0x6f]; // أخضر
const W = [0xff, 0xff, 0xff];
const S = [0xf1, 0xd9, 0xa4]; // رملي دافئ

// داخل مستطيل بزوايا دائرية؟ (إحداثيات 0..1)
function inRoundRect(x, y, cx, cy, hw, hh, r) {
  const dx = Math.max(Math.abs(x - cx) - (hw - r), 0);
  const dy = Math.max(Math.abs(y - cy) - (hh - r), 0);
  return dx * dx + dy * dy <= r * r;
}

function colorAt(x, y) {
  const t = Math.min(1, Math.max(0, (x + (1 - y)) / 2));
  let c = A.map((a, i) => a + (B[i] - a) * t);
  // نقاط خافتة مستوحاة من الشعار في الزاوية
  const dots = [[0.8, 0.2, 0.035], [0.67, 0.2, 0.028], [0.8, 0.33, 0.028], [0.56, 0.2, 0.02], [0.8, 0.44, 0.02], [0.68, 0.32, 0.02]];
  for (const [dx, dy, r] of dots) {
    if ((x - dx) ** 2 + (y - dy) ** 2 <= r * r) c = c.map((v) => v + (255 - v) * 0.22);
  }
  const arm = 0.052, len = 0.2, cx = 0.46, cy = 0.56;
  if (inRoundRect(x, y, cx, cy, len, arm, arm) || inRoundRect(x, y, cx, cy, arm, len, arm)) c = W;
  if ((x - 0.74) ** 2 + (y - 0.79) ** 2 <= 0.045 ** 2) c = S;
  return c;
}

function render(size) {
  const ss = 4;
  const rgb = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
        const c = colorAt((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size);
        acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
      }
      const i = (y * size + x) * 3;
      rgb[i] = Math.round(acc[0] / (ss * ss));
      rgb[i + 1] = Math.round(acc[1] / (ss * ss));
      rgb[i + 2] = Math.round(acc[2] / (ss * ss));
    }
  }
  return png(size, rgb);
}

for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512], ['favicon-48.png', 48]]) {
  writeFileSync(path.join(outDir, name), render(size));
  console.log('✓ icons/' + name);
}
