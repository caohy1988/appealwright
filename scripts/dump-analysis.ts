import { SUBJECTS } from "../src/lib/seed";
import { analyzeSubject } from "../src/lib/agent";
const id = process.argv[2] ?? "juanita-132nd";
const s = SUBJECTS.find((x) => x.id === id)!;
process.stdout.write(JSON.stringify({ analysis: analyzeSubject(s) }));
