// Checks the free statement writer on a realistic advert and a made-up applicant.
import { addExampleToStatement, cleanJob, composeExample, coverageOf, readPersonSpec, readValues, writeStatement } from "../build-src/jobs/statementWriter.js";

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
// CV bullet points pasted from Word/PDF become clean first-person sentences.
const cv = writeStatement({ title: "Staff Nurse", employer: "Example NHS Trust", text: "Person specification\nEssential criteria\nExcellent communication skills\nAbility to prioritise workload" }, {
  previousStatement: "",
  aboutMe: "\uf0b7 Time Management &amp; Prioritisation: Highly organised, able to manage competing clinical demands and prioritise workload.\n\uf0b7 Communication: Excellent interpersonal and clinical communication skills with patients and families.\n\u2022 Patient-Centred Care: Delivers compassionate, holistic care tailored to individual needs.",
  alwaysMention: ""
});
assert(!/&amp;|\uf0b7|\u2022|Prioritisation:/.test(cv.statement), "pasted CV symbols and headings should be cleaned");
assert(cv.statement.includes("I am highly organised") && cv.statement.includes("I have excellent interpersonal"), `CV lines should become first person: ${cv.statement}`);
// A person spec that's only a PDF: the advert's small print must not become criteria.
const smallPrint = "Person specification\nPlease ensure that you read the Person Specification attached below as your application will be judged against this.\nShould you withdraw your application, you may be required to reimburse the cost of the DBS check.\nDBS checks remain free of charge for volunteer positions.\nThe DBS Code of Practice can be accessed here.";
assert(readPersonSpec(smallPrint).length === 0, "DBS small print must not be read as criteria");
const pdfOnly = writeStatement({ title: "Staff Nurse", employer: "Example NHS Trust", text: smallPrint }, profile);
assert(pdfOnly.usedDefaults && pdfOnly.criteria.length === 6 && !/DBS/.test(JSON.stringify(pdfOnly.criteria)), "PDF-only adverts should use the usual nursing criteria");

// CV structure lines (job headings, dates, place lists, ALL CAPS) are not sentences about her.
const structured = writeStatement({ title: "Staff Nurse", employer: "Example NHS Trust", text: advert }, {
  previousStatement: "Student Nurse - Clinical Placements\nManchester University NHS Foundation Trust | September 2020 - November 2024\nPlacement areas: Neonatal Intensive Care Unit, Liver Clinic, Gynaecology Outpatients\nQUALIFYING IN JAN 2027 FROM MIDWIFERY, NIPE TRAINED, GOOD WITH PATIENTS\nI communicate clearly with patients and families, and I give structured handovers to colleagues using SBAR.",
  aboutMe: "", alwaysMention: ""
});
assert(!/\||Placement areas|QUALIFYING|Clinical Placements/.test(structured.statement), `CV structure lines should be left out: ${structured.statement}`);

// A job saved with the whole card as its title is split back into its parts.
const messy = cleanJob({ title: "Endoscopy Staff Nurse\nNHS AfC: Band 5\nBlackpool Teaching Hospitals NHS Foundation Trust\n, Blackpool\nSpeciality: Endoscopy\nSalary: £32,073 - £39,043 per annum, pro rata", employer: "", location: "", band: "", speciality: "", salary: "", vacancyId: "1", url: "" });
assert(messy.title === "Endoscopy Staff Nurse" && messy.employer === "Blackpool Teaching Hospitals NHS Foundation Trust" && messy.location === "Blackpool" && messy.band === "Band 5" && messy.speciality === "Endoscopy" && messy.salary.startsWith("£32,073"), `job should be tidied: ${JSON.stringify(messy)}`);

// Her added examples are woven in with a lead-in, not pasted as typed.
const woven = composeExample("Ability to challenge unacceptable behaviour or practice in a professional context", "on placement i noticed a colleague not washing hands and i calmly reminded them", "", "Endoscopy");
assert(woven.startsWith("I am able to challenge unacceptable behaviour or practice in a professional context. For example, on placement"), `example should be woven in: ${woven}`);
const speciality = composeExample("Experience in the relevant speciality of which you are applying", "I prepared patients for endoscopy and monitored them afterwards", "For example, x", "Endoscopy");
assert(speciality === "I have experience in endoscopy. For instance, I prepared patients for endoscopy and monitored them afterwards.", `speciality example: ${speciality}`);
const skills = composeExample("Excellent verbal, written and interpersonal communication skills", "Communication: Explaining procedures to anxious patients &amp; families");
assert(skills.startsWith("I have strong verbal, written and interpersonal communication skills. For example,") && !skills.includes("&amp;"), `skills example: ${skills}`);
const placed = addExampleToStatement(result.statement, "Ability to challenge unacceptable behaviour", woven);
const skillsParagraph = placed.split("\n\n").find((paragraph) => paragraph.startsWith("Good communication and teamwork"));
assert(skillsParagraph && skillsParagraph.includes("I am able to challenge"), "example should go into the paragraph about the same topic");
// The checklist re-checks the statement as it is now (after her edits or Claude's version).
const edited = `I am delighted to apply for the post of Endoscopy Staff Nurse. I am fluent and confident in using IT systems such as HIVE and Epic to access and update electronic patient records. I am trained in basic life support including recognising cardiac arrest and using an external defibrillator.
I have good time management and organisational skills with the ability to prioritise tasks and manage competing workloads. I am confident in communicating opinions, concerns and professional decisions clearly and respectfully, and I am able to speak up for patients and challenge concerns appropriately. I make informed decisions using clinical knowledge and professional judgement, and I think creatively to find practical solutions.`;
const listed = ["Basic IT skills", "Good management of time", "Assertiveness", "Decision maker/Problem solver", "Basic Life Support", "Ability to prioritise", "Experience of team and ward management"].map((text) => ({ text, essential: true, category: "skills" }));
const live = coverageOf(edited, listed, "Endoscopy");
const status = Object.fromEntries(live.map((item) => [item.text, item.covered]));
for (const text of listed.slice(0, 6).map((item) => item.text)) assert(status[text], `"${text}" should show as covered once it's in the statement`);
assert(!status["Experience of team and ward management"], "things not in the statement should still show as missing");
assert(!coverageOf("Good communication and teamwork are at the heart of safe, compassionate care. Thank you for taking the time to consider my application.", [{ text: "Excellent communication skills", essential: true, category: "skills" }])[0].covered, "FutureMe's own linking lines don't count as evidence");
assert(!coverageOf("I would love to do it and make it work for it.", [{ text: "Basic IT skills", essential: true, category: "skills" }])[0].covered, "the word 'it' is not IT skills");
// With no values on the advert, the closing caring sentence is introduced, not left on its own.
const noValues = writeStatement({ title: "Staff Nurse", employer: "Example NHS Trust", text: "Person specification\nEssential criteria\nExcellent communication skills" }, { previousStatement: "I communicate clearly with patients and families every day.\nCaring for patients with dignity and compassion is what drives me every day.", aboutMe: "", alwaysMention: "" });
assert(/Above all, caring for patients with dignity|Caring for patients with dignity/.test(noValues.statement) && !/\n\nCaring for patients with dignity and compassion is what drives me every day\.\n\nThank you/.test(noValues.statement), `lone caring sentence should be introduced: ${noValues.statement}`);
assert(!/I am caring for patients with dignity and compassion is/.test(noValues.statement), "full sentences must not get 'I am' added");
// Section headings aren't criteria; hyphenated "multi-disciplinary" counts as teamwork.
const headed = readPersonSpec("Person specification\nSkills Abilities & Knowledge\nEssential criteria\nEvidence of multi-disciplinary/multiagency working\nExperience & Knowledge\nDesirable criteria\nInvolvement with IQP");
assert(headed.map((c) => c.text).join("|") === "Evidence of multi-disciplinary/multiagency working|Involvement with IQP", `headings should be skipped: ${headed.map((c) => c.text).join("|")}`);
assert(coverageOf("I worked with physios, OTs and social workers as part of the multi-disciplinary team to plan a safe discharge.", headed, "")[0].covered, "multi-disciplinary example should count");
console.log("\nStatement checks passed.");
