// Devanagari place names -> Latin, and a spelling-tolerant "skeleton" so that
// पटना ~ Patna, वाराणसी ~ Varanasi, छपरा ~ Chapra, and typos like Muzzafarpur match.

const CONS = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l',
};
const NUKTA = { 'क': 'q', 'ख': 'kh', 'ग': 'g', 'ज': 'z', 'ड': 'r', 'ढ': 'rh', 'फ': 'f', 'य': 'y' };
const VOWELS = { 'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऋ': 'ri' };
const MATRAS = { 'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ृ': 'ri', 'ॉ': 'o', 'ॅ': 'e' };
const PRECOMPOSED_NUKTA = { 'क़': 'q', 'ख़': 'kh', 'ग़': 'g', 'ज़': 'z', 'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f', 'य़': 'y' };

const LABIAL = new Set(['प', 'फ', 'ब', 'भ', 'म']);

// Romanize one word with Hindi schwa deletion (Ohala's rule, right to left):
// an inherent 'a' goes silent in the context  V C _ C V , and at word end.
function romanizeWord(word) {
  const chars = [...word.normalize('NFC')];
  const units = []; // { c: latin consonant(s) or '', v: vowel string, inherent: bool, conjunct: bool }
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    let base = PRECOMPOSED_NUKTA[ch] || CONS[ch];
    if (base) {
      if (chars[i + 1] === '\u093C') { base = NUKTA[ch] || base; i++; }
      const nx = chars[i + 1];
      if (nx === '्') { units.push({ c: base, v: '', inherent: false, halant: true }); i++; continue; }
      if (MATRAS[nx]) { units.push({ c: base, v: MATRAS[nx], inherent: false }); i++; continue; }
      units.push({ c: base, v: 'a', inherent: true, raw: ch });
      continue;
    }
    if (VOWELS[ch]) { units.push({ c: '', v: VOWELS[ch], inherent: false }); continue; }
    if (ch === 'ं' || ch === 'ँ') {
      const next = chars[i + 1];
      units.push({ c: '', v: '', nasal: LABIAL.has(next) ? 'm' : 'n' });
      continue;
    }
    if (ch === 'ः') { units.push({ c: 'h', v: '', inherent: false }); continue; }
  }
  const hasVowel = (u) => !!u && !!u.v;
  // Final schwa.
  for (let k = units.length - 1; k >= 0; k--) {
    if (units[k].nasal !== undefined) continue;
    if (units[k].inherent && k > 0) units[k].v = '';
    break;
  }
  // Medial schwas, right to left, never in the first syllable.
  for (let k = units.length - 2; k >= 1; k--) {
    const u = units[k];
    if (!u.inherent || !u.v) continue;
    const prev = units[k - 1]; const next = units[k + 1];
    if (!hasVowel(prev) || prev.halant) continue;
    if (!next || !next.c || !hasVowel(next)) continue; // needs a following C V
    u.v = '';
  }
  return units.map((u) => (u.nasal !== undefined ? u.nasal : u.c + u.v)).join('');
}

export function romanize(deva) {
  return deva.split(/(\s+)/).map((w) => (/[\u0900-\u097f]/.test(w) ? romanizeWord(w) : w)).join('');
}

// Consonant skeleton: no vowels, no 'h', doubled letters collapsed, common swaps unified.
export function skeleton(latin) {
  return latin.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '')
    .replace(/ph/g, 'f').replace(/w/g, 'v').replace(/z/g, 'j').replace(/q/g, 'k').replace(/f/g, 'p')
    .replace(/[aeiouhy]/g, '')
    .replace(/(.)\1+/g, '$1');
}

// Loose spelling for ranking: vowels kept but not their length, h dropped, doubles collapsed.
export function loose(latin) {
  return latin.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')
    .replace(/ph/g, 'f').replace(/w/g, 'v').replace(/z/g, 'j').replace(/h/g, '').replace(/ee/g, 'i').replace(/oo/g, 'u')
    .replace(/ay(?![aeiou])/g, 'ai').replace(/(.)\1+/g, '$1');
}

export function levenshtein(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}
