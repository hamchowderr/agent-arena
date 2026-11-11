import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { buildBible } from "./design-bible/entries.ts";
import { useEncoder } from "./design-bible/canvas.ts";

useEncoder({ deflate: (bytes) => deflateSync(bytes, { level: 9 }), base64: (bytes) => Buffer.from(bytes).toString("base64") });

const PAGE = `<title>Agent Arena Model Sheets</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Pixelify+Sans:wght@500;700&display=swap">
<style>
/* Layout: an animation studio's model-sheet binder. A sticky index on the left, one sheet per character on the right. */
:root {
  --paper: #eceff3;
  --sheet: #f8f9fb;
  --ink: #1d2230;
  --muted: #5b6375;
  --rule: #cfd5df;
  --pencil: #2f63c4;
  --redline: #c4362f;
  --tile: #2a2f3d;
  --display: "Pixelify Sans", "IBM Plex Mono", ui-monospace, monospace;
  --body: "IBM Plex Sans", system-ui, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --paper: #14171f; --sheet: #1b1f29; --ink: #e7eaf1; --muted: #9aa3b5; --rule: #2e3443; --pencil: #7aa5f5; --redline: #f0776f; --tile: #0f1218; color-scheme: dark; }
}
:root[data-theme="dark"] { --paper: #14171f; --sheet: #1b1f29; --ink: #e7eaf1; --muted: #9aa3b5; --rule: #2e3443; --pencil: #7aa5f5; --redline: #f0776f; --tile: #0f1218; color-scheme: dark; }
* { box-sizing: border-box; }
body { background: var(--paper); color: var(--ink); font: 15px/1.55 var(--body); padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 48px; }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--paper); }
.wrap { max-width: 1240px; margin: 0 auto; display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 32px; }
header.top { grid-column: 1 / -1; padding-block: 32px 8px; display: grid; gap: 10px; }
h1 { font: 700 clamp(28px, 4vw, 44px)/1.05 var(--display); margin: 0; letter-spacing: 0.01em; text-wrap: balance; }
.lede { max-width: 68ch; color: var(--muted); margin: 0; }
.stamp { font: 500 12px var(--mono); color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase; }
nav.index { position: sticky; top: calc(env(safe-area-inset-top, 0px) + 16px); align-self: start; display: grid; gap: 14px; max-height: calc(100vh - 32px); overflow: auto; padding-block: 4px 16px; }
nav.index .filters { display: grid; gap: 8px; }
nav.index input[type="search"] { width: 100%; font: 14px var(--body); padding: 8px 10px; border: 1px solid var(--rule); background: var(--sheet); color: var(--ink); border-radius: 6px; }
nav.index label { font-size: 13px; color: var(--muted); display: flex; gap: 6px; align-items: center; }
nav.index a { color: var(--ink); text-decoration: none; font-size: 13.5px; display: block; padding: 2px 0; }
nav.index a:hover, nav.index a:focus-visible { color: var(--pencil); }
nav.index .sec { font: 500 11px var(--mono); text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-top: 6px; }
nav.index a .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--redline); margin-left: 6px; vertical-align: middle; }
main { display: grid; gap: 40px; min-width: 0; }
section.part { display: grid; gap: 18px; min-width: 0; }
section.part > h2 { font: 700 24px/1.2 var(--display); margin: 0; border-bottom: 2px solid var(--ink); padding-bottom: 6px; }
section.part > p { margin: 0; max-width: 72ch; color: var(--muted); }
h3.group { font: 500 12px var(--mono); text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 10px 0 0; }
.sheet { background: var(--sheet); border: 1px solid var(--rule); border-radius: 4px; display: grid; grid-template-columns: minmax(0, 340px) minmax(0, 1fr); min-width: 0; scroll-margin-top: 16px; }
.sheet .stage { border-right: 1px solid var(--rule); padding: 16px; display: grid; gap: 12px; align-content: start; }
.sheet .notes { padding: 16px 20px; display: grid; gap: 14px; align-content: start; min-width: 0; }
.kicker { font: 500 11.5px var(--mono); color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase; }
.sheet h4 { font: 700 22px/1.15 var(--display); margin: 2px 0 0; }
.tile { border-radius: 3px; display: grid; place-items: center; padding: 12px; overflow: hidden; }
.tile canvas, .tile img { image-rendering: pixelated; max-width: 100%; height: auto; display: block; }
.cap { font: 12px var(--mono); color: var(--muted); display: flex; justify-content: space-between; gap: 8px; }
.row { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; }
.clip { display: grid; gap: 4px; min-width: 0; max-width: 100%; }
.clip .tile { padding: 8px; }
.strip { overflow-x: auto; max-width: 100%; }
.strip img { image-rendering: pixelated; display: block; }
.sil { background: var(--paper); border: 1px dashed var(--rule); }
.swatches { display: flex; flex-wrap: wrap; gap: 3px; }
.swatches span { width: 18px; height: 18px; border-radius: 2px; border: 1px solid rgba(0,0,0,0.15); }
dl.facts { display: grid; grid-template-columns: max-content 1fr; gap: 3px 14px; margin: 0; font: 13px var(--mono); font-variant-numeric: tabular-nums; }
dl.facts dt { color: var(--muted); }
dl.facts dd { margin: 0; }
.field { display: grid; gap: 2px; }
.field b { font: 500 11px var(--mono); text-transform: uppercase; letter-spacing: 0.07em; color: var(--muted); }
.field p { margin: 0; max-width: 70ch; }
ul.flags, ul.qs { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
ul.flags li { border-left: 3px solid var(--redline); padding: 2px 0 2px 10px; }
ul.flags li::before { content: "Reads weak · "; font: 500 11px var(--mono); color: var(--redline); text-transform: uppercase; letter-spacing: 0.05em; }
ul.qs li { border-left: 3px solid var(--pencil); padding: 2px 0 2px 10px; }
ul.qs li::before { content: "Open · "; font: 500 11px var(--mono); color: var(--pencil); text-transform: uppercase; letter-spacing: 0.05em; }
.board { background: var(--sheet); border: 1px solid var(--rule); border-radius: 4px; padding: 16px; display: grid; gap: 10px; }
.legend { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: var(--muted); }
.legend i { font-style: normal; font: 500 11px var(--mono); text-transform: uppercase; letter-spacing: 0.05em; }
.legend .r { color: var(--redline); } .legend .b { color: var(--pencil); }
.empty { color: var(--muted); }
@media (max-width: 860px) {
  .wrap { grid-template-columns: minmax(0, 1fr); }
  nav.index { position: static; max-height: none; grid-template-columns: 1fr; }
  nav.index .links { display: none; }
  .sheet { grid-template-columns: minmax(0, 1fr); }
  .sheet .stage { border-right: 0; border-bottom: 1px solid var(--rule); }
}
</style>
<div class="wrap">
  <header class="top">
    <span class="stamp">Agent Arena · design bible · rendered from src/art on __DATE__ · __COMMIT__</span>
    <h1>Model sheets</h1>
    <p class="lede">Every character, weapon, pickup and effect in the game, drawn by the same code the game runs. Each sheet gives the concept, the silhouette, the palette, every animation clip and the open questions. Comment on any sheet to steer a redraw.</p>
    <div class="legend"><span><i class="r">Reads weak</i> measured against the art rules or seen in the frames</span><span><i class="b">Open</i> a design question to decide</span></div>
  </header>
  <nav class="index" aria-label="Index">
    <div class="filters">
      <input type="search" id="filter" placeholder="Filter by name or trait" aria-label="Filter sheets">
      <label><input type="checkbox" id="flagged"> Only sheets that read weak</label>
    </div>
    <div class="links" id="links"></div>
  </nav>
  <main id="main"></main>
</div>
<script type="application/json" id="bible">__DATA__</script>
<script>
(function () {
  var data = JSON.parse(document.getElementById("bible").textContent);
  var main = document.getElementById("main");
  var links = document.getElementById("links");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var players = [];
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function player(clip, big) {
    var wrap = el("div", "clip");
    var tile = el("div", "tile"); tile.style.background = clip.ground;
    var canvas = document.createElement("canvas");
    canvas.width = clip.strip.width; canvas.height = clip.strip.height;
    var zoom = big ? clip.zoom : Math.max(1, clip.zoom - 1);
    canvas.style.width = clip.strip.width * zoom + "px";
    canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", clip.label);
    tile.appendChild(canvas); wrap.appendChild(tile);
    var cap = el("div", "cap"); cap.appendChild(el("span", "", clip.label));
    cap.appendChild(el("span", "", clip.strip.frames > 1 ? clip.strip.frames + "f @ " + clip.fps + " fps" : "still"));
    wrap.appendChild(cap);
    var image = new Image();
    var p = { canvas: canvas, ctx: canvas.getContext("2d"), image: image, clip: clip, frame: -1, visible: false };
    image.onload = function () { draw(p, 0); };
    image.src = clip.strip.src;
    players.push(p);
    if (!big && clip.strip.frames > 1 && clip.strip.frames <= 12) {
      var strip = el("div", "strip");
      var img = new Image(); img.src = clip.strip.src; img.alt = clip.label + " frames";
      img.style.width = clip.strip.width * clip.strip.frames * Math.max(1, zoom - 1) + "px";
      strip.appendChild(img); wrap.appendChild(strip);
    }
    return wrap;
  }
  function draw(p, frame) {
    if (!p.image.complete || p.frame === frame) return;
    p.frame = frame;
    var w = p.clip.strip.width, h = p.clip.strip.height;
    p.ctx.imageSmoothingEnabled = false;
    p.ctx.clearRect(0, 0, w, h);
    p.ctx.drawImage(p.image, frame * w, 0, w, h, 0, 0, w, h);
  }
  function sheet(entry) {
    var card = el("article", "sheet"); card.id = entry.id;
    card.dataset.search = (entry.title + " " + entry.kicker + " " + entry.group + " " + entry.text.map(function (t) { return t[1]; }).join(" ")).toLowerCase();
    card.dataset.flagged = entry.flags.length > 0 ? "1" : "0";
    var stage = el("div", "stage");
    stage.appendChild(player(entry.hero, true));
    if (entry.silhouette) {
      var silWrap = el("div", "clip");
      var sil = el("div", "tile sil");
      var simg = new Image(); simg.src = entry.silhouette.src; simg.alt = entry.title + " silhouette"; simg.style.width = entry.silhouette.width * 3 + "px";
      sil.appendChild(simg); silWrap.appendChild(sil);
      var scap = el("div", "cap"); scap.appendChild(el("span", "", "silhouette")); silWrap.appendChild(scap);
      stage.appendChild(silWrap);
    }
    var sw = el("div", "swatches");
    entry.palette.slice(0, 32).forEach(function (c) { var s = el("span"); s.style.background = c; s.title = c; sw.appendChild(s); });
    stage.appendChild(sw);
    var notes = el("div", "notes");
    var head = el("div"); head.appendChild(el("div", "kicker", entry.kicker)); head.appendChild(el("h4", "", entry.title)); notes.appendChild(head);
    var dl = el("dl", "facts");
    entry.facts.forEach(function (f) { dl.appendChild(el("dt", "", f[0])); dl.appendChild(el("dd", "", f[1])); });
    notes.appendChild(dl);
    entry.text.forEach(function (t) { var f = el("div", "field"); f.appendChild(el("b", "", t[0])); f.appendChild(el("p", "", t[1])); notes.appendChild(f); });
    if (entry.clips.length) { var row = el("div", "row"); entry.clips.forEach(function (c) { row.appendChild(player(c, false)); }); notes.appendChild(row); }
    if (entry.flags.length) { var ul = el("ul", "flags"); entry.flags.forEach(function (t) { ul.appendChild(el("li", "", t)); }); notes.appendChild(ul); }
    if (entry.questions.length) { var uq = el("ul", "qs"); entry.questions.forEach(function (t) { uq.appendChild(el("li", "", t)); }); notes.appendChild(uq); }
    card.appendChild(stage); card.appendChild(notes);
    return card;
  }
  data.sections.forEach(function (section) {
    var part = el("section", "part"); part.id = section.id;
    part.appendChild(el("h2", "", section.title));
    part.appendChild(el("p", "", section.intro));
    links.appendChild(Object.assign(el("a", "sec", section.title), { href: "#" + section.id }));
    if (section.image) { var board = el("div", "board"); board.appendChild(player(section.image, true)); part.appendChild(board); }
    var group = null;
    data.entries.filter(function (e) { return e.section === section.id; }).forEach(function (entry) {
      if (entry.group !== group) { group = entry.group; part.appendChild(el("h3", "group", group)); }
      part.appendChild(sheet(entry));
      var a = el("a", "", entry.title); a.href = "#" + entry.id;
      if (entry.flags.length) a.appendChild(el("span", "dot"));
      links.appendChild(a);
    });
    main.appendChild(part);
  });
  var filter = document.getElementById("filter");
  var flagged = document.getElementById("flagged");
  function apply() {
    var q = filter.value.trim().toLowerCase();
    document.querySelectorAll(".sheet").forEach(function (card) {
      card.hidden = (q && card.dataset.search.indexOf(q) < 0) || (flagged.checked && card.dataset.flagged !== "1");
    });
  }
  filter.addEventListener("input", apply); flagged.addEventListener("change", apply);
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (items) { items.forEach(function (it) { players.forEach(function (p) { if (p.canvas === it.target) p.visible = it.isIntersecting; }); }); });
    players.forEach(function (p) { io.observe(p.canvas); });
  } else { players.forEach(function (p) { p.visible = true; }); }
  if (reduce) return;
  function tick(now) {
    players.forEach(function (p) { if (p.visible && p.clip.strip.frames > 1) draw(p, Math.floor(now / 1000 * p.clip.fps) % p.clip.strip.frames); });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
</script>
`;

const date = new Date().toISOString().slice(0, 10);
const commit = (process.env.BIBLE_COMMIT ?? process.env.GITHUB_SHA ?? "local").slice(0, 7);
const bible = buildBible();
const json = JSON.stringify(bible).replace(/</g, "\\u003c");
mkdirSync("art-sheet", { recursive: true });
writeFileSync("art-sheet/design-bible.html", PAGE.replace("__DATE__", date).replace("__COMMIT__", commit).replace("__DATA__", () => json));
console.log(`wrote art-sheet/design-bible.html (${bible.entries.length} sheets, ${Math.round(json.length / 1024)} KB of data)`);
