let auto = false; // auto close if opened automatically
let stat = "";
const POUT = 300000; // auto close timeout when paused: 5 minutes (in ms)
const IOUT = 3600000; // auto close timeout for inactivity: 1 hour (in ms)
const BANGLE2 = process.env.HWVERSION === 2;
const SCROLL_FONT_SIZE = 22;
const SCROLL_GAP = 40;
const SCROLL_STEP = 10;
const SCROLL_INTERVAL = 200;
const MIN_READABLE_SIZE = 18;

let media = require("gbmusic.lib.js");
let scrollTimers = {};

function getTextColor() {
  return g.theme.fg || (g.theme.dark ? "#fff" : "#000");
}

function closeApp() {
  stopAllScroll();
  load();
}

function fitText(text, w) {
  if (!text || !text.length) {
    return Infinity;
  }
  const test = (s) => g.setFont("Vector", s).stringWidth(text);
  let best = Math.floor((100 * w) / test(100));
  if (best < 1) best = 1;
  if (test(best) === w) {
    return best;
  }
  if (test(best) < w) {
    do {
      best++;
    } while (test(best) <= w);
    return best - 1;
  }
  do {
    best--;
  } while (best > 1 && test(best) > w);
  return best;
}

function stopFieldScroll(id) {
  if (scrollTimers[id]) {
    clearInterval(scrollTimers[id]);
    delete scrollTimers[id];
  }
  if (layout && layout[id]) {
    layout[id].offset = null;
  }
}

function stopAllScroll() {
  stopFieldScroll("artist");
  stopFieldScroll("track");
}

function shouldScrollField(l) {
  if (!l || !l.label || !l.label.length) return false;
  if (Bangle.isLocked()) return false;
  const maxFit = fitText(l.label, l.w - 4);
  return maxFit < MIN_READABLE_SIZE;
}

function updateScrollForField(id) {
  if (!layout || !layout[id]) return;
  const l = layout[id];
  if (shouldScrollField(l)) {
    startFieldScroll(id);
  } else {
    stopFieldScroll(id);
  }
}

function updateScrollForAllFields() {
  if (Bangle.isLocked()) {
    stopAllScroll();
    return;
  }
  updateScrollForField("artist");
  updateScrollForField("track");
}

function drawScrollingField(l) {
  const text = l.label || "";
  const fg = getTextColor();
  const bg = l.bgCol || g.theme.bg || (g.theme.dark ? "#000" : "#fff");
  const fontSize = Math.min(SCROLL_FONT_SIZE, Math.max(14, l.h - 4));
  g.setFont("Vector", fontSize);
  const span = g.stringWidth(text) + SCROLL_GAP;
  if (l.offset === null || typeof l.offset === "undefined") {
    l.offset = 0;
  }
  l.offset = l.offset % span;
  const y = l.y + l.h / 2;

  g.setColor(fg)
    .setBgColor(bg)
    .setFontAlign(-1, 0)
    .clearRect(l.x, l.y, l.x + l.w - 1, l.y + l.h - 1)
    .setColor(fg)
    .drawString(text, l.x - l.offset + SCROLL_GAP, y)
    .drawString(text, l.x - l.offset + SCROLL_GAP + span, y);
}

function startFieldScroll(id) {
  if (Bangle.isLocked() || !layout || !layout[id]) return;
  const l = layout[id];
  if (scrollTimers[id]) return;
  l.offset = 0;
  if (BANGLE2 || Bangle.isLCDOn()) {
    scrollTimers[id] = setInterval(() => {
      if (Bangle.isLocked()) {
        stopFieldScroll(id);
        if (layout && layout[id]) rInfo(layout[id]);
        return;
      }
      if (!layout || !layout[id]) return;
      layout[id].offset += SCROLL_STEP;
      drawScrollingField(layout[id]);
    }, SCROLL_INTERVAL);
    drawScrollingField(l);
  }
}

function rInfo(l) {
  const text = l.label || "";
  const fg = getTextColor();
  const bg = l.bgCol || g.theme.bg || (g.theme.dark ? "#000" : "#fff");
  const id = l.id;

  if (Bangle.isLocked()) {
    if (id) stopFieldScroll(id);
    g.setColor(fg)
      .setBgColor(bg)
      .clearRect(l.x, l.y, l.x + l.w - 1, l.y + l.h - 1);
    if (!text.length) return;

    let size = Math.min(l.h, 16);
    let lines = [];
    while (size >= 11) {
      g.setFont("Vector", size);
      lines = g.wrapString(text, l.w - 4);
      if (lines.length * g.getFontHeight() <= l.h) {
        break;
      }
      size--;
    }
    g.setFont("Vector", size).setFontAlign(0, -1);
    const lineH = g.getFontHeight();
    const totalH = lines.length * lineH;
    const y = l.y + Math.max(0, Math.floor((l.h - totalH) / 2));
    for (let i = 0; i < lines.length; i++) {
      g.drawString(lines[i], l.x + l.w / 2, y + i * lineH);
    }
    return;
  }

  // Entsperrt: falls bereits am Scrollen, weiter scrollen
  if (l.offset !== null && typeof l.offset !== "undefined") {
    drawScrollingField(l);
    return;
  }

  // Pr ü fen, ob der Text in angenehmer Mindestgr ö ß e in eine Zeile passt
  const maxFit = fitText(text, l.w - 4);
  if (text.length && maxFit < MIN_READABLE_SIZE) {
    if (id) {
      startFieldScroll(id);
      return;
    }
  }

  g.setColor(fg)
    .setBgColor(bg)
    .clearRect(l.x, l.y, l.x + l.w - 1, l.y + l.h - 1);
  if (!text.length) return;

  let size = Math.min(maxFit, l.h);
  g.setFont("Vector", size)
    .setFontAlign(0, 0)
    .drawString(text, l.x + l.w / 2, l.y + l.h / 2);
}

let layout;
function makeUI() {
  Bangle.loadWidgets();
  Bangle.drawWidgets();
  const Layout = require("Layout");
  layout = new Layout(
    {
      type: "v",
      c: [
        {
          id: "artist",
          type: "custom",
          label: "",
          offset: null,
          fillx: 1,
          filly: 1,
          render: rInfo,
          bgCol: g.theme.bg,
        },
        {
          id: "track",
          type: "custom",
          label: "",
          offset: null,
          fillx: 1,
          filly: 1,
          render: rInfo,
          bgCol: g.theme.bg,
        },
      ],
    },
    { lazy: true },
  );
  layout.render();
}

////////////////////////
// GB event handlers
///////////////////////

function info(info) {
  stopAllScroll();
  layout.artist.label = info.artist || "";
  layout.track.label = info.track || "";
  layout.update();
  layout.render();

  if (tIxt) {
    clearTimeout(tIxt);
    tIxt = null;
  }
  if (auto && stat === "play") {
    tIxt = setTimeout(load, info.dur * 2000 || IOUT);
  }
}

let tPxt, tIxt;
function state(e) {
  stat = e.state;
  if (tPxt) {
    clearTimeout(tPxt);
    tPxt = null;
  }
  if (tIxt) {
    clearTimeout(tIxt);
    tIxt = null;
  }
  fade = null;
  if (auto) {
    switch (stat) {
      case "stop":
        load();
        break;
      case "play":
        tIxt = setTimeout(load, e.dur * 2000 || IOUT);
        break;
      case "pause":
      default:
        tPxt = setTimeout(load, POUT);
        fade = Date.now();
        fadeOut();
        break;
    }
  }
}

////////////////////
// Events
////////////////////

let pressDownAt = 0,
  tMulti,
  nPress = 0;
function startButtonWatches() {
  let btn = BTN1;

  // Dr ü cken: nur Startzeit merken (kein blindes Auto-Close per Timer)
  setWatch(
    () => {
      pressDownAt = Date.now();
      console.log("button pressed");
    },
    btn,
    { repeat: true, edge: "falling" },
  );

  // Loslassen: Dauer auswerten -> lang (> 800ms) schlie ß t App, sonst 1x Play/Pause, 2x Next
  setWatch(
    () => {
      const heldMs = pressDownAt ? Date.now() - pressDownAt : 0;
      console.log(heldMs, nPress);
      pressDownAt = 0;

      if (heldMs >= 800) {
        nPress = 0;
        if (tMulti) {
          clearTimeout(tMulti);
          tMulti = null;
        }
        closeApp();
        return;
      }

      nPress++;
      if (tMulti) {
        clearTimeout(tMulti);
        tMulti = null;
      }
      tMulti = setTimeout(handleButtonMultiPress, 450);
    },
    btn,
    { repeat: true, edge: "rising" },
  );
}

function handleButtonMultiPress() {
  tMulti = null;
  pressDownAt = 0;
  if (nPress === 1) {
    media.togglePlay();
  } else if (nPress === 2) {
    media.next();
  } else if (nPress === 3) {
    media.prev();
  }
  nPress = 0;
}

function handleTouch(btn, pos) {
  if (pos === undefined || pos.y >= Bangle.appRect.y) {
    media.togglePlay();
  }
}
let drag;
function handleDrag(e) {
  if (!drag) {
    drag = { x: e.x, y: e.y };
  } else if (!e.b) {
    const dx = e.x - drag.x;
    const dy = e.y - drag.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    console.log(dx, dy, absDx, absDy);
    drag = null;
    if (absDx > absDy + 10) {
      // Check horizontal
      if (dx > 0) {
        // RIGHT
        media.prev();
      } else {
        // LEFT
        media.next();
      }
    } else if (absDy > absDx + 10) {
      // Check vertical
      if (dy < 0) {
        // UP
        media.volumeUp();
      } else {
        // DOWN
        media.volumeDown();
      }
    }
  }
}

function startTouchWatches() {
  Bangle.on("touch", handleTouch);

  Bangle.on("drag", handleDrag);
}

function startLockWatch() {
  Bangle.on("lock", (locked) => {
    if (!layout) return;
    //stopAllScroll();
    //layout.render();
    if (!locked) {
      setTimeout(() => {
        if (!Bangle.isLocked()) {
          layout.render();
          updateScrollForAllFields();
        }
      }, 50);
    }
  });
}

/////////////////////
// Startup
/////////////////////

function startWatches() {
  startButtonWatches();
  startTouchWatches();
  startLockWatch();
}

function start() {
  makeUI();
  startWatches();
}

function init() {
  let saved = require("Storage").readJSON("gbmusic.load.json", true);
  require("Storage").erase("gbmusic.load.json");
  if (saved) {
    auto = true;
    start();
    info(saved.info);
    state(saved.state);
    return;
  }

  let s = require("Storage").readJSON("gbmusic.json", 1) || {};
  if ("autoStart" in s) {
    start();
    return;
  }

  E.showPrompt("Automatically load\n" + "when playing music?\n").then(
    (choice) => {
      s.autoStart = choice;
      require("Storage").writeJSON("gbmusic.json", s);
      setTimeout(start, 0);
    },
  );
}

g.clear();
init();
