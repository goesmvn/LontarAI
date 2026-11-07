// Client-side computer-vision preprocessing for lontar photos (no dependencies).
// Pipeline: grayscale -> contrast stretch -> Sauvola adaptive threshold (integral images).

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Gagal memuat gambar."));
    img.src = src;
  });
}

export type SauvolaOptions = { window?: number; k?: number; r?: number };

/**
 * Sauvola: T(x,y) = m * (1 + k * (s/R - 1)), local mean m and std s over a window.
 * Handles uneven lighting and stains better than a global threshold, which suits
 * palm-leaf photos where the ink (incised + darkened grooves) is thin.
 */
export function sauvola(gray: Uint8ClampedArray, w: number, h: number, opt: SauvolaOptions = {}): Uint8ClampedArray {
  // Window ~ a few stroke/line heights so the dark leaf body does not flood to black.
  const win = (opt.window ?? Math.min(51, Math.max(15, Math.round(Math.min(w, h) * 0.03)))) | 1;
  const k = opt.k ?? 0.34;
  const R = opt.r ?? 128;
  const half = win >> 1;
  const W = w + 1;
  const sum = new Float64Array(W * (h + 1));
  const sq = new Float64Array(W * (h + 1));
  for (let y = 0; y < h; y++) {
    let rs = 0, rq = 0;
    for (let x = 0; x < w; x++) {
      const v = gray[y * w + x];
      rs += v; rq += v * v;
      sum[(y + 1) * W + x + 1] = sum[y * W + x + 1] + rs;
      sq[(y + 1) * W + x + 1] = sq[y * W + x + 1] + rq;
    }
  }
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - half), y1 = Math.min(h, y + half + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - half), x1 = Math.min(w, x + half + 1);
      const n = (x1 - x0) * (y1 - y0);
      const s = sum[y1 * W + x1] - sum[y0 * W + x1] - sum[y1 * W + x0] + sum[y0 * W + x0];
      const q = sq[y1 * W + x1] - sq[y0 * W + x1] - sq[y1 * W + x0] + sq[y0 * W + x0];
      const mean = s / n;
      const std = Math.sqrt(Math.max(0, q / n - mean * mean));
      const t = mean * (1 + k * (std / R - 1));
      out[y * w + x] = gray[y * w + x] > t ? 255 : 0;
    }
  }
  return out;
}

export async function enhanceImage(dataUrl: string, opt?: SauvolaOptions): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia.");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const n = canvas.width * canvas.height;

  const gray = new Uint8ClampedArray(n);
  let lo = 255, hi = 0;
  for (let i = 0; i < n; i++) {
    const g = Math.round(0.299 * data.data[i * 4] + 0.587 * data.data[i * 4 + 1] + 0.114 * data.data[i * 4 + 2]);
    gray[i] = g;
    if (g < lo) lo = g;
    if (g > hi) hi = g;
  }
  // contrast stretch
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < n; i++) gray[i] = ((gray[i] - lo) * 255) / span;

  const bin = sauvola(gray, canvas.width, canvas.height, opt);
  for (let i = 0; i < n; i++) {
    data.data[i * 4] = data.data[i * 4 + 1] = data.data[i * 4 + 2] = bin[i];
    data.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.9);
}
