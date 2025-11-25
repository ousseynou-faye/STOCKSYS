// scripts/generate-icons.mjs
// Generates placeholder PWA icons in public/ if missing.
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const outDir = resolve(process.cwd(), 'public');
try { mkdirSync(outDir, { recursive: true }); } catch {}

// 1x1 transparent PNG (base64). Placeholder only; replace with real icons when available.
const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/af2CtgAAAAASUVORK5CYII=';

const targets = [
  { name: 'logo192.png', data: transparentPngBase64 },
  { name: 'logo512.png', data: transparentPngBase64 },
];

for (const t of targets) {
  const p = resolve(outDir, t.name);
  if (!existsSync(p)) {
    writeFileSync(p, Buffer.from(t.data, 'base64'));
<<<<<<< HEAD
    // eslint-disable-next-line no-console
    console.log(`Generated ${t.name}`);
  }
}

=======
    console.log(`Generated ${t.name}`);
  }
}
>>>>>>> 7884868 (STOCKSYS)
