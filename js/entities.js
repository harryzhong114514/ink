'use strict';
/* 英雄、怪、塔、子弹、伤害结算 */
const DIRS = ['N', 'E', 'S', 'W'];
const dirOfPoint = (x, y) => { const a = Math.atan2(y - LAMP.y, (x - LAMP.x) * .56); return a < -Math.PI * .75 || a > Math.PI * .75 ? 3 : a < -Math.PI * .25 ? 0 : a < Math.PI * .25 ? 1 : 2; };
const segDist = (px, py, x0, y0, x1, y1) => {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - x0 - dx * t, py - y0 - dy * t);
};
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); };

/* ---------- 新怪：Leech 与 Herald ----------
   数值和文案写在这里兜底；组员在 data/ 里写同名条目就覆盖（只补缺失的字段，不覆盖整个对象）。
   Leech：贴上塔就不动了，那座塔停火，直到它被打死。第 3 夜起。
   Herald：自己不打人，身边的怪走得更快；它一倒，加速当场消失。第 4 夜起。 */
BAL.mon.leech = Object.assign({ hp: 26, sp: 84, dmg: 0, r: 11, cost: 1.2, from: 3 }, BAL.mon.leech || {});
BAL.mon.herald = Object.assign({ hp: 70, sp: 46, dmg: 0, r: 15, cost: 2.2, from: 4, aura: 130, haste: 1.3 }, BAL.mon.herald || {});
TXT.mon.leech = TXT.mon.leech || { name: 'Leech', desc: 'Clings to a tower and keeps it silent.' };
TXT.mon.herald = TXT.mon.herald || { name: 'Herald', desc: 'Quickens whatever walks beside it.' };

/* ---------- 英雄 ---------- */
function makeHero(type) {
  const B = BAL.hero[type];
  return { type, x: LAMP.x, y: LAMP.y + 70, hp: B.hp, maxHp: B.hp, cd: 0, skillCd: 0, down: false, downT: 0, inv: 0, face: 0, dash: null,
    echoT: 0, echo: null, rain: null, scarf: Array.from({ length: 9 }, () => ({ x: LAMP.x, y: LAMP.y + 70 })), walk: 0, hitT: 0 };
}
function hurtHero(d, sx, sy) {
  const h = G.hero; if (h.down || h.inv > 0 || h.dash) return;
  h.hp -= d; h.inv = .45; h.hitT = .15; G.combo = 0; addShake(5); thud(.4, 120);
  FX.flash = .35; FX.flashCol = RED;
  const dx = h.x - sx, dy = h.y - sy, l = Math.hypot(dx, dy) || 1; h.x += dx / l * 14; h.y += dy / l * 14;
  if (h.hp <= 0) {
    h.down = true; h.downT = BAL.hero.respawn; G.stats.heroDowns++; addText(TXT.ui.down, h.x, h.y - 40, 26, RED, 2.2);
    splat(h.x, h.y, 16, 0, 1, RED);
  }
}
function updHero(dt, rdt) {
  const h = G.hero, B = BAL.hero[h.type];
  h.inv = Math.max(0, h.inv - dt); h.hitT = Math.max(0, h.hitT - dt); h.slowT = Math.max(0, (h.slowT || 0) - dt);
  h.cd -= dt; h.skillCd -= dt;
  if (h.down) {
    h.downT -= dt;
    if (h.downT <= 0) { h.down = false; h.hp = h.maxHp; h.x = LAMP.x; h.y = LAMP.y + 60; h.inv = 1.5; addText(TXT.ui.revive, h.x, h.y - 40, 22, INK, 1.2); }
    return;
  }
  h.face = Math.atan2(mouse.y - h.y, mouse.x - h.x);
  // 触屏：面朝最近的怪并自动出手（手机上没有"按住左键"）
  let auto = false;
  if (TOUCH) { const m = nearestMon(h.x, h.y, (h.type === 'sword' ? B.range * (G.mods.reach || 1) : B.range * .8)); if (m) { h.face = Math.atan2(m.y - h.y, m.x - h.x); auto = true; } else if (joy.dx || joy.dy) h.face = Math.atan2(joy.dy, joy.dx); }
  if (h.dash) {
    const d = h.dash; d.t += dt / .1;
    const k = Math.min(1, d.t), s = 1 - (1 - k) * (1 - k);
    h.x = d.x0 + (d.x1 - d.x0) * s; h.y = d.y0 + (d.y1 - d.y0) * s;
    if (k >= 1) h.dash = null;
  } else {
    let mx = 0, my = 0;
    if (keys.KeyW || keys.ArrowUp) my--; if (keys.KeyS || keys.ArrowDown) my++;
    if (keys.KeyA || keys.ArrowLeft) mx--; if (keys.KeyD || keys.ArrowRight) mx++;
    if (joy.id !== null) { mx += joy.dx; my += joy.dy; }
    const l = Math.hypot(mx, my);
    if (l) { const sp = B.sp * G.mods.sp * Math.min(1, l) * (h.slowT > 0 ? .6 : 1); h.x += mx / l * sp * dt; h.y += my / l * sp * dt; h.walk += dt * 10; }
    h.x = clamp(h.x, 16, VW - 16); h.y = clamp(h.y, 16, VH - 16);
  }
  // 攻击
  if ((mouse.down && !G.buildSel && !TOUCH || auto) && h.cd <= 0) {
    h.cd = B.cd;
    if (h.type === 'sword') swordSwing(h, B); else if (h.type === 'brush') throwBlot(h, B); else if (h.type === 'seal') stampAt(h, B); else shootArrow(h, B);
  }
  // 技能
  if (pressed.Space && h.skillCd <= 0) {
    h.skillCd = B.skillCd * (G.mods.skillCd || 1);
    if (G.state === 'night') G.stats.skillUses++; // 悬赏：今夜用没用技能
    if (h.type === 'sword') swordDash(h, B, h.face); else if (h.type === 'seal') { const aim = TOUCH ? (nearestMon(h.x, h.y, B.skillRange) || { x: h.x + Math.cos(h.face) * 200, y: h.y + Math.sin(h.face) * 200 }) : mouse; greatSeal(h, B, aim.x, aim.y); } else if (h.type === 'brush') { const aim = TOUCH ? { x: h.x + Math.cos(h.face) * 160, y: h.y + Math.sin(h.face) * 160 } : mouse; paintWall(h, B, aim.x, aim.y); } else arrowRain(mouse.x, mouse.y);
    if (G.mods.echo) h.echo = { t: .55, a: h.face, x: mouse.x, y: mouse.y };
  }
  if (h.echo) { h.echo.t -= dt; if (h.echo.t <= 0) { const e = h.echo; h.echo = null; if (h.type === 'sword') swordDash(h, B, e.a, true); else if (h.type === 'brush') paintWall(h, B, e.x, e.y); else if (h.type === 'seal') greatSeal(h, B, e.x, e.y); else arrowRain(e.x, e.y); } }
  if (h.rain) {
    const r = h.rain; r.t -= dt;
    if (r.t <= 0 && r.n > 0) {
      r.n--; r.t = .1;
      for (const m of G.mons) if (!m.dead && Math.hypot(m.x - r.x, m.y - r.y) < BAL.hero.bow.skillR + m.r) (G.mods.skillBurn && (m.burnT = Math.max(m.burnT, 3), m.burnDps = Math.max(m.burnDps, G.mods.skillBurn))), dmgMon(m, B.skillDmg * G.mods.heroDmg * (G.mods.skillDmg || 1), 'phys', 'hero', m.x - r.x, m.y - r.y);
      for (let k = 0; k < 5; k++) { const a = rand(TAU), d = rand(BAL.hero.bow.skillR); const x = r.x + Math.cos(a) * d, y = r.y + Math.sin(a) * d; beam(x - 16, y - 40, x, y, INK, 2, .15); }
      whoosh(.12, 1.6);
    }
    if (r.n <= 0) h.rain = null;
  }
  // 围巾
  h.scarf[0].x = h.x; h.scarf[0].y = h.y;
  const k = Math.min(1, rdt * 20);
  for (let i = 1; i < h.scarf.length; i++) {
    const a = h.scarf[i - 1], b = h.scarf[i];
    b.x += (a.x - 4 + Math.sin(G.time * 5 + i) * 1.5 - b.x) * k;
    b.y += (a.y + 1.5 + Math.cos(G.time * 4 + i * .8) * 2 - b.y) * k;
  }
}
function swordSwing(h, B) {
  const a = h.face, R = B.range * (G.mods.reach || 1);
  let n = 0;
  for (const m of G.mons) {
    if (m.dead) continue;
    const d = Math.hypot(m.x - h.x, m.y - h.y);
    if (d < R + m.r && (d < m.r + 10 || angDiff(Math.atan2(m.y - h.y, m.x - h.x), a) < B.arc / 2)) {
      dmgMon(m, B.dmg * G.mods.heroDmg, 'phys', 'hero', m.x - h.x, m.y - h.y); n++;
      if (m.type !== 'boss') { m.kx += Math.cos(a) * 220; m.ky += Math.sin(a) * 220; }
    }
  }
  FX.arcs.push({ x: h.x, y: h.y, r: R * .85, a, arc: B.arc, t: 0, dur: .28, col: INK }); FX.arcs.push({ x: h.x, y: h.y, r: R * .6, a: a + .12, arc: B.arc * .8, t: 0, dur: .2, col: RED });
  whoosh(.2, 1.2); // 挥空只有这一声；打中时 dmgMon 里会再叠一声闷响
  h.x += Math.cos(a) * 6; h.y += Math.sin(a) * 6;
  if (n) G.hitstop = Math.max(G.hitstop, .025);
}
function swordDash(h, B, a, echo) {
  const x0 = h.x, y0 = h.y, x1 = clamp(x0 + Math.cos(a) * B.skillRange, 20, VW - 20), y1 = clamp(y0 + Math.sin(a) * B.skillRange, 20, VH - 20);
  if (!echo) { h.dash = { x0, y0, x1, y1, t: 0 }; h.inv = Math.max(h.inv, .3); }
  const sx = echo ? h.x : x0, sy = echo ? h.y : y0;
  const ex = echo ? clamp(sx + Math.cos(a) * B.skillRange, 20, VW - 20) : x1, ey = echo ? clamp(sy + Math.sin(a) * B.skillRange, 20, VH - 20) : y1;
  let n = 0;
  for (const m of G.mons) if (!m.dead && segDist(m.x, m.y, sx, sy, ex, ey) < m.r + 26) { if (G.mods.skillBurn) { m.burnT = Math.max(m.burnT, 3); m.burnDps = Math.max(m.burnDps, G.mods.skillBurn); } dmgMon(m, B.skillDmg * G.mods.heroDmg * (G.mods.skillDmg || 1), 'phys', 'hero', ex - sx, ey - sy); n++; }
  FX.lines.push({ x0: sx, y0: sy, x1: ex, y1: ey, col: echo ? QING : INK, w: 24, t: 0, dur: .4, brush: true });
  brush(pctx, sx, sy, ex, ey, 18, echo ? QING : INK, .1);
  (G.trails = G.trails || []).push({ x0: sx, y0: sy, x1: ex, y1: ey, t: 1.4 });
  whoosh(.55, echo ? 1.3 : .9); addShake(4);
  for (let k = 0; k < 10 && FX.parts.length < 420; k++) { const s = k / 10; FX.parts.push({ x: sx + (ex - sx) * s + rand(-6, 6), y: sy + (ey - sy) * s + rand(-6, 6), vx: rand(-30, 30), vy: rand(-30, 30), life: .45, r: rand(2, 4), color: echo ? QING : INK }); } // 冲刺路上的墨点残影
  if (n >= 3) addText(n + ' in one stroke', (sx + ex) / 2, (sy + ey) / 2 - 30, 28, RED, 1);
  if (n) G.hitstop = Math.max(G.hitstop, .06);
}
function shootArrow(h, B) {
  const a = h.face + rand(-.03, .03);
  G.projs.push({ kind: 'harrow', x: h.x + Math.cos(a) * 14, y: h.y + Math.sin(a) * 14, vx: Math.cos(a) * 1100, vy: Math.sin(a) * 1100, dmg: B.dmg * G.mods.heroDmg, pierce: B.pierce, hit: new Set(), life: B.range / 1100 });
  whoosh(.12, 2);
}
function arrowRain(x, y) { G.hero.rain = { x, y, n: 6, t: .15 }; ring(x, y, BAL.hero.bow.skillR, INK, .5); }

/* ---------- 怪 ---------- */
function spawnMon(type, x, y, dir, opts = {}) {
  const B = BAL.mon[type], S = G.diffMul, hpM = S.hp * (1 + BAL.wave.hpPerNight * Math.max(0, G.night - 1));
  const m = { type, x, y, r: B.r, hp: B.hp * hpM, maxHp: B.hp * hpM, sp: B.sp * rand(.9, 1.1), dmg: B.dmg, dir, age: 0, seed: rand(100), flash: 0,
    kx: 0, ky: 0, atk: rand(.5, 1), slowT: 0, burnT: 0, burnDps: 0, burnTick: 0, res: { phys: 1, fire: 1, ice: 1, zap: 1 }, armor: null, beh: null,
    fly: false, split: false, dead: false, vx: 0, vy: 0, shoot: rand(1, 2), small: !!opts.small, fb: 0,
    latch: null, hasteT: 0, hasteMul: 1 }; // latch 吸住的塔；hasteT/hasteMul 是 Herald 给的加速
  if (opts.small) { m.r *= .7; m.hp = m.maxHp = m.maxHp * .45; }
  if (type === 'boss') { m.hp = m.maxHp = B.hp * S.hp * (G.night / BAL.night.total); m.spawnT = 4; m.waveT = 7; }
  if (!opts.noEvo) applyEvo(m);
  // 难度：精英更硬更疼；一部分普通怪不奔灯，专门去拆塔
  const E = S.elite || 1;
  if (type === 'brute') { m.hp = m.maxHp = m.maxHp * E; m.dmg *= 1 + (E - 1) * .6; m.sp *= 1 + (E - 1) * .15; }
  else if (type === 'boss') { m.hp = m.maxHp = m.maxHp * (1 + (E - 1) * .5); m.dmg *= 1 + (E - 1) * .4; }
  else if (m.armor) { m.hp = m.maxHp = m.maxHp * (1 + (E - 1) * .4); }
  if (!opts.small && !m.beh && (type === 'blob' || type === 'swift' || type === 'brute') && Math.random() < (S.raid || 0) * (type === 'brute' ? 1.5 : 1)) m.raid = true;
  G.mons.push(m); G.stats.spawned++;
  if (G.state === 'night' && G.tut && !G.tut['m_' + type] && TXT.mon[type] && type !== 'blob' && type !== 'boss') { // 每局第一次见到某种怪，报一下它是什么
    G.tut['m_' + type] = 1;
    addText(TXT.mon[type].name + ' — ' + TXT.mon[type].desc, VW / 2, 250, 26, RED, 3);
  }
  G.stats.spawnDir[dir]++; // 悬赏：某个方向放进来多少只
  if (type === 'leech') G.leechSpawned = (G.leechSpawned || 0) + 1;
  if (type === 'herald') G.heraldSpawned = (G.heraldSpawned || 0) + 1;
  if (G.state === 'night' && G.tut && !G.tut.spot && (m.armor || m.beh || m.fly || m.scatter) && type !== 'boss') {
    const k = m.armor || m.beh || (m.fly ? 'fly' : 'scatter');
    if (TXT.evo[k]) { G.tut.spot = 1; G.spotWait = { m, k }; } // 等它走进画面再亮相
  }
  if (!G.meta.seenMon[type]) { G.meta.seenMon[type] = 1; G.newSeen = true; }
  return m;
}
let popLast = -9;
function dmgMon(m, amt, type, src, dx = 0, dy = 0) {
  if (m.dead) return;
  const mul = m.res[type];
  let a = amt * mul;
  // 遗物：只看怪此刻的状态，乘在抗性之后，最终伤害就是实际扣的血
  if (G.mods.brittle && m.slowT > 0) a *= 1.25;
  if (G.mods.conductor && type === 'zap' && m.slowT > 0) a *= 2;
  if (G.mods.warden && Math.hypot(m.x - LAMP.x, m.y - LAMP.y) < 200) a *= 1.2;
  if (mul < .9 || mul > 1.2) {
    const nowT = G.time, ok = nowT - (m.popT || -9) > 1 && nowT - popLast > .14 && FX.texts.length < 24;
    if (ok && mul < .9) { m.popT = popLast = nowT; addText(TXT.ui.resisted || 'resisted', m.x, m.y - m.r - 10, 17, GREY, .8); }
    else if (ok) { m.popT = popLast = nowT; addText(type === 'ice' ? 'shatter!' : type === 'fire' ? 'melt!' : type === 'zap' ? 'crack!' : 'cut!', m.x, m.y - m.r - 12, 22, type === 'ice' ? QING : type === 'fire' ? RED : type === 'zap' ? GOLD : INK, .8); }
    if (mul > 1.2) burst(m.x, m.y, dx || rand(-1, 1), dy || rand(-1, 1), 3, type === 'ice' ? QING : type === 'fire' ? RED : GOLD);
  }
  if (src === 'hero') hitSnd(mul < .9 ? .2 : .3, mul < .9 ? 1.9 : mul > 1.2 ? .75 : 1); // 英雄打中才响；塔的命中不响，否则满屏都是声音
  const real = Math.min(a, m.hp);
  // 2. 弱点的额外代价：火甲被冰冻得更久、霜皮被火烧得更久、绝缘被刀砍退得更远、硬壳被雷劈得一顿
  if (mul > 1.2) {
    if (m.armor === 'flame' && type === 'ice') m.slowT = Math.max(m.slowT, 3.5);
    else if (m.armor === 'frost' && type === 'fire') { m.burnT = Math.max(m.burnT, 4); m.burnDps = Math.max(m.burnDps, BAL.build.fire.burn * 1.5); }
    else if (m.armor === 'insul' && type === 'phys') { m.kx += (dx > 0 ? 1 : -1) * 160; m.ky += (dy > 0 ? 1 : -1) * 160; }
    else if (m.armor === 'hard' && type === 'zap') m.slowT = Math.max(m.slowT, 1.2);
  }
  if (m.beh === 'assassin' && src === 'hero') a *= 1.5;              // 刺客冲着你来，也最怕你
  if (m.beh === 'sapper' && src === 'tower' && type === 'phys') a *= 1.5; // 拆塔的怕箭
  if (m.fly && src === 'tower' && type === 'phys') a *= 1.4;         // 飞的怕箭
  m.hp -= a; m.flash = .1; m.flashW = src === 'hero' ? .08 : 0; m.lastType = type;
  if (!(G.mods.quiet && src === 'hero')) { // 静功：英雄的伤害不写进怪潮学习的账本，击杀照算
    G.stats.dmg[type] += real; G.stats.src[src] += real;
  }
  if (src === 'tower') G.stats.tdmg[type] += real;
  if (src === 'tower' && G.om && G.om[type] && !m.dead && m.hp > 0) m.hp -= real * (G.om[type] - 1); // 天象：某属性的塔今天更强或更弱
  if (m.hp <= 0) killMon(m, src, dx, dy);
}
function killMon(m, src, dx, dy) {
  m.dead = true; G.stats.kills++; G.kills++; if (m.armor === 'flame' && m.lastType === 'ice') G.stats.shellIce++; G.stats.deathDir[dirOfPoint(m.x, m.y)]++;
  // 悬赏的账：按"最后一击的伤害类型 / 从哪个方向来 / 死在哪"分别记一笔，不碰 dmg 占比
  G.stats.killDir[m.dir]++; G.stats.killsByType[m.lastType || 'phys']++;
  if (m.latch) { m.latch.leech = null; m.latch = null; } // Leech 死了，那座塔的沉默解除
  if (src === 'hero') G.stats.heroKills++; else G.stats.towerKills++;
  G.runSouls += BAL.souls.perKill * (m.type === 'brute' ? 3 : 1);
  const big = m.type === 'boss' ? 4 : m.type === 'brute' ? 1.5 : 1;
  if ((m.armor && m.res[m.lastType] > 1.2 || m.beh === 'assassin' && src === 'hero') && G.tut && !G.tut.counter && G.state === 'night') { // 3. 第一次反制成功
    G.tut.counter = 1; G.hitstop = Math.max(G.hitstop, .3); addShake(10); FX.flash = .6; FX.flashCol = GOLD;
    addText(TXT.ui.turned || 'You turned it against them.', VW / 2, 300, 40, GOLD, 2.6); ring(m.x, m.y, 90, GOLD, .6); sfx('spell', 1); sfx('coin', .8);
    G.runSouls += 10;
  }
  splat(m.x, m.y, m.r * .8, dx || rand(-1, 1), dy || rand(-1, 1));
  if (FX.rings.length < 40) ring(m.x, m.y, m.r * 2.2, m.type === 'brute' || m.type === 'boss' ? RED : INK, .25); // 一圈墨环散开
  burst(m.x, m.y, dx || rand(-1, 1), dy || rand(-1, 1), 5 + m.r * .3, INK);
  if (src === 'hero') {
    G.combo++; G.comboT = 2.2; G.maxCombo = Math.max(G.maxCombo, G.combo);
    G.stats.maxCombo = Math.max(G.stats.maxCombo, G.combo); // 悬赏"连斩"看当夜的最高连击
    pluck(Math.min(G.combo - 1, 14), .22);
    if (G.mods.thirst) G.hero.hp = Math.min(G.hero.maxHp, G.hero.hp + 2);
    if (G.combo % 10 === 0) { addText(G.combo + ' chain', G.hero.x, G.hero.y - 50, 34 + G.combo / 2, RED, 1.3); addShake(6 + G.combo / 5); G.hitstop = Math.max(G.hitstop, .08); for (let k = 0; k < 6; k++) splat(G.hero.x + rand(-120, 120), G.hero.y + rand(-90, 90), rand(6, 14), rand(-1, 1), rand(-1, 1), k % 2 ? RED : INK); sfx('spell', .7, 1 + G.combo / 60); }
  } else pluck(Math.random() * 6 | 0, .09);
  checkDeeds();
  // 引火：烧着的怪倒下时把火传给身边的人
  if (G.mods.kindling && m.burnT > 0) for (const o of G.mons) {
    if (o.dead || o === m) continue;
    if (Math.hypot(o.x - m.x, o.y - m.y) >= 70) continue;
    o.burnT = 2; o.burnDps = BAL.build.fire.burn * G.mods.fire;
  }
  addShake(1.2 * big); thud((src === 'hero' ? .3 : .12) * big, src === 'hero' ? 110 : 140); // 亲手击杀比普通命中更重
  if (m.split && !m.small) for (let k = 0; k < 2; k++) { const c = spawnMon('blob', m.x + rand(-8, 8), m.y + rand(-8, 8), m.dir, { small: true, noEvo: true }); c.kx = rand(-200, 200); c.ky = rand(-200, 200); }
  if (m.type === 'bomb') explode(m);
  if (m.type === 'brute') for (let k = 0; k < 2; k++) { const c = spawnMon('blob', m.x + rand(-10, 10), m.y + rand(-10, 10), m.dir, { small: true, noEvo: true }); c.kx = rand(-250, 250); c.ky = rand(-250, 250); }
  if (m.type === 'boss') bossDown(m);
  // 只有精英掉一点资源：墨甲 3 朱砂 + 2 石，Boss 20 朱砂 + 20 石 + 20 竹；普通怪不掉
  const drop = m.type === 'brute' ? { cinnabar: 3, stone: 2 } : m.type === 'boss' ? { cinnabar: 20, stone: 20, bamboo: 20 } : null;
  if (drop) { if (typeof dropLoot === 'function') dropLoot(m.x, m.y, drop); else { for (const k in drop) G.res[k] += drop[k]; addText('+' + Object.values(drop).join(' / '), m.x, m.y - m.r - 20, 20, GOLD, 1.2); } } // 掉在地上，要自己去捡
}
function explode(m) {
  const R = BAL.mon.bomb.aoe;
  ring(m.x, m.y, R, RED, .35); addShake(6); thud(.5, 80);
  for (const b of G.builds.slice()) if (Math.hypot(b.x - m.x, b.y - m.y) < R + 20) hurtBuild(b, m.dmg);
  if (!G.hero.down && Math.hypot(G.hero.x - m.x, G.hero.y - m.y) < R) hurtHero(m.dmg * .4, m.x, m.y);
  if (Math.hypot(LAMP.x - m.x, LAMP.y - m.y) < R + LAMP.rad) hurtLamp(m.dmg * .6);
  splat(m.x, m.y, 18, 0, 0);
}
function hurtLamp(d) {
  LAMP.hp -= d; LAMP.hitT = .15; G.stats.lampDmg += d;
  if (Math.random() < .3) thud(.2, 70);
  if (LAMP.hp <= 0) { LAMP.hp = 0; gameOver(); }
}
function monTarget(m) {
  const h = G.hero;
  if (m.beh === 'assassin' && !h.down) return h;
  if (m.beh === 'sapper') {
    let best = null, bd = 1e9;
    for (const b of G.builds) if (b.type !== 'wall' && !isGround(b.type)) { const d = Math.hypot(b.x - m.x, b.y - m.y); if (d < bd) { bd = d; best = b; } }
    if (best) return best;
  }
  if (m.raid) { // 拆塔的：盯住附近的塔（墙也算，挡路就啃）
    let best = null, bd = 260;
    for (const b of G.builds) if (!isGround(b.type)) { const d = Math.hypot(b.x - m.x, b.y - m.y) + (b.type === 'wall' ? 120 : 0); if (d < bd) { bd = d; best = b; } }
    if (best) return best;
  }
  if ((m.type === 'blob' || m.type === 'swift') && !h.down && Math.hypot(h.x - m.x, h.y - m.y) < 70) return h;
  return null;
}
function updMon(m, dt) {
  m.age += dt; m.flash = Math.max(0, m.flash - dt); m.atk -= dt;
  const dec = Math.pow(.015, dt); m.kx *= dec; m.ky *= dec;
  if (m.hasteT > 0) { m.hasteT -= dt; if (m.hasteT <= 0) { m.hasteT = 0; m.hasteMul = 1; } } // Herald 一死没人续上，0.12 秒内加速自己消失
  if (m.burnT > 0) {
    m.burnT -= dt; m.burnTick -= dt;
    if (m.burnTick <= 0) { m.burnTick = .25; dmgMon(m, m.burnDps * .25, 'fire', 'tower'); if (m.dead) return; }
  }
  if (G.trails && G.trails.length && !m.fly) for (const tr of G.trails) if (segDist(m.x, m.y, tr.x0, tr.y0, tr.x1, tr.y1) < m.r + 16) { m.slowT = Math.max(m.slowT, .3); break; }
  let sp = m.sp * (m.slowT > 0 ? .5 : 1) * (m.hasteMul || 1) * (G.om ? G.om.monSp || 1 : 1); m.slowT -= dt;
  if (m.armor === 'hard') sp *= .85;
  if (m.type === 'leech') { updLeech(m, dt); return; } // 吸住就不走了，塔也停火
  if (m.type === 'herald') m.dmg = 0;                   // 传令的怪自己不打人
  if (m.type === 'boss') { updBoss(m, dt); }
  let tx, ty, attack = null;
  const tg = monTarget(m);
  if (m.type === 'spit') {
    let best = null, bd = BAL.mon.spit.range;
    for (const b of G.builds) { const d = Math.hypot(b.x - m.x, b.y - m.y); if (d < bd) { bd = d; best = b; } }
    if (!best && Math.hypot(LAMP.x - m.x, LAMP.y - m.y) < BAL.mon.spit.range) best = LAMP;
    if (best) {
      m.shoot -= dt;
      if (m.shoot <= 0) { m.shoot = 2.2; const a = Math.atan2(best.y - m.y, best.x - m.x); G.projs.push({ kind: 'ink', hostile: true, x: m.x, y: m.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, dmg: m.dmg, life: 2 }); }
      m.vx *= .8; m.vy *= .8; tx = null;
    }
    if (best) { m.x += m.kx * dt; m.y += m.ky * dt; return; }
  }
  if (m.fly) {
    const t = tg || LAMP; tx = t.x; ty = t.y;
    const d = Math.hypot(tx - m.x, ty - m.y), reach = (t === LAMP ? LAMP.rad : t === G.hero ? 10 : 18) + m.r;
    if (d < reach) attack = t;
  } else if (tg) {
    tx = tg.x; ty = tg.y;
    const d = Math.hypot(tx - m.x, ty - m.y), reach = (tg === G.hero ? 10 : 20) + m.r;
    if (d < reach) attack = tg;
    else {
      const a = Math.atan2(ty - m.y, tx - m.x), ahead = grid[cellAt(m.x + Math.cos(a) * (m.r + 8), m.y + Math.sin(a) * (m.r + 8))];
      if (ahead === 'lamp') attack = LAMP;
      else if (ahead && ahead.type === 'rock') { const n = nextCell(cellAt(m.x, m.y)); tx = ccx(n); ty = ccy(n); } // 岩石挡路：沿流场绕开
      else if (blocking(ahead) && ahead !== tg) attack = ahead;
    }
  } else {
    const i = cellAt(m.x, m.y), n = nextCell(i), cell = grid[n];
    tx = ccx(n); ty = ccy(n);
    if (n === LAMP_I || i === LAMP_I) { if (Math.hypot(LAMP.x - m.x, LAMP.y - m.y) < LAMP.rad + m.r + 14) attack = LAMP; tx = LAMP.x; ty = LAMP.y; }
    else if (blocking(cell) && Math.hypot(tx - m.x, ty - m.y) < CELL * .5 + m.r + 6) attack = cell;
    if (n === i && !attack) { tx = LAMP.x; ty = LAMP.y; }
  }
  if (attack) {
    if (m.type === 'bomb' && attack !== G.hero) { m.dead = true; explode(m); return; }
    if (m.type === 'herald') { m.vx *= .7; m.vy *= .7; return; } // 传令的怪只负责催，不动手
    if (m.atk <= 0) {
      m.atk = m.type === 'swift' ? .6 : 1;
      const dmg = m.dmg * (m.beh === 'sapper' && attack !== LAMP && attack !== G.hero ? 2.5 : 1);
      if (attack === LAMP) hurtLamp(dmg); else if (attack === G.hero) hurtHero(dmg, m.x, m.y); else hurtBuild(attack, dmg);
      const a = Math.atan2(attack.y - m.y, attack.x - m.x); m.kx += Math.cos(a) * 120; m.ky += Math.sin(a) * 120;
    }
    m.vx *= .7; m.vy *= .7;
  } else if (tx !== undefined && tx !== null) {
    const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1;
    let w = 0; if (m.type === 'blob' || m.type === 'swift') w = Math.sin(m.age * 2 + m.seed) * .25;
    const ux = dx / d - dy / d * w, uy = dy / d + dx / d * w;
    m.vx += (ux * sp - m.vx) * Math.min(1, dt * 8); m.vy += (uy * sp - m.vy) * Math.min(1, dt * 8);
  }
  m.x += (m.vx + m.kx) * dt; m.y += (m.vy + m.ky) * dt;
  if (!m.fly) { // 不能挤进建筑里
    const c = grid[cellAt(m.x, m.y)];
    if (blocking(c) || c === 'lamp') { const o = c === 'lamp' ? LAMP : c, a = Math.atan2(m.y - o.y, m.x - o.x); const R = CELL * .62; if (Math.hypot(m.x - o.x, m.y - o.y) < R) { m.x = o.x + Math.cos(a) * R; m.y = o.y + Math.sin(a) * R; } }
  }
}
// Leech：找最近的塔贴上去；贴上后自己不动，那座塔停火，直到它被打死。没有塔就去啃灯
function updLeech(m, dt) {
  if (m.latch && (m.latch.dead || m.latch.type === 'wall' || isGround(m.latch.type))) { m.latch.leech = null; m.latch = null; }
  if (!m.latch) {
    let best = null, bd = 1e9;
    for (const b of G.builds) {
      if (b.type === 'wall' || isGround(b.type) || (b.leech && !b.leech.dead)) continue; // 一座塔只够一只吸
      const d = Math.hypot(b.x - m.x, b.y - m.y); if (d < bd) { bd = d; best = b; }
    }
    if (best && bd < 26 + m.r) { m.latch = best; best.leech = m; thud(.25, 220); ring(m.x, m.y, 26, INK, .35); }
  }
  if (m.latch) {
    const b = m.latch;
    m.x += (b.x - m.x) * Math.min(1, dt * 10); m.y += (b.y - m.y) * Math.min(1, dt * 10);
    m.vx = m.vy = 0;
    return;
  }
  let tx = LAMP.x, ty = LAMP.y;
  for (const b of G.builds) {
    if (b.type === 'wall' || isGround(b.type) || (b.leech && !b.leech.dead)) continue;
    if (Math.hypot(b.x - m.x, b.y - m.y) < Math.hypot(tx - m.x, ty - m.y)) { tx = b.x; ty = b.y; }
  }
  if (tx === LAMP.x && ty === LAMP.y && Math.hypot(LAMP.x - m.x, LAMP.y - m.y) < LAMP.rad + m.r + 6) { // 没有塔可吸，就去啃灯
    if (m.atk <= 0) { m.atk = 1; hurtLamp(m.dmg); const a = Math.atan2(LAMP.y - m.y, LAMP.x - m.x); m.kx += Math.cos(a) * 120; m.ky += Math.sin(a) * 120; }
    m.vx *= .7; m.vy *= .7;
    m.x += m.kx * dt; m.y += m.ky * dt;
    return;
  }
  const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1, sp = m.sp * (m.slowT > 0 ? .5 : 1) * (m.hasteMul || 1);
  m.vx += (dx / d * sp - m.vx) * Math.min(1, dt * 8); m.vy += (dy / d * sp - m.vy) * Math.min(1, dt * 8);
  m.x += (m.vx + m.kx) * dt; m.y += (m.vy + m.ky) * dt;
}
// Herald：给身边一圈的怪续上加速；它自己死了没人续，加速在 0.12 秒内消失
function heraldAura() {
  const hs = G.mons.filter(m => m.type === 'herald' && !m.dead), R = BAL.mon.herald.aura || 130;
  if (!hs.length) return;
  for (const m of G.mons) {
    if (m.dead || m.type === 'herald') continue;
    for (const h of hs) if (Math.hypot(h.x - m.x, h.y - m.y) < R) { m.hasteT = .12; m.hasteMul = BAL.mon.herald.haste || 1.3; break; }
  }
}
function separate() {
  const B = new Map();
  for (const m of G.mons) { const k = cellAt(m.x, m.y); let a = B.get(k); if (!a) B.set(k, a = []); a.push(m); }
  for (const m of G.mons) {
    const c = colOf(m.x), r = rowOf(m.y);
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
      const a = B.get(idx(clamp(c + dc, 0, COLS - 1), clamp(r + dr, 0, ROWS - 1))); if (!a) continue;
      for (const o of a) {
        if (o === m || o.fly !== m.fly) continue;
        const dx = o.x - m.x, dy = o.y - m.y, d = Math.hypot(dx, dy) || .01, mn = (m.r + o.r) * (m.scatter && o.scatter ? 2.4 : .85);
        if (d < mn) { const p = (mn - d) * .25, ux = dx / d, uy = dy / d, wm = o.type === 'boss' ? 1.8 : m.type === 'boss' ? .1 : 1; m.x -= ux * p * wm; m.y -= uy * p * wm; }
      }
    }
  }
}

/* ---------- Boss ---------- */
function updBoss(m, dt) {
  bossMirror(m);
  m.spawnT -= dt; m.waveT -= dt;
  for (const b of G.builds.slice()) if (Math.hypot(b.x - m.x, b.y - m.y) < m.r + 26) hurtBuild(b, 30 * dt);
  if (m.spawnT <= 0) { m.spawnT = 5; for (let k = 0; k < 4; k++) { const c = spawnMon(Math.random() < .4 ? 'swift' : 'blob', m.x + rand(-40, 40), m.y + rand(-40, 40), m.dir); c.kx = rand(-260, 260); c.ky = rand(-260, 260); } thud(.4, 90); }
  if (m.waveT <= 0) {
    m.waveT = m.mirror ? 5.5 : 8; const n = 16, o = rand(TAU); mirrorWave(m);
    for (let k = 0; k < n; k++) { const a = o + k / n * TAU; G.projs.push({ kind: 'ink', hostile: true, big: true, x: m.x, y: m.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, dmg: m.mirror === 'fire' ? 20 : 14, life: 5, el: m.mirror }); }
    ring(m.x, m.y, 160, INK, .5); addShake(8); thud(.6, 60);
  }
}
function bossDown(m) {
  addText(TXT.mon.boss.name + ' is washed away', VW / 2, 300, 54, RED, 3);
  for (let k = 0; k < 8; k++) splat(m.x + rand(-70, 70), m.y + rand(-70, 70), rand(20, 46), rand(-1, 1), rand(-1, 1));
  G.hitstop = .4; addShake(22); G.bossDead = true; G.runSouls += BAL.souls.boss; checkDeeds();
}

/* ---------- 塔 ---------- */
function nearestMon(x, y, R, pred) {
  let best = null, bd = R;
  for (const m of G.mons) { if (m.dead || (pred && !pred(m))) continue; const d = Math.hypot(m.x - x, m.y - y) - m.r; if (d < bd) { bd = d; best = m; } }
  return best;
}
function updBuild(b, dt) {
  b.age += dt; b.hitT = Math.max(0, b.hitT - dt);
  const B = BAL.build[b.type];
  if (b.type === 'wall') return;
  if (b.leech && !b.leech.dead && b.leech.latch === b) return; // 被 Leech 吸住：不转向、不攻击
  b.cd -= dt * G.mods.rate;
  if (b.cd > 0) return;
  if (b.type === 'spike') {
    let hit = false;
    for (const m of G.mons) if (!m.dead && !m.fly && Math.abs(m.x - b.x) < CELL * .5 + m.r * .4 && Math.abs(m.y - b.y) < CELL * .5 + m.r * .4) { dmgMon(m, B.dmg * lvMul(b), 'phys', 'tower', 0, -1); hit = true; }
    if (hit) { b.cd = B.cd; b.flash = .1; }
    return;
  }
  const t = nearestMon(b.x, b.y, B.range * (1 + .12 * ((b.lv || 1) - 1)) * (G.om ? G.om.range || 1 : 1));
  if (!t) return;
  b.cd = B.cd; b.aim = Math.atan2(t.y - b.y, t.x - b.x);
  if (b.type === 'arrow') { G.projs.push({ kind: 'arrow', x: b.x, y: b.y - 10, tg: t, sp: 900, dmg: B.dmg * lvMul(b), life: 1.2 }); whoosh(.06, 2.4); }
  else if (b.type === 'fire') { G.projs.push({ kind: 'fire', x: b.x, y: b.y - 12, tg: t, sp: 520, dmg: B.dmg * G.mods.fire * lvMul(b), life: 1.5, tx: t.x, ty: t.y }); tone(300, 120, .2, .05, 'sawtooth'); }
  else if (b.type === 'ice') {
    const hit = new Set();
    for (let k = 0; k < B.targets; k++) {
      const m = nearestMon(b.x, b.y, B.range, x => !hit.has(x)); if (!m) break; hit.add(m);
      beam(b.x, b.y - 10, m.x, m.y, QING, 3.5, .22);
      if (m.armor !== 'frost') { m.slowT = B.slowT * G.mods.slowT; G.stats.slowHits = (G.stats.slowHits || 0) + 1; }
      dmgMon(m, B.dmg * G.mods.ice * lvMul(b), 'ice', 'tower', m.x - b.x, m.y - b.y);
    }
    tone(1300, 900, .15, .04, 'sine');
  } else if (b.type === 'thunder') {
    let cur = t, px = b.x, py = b.y - 12; const hit = new Set();
    for (let k = 0; k < B.chain + G.mods.chain && cur; k++) {
      hit.add(cur); zig(px, py, cur.x, cur.y);
      dmgMon(cur, B.dmg * lvMul(b), 'zap', 'tower', cur.x - px, cur.y - py);
      px = cur.x; py = cur.y; cur = nearestMon(px, py, 140, x => !hit.has(x));
    }
    tone(180, 60, .18, .08, 'square');
  }
}
function zig(x0, y0, x1, y1) {
  const n = 5; let px = x0, py = y0;
  for (let k = 1; k <= n; k++) { const s = k / n; const x = x0 + (x1 - x0) * s + (k < n ? rand(-12, 12) : 0), y = y0 + (y1 - y0) * s + (k < n ? rand(-12, 12) : 0); beam(px, py, x, y, GOLD, 3, .2); px = x; py = y; }
}

/* ---------- 子弹 ---------- */
function updProj(p, dt) {
  p.life -= dt; if (p.life <= 0) { p.dead = true; return; }
  if (p.tg) {
    if (!p.tg.dead) { p.tx = p.tg.x; p.ty = p.tg.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
    if (d < 12 || (p.tg.dead && d < 20)) { p.dead = true; projHit(p); return; }
    p.vx = dx / d * p.sp; p.vy = dy / d * p.sp;
  }
  p.x += p.vx * dt; p.y += p.vy * dt;
  if (p.kind === 'blot') { blotFly(p); return; }
  if (p.kind === 'harrow') {
    for (const m of G.mons) if (!m.dead && !p.hit.has(m) && Math.hypot(m.x - p.x, m.y - p.y) < m.r + 6) {
      p.hit.add(m); dmgMon(m, p.dmg, 'phys', 'hero', p.vx, p.vy); m.kx += p.vx * .08; m.ky += p.vy * .08;
      if (p.hit.size > p.pierce) { p.dead = true; break; }
    }
  } else if (p.hostile) {
    const h = G.hero;
    if (inkBlocks(p)) { p.dead = true; return; }
    if (!h.down && Math.hypot(h.x - p.x, h.y - p.y) < 14) { hurtHero(p.dmg, p.x, p.y); if (p.el === 'ice') h.slowT = 2; p.dead = true; return; }
    const c = grid[cellAt(p.x, p.y)];
    if (c === 'lamp' && Math.hypot(LAMP.x - p.x, LAMP.y - p.y) < LAMP.rad + 6) { hurtLamp(p.dmg); p.dead = true; splat(p.x, p.y, 5, p.vx, p.vy); return; }
    if (c && c !== 'lamp' && !isGround(c.type)) { hurtBuild(c, p.dmg); p.dead = true; splat(p.x, p.y, 5, p.vx, p.vy); return; }
    if (p.x < -20 || p.x > VW + 20 || p.y < -20 || p.y > VH + 20) p.dead = true;
  }
}
function projHit(p) {
  if (p.kind === 'arrow') { if (!p.tg.dead) dmgMon(p.tg, p.dmg, 'phys', 'tower', p.vx, p.vy); }
  else if (p.kind === 'fire') {
    const B = BAL.build.fire;
    ring(p.tx, p.ty, B.aoe, RED, .3); G.lights.push({ x: p.tx, y: p.ty, r: 140, t: .35 });
    for (const m of G.mons) if (!m.dead && Math.hypot(m.x - p.tx, m.y - p.ty) < B.aoe + m.r) {
      dmgMon(m, p.dmg, 'fire', 'tower', m.x - p.tx, m.y - p.ty);
      if (!m.dead) { m.burnT = B.burnT; m.burnDps = B.burn * G.mods.fire; }
    }
    burst(p.tx, p.ty, 0, -1, 8, RED, Math.PI); thud(.15, 200);
    pctx.fillStyle = RED; pctx.globalAlpha = .05; pctx.beginPath(); pctx.arc(p.tx, p.ty, B.aoe * .8, 0, TAU); pctx.fill(); pctx.globalAlpha = 1;
  }
}

/* ---------- 队友：第 5 晚过后，救下的幸存者里最多 2 个拿起武器 ----------
   夜里：找灯附近最近的怪去砍；白天：去最近的资源点帮忙采（速度是英雄的 40%）。
   队友不会死，伤害算"塔"那一边（不让怪潮误以为是英雄在打）。 */
function updAllies(dt) {
  if (!G.allies) G.allies = [];
  for (const a of G.allies) {
    a.cd -= dt; a.walk += dt;
    let tx = LAMP.x + Math.cos(a.ang) * 70, ty = LAMP.y + Math.sin(a.ang) * 50, sp = 170;
    if (G.state === 'night') {
      const m = nearestMon(LAMP.x, LAMP.y, 420);
      if (m) {
        tx = m.x; ty = m.y;
        if (Math.hypot(m.x - a.x, m.y - a.y) < m.r + 30 && a.cd <= 0) {
          a.cd = .6; dmgMon(m, 9 * (1 + .1 * Math.max(0, G.night - 5)), 'phys', 'tower', m.x - a.x, m.y - a.y);
          FX.arcs.push({ x: a.x, y: a.y, r: 34, a: Math.atan2(m.y - a.y, m.x - a.x), arc: 1.6, t: 0, dur: .16, col: GREEN });
        }
      }
    } else if (G.state === 'day' && G.nodes.length) {
      const n = G.nodes.reduce((b, n) => Math.hypot(n.x - a.x, n.y - a.y) < Math.hypot(b.x - a.x, b.y - a.y) ? n : b);
      tx = n.x; ty = n.y;
      if (Math.hypot(n.x - a.x, n.y - a.y) < 40) { const take = Math.min(n.amt, BAL.gather.rate * .4 * dt); n.amt -= take; G.res[n.type] += take; a.gather = true; } else a.gather = false;
    }
    const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
    if (d > 26) { a.x += dx / d * sp * dt; a.y += dy / d * sp * dt; a.moving = true; } else a.moving = false;
  }
}
function addAlly() {
  if (!G.allies) G.allies = [];
  const s = G.survivors[G.allies.length], name = s ? s.name : pick(TXT.survivors);
  G.allies.push({ name, x: LAMP.x, y: LAMP.y + 40, cd: 0, walk: 0, ang: rand(TAU), moving: false, gather: false });
  addText(fmt(TXT.ui.allyJoins || '{name} takes up a blade', { name }), LAMP.x, LAMP.y - 80, 26, GREEN, 3);
}
