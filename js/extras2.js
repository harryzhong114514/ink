'use strict';
/* Second content pack: the Ink Well, the Seal hero, Mimic and Weaver, two adaptations,
   five relics and three more night events. Numbers and text are fallbacks:
   data/balance.js and data/text.js can override any of them with the same keys. */

/* ---------- Ink Well (7th building) ---------- */
BAL.build.well = BAL.build.well || { hp: 70, cost: { bamboo: 12, cinnabar: 14 }, range: 90, mark: 1.25 };
TXT.build.well = TXT.build.well || { name: 'Ink Well', short: 'Well', desc: 'Stains whatever walks near it. Stained enemies take 25% more damage from everything.' };
function wellRange(b) { return BAL.build.well.range * (1 + .15 * ((b.lv || 1) - 1)) * (G.mods.deepInk ? 1.3 : 1); }
function updWell(b, dt) {
  b.cd -= dt; if (b.cd > 0) return; b.cd = .4;
  const R = wellRange(b), mul = BAL.build.well.mark + .1 * ((b.lv || 1) - 1) + (G.mods.deepInk ? .15 : 0);
  for (const m of G.mons) if (!m.dead && !m.fly && Math.hypot(m.x - b.x, m.y - b.y) < R + m.r) { m.inkT = 2.5; m.inkMul = Math.max(m.inkMul || 1, mul); }
}
const _drawBuildIcon = drawBuildIcon;
drawBuildIcon = function (k, x, y, s = 1, a = 1) {
  if (k !== 'well') return _drawBuildIcon(k, x, y, s, a);
  const c = ctx; c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= a;
  c.fillStyle = INK; c.beginPath(); c.ellipse(0, 2, 18, 12, 0, 0, TAU); c.fill();
  c.strokeStyle = PAPER; c.lineWidth = 1.5; c.globalAlpha *= .5; const r = 4 + (G.time * 6 % 10);
  c.beginPath(); c.ellipse(0, 2, r, r * .65, 0, 0, TAU); c.stroke(); c.globalAlpha /= .5;
  c.fillStyle = RED; c.beginPath(); c.arc(6, -2, 2.5, 0, TAU); c.fill();
  c.restore();
};

/* ---------- The Seal (4th hero) ---------- */
BAL.hero.seal = BAL.hero.seal || { hp: 135, sp: 235, dmg: 30, cd: 0.72, range: 120, hitR: 46, burst: 45, burstR: 75, skillCd: 8, skillDmg: 40, skillR: 115, skillRange: 330, stun: 1.6 };
TXT.heroes.seal = TXT.heroes.seal || 'The Seal';
HERO_SKILL.seal = 'Seal';
function stampAt(h, B) {
  const a = h.face, px = h.x + Math.cos(a) * 70, py = h.y + Math.sin(a) * 70;
  let n = 0;
  for (const m of G.mons) if (!m.dead && Math.hypot(m.x - px, m.y - py) < B.hitR + m.r) {
    dmgMon(m, B.dmg * G.mods.heroDmg, 'phys', 'hero', m.x - h.x, m.y - h.y); n++;
    if (m.dead) continue;
    m.seals = (m.seals || 0) + 1;
    if (m.seals >= 3) { m.seals = 0; sealBurst(m, B); }
  }
  FX.rings.push && ring(px, py, B.hitR, RED, .35);
  pctx.fillStyle = RED; pctx.globalAlpha = .06; pctx.fillRect(px - 9, py - 9, 18, 18); pctx.globalAlpha = 1;
  thud(.25, 160); if (n) G.hitstop = Math.max(G.hitstop, .04);
}
function sealBurst(m, B) {
  for (const o of G.mons) if (!o.dead && Math.hypot(o.x - m.x, o.y - m.y) < B.burstR + o.r) dmgMon(o, B.burst * G.mods.heroDmg, 'phys', 'hero', o.x - m.x, o.y - m.y);
  ring(m.x, m.y, B.burstR, RED, .7); addShake(4); sfx('boom', .5, 1.4);
  addText('sealed', m.x, m.y - 30, 22, RED, .8);
}
function greatSeal(h, B, tx, ty) {
  const d = Math.hypot(tx - h.x, ty - h.y), k = d > B.skillRange ? B.skillRange / d : 1;
  const x = clamp(h.x + (tx - h.x) * k, 20, VW - 20), y = clamp(h.y + (ty - h.y) * k, 20, VH - 20);
  let n = 0;
  for (const m of G.mons) if (!m.dead && Math.hypot(m.x - x, m.y - y) < B.skillR + m.r) {
    if (G.mods.skillBurn) { m.burnT = Math.max(m.burnT, 3); m.burnDps = Math.max(m.burnDps, G.mods.skillBurn); }
    dmgMon(m, B.skillDmg * G.mods.heroDmg * (G.mods.skillDmg || 1), 'phys', 'hero', m.x - x, m.y - y);
    if (!m.dead && m.type !== 'boss') m.stunT = B.stun; n++;
  }
  pctx.save(); pctx.translate(x, y); pctx.rotate(rand(-.2, .2)); pctx.strokeStyle = RED; pctx.globalAlpha = .18; pctx.lineWidth = 8;
  pctx.strokeRect(-B.skillR * .7, -B.skillR * .7, B.skillR * 1.4, B.skillR * 1.4); pctx.restore(); pctx.globalAlpha = 1;
  ring(x, y, B.skillR, RED, .8); addShake(9); G.hitstop = Math.max(G.hitstop, .08); sfx('boom', .8, .9);
  if (n >= 3) addText(n + ' under the seal', x, y - 40, 28, RED, 1);
}
function drawSealHeld(c, x, y, a) {
  const ex = x + Math.cos(a) * 22, ey = y + Math.sin(a) * 22;
  c.strokeStyle = '#7a5a32'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); c.lineTo(ex, ey); c.stroke();
  c.save(); c.translate(ex, ey); c.rotate(a); c.fillStyle = RED; c.fillRect(0, -7, 10, 14); c.restore();
}
function sealOk() { return (G.meta.wins || 0) >= 1 || !!G.meta.dev; }
function heroList() { return G.meta.unlocks.archer ? ['sword', 'bow', 'brush', 'seal'] : ['sword', 'brush', 'seal']; }
function heroLocked(k) { return (k === 'brush' && !painterOk()) || (k === 'seal' && !sealOk()); }
function heroLockTag(k) { return k === 'seal' ? 'Win once' : 'Night 5'; }
function heroLockMsg(k) { return k === 'seal' ? 'Win a run to unlock' : 'Reach night 5 to unlock'; }
const _heroPick = heroPick;
heroPick = function () { return G.meta.hero === 'seal' && sealOk() ? 'seal' : _heroPick(); };

/* ---------- Two new enemies ---------- */
BAL.mon.mimic = Object.assign({ hp: 90, sp: 58, dmg: 16, r: 15, cost: 2.5, from: 5 }, BAL.mon.mimic || {});
BAL.mon.weaver = Object.assign({ hp: 55, sp: 52, dmg: 0, r: 13, cost: 2, from: 4, web: 125 }, BAL.mon.weaver || {});
TXT.mon.mimic = TXT.mon.mimic || { name: 'Mimic', desc: 'Stands among your towers pretending to be one. Your towers will not shoot it.' };
TXT.mon.weaver = TXT.mon.weaver || { name: 'Weaver', desc: 'Spins webs over your towers. Webbed towers fire at half speed.' };

function favTower() {
  const n = {}; for (const b of G.builds) if (b.type !== 'wall' && !isGround(b.type)) n[b.type] = (n[b.type] || 0) + 1;
  let best = 'arrow', bv = 0; for (const k in n) if (n[k] > bv) { bv = n[k]; best = k; }
  return best;
}
function hideMimic(m) {
  for (let i = 0; i < 40; i++) {
    const a = rand(TAU), d = rand(200, 330), x = clamp(LAMP.x + Math.cos(a) * d, 80, VW - 80), y = clamp(LAMP.y + Math.sin(a) * d, 180, VH - 200);
    if (grid[cellAt(x, y)]) continue;
    m.x = x; m.y = y; break;
  }
  m.disguise = true; m.mimicOf = favTower(); m.waitT = 9;
}
function revealMimic(m) {
  if (!m.disguise) return;
  m.disguise = false; m.sp *= 2.1; m.flash = .3;
  addText('Mimic!', m.x, m.y - 34, 28, RED, 1.2); ring(m.x, m.y, 50, RED, .6); sfx('roar', .5, 1.5);
}
function weave(m) {
  const R = BAL.mon.weaver.web, ts = G.builds.filter(b => b.type !== 'wall' && !isGround(b.type) && Math.hypot(b.x - m.x, b.y - m.y) < R);
  m.webs = ts;
  for (const b of ts) b.webT = .15;
  return ts.length > 0;
}

/* ---------- Monster hooks: stun, stain, mimic, weaver, decoys, Thick Ink ---------- */
const _spawnMon = spawnMon;
spawnMon = function (type, x, y, dir, opts) {
  const m = _spawnMon(type, x, y, dir, opts);
  if (type === 'mimic' && G.state === 'night') hideMimic(m);
  return m;
};
const _updMon = updMon;
updMon = function (m, dt) {
  if (m.inkT > 0) { m.inkT -= dt; if (m.inkT <= 0) m.inkMul = 1; }
  if (m.thick && m.slowT > 0) m.slowT -= dt * 1.5;
  if (m.isDecoy && m.age > 6) { m.dead = true; return; }
  if (m.stunT > 0) { m.stunT -= dt; m.age += dt; m.flash = Math.max(0, m.flash - dt); const dec = Math.pow(.015, dt); m.kx *= dec; m.ky *= dec; m.x += m.kx * dt; m.y += m.ky * dt; return; }
  if (m.disguise) {
    m.age += dt; m.waitT -= dt; m.flash = Math.max(0, m.flash - dt);
    if (m.waitT <= 0 || (!G.hero.down && Math.hypot(G.hero.x - m.x, G.hero.y - m.y) < 90)) revealMimic(m);
    return;
  }
  if (m.type === 'weaver' && weave(m)) { m.age += dt; m.x += m.kx * dt; m.y += m.ky * dt; m.kx *= .9; m.ky *= .9; return; }
  if (m.type === 'weaver') m.webs = null;
  _updMon(m, dt);
};
const _dmgMon = dmgMon;
dmgMon = function (m, amt, type, src, dx, dy) {
  if (m.dead) return;
  if (m.inkT > 0) amt *= m.inkMul || 1.25;
  if (G.mods.cracked && m.mirror) amt *= 1.3;
  if (G.mods.wetbrush && src === 'hero') { m.inkT = Math.max(m.inkT || 0, 1.5); m.inkMul = Math.max(m.inkMul || 1, 1.2); }
  if (m.disguise) revealMimic(m);
  if (m.decoy && src === 'hero') { m.decoy = false; spawnDecoys(m); }
  return _dmgMon(m, amt, type, src, dx, dy);
};
function spawnDecoys(m) {
  for (let k = 0; k < 2; k++) {
    const d = _spawnMon(m.type, m.x + rand(-24, 24), m.y + rand(-24, 24), m.dir, { small: true });
    d.decoy = false; d.isDecoy = true; d.hp = d.maxHp = 1; d.dmg = 0; d.armor = null; d.beh = null; d.fly = false;
    d.kx = rand(-240, 240); d.ky = rand(-240, 240);
  }
  splat(m.x, m.y, 6, 0, 0); ring(m.x, m.y, 30, INK, .4);
}
// Towers (and touch auto-aim) cannot see disguised mimics or hollow doubles
const _nearestMon = nearestMon;
nearestMon = function (x, y, R, pred) { return _nearestMon(x, y, R, m => !m.disguise && !m.isDecoy && (!pred || pred(m))); };

const _updBuild = updBuild;
updBuild = function (b, dt) {
  if (b.type === 'well') { b.age += dt; b.hitT = Math.max(0, b.hitT - dt); updWell(b, dt); return; }
  if (b.webT > 0) { b.webT -= dt; b.cd += dt * G.mods.rate * .5; }           // webbed: half speed
  if (G.inkRain > 0) b.cd -= dt * G.mods.rate * .3;                        // ink rain: 30% faster
  if (G.eclipse > 0) b.cd += dt * G.mods.rate * .2;                        // eclipse: 20% slower
  _updBuild(b, dt);
};

const _drawMon = drawMon;
drawMon = function (m) {
  if (m.disguise) {
    drawBuildIcon(m.mimicOf, m.x, m.y, 1, 1);
    if (Math.sin(m.age * 3.1) > .96) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(m.x - 4, m.y - 2, 1.6, 0, TAU); ctx.arc(m.x + 4, m.y - 2, 1.6, 0, TAU); ctx.fill(); } // a blink gives it away
    return;
  }
  const c = ctx;
  if (m.isDecoy) c.globalAlpha = .45;
  if (m.type === 'weaver' && m.webs) {
    c.strokeStyle = '#d8d0c0'; c.lineWidth = 1; c.globalAlpha = .55;
    for (const b of m.webs) for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(m.x, m.y); c.quadraticCurveTo((m.x + b.x) / 2 + k * 10, (m.y + b.y) / 2 - 10, b.x + k * 8, b.y); c.stroke(); }
    c.globalAlpha = 1;
  }
  _drawMon(m);
  if (m.type === 'weaver') {
    c.strokeStyle = INK; c.lineWidth = 1.6;
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + Math.sin(m.age * 8 + k) * .2; c.beginPath(); c.moveTo(m.x + Math.cos(a) * m.r * .7, m.y + Math.sin(a) * m.r * .7); c.lineTo(m.x + Math.cos(a) * (m.r + 8), m.y + Math.sin(a) * (m.r + 8) + 3); c.stroke(); }
  }
  c.globalAlpha = 1;
  if (m.inkT > 0) { c.strokeStyle = INK; c.globalAlpha = .55; c.lineWidth = 3; c.setLineDash([3, 4]); c.beginPath(); c.arc(m.x, m.y, m.r + 7, 0, TAU); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; }
  if (m.seals) for (let k = 0; k < m.seals; k++) { c.fillStyle = RED; c.fillRect(m.x - 8 + k * 7, m.y - m.r - 14, 5, 5); }
  if (m.stunT > 0) { c.save(); c.translate(m.x, m.y - m.r - 16); c.rotate(G.time * 3); c.strokeStyle = RED; c.lineWidth = 2; c.strokeRect(-5, -5, 10, 10); c.restore(); }
};

/* ---------- Two new adaptations ---------- */
EVO_COL.thick = QING; EVO_COL.decoy = INK;
TXT.evo.thick = TXT.evo.thick || { name: 'Thick Ink', why: 'Your frost held them too long.', weak: 'Slows slide off fast. Lightning bites deeper.' };
TXT.evo.decoy = TXT.evo.decoy || { name: 'Ink Doubles', why: 'You hunted them yourself.', weak: 'The doubles are hollow and harmless. Towers see through them.' };
EV_TXT.thick = EV_TXT.thick || 'Frost slowed them {n} times.';
EV_TXT.decoy = EV_TXT.decoy || 'You made {n}% of the kills yourself.';
function extraEvoCands(s, cands) {
  const hits = s.slowHits || 0, spawned = Math.max(20, s.spawned || 0);
  if (G.night >= 3 && hits / spawned > 1.2) cands.push({ key: 'thick', score: .4 + Math.min(.4, hits / spawned / 10), ev: fmt(EV_TXT.thick, { n: hits }) });
  const hk = s.kills ? s.heroKills / s.kills : 0;
  if (G.night >= 3 && hk > .5 && s.kills >= 15) cands.push({ key: 'decoy', score: hk - .5 + .35, ev: fmt(EV_TXT.decoy, { n: pct(hk) }) });
}
const _applyEvo = applyEvo;
applyEvo = function (m) {
  _applyEvo(m);
  if (m.type === 'boss' || m.isDecoy) return;
  const small = m.type === 'blob' || m.type === 'swift';
  if (G.evo.thick && (small || m.type === 'brute') && Math.random() < .6) { m.thick = true; m.res.zap *= 1.25; }
  if (G.evo.decoy && small && Math.random() < .35) m.decoy = true;
};

/* ---------- Five relics ---------- */
Object.assign(TXT.relic, {
  deepInk: TXT.relic.deepInk || { name: 'Deep Ink', desc: 'Ink Wells reach 30% farther and stain 15% deeper.' },
  stargazer: TXT.relic.stargazer || { name: 'Star Chart', desc: 'Something happens every night. Fallen stars hold twice as much.' },
  cracked: TXT.relic.cracked || { name: 'Cracked Mirror', desc: 'Once the boss turns into a mirror, you hit it 30% harder.' },
  wetbrush: TXT.relic.wetbrush || { name: 'Wet Brush', desc: 'Your own hits stain enemies for a moment.' },
  vow: TXT.relic.vow || { name: 'Vermilion Vow', desc: 'Every 25 kills, the lamp mends a little.' }
});
Object.assign(RELIC_FX, {
  deepInk: () => G.mods.deepInk = true,
  stargazer: () => G.mods.stargazer = true,
  cracked: () => G.mods.cracked = true,
  wetbrush: () => G.mods.wetbrush = true,
  vow: () => { G.mods.vow = true; G.vowAt = Math.ceil((G.kills + 1) / 25) * 25; }
});
UNIQUE.push('deepInk', 'stargazer', 'cracked', 'wetbrush', 'vow');

/* ---------- Three more night events ---------- */
NIGHT_EVENTS.push('eclipse', 'inkrain', 'merchant');
const _fireNightEvent = fireNightEvent;
fireNightEvent = function (e) {
  if (e.k === 'eclipse') { e.done = true; G.eclipse = 12; addText('Eclipse. Your towers falter.', VW / 2, 330, 34, GREY, 2.4); sfx('roar', .5, .5); return; }
  if (e.k === 'inkrain') { e.done = true; G.inkRain = 12; addText('Ink rain. Your towers quicken.', VW / 2, 330, 34, QING, 2.4); sfx('spell', .6, 1.2); return; }
  if (e.k === 'merchant') {
    e.done = true;
    const a = rand(TAU); G.merchant = { x: clamp(LAMP.x + Math.cos(a) * 190, 100, VW - 100), y: clamp(LAMP.y + Math.sin(a) * 150, 200, VH - 220), t: 22, msgT: 0 };
    addText('A lost merchant. 15 cinnabar mends the lamp.', VW / 2, 330, 30, GOLD, 2.6); sfx('coin', .6);
    return;
  }
  _fireNightEvent(e);
};
const _updExtras = updExtras;
updExtras = function (dt) {
  _updExtras(dt);
  if (G.eclipse > 0) G.eclipse -= dt;
  if (G.inkRain > 0) { G.inkRain -= dt; if (Math.random() < .5 && FX.parts.length < 420) FX.parts.push({ x: rand(VW), y: rand(VH), vx: -30, vy: 260, life: .4, r: 1.6, color: INK }); }
  if (G.state !== 'night') { G.eclipse = 0; G.inkRain = 0; G.merchant = null; }
  const mc = G.merchant, h = G.hero;
  if (mc) {
    mc.t -= dt; mc.msgT -= dt;
    if (mc.t <= 0) G.merchant = null;
    else if (!h.down && Math.hypot(h.x - mc.x, h.y - mc.y) < 50) {
      if (G.res.cinnabar >= 15 && LAMP.hp < LAMP.maxHp) {
        G.res.cinnabar -= 15; LAMP.hp = Math.min(LAMP.maxHp, LAMP.hp + LAMP.maxHp * .25);
        addText('The lamp is mended.', LAMP.x, LAMP.y - 70, 26, GOLD, 1.8); sfx('coin', 1); G.merchant = null;
      } else if (mc.msgT <= 0) { mc.msgT = 2; addText(LAMP.hp >= LAMP.maxHp ? 'The lamp needs nothing.' : 'Needs 15 cinnabar.', mc.x, mc.y - 40, 20, GREY, 1.2); }
    }
  }
  if (G.mods.vow && G.kills >= (G.vowAt || 25)) {
    G.vowAt = (G.vowAt || 25) + 25; LAMP.hp = Math.min(LAMP.maxHp, LAMP.hp + LAMP.maxHp * .04);
    addText('+ lamp', LAMP.x, LAMP.y - 60, 18, GOLD, 1);
  }
};
const _drawNightEvent = drawNightEvent;
drawNightEvent = function () {
  _drawNightEvent();
  const mc = G.merchant, c = ctx;
  if (mc) {
    const fade = Math.min(1, mc.t / 2);
    G.lights.push({ x: mc.x, y: mc.y, r: 90, t: .05 });
    c.globalAlpha = fade; c.fillStyle = INK; c.beginPath(); c.ellipse(mc.x, mc.y + 2, 11, 13, 0, 0, TAU); c.fill();
    c.fillStyle = '#7a5a32'; c.fillRect(mc.x + 8, mc.y - 10, 16, 18);                         // pack
    c.fillStyle = GOLD; c.beginPath(); c.arc(mc.x - 14, mc.y - 16, 5 + Math.sin(G.time * 5), 0, TAU); c.fill(); // lantern
    c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.moveTo(mc.x - 8, mc.y - 6); c.lineTo(mc.x - 14, mc.y - 16); c.stroke();
    text('15 cinnabar', mc.x, mc.y + 30, 15, GOLD, 'center', .9 * fade, 'rgba(10,12,20,.5)', 'italic');
    c.globalAlpha = 1;
  }
  if (G.eclipse > 0) { c.fillStyle = 'rgba(5,6,12,' + .28 * Math.min(1, G.eclipse / 1.5) + ')'; c.fillRect(0, 0, VW, VH); }
};
