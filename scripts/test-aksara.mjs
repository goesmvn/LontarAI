#!/usr/bin/env node
// Run: node scripts/test-aksara.mjs   (Node >= 22.18 strips TypeScript types natively)
import { latinToBali } from "../lib/aksara.ts";
const cases = [
  ["ong awighnamastu", "ᬑᬂ ᬅᬯᬶᬖ᭄ᬦᬫᬲ᭄ᬢᬸ"],
  ["aksara", "ᬅᬓ᭄ᬲᬭ"],
  ["bali", "ᬩᬮᬶ"],
  ["karma", "ᬓᬃᬫ"],
  ["angkara", "ᬅᬂᬓᬭ"],
  ["sang hyang", "ᬲᬂ ᬳ᭄ᬬᬂ"],
  ["dharma.", "ᬥᬃᬫ᭟"],
  ["nyama", "ᬜᬫ"],
  ["kitab 12", "ᬓᬶᬢᬩ᭄ ᭑᭒"],
];
let bad = 0;
for (const [i, want] of cases) {
  const got = latinToBali(i);
  if (got !== want) { bad++; console.log(`✗ ${i}: dapat ${got} (${[...got].map((c) => c.codePointAt(0).toString(16))}) harapan ${want}`); }
  else console.log(`✓ ${i} -> ${got}`);
}
process.exit(bad ? 1 : 0);
