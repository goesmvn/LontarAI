// Stage 1 of the reading pipeline: split a text-line image into character CLUSTERS
// (a base aksara plus its attached gantungan / sandhangan). Heuristic, on a Sauvola-binarised image:
// connected components -> merge components that overlap horizontally (stacked marks) ->
// merge small neighbours that together still look like one glyph.
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

type Box = { x0: number; y0: number; x1: number; y1: number };

/** Returns cluster boxes (normalised to the given line image), left to right. */
export async function segmentGlyphs(lineSrc: string): Promise<Rect[]> {
  const img = await loadImage(lineSrc);
  const scale = Math.min(1, 1800 / img.width, 260 / img.height + 0.0001 > 1 ? 1 : 260 / img.height);
  const w = Math.max(8, Math.round(img.width * scale)), h = Math.max(8, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = Math.round(0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]);
  const bin = sauvola(gray, w, h);

  // ignore a thin frame (crop edges, leaf border)
  const mx = Math.round(w * 0.01), my = Math.round(h * 0.03);
  const ink = new Uint8Array(w * h);
  for (let y = my; y < h - my; y++) for (let x = mx; x < w - mx; x++) ink[y * w + x] = bin[y * w + x] === 0 ? 1 : 0;

  // connected components (8-neighbourhood), iterative flood fill
  const label = new Int32Array(w * h);
  const comps: (Box & { area: number })[] = [];
  const stack: number[] = [];
  for (let s = 0; s < w * h; s++) {
    if (!ink[s] || label[s]) continue;
    const id = comps.length + 1;
    const c = { x0: w, y0: h, x1: 0, y1: 0, area: 0 };
    stack.push(s); label[s] = id;
    while (stack.length) {
      const p = stack.pop()!; const x = p % w, y = (p - x) / w;
      c.area++; if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (ink[ni] && !label[ni]) { label[ni] = id; stack.push(ni); }
      }
    }
    comps.push(c);
  }
  // drop specks and giant blobs (leaf edge, holes)
  const minArea = Math.max(6, w * h * 0.0002);
  const good = comps.filter((c) => c.area >= minArea && (c.y1 - c.y0 + 1) < h * 0.97 && (c.x1 - c.x0 + 1) < w * 0.5);
  if (good.length === 0) return [];
  good.sort((a, b) => a.x0 - b.x0);

  // expected glyph geometry from the data itself
  const heights = good.map((c) => c.y1 - c.y0 + 1).sort((a, b) => a - b);
  const bodyH = heights[Math.floor(heights.length * 0.75)] || h * 0.4;
  const Wg = Math.max(8, bodyH * 0.95);

  // 1) merge components that overlap horizontally (marks stacked above/below a base)
  const clusters: Box[] = [];
  for (const c of good) {
    const last = clusters[clusters.length - 1];
    const prev = clusters[clusters.length - 2];
    const tryMerge = (t: Box | undefined) => {
      if (!t) return false;
      const ov = Math.min(t.x1, c.x1) - Math.max(t.x0, c.x0);
      const minW = Math.min(t.x1 - t.x0 + 1, c.x1 - c.x0 + 1);
      if (ov > 0.35 * minW) { t.x0 = Math.min(t.x0, c.x0); t.x1 = Math.max(t.x1, c.x1); t.y0 = Math.min(t.y0, c.y0); t.y1 = Math.max(t.y1, c.y1); return true; }
      return false;
    };
    if (!tryMerge(last) && !tryMerge(prev)) clusters.push({ x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1 });
  }
  // 2) merge neighbours that together still fit one glyph (multi-stroke aksara)
  const merged: Box[] = [];
  for (const c of clusters) {
    const last = merged[merged.length - 1];
    if (last) {
      const gap = c.x0 - last.x1, wl = last.x1 - last.x0 + 1, wc = c.x1 - c.x0 + 1;
      if (gap < 0.2 * Wg && wl + gap + wc <= 1.25 * Wg) { last.x1 = Math.max(last.x1, c.x1); last.y0 = Math.min(last.y0, c.y0); last.y1 = Math.max(last.y1, c.y1); continue; }
    }
    merged.push({ ...c });
  }
  // 3) tiny leftovers (punctuation, specks) are kept only if reasonably sized
  const keep = merged.filter((b) => (b.x1 - b.x0 + 1) >= Wg * 0.25 || (b.y1 - b.y0 + 1) >= bodyH * 0.45);
  const padX = Math.round(Wg * 0.12), padY = Math.round(bodyH * 0.18);
  return keep.map((b) => {
    const x0 = Math.max(0, b.x0 - padX), x1 = Math.min(w, b.x1 + padX + 1), y0 = Math.max(0, b.y0 - padY), y1 = Math.min(h, b.y1 + padY + 1);
    return { x: x0 / w, y: y0 / h, w: (x1 - x0) / w, h: (y1 - y0) / h };
  });
}

/** Cut each cluster out of the line image (data URLs, small JPEG/PNG cells). */
export async function cutGlyphs(lineSrc: string, boxes: Rect[], cell = 150): Promise<string[]> {
  const img = await loadImage(lineSrc);
  return boxes.map((b) => {
    const sx = b.x * img.width, sy = b.y * img.height, sw = Math.max(1, b.w * img.width), sh = Math.max(1, b.h * img.height);
    const s = Math.min((cell - 16) / sw, (cell - 16) / sh);
    const c = document.createElement("canvas"); c.width = cell; c.height = cell;
    const x = c.getContext("2d")!;
    x.fillStyle = "#fff"; x.fillRect(0, 0, cell, cell);
    const dw = sw * s, dh = sh * s;
    x.drawImage(img, sx, sy, sw, sh, (cell - dw) / 2, (cell - dh) / 2, dw, dh);
    return c.toDataURL("image/png");
  });
}

/** Numbered contact sheet(s): up to 24 cells per sheet (6 columns). */
export async function contactSheets(cells: string[], perSheet = 24): Promise<{ image: string; first: number; count: number }[]> {
  const cell = 150, cols = 6;
  const sheets: { image: string; first: number; count: number }[] = [];
  for (let start = 0; start < cells.length; start += perSheet) {
    const part = cells.slice(start, start + perSheet);
    const rows = Math.ceil(part.length / cols);
    const c = document.createElement("canvas"); c.width = cols * cell; c.height = rows * cell;
    const x = c.getContext("2d")!;
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    await Promise.all(part.map((src, i) => new Promise<void>((res) => {
      const im = new Image();
      im.onload = () => { x.drawImage(im, (i % cols) * cell, Math.floor(i / cols) * cell, cell, cell); res(); };
      im.src = src;
    })));
    part.forEach((_, i) => {
      const cx = (i % cols) * cell, cy = Math.floor(i / cols) * cell;
      x.strokeStyle = "#ccc"; x.lineWidth = 1; x.strokeRect(cx + 0.5, cy + 0.5, cell - 1, cell - 1);
      x.fillStyle = "#c22"; x.font = "bold 22px sans-serif"; x.textBaseline = "top"; x.fillText(String(i + 1), cx + 6, cy + 4);
    });
    sheets.push({ image: c.toDataURL("image/png"), first: start, count: part.length });
  }
  return sheets;
}

/**
 * "Set-of-marks" tiles: groups of consecutive clusters are cut out of the line as one magnified strip,
 * with numbered boxes drawn over each cluster. The model reads per number but keeps the line context.
 */
export async function markedTiles(lineSrc: string, boxes: Rect[], perTile = 10): Promise<{ image: string; count: number; first: number }[]> {
  const img = await loadImage(lineSrc);
  const tiles: { image: string; count: number; first: number }[] = [];
  for (let start = 0; start < boxes.length; start += perTile) {
    const grp = boxes.slice(start, start + perTile);
    const x0 = Math.min(...grp.map((b) => b.x)), x1 = Math.max(...grp.map((b) => b.x + b.w));
    const y0 = Math.min(...grp.map((b) => b.y)), y1 = Math.max(...grp.map((b) => b.y + b.h));
    const sx = x0 * img.width, sy = y0 * img.height, sw = Math.max(1, (x1 - x0) * img.width), sh = Math.max(1, (y1 - y0) * img.height);
    const scale = Math.min(1500 / sw, 260 / sh);
    const padTop = 26;
    const c = document.createElement("canvas"); c.width = Math.round(sw * scale); c.height = Math.round(sh * scale) + padTop;
    const x = c.getContext("2d")!;
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(img, sx, sy, sw, sh, 0, padTop, c.width, c.height - padTop);
    grp.forEach((b, i) => {
      const bx = (b.x * img.width - sx) * scale, bw = b.w * img.width * scale;
      const by = (b.y * img.height - sy) * scale + padTop, bh = b.h * img.height * scale;
      x.strokeStyle = i % 2 ? "#1e6fd9" : "#d92b1e"; x.lineWidth = 2; x.strokeRect(bx, by, bw, bh);
      x.fillStyle = i % 2 ? "#1e6fd9" : "#d92b1e"; x.font = "bold 18px sans-serif"; x.textBaseline = "top";
      x.fillText(String(i + 1), bx + 2, 2);
    });
    tiles.push({ image: c.toDataURL("image/png"), count: grp.length, first: start });
  }
  return tiles;
}
