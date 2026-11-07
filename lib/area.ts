// Client-side area helpers: crop a region and suggest likely inscription areas.
import { sauvola } from "./cv";

export type Rect = { x: number; y: number; w: number; h: number }; // normalised 0..1

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Gagal memuat gambar."));
    img.src = src;
  });
}

export const clampRect = (r: Rect): Rect => {
  const x = Math.min(1, Math.max(0, r.x)), y = Math.min(1, Math.max(0, r.y));
  return { x, y, w: Math.min(1 - x, Math.max(0, r.w)), h: Math.min(1 - y, Math.max(0, r.h)) };
};

/** Cut the selected region out of the image. Re-encoding via canvas also strips EXIF. */
export async function cropImage(src: string, r: Rect, maxSide = 2400, minHeight = 0): Promise<string> {
  const img = await loadImage(src);
  const sx = Math.round(r.x * img.width), sy = Math.round(r.y * img.height);
  const sw = Math.max(1, Math.round(r.w * img.width)), sh = Math.max(1, Math.round(r.h * img.height));
  let scale = Math.min(1, maxSide / Math.max(sw, sh));
  // upscale thin line crops so glyph detail is legible to the model
  if (minHeight && sh * scale < minHeight) scale = Math.min(minHeight / sh, maxSide / sw);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia.");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Suggest inscription areas: binarise (Sauvola), measure ink density on a coarse grid,
 * merge neighbouring dense cells (smearing horizontally, since lines run left-to-right)
 * and return the largest connected blobs as boxes. A heuristic: users adjust the result.
 */
export async function detectTextRegions(src: string, max = 4): Promise<Rect[]> {
  const img = await loadImage(src);
  const scale = Math.min(1, 800 / Math.max(img.width, img.height));
  const w = Math.max(16, Math.round(img.width * scale)), h = Math.max(16, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = Math.round(0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]);
  const bin = sauvola(gray, w, h);

  const cell = 8, gw = Math.floor(w / cell), gh = Math.floor(h / cell);
  const mask = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let dark = 0;
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) if (bin[(gy * cell + y) * w + gx * cell + x] === 0) dark++;
    const d = dark / (cell * cell);
    mask[gy * gw + gx] = d > 0.12 && d < 0.85 ? 1 : 0;
  }
  // smear horizontally by 2 cells, vertically by 1
  const sm = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    if (!mask[gy * gw + gx]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
      const ny = gy + dy, nx = gx + dx;
      if (ny >= 0 && ny < gh && nx >= 0 && nx < gw) sm[ny * gw + nx] = 1;
    }
  }
  const seen = new Uint8Array(gw * gh);
  const boxes: { x0: number; y0: number; x1: number; y1: number; n: number }[] = [];
  for (let s = 0; s < gw * gh; s++) {
    if (!sm[s] || seen[s]) continue;
    const stack = [s]; seen[s] = 1;
    let x0 = gw, y0 = gh, x1 = 0, y1 = 0, n = 0;
    while (stack.length) {
      const c = stack.pop()!; const cx = c % gw, cy = (c - cx) / gw;
      n++; x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + ax, ny = cy + ay;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const ni = ny * gw + nx;
        if (sm[ni] && !seen[ni]) { seen[ni] = 1; stack.push(ni); }
      }
    }
    boxes.push({ x0, y0, x1, y1, n });
  }
  const minCells = Math.max(12, gw * gh * 0.01);
  return boxes
    .filter((b) => b.n >= minCells)
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
    .map((b) => clampRect({ x: (b.x0 - 1) / gw, y: (b.y0 - 1) / gh, w: (b.x1 - b.x0 + 3) / gw, h: (b.y1 - b.y0 + 3) / gh }));
}
