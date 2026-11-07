// Rule-based Latin -> Aksara Bali (Unicode U+1B00–U+1B7F). No dependencies.
// Aid for manual transcription; always shown as a preview that a human must check.
//
// Input convention (documented in the UI):
//   consonants: k kh g gh ng c ch j jh ny ṭ ṭh ḍ ḍh ṇ t th d dh n p ph b bh m y r l w ś ṣ s h
//   vowels:     a ā i ī u ū e/é (taleng) ĕ (pepet) o ai au
//   punctuation: "," -> carik, "." or "|" -> pasalinan
// A consonant with no vowel is "dead": word-final ng/r/h become cecek/surang/bisah, any other
// becomes adeg-adeg (virama), which is also how a following consonant forms a gantungan.

const C: Record<string, string> = {
  k: "ᬓ", kh: "ᬔ", g: "ᬕ", gh: "ᬖ", ng: "ᬗ", c: "ᬘ", ch: "ᬙ",
  j: "ᬚ", jh: "ᬛ", ny: "ᬜ", "ṭ": "ᬝ", "ṭh": "ᬞ", "ḍ": "ᬟ", "ḍh": "ᬠ",
  "ṇ": "ᬡ", t: "ᬢ", th: "ᬣ", d: "ᬤ", dh: "ᬥ", n: "ᬦ", p: "ᬧ",
  ph: "ᬨ", b: "ᬩ", bh: "ᬪ", m: "ᬫ", y: "ᬬ", r: "ᬭ", l: "ᬮ",
  w: "ᬯ", "ś": "ᬰ", "ṣ": "ᬱ", s: "ᬲ", h: "ᬳ",
};

// dependent vowel signs ("a" is inherent: no sign)
const V_SIGN: Record<string, string> = {
  a: "", "ā": "ᬵ", i: "ᬶ", "ī": "ᬷ", u: "ᬸ", "ū": "ᬹ",
  e: "ᬾ", "é": "ᬾ", "ĕ": "ᭂ", o: "ᭀ", ai: "ᬿ", au: "ᭁ",
};
// independent vowels (pepet has no standalone letter: written as a + pepet)
const V_IND: Record<string, string> = {
  a: "ᬅ", "ā": "ᬆ", i: "ᬇ", "ī": "ᬈ", u: "ᬉ", "ū": "ᬊ",
  e: "ᬏ", "é": "ᬏ", "ĕ": "ᬅᭂ", o: "ᬑ", ai: "ᬐ", au: "ᬒ",
};

const VIRAMA = "᭄"; // adeg-adeg
const CECEK = "ᬂ", SURANG = "ᬃ", BISAH = "ᬄ";
const PUNCT: Record<string, string> = { ",": "᭞", ".": "᭟", "|": "᭟" };

const VOWELS = new Set(["a", "ā", "i", "ī", "u", "ū", "e", "é", "ĕ", "o"]);

function readVowel(w: string, i: number): [string, number] | null {
  const two = w.slice(i, i + 2);
  if (two === "ai" || two === "au") return [two, 2];
  return VOWELS.has(w[i]) ? [w[i], 1] : null;
}

function readConsonant(w: string, i: number): [string, number] | null {
  const two = w.slice(i, i + 2);
  if (two in C) return [two, 2];
  return w[i] in C ? [w[i], 1] : null;
}

function convertWord(w: string): string {
  let out = "";
  let i = 0;
  let hasSyllable = false;
  while (i < w.length) {
    const ch = w[i];
    if (ch >= "0" && ch <= "9") { out += String.fromCharCode(0x1b50 + Number(ch)); i++; continue; }
    if (ch in PUNCT) { out += PUNCT[ch]; i++; continue; }

    const cons = readConsonant(w, i);
    if (cons) {
      i += cons[1];
      const v = readVowel(w, i);
      if (v) {
        out += C[cons[0]] + V_SIGN[v[0]];
        i += v[1];
      } else {
        // dead consonant (no vowel follows): ng/r/h after a syllable become cecek/surang/bisah
        if (hasSyllable && cons[0] === "ng") out += CECEK;
        else if (hasSyllable && cons[0] === "r") out += SURANG;
        else if (hasSyllable && cons[0] === "h") out += BISAH;
        else out += C[cons[0]] + VIRAMA;
      }
      hasSyllable = true;
      continue;
    }

    const v = readVowel(w, i);
    if (v) { out += V_IND[v[0]]; i += v[1]; hasSyllable = true; continue; }

    out += ch; // brackets, [?], unknown characters pass through
    i++;
  }
  return out;
}

export function latinToBali(input: string): string {
  return input
    .normalize("NFC")
    .toLowerCase()
    .split(/(\s+)/)
    .map((part) => (/^\s+$/.test(part) ? part : convertWord(part)))
    .join("");
}
