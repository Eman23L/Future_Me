// Writes a supporting statement for one NHS job, for free, on her device.
// It reads the job's person specification, finds the sentences in her own previous statement
// and notes that best evidence each criterion, and assembles them into a tailored statement.
// It only ever uses her own words for anything about her; the few linking sentences it adds
// are about the job, never claims about her. Gaps become [prompts] for her to fill.

export type WriterProfile = { previousStatement: string; aboutMe: string; alwaysMention: string };
export type WriterJob = { title: string; employer: string; speciality?: string; text: string };

export type Criterion = { text: string; essential: boolean; category: Category };
export type CriterionResult = Criterion & { covered: boolean };
export type WriterResult = { statement: string; criteria: CriterionResult[]; values: string[] };

type Category = "qualifications" | "experience" | "skills" | "knowledge" | "other";

// ---------- themes ----------
// Each theme is recognised in both the person spec and her sentences.
const THEMES: Record<string, RegExp> = {
  communication: /communicat|interpersonal|listen|explain|verbal|written|rapport|handover|reassur|conversation/i,
  teamwork: /team|multidisciplinary|\bmdt\b|colleague|collaborat|work(ing)? together|independent(ly)?/i,
  compassion: /compassion|empath|kind|dignity|respect|caring|care for|person[- ]cent|patient[- ]cent|holistic|emotional|support(ing|ed)? (women|patients|families|parents)/i,
  standards: /standard|quality|safe(ty)?|governance|polic(y|ies)|guideline|protocol|best practice|infection|escalat|challenge|unacceptable|raise concern|speak(ing)? up/i,
  audit: /audit|research|evidence[- ]based|literature|quality improvement|\bqi\b|review/i,
  learning: /learn|develop|training|\bcpd\b|continuing professional|course|study|stud(ent|ying)|msc|degree|qualif|preceptor|competenc|reflect/i,
  leadership: /\blead|mentor|supervis|teach|educat|delegat|coordinat|in charge/i,
  organisation: /prioriti|workload|time management|organis|pressure|busy|independent(ly)?|manage my own|deadlines?/i,
  clinical: /observation|venepunctur|cannul|\becg|medicat|drug|wound|assessment|deteriorat|news2?|clinical skills|point[- ]of[- ]care|catheter|bloods|vital signs/i,
  safeguarding: /safeguard|vulnerab|protect/i,
  diversity: /diversit|inclusi|equalit|culture|background/i,
  digital: /computer|\bit\b|digital|electronic|system|software|record(s|ing)?|documentation/i,
  registration: /\bnmc\b|registration|registered|\brn\b|\brm\b|nurse qualification|midwi(fe|very) qualification|pin\b/i,
  flexibility: /flexib|adapt|positive|resilien|enthusias|motivat/i,
  maternity: /midwi|maternity|antenatal|postnatal|labour|birth|pregnan|newborn|nipe/i,
  neonatal: /neonat|nicu|special care baby|premature|newborn/i,
  mentalHealth: /mental health|psychiatr|dementia|anxiety|wellbeing/i,
  gynaecology: /gyn(a)?ecolog|women'?s health|miscarriage|pregnancy loss/i,
  community: /community|district|home visit/i,
  acute: /acute|emergency|a&e|critical care|\bicu\b|\bitu\b|theatre|surgical|medical ward|endoscop|cardiac|stroke|amu/i,
  olderPeople: /older (people|adults|patients)|elderly|geriatric|frailty|dementia/i
};

const GENERIC = new Set(
  "a an and are as at be been being but by can could do for from has have i in into is it its me my of on or our that the their them they this to was we were which will with work working ability able experience experienced skills skill knowledge understanding good excellent demonstrate demonstrable evidence relevant appropriate including within area areas all any also other e g eg etc".split(" ")
);

function stem(word: string) {
  let w = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const suffix of ["ations", "ation", "ments", "ment", "ings", "ing", "ies", "ed", "es", "ly", "s"]) {
    if (w.length > suffix.length + 3 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  // Word families share a start: communicate / communication / communicating.
  return w.slice(0, 7);
}

const tokens = (text: string) => new Set(text.split(/\s+/).map(stem).filter((w) => w.length > 2 && !GENERIC.has(w)));
const themesOf = (text: string) => new Set(Object.keys(THEMES).filter((key) => THEMES[key].test(text)));

// ---------- reading the job ----------
const STOP_HEADINGS = /^(documents to download|further details|recruitment information|using ai|apply online|to stay up to date|applicant requirements|working for our organisation|detailed job description)/i;

export function readPersonSpec(text: string): Criterion[] {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const start = lines.findIndex((line) => /^person specification/i.test(line));
  const from = start >= 0 ? start + 1 : lines.findIndex((line) => /^essential( criteria)?$/i.test(line));
  if (from < 0) return [];
  const criteria: Criterion[] = [];
  let essential = true;
  let category: Category = "other";
  for (const line of lines.slice(from)) {
    if (STOP_HEADINGS.test(line)) break;
    if (/^essential( criteria)?:?$/i.test(line)) { essential = true; continue; }
    if (/^desirable( criteria)?:?$/i.test(line)) { essential = false; continue; }
    if (/^(qualifications?( and training)?|education)$/i.test(line)) { category = "qualifications"; continue; }
    if (/^experience$/i.test(line)) { category = "experience"; continue; }
    if (/^(skills?( and abilities)?|abilities)$/i.test(line)) { category = "skills"; continue; }
    if (/^knowledge$/i.test(line)) { category = "knowledge"; continue; }
    if (/^(additional|other|personal (qualities|attributes)|values|disposition)/i.test(line) && line.split(" ").length <= 3) { category = "other"; continue; }
    if (line.length < 6 || line.length > 220) continue;
    criteria.push({ text: line.replace(/^[•\-–*]\s*/, ""), essential, category });
  }
  return criteria.slice(0, 40);
}

export function readValues(text: string): string[] {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const index = lines.findIndex((line) => /\bvalues\b/i.test(line) && line.length < 200);
  if (index < 0) return [];
  const values: string[] = [];
  for (const line of lines.slice(index + 1, index + 8)) {
    const words = line.split(/\s+/).length;
    if (words > 6 || /[.:]$/.test(line)) break;
    values.push(line.replace(/^[•\-–*]\s*/, ""));
  }
  return values.length >= 2 ? values.slice(0, 6) : [];
}

// ---------- her sentences ----------
type Sentence = { text: string; tokens: Set<string>; themes: Set<string>; order: number };

function splitSentences(text: string) {
  return text
    .replace(/\r/g, "")
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z"'‘“])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= 5);
}

// Sentences written about a different job ("this role", "a unit I already know") don't carry over.
const ABOUT_OLD_JOB = /\b(this|the) (role|post|position|vacancy|opportunity|unit I|preceptorship programme)\b|\bI already know\b|\bfrom the inside\b/i;

function herSentences(profile: WriterProfile): Sentence[] {
  const source = [profile.aboutMe, profile.previousStatement].join("\n");
  const seen = new Set<string>();
  return splitSentences(source)
    .filter((text) => !ABOUT_OLD_JOB.test(text))
    .map((text) => (/[.!?]$/.test(text) ? text : `${text}.`))
    .filter((text) => {
      const key = text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((text, order) => ({ text, tokens: tokens(text), themes: themesOf(text), order }));
}

function themeHits(theme: string, text: string) {
  const pattern = new RegExp(THEMES[theme].source, "gi");
  return (text.match(pattern) ?? []).length;
}

function score(criterion: { tokens: Set<string>; themes: Set<string> }, sentence: Sentence) {
  let value = 0;
  for (const theme of criterion.themes) {
    if (sentence.themes.has(theme)) value += 3 + Math.min(themeHits(theme, sentence.text) - 1, 2);
  }
  for (const word of criterion.tokens) if (sentence.tokens.has(word)) value += 2;
  return value;
}

// ---------- writing ----------
const shortEmployer = (employer: string) =>
  employer.replace(/\s*(NHS Foundation Trust|NHS Trust|University Health Board|Health Board|Foundation Trust)\s*$/i, "").trim() || employer;

const possessive = (name: string) => (/s$/i.test(name) ? `${name}'` : `${name}'s`);

function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const CATEGORY_ORDER: Category[] = ["experience", "skills", "knowledge", "qualifications", "other"];
const OPENERS: Partial<Record<Category, string>> = {
  experience: "My clinical experience so far has given me a strong foundation for this post.",
  skills: "Good communication and teamwork are at the heart of safe, compassionate care.",
  knowledge: "Keeping my practice evidence-based and up to date matters a great deal to me."
};

export function writeStatement(job: WriterJob, profile: WriterProfile): WriterResult {
  const sentences = herSentences(profile);
  const criteria = readPersonSpec(job.text);
  const values = readValues(job.text);
  const used = new Set<number>();
  const byCategory = new Map<Category, Sentence[]>();
  const results: CriterionResult[] = [];
  const gaps: Criterion[] = [];

  // Group each sentence with others about the same thing, so paragraphs read naturally.
  const take = (sentence: Sentence, _criterionCategory: Category) => {
    const handsOn = /\b(placement|worked|working on|cared for|nursed|since \d{4})\b/i.test(sentence.text);
    const category: Category = handsOn
      ? "experience"
      : /audit|research|evidence|training|study|course|cpd|learn|qualif|degree|msc/i.test(sentence.text)
      ? "knowledge"
      : sentence.themes.has("communication") || sentence.themes.has("standards") || (sentence.themes.has("teamwork") && !/\b(placement|ward)\b/i.test(sentence.text))
        ? "skills"
        : "experience";
    used.add(sentence.order);
    byCategory.set(category, [...(byCategory.get(category) ?? []), sentence]);
  };

  // "Experience in the relevant speciality" means this job's speciality.
  const jobArea = `${job.title} ${job.speciality ?? ""}`;
  const targets = criteria.map((criterion) => {
    const text = /relevant (speciality|specialty|area|field|setting)|this (area|speciality|specialty)|the speciality/i.test(criterion.text)
      ? `${criterion.text} ${jobArea}`
      : criterion.text;
    const target = { tokens: tokens(text), themes: themesOf(text) };
    const ranked = sentences
      .map((sentence) => ({ sentence, value: score(target, sentence) }))
      .filter(({ value }) => value >= 3)
      .sort((a, b) => b.value - a.value || a.sentence.order - b.sentence.order);
    return { criterion, ranked };
  });

  // Essential criteria first; among them, the ones with fewest matching sentences pick first,
  // so a sentence that fits only one criterion isn't taken by another.
  const assignOrder = [...targets].sort((a, b) =>
    Number(b.criterion.essential) - Number(a.criterion.essential) || a.ranked.length - b.ranked.length
  );
  const coveredBy = new Map<Criterion, boolean>();
  for (const { criterion, ranked } of assignOrder) {
    const fresh = ranked.find(({ sentence }) => !used.has(sentence.order));
    if (fresh) take(fresh.sentence, criterion.category);
    // Also counts as covered when its best match is already in the statement.
    coveredBy.set(criterion, Boolean(fresh) || Boolean(ranked[0] && used.has(ranked[0].sentence.order) && ranked[0].value >= 5));
  }
  for (const { criterion } of targets) {
    const covered = coveredBy.get(criterion) ?? false;
    results.push({ ...criterion, covered });
    if (!covered && criterion.essential) gaps.push(criterion);
  }

  // With no person spec on the advert, fall back to the themes every nursing/midwifery post looks for.
  if (!criteria.length) {
    const jobThemes = themesOf(`${job.title} ${job.speciality ?? ""} ${job.text.slice(0, 6000)}`);
    for (const theme of ["communication", "teamwork", "compassion", "clinical", "standards", "learning", ...jobThemes]) {
      const best = sentences.filter((sentence) => !used.has(sentence.order) && sentence.themes.has(theme)).sort((a, b) => a.order - b.order)[0];
      if (best) take(best, theme === "learning" ? "knowledge" : theme === "clinical" ? "experience" : "skills");
    }
  }

  const employer = job.employer || "your organisation";
  const short = shortEmployer(employer);
  const paragraphs: string[] = [];

  // Opening: the job, then why she cares (her words).
  // "Staff Nurse - Endoscopy" → "Endoscopy"; otherwise the advert's speciality.
  const titleArea = job.title.includes(" - ") ? job.title.split(" - ").slice(1).join(" - ").trim() : "";
  const speciality = (titleArea && titleArea.split(/\s+/).length <= 4 ? titleArea : job.speciality || "").trim();
  const specialityThemes = themesOf(`${job.title} ${speciality}`);
  const specialitySentence = sentences.find((sentence) => !used.has(sentence.order) && [...specialityThemes].some((theme) => sentence.themes.has(theme)));
  const motivation = sentences.find((sentence) => !used.has(sentence.order) && sentence !== specialitySentence && /\b(passion|passionate|drive|drives|love|rewarding|meaningful|matters|motivat|privilege|always wanted)\b/i.test(sentence.text));
  const opening = [`I am delighted to apply for the post of ${job.title} at ${employer}.`];
  if (specialitySentence) { opening.push(specialitySentence.text); used.add(specialitySentence.order); }
  else if (speciality) opening.push(`I am keen to develop my practice in ${/^[A-Z][a-z]/.test(speciality) && !/^[A-Z]{2,}/.test(speciality) ? speciality.toLowerCase() : speciality} and to contribute to the care your team provides.`);
  if (motivation) { opening.push(motivation.text); used.add(motivation.order); }
  paragraphs.push(opening.join(" "));

  // Evidence, grouped like the person specification.
  let prompts = 0;
  for (const category of CATEGORY_ORDER) {
    const picked = (byCategory.get(category) ?? []).sort((a, b) => a.order - b.order);
    const categoryGaps = gaps.filter((gap) => gap.category === category && (category === "experience" || category === "skills" || category === "knowledge"));
    if (!picked.length && !categoryGaps.length) continue;
    const parts: string[] = [];
    if (picked.length && OPENERS[category]) parts.push(OPENERS[category] as string);
    parts.push(...picked.map((sentence) => sentence.text));
    for (const gap of categoryGaps) {
      if (prompts >= 3) break;
      parts.push(`[Add an example showing: ${gap.text.replace(/\.$/, "").toLowerCase()}]`);
      prompts += 1;
    }
    // Long groups read better as two paragraphs.
    if (parts.length > 6) {
      paragraphs.push(parts.slice(0, Math.ceil(parts.length / 2)).join(" "));
      paragraphs.push(parts.slice(Math.ceil(parts.length / 2)).join(" "));
    } else {
      paragraphs.push(parts.join(" "));
    }
  }

  // Values: name the trust's values, backed by her own words about caring.
  const caring = sentences.find((sentence) => !used.has(sentence.order) && sentence.themes.has("compassion"));
  if (values.length || caring) {
    const valuesParagraph: string[] = [];
    if (values.length) valuesParagraph.push(`${possessive(short)} values of ${listJoin(values.map((value) => value.replace(/\.$/, "")))} reflect the kind of professional I want to be.`);
    if (caring) { valuesParagraph.push(caring.text); used.add(caring.order); }
    paragraphs.push(valuesParagraph.join(" "));
  }

  if (profile.alwaysMention.trim()) paragraphs.push(profile.alwaysMention.trim());

  paragraphs.push(`Thank you for taking the time to consider my application. I would welcome the opportunity to bring my skills, care and enthusiasm to the team at ${short}.`);

  return {
    statement: paragraphs.filter(Boolean).join("\n\n"),
    criteria: results,
    values
  };
}
