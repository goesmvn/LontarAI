// Stage 3: assemble recognised characters into words using a Balinese/Kawi lexicon.
// Conservative by design: a word is only substituted when enough of its characters were read
// with top confidence; everything else stays as the raw reading (with [?] for unknowns).
//
// SEED_WORDS is a small STARTER list (common lontar vocabulary) written for this project, NOT an
// authoritative dictionary: have a Balinese/Kawi scholar review it, and load a bigger list from
// /lexicon/extra.json (JSON array of lowercase words) when available.

export const SEED_WORDS = `
ong om awighnamastu nama namah siddham sidham swaha swasti swastyastu astu sri santi paramasanti
sang sanghyang hyang ida betara bhatara batara bhatari dewa dewi dewata ratu raja prabhu mpu empu pedanda rsi resi wiku brahmana ksatrya wesya sudra
widhi wasa brahma wisnu siwa sadasiwa iswara maheswara rudra sambhu parameswara saraswati laksmi durga ganesa indra yama baruna kuwera
ring ing ikang iki ika ya nya sira ira ngaran ngaranya tan tuwi hana ana nahan nihan ndah apan yan yadyan pwa lawan saha sakeng saking antuk sane tur miwah lan wantah punika puniki inggih katuturan nenten sampun titiang tiang ipun sida dados wenten
tutur tattwa tatwa usada usadha wariga sastra kakawin kidung geguritan babad parwa purana dharma karma moksa atma prana bayu sabda idep jiwa sarira angga tamba taru pramana daun wit aji kanda pat sari kala jagat bhuwana bhuwanakosa loka akasa pertiwi apah teja panca maha bhuta yadnya upacara banten canang sesajen
pura puseh dalem desa banjar adat griya puri jero tirta toya api geni angin surya candra wulan tahun sasih rahina wuku dewasa ayu dina
soma anggara buda wraspati sukra saniscara redite kliwon legi pahing pon wage tumpek kajeng purnama tilem
kasa karo katiga kapat kalima kanem kapitu kaulu kasanga kadasa
lara panes tis sakit gering pule sari tunggal asta kosala kosali
ramayana mahabharata bharatayuddha sutasoma arjunawiwaha nitisastra sarasamuscaya wrhaspatitattwa
sanghyang widhi wasa sri rama sita laksmana hanuman rawana krisna arjuna bhima yudhistira nakula sahadewa
bali jawa nusa gianyar klungkung karangasem bangli buleleng tabanan badung jembrana denpasar
`;

const norm = (t: string) =>
  t.toLowerCase().replace(/[ṅṃṁ]/g, "ng").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z?-]/g, "");

type Node = { next: Map<string, Node>; word: boolean };
const newNode = (): Node => ({ next: new Map(), word: false });

export function buildTrie(words: string[]): Node {
  const root = newNode();
  for (const raw of words) {
    const w = norm(raw);
    if (w.length < 2 || /[?-]/.test(w)) continue;
    let n = root;
    for (const ch of w) { let c = n.next.get(ch); if (!c) { c = newNode(); n.next.set(ch, c); } n = c; }
    n.word = true;
  }
  return root;
}

let seedTrie: Node | null = null;
const seedList = () => SEED_WORDS.split(/\s+/).filter(Boolean);
export function defaultTrie(extra: string[] = []): Node {
  if (extra.length) return buildTrie([...seedList(), ...extra]);
  return (seedTrie ??= buildTrie(seedList()));
}

export async function loadExtraLexicon(): Promise<string[]> {
  try {
    const r = await fetch("/lexicon/extra.json");
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d.filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}

export type Cand = { cand: string; score?: number; runs?: number };
export type Token = { text: string; unicodeFrom: string[]; from: number; to: number; kind: "kamus" | "mentah"; changed: boolean };

const RANK_SCORE = [1, 0.55, 0.3];
const isWild = (c: Cand[]) => c.length === 0 || norm(c[0].cand) === "?" || norm(c[0].cand) === "";
const isNoise = (c: Cand[]) => c.length > 0 && norm(c[0].cand) === "-";

type Match = { end: number; score: number; r1: number; n: number; word: string; wild: number };

function wordsAt(cells: Cand[][], start: number, root: Node): Match[] {
  const out: Match[] = [];
  const dfs = (ci: number, node: Node, letters: string, score: number, r1: number, n: number, wild: number) => {
    if (node.word && n >= 2) out.push({ end: ci, score, r1, n, word: letters, wild });
    if (ci >= cells.length || n >= 14) return;
    const cell = cells[ci];
    if (isNoise(cell)) { if (n > 0) dfs(ci + 1, node, letters, score, r1, n, wild); return; } // stray mark inside a word: skip it
    if (isWild(cell)) {
      const walk = (nd: Node, lt: string, depth: number) => {
        if (depth > 0) dfs(ci + 1, nd, letters + lt, score + 0.2, r1, n + 1, wild + 1);
        if (depth >= 3) return;
        nd.next.forEach((child, ch) => walk(child, lt + ch, depth + 1));
      };
      walk(node, "", 0);
      return;
    }
    cell.slice(0, 3).forEach((c, r) => {
      const s = norm(c.cand);
      if (!s || /[?-]/.test(s)) return;
      let nd: Node | undefined = node;
      for (const ch of s) { nd = nd.next.get(ch); if (!nd) return; }
      dfs(ci + 1, nd, letters + s, score + RANK_SCORE[r], r1 + (r === 0 ? 1 : 0), n + 1, wild);
    });
  };
  dfs(start, root, "", 0, 0, 0, 0);
  return out;
}

/** Dynamic programming over cells: best mix of dictionary words and raw readings. */
export function assemble(cells: Cand[][], root: Node = defaultTrie()): Token[] {
  const N = cells.length;
  const best = new Array<number>(N + 1).fill(-Infinity);
  const back: ({ kind: "raw" } | { kind: "word"; from: number; word: string })[] = new Array(N + 1);
  best[0] = 0;
  for (let i = 0; i < N; i++) {
    if (best[i] === -Infinity) continue;
    const u = isNoise(cells[i]) ? 0 : isWild(cells[i]) ? 0.1 : 0.5;
    if (best[i] + u > best[i + 1]) { best[i + 1] = best[i] + u; back[i + 1] = { kind: "raw" }; }
    for (const m of wordsAt(cells, i, root)) {
      if (m.r1 < Math.ceil(m.n / 2)) continue; // at least half the characters must be top-confidence
      if (m.wild > 0 && (m.n < 3 || m.wild * 3 > m.n)) continue; // unreadable cells may fill at most a third of a longer word
      const total = m.score + 0.8 * (m.n - 1);
      if (best[i] + total > best[m.end]) { best[m.end] = best[i] + total; back[m.end] = { kind: "word", from: i, word: m.word }; }
    }
  }
  // backtrack
  const segs: { from: number; to: number; word?: string }[] = [];
  for (let e = N; e > 0;) {
    const b = back[e];
    if (b.kind === "word") { segs.push({ from: b.from, to: e, word: b.word }); e = b.from; }
    else { segs.push({ from: e - 1, to: e }); e -= 1; }
  }
  segs.reverse();
  // build tokens, merging consecutive raw cells into one token
  const top = (c: Cand[]) => (isNoise(c) ? "" : isWild(c) ? "[?]" : c[0].cand);
  const tokens: Token[] = [];
  for (const sg of segs) {
    if (sg.word) {
      const raw = norm(cells.slice(sg.from, sg.to).map((c) => (isWild(c) ? "?" : isNoise(c) ? "" : c[0].cand)).join(""));
      tokens.push({ text: sg.word, unicodeFrom: [sg.word], from: sg.from, to: sg.to, kind: "kamus", changed: raw !== sg.word });
    } else {
      const t = top(cells[sg.from]);
      if (t) tokens.push({ text: t, unicodeFrom: [t], from: sg.from, to: sg.to, kind: "mentah", changed: false });
    }
  }
  return tokens.filter((t) => t.text);
}
