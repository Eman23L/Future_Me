// On HealthJobsUK search results: offer to use this search for FutureMe's daily job list,
// and pass along any jobs on the page straight away.
(() => {
  if (!/job_list/i.test(location.pathname)) return;
  const jobs = parseJobList(document, location.href);
  if (!jobs.length) return;
  chrome.runtime.sendMessage({ type: "jobsSeen", payload: { jobs, url: location.href } });

  chrome.runtime.sendMessage({ type: "getSettings" }).then((settings) => {
    if (settings?.searchUrl === location.href) return;
    const bar = document.createElement("div");
    bar.id = "futureme-panel";
    bar.innerHTML = "<strong>FutureMe</strong><p>Use this search for your daily FutureMe job list?</p><div class=\"futureme-actions\"><button type=\"button\" data-yes>Yes, use it</button><button type=\"button\" data-no>Not now</button></div>";
    const style = document.createElement("style");
    style.textContent = "#futureme-panel{position:fixed;right:18px;bottom:18px;z-index:2147483647;width:min(340px,calc(100vw - 36px));padding:16px 18px;border:1px solid #f1c7d3;border-radius:22px;background:#fff;box-shadow:0 18px 44px rgba(116,75,88,.22);color:#3a2b31;font:15px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}#futureme-panel strong{display:block;color:#a8456b;font-size:13px}#futureme-panel p{margin:4px 0 0}#futureme-panel .futureme-actions{display:flex;gap:8px;margin-top:12px}#futureme-panel button{flex:1;min-height:40px;border:0;border-radius:999px;background:linear-gradient(135deg,#e07a9b,#c45a85);color:#fff;font-weight:700;cursor:pointer}#futureme-panel button[data-no]{background:#f6e9ee;color:#a8456b}";
    document.head.appendChild(style);
    document.body.appendChild(bar);
    bar.querySelector("[data-yes]").addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "saveSettings", payload: { searchUrl: location.href } });
      bar.querySelector("p").textContent = "Done! FutureMe will check this search every day while Chrome is open.";
      bar.querySelector(".futureme-actions").remove();
      setTimeout(() => bar.remove(), 4000);
    });
    bar.querySelector("[data-no]").addEventListener("click", () => bar.remove());
  });
})();
