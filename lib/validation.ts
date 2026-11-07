// Shared server-side validation + lightweight rate limiting for API routes.

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // ~8MB decoded (client re-encodes to JPEG)
const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

// Rough bounding box around Bali (with margin for Nusa Penida/Lembongan).
const BALI_BOUNDS = { minLat: -8.95, maxLat: -8.0, minLng: 114.4, maxLng: 115.75 };

export const MAX_DESCRIPTION_LENGTH = 500;

export function validateImageDataUrl(value: unknown): string | null {
  if (typeof value !== "string") return "Gambar tidak ditemukan.";
  const match = IMAGE_DATA_URL.exec(value);
  if (!match) return "Format gambar tidak didukung (gunakan JPEG, PNG, atau WebP).";
  const decodedBytes = Math.floor((match[2].length * 3) / 4);
  if (decodedBytes > MAX_IMAGE_BYTES) return "Ukuran gambar terlalu besar (maks 8MB).";
  return null;
}

export function validateBaliCoordinates(lat: unknown, lng: unknown): string | null {
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "Lokasi diperlukan.";
  }
  if (
    lat < BALI_BOUNDS.minLat || lat > BALI_BOUNDS.maxLat ||
    lng < BALI_BOUNDS.minLng || lng > BALI_BOUNDS.maxLng
  ) {
    return "Lokasi harus berada di wilayah Bali.";
  }
  return null;
}

// Fixed-window in-memory limiter. Best-effort only: per serverless instance.
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (hits.size > 5000) {
    hits.forEach((v, k) => {
      if (v.resetAt <= now) hits.delete(k);
    });
  }
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
