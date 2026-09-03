import { SUBJECTS } from "../src/lib/seed";
import { analyzeSubject } from "../src/lib/agent";
import { composeLetter, validateLetter } from "../src/lib/letter";
for (const s of SUBJECTS) {
  const a = analyzeSubject(s);
  console.log(s.id, "assessed", s.assessedValue, "indicated", a.indicatedValue, "over%", a.overAssessedPct.toFixed(1), "rec", a.recommendation, "radius", a.searchRadiusMi, "comps", a.comps.map(c=>c.id+"@"+c.distanceMi.toFixed(1)+"="+c.adjustedPrice).join(" "));
}
const l = composeLetter(analyzeSubject(SUBJECTS[0]));
console.log("missing:", validateLetter(l, analyzeSubject(SUBJECTS[0])));
console.log(l.slice(0, 1500));
