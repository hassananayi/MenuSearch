// ─────────────────────────────────────────────────────────────────────────────
// i18n
// ─────────────────────────────────────────────────────────────────────────────
let i18nStrings = {};
const LANG_URL  = lang => chrome.runtime.getURL(`lang/${lang}.json`);

async function loadLang(lang) {
  let loaded = false;
  try {
    const res = await fetch(LANG_URL(lang));
    if (res.ok) { i18nStrings = await res.json(); loaded = true; }
  } catch {}

  // Fallback to English if the requested lang file is missing
  if (!loaded && lang !== "en") {
    try {
      const res = await fetch(LANG_URL("en"));
      if (res.ok) i18nStrings = await res.json();
    } catch { i18nStrings = {}; }
  }

  // Always apply even if strings are empty (will keep original text)
  applyI18n();
  // Re-apply target labels in the dropdowns using translated strings
  applyTargetOptions();
}

/** Translate a key → string, with an optional hard-coded fallback */
function t(key, fallback) {
  return i18nStrings[key] || fallback || key;
}

/** Apply all data-i18n / data-i18n-html / data-i18n-placeholder attributes */
function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const v = t(el.dataset.i18n);
    if (v !== el.dataset.i18n) el.textContent = v; // only replace if key exists
  });
  document.querySelectorAll("[data-i18n-html]").forEach(el => {
    const v = t(el.dataset.i18nHtml);
    if (v !== el.dataset.i18nHtml) el.innerHTML = v;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const v = t(el.dataset.i18nPlaceholder);
    if (v !== el.dataset.i18nPlaceholder) el.placeholder = v;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings  (theme + lang)
// ─────────────────────────────────────────────────────────────────────────────
let currentSettings = { theme: "light", lang: "en" };

function getSettings() {
  return new Promise(res =>
    chrome.storage.local.get(["settings"], d => res(d.settings || { theme: "light", lang: "en" }))
  );
}
function saveSettings(s) {
  return new Promise(res => chrome.storage.local.set({ settings: s }, res));
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelectorAll(".seg-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.themeVal === theme)
  );
}

// Theme buttons
document.querySelectorAll(".seg-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const theme = btn.dataset.themeVal;
    applyTheme(theme);
    currentSettings.theme = theme;
    await saveSettings(currentSettings);
    showToast(t("toast_settings_saved", "Settings saved"), "success");
  });
});

// Language selector
const langSelect = document.getElementById("langSelect");
langSelect.addEventListener("change", async () => {
  currentSettings.lang = langSelect.value;
  await saveSettings(currentSettings);
  await loadLang(currentSettings.lang);
  loadEngines();
  showToast(t("toast_settings_saved", "Settings saved"), "success");
});

// ─────────────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
const toast = document.getElementById("toast");
let toastTimer;
function showToast(msg, type = "") {
  toast.textContent = msg;
  toast.className   = "toast show" + (type ? " " + type : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = "toast"; }, 2400);
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────────────────────────────────────────
function getEngines() {
  return new Promise(res => chrome.storage.local.get(["engines"], d => res(d.engines || [])));
}
function setEngines(engines) {
  return new Promise(res => chrome.storage.local.set({ engines }, res));
}

// ─────────────────────────────────────────────────────────────────────────────
// Logo resolution
// ─────────────────────────────────────────────────────────────────────────────
let _libraryForLogo = null;

async function resolveLogoForUrl(url) {
  if (!_libraryForLogo) {
    try {
      const res  = await fetch(chrome.runtime.getURL("library.json"));
      _libraryForLogo = res.ok ? await res.json() : [];
    } catch { _libraryForLogo = []; }
  }
  try {
    const parsed   = new URL(url.includes("://") ? url : "https://" + url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    for (const entry of _libraryForLogo) {
      try {
        const eHost = new URL(entry.url).hostname.replace(/^www\./, "");
        if (eHost === hostname && entry.logo) return entry.logo;
      } catch {}
    }
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return "engines/default.webp";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function targetLabel(v) {
  return v === "same_tab" ? t("target_same_tab", "Same Tab")
       :                    t("target_new_tab",   "New Tab");
}
function targetIcon(v) {
  return v === "same_tab" ? "↩" : "🗗";
}

/** Re-render <option> text in both target selects with current i18n strings */
function applyTargetOptions() {
  document.querySelectorAll(".field-select[id$='TargetSelect'], #targetSelect").forEach(sel => {
    sel.querySelectorAll("option").forEach(opt => {
      if (opt.value === "new_tab")  opt.textContent = "🗗 " + t("target_new_tab",  "New Tab");
      if (opt.value === "same_tab") opt.textContent = "↩ " + t("target_same_tab", "Same Tab");
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Render engine list
// ─────────────────────────────────────────────────────────────────────────────
const engineList = document.getElementById("engineList");

async function loadEngines() {
  const engines = await getEngines();
  engineList.innerHTML = "";

  if (!engines.length) {
    engineList.innerHTML = `<div class="empty-state">
      <div class="icon">🔍</div>
      ${t("empty_state", "No engines yet. Add one!")}
    </div>`;
    return;
  }

  engines.forEach((engine, index) => {
    const div = document.createElement("div");

    // ── Separator ──
    if (engine.separator) {
      div.className   = "engine-item is-separator";
      div.dataset.index = index;
      div.innerHTML   = `
        <span class="drag-handle">⠿</span>
        <span class="separator-label">─── ${t("separator_label", "separator")} ───</span>
        <div class="engine-actions">
          <button class="icon-btn del" data-index="${index}" title="${t("remove","Remove")}">✕</button>
        </div>`;
      div.querySelector(".del").addEventListener("click", e => {
        e.stopPropagation();
        removeEngine(parseInt(e.currentTarget.dataset.index));
      });
      engineList.appendChild(div);
      return;
    }

    // ── Normal / Group engine ──
    const isGroup = Array.isArray(engine.urls) && engine.urls.length > 1;
    div.className   = "engine-item" + (isGroup ? " is-group" : "");
    div.dataset.index = index;

    const logoHtml = isGroup
      ? `<span style="font-size:17px;flex-shrink:0;">📁</span>`
      : `<img class="engine-logo" src="${escHtml(engine.logo || "engines/default.webp")}" alt="" onerror="this.src='engines/default.webp'">`;

    const primaryUrl = isGroup ? engine.urls[0] : (engine.url || "");

    let badges = "";
    if (isGroup) {
      badges += `<span class="engine-badge badge-group">📁 ${engine.urls.length} URLs</span>`;
    }
    if (engine.target && engine.target !== "new_tab") {
      badges += `<span class="engine-badge badge-target">${targetIcon(engine.target)} ${targetLabel(engine.target)}</span>`;
    }
    if (engine.shortcut) {
      badges += `<span class="engine-badge badge-shortcut">⌨ ${escHtml(engine.shortcut)}</span>`;
    }

    div.innerHTML = `
      <span class="drag-handle">⠿</span>
      ${logoHtml}
      <div class="engine-info">
        <div class="engine-name">${escHtml(engine.name)}</div>
        <div class="engine-meta">
          <span class="engine-url">${escHtml(primaryUrl)}</span>
          ${badges}
        </div>
      </div>
      <div class="engine-actions">
        <button class="icon-btn edit" data-index="${index}" title="${t("edit","Edit")}">✏</button>
        <button class="icon-btn del"  data-index="${index}" title="${t("remove","Remove")}">✕</button>
      </div>`;

    div.querySelector(".edit").addEventListener("click", e => {
      e.stopPropagation();
      openEditModal(parseInt(e.currentTarget.dataset.index));
    });
    div.querySelector(".del").addEventListener("click", e => {
      e.stopPropagation();
      removeEngine(parseInt(e.currentTarget.dataset.index));
    });

    engineList.appendChild(div);
  });

  initPointerDrag();
}

// ─────────────────────────────────────────────────────────────────────────────
// URL-row builder (shared by Add + Edit panels)
// ─────────────────────────────────────────────────────────────────────────────
function makeUrlRow(value, container) {
  const row     = document.createElement("div");
  row.className = "url-row";

  const inp        = document.createElement("input");
  inp.className    = "input";
  inp.type         = "text";
  inp.placeholder  = "https://example.com/search?q=";
  inp.setAttribute("data-url-input", "");
  inp.value        = value || "";
  row.appendChild(inp);

  // Remove button — shown only when container has > 1 row
  const rm        = document.createElement("button");
  rm.className    = "url-row-remove";
  rm.title        = t("remove_url", "Remove URL");
  rm.textContent  = "✕";
  rm.style.display = "none";
  rm.addEventListener("click", () => {
    row.remove();
    syncRemoveBtns(container);
  });
  row.appendChild(rm);

  return row;
}

function syncRemoveBtns(container) {
  const rows = container.querySelectorAll(".url-row");
  rows.forEach(r => {
    const btn = r.querySelector(".url-row-remove");
    if (btn) btn.style.display = rows.length > 1 ? "" : "none";
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Shortcut capture helper
// ─────────────────────────────────────────────────────────────────────────────
function attachShortcutCapture(inputEl, clearBtn) {
  inputEl.addEventListener("keydown", e => {
    e.preventDefault();
    e.stopPropagation();
    const parts = [];
    if (e.ctrlKey)  parts.push("Ctrl");
    if (e.altKey)   parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    if (e.metaKey)  parts.push("Meta");
    if (!["Control","Alt","Shift","Meta"].includes(e.key)) {
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    }
    // Require at least one modifier + one non-modifier key
    const modCount = [e.ctrlKey, e.altKey, e.shiftKey, e.metaKey].filter(Boolean).length;
    if (modCount > 0 && parts.length > modCount) {
      inputEl.value = parts.join("+");
      clearBtn.classList.add("visible");
    }
  });
  clearBtn.addEventListener("click", () => {
    inputEl.value = "";
    clearBtn.classList.remove("visible");
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Engine tab
// ─────────────────────────────────────────────────────────────────────────────
const nameInput     = document.getElementById("nameInput");
const urlRows       = document.getElementById("urlRows");
const addUrlRowBtn  = document.getElementById("addUrlRowBtn");
const targetSelect  = document.getElementById("targetSelect");
const shortcutInput = document.getElementById("shortcutInput");
const shortcutClear = document.getElementById("shortcutClear");
const addEngineBtn  = document.getElementById("addEngineBtn");
const addSepBtn     = document.getElementById("addSepBtn");

shortcutClear.classList.remove("visible");
attachShortcutCapture(shortcutInput, shortcutClear);

addUrlRowBtn.addEventListener("click", () => {
  const row = makeUrlRow("", urlRows);
  urlRows.appendChild(row);
  syncRemoveBtns(urlRows);
  row.querySelector("input").focus();
});

async function addEngine() {
  const name = nameInput.value.trim();
  const urls = [...urlRows.querySelectorAll("[data-url-input]")]
    .map(el => el.value.trim()).filter(Boolean);

  if (!name) { showToast(t("toast_fill_fields","Please fill all fields"), "error"); return; }
  if (!urls.length) { showToast(t("toast_fill_fields","Please fill all fields"), "error"); return; }

  const target   = targetSelect.value;
  const shortcut = shortcutInput.value.trim() || null;
  const isGroup  = urls.length > 1;
  const engines  = await getEngines();

  if (shortcut) {
    const conflict = engines.find(e => e.shortcut === shortcut);
    if (conflict) {
      showToast(`${t("shortcut_conflict","Shortcut used by")} "${conflict.name}"`, "error");
      return;
    }
  }

  const logo = isGroup ? null : await resolveLogoForUrl(urls[0]);
  engines.push({ name, urls, url: urls[0], logo, target, shortcut });
  await setEngines(engines);

  // Reset form
  nameInput.value        = "";
  urlRows.innerHTML      = "";
  const firstRow         = makeUrlRow("", urlRows);
  urlRows.appendChild(firstRow);
  targetSelect.value     = "new_tab";
  shortcutInput.value    = "";
  shortcutClear.classList.remove("visible");

  loadEngines();
  showToast(`${name} ${t("toast_engine_added","added")}`, "success");
}

async function removeEngine(index) {
  const engines = await getEngines();
  engines.splice(index, 1);
  await setEngines(engines);
  loadEngines();
}

async function addSeparator() {
  const engines = await getEngines();
  engines.push({ separator: true });
  await setEngines(engines);
  loadEngines();
  showToast(t("toast_separator_added","Separator added"), "success");
}

addEngineBtn.addEventListener("click", addEngine);
addSepBtn.addEventListener("click", addSeparator);

// ─────────────────────────────────────────────────────────────────────────────
// Edit Modal
// ─────────────────────────────────────────────────────────────────────────────
const editModal         = document.getElementById("editModal");
const closeEditBtn      = document.getElementById("closeEditBtn");
const cancelEditBtn     = document.getElementById("cancelEditBtn");
const saveEditBtn       = document.getElementById("saveEditBtn");
const editNameInput     = document.getElementById("editNameInput");
const editUrlRows       = document.getElementById("editUrlRows");
const editAddUrlRowBtn  = document.getElementById("editAddUrlRowBtn");
const editTargetSelect  = document.getElementById("editTargetSelect");
const editShortcutInput = document.getElementById("editShortcutInput");
const editShortcutClear = document.getElementById("editShortcutClear");

editShortcutClear.classList.remove("visible");
attachShortcutCapture(editShortcutInput, editShortcutClear);

editAddUrlRowBtn.addEventListener("click", () => {
  const row = makeUrlRow("", editUrlRows);
  editUrlRows.appendChild(row);
  syncRemoveBtns(editUrlRows);
  row.querySelector("input").focus();
});

let editingIndex = null;

async function openEditModal(index) {
  const engines = await getEngines();
  const engine  = engines[index];
  if (!engine || engine.separator) return;

  editingIndex = index;
  editNameInput.value = engine.name || "";

  editUrlRows.innerHTML = "";
  const urls = (engine.urls && engine.urls.length) ? engine.urls : [engine.url || ""];
  urls.forEach(u => {
    editUrlRows.appendChild(makeUrlRow(u, editUrlRows));
  });
  syncRemoveBtns(editUrlRows);

  editTargetSelect.value     = engine.target   || "new_tab";
  editShortcutInput.value    = engine.shortcut || "";
  if (engine.shortcut) {
    editShortcutClear.classList.add("visible");
  } else {
    editShortcutClear.classList.remove("visible");
  }

  editModal.classList.add("open");
  editNameInput.focus();
}

function closeEditModal() {
  editModal.classList.remove("open");
  editingIndex = null;
}

closeEditBtn.addEventListener("click", closeEditModal);
cancelEditBtn.addEventListener("click", closeEditModal);
editModal.addEventListener("click", e => { if (e.target === editModal) closeEditModal(); });

saveEditBtn.addEventListener("click", async () => {
  if (editingIndex === null) return;

  const name = editNameInput.value.trim();
  const urls = [...editUrlRows.querySelectorAll("[data-url-input]")]
    .map(el => el.value.trim()).filter(Boolean);

  if (!name) { showToast(t("toast_fill_fields","Please fill all fields"), "error"); return; }
  if (!urls.length) { showToast(t("toast_fill_fields","Please fill all fields"), "error"); return; }

  const target   = editTargetSelect.value;
  const shortcut = editShortcutInput.value.trim() || null;
  const isGroup  = urls.length > 1;
  const engines  = await getEngines();

  if (shortcut) {
    const conflict = engines.find((e, i) => i !== editingIndex && e.shortcut === shortcut);
    if (conflict) {
      showToast(`${t("shortcut_conflict","Shortcut used by")} "${conflict.name}"`, "error");
      return;
    }
  }

  const existing = engines[editingIndex];
  let logo = existing.logo;
  if (!isGroup) {
    const prevUrl = existing.url || (existing.urls && existing.urls[0]) || "";
    if (urls[0] !== prevUrl) logo = await resolveLogoForUrl(urls[0]);
  } else {
    logo = null;
  }

  engines[editingIndex] = { ...existing, name, urls, url: urls[0], logo, target, shortcut };
  await setEngines(engines);
  closeEditModal();
  loadEngines();
  showToast(`${name} ${t("toast_updated","updated")}`, "success");
});

// ─────────────────────────────────────────────────────────────────────────────
// Drag & Drop reorder
// ─────────────────────────────────────────────────────────────────────────────
function initPointerDrag() {
  engineList.querySelectorAll(".engine-item").forEach(item => {
    const handle = item.querySelector(".drag-handle");
    if (!handle) return;
    handle.addEventListener("pointerdown", e => { e.preventDefault(); startDrag(e, item); });
  });
}

function startDrag(e, dragEl) {
  const rect    = dragEl.getBoundingClientRect();
  const offsetY = e.clientY - rect.top;

  const ghost = dragEl.cloneNode(true);
  Object.assign(ghost.style, {
    position: "fixed", left: rect.left + "px", top: rect.top + "px",
    width: rect.width + "px", height: rect.height + "px",
    zIndex: "10000", pointerEvents: "none", margin: "0",
    boxShadow: "0 8px 24px rgba(0,0,0,.3)", borderRadius: "7px",
    opacity: ".92", background: "var(--surface2)", border: "1px solid var(--accent)"
  });
  document.body.appendChild(ghost);
  dragEl.style.opacity = "0.3";

  let currentIndex = parseInt(dragEl.dataset.index);

  function onMove(ev) {
    ghost.style.top = (ev.clientY - offsetY) + "px";
    let targetIndex = currentIndex;
    [...engineList.children].forEach(child => {
      if (child === dragEl) return;
      const r = child.getBoundingClientRect();
      if (ev.clientY > r.top + r.height / 2) targetIndex = parseInt(child.dataset.index);
    });
    if (targetIndex !== currentIndex) {
      const targetEl = engineList.querySelector(`[data-index="${targetIndex}"]`);
      if (targetEl) {
        const mid = targetEl.getBoundingClientRect();
        engineList.insertBefore(dragEl,
          e.clientY > mid.top + mid.height / 2 ? targetEl.nextSibling : targetEl
        );
        currentIndex = targetIndex;
      }
    }
  }

  async function onUp() {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup",   onUp);
    ghost.remove();
    dragEl.style.opacity = "";
    const newOrder = [...engineList.querySelectorAll(".engine-item")].map(el => parseInt(el.dataset.index));
    const engines  = await getEngines();
    await setEngines(newOrder.map(i => engines[i]));
    loadEngines();
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup",   onUp);
}

// ─────────────────────────────────────────────────────────────────────────────
// Library Modal
// ─────────────────────────────────────────────────────────────────────────────
const LIBRARY_URL     = chrome.runtime.getURL("library.json");
const openLibraryBtn  = document.getElementById("openLibraryBtn");
const closeLibraryBtn = document.getElementById("closeLibraryBtn");
const libraryModal    = document.getElementById("libraryModal");
const librarySearch   = document.getElementById("librarySearch");
const libraryGrid     = document.getElementById("libraryGrid");

let libraryData = [];
let addedNames  = new Set();

openLibraryBtn.addEventListener("click",  openLibrary);
closeLibraryBtn.addEventListener("click", () => libraryModal.classList.remove("open"));
librarySearch.addEventListener("input",   renderLibraryGrid);

async function openLibrary() {
  libraryModal.classList.add("open");
  const engines = await getEngines();
  addedNames = new Set(engines.filter(e => !e.separator).map(e => e.name));
  if (!libraryData.length) await fetchLibrary();
  else renderLibraryGrid();
}

async function fetchLibrary() {
  libraryGrid.innerHTML = `<div class="library-loading" style="grid-column:1/-1">
    <div class="spinner"></div>${t("library_loading","Loading library…")}
  </div>`;
  try {
    const res = await fetch(LIBRARY_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    libraryData     = await res.json();
    _libraryForLogo = libraryData;
    renderLibraryGrid();
  } catch (err) {
    libraryGrid.innerHTML = `<div class="library-error" style="grid-column:1/-1">
      ⚠ ${t("library_error","Could not load library.")}<br><small>${err.message}</small>
    </div>`;
  }
}

function renderLibraryGrid() {
  const q        = librarySearch.value.trim().toLowerCase();
  const filtered = libraryData.filter(e => e.name.toLowerCase().includes(q));
  if (!filtered.length) {
    libraryGrid.innerHTML = `<div class="library-error" style="grid-column:1/-1">
      ${t("library_no_results","No results for")} "${escHtml(q)}"
    </div>`;
    return;
  }
  libraryGrid.innerHTML = "";
  filtered.forEach(engine => {
    const isAdded  = addedNames.has(engine.name);
    const card     = document.createElement("div");
    card.className = "lib-card" + (isAdded ? " added" : "");

    const logoHtml = engine.logo
      ? `<img class="lib-logo" src="${escHtml(engine.logo)}" alt="${escHtml(engine.name)}"
           onerror="this.outerHTML='<div class=lib-logo-fallback>${escHtml(engine.name[0])}</div>'">`
      : `<div class="lib-logo-fallback">${escHtml(engine.name[0])}</div>`;

    card.innerHTML = `
      ${logoHtml}
      <div class="lib-name">${escHtml(engine.name)}</div>
      <button class="lib-add-btn ${isAdded ? "added-btn" : ""}">
        ${isAdded ? "✓ " + t("btn_added","Added") : "+ " + t("btn_add","Add")}
      </button>`;

    if (!isAdded) {
      card.querySelector(".lib-add-btn").addEventListener("click", async () => {
        const engines = await getEngines();
        engines.push({
          name: engine.name, urls: [engine.url], url: engine.url,
          logo: engine.logo || "engines/default.webp", target: "new_tab", shortcut: null
        });
        await setEngines(engines);
        addedNames.add(engine.name);
        renderLibraryGrid();
        loadEngines();
        showToast(`${engine.name} ${t("toast_engine_added","added")}`, "success");
      });
    }
    libraryGrid.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Export / Import
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById("exportBtn").addEventListener("click", async () => {
  const engines = await getEngines();
  const blob    = new Blob([JSON.stringify(engines, null, 2)], { type: "application/json" });
  const url     = URL.createObjectURL(blob);
  const a       = Object.assign(document.createElement("a"), { href: url, download: "menusearch-engines.json" });
  a.click();
  URL.revokeObjectURL(url);
  showToast(t("toast_exported","Exported"), "success");
});

document.getElementById("importBtn").addEventListener("click", () =>
  document.getElementById("importFileInput").click()
);
document.getElementById("importFileInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error();
      await setEngines(data);
      loadEngines();
      showToast(data.length + " " + t("toast_imported","engines imported"), "success");
    } catch {
      showToast(t("toast_invalid_json","Invalid JSON file"), "error");
    }
    e.target.value = "";
  };
  reader.readAsText(file);
});

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  currentSettings = await getSettings();

  applyTheme(currentSettings.theme);
  langSelect.value = currentSettings.lang || "en";

  // loadLang calls applyI18n() internally after loading
  await loadLang(currentSettings.lang || "en");

  // Seed the Add-tab URL rows
  urlRows.innerHTML = "";
  urlRows.appendChild(makeUrlRow("", urlRows));

  await loadEngines();
});
