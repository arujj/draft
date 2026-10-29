# Draft

A plain Markdown scratchpad: write, preview, copy, print. No account, no ads, no network calls. Notes stay in your browser.

## Use

| | |
| --- | --- |
| **Write / Preview** | Tabs at the top, or `⌘⇧P`. Split view appears on wide screens. |
| **⧉ Copy** | Copies what you see. Write → raw Markdown. Preview → formatted text for Docs, Slack or Mail (a terminal still gets the Markdown). |
| **Export** (page icon) | Saves what you see. Preview → print dialog, where you save a PDF of just the document. Write → the `.md` file (share sheet on iPhone). `⌘P` always prints. |
| **Notes** | ☰ top left. Saves as you type. Swipe a note left to delete it. |
| **Import** (bottom of the notes list) | Paste any link or choose a file. GitHub links bring in the README; other web pages come in as clean text via [Jina Reader](https://jina.ai/reader), a free service that sees the link you import. |
| **Light / dark** | Bottom of the notes list. Follows your device until you pick. |

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
