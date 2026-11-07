// Self-consistency for noisy line readings: keep only syllables that most runs agree on,
// mark the rest [?]. Turns hallucinations into honest gaps.

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");

function tokens(text: string): string[] {
  const i = text.toUpperCase().lastIndexOf("LATIN:");
  if (i < 0) return [];
  // only the first line after "LATIN:", without parenthetical explanations
  const line = text.slice(i + 6).split("\n")[0].replace(/\([^)]*\)/g, " ");
  const toks = line.split(/[\s\-·.,|]+/).map((t) => t.trim()).filter(Boolean);
  return toks.length > 40 ? [] : toks; // prose or runaway output, not a transliteration
}

function lcsPairs(a: string[], b: string[]): Map<number, number> {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = norm(a[i]) && norm(a[i]) === norm(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const map = new Map<number, number>();
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (norm(a[i]) && norm(a[i]) === norm(b[j])) { map.set(i, j); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return map;
}

export type Consensus = { text: string; agreement: number; runs: string[] };

export function consensus(rawRuns: string[]): Consensus {
  const runs = rawRuns.map(tokens).filter((r) => r.length > 0);
  if (runs.length === 0) return { text: "", agreement: 0, runs: rawRuns };
  if (runs.length === 1) return { text: runs[0].join(" "), agreement: 0, runs: rawRuns };
  // medoid = run most similar to the others
  let best = 0, bestScore = -1;
  runs.forEach((r, i) => {
    const score = runs.reduce((s, o, k) => (k === i ? s : s + lcsPairs(r, o).size), 0);
    if (score > bestScore) { bestScore = score; best = i; }
  });
  const base = runs[best];
  const others = runs.filter((_, i) => i !== best).map((o) => lcsPairs(base, o));
  const need = Math.ceil(others.length / 2); // at least half of the other runs must agree
  let agreed = 0;
  const out = base.map((tok, idx) => {
    const support = others.filter((m) => m.has(idx)).length;
    if (support >= need && !tok.includes("?")) { agreed++; return tok; }
    return "[?]";
  });
  // collapse consecutive [?]
  const text = out.filter((t, i) => !(t === "[?]" && out[i - 1] === "[?]")).join(" ");
  return { text, agreement: agreed / Math.max(1, base.length), runs: rawRuns };
}
