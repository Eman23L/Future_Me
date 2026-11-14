// Parses fetched HealthJobsUK HTML (service workers have no DOMParser).
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen") return false;
  const doc = new DOMParser().parseFromString(message.html, "text/html");
  if (message.type === "parse-list") sendResponse(parseJobList(doc, message.baseUrl));
  else if (message.type === "parse-job") sendResponse(parseJobPage(doc, message.baseUrl));
  else sendResponse(null);
  return false;
});
