'use strict';
/* Third content pack: lamp flare, lamp lines, the 50-chain woodblock print, map variants,
   curses, two new bosses, bestiary notes, crows and fireflies, smoother animation, nicer music. */

const easeBack = k => { const c = 1.7; k -= 1; return 1 + (c + 1) * k * k * k + c * k * k; };

/* ---------- 6. Lamp Flare: kills charge the lamp, Q (or the button) lets it breathe fire ---------- */
const FLARE_NEED = 40;
function flareReady() { return (G.flare || 0) >= FLARE_NEED; }
function lampFlare() {
  if (!flareReady() || G.state !== 'night') return;
  G.flare = 0; G.flareT = 0;
  let n = 0;
  for (const m of G.mons) {
    if (m.dead) continue;
    const dx = m.x - LAMP.x, dy = m.y - LAMP.y, d = Math.hypot(dx, dy) || 1;
    if (d > 280) continue;
    dmgMon(m, 60 * (1 - d / 400), 'fire', 'tower', dx, dy); n++;
    if (m.type !== 'boss') { m.kx += dx / d * 700; m.ky += dy / d * 700; }
  }
  ring(LAMP.x, LAMP.y, 280, GOLD, .9); ring(LAMP.x, LAMP.y, 180, RED, .6);
  G.lights.push({ x: LAMP.x, y: LAMP.y, r: 420, t: .6 });
  addShake(14); G.hitstop = Math.max(G.hitstop, .12); sfx('boom', 1, .9); sfx('fire', .9, .8);
  lampSay(n >= 8 ? 'Back.' : 'Away from me.');
}
window.addEventListener('keydown', e => { if (e.code === 'KeyQ' && !e.repeat && typeof G !== 'undefined') lampFlare(); });
function drawFlareMeter() {
  if (G.state !== 'night' && G.state !== 'day') return;
  const k = clamp((G.flare || 0) / FLARE_NEED, 0, 1), c = ctx, x = LAMP.x, y = LAMP.y - 14;
  c.strokeStyle = k >= 1 ? GOLD : 'rgba(240,196,138,.55)'; c.lineWidth = k >= 1 ? 4 : 3;
  c.globalAlpha = k >= 1 ? .6 + .4 * Math.sin(G.time * 6) : .7;
  c.beginPath(); c.arc(x, y, 50, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke(); c.globalAlpha = 1;
  if (k >= 1 && G.state === 'night') text(TOUCH ? 'Tap the lamp button' : 'Q  Lamp Flare', x, y - 66, 17, GOLD, 'center', .7 + .3 * Math.sin(G.time * 6), 'rgba(10,12,20,.5)', 'italic');
}
function drawFlareBtn() {
  if (!TOUCH || G.state !== 'night') return;
  const x = VW - 56, y = 380, r = 30, ok = flareReady();
  btn(x - r, y - r, r * 2, r * 2, lampFlare);
  ctx.globalAlpha = ok ? .9 : .45; panel(x - r, y - r, r * 2, r * 2, .85); ctx.globalAlpha = 1;
  ctx.fillStyle = ok ? RED : GREY; ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.quadraticCurveTo(x + 10, y, x, y + 12); ctx.quadraticCurveTo(x - 10, y, x, y - 14); ctx.fill();
  const k = clamp((G.flare || 0) / FLARE_NEED, 0, 1); ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r - 4, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
}

/* ---------- 12. The lamp speaks ---------- */
function lampSay(s) { G.lampLine = { s, t: 0 }; }
function lampWatch() {
  if (G.state !== 'night') return;
  const f = LAMP.hp / LAMP.maxHp;
  G.lampSaid = G.lampSaid || {};
  const key = G.night + ':';
  if (f < .3 && !G.lampSaid[key + 'a']) { G.lampSaid[key + 'a'] = 1; lampSay(pick(['Not yet.', 'Hold.', 'I can still see.'])); }
  if (f < .1 && !G.lampSaid[key + 'b']) { G.lampSaid[key + 'b'] = 1; lampSay(pick(['...still here.', 'Do not let me go out.'])); }
}
function drawLampLine() {
  const L = G.lampLine; if (!L) return;
  if (G.state !== 'night' && G.state !== 'day') { L.t += 1 / 60; return; }
  L.t += 1 / 60; if (L.t > 3) { G.lampLine = null; return; }
  const a = Math.min(1, L.t * 3, (3 - L.t) * 2);
  text(L.s, LAMP.x, LAMP.y - 96 - L.t * 6, 22, '#f4d58a', 'center', a, 'rgba(10,12,20,.55)', 'italic');
}
const _winRun = winRun;
winRun = function () { addText('Morning.', LAMP.x, LAMP.y - 90, 30, GOLD, 2.5); return _winRun(); };
const _dawn = dawn;
dawn = function () {
  const hurt = G.stats && G.stats.lampDmg > LAMP.maxHp * .4;
  _dawn();
  wipe('day');
  if (hurt) lampSay('That was close.');
};
const _startNight = startNight;
startNight = function () {
  const was = G.state;
  _startNight();
  if (was === 'day' && G.state === 'night') wipe('night');
};

/* ---------- 11. Fifty in a chain: the page turns into a red-and-black woodblock print ---------- */
let printNext = 50;
function printWatch() {
  if (G.combo < 10) printNext = 50;
  if (G.combo >= printNext) { printNext += 50; G.printT = 1.3; addText(G.combo + ' unbroken', VW / 2, VH / 2 - 60, 80, RED, 1.4); sfx('boom', .7, 1.2); }
}
function drawPrint() {
  if (!(G.printT > 0)) return;
  G.printT -= 1 / 60;
  const a = Math.min(1, G.printT * 2, (1.3 - G.printT) * 6);
  ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = a; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a * .55; ctx.fillStyle = '#d23a22'; ctx.fillRect(0, 0, VW, VH);
  ctx.restore();
  // carved border
  ctx.strokeStyle = INK; ctx.lineWidth = 18; ctx.globalAlpha = a * .8; ctx.strokeRect(9, 9, VW - 18, VH - 18); ctx.globalAlpha = 1;
}

/* ---------- 8. Map variants: a river with two bridges, or a bamboo forest where nights are darker ---------- */
const MAP_NAME = { river: 'A river runs through it. Two bridges.', forest: 'Bamboo forest. The nights are darker here.' };
function rollMap() {
  G.mapKind = 'plain'; G.water = [];
  if (G.meta.runs < 1) return;                                     // the very first run stays simple
  const r = Math.random();
  if (r < .3) makeRiver(); else if (r < .6) G.mapKind = 'forest';
}
function makeRiver() {
  const horiz = Math.random() < .5, side = Math.random() < .5 ? -1 : 1;
  const line = horiz ? LAMP.r + side * 6 : LAMP.c + side * (9 + (Math.random() * 3 | 0)); // far enough to leave room for towers round the lamp
  const len = horiz ? COLS : ROWS, b1 = Math.floor(len * rand(.18, .3)), b2 = Math.floor(len * rand(.65, .8));
  const made = [];
  for (let k = 0; k < len; k++) {
    if (Math.abs(k - b1) <= 1 || Math.abs(k - b2) <= 1) continue;   // bridges, three cells wide
    const i = horiz ? idx(k, line) : idx(line, k);
    if (grid[i]) continue;
    const b = { type: 'rock', water: true, i, x: ccx(i), y: ccy(i), hp: 1, maxHp: 1, seed: rand(10), dead: false };
    grid[i] = b; made.push(b);
  }
  buildFlow();
  const ok = [idx(COLS >> 1, 0), idx(COLS >> 1, ROWS - 1), idx(0, ROWS >> 1), idx(COLS - 1, ROWS >> 1)].every(i => flow[i] < 5e4);
  if (!ok) { for (const b of made) grid[b.i] = null; buildFlow(); return; }
  G.mapKind = 'river'; G.water = made; G.riverH = horiz; G.bridges = [b1, b2]; G.riverLine = line;
}
const _genRocks = genRocks;
genRocks = function () { _genRocks(); rollMap(); };
function drawRiver() {
  if (G.mapKind !== 'river' || !G.water) return;
  const c = ctx;
  for (const b of G.water) {
    c.fillStyle = 'rgba(79,120,140,.28)'; c.fillRect(b.x - CELL / 2, b.y - CELL / 2, CELL, CELL);
    c.strokeStyle = 'rgba(40,70,90,.35)'; c.lineWidth = 1.5; c.beginPath();
    const o = (G.time * 20 + b.seed * 10) % CELL;
    if (G.riverH) { c.moveTo(b.x - CELL / 2 + o, b.y - 6); c.quadraticCurveTo(b.x - CELL / 2 + o + 8, b.y - 10, b.x - CELL / 2 + o + 16, b.y - 6); }
    else { c.moveTo(b.x - 6, b.y - CELL / 2 + o); c.quadraticCurveTo(b.x - 10, b.y - CELL / 2 + o + 8, b.x - 6, b.y - CELL / 2 + o + 16); }
    c.stroke();
  }
  // bridges: three planks across each gap
  c.strokeStyle = '#6b4f2c'; c.lineWidth = 4;
  for (const k of G.bridges) for (let j = -1; j <= 1; j++) {
    const i = G.riverH ? idx(k + j, G.riverLine) : idx(G.riverLine, k + j), x = ccx(i), y = ccy(i);
    for (let p = -1; p <= 1; p++) { c.beginPath(); if (G.riverH) { c.moveTo(x - 18, y + p * 11); c.lineTo(x + 18, y + p * 11); } else { c.moveTo(x + p * 11, y - 18); c.lineTo(x + p * 11, y + 18); } c.stroke(); }
  }
}
function drawBamboo() {
  if (G.mapKind !== 'forest') return;
  const c = ctx;
  if (!G.stalks) { G.stalks = []; for (let k = 0; k < 46; k++) { const left = k % 2, x = left ? rand(0, 90) : rand(VW - 90, VW); G.stalks.push({ x, h: rand(240, 520), w: rand(4, 8), y0: rand(VH * .3, VH + 40), s: rand(10) }); } }
  for (const s of G.stalks) {
    const sway = Math.sin(G.time * .8 + s.s) * 6;
    c.strokeStyle = 'rgba(54,78,44,.55)'; c.lineWidth = s.w; c.beginPath(); c.moveTo(s.x, s.y0); c.quadraticCurveTo(s.x, s.y0 - s.h / 2, s.x + sway, s.y0 - s.h); c.stroke();
    c.strokeStyle = 'rgba(30,40,24,.55)'; c.lineWidth = 1.5;
    for (let j = 1; j < 5; j++) { const yy = s.y0 - s.h * j / 5; c.beginPath(); c.moveTo(s.x - s.w / 2 - 1, yy); c.lineTo(s.x + s.w / 2 + 1, yy); c.stroke(); }
  }
}

/* ---------- 9. Curses: harder runs for more souls ---------- */
const CURSES = [
  { k: 'nowall', name: 'No Walls', desc: 'You cannot build walls.' },
  { k: 'frail', name: 'Frail', desc: 'Your hero has half health.' },
  { k: 'dim', name: 'Dim Lamp', desc: 'The lamp has 40% less health.' },
  { k: 'swarm', name: 'Swarm', desc: 'Thirty percent more enemies every night.' },
  { k: 'blind', name: 'Blind Dawn', desc: 'The dawn report hides what they learned.' }
];
function cursed(k) { return G.runCurses && G.runCurses.includes(k); }
function curseList() { return (G.meta.curses || []).filter(k => CURSES.some(c => c.k === k)); }
const _newRun = newRun;
newRun = function () {
  _newRun();
  G.runCurses = curseList(); G.flare = 0; G.lampLine = null; G.lampSaid = {}; G.stalks = null; printNext = 50;
  pickBoss();
  const n = G.runCurses.length;
  if (n) {
    G.mods.souls *= 1 + .25 * n;
    if (cursed('frail')) G.hero.maxHp = G.hero.hp = Math.round(G.hero.maxHp * .5);
    if (cursed('dim')) { LAMP.maxHp = Math.round(LAMP.maxHp * .6); LAMP.hp = LAMP.maxHp; }
    if (cursed('swarm')) G.diffMul = Object.assign({}, G.diffMul, { budget: G.diffMul.budget * 1.3 });
    setTimeout(() => addText(n + (n > 1 ? ' curses' : ' curse') + '   ·   souls +' + 25 * n + '%', VW / 2, 330, 26, RED, 2.6), 900);
  }
  if (G.mapKind !== 'plain') setTimeout(() => addText(MAP_NAME[G.mapKind], VW / 2, 300, 28, G.mapKind === 'river' ? QING : GREEN, 3), 400);
};
const _available = available;
available = function (type) { if (type === 'wall' && cursed('nowall')) return false; return _available(type); };
function drawCurses() {
  const w = 760, h = 160 + CURSES.length * 64, x = VW / 2 - w / 2, y = Math.max(20, (VH - h) / 2), M = G.meta;
  btn(0, 0, VW, VH, () => { G.showAbout = false; });
  ctx.fillStyle = NIGHT; ctx.globalAlpha = .5; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1;
  panel(x, y, w, h, .98);
  text('Curses', VW / 2, y + 48, 38, RED, 'center', 1, null, 'italic');
  text('Each curse you carry adds 25% to the souls you bring home.', VW / 2, y + 84, 17, GREY, 'center', 1, null, 'italic');
  CURSES.forEach((cu, i) => {
    const yy = y + 112 + i * 64, on = (M.curses || []).includes(cu.k);
    const hov = btn(x + 40, yy, w - 80, 54, () => { const L = M.curses = M.curses || []; const j = L.indexOf(cu.k); if (j >= 0) L.splice(j, 1); else L.push(cu.k); saveMeta(); tone(700, 900, .06, .05); });
    panel(x + 40, yy, w - 80, 54, on || hov ? 1 : .6);
    if (on) { ctx.strokeStyle = RED; ctx.lineWidth = 2.5; rrect(ctx, x + 40, yy, w - 80, 54, 12); ctx.stroke(); }
    if (on) { ctx.fillStyle = RED; rrect(ctx, x + 64, yy + 15, 24, 24, 4); ctx.fill(); ctx.strokeStyle = PAPER; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 69, yy + 27); ctx.lineTo(x + 75, yy + 33); ctx.lineTo(x + 84, yy + 20); ctx.stroke(); }
    else { ctx.strokeStyle = GREY; ctx.lineWidth = 1.5; ctx.strokeRect(x + 64, yy + 15, 24, 24); }
    text(cu.name, x + 112, yy + 20, 21, on ? RED : INK, 'left', 1, null, 'italic');
    text(cu.desc, x + 112, yy + 42, 15, GREY, 'left', 1);
  });
  text(TXT.menu.deedsClose || 'Click outside to close', VW / 2, y + h - 22, 16, GREY, 'center', .6 + .4 * Math.sin(G.time * 3));
}
const _drawAbout = drawAbout;
drawAbout = function () { if (G.showAbout === 'curses') drawCurses(); else _drawAbout(); };
function drawCurseBtn() {
  if (G.state !== 'title' || G.showAbout || G.showDeeds || !(G.meta.runs > 0)) return;
  const n = curseList().length, x = 40, y = 752, w = 250, h = 40;
  const hov = btn(x, y, w, h, () => { G.showAbout = 'curses'; });
  panel(x, y, w, h, hov ? 1 : .75);
  if (n) { ctx.strokeStyle = RED; ctx.lineWidth = 2; rrect(ctx, x, y, w, h, 12); ctx.stroke(); }
  text(n ? 'Curses: ' + n + '   (+' + 25 * n + '% souls)' : 'Curses', x + w / 2, y + 20, 18, n ? RED : INK, 'center', 1, null, 'italic');
}
// Blind Dawn: the report keeps the evidence but hides the names
const _learn = learn;
learn = function () {
  _learn();
  if (cursed('blind') && G.report) for (const a of G.report.adapt) { a.name = '???'; a.weak = 'You will have to find out.'; }
};

/* ---------- 10. Three bosses: the Deluge, the Thousand Hands, the Empty Mountain ---------- */
const BOSS_BASE = Object.assign({}, TXT.mon.boss);
const BOSSES = {
  tide: null,
  hands: { name: 'The Thousand Hands', desc: 'It does not fight. It sends.' },
  hollow: { name: 'The Empty Mountain', desc: 'Now you see it.' }
};
function pickBoss() {
  G.bossKind = G.meta.wins >= 1 || G.meta.dev ? pick(['tide', 'hands', 'hollow']) : 'tide';
  TXT.mon.boss = Object.assign({}, BOSS_BASE, BOSSES[G.bossKind] || {});
}
const _updBoss = updBoss;
updBoss = function (m, dt) {
  if (!m.kind) {
    m.kind = G.bossKind || 'tide';
    if (m.kind === 'hands') { m.hp = m.maxHp = m.maxHp * .8; m.spawnT = 2; }
    if (m.kind === 'hollow') { m.hp = m.maxHp = m.maxHp * .85; m.blinkT = 5; }
  }
  if (m.kind === 'hands') {
    m.spawnT -= dt * .9;                                      // summons far more often
    if (m.spawnT <= 0) {
      m.spawnT = 3.2;
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + rand(-.3, .3), c = spawnMon(pick(['blob', 'swift', 'swift', 'leech']), m.x + Math.cos(a) * 60, m.y + Math.sin(a) * 60, m.dir); c.kx = Math.cos(a) * 320; c.ky = Math.sin(a) * 320; }
      thud(.4, 90); ring(m.x, m.y, 90, INK, .5);
    }
    m.waveT += dt * .45;                                      // and waves come slower
  }
  if (m.kind === 'hollow') {
    m.blinkT -= dt;
    if (m.hidden) {
      if (m.blinkT <= 0) {
        const dx = LAMP.x - m.x, dy = LAMP.y - m.y, d = Math.hypot(dx, dy) || 1, step = Math.min(220, Math.max(0, d - 160));
        splat(m.x, m.y, 30, 0, 0); m.x += dx / d * step + rand(-80, 80); m.y += dy / d * step + rand(-60, 60);
        m.x = clamp(m.x, 60, VW - 60); m.y = clamp(m.y, 60, VH - 60);
        m.hidden = false; m.blinkT = 6; ring(m.x, m.y, 120, INK, .8); addShake(10); sfx('roar', .8, 1.1);
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; G.projs.push({ kind: 'ink', hostile: true, big: true, x: m.x, y: m.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, dmg: 12, life: 4 }); }
      }
    } else if (m.blinkT <= 0) { m.hidden = true; m.blinkT = 2; ring(m.x, m.y, 80, GREY, .5); }
  }
  _updBoss(m, dt);
};
// hidden: towers lose it, and it shrugs off most damage while gone
const _nearestMon2 = nearestMon;
nearestMon = function (x, y, R, pred) { return _nearestMon2(x, y, R, m => !m.hidden && (!pred || pred(m))); };
const _dmgMon3 = dmgMon;
dmgMon = function (m, amt, type, src, dx, dy) { if (m.hidden) amt *= .2; return _dmgMon3(m, amt, type, src, dx, dy); };

/* ---------- Smoother animation: things grow in, the hero squashes when it strikes ---------- */
const _drawMon3 = drawMon;
drawMon = function (m) {
  const c = ctx;
  if (m.type === 'boss' && m.kind === 'hollow' && m.hidden) { c.globalAlpha = .12; _drawMon3(m); c.globalAlpha = 1; return; }
  if (m.type === 'boss' && m.kind === 'hands') {
    c.strokeStyle = INK; c.lineCap = 'round';
    for (let k = 0; k < 10; k++) {
      const a = k / 10 * TAU + Math.sin(G.time * 1.5 + k) * .25, L = m.r + 30 + Math.sin(G.time * 3 + k * 1.7) * 14;
      c.lineWidth = 7; c.beginPath(); c.moveTo(m.x + Math.cos(a) * m.r * .7, m.y + Math.sin(a) * m.r * .7);
      c.quadraticCurveTo(m.x + Math.cos(a + .3) * (L - 12), m.y + Math.sin(a + .3) * (L - 12), m.x + Math.cos(a) * L, m.y + Math.sin(a) * L); c.stroke();
      c.fillStyle = INK; c.beginPath(); c.arc(m.x + Math.cos(a) * L, m.y + Math.sin(a) * L, 6, 0, TAU); c.fill();
    }
    c.lineCap = 'butt';
  }
  if (m.age < .35 && m.type !== 'boss') {
    const s = Math.max(.05, easeBack(m.age / .35));
    c.save(); c.translate(m.x, m.y); c.scale(s, s); c.translate(-m.x, -m.y); _drawMon3(m); c.restore();
    return;
  }
  _drawMon3(m);
};
const _drawBuild = drawBuild;
drawBuild = function (b) {
  if (b.age < .4) {
    const s = Math.max(.05, easeBack(b.age / .4)), c = ctx;
    c.save(); c.translate(b.x, b.y + 10); c.scale(s, s); c.translate(-b.x, -b.y - 10); _drawBuild(b); c.restore();
    return;
  }
  _drawBuild(b);
};
const _drawHero = drawHero;
drawHero = function () {
  const h = G.hero, B = BAL.hero[h.type];
  if (h.down || !B) return _drawHero();
  const k = clamp((h.cd / B.cd - .65) / .35, 0, 1);            // just swung: 1 → settles to 0
  if (k <= 0) return _drawHero();
  const c = ctx, sx = 1 + .16 * k, sy = 1 - .12 * k;
  c.save(); c.translate(h.x, h.y + 10); c.scale(sx, sy); c.translate(-h.x, -h.y - 10); _drawHero(); c.restore();
};
// day ↔ night: a broad brush stroke sweeps across the page
function wipe(kind) { G.wipe = { kind, t: 0 }; }
function drawWipe() {
  const w = G.wipe; if (!w) return;
  w.t += 1 / 60; const d = 1.1; if (w.t > d) { G.wipe = null; return; }
  const k = w.t / d, x = -400 + (VW + 800) * k, c = ctx, night = w.kind === 'night';
  c.save();
  const g = c.createLinearGradient(x - 420, 0, x + 60, 0);
  g.addColorStop(0, night ? 'rgba(14,18,30,0)' : 'rgba(244,237,219,0)'); g.addColorStop(.75, night ? 'rgba(14,18,30,.55)' : 'rgba(244,237,219,.55)'); g.addColorStop(1, night ? 'rgba(14,18,30,0)' : 'rgba(244,237,219,0)');
  c.fillStyle = g; c.beginPath(); c.moveTo(x - 420, 0); c.lineTo(x + 60, 0); c.lineTo(x - 40, VH); c.lineTo(x - 520, VH); c.closePath(); c.fill();
  brush(c, x + 30, -20, x - 70, VH + 20, 26, night ? INK : PAPER, .35 * Math.sin(k * Math.PI));
  c.restore();
}

/* ---------- 13. Bestiary notes, written in the margin ---------- */
const ARCH_NOTE = {
  blob: 'The first drop. There is never only one.', swift: 'Runs before it knows where.', brute: 'Walls are a suggestion to it.',
  spit: 'Hates your towers more than you.', bomb: 'Keep it far from anything you love.', leech: 'Pull it off before it drinks the tower dry.',
  herald: 'Kill it and the crowd slows down.', mimic: 'If you did not build it, hit it.', weaver: 'Silk on a tower is a slow death.',
  boss: 'It is the tide itself, standing up.',
  flame: 'Fire made this shell. Frost breaks it.', frost: 'Cold made them patient.', insul: 'Lightning taught them rubber.', hard: 'Blades taught them stone.',
  sapper: 'They read your towers like a map.', assassin: 'They know your face now.', fly: 'You built walls. They grew wings.', detour: 'They count where their dead fall.',
  split: 'Untouched lamps make them bold.', scatter: 'They learned not to stand together.', thick: 'Frost slides off them now.', decoy: 'Hollow copies. Let the towers sort them out.'
};

/* ---------- 14. Crows by day, fireflies at night ---------- */
function updAmbient(dt) {
  G.crows = G.crows || []; G.flies = G.flies || [];
  const day = G.state === 'day', h = G.hero;
  if (day && G.crows.length < 3 && Math.random() < dt * .25) {
    const perch = pick([...(G.builds || []).filter(b => b.type !== 'wall' && !isGround(b.type)), ...(G.rocks || [])]);
    if (perch) G.crows.push({ x: perch.x + (Math.random() < .5 ? -500 : 500), y: perch.y - 300, tx: perch.x + rand(-6, 6), ty: perch.y - 22, st: 'in', t: 0, s: rand(10) });
  }
  for (const c of G.crows) {
    c.t += dt;
    if (c.st === 'in') { const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy); if (d < 4) c.st = 'sit'; else { c.x += dx / d * Math.min(d, 260 * dt); c.y += dy / d * Math.min(d, 260 * dt); } }
    else if (c.st === 'sit') { if (!day || (!h.down && Math.hypot(h.x - c.x, h.y - c.y) < 90) || c.t > 25) { c.st = 'out'; c.vx = (c.x < h.x ? -1 : 1) * 300; c.vy = -260; } }
    else { c.x += c.vx * dt; c.y += c.vy * dt; }
  }
  G.crows = G.crows.filter(c => c.y > -60 && c.x > -80 && c.x < VW + 80);
  const night = G.state === 'night';
  if (night && G.flies.length < 14) G.flies.push({ a: rand(TAU), r: rand(60, 170), sp: rand(.2, .5) * (Math.random() < .5 ? -1 : 1), ph: rand(10), h: rand(-30, 30) });
  if (!night) G.flies.length = 0;
  for (const f of G.flies) f.a += f.sp * dt;
}
function drawCrows() {
  const c = ctx;
  for (const b of G.crows || []) {
    const flap = b.st === 'sit' ? 0 : Math.sin(G.time * 22 + b.s) * 6;
    c.fillStyle = INK; c.beginPath(); c.ellipse(b.x, b.y, 7, 4.5, 0, 0, TAU); c.fill();
    c.beginPath(); c.arc(b.x + 6, b.y - 3, 3, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(b.x + 8, b.y - 3); c.lineTo(b.x + 12, b.y - 2); c.lineTo(b.x + 8, b.y - 1); c.fill();
    c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.moveTo(b.x - 3, b.y - 2); c.lineTo(b.x - 9, b.y - 6 - flap); c.moveTo(b.x + 1, b.y - 2); c.lineTo(b.x - 2, b.y - 8 - flap); c.stroke();
  }
}
function drawFlies() {
  const c = ctx;
  for (const f of G.flies || []) {
    const x = LAMP.x + Math.cos(f.a) * f.r * 1.3, y = LAMP.y - 10 + Math.sin(f.a) * f.r * .7 + Math.sin(G.time * 2 + f.ph) * 10 + f.h;
    const a = .4 + .6 * Math.max(0, Math.sin(G.time * 3 + f.ph));
    c.fillStyle = 'rgba(240,220,120,' + a * .35 + ')'; c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,240,170,' + a + ')'; c.beginPath(); c.arc(x, y, 1.8, 0, TAU); c.fill();
  }
}

/* ---------- Per-frame hooks ---------- */
const _updExtras3 = updExtras;
updExtras = function (dt) {
  _updExtras3(dt);
  if (G.state === 'night') { const d = G.kills - (G.flareK ?? G.kills); G.flare = Math.min(FLARE_NEED, (G.flare || 0) + Math.max(0, d)); }
  G.flareK = G.kills;
  lampWatch(); printWatch(); updAmbient(dt);
};
const _draw3 = draw;
draw = function () {
  _draw3();
  useWorld();
  if (typeof paused !== 'undefined' && paused) return;
  if (G.state !== 'title') { drawLampLine(); drawPrint(); drawFlareBtn(); }
  drawWipe();
  drawCurseBtn();
};

/* ---------- Nicer music: a plucked zither with a soft filter, stereo spread and a long echo; a breathy flute by day ---------- */
let musEcho = null;
function musEchoBus() {
  if (musEcho || !AC || !musBus) return musEcho;
  const d = AC.createDelay(1.5), fb = AC.createGain(), lp = AC.createBiquadFilter(), wet = AC.createGain();
  d.delayTime.value = .42; fb.gain.value = .32; lp.type = 'lowpass'; lp.frequency.value = 1800; wet.gain.value = .35;
  d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(musBus);
  musEcho = d; return d;
}
musNote = function (t, n, vol) {
  if (!AC || !musBus || muted) return;
  const i5 = ((n % 5) + 5) % 5, oct = Math.floor(n / 5), fr = MUSIC_NOTE * Math.pow(2, (PENTA[i5] + 12 * oct) / 12), dur = 2.2;
  const g = AC.createGain(), f = AC.createBiquadFilter(), p = AC.createStereoPanner ? AC.createStereoPanner() : null;
  f.type = 'lowpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(Math.min(6000, fr * 9), t); f.frequency.exponentialRampToValueAtTime(Math.max(300, fr * 1.6), t + .5); // bright pluck that mellows
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(vol * .35, t + .25); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  for (const [type, mul, lv, det] of [['sawtooth', 1, .45, 0], ['triangle', 1, .8, 4], ['sine', 2, .25, -3]]) {
    const o = AC.createOscillator(), og = AC.createGain(); o.type = type; o.detune.value = det;
    o.frequency.setValueAtTime(fr * mul * 1.015, t); o.frequency.exponentialRampToValueAtTime(fr * mul, t + .09);
    og.gain.value = lv; o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + .05);
  }
  // a little bend at the end, like a zither string pressed after the pluck
  if (Math.random() < .25) { /* left to the ear: subtle */ }
  f.connect(g);
  let out = g; if (p) { p.pan.value = rand(-.5, .5); g.connect(p); out = p; }
  out.connect(musBus);
  const e = musEchoBus(); if (e) { const s = AC.createGain(); s.gain.value = .5; out.connect(s); s.connect(e); }
};
let musNextFlute = 0;
function musFlute(t) {
  if (!AC || !musBus || muted) return;
  const seq = [];
  let n = 5 + (Math.random() * 5 | 0); const len = 3 + (Math.random() * 3 | 0);
  for (let i = 0; i < len; i++) { seq.push(n); n += pick([-1, 1, 1, 2, -2]); }
  let at = t;
  for (const k of seq) {
    const i5 = ((k % 5) + 5) % 5, oct = Math.floor(k / 5), fr = MUSIC_NOTE * Math.pow(2, (PENTA[i5] + 12 * oct) / 12), d = rand(.6, 1.2);
    const o = AC.createOscillator(), g = AC.createGain(), vib = AC.createOscillator(), vg = AC.createGain();
    o.type = 'sine'; o.frequency.value = fr; vib.frequency.value = 5; vg.gain.value = fr * .008; vib.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(.0001, at); g.gain.linearRampToValueAtTime(.035, at + .18); g.gain.setValueAtTime(.035, at + d * .7); g.gain.linearRampToValueAtTime(.0001, at + d);
    o.connect(g); g.connect(musBus); const e = musEchoBus(); if (e) g.connect(e);
    o.start(at); vib.start(at); o.stop(at + d + .05); vib.stop(at + d + .05);
    if (noiseBuf) { const nz = AC.createBufferSource(), nf = AC.createBiquadFilter(), ng = AC.createGain(); nz.buffer = noiseBuf; nf.type = 'bandpass'; nf.frequency.value = fr * 2; nf.Q.value = 2; ng.gain.setValueAtTime(.0001, at); ng.gain.linearRampToValueAtTime(.012, at + .06); ng.gain.linearRampToValueAtTime(.0001, at + .3); nz.connect(nf); nf.connect(ng); ng.connect(musBus); nz.start(at); nz.stop(at + .35); }
    at += d * rand(.85, 1);
  }
}
const _musTick = musTick;
musTick = function () {
  _musTick();
  if (!AC || !musBus) return;
  const now = AC.currentTime, kind = musKind();
  if (kind !== 'calm') { musNextFlute = 0; return; }
  if (!musNextFlute) musNextFlute = now + rand(4, 8);
  if (now >= musNextFlute) { musFlute(now + .05); musNextFlute = now + rand(14, 24); }
};
