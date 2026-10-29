# Draft

A plain Markdown scratchpad: write, preview, copy, print. No account, no ads, no network calls. Notes stay in your browser.

## Use

| | |
| --- | --- |
| **Write / Preview** | Tabs at the top, or `⌘⇧P`. Split view appears on wide screens. |
| **⧉** | Copies what you see. Write → raw Markdown. Preview → formatted text for Docs, Slack or Mail (a terminal still gets the Markdown). |
| **PDF** | Prints or saves just the rendered document (`⌘P` works too). The file is named after the note. |
| **⋯ → Open…** | Paste a GitHub link to bring in its README, or choose a `.md` file. |
| **Notes** | ☰ top left. Saves as you type. Swipe a note left to delete it. |

Editor: `⌘B` bold, `⌘I` italic, `⌘K` link, `Tab` indents, lists continue on Enter. Tick checkboxes right in Preview.

Tip: in the print dialog, turn off **Headers and footers** so the browser doesn't add the date and URL.

## Host it (pick one)

Static files only, no build step.

- **GitHub Pages**: Repo → Settings → Pages → Deploy from a branch → pick the branch, `/ (root)`. Opens at `https://<user>.github.io/<repo>/`.
- **Cloudflare Pages**: Create project → connect this repo → no framework, build command empty, output directory `/`.
- **Local**: open `index.html` directly, or run `python3 -m http.server`.

Then on iPhone: open it in Safari → Share → **Add to Home Screen**. On Mac Safari: File → **Add to Dock**. It works offline after the first load.

## Files

`index.html` is the whole app. `vendor/` has marked, DOMPurify, and highlight.js, bundled so nothing loads from a CDN. `sw.js` caches the app for offline use; bump `VERSION` in it when you change files.
