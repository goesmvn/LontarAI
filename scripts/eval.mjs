#!/usr/bin/env node
// Usage: node scripts/eval.mjs [refsDir=eval/refs] [predsDir=eval/preds]
// Compares predictions to expert references: Character/Word Error Rate for
// Balinese Unicode and Latin transliteration. File names must match (x.json <-> x.json).
// Reference/prediction JSON need: unicode_transcription, latin_transliteration.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const refsDir = process.argv[2] ?? "eval/refs";
const predsDir = process.argv[3] ?? "eval/preds";

const norm = (s = "") => s.normalize("NFC").replace(/\s+/g, " ").trim();

function lev(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
export const cer = (ref, hyp) => { const r = Array.from(norm(ref)); return r.length ? lev(r, Array.from(norm(hyp))) / r.length : 0; };
export const wer = (ref, hyp) => { const r = norm(ref).split(" ").filter(Boolean); return r.length ? lev(r, norm(hyp).split(" ").filter(Boolean)) / r.length : 0; };

if (!existsSync(refsDir)) { console.error(`Folder tidak ada: ${refsDir}`); process.exit(1); }
const files = readdirSync(refsDir).filter((f) => f.endsWith(".json"));
if (files.length === 0) { console.error(`Tidak ada referensi .json di ${refsDir}`); process.exit(1); }

const rows = [];
for (const f of files) {
  const predPath = join(predsDir, f);
  if (!existsSync(predPath)) { console.warn(`(lewati) prediksi tidak ada: ${f}`); continue; }
  const ref = JSON.parse(readFileSync(join(refsDir, f), "utf8"));
  const pred = JSON.parse(readFileSync(predPath, "utf8"));
  const unk = (pred.unicode_transcription?.match(/\[\?\]/g) ?? []).length;
  rows.push({
    file: f,
    cerUni: cer(ref.unicode_transcription, pred.unicode_transcription),
    cerLat: cer(ref.latin_transliteration, pred.latin_transliteration),
    werLat: wer(ref.latin_transliteration, pred.latin_transliteration),
    unk,
  });
}
const pct = (x) => (x * 100).toFixed(1).padStart(6) + "%";
console.log("file".padEnd(28), "CER-bali", "CER-latin", "WER-latin", "[?]");
for (const r of rows) console.log(r.file.padEnd(28), pct(r.cerUni), " ", pct(r.cerLat), " ", pct(r.werLat), " ", r.unk);
if (rows.length) {
  const avg = (k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;
  console.log("-".repeat(64));
  console.log("RATA-RATA".padEnd(28), pct(avg("cerUni")), " ", pct(avg("cerLat")), " ", pct(avg("werLat")), ` (n=${rows.length})`);
}
