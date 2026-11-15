// Reads HealthJobsUK pages. Shared by the offscreen parser (daily refresh) and the
// HealthJobsUK content script. Works from link patterns and visible text rather than
// exact page markup, so small site changes don't break it.

/* exported parseJobList, parseJobPage */

const JOB_LINK = /\/job\/[^?#]*-v(\d+)/i;

function cleanText(value) {
  return (value || "").replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
}

const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "BR", "DD", "DIV", "DL", "DT", "FIELDSET", "FIGURE", "FOOTER",
  "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION",
  "TABLE", "TBODY", "TD", "TH", "THEAD", "TR", "UL"
]);

// Visible-ish text split into lines. Doesn't rely on innerText, which needs a rendered page
// (the offscreen parser's documents are never rendered).
function linesOf(element) {
  const parts = [];
  const walk = (node) => {
    if (node.nodeType === 3) { parts.push(node.nodeValue); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEMPLATE") return;
    const block = BLOCK_TAGS.has(tag);
    if (block) parts.push("\n");
    for (const child of node.childNodes) walk(child);
    if (block) parts.push("\n");
  };
  walk(element);
  return parts.join("").split("\n").map(cleanText).filter(Boolean);
}

function afterLabel(lines, label) {
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(new RegExp(`^${label}\\s*:?\\s*(.*)$`, "i"));
    if (!match) continue;
    if (match[1]) return cleanText(match[1]);
    if (lines[index + 1]) return lines[index + 1];
  }
  return "";
}

// The smallest ancestor that holds one whole job: it contains this job's link and no other job's.
function jobContainer(link, vacancyId) {
  let node = link;
  for (let depth = 0; depth < 8 && node.parentElement; depth += 1) {
    const parent = node.parentElement;
    const ids = new Set(
      [...parent.querySelectorAll("a[href]")]
        .map((a) => (a.getAttribute("href") || "").match(JOB_LINK)?.[1])
        .filter(Boolean)
    );
    if (ids.size > 1 || (ids.size === 1 && !ids.has(vacancyId))) return node;
    node = parent;
  }
  return node;
}

// Links like "More" or "Read more" aren't job titles.
const GENERIC_LINK = /^(more|more\.{3}|read more|see more|find out more|view|view job|details|apply( now| online)?|click here|here|next|previous|\d+)$/i;

function inFeaturedBox(link) {
  // HealthJobsUK's "Featured jobs" sidebar lists jobs from any sector; only the search results count.
  for (let node = link.parentElement, depth = 0; node && depth < 10; node = node.parentElement, depth += 1) {
    const heading = node.querySelector("h1, h2, h3, h4, strong, .title, [class*=heading]");
    if (heading && /featured jobs?/i.test(heading.textContent || "") && node.contains(link) && node.querySelectorAll("a[href]").length < 40) return true;
  }
  return false;
}

function parseJobList(doc, baseUrl) {
  const jobs = new Map();
  for (const link of doc.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href") || "";
    const match = href.match(JOB_LINK);
    if (!match) continue;
    const vacancyId = match[1];
    if (jobs.has(vacancyId) || inFeaturedBox(link)) continue;
    const linkTitle = linesOf(link)[0] || "";
    if (!linkTitle || GENERIC_LINK.test(linkTitle)) continue;
    const container = jobContainer(link, vacancyId);
    const lines = linesOf(container);
    // Search results always show a salary or band; anything else is a stray link.
    if (!/salary|band\s*\d|£/i.test(lines.join(" "))) continue;
    // On HealthJobsUK the whole job card can be one link, so take only its first line as the title.
    const title = linkTitle;
    const titleIndex = lines.findIndex((line) => line.includes(title));
    const employerLine = lines.find((line, index) =>
      index > titleIndex && !/^(Speciality|Salary|Band|NHS AfC)/i.test(line) && !/Band\s*\d/i.test(line) && line !== lines[titleIndex]
    ) || "";
    let [employer, location] = employerLine.split(/\s+,\s+|,\s+(?=[^,]+$)/);
    const nextLine = lines[lines.indexOf(employerLine) + 1] || "";
    if (!location && nextLine.startsWith(",")) location = nextLine.replace(/^,\s*/, "");
    const bandMatch = lines.join(" ").match(/(?:NHS AfC:\s*)?Band\s*\d+[a-z]?(?:\s*[-/]\s*\d+)?/i);
    jobs.set(vacancyId, {
      vacancyId,
      title,
      employer: cleanText(employer),
      location: cleanText(location),
      speciality: afterLabel(lines, "Speciality"),
      salary: afterLabel(lines, "Salary"),
      band: bandMatch ? cleanText(bandMatch[0].replace(/^NHS AfC:\s*/i, "")) : "",
      url: new URL(href, baseUrl).href
    });
  }
  return [...jobs.values()];
}

function parseJobPage(doc, baseUrl) {
  const main = doc.querySelector("main") || doc.body;
  const lines = linesOf(main);
  const applyLink = [...doc.querySelectorAll("a[href]")].find((a) =>
    /apply online/i.test(a.textContent || "") || /apps\.trac\.jobs\/job-advert/i.test(a.getAttribute("href") || "")
  );
  const closing = lines.join("\n").match(/closing date\s*:?\s*([0-9]{1,2}[\s/-][A-Za-z0-9]{2,9}[\s/-][0-9]{2,4})/i);
  return {
    text: lines.join("\n").slice(0, 40000),
    applyUrl: applyLink ? new URL(applyLink.getAttribute("href"), baseUrl).href : "",
    closingDate: closing ? cleanText(closing[1]) : ""
  };
}
