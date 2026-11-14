// Lets the FutureMe web app talk to this extension (only on FutureMe's own site).
(() => {
  const VERSION = chrome.runtime.getManifest().version;
  document.documentElement.dataset.futuremeHelper = VERSION;

  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.data?.source !== "futureme-page") return;
    const { id, type, payload } = event.data;
    let reply;
    try {
      const result = await chrome.runtime.sendMessage({ type, payload, fromFutureMe: true });
      reply = result?.error ? { ok: false, error: result.error } : { ok: true, result };
    } catch (error) {
      reply = { ok: false, error: String(error?.message || error) };
    }
    window.postMessage({ source: "futureme-extension", id, ...reply }, location.origin);
  });

  // Updates pushed from the extension (e.g. "application submitted").
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.push) window.postMessage({ source: "futureme-extension", push: message.push, result: message.payload }, location.origin);
  });

  window.postMessage({ source: "futureme-extension", push: "ready", result: { version: VERSION } }, location.origin);
})();
