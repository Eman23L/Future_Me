// Plain-English meanings for common NHS person-specification criteria, with an idea of the
// kind of example that shows it. Used next to each criterion in the checklist.

export type CriterionHelp = { meaning: string; idea: string };

const HELP: Array<[RegExp, CriterionHelp]> = [
  [/national|regional|local.*(nhs|health)|nhs (issues|agenda|priorities|plan)|current (nhs|health ?care) (issues|developments)/i, {
    meaning: "Knowing what's happening in the NHS right now and how it affects patients and staff: e.g. the NHS Long Term Workforce Plan, waiting lists, staffing shortages, the move to care in the community, and what this trust or area is focusing on.",
    idea: "Mention something current you know about and how it shows up on the ward, e.g. \"I'm aware of pressures on bed capacity, and on placement I saw how timely discharge planning helped flow.\""
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
  [/prioriti|time management|manage (own |my )?workload|organis/i, {
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

export function explainCriterion(text: string): CriterionHelp | null {
  for (const [pattern, help] of HELP) if (pattern.test(text)) return help;
  return null;
}
