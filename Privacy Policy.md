# 🔐 Privacy Policy — MenuSearch Extension

Last updated: April 2026

MenuSearch respects your privacy.  
This extension is designed to work **entirely on your device**, without collecting or transmitting any personal data.

---

## ✅ Information We Collect

**We do not collect, store, or transmit any personal information.**  
MenuSearch does not use analytics, tracking scripts, external servers, or cookies.

The extension only stores **your custom search engines and settings** locally inside your browser, using the built‑in `chrome.storage.local` API.

---

## ✅ How Data Is Used

Your data (engines, separators, theme, language) is stored **only on your device** so the extension can:

- Build the “Search with” context‑menu
- Display your engine list in the popup
- Save your theme and language preferences

None of this information leaves your browser.

---

## ✅ Permissions Explanation

MenuSearch uses these browser permissions:

### **contextMenus**
To add the “Search with…” right‑click menu.

### **storage**
To save your custom engines and settings locally.


No other permissions are used.

---


## ✅ Content Script Behavior

MenuSearch injects a small script (`content.js`) into web pages to detect keyboard shortcuts and read your text selection when you trigger a search.

This script:
- **Only detects** keyboard shortcuts that include a modifier key (Ctrl, Alt, Shift, or Meta) — bare keypresses are completely ignored
- **Only reads** text you have actively selected on the page at the moment you press the shortcut
- **Does not** read, scan, copy, or store any page content, form inputs, or passwords
- **Does not** transmit any data to any external server — selected text is only passed to your browser to open a search URL
- **Only runs once per page** — a guard flag (`window.__menuSearchLoaded`) prevents it from loading more than once
- **Keeps a local cache** of your configured shortcuts from `chrome.storage.local` purely to match keypresses without async delays — this data never leaves your browser

---

## ✅ Third‑Party Services

The extension does **not** send data to third parties.  
If you search using Google, Bing, etc., your query goes directly to those websites, exactly as if you typed it manually.

---

## ✅ Children’s Privacy

MenuSearch does not collect personal data from anyone, including children under 13.

---

## ✅ Contact

If you have privacy questions, feel free to contact the developer:

**Email:** *hassananayi@gmail.com*

---

Thank you for using MenuSearch!
