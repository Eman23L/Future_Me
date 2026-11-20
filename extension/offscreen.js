// Parses fetched HealthJobsUK HTML (service workers have no DOMParser).
// The site's own scripts and inline handlers (onclick=…) are stripped first: they're not needed to
// read the jobs, and Chrome logs a security warning for each one it sees inside an extension page.
function withoutScripts(html) {
  return String(html || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "")
    .replace(/<(iframe|object|embed|link|meta)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src|action)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "")
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, "");
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen") return false;
  const doc = new DOMParser().parseFromString(withoutScripts(message.html), "text/html");
  if (message.type === "parse-list") sendResponse(parseJobList(doc, message.baseUrl));
  else if (message.type === "parse-job") sendResponse(parseJobPage(doc, message.baseUrl));
  else sendResponse(null);
  return false;
});
