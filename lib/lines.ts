// Text-line segmentation by horizontal projection profile on a Sauvola-binarised image.
// Approach follows the line-segmentation idea used for palm-leaf manuscripts in the literature
// (see docs/REFERENSI.md). A heuristic: users review and correct the result.
import { sauvola } from "./cv";
import type { Rect } from "./area";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Gagal memuat gambar."));
    img.src = src;
  });
}

/** Returns line boxes in normalised coordinates of the FULL image, top to bottom. */
export async function segmentLines(src: string, area: Rect | null, sensitivity = 0.35): Promise<Rect[]> {
  const img = await loadImage(src);
  const a = area ?? { x: 0, y: 0, w: 1, h: 1 };
  const sx = Math.round(a.x * img.width), sy = Math.round(a.y * img.height);
  const sw = Math.max(8, Math.round(a.w * img.width)), sh = Math.max(8, Math.round(a.h * img.height));
  const scale = Math.min(1, 1400 / Math.max(sw, sh));
  const w = Math.max(8, Math.round(sw * scale)), h = Math.max(8, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = Math.round(0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]);
  const bin = sauvola(gray, w, h);

  // ignore a thin frame so crop edges / leaf borders do not count as ink
  const mx = Math.round(w * 0.02), my = Math.round(h * 0.02);
  const rows = new Float64Array(h);
  for (let y = my; y < h - my; y++) {
    let c = 0;
    for (let x = mx; x < w - mx; x++) if (bin[y * w + x] === 0) c++;
    rows[y] = c / (w - 2 * mx);
  }
  // smooth
  const win = Math.max(2, Math.round(h * 0.012));
  const sm = new Float64Array(h);
  for (let y = 0; y < h; y++) {
    let s = 0, n = 0;
    for (let k = -win; k <= win; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += rows[yy]; n++; } }
    sm[y] = s / n;
  }
  const sorted = Array.from(sm).sort((p, q) => p - q);
  const hi = sorted[Math.floor(sorted.length * 0.9)] || 0;
  const thr = Math.max(0.01, hi * sensitivity); // lower = more sensitive (splits more, keeps faint lines)

  const segs: [number, number][] = [];
  let start = -1;
  for (let y = 0; y <= h; y++) {
    const on = y < h && sm[y] > thr;
    if (on && start < 0) start = y;
    if (!on && start >= 0) { segs.push([start, y - 1]); start = -1; }
  }
  // merge segments separated by tiny gaps (diacritics above/below the main line)
  const minGap = Math.max(3, Math.round(h * 0.015));
  const merged: [number, number][] = [];
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (last && s[0] - last[1] < minGap) last[1] = s[1]; else merged.push([s[0], s[1]]);
  }
  const minH = Math.max(6, Math.round(h * 0.03));
  const out: Rect[] = [];
  for (const [y0, y1] of merged) {
    if (y1 - y0 < minH) continue;
    // horizontal extent of ink inside this band
    let x0 = w, x1 = 0;
    for (let x = mx; x < w - mx; x++) {
      let c = 0;
      for (let y = y0; y <= y1; y++) if (bin[y * w + x] === 0) c++;
      if (c / (y1 - y0 + 1) > 0.04) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    }
    if (x1 <= x0) { x0 = mx; x1 = w - mx; }
    const padY = Math.round((y1 - y0) * 0.12), padX = Math.round(w * 0.01);
    const ry0 = Math.max(0, y0 - padY), ry1 = Math.min(h, y1 + padY), rx0 = Math.max(0, x0 - padX), rx1 = Math.min(w, x1 + padX);
    out.push({
      x: a.x + (rx0 / w) * a.w, y: a.y + (ry0 / h) * a.h,
      w: ((rx1 - rx0) / w) * a.w, h: ((ry1 - ry0) / h) * a.h,
    });
  }
  return out;
}
