/**
 * Banned words (WEBSITE_PLAN.md section 9): the site makes no claims of any kind.
 *
 * Shared by `scripts/check-content.mjs` (content, dictionaries and site config) and
 * `tests/routes.spec.ts` (the rendered text of every built page). Each rule is a regular
 * expression with the `u` and `i` flags; word boundaries keep "effective" / "efectiv" and
 * "frecvente" (frequent) out while catching "effects" / "efecte" and "frecvență" (frequency).
 *
 * Document-type labels the plan itself prescribes ("studiu clinic", "clinical study") are allowed.
 */

/** @type {{ label: string; re: RegExp }[]} */
export const BANNED_WORDS = [
  // Claim verbs and nouns, Romanian
  { label: 'ro: a vindeca', re: /\bvindec\w*/giu },
  {
    label: 'ro: a trata / tratament',
    re: /\btrat(?:ez|ezi|ează|ăm|ați|at[ăe]?|ați|ând|are|area|ării|ament\w*)\b/giu,
  },
  { label: 'ro: a preveni / prevenție', re: /\bprev(?:in|en)\w*/giu },
  { label: 'ro: a ameliora', re: /\bamelior\w*/giu },
  { label: 'ro: a regenera', re: /\bregener\w*/giu },
  { label: 'ro: terapie / terapeutic', re: /\bterap\w*/giu },
  { label: 'ro: beneficii', re: /\bbenefic\w*/giu },
  { label: 'ro: efecte', re: /\befect(?:e|ul|ele|elor|ului)?\b/giu },
  { label: 'ro: imunitate', re: /\bimun\w*/giu },
  { label: 'ro: stres', re: /\bstres\w*/giu },
  { label: 'ro: durere', re: /\bdurer\w*/giu },
  { label: 'ro: îmbătrânire', re: /\b[îi]mb[ăa]tr[âa]n\w*/giu },
  { label: 'ro: echilibru', re: /\bechilibr\w*/giu },
  { label: 'ro: revitalizare', re: /\brevitaliz\w*/giu },
  { label: 'ro: sănătate', re: /\bs[ăa]n[ăa]t\w*/giu },
  // Claim verbs and nouns, English
  { label: 'en: cure', re: /\bcur(?:e|es|ed|ing)\b/giu },
  { label: 'en: heal / health', re: /\bheal\w*/giu },
  { label: 'en: treat / treatment', re: /\btreat(?:s|ed|ing|able|ment\w*)?\b/giu },
  { label: 'en: prevent', re: /\bprevent\w*/giu },
  { label: 'en: alleviate / relieve', re: /\b(?:alleviat|reliev)\w*|\brelief\b/giu },
  { label: 'en: regenerate', re: /\bregenerat\w*/giu },
  { label: 'en: therapy / therapeutic', re: /\btherap\w*/giu },
  { label: 'en: benefit', re: /\bbenefit\w*/giu },
  { label: 'en: effects', re: /\beffects?\b/giu },
  { label: 'en: immunity', re: /\bimmun\w*/giu },
  { label: 'en: stress', re: /\bstress\w*/giu },
  { label: 'en: pain', re: /\bpain(?:s|ful|less)?\b/giu },
  { label: 'en: ageing', re: /\b(?:anti-)?ag(?:e)?ing\b/giu },
  { label: 'en: balance', re: /\bbalanc\w*/giu },
  { label: 'en: revitalise', re: /\brevitali[sz]\w*/giu },
  // Effect words shared by both languages
  { label: 'relaxare / relaxation', re: /\brelax\w*/giu },
  { label: 'detox', re: /\bdetox\w*/giu },
  // Claim vocabulary from the owner's flyers, both languages
  { label: 'toxins', re: /\btoxin\w*/giu },
  { label: 'DNA', re: /\b(?:ADN|DNA)\w*/gu },
  { label: 'rejuvenation', re: /\b(?:[îi]ntiner\w*|rejuvenat\w*)/giu },
  { label: 'oxygenation', re: /\b(?:oxigen\w*|oxygen\w*)/giu },
  { label: 'circulation', re: /\b(?:circula[țt]i\w*|circulat(?:ion|ory)\w*)/giu },
  { label: 'cellular', re: /\b(?:celul(?:ar|e|ă|el)\w*|cellular\w*)/giu },
  // Medical vocabulary, both languages
  { label: 'medical vocabulary: medic*', re: /\bmedic\w*/giu },
  { label: 'medical vocabulary: patient', re: /\b(?:pacien[tț]\w*|patient\w*)/giu },
  { label: 'medical vocabulary: symptom', re: /\b(?:simptom\w*|symptom\w*)/giu },
  { label: 'medical vocabulary: diagnosis', re: /\bdiagnos\w*/giu },
  // How the technology is marketed. The name "EESystem" itself is allowed (owner decision,
  // 2026-11-02): the site may name the sessions, but not explain or promote what they do.
  { label: 'technology: scalar', re: /\bscalar\w*/giu },
  { label: 'technology: biophoton', re: /\bbiofoton\w*|\bbiophoton\w*/giu },
  { label: 'technology: energy', re: /\benerg\w*/giu },
  { label: 'technology: frequency', re: /\b(?:frecven[țt][ăa]\w*|frequenc\w*)/giu },
  // Conditions and diseases, both languages
  {
    label: 'disease name',
    re: /\b(?:diabet\w*|cancer\w*|autis\w*|infertil\w*|tumo(?:r|ur)\w*|alzheimer\w*|parkinson\w*|depres\w*|anxi\w*|insomni\w*|artrit\w*|arthrit\w*|artroz\w*|arthros\w*|covid\w*|fibromialg\w*|fibromyalg\w*|migren\w*|migrain\w*|sclero\w*|lupus\w*|astm\w*|asthma\w*|hipertens\w*|hypertens\w*|inflam\w*|infec[țt]\w*|obez\w*|obes\w*|boal[ăa]|boli\b|afec[țt]iun\w*|diseas\w*|illness\w*|disorder\w*|tulbur[ăa]r\w*)\b/giu,
  },
];

/** Every match of every rule in `text`, with its line number (1-based). */
export function findBannedWords(text) {
  const hits = [];
  for (const { label, re } of BANNED_WORDS) {
    for (const m of text.matchAll(re)) {
      hits.push({
        word: m[0],
        label,
        index: m.index,
        line: text.slice(0, m.index).split('\n').length,
      });
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}
