'use strict';
/* Painter hero, the Boss's mirror phase, and random night events.
   Numbers live here as fallbacks so data/balance.js and data/text.js stay untouched;
   C or A can override them by writing BAL.hero.brush / TXT.heroes.brush there. */

/* ---------- 9. The Painter ---------- */
BAL.hero.brush = BAL.hero.brush || { hp: 105, sp: 255, dmg: 14, cd: 0.42, range: 330, aoe: 46, skillCd: 7, skillDmg: 30, skillLen: 300, wallT: 6, wallDps: 14 };
TXT.heroes.brush = TXT.heroes.brush || 'The Painter';
const HERO_SKILL = { sword: 'Dash', bow: 'Rain', brush: 'Paint' };

function painterOk() { return (G.meta.best || 0) >= 5 || !!G.meta.dev; }
function heroPick() {
  const k = G.meta.hero;
  if (k === 'bow' && G.meta.unlocks.archer) return 'bow';
  if (k === 'brush' && painterOk()) return 'brush';
  return 'sword';
}
function heroList() { return G.meta.unlocks.archer ? ['sword', 'bow', 'brush'] : ['sword', 'brush']; }
function heroLocked(k) { return k === 'brush' && !painterOk(); }

// Attack: a blot of ink that bursts where it lands and slows what it splashes
function throwBlot(h, B) {
  const a = h.face + rand(-.04, .04), sp = 760;
  G.projs.push({ kind: 'blot', x: h.x + Math.cos(a) * 14, y: h.y + Math.sin(a) * 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: B.dmg * G.mods.heroDmg, life: B.range / sp });
  whoosh(.14, 1.5);
}
function blotFly(p) {
  for (const m of G.mons) if (!m.dead && Math.hypot(m.x - p.x, m.y - p.y) < m.r + 7) { p.dead = true; blotBurst(p); return; }
  if (p.life <= .02) { p.dead = true; blotBurst(p); }
}
function blotBurst(p) {
  const R = BAL.hero.brush.aoe;
  for (const m of G.mons) if (!m.dead && Math.hypot(m.x - p.x, m.y - p.y) < R + m.r) {
    dmgMon(m, p.dmg, 'phys', 'hero', m.x - p.x, m.y - p.y);
    if (!m.dead) m.slowT = Math.max(m.slowT, .8);
  }
  splat(p.x, p.y, rand(7, 11), p.vx * .002, p.vy * .002);
  if (FX.rings.length < 40) ring(p.x, p.y, R, INK, .22);
}

// Skill: paint a stroke that stands as a wall for a few seconds. Walkers cannot cross it and take damage while pressed against it
function paintWall(h, B, tx, ty) {
  const a = Math.atan2(ty - h.y, tx - h.x), L = Math.min(B.skillLen, Math.max(120, Math.hypot(tx - h.x, ty - h.y)));
  // The stroke runs across the aim line, centred on the aim point, so it reads as "a wall over there"
  const cx = clamp(h.x + Math.cos(a) * Math.min(L, 160), 20, VW - 20), cy = clamp(h.y + Math.sin(a) * Math.min(L, 160), 20, VH - 20);
  const px = -Math.sin(a), py = Math.cos(a), half = B.skillLen / 2;
  const w = { x0: cx - px * half, y0: cy - py * half, x1: cx + px * half, y1: cy + py * half, t: B.wallT, max: B.wallT };
  (G.inkWalls = G.inkWalls || []).push(w);
  if (G.inkWalls.length > 3) G.inkWalls.shift();
  let n = 0;
  for (const m of G.mons) if (!m.dead && segDist(m.x, m.y, w.x0, w.y0, w.x1, w.y1) < m.r + 14) {
    if (G.mods.skillBurn) { m.burnT = Math.max(m.burnT, 3); m.burnDps = Math.max(m.burnDps, G.mods.skillBurn); }
    dmgMon(m, B.skillDmg * G.mods.heroDmg * (G.mods.skillDmg || 1), 'phys', 'hero', m.x - cx, m.y - cy); n++;
  }
  brush(pctx, w.x0, w.y0, w.x1, w.y1, 16, INK, .08);
  whoosh(.5, .8); addShake(3);
  if (n >= 3) addText(n + ' caught in the stroke', cx, cy - 30, 26, RED, 1);
}
function closestOn(px, py, w) {
  const dx = w.x1 - w.x0, dy = w.y1 - w.y0, l2 = dx * dx + dy * dy || 1;
  const s = clamp(((px - w.x0) * dx + (py - w.y0) * dy) / l2, 0, 1);
  return [w.x0 + dx * s, w.y0 + dy * s];
}
function updInkWalls(dt) {
  if (!G.inkWalls || !G.inkWalls.length) return;
  const B = BAL.hero.brush;
  for (const w of G.inkWalls) {
    w.t -= dt;
    for (const m of G.mons) {
      if (m.dead || m.fly || m.type === 'boss') continue;
      const [qx, qy] = closestOn(m.x, m.y, w), dx = m.x - qx, dy = m.y - qy, d = Math.hypot(dx, dy), min = m.r + 9;
      if (d >= min) continue;
      const ux = d ? dx / d : 0, uy = d ? dy / d : 1;
      m.x = qx + ux * min; m.y = qy + uy * min;
      m.inkTick = (m.inkTick || 0) - dt;
      if (m.inkTick <= 0) { m.inkTick = .5; dmgMon(m, B.wallDps * .5 * G.mods.heroDmg * (G.mods.skillDmg || 1), 'phys', 'hero', ux, uy); }
    }
  }
  G.inkWalls = G.inkWalls.filter(w => w.t > 0);
}
function inkBlocks(p) {
  if (!G.inkWalls) return false;
  for (const w of G.inkWalls) if (segDist(p.x, p.y, w.x0, w.y0, w.x1, w.y1) < 9) { splat(p.x, p.y, 4, p.vx, p.vy); return true; }
  return false;
}
function drawInkWalls() {
  if (!G.inkWalls) return;
  for (const w of G.inkWalls) {
    const k = clamp(w.t / w.max, 0, 1), a = .85 * Math.min(1, w.t / .6);
    brush(ctx, w.x0, w.y0, w.x1, w.y1, 13 + 4 * k, INK, a);
    brush(ctx, w.x0 + 3, w.y0 - 2, w.x1 - 3, w.y1 + 2, 4, RED, a * .35);
  }
}
function drawBrushHeld(c, x, y, a) {
  c.strokeStyle = '#7a5a32'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); c.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 26); c.stroke();
  c.fillStyle = INK; c.beginPath(); c.ellipse(x + Math.cos(a) * 30, y + Math.sin(a) * 30, 5, 3, a, 0, TAU); c.fill();
}
function drawBlot(c, p) {
  c.fillStyle = INK; c.beginPath(); c.arc(p.x, p.y, 7, 0, TAU); c.fill();
  c.globalAlpha = .4; c.beginPath(); c.arc(p.x - p.vx * .012, p.y - p.vy * .012, 4.5, 0, TAU); c.fill(); c.globalAlpha = 1;
}

/* ---------- 10. The Mirror: at half health the Boss turns your favourite damage against you ---------- */
const EL_NAME = { phys: 'BLADES', fire: 'FIRE', ice: 'FROST', zap: 'LIGHTNING' };
const EL_COL = { phys: '#3a3530', fire: '#c8402a', ice: '#4f8fa8', zap: '#c9a033' };
function bossMirror(m) {
  if (m.mirror || m.hp > m.maxHp * .5) return;
  const d = (G.stats && G.stats.dmg) || {};
  let best = 'phys', bv = -1;
  for (const k of ['phys', 'fire', 'ice', 'zap']) if ((d[k] || 0) > bv) { bv = d[k] || 0; best = k; }
  m.mirror = best; m.res[best] = (m.res[best] || 1) * .6; m.waveT = 1.2; m.spawnT = Math.min(m.spawnT, 2);
  addText('The Mirror', VW / 2, 250, 56, EL_COL[best], 2.8);
  addText('It answers your ' + EL_NAME[best] + ' with its own.', VW / 2, 300, 24, EL_COL[best], 3.2);
  addShake(16); G.hitstop = Math.max(G.hitstop, .25); sfx('roar', .9, .8);
  ring(m.x, m.y, 220, EL_COL[best], .8);
}
// Extra effect of a mirror wave, fired alongside the normal ring of ink
function mirrorWave(m) {
  if (m.mirror === 'zap') {
    const ts = G.builds.filter(b => b.type !== 'wall' && b.type !== 'rock').sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y)).slice(0, 2);
    for (const b of ts) { zig(m.x, m.y, b.x, b.y); hurtBuild(b, 28); }
  } else if (m.mirror === 'phys') {
    const h = G.hero; if (h.down) return;
    const a0 = Math.atan2(h.y - m.y, h.x - m.x);
    for (let k = -2; k <= 2; k++) { const a = a0 + k * .12; G.projs.push({ kind: 'ink', hostile: true, el: 'phys', x: m.x, y: m.y, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, dmg: 10, life: 4 }); }
  }
}

/* ---------- 11. Night events: one small surprise on some nights ---------- */
const NIGHT_EVENTS = ['star', 'fog', 'gust'];
const DIR_NAME = ['north', 'east', 'south', 'west'];
function planNightEvent() {
  G.nev = null; G.stars = []; G.fog = null;
  if (G.night < 2 || G.bossNight || Math.random() > (G.mods.stargazer ? 1.01 : .7)) return;
  G.nev = { k: NIGHT_EVENTS[Math.random() * NIGHT_EVENTS.length | 0], at: nightLen(G.night) * rand(.3, .45), done: false };
}
function fireNightEvent(e) {
  e.done = true;
  if (e.k === 'star') {
    let x = 0, y = 0;
    for (let i = 0; i < 30; i++) {
      const a = rand(TAU), d = rand(170, 380); x = clamp(LAMP.x + Math.cos(a) * d, 80, VW - 80); y = clamp(LAMP.y + Math.sin(a) * d, 200, VH - 200);
      const c = grid[cellAt(x, y)]; if (!c) break;
    }
    G.stars.push({ x, y, t: 0, life: 22 });
    addText('A star falls. Pick it up.', VW / 2, 330, 34, GOLD, 2.4); sfx('spell', .7, .7);
  } else if (e.k === 'fog') {
    const d = Math.random() * 4 | 0; G.fog = { d, t: 14 };
    addText('Fog rolls in from the ' + DIR_NAME[d] + '.', VW / 2, 330, 34, GREY, 2.4); sfx('roar', .4, .6);
  } else {
    let n = 0;
    for (const m of G.mons) {
      if (m.dead || m.type === 'boss') continue;
      const dx = m.x - LAMP.x, dy = m.y - LAMP.y, d = Math.hypot(dx, dy) || 1;
      if (d < 460) { m.kx += dx / d * 620; m.ky += dy / d * 620; n++; }
    }
    ring(LAMP.x, LAMP.y, 460, GOLD, .7); addShake(8);
    addText('The lamp breathes out.' + (n ? ' ' + n + ' blown back.' : ''), VW / 2, 330, 34, GOLD, 2.4); sfx('boom', .6, 1.3);
  }
}
function updNightEvent(dt) {
  if (G.state !== 'night') { G.stars = []; G.fog = null; return; }
  if (G.nev && !G.nev.done && G.phaseT >= G.nev.at) fireNightEvent(G.nev);
  if (G.fog) { G.fog.t -= dt; if (G.fog.t <= 0) G.fog = null; }
  if (!G.stars) return;
  const h = G.hero;
  for (const s of G.stars) {
    s.t += dt;
    if (s.t > .8 && !h.down && Math.hypot(h.x - s.x, h.y - s.y) < 44) {
      const x2 = G.mods.stargazer ? 2 : 1; s.life = 0; G.res.bamboo += 12 * x2; G.res.stone += 10 * x2; G.res.cinnabar += 8 * x2;
      addText('+' + 12 * x2 + ' bamboo  +' + 10 * x2 + ' stone  +' + 8 * x2 + ' cinnabar', s.x, s.y - 40, 20, GOLD, 1.8); sfx('coin', 1);
    }
  }
  G.stars = G.stars.filter(s => s.t < s.life);
}
function drawNightEvent() {
  if (G.stars) for (const s of G.stars) {
    const c = ctx;
    if (s.t < .8) { const k = s.t / .8, sx = s.x + 300 * (1 - k), sy = s.y - 500 * (1 - k); beam(sx + 40, sy - 60, sx, sy, GOLD, 3, .25); continue; }
    const pulse = 1 + .15 * Math.sin(G.time * 6), fade = Math.min(1, (s.life - s.t) / 3);
    const g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, 70 * pulse); g.addColorStop(0, 'rgba(255,220,130,' + .55 * fade + ')'); g.addColorStop(1, 'rgba(255,220,130,0)');
    c.fillStyle = g; c.fillRect(s.x - 80, s.y - 80, 160, 160);
    c.globalAlpha = fade; c.fillStyle = '#ffd77a'; c.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5 + G.time * .6, r = (k % 2 ? 9 : 24) * pulse; c.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r); }
    c.closePath(); c.fill(); c.globalAlpha = 1;
    G.lights.push({ x: s.x, y: s.y, r: 120, t: .05 });
  }
}
function drawFog() {
  const f = G.fog; if (!f) return;
  const a = .8 * Math.min(1, f.t / 1.5, (14 - f.t) / 1.5 + .001), D = 420, c = ctx;
  const g = f.d === 0 ? c.createLinearGradient(0, 0, 0, D) : f.d === 2 ? c.createLinearGradient(0, VH, 0, VH - D) : f.d === 1 ? c.createLinearGradient(VW, 0, VW - D, 0) : c.createLinearGradient(0, 0, D, 0);
  g.addColorStop(0, 'rgba(205,200,188,' + a * .85 + ')'); g.addColorStop(1, 'rgba(205,200,188,0)');
  c.fillStyle = g;
  if (f.d === 0) c.fillRect(0, 0, VW, D); else if (f.d === 2) c.fillRect(0, VH - D, VW, D); else if (f.d === 1) c.fillRect(VW - D, 0, D, VH); else c.fillRect(0, 0, D, VH);
}

function updExtras(dt) { updInkWalls(dt); updNightEvent(dt); }

/* ---------- 2. Pause button on phones ---------- */
function drawPauseBtn() {
  if (!TOUCH || (G.state !== 'day' && G.state !== 'night')) return;
  const x = VW - 56, y = 300, r = 28, night = G.state === 'night';
  btn(x - r, y - r, r * 2, r * 2, () => { if (typeof setPaused === 'function') setPaused(true); });
  ctx.globalAlpha = .7; panel(x - r, y - r, r * 2, r * 2, .85); ctx.globalAlpha = 1;
  ctx.fillStyle = night ? INK : INK; ctx.fillRect(x - 9, y - 11, 6, 22); ctx.fillRect(x + 3, y - 11, 6, 22);
}
