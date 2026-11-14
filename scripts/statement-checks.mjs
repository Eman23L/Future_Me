// Checks the free statement writer on a realistic advert and a made-up applicant.
import { readPersonSpec, readValues, writeStatement } from "../build-src/jobs/statementWriter.js";

const advert = `Staff Nurse - Endoscopy
Working for our organisation
We have a strong, recognised track record in staff engagement and in living our values:
People at the Heart
Listen and Involve
Kind and Respectful
ONE Team
We are committed to placing patients at the heart of every decision.
Person specification
Skills
Essential criteria
Excellent verbal, written and interpersonal communication skills
Ability to maintain and improve standards of care
Ability to challenge unacceptable behaviour or practice in a professional context
Desirable criteria
Basic computer skills
Experience
Essential criteria
Experience in the relevant speciality of which you are applying
Experience of working independently and as a member of a team
Desirable criteria
Post Qualification Experience
Experience of Audit research
Experience of clinical supervision
Qualifications
Essential criteria
RN
Recent evidence of continuing professional development
Knowledge
Essential criteria
Up to date knowledge of current clinical and professional Endoscopy issues
Knowledge of evidence based practice
Additional
Essential criteria
Flexible and positive approach to work
Documents to download
Job Description (PDF)`;

const profile = {
  previousStatement: `I qualified as an adult nurse in 2024 and have worked on a busy surgical ward since then. I am now excited to begin my career in this role on a unit I already know.
On placement in day surgery I cared for patients before and after endoscopy procedures, explaining what to expect and monitoring their recovery.
I communicate clearly with patients and families, and I give structured handovers to colleagues using SBAR.
I enjoy working as part of a multidisciplinary team, and I also manage my own workload independently on night shifts.
I completed a hand hygiene audit on my ward and shared the results at our team meeting, which improved compliance.
I always follow infection control guidelines and I have raised concerns when I saw practice that was not safe.
Caring for patients with dignity and compassion is what drives me every day.
I recently completed training in sedation monitoring and keep my practice up to date through study days.`,
  aboutMe: "",
  alwaysMention: ""
};

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const spec = readPersonSpec(advert);
assert(spec.length === 13, `expected 13 criteria, got ${spec.length}: ${spec.map((c) => c.text).join(" | ")}`);
assert(spec.find((c) => c.text.startsWith("Basic computer")).essential === false, "desirable criteria should be marked");
assert(spec.find((c) => c.text.startsWith("Knowledge of evidence")).category === "knowledge", "categories should be read");
assert(readValues(advert).join(",") === "People at the Heart,Listen and Involve,Kind and Respectful,ONE Team", "values should be read");

const result = writeStatement({ title: "Staff Nurse - Endoscopy", employer: "Wrightington, Wigan and Leigh Teaching Hospitals NHS Foundation Trust", speciality: "Medicine", text: advert }, profile);
const s = result.statement;
assert(s.startsWith("I am delighted to apply for the post of Staff Nurse - Endoscopy at Wrightington"), "should open with the job");
assert(!/unit I already know|this role/i.test(s), "sentences about her old job must not carry over");
assert(s.includes("hand hygiene audit") && s.includes("SBAR") && s.includes("endoscopy procedures"), "should use her matching examples");
assert(s.includes("People at the Heart, Listen and Involve, Kind and Respectful and ONE Team"), "should name the trust's values");
const sentencesOf = (text) => text.split(/(?<=[.!?])\s+/);
const herSentences = sentencesOf(profile.previousStatement.replace(/\n/g, " "));
for (const sentence of sentencesOf(s)) {
  const repeats = sentencesOf(s).filter((other) => other === sentence).length;
  assert(repeats === 1, `sentence repeated: ${sentence}`);
}
assert(herSentences.filter((h) => s.includes(h)).length >= 6, "most of her relevant sentences should be used");
const covered = result.criteria.filter((c) => c.essential && c.covered).length;
assert(covered >= 7, `expected most essential criteria covered, got ${covered}`);
console.log(s);
console.log("\n" + result.criteria.map((c) => `${c.covered ? "✓" : "○"} ${c.essential ? "E" : "D"} ${c.text}`).join("\n"));

// Thin profile: essential gaps become [prompts]; no person spec still gives a sensible statement.
const thin = writeStatement({ title: "Staff Nurse", employer: "Example NHS Trust", text: advert }, { previousStatement: "Caring for patients with dignity and compassion is what drives me every day.", aboutMe: "", alwaysMention: "" });
assert(/\[Add an example showing: /.test(thin.statement), "gaps should become prompts");
const noSpec = writeStatement({ title: "Staff Nurse", employer: "Example NHS Trust", text: "A busy ward looking for a caring nurse." }, profile);
assert(noSpec.statement.includes("SBAR") && !/\[Add/.test(noSpec.statement), "without a person spec it should still use her strengths");
console.log("\nStatement checks passed.");
