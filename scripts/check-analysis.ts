import { SUBJECTS } from "../src/lib/seed";
import { analyzeSubject, inputHash } from "../src/lib/agent";
import { composeLetter, validateLetter } from "../src/lib/letter";
for (const s of SUBJECTS) {
  const a = analyzeSubject(s);
  const missing = validateLetter(composeLetter(a), a);
  console.log(s.id, "assessed", s.assessedValue, "indicated", a.indicatedValue, "over%", a.overAssessedPct.toFixed(1), "rec", a.recommendation, "comps", a.comps.length, "hash", inputHash(a), "composer-missing", missing.length ? missing : "none");
}
const s0 = SUBJECTS[0];
const base = analyzeSubject(s0);
const ex = analyzeSubject(s0, [base.comps[0].id]);
console.log("exclude one:", "comps", ex.comps.length, "excluded", ex.excluded.map((c) => c.id), "indicated", ex.indicatedValue, "hash changed", inputHash(ex) !== inputHash(base));
const tooMany = analyzeSubject(s0, base.comps.map((c) => c.id));
console.log("exclude all → falls back to", tooMany.comps.length, "comps, excluded", tooMany.excluded.length);
