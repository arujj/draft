# Draft

A plain Markdown scratchpad: write, preview, copy, print. No account, no ads, no network calls. Notes stay in your browser.

## Use

| | |
| --- | --- |
| **Write / Preview / Split** | Tabs at the top, or `⌘⇧P` to toggle. Split appears on wide screens. |
| **Copy** | Copies what you're looking at. Write → raw Markdown. Preview → formatted (rich text in Docs/Slack/Mail; still Markdown when pasted into a terminal like Claude Code or Codex). |
| **⋯ → As code block** | Wraps the note in a ```` ``` ```` fence for Slack. |
| **Print** | `⌘P` from anywhere prints only the rendered document. The PDF filename is the note title. |
| **Open GitHub link** (⋯) | Paste a GitHub file/repo/gist link to get the README as a note, then print it clean. |
| **Notes** | ☰ top left. Saved as you type. Drag a `.md` file onto the window to open it. |

Editor: `⌘B` bold, `⌘I` italic, `⌘K` link, `⌘E` inline code, `Tab`/`⇧Tab` indent, lists continue on Enter. Click checkboxes in Preview to tick them.

Tip: in the print dialog, turn off **Headers and footers** so the browser doesn't add the date/URL.

## Host it (pick one)

Static files only, no build step.

- **GitHub Pages**: Repo → Settings → Pages → Deploy from a branch → pick the branch, `/ (root)`. Opens at `https://<user>.github.io/<repo>/`.
- **Cloudflare Pages**: Create project → connect this repo → no framework, build command empty, output directory `/`.
- **Local**: open `index.html` directly, or run `python3 -m http.server`.

Then on iPhone: open it in Safari → Share → **Add to Home Screen**. On Mac Safari: File → **Add to Dock**. It works offline after the first load.

## Files

`index.html` is the whole app. `vendor/` has marked, DOMPurify, and highlight.js, bundled so nothing loads from a CDN. `sw.js` caches the app for offline use; bump `VERSION` in it when you change files.
