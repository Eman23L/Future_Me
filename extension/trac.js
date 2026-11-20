// FutureMe on Trac: fills in an application she approved in FutureMe, section by section,
// and stops before Submit. It never presses Submit and never touches the sign-in page.
// Anything it doesn't know yet, it asks her once on the page and remembers next time.

(() => {
  if (window.__futuremeTrac) return;
  window.__futuremeTrac = true;

  const SLOW = 700; // pause between steps so Trac's own scripts keep up, like a person would
  const MAX_STEPS = 150;
  let application = null; // { vacancyId, title, employer, statement }
  let memory = {}; // remembered answers: normalised question -> answer
  let paused = false;
  let running = false;
  let waitingForHer = null; // fields she's been asked to fill
  let steps = 0;
  let prescreenTries = 0;

  // ---------- helpers ----------
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const text = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
  const visible = (el) => Boolean(el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
  const normalise = (label) => label.replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 240);

  function send(type, payload) {
    try {
      return chrome.runtime.sendMessage({ type, payload });
    } catch {
      return Promise.resolve(null);
    }
  }

  function clickables(root = document) {
    return [...root.querySelectorAll("button, a, [role=button], input[type=button], input[type=submit]")].filter(visible);
  }

  function findButton(pattern, root = document) {
    return clickables(root).find((el) => pattern.test(text(el) || el.value || ""));
  }

  const isDisabled = (el) =>
    el.disabled || el.getAttribute("aria-disabled") === "true" || /\bdisabled\b/i.test(el.className || "");

  // A description of the page (button and question names only, never her answers) to send Emmanuel.
  function pageReport() {
    const buttons = clickables().map((el) => `${el.tagName.toLowerCase()}${isDisabled(el) ? " (disabled)" : ""}: ${(text(el) || el.value || "").slice(0, 60)}`);
    const fields = [...document.querySelectorAll("input, textarea, select")]
      .filter((field) => visible(field) && field.type !== "hidden")
      .map((field) => `${field.tagName.toLowerCase()}[${field.type || ""}]: ${labelFor(field).slice(0, 80)}`);
    const headings = [...document.querySelectorAll("h1, h2, h3, h4, legend")].filter(visible).map((el) => text(el).slice(0, 80));
    return JSON.stringify({ url: location.pathname, kind: pageKind(), headings, buttons: buttons.slice(0, 80), fields: fields.slice(0, 60) }, null, 1);
  }

  function reportButton() {
    return {
      label: "Copy details for Emmanuel",
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(pageReport());
          showPanel("Copied. Paste it in a message to Emmanuel. It only has the page's button and question names, not your answers.", { tone: "help", actions: [carryOnButton()] });
        } catch {
          showPanel("Couldn't copy. Take a screenshot instead.", { tone: "help", actions: [carryOnButton()] });
        }
      }
    };
  }

  function safeClick(el) {
    const label = text(el) || el.value || "";
    // The one thing it must never do.
    if (/\bsubmit\b/i.test(label) && !/mark section/i.test(label)) throw new Error("Refusing to press Submit");
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.click();
  }

  async function waitUntilIdle() {
    // Trac shows "Loading, please wait…" while it saves.
    for (let i = 0; i < 40; i += 1) {
      await sleep(250);
      const loading = [...document.querySelectorAll("body *")].some(
        (el) => el.childElementCount === 0 && /loading, please wait/i.test(text(el)) && visible(el)
      );
      if (!loading) break;
    }
    await sleep(SLOW);
  }

  function setValue(field, value) {
    const proto = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
      : field instanceof HTMLSelectElement ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter ? setter.call(field, value) : (field.value = value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    field.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function labelFor(field) {
    if (field.id) {
      const label = document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
      if (label && text(label)) return text(label);
    }
    const labelledBy = field.getAttribute("aria-labelledby");
    if (labelledBy) {
      const label = labelledBy.split(/\s+/).map((id) => text(document.getElementById(id))).join(" ").trim();
      if (label) return label;
    }
    if (field.getAttribute("aria-label")) return field.getAttribute("aria-label");
    const wrapping = field.closest("label");
    if (wrapping && text(wrapping)) return text(wrapping);
    const fieldset = field.closest("fieldset");
    const legend = fieldset?.querySelector("legend");
    if (legend && text(legend)) return text(legend);
    // Fall back to the nearest heading-like text before the field.
    let node = field;
    for (let i = 0; i < 6 && node; i += 1) {
      let prev = node.previousElementSibling;
      while (prev) {
        const value = text(prev);
        if (value && value.length < 300) return value;
        prev = prev.previousElementSibling;
      }
      node = node.parentElement;
    }
    return field.name || "";
  }

  function groupLabel(radio) {
    const fieldset = radio.closest("fieldset");
    const legend = fieldset?.querySelector("legend");
    if (legend && text(legend)) return text(legend);
    const group = radio.closest("[role=radiogroup]");
    if (group?.getAttribute("aria-labelledby")) {
      return text(document.getElementById(group.getAttribute("aria-labelledby")));
    }
    // Real Trac pages often put the question in a plain element before the options: take the
    // nearest earlier text that reads like a question ("…?", "… *", "Choose…", "Please select…").
    let node = radio;
    for (let depth = 0; depth < 7 && node; depth += 1) {
      for (let prev = node.previousElementSibling; prev; prev = prev.previousElementSibling) {
        if (prev.querySelector && prev.querySelector("input[type=radio]")) continue;
        const value = text(prev);
        if (value && value.length <= 250 && /\?|\*|^(choose|select|please (select|indicate|choose|confirm))/i.test(value)) return value;
      }
      node = node.parentElement;
    }
    return labelFor(radio.closest("[role=radiogroup], fieldset") || radio);
  }

  function optionLabel(radio) {
    if (radio.id) {
      const label = document.querySelector(`label[for="${CSS.escape(radio.id)}"]`);
      if (label) return text(label);
    }
    return text(radio.closest("label")) || radio.value;
  }

  const OWN_TRUST = /^are you (currently )?(an )?employee of (?!any other)(.+)\?$/;
  const generalKey = (key) => (OWN_TRUST.test(key) ? "are you currently an employee of this trust?" : null);
  const recall = (question) => {
    const key = normalise(question);
    if (memory[key] !== undefined) return memory[key];
    const general = generalKey(key);
    if (!general) return undefined;
    if (memory[general] !== undefined) return memory[general];
    // Answers saved before this existed: a "No" for any other trust counts too.
    return Object.entries(memory).some(([saved, value]) => OWN_TRUST.test(saved) && /^no$/i.test(value)) ? "No" : undefined;
  };
  // Tick boxes that are agreements ("I have read and agree…") must never be remembered as "no".
  const isAgreement = (label) => /i (have read|agree|confirm|declare|understand|accept)/i.test(label);

  const isSupportingStatement = (label) => /supporting information|supporting statement|personal statement/i.test(label);

  // ---------- panel ----------
  let panel;
  function showPanel(message, { tone = "busy", actions = [] } = {}) {
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "futureme-panel";
      document.documentElement.appendChild(panel);
    }
    panel.dataset.tone = tone;
    panel.innerHTML = "";
    const title = document.createElement("strong");
    title.textContent = "FutureMe";
    const body = document.createElement("p");
    body.textContent = message;
    panel.append(title, body);
    if (actions.length) {
      const row = document.createElement("div");
      row.className = "futureme-actions";
      for (const action of actions) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = action.label;
        button.addEventListener("click", action.onClick);
        row.appendChild(button);
      }
      panel.appendChild(row);
    }
  }

  function pauseButton() {
    return { label: "Pause", onClick: () => { paused = true; showPanel("Paused. Nothing more will be filled in.", { tone: "help", actions: [carryOnButton()] }); } };
  }

  function carryOnButton() {
    return { label: "Carry on", onClick: () => { paused = false; resumeAfterHelp(); run(); } };
  }

  // ---------- filling one open form ----------
  // Returns the fields it couldn't fill (required and unknown).
  function fillForm(container) {
    const unknown = [];
    const fields = [...container.querySelectorAll("input, textarea, select")].filter(
      (field) => visible(field) && !field.disabled && !field.readOnly && !["hidden", "submit", "button", "file", "search", "password"].includes(field.type)
    );
    const radioGroupsDone = new Set();

    for (const field of fields) {
      if (field.type === "radio") {
        if (radioGroupsDone.has(field.name)) continue;
        radioGroupsDone.add(field.name);
        const group = fields.filter((item) => item.type === "radio" && item.name === field.name);
        if (group.some((item) => item.checked)) continue; // already answered (e.g. copied from her last application)
        const question = groupLabel(field);
        const answer = recall(question);
        const match = answer && group.find((item) => normalise(optionLabel(item)) === normalise(answer));
        if (match) match.click();
        else unknown.push({ field, question, kind: "radio", group });
        continue;
      }

      const label = labelFor(field);
      if (field instanceof HTMLTextAreaElement && isSupportingStatement(label) && application?.statement) {
        setValue(field, application.statement);
        continue;
      }
      if (field.type === "checkbox") {
        let answer = recall(label);
        if (answer === "no" && isAgreement(label)) answer = undefined; // ask again rather than leave it unticked
        if (answer === "yes" && !field.checked) field.click();
        else if (answer === "no" && field.checked) field.click();
        else if (answer === undefined && !field.checked && (field.required || /\*/.test(label) || isAgreement(label))) {
          unknown.push({ field, question: label, kind: "checkbox" });
        }
        continue;
      }
      if (String(field.value || "").trim()) continue; // already filled (copied from her last application)
      const answer = recall(label);
      if (answer !== undefined && answer !== "") {
        if (field instanceof HTMLSelectElement) {
          const option = [...field.options].find((item) => normalise(item.textContent || "") === normalise(answer) || item.value === answer);
          if (option) { setValue(field, option.value); continue; }
        } else {
          setValue(field, answer);
          continue;
        }
      }
      const required = field.required || field.getAttribute("aria-required") === "true" || /\*/.test(label);
      if (required) unknown.push({ field, question: label, kind: "field" });
    }
    return unknown;
  }

  function askHer(unknown) {
    waitingForHer = unknown;
    unknown.forEach(({ field, group }) => {
      (group || [field]).forEach((item) => item.classList.add("futureme-needs-you"));
    });
    unknown[0].field.scrollIntoView({ block: "center", behavior: "smooth" });
    const names = unknown.map((item) => `• ${item.question.replace(/\*/g, "").trim().slice(0, 90)}`).join("\n");
    showPanel(
      `I don't know ${unknown.length === 1 ? "this answer" : "these answers"} yet. Please fill ${unknown.length === 1 ? "it" : "them"} in (highlighted), then press Carry on. I'll remember for next time.\n${names}`,
      { tone: "help", actions: [carryOnButton()] }
    );
  }

  // Learn what she filled in, so it's automatic next time.
  async function resumeAfterHelp() {
    if (!waitingForHer) return;
    const learned = {};
    for (const item of waitingForHer) {
      (item.group || [item.field]).forEach((el) => el.classList.remove("futureme-needs-you"));
      if (item.kind === "checkbox") {
        if (item.field.checked) learned[normalise(item.question)] = "yes";
        else if (!isAgreement(item.question)) learned[normalise(item.question)] = "no";
      } else if (item.kind === "radio") {
        const chosen = item.group.find((radio) => radio.checked);
        if (chosen) learned[normalise(item.question)] = optionLabel(chosen);
      } else if (item.field instanceof HTMLSelectElement) {
        const option = item.field.selectedOptions[0];
        if (option && item.field.value) learned[normalise(item.question)] = text(option);
      } else if (String(item.field.value || "").trim()) {
        learned[normalise(item.question)] = item.field.value.trim();
      }
    }
    waitingForHer = null;
    for (const [key, value] of Object.entries(learned)) {
      const general = generalKey(key);
      if (general && /^no$/i.test(value)) learned[general] = value;
    }
    if (Object.keys(learned).length) {
      memory = { ...memory, ...learned };
      await send("saveAnswers", learned);
    }
  }

  // ---------- page steps ----------
  function pageKind() {
    const body = text(document.body);
    if (document.querySelector("input[type=password]") || /one[- ]time passcode|verification code|enter (the|your) passcode/i.test(body)) return "sign-in";
    if (/application (has been|was) (successfully )?submitted|thank you for (submitting|your application)/i.test(body)) return "submitted";
    if (findButton(/^continue draft$/i)) return "draft";
    if (findButton(/^launch application$/i)) return "start";
    if (findButton(/^continue$/i) && document.querySelector("select, input[type=radio], input[type=checkbox]") && /start your application|following questions|immigration status|privacy notice/i.test(body)) return "prescreen";
    if (findButton(/mark section as complete|^save & next$|^edit section$/i)) return "form";
    return "other";
  }

  async function step() {
    const kind = pageKind();

    if (kind === "sign-in") {
      showPanel("Please sign in to Trac (email, password and the passcode they email you). I'll carry on after that.", { tone: "help" });
      return "stop";
    }

    if (kind === "submitted") {
      showPanel("Application submitted. Well done! 🎉", { tone: "done" });
      await send("applicationStatus", { vacancyId: application?.vacancyId, status: "submitted" });
      return "stop";
    }

    if (kind === "draft") {
      showPanel("Opening your draft for this job…", { actions: [pauseButton()] });
      safeClick(findButton(/^continue draft$/i));
      await waitUntilIdle();
      return "continue";
    }

    if (kind === "start") {
      showPanel("Starting from your most recent application…", { actions: [pauseButton()] });
      const recent = [...document.querySelectorAll("label, [role=radio], input[type=radio]")].find((el) =>
        /use a recent application/i.test(text(el) || text(el.closest("label")) || "")
      );
      if (recent) {
        recent.click();
        await sleep(SLOW);
      }
      safeClick(findButton(/^launch application$/i));
      await waitUntilIdle();
      return "continue";
    }

    if (kind === "prescreen") {
      showPanel("Answering the questions before your application…", { actions: [pauseButton()] });
      const button = findButton(/^continue$/i);
      const container = button.closest("form") || document.querySelector("main") || document.body;
      const unknown = fillForm(container);
      if (prescreenTries > 0 && /please correct the errors|must be answered|is required/i.test(text(document.body))) {
        // Trac rejected it: add every field sitting next to an error message.
        const flagged = [...container.querySelectorAll("*")]
          .filter((el) => el.childElementCount === 0 && /must be answered|is required|please (select|enter|complete)/i.test(text(el)) && visible(el))
          .map((message) => {
            let box = message.parentElement;
            while (box && box !== container && !box.querySelector("input:not([type=hidden]), select, textarea")) box = box.parentElement;
            return box && box !== container ? box.querySelector("input:not([type=hidden]), select, textarea") : null;
          })
          .filter((field) => field && !unknown.some((item) => item.field === field));
        for (const field of flagged) {
          if (field.type === "radio") {
            const group = [...container.querySelectorAll(`input[type=radio][name="${CSS.escape(field.name)}"]`)];
            unknown.push({ field, question: groupLabel(field), kind: "radio", group });
          } else {
            unknown.push({ field, question: labelFor(field), kind: field.type === "checkbox" ? "checkbox" : "field" });
          }
        }
        if (!unknown.length) {
          showPanel("Trac says something here needs answering. Please fill in the parts marked in red, then press Carry on.", { tone: "help", actions: [carryOnButton(), reportButton()] });
          prescreenTries = 0;
          return "stop";
        }
      }
      if (unknown.length) { prescreenTries = 0; askHer(unknown); return "stop"; }
      prescreenTries += 1;
      await sleep(SLOW);
      safeClick(button);
      await waitUntilIdle();
      return "continue";
    }

    if (kind !== "form") {
      showPanel("I'm not sure what to do on this page. If it's part of your application, fill it in and press Carry on.", { tone: "help", actions: [carryOnButton(), reportButton()] });
      return "stop";
    }

    // Pop-ups Trac shows after saving.
    const fixNow = findButton(/^fix now$/i);
    if (fixNow) {
      safeClick(fixNow);
      await waitUntilIdle();
      const form = openForm();
      const unknown = form ? fillForm(form) : [];
      if (unknown.length) { askHer(unknown); return "stop"; }
      showPanel("Trac says something on this page needs fixing. Please check the highlighted part, then press Carry on.", { tone: "help", actions: [carryOnButton(), reportButton()] });
      return "stop";
    }
    const closePopup = [...document.querySelectorAll("body *")].some(
      (el) => el.childElementCount === 0 && /completed the questions in this section/i.test(text(el)) && visible(el)
    ) && findButton(/^close$/i);
    if (closePopup) {
      safeClick(closePopup);
      await waitUntilIdle();
      return "continue";
    }

    // A question form is open: fill it and save.
    const form = openForm();
    if (form) {
      showPanel("Filling in your answers…", { actions: [pauseButton()] });
      const unknown = fillForm(form);
      if (unknown.length) { askHer(unknown); return "stop"; }
      await sleep(SLOW);
      const next = findButton(/^save & next$/i, form) || findButton(/^save$/i, form);
      safeClick(next);
      await waitUntilIdle();
      return "continue";
    }

    // Work down the page: an enabled "Mark section as complete" before the next "Open" belongs to a
    // section that's finished, so mark it; otherwise open the next unanswered question.
    const openers = clickables().filter((el) => /^open$/i.test(text(el)));
    const markers = clickables().filter((el) => /mark section as complete/i.test(text(el)) && !isDisabled(el));
    const nextOpener = openers[0];
    const readyMarker = markers.find((marker) => !nextOpener || (marker.compareDocumentPosition(nextOpener) & Node.DOCUMENT_POSITION_FOLLOWING));
    if (readyMarker) {
      showPanel("Marking this section complete…", { actions: [pauseButton()] });
      safeClick(readyMarker);
      await waitUntilIdle();
      return "continue";
    }
    if (nextOpener) {
      showPanel("Going through your application…", { actions: [pauseButton()] });
      safeClick(nextOpener);
      await waitUntilIdle();
      return "continue";
    }
    const stuck = clickables().some((el) => /mark section as complete/i.test(text(el)) && isDisabled(el));
    if (stuck) {
      showPanel("A section can't be marked complete yet. Please have a look for anything unanswered, then press Carry on.", { tone: "help", actions: [carryOnButton(), reportButton()] });
      return "stop";
    }
    showPanel("All done! Please read through your application, then press Submit yourself. 💖", { tone: "done" });
    await send("applicationStatus", { vacancyId: application?.vacancyId, status: "ready" });
    return "stop";
  }

  function openForm() {
    const save = findButton(/^save & next$/i);
    if (!save) return null;
    // The smallest ancestor of the Save & next button that also holds an input.
    let node = save.parentElement;
    while (node && node !== document.body && !node.querySelector("input:not([type=hidden]), textarea, select")) node = node.parentElement;
    return node || null;
  }

  async function run() {
    if (running || !application) return;
    running = true;
    try {
      while (!paused && steps < MAX_STEPS) {
        steps += 1;
        const result = await step();
        if (result === "stop") break;
      }
      if (steps >= MAX_STEPS) showPanel("I've stopped to be safe. Please check the page and carry on yourself.", { tone: "help", actions: [reportButton()] });
    } catch (error) {
      showPanel(`I stopped: ${error.message}. You can carry on by hand.`, { tone: "help", actions: [carryOnButton(), reportButton()] });
    } finally {
      running = false;
    }
  }

  // ---------- start ----------
  (async () => {
    const state = await send("getApplicationForTab", { url: location.href });
    if (!state?.application) return; // she opened Trac herself; stay out of the way
    application = state.application;
    memory = state.answers || {};
    await sleep(SLOW);
    run();
  })();
})();
