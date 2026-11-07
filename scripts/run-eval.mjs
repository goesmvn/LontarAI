#!/usr/bin/env node
// Usage: node scripts/run-eval.mjs [baseUrl=http://localhost:3000] [imagesDir=eval/images] [outDir=eval/preds]
// Sends each image to /api/studio/analyze and saves the response next to the references.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, extname, basename } from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const dir = process.argv[3] ?? "eval/images";
const out = process.argv[4] ?? "eval/preds";
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
mkdirSync(out, { recursive: true });

for (const f of readdirSync(dir)) {
  const mime = MIME[extname(f).toLowerCase()];
  if (!mime) continue;
  const image = `data:${mime};base64,${readFileSync(join(dir, f)).toString("base64")}`;
  const t0 = Date.now();
  const res = await fetch(`${base}/api/studio/analyze`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }),
  });
  const body = await res.json();
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (!res.ok) { console.error(`${f}: GAGAL (${res.status}) ${body.error}`); continue; }
  writeFileSync(join(out, `${basename(f, extname(f))}.json`), JSON.stringify(body.data, null, 2));
  console.log(`${f}: ok ${secs}s, baris=${body.data.lines.length}`);
}
