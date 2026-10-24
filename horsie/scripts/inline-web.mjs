// Turns `expo export --platform web` output into one self-contained HTML file
// you can host anywhere (or open straight from disk).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'dist';
const out = process.argv[3] ?? join(dir, 'horsie.html');
let html = readFileSync(join(dir, 'index.html'), 'utf8');

html = html.replace(/<script src="\/?([^"]+)" defer><\/script>/g, (_, src) => {
  const js = readFileSync(join(dir, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>${js}</script>`;
});
html = html.replace(/<link rel="icon"[^>]*>/, '');
html = html.replace(
  '</head>',
  `<meta name="theme-color" content="#7CC8F2" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <style>html,body{background:#7CC8F2;overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none}</style>
</head>`,
);
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
