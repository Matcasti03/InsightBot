import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (a, b, t) => a + (b - a) * t;

function sample(x, y) {
  const distance = Math.hypot(x, y);
  const ambient = clamp(1 - distance * 0.55, 0, 1);

  let r = mix(7, 17, ambient);
  let g = mix(11, 28, ambient);
  let b = mix(22, 51, ambient);

  const angle = Math.PI / 4;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const px = x * cos + y * sin;
  const py = -x * sin + y * cos;

  const halfLength = 0.36;
  const radius = 0.2;
  const qx = Math.abs(px) - halfLength;
  const qy = py;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  const sdf = outside + inside - radius;

  const glow = Math.pow(clamp(1 - Math.abs(sdf) / 0.38, 0, 1), 2) * 0.38;
  r += (14 - r) * glow;
  g += (165 - g) * glow;
  b += (233 - b) * glow;

  if (sdf <= 0) {
    const vertical = clamp(0.78 + (1 - Math.abs(py) / radius) * 0.3, 0, 1.08);
    if (px < 0) {
      r = 16 * vertical;
      g = 185 * vertical;
      b = 129 * vertical;
    } else {
      r = 56 * vertical;
      g = 189 * vertical;
      b = 248 * vertical;
    }

    if (Math.abs(px) < 0.012) {
      const seam = clamp(1 - Math.abs(px) / 0.012, 0, 1) * 0.45;
      r = mix(r, 7, seam);
      g = mix(g, 11, seam);
      b = mix(b, 22, seam);
    }

    const ring = clamp((sdf + 0.02) / 0.02, 0, 1) * 0.35;
    r = mix(r, 226, ring);
    g = mix(g, 232, ring);
    b = mix(b, 240, ring);

    const hx = (px + 0.17) / 0.28;
    const hy = (py + 0.1) / 0.06;
    const highlight = clamp(1 - Math.hypot(hx, hy), 0, 1) * 0.5;
    r = mix(r, 248, highlight);
    g = mix(g, 250, highlight);
    b = mix(b, 252, highlight);
  }

  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255), 255];
}

function renderIcon(size) {
  const samples = 4;
  const pixel = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const accum = [0, 0, 0, 0];
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const nx = ((x + (sx + 0.5) / samples) / size) * 2 - 1;
          const ny = ((y + (sy + 0.5) / samples) / size) * 2 - 1;
          const color = sample(nx, ny);
          accum[0] += color[0];
          accum[1] += color[1];
          accum[2] += color[2];
          accum[3] += color[3];
        }
      }
      const total = samples * samples;
      const offset = (y * size + x) * 4;
      pixel[offset] = Math.round(accum[0] / total);
      pixel[offset + 1] = Math.round(accum[1] / total);
      pixel[offset + 2] = Math.round(accum[2] / total);
      pixel[offset + 3] = Math.round(accum[3] / total);
    }
  }

  return encodePng(size, size, pixel);
}

for (const size of [192, 512]) {
  const target = join(outDir, `icon-${size}.png`);
  writeFileSync(target, renderIcon(size));
  console.log(`generated ${target}`);
}

writeFileSync(join(root, 'public', 'apple-touch-icon.png'), renderIcon(180));
console.log(`generated ${join(root, 'public', 'apple-touch-icon.png')}`);
