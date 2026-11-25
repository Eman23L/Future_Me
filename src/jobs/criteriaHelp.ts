// Plain-English meanings for common NHS person-specification criteria, with an idea of the
// kind of example that shows it. Used next to each criterion in the checklist.

export type CriterionHelp = { meaning: string; idea: string };

const HELP: Array<[RegExp, CriterionHelp]> = [
  [/ward management|manage(ment of)? (a |the )?(team|ward|shift|unit)|in charge|co-?ordinat(e|ing) (the )?(ward|shift)/i, {
    meaning: "Helping run the ward or a shift: organising staff and patients, delegating, and keeping things safe. As a new nurse it's about showing you're starting to build these skills.",
    idea: "A time you coordinated a bay, delegated to an HCA, or helped the nurse in charge."
  }],
  [/proactiv|self[- ]motivat|use (your |own )?initiative/i, {
    meaning: "Spotting what needs doing and doing it before being asked.",
    idea: "A time you noticed something (e.g. a patient's needs, low stock, a missed task) and sorted it."
  }],
  [/teach|peers|mentor|educat(e|ing) (others|staff|students|colleagues)/i, {
    meaning: "Helping others learn: showing students, HCAs or colleagues how to do something, or sharing knowledge.",
    idea: "A time you taught or showed a student or colleague a skill."
  }],
  [/national|regional|local.*(nhs|health)|nhs (issues|agenda|priorities|plan)|current (nhs|health ?care) (issues|developments)/i, {
    meaning: "Knowing what's happening in the NHS right now and how it affects patients and staff: e.g. the NHS Long Term Workforce Plan, waiting lists, staffing shortages, the move to care in the community, and what this trust or area is focusing on.",
    idea: "Mention something current you know about and how it shows up on the ward, e.g. \"I'm aware of pressures on bed capacity, and on placement I saw how timely discharge planning helped flow.\""
  }],
  [/document|record[- ]keeping|note[- ]?keeping/i, {
    meaning: "Writing clear, accurate, timely notes about care, so others can rely on them.",
    idea: "How you keep records up to date and what good documentation looks like to you."
  }],
  [/escalat|deteriorat|news2?|early warning|acutely (ill|unwell)|sepsis/i, {
    meaning: "Spotting when a patient is getting worse and getting help quickly (e.g. using NEWS2).",
    idea: "A time you noticed a change in observations and escalated it."
  }],
  [/risk|health and safety|incident|datix/i, {
    meaning: "Noticing things that could cause harm, reducing them, and reporting incidents.",
    idea: "A risk you spotted (e.g. falls, pressure areas) and what you did about it."
  }],
  [/pressure|stress|calm|demanding|busy|fast[- ]paced/i, {
    meaning: "Staying calm and safe when it's busy or emotionally hard.",
    idea: "A challenging shift and how you stayed organised and calm."
  }],
  [/reliab|punctual|attendance|honest|integrity|trustworth|accountab|professional/i, {
    meaning: "Being dependable, honest and owning your actions, as the NMC Code expects.",
    idea: "How you show reliability and professionalism day to day."
  }],
  [/shift|rota|nights?|weekends?|24[ /-]?hour|unsocial/i, {
    meaning: "Being able to work the shift pattern the role needs (days, nights, weekends).",
    idea: "Say you're happy to work the rota, and any experience of nights or long days."
  }],
  [/family|families|carers?|relatives/i, {
    meaning: "Involving and supporting families and carers as part of the patient's care.",
    idea: "A time you supported or kept a family informed."
  }],
  [/mental health|dementia|learning disabilit|autism|capacity|mca|deprivation of liberty|dols/i, {
    meaning: "Understanding and adapting care for people with mental health needs, dementia or learning disabilities, including consent and capacity.",
    idea: "A time you adapted your approach for someone with these needs."
  }],
  [/child|paediatric|neonat|baby|infant|young people/i, {
    meaning: "Caring for babies, children or young people and supporting their parents.",
    idea: "Placement experience with children or babies and what you did."
  }],
  [/pregnan|antenatal|postnatal|labour|birth|maternity|midwi|women/i, {
    meaning: "Caring for women and babies through pregnancy, birth and after.",
    idea: "Your midwifery or maternity experience and a moment that stood out."
  }],
  [/end of life|palliative|bereave|death|dying/i, {
    meaning: "Caring for people at the end of life and supporting their families.",
    idea: "How you supported a patient or family at the end of life."
  }],
  [/wound|tissue viability|dressing/i, {
    meaning: "Assessing and caring for wounds and preventing pressure damage.",
    idea: "Wound care you've done and how you assessed healing."
  }],
  [/health promotion|educat(e|ing) patients|self[- ]care|wellbeing/i, {
    meaning: "Helping people understand and look after their own health.",
    idea: "Advice or education you gave a patient (e.g. smoking, diet, medicines)."
  }],
  [/reflect/i, {
    meaning: "Thinking back on what happened and what you learned, to keep improving.",
    idea: "A reflection that changed something in your practice."
  }],
  [/nmc|registration|registered (nurse|midwife)|\brn\b|\brm\b|pin\b/i, {
    meaning: "Being on the NMC register (or about to be) and following the NMC Code.",
    idea: "Say when you qualify/registered and that you work to the NMC Code."
  }],
  [/cpd|continuing professional|professional development|willing(ness)? to (learn|undertake|study)|commitment to (learning|training|development)|revalidation/i, {
    meaning: "Keeping your knowledge and skills up to date after qualifying: courses, study days, reading, reflection.",
    idea: "A course or study day you did and how it changed your practice."
  }],
  [/evidence[- ]based|research/i, {
    meaning: "Basing care on up-to-date research and guidelines (e.g. NICE) rather than habit.",
    idea: "A time you used a guideline or research to guide care, or an assignment that changed how you work."
  }],
  [/audit|quality improvement|\bqi\b|service improvement|improv(e|ing) (standards|services|care)/i, {
    meaning: "Checking how well care is done against a standard, and helping make it better.",
    idea: "An audit (e.g. hand hygiene, falls, documentation) you took part in and what changed."
  }],
  [/safeguard/i, {
    meaning: "Spotting and reporting when an adult or child may be at risk of harm or abuse, and following the trust's process.",
    idea: "A time you noticed a concern and escalated it to the right person (no names)."
  }],
  [/challenge|unacceptable|raise concerns|speak(ing)? up|whistle/i, {
    meaning: "Being confident to speak up, respectfully, when something isn't safe or isn't right.",
    idea: "A time you questioned or reported poor practice, and how you did it professionally."
  }],
  [/assertiv/i, {
    meaning: "Stating your view or a patient's needs clearly and confidently, while staying respectful.",
    idea: "A time you advocated for a patient or raised a concern with a senior colleague."
  }],
  [/decision|problem[- ]solv|judg(e)?ment|initiative/i, {
    meaning: "Thinking things through and making sensible choices, and knowing when to ask for help.",
    idea: "A time you noticed a problem (e.g. a deteriorating patient) and decided what to do."
  }],
  [/prioriti|time management|management of time|manag(e|ing) (own |my )?(time|workload)|organis/i, {
    meaning: "Deciding what needs doing first when you're busy, and getting things done safely and on time.",
    idea: "A busy shift where you organised your patients' care and what you did first."
  }],
  [/communicat|interpersonal|listen|verbal|written/i, {
    meaning: "Explaining things clearly, listening well, and writing accurate notes, with patients, families and colleagues.",
    idea: "Explaining a procedure to an anxious patient, or giving a clear SBAR handover."
  }],
  [/team|multidisciplinary|\bmdt\b|work(ing)? independently|collaborat/i, {
    meaning: "Working well with nurses, doctors and other professionals, and also managing your own patients without constant supervision.",
    idea: "Working with the MDT on a patient's care, or managing your own patient group on placement."
  }],
  [/(teach|mentor|supervis|support).*(student|junior|others|colleagues)|clinical supervision|preceptor|practice assessor/i, {
    meaning: "Helping others learn, e.g. supporting students or new staff, or taking part in supervision yourself.",
    idea: "A time you showed a student or HCA how to do something."
  }],
  [/leader|lead|ward management|manage (a |the )?(team|ward|shift)|in charge|delegat/i, {
    meaning: "Taking responsibility for organising others or a shift, delegating tasks safely.",
    idea: "Leading a bay or task, coordinating care, or delegating to an HCA."
  }],
  [/compassion|caring|dignity|respect|person[- ]centred|patient[- ]centred|holistic|empath|kind/i, {
    meaning: "Treating each person as an individual with kindness, dignity and respect, including their wishes and family.",
    idea: "A time you made a difference to how a patient felt, not just their treatment."
  }],
  [/values|behaviours|culture/i, {
    meaning: "Showing the trust's values (usually on their website) in how you work.",
    idea: "Pick one of their values and link it to something you did."
  }],
  [/flexib|adaptab|positive|resilien|enthusias|motivat|change/i, {
    meaning: "Coping well when things change or are under pressure, with a positive attitude.",
    idea: "Adapting to a new ward, shift pattern or unexpected situation."
  }],
  [/\bIT\b|[Cc]omputer|[Dd]igital|[Ee]lectronic|[Ss]ystems|EHR|EPR/, {
    meaning: "Being comfortable using computers and electronic patient records.",
    idea: "Name the systems you've used (e.g. HIVE, EPIC, EMIS) and what for."
  }],
  [/basic life support|\bbls\b|\bils\b|resus/i, {
    meaning: "Being trained to respond to a cardiac arrest (CPR, defibrillator), usually renewed yearly.",
    idea: "Say when you last did BLS/ILS training."
  }],
  [/venepunct|cannul|clinical skills|competenc/i, {
    meaning: "Specific practical skills the role needs, done safely and competently.",
    idea: "Which skills you've been signed off for or practised under supervision."
  }],
  [/medicin|drug|administ/i, {
    meaning: "Giving medicines safely and correctly, including checks and calculations.",
    idea: "How you carry out safe medicine administration on placement."
  }],
  [/infection|ipc/i, {
    meaning: "Preventing the spread of infection: hand hygiene, PPE, isolation.",
    idea: "A time you followed or promoted infection-control practice."
  }],
  [/experience (in|of|with)|relevant (speciality|specialty|area|setting)|post[- ]?qualif/i, {
    meaning: "Time you've spent working or on placement in this kind of area (as a student counts).",
    idea: "A placement or job in a similar area and what you did there."
  }],
  [/degree|diploma|qualification|bsc|msc|educat/i, {
    meaning: "The qualifications you hold or are completing.",
    idea: "Your course, university and when you finish/finished."
  }],
  [/equality|diversit|inclusi/i, {
    meaning: "Treating everyone fairly and respecting different backgrounds, cultures and beliefs.",
    idea: "Adapting care for someone's culture, language or needs."
  }],
  [/confidential|information governance|gdpr|data protection/i, {
    meaning: "Keeping patient information private and only sharing it appropriately.",
    idea: "How you protect patient information in practice."
  }],
  [/driv(e|ing)|car owner|travel/i, {
    meaning: "Being able to travel between sites or homes (often for community roles).",
    idea: "Say if you have a licence/car or how you'd travel."
  }]
];

export function explainCriterion(text: string): CriterionHelp {
  for (const [pattern, help] of HELP) if (pattern.test(text)) return help;
  const plain = text.replace(/\s*\((desirable|essential)\)\s*$/i, "").replace(/\.$/, "").trim();
  const lower = plain.charAt(0).toLowerCase() + plain.slice(1);
  if (/^(knowledge|understanding|awareness)\b/i.test(plain)) {
    return { meaning: `They want to know you understand ${lower.replace(/^(knowledge|understanding|awareness)( of)?\s*/i, "") || "this area"} and use it in your work.`, idea: "Say what you know about it and one time you used that knowledge with a patient." };
  }
  if (/^(experience|evidence|previous|proven|demonstrable)\b/i.test(plain)) {
    return { meaning: `They want proof you've done this before: "${plain}". Placements as a student count.`, idea: "Describe one real time: where you were, what you did, and how it went." };
  }
  if (/^(able|ability|capable|skill|skilled|competent)/i.test(plain)) {
    return { meaning: `A practical ability they need you to have: "${plain}".`, idea: "Give a short example of you doing it: the situation, what you did, the result." };
  }
  if (/(qualif|degree|diploma|certificate|training|course)/i.test(plain)) {
    return { meaning: `A qualification or training they ask for: "${plain}".`, idea: "Say if you have it (and when), or that you're working towards it." };
  }
  return { meaning: `A quality or requirement they're looking for: "${plain}". If you can honestly show it, add a sentence about it.`, idea: "Think of one real time it applied: what happened, what you did, and what you learned." };
}
