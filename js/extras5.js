/* extras5：看得出的石料、采集工具动画、冲刺撞墙即停、鼠标放怪物上不弹卡、弓箭的飞行、左下角按键图示 */

/* ---------- 1. 冲刺撞墙就停（英雄现在会被建筑挡住，冲刺也不再穿墙） ---------- */
function dashClear(x, y, a, range) {
  let d = 0;
  for (let s = 8; s <= range; s += 8) {
    const px = x + Math.cos(a) * s, py = y + Math.sin(a) * s;
    if (px < 20 || py < 20 || px > VW - 20 || py > VH - 20) break;
    if (heroBlockedAt(colOf(px), rowOf(py))) break;
    d = s;
  }
  return Math.max(0, d - HERO_R);
}
const _swordDash5 = swordDash;
swordDash = function (h, B, a, echo) {
  const d = dashClear(h.x, h.y, a, B.skillRange);
  return _swordDash5(h, d < B.skillRange ? Object.assign({}, B, { skillRange: Math.max(24, d) }) : B, a, echo);
};

/* ---------- 2. 鼠标放在怪身上不弹说明卡（怪的说明在图鉴和第一次出场时已经讲过） ---------- */
const _worldTip5 = worldTip;
worldTip = function () { if (typeof tourOn === "function" && tourOn() && tourStep()) return; const ms = G.mons; G.mons = []; try { _worldTip5(); } finally { G.mons = ms; } };

/* ---------- 3. 石料：浅青灰的有棱角的石块，带凿痕和闪光；和深色圆滚滚的岩石一眼分开 ---------- */
const STONE_LIGHT = '#c9d2d0', STONE_MID = '#9aa9a8', STONE_DARK = '#6c7a7a';
function drawStoneNode(c, n, k) {
  const chunks = [[-11, 4, 13], [9, 6, 11], [0, -7, 12]];
  c.fillStyle = 'rgba(22,19,15,.16)'; c.beginPath(); c.ellipse(n.x + 3, n.y + 16, 24 * k + 4, 7, 0, 0, TAU); c.fill();
  chunks.forEach(([dx, dy, s], j) => {
    if (k < .55 && j === 2) return; // 采得差不多了，上面那块先没了
    s *= .6 + .4 * k; const x = n.x + dx * (.7 + .3 * k), y = n.y + dy * (.7 + .3 * k), r = (n.seed * 7 + j * 2.3) % 1 * .5 - .25;
    c.save(); c.translate(x, y); c.rotate(r);
    // 顶面亮、侧面暗：像切开的石块
    c.fillStyle = STONE_MID; c.beginPath(); c.moveTo(-s, -s * .2); c.lineTo(-s * .4, -s); c.lineTo(s * .7, -s * .8); c.lineTo(s, s * .1); c.lineTo(s * .5, s * .8); c.lineTo(-s * .7, s * .7); c.closePath(); c.fill();
    c.fillStyle = STONE_LIGHT; c.beginPath(); c.moveTo(-s, -s * .2); c.lineTo(-s * .4, -s); c.lineTo(s * .7, -s * .8); c.lineTo(s * .2, -s * .1); c.closePath(); c.fill();
    c.fillStyle = STONE_DARK; c.globalAlpha = .55; c.beginPath(); c.moveTo(s * .2, -s * .1); c.lineTo(s * .7, -s * .8); c.lineTo(s, s * .1); c.lineTo(s * .5, s * .8); c.closePath(); c.fill(); c.globalAlpha = 1;
    c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-s, -s * .2); c.lineTo(-s * .4, -s); c.lineTo(s * .7, -s * .8); c.lineTo(s, s * .1); c.lineTo(s * .5, s * .8); c.lineTo(-s * .7, s * .7); c.closePath(); c.stroke();
    c.lineWidth = 1; c.globalAlpha = .6; c.beginPath(); c.moveTo(-s * .2, s * .1); c.lineTo(s * .15, s * .45); c.stroke(); c.globalAlpha = 1; // 凿痕
    c.restore();
  });
  const tw = (Math.sin(G.time * 3 + n.seed) + 1) / 2; // 一闪一闪的光点：可以采
  c.fillStyle = '#ffffff'; c.globalAlpha = .4 + .6 * tw;
  const gx = n.x - 4, gy = n.y - 12, g = 2 + 3 * tw;
  c.beginPath(); c.moveTo(gx, gy - g); c.lineTo(gx + g * .3, gy); c.lineTo(gx, gy + g); c.lineTo(gx - g * .3, gy); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(gx - g, gy); c.lineTo(gx, gy + g * .3); c.lineTo(gx + g, gy); c.lineTo(gx, gy - g * .3); c.closePath(); c.fill();
  c.globalAlpha = 1;
}
const _drawNode5 = drawNode;
drawNode = function (n) {
  const c = ctx, k = .45 + .55 * n.amt / n.max;
  // 所有资源点脚下一圈淡淡的金色虚线：表示"可以采"
  if (G.state === 'day' || G.state === 'prelude') {
    c.save(); c.strokeStyle = GOLD; c.lineWidth = 2; c.setLineDash([5, 6]); c.lineDashOffset = -G.time * 12; c.globalAlpha = .35 + .2 * Math.sin(G.time * 3 + n.seed);
    c.beginPath(); c.ellipse(n.x, n.y + 10, 30, 13, 0, 0, TAU); c.stroke(); c.restore();
  }
  if (n.type === 'stone') {
    drawStoneNode(c, n, k);
    if (Math.hypot(G.hero.x - n.x, G.hero.y - n.y) < BAL.gather.reach + 14) { c.strokeStyle = STONE_MID; c.lineWidth = 2; c.globalAlpha = .8; c.beginPath(); c.arc(n.x, n.y, 30, -Math.PI / 2, -Math.PI / 2 + TAU * n.amt / n.max); c.stroke(); c.globalAlpha = 1; }
  } else _drawNode5(n);
};
// 界面上的石料小图标也换成同样的浅色石块
const _resIcon5 = resIcon;
resIcon = function (type, x, y, s = 9) {
  if (type !== 'stone') return _resIcon5(type, x, y, s);
  ctx.fillStyle = STONE_MID; ctx.beginPath(); ctx.moveTo(x - s, y - s * .2); ctx.lineTo(x - s * .4, y - s); ctx.lineTo(x + s * .7, y - s * .8); ctx.lineTo(x + s, y + s * .1); ctx.lineTo(x + s * .5, y + s * .8); ctx.lineTo(x - s * .7, y + s * .7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = STONE_LIGHT; ctx.beginPath(); ctx.moveTo(x - s, y - s * .2); ctx.lineTo(x - s * .4, y - s); ctx.lineTo(x + s * .7, y - s * .8); ctx.lineTo(x + s * .2, y - s * .1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - s, y - s * .2); ctx.lineTo(x - s * .4, y - s); ctx.lineTo(x + s * .7, y - s * .8); ctx.lineTo(x + s, y + s * .1); ctx.lineTo(x + s * .5, y + s * .8); ctx.lineTo(x - s * .7, y + s * .7); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = RES_COL[type];
};

/* ---------- 4. 采集动画：竹子用斧头砍、石料用镐子凿、朱砂用小锤敲 ---------- */
const GATHER_TOOL = { bamboo: 'axe', stone: 'pick', cinnabar: 'hammer' };
function drawGatherTool(c, h, y) {
  const g = h.gath, tool = GATHER_TOOL[g.type] || 'pick';
  const base = Math.atan2(g.y - y, g.x - h.x), ph = (G.time * 2.6) % 1;
  // 抬起慢、砸下快：0~.7 抬，.7~1 砸
  const sw = ph < .7 ? -1.3 * Math.sin(ph / .7 * Math.PI / 2) : -1.3 + 1.6 * ((ph - .7) / .3);
  const side = Math.cos(base) >= 0 ? 1 : -1, a = base + sw * side;
  if (h.gPh !== undefined && h.gPh < .97 && ph >= .97 || (h.gPh > ph && h.gPh < .97)) gatherHit(g); // 砸到的那一下
  h.gPh = ph;
  c.save(); c.translate(h.x, y); c.rotate(a);
  c.strokeStyle = '#6b4a2a'; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(4, 0); c.lineTo(32, 0); c.stroke(); // 木柄
  if (tool === 'pick') { // 镐：两头尖的弯头
    c.strokeStyle = '#4c5656'; c.lineWidth = 4; c.beginPath(); c.moveTo(26, -13); c.quadraticCurveTo(36, 0, 26, 13); c.stroke();
    c.fillStyle = '#4c5656'; c.beginPath(); c.moveTo(26, 13); c.lineTo(21, 17); c.lineTo(29, 11); c.fill(); c.beginPath(); c.moveTo(26, -13); c.lineTo(21, -17); c.lineTo(29, -11); c.fill();
  } else if (tool === 'axe') { // 斧：一侧宽刃
    c.fillStyle = '#4c5656'; c.beginPath(); c.moveTo(26, -3); c.lineTo(36, -4); c.quadraticCurveTo(42, 6, 36, 14); c.lineTo(28, 5); c.closePath(); c.fill();
    c.strokeStyle = '#d9dfdd'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(39, 0); c.quadraticCurveTo(42, 6, 37, 12); c.stroke();
  } else { // 小锤：方头
    c.fillStyle = '#4c5656'; c.fillRect(27, -8, 9, 16); c.fillStyle = '#7b8686'; c.fillRect(27, -8, 3, 16);
  }
  c.restore();
}
function gatherHit(g) {
  const col = g.type === 'stone' ? STONE_LIGHT : g.type === 'bamboo' ? GREEN : RED;
  for (let k = 0; k < 6 && FX.parts.length < 420; k++) { const a = rand(-Math.PI, 0); FX.parts.push({ x: g.x + rand(-6, 6), y: g.y - 4, vx: Math.cos(a) * rand(60, 140), vy: Math.sin(a) * rand(80, 160), life: rand(.3, .5), r: rand(2, 3.5), color: col }); }
  if (g.type === 'bamboo') for (let k = 0; k < 2 && FX.parts.length < 420; k++) FX.parts.push({ x: g.x, y: g.y - 20, vx: rand(-40, 40), vy: rand(-30, 10), life: .7, r: 2.5, color: '#7fa05a' }); // 竹叶
  if (g.type === 'stone') { FX.parts.push({ x: g.x, y: g.y - 6, vx: 0, vy: 0, life: .12, r: 7, color: '#ffffff' }); } // 火星
}

/* ---------- 5. 弓箭：射出去很快、越飞越慢、最后掉下来插在地上 ---------- */
const ARROW_V0 = 1500, ARROW_DRAG = 2.4;
const _shootArrow5 = shootArrow;
shootArrow = function (h, B) {
  _shootArrow5(h, B);
  const p = G.projs[G.projs.length - 1]; if (!p || p.kind !== 'harrow') return;
  const sp = Math.hypot(p.vx, p.vy) || 1, f = Math.min(.95, B.range * ARROW_DRAG / ARROW_V0);
  p.vx = p.vx / sp * ARROW_V0; p.vy = p.vy / sp * ARROW_V0;
  p.life = -Math.log(1 - f) / ARROW_DRAG; p.T0 = p.life; p.age = 0; p.drag = ARROW_DRAG;
};
const _updProj5 = updProj;
updProj = function (p, dt) {
  if (p.drag) {
    const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.age += dt;
    if (p.life - dt <= 0 && !p.dead) { // 落地：插在地上
      const a = Math.atan2(p.vy, p.vx);
      (G.stuck = G.stuck || []).push({ x: p.x + p.vx * dt, y: p.y + p.vy * dt, a, t: 1.1 });
      if (G.stuck.length > 40) G.stuck.shift();
    }
  }
  return _updProj5(p, dt);
};
function drawArrowShape(c, x, y, a, len, alpha) {
  c.save(); c.translate(x, y); c.rotate(a); c.globalAlpha *= alpha;
  c.strokeStyle = '#5a4128'; c.lineWidth = 2; c.beginPath(); c.moveTo(-len * .55, 0); c.lineTo(len * .4, 0); c.stroke(); // 箭杆
  c.fillStyle = INK; c.beginPath(); c.moveTo(len * .5, 0); c.lineTo(len * .32, -4); c.lineTo(len * .32, 4); c.closePath(); c.fill(); // 箭头
  c.fillStyle = RED; c.beginPath(); c.moveTo(-len * .55, 0); c.lineTo(-len * .4, 0); c.lineTo(-len * .5, -5); c.lineTo(-len * .62, -5); c.closePath(); c.fill(); // 尾羽
  c.beginPath(); c.moveTo(-len * .55, 0); c.lineTo(-len * .4, 0); c.lineTo(-len * .5, 5); c.lineTo(-len * .62, 5); c.closePath(); c.fill();
  c.restore();
}
const _drawProj5 = drawProj;
drawProj = function (p) {
  const c = ctx;
  if (p.kind === 'harrow' && p.T0) {
    const u = clamp(p.age / p.T0, 0, 1), H = 18, z = Math.sin(u * Math.PI) * H, dz = Math.cos(u * Math.PI) * Math.PI * H / p.T0;
    c.fillStyle = 'rgba(22,19,15,.18)'; c.beginPath(); c.ellipse(p.x, p.y, 8, 2.5, Math.atan2(p.vy, p.vx), 0, TAU); c.fill(); // 地上的影子
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 700) { c.strokeStyle = INK; c.globalAlpha = .18; c.lineWidth = 1.5; c.beginPath(); c.moveTo(p.x, p.y - z); c.lineTo(p.x - p.vx * .03, p.y - z - p.vy * .03 + dz * .03); c.stroke(); c.globalAlpha = 1; } // 快的时候有风线
    drawArrowShape(c, p.x, p.y - z, Math.atan2(p.vy - dz, p.vx), 26, 1);
    return;
  }
  if (p.kind === 'arrow') { drawArrowShape(c, p.x, p.y, Math.atan2(p.vy, p.vx), 20, 1); return; }
  _drawProj5(p);
};
function drawStuck(dt) {
  if (!G.stuck || !G.stuck.length) return;
  const c = ctx;
  for (const s of G.stuck) {
    s.t -= dt; const al = clamp(s.t / .4, 0, 1);
    // 斜插进土里：只剩后半截，尾羽朝上
    c.save(); c.translate(s.x, s.y); c.globalAlpha = al;
    c.fillStyle = 'rgba(22,19,15,.2)'; c.beginPath(); c.ellipse(0, 0, 4, 1.6, 0, 0, TAU); c.fill();
    const tilt = Math.cos(s.a) >= 0 ? -1 : 1;
    c.rotate(-Math.PI / 2 + tilt * .5);
    c.strokeStyle = '#5a4128'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(15, 0); c.stroke();
    c.fillStyle = RED; c.beginPath(); c.moveTo(11, 0); c.lineTo(17, -4); c.lineTo(19, -4); c.lineTo(15, 0); c.closePath(); c.fill(); c.beginPath(); c.moveTo(11, 0); c.lineTo(17, 4); c.lineTo(19, 4); c.lineTo(15, 0); c.closePath(); c.fill();
    c.restore();
  }
  G.stuck = G.stuck.filter(s => s.t > 0);
}
let stuckLast = 0;
const _drawFx5 = drawFx;
drawFx = function () { const dt = clamp(G.time - stuckLast, 0, .1); stuckLast = G.time; if (G.state !== 'title') drawStuck(typeof paused !== 'undefined' && paused ? 0 : dt); return _drawFx5.apply(this, arguments); };

/* ---------- 6. 左下角按键说明：画成键帽和鼠标，而不是一行字 ---------- */
function miniKey(s, x, y, night) {
  ctx.font = `bold 13px ${FONT}`; const w = Math.max(24, ctx.measureText(s).width + 14);
  ctx.fillStyle = night ? 'rgba(236,228,208,.16)' : 'rgba(22,19,15,.18)'; rrect(ctx, x, y - 10, w, 22, 5); ctx.fill();
  ctx.fillStyle = night ? 'rgba(30,32,40,.85)' : '#fbf6ea'; rrect(ctx, x, y - 12, w, 22, 5); ctx.fill();
  ctx.strokeStyle = night ? '#cfc6b2' : INK; ctx.lineWidth = 1.2; rrect(ctx, x, y - 12, w, 22, 5); ctx.stroke();
  text(s, x + w / 2, y - 1, 13, night ? '#efe6d0' : INK, 'center', 1, null, 'bold');
  return w + 4;
}
function miniMouse(x, y, btnSide, night) { // btnSide: 'L' 或 'R'，按的那边涂红
  const w = 16, h = 22, c = ctx;
  c.fillStyle = night ? 'rgba(30,32,40,.85)' : '#fbf6ea'; rrect(c, x, y - 12, w, h, 8); c.fill();
  c.fillStyle = RED; c.beginPath();
  if (btnSide === 'L') { c.moveTo(x + w / 2, y - 12); c.lineTo(x + w / 2, y - 3); c.lineTo(x, y - 3); c.lineTo(x, y - 4); c.arcTo(x, y - 12, x + w / 2, y - 12, 8); }
  else { c.moveTo(x + w / 2, y - 12); c.lineTo(x + w / 2, y - 3); c.lineTo(x + w, y - 3); c.lineTo(x + w, y - 4); c.arcTo(x + w, y - 12, x + w / 2, y - 12, 8); }
  c.closePath(); c.fill();
  c.strokeStyle = night ? '#cfc6b2' : INK; c.lineWidth = 1.2; rrect(c, x, y - 12, w, h, 8); c.stroke();
  c.beginPath(); c.moveTo(x + w / 2, y - 12); c.lineTo(x + w / 2, y - 3); c.moveTo(x, y - 3); c.lineTo(x + w, y - 3); c.stroke();
  return w + 6;
}
function drawControls(night, col, out) {
  const rows = [
    [[['k', 'W'], ['k', 'A'], ['k', 'S'], ['k', 'D']], 'move', [['m', 'L']], 'attack'],
    [[['k', 'Space']], 'skill', [['k', '1–7']], 'build'],
    [[['m', 'R']], 'remove', [['k', 'P']], 'pause']
  ];
  rows.forEach((R, i) => {
    const y = 826 + i * 26;
    let x = 24;
    for (let half = 0; half < 2; half++) {
      for (const [t, s] of R[half * 2]) x += t === 'k' ? miniKey(s, x, y, night) : miniMouse(x, y, s, night);
      text(R[half * 2 + 1], x + 2, y - 1, 14, col, 'left', .9, out, 'italic');
      x = 24 + 168;
    }
  });
}

/* ---------- 7. 英雄技能整体压一压（C 的表不改，这里覆盖；C 想调就改这几行） ---------- */
(function () {
  const H = BAL.hero, nerf = (k, cd, dmg) => { if (!H[k]) return; H[k].skillCd = +(H[k].skillCd * cd).toFixed(2); if (H[k].skillDmg) H[k].skillDmg = Math.round(H[k].skillDmg * dmg); };
  nerf('sword', 1.25, .75); // 冲刺：4 → 5 秒，55 → 41
  nerf('bow', 1.17, .8);    // 箭雨：6 → 7 秒
  nerf('brush', 1.15, .8);  // 墨墙：7 → 8 秒
  nerf('seal', 1.13, .8);   // 大印：8 → 9 秒
  if (H.seal) H.seal.stun = Math.min(H.seal.stun, 1.1);
  if (H.brush) H.brush.wallT = Math.min(H.brush.wallT, 4.5);
})();

/* ---------- 8. 地上的墨迹慢慢褪掉，后面几夜不再满屏都是 ---------- */
let fadeAcc = 0;
const _updExtras5 = updExtras;
updExtras = function (dt) {
  _updExtras5(dt);
  fadeAcc += dt;
  if (fadeAcc > .25) { // 每 0.25 秒擦掉一点点：大约 20 秒褪掉一半
    pctx.save(); pctx.globalCompositeOperation = 'destination-out'; pctx.globalAlpha = .009; pctx.fillStyle = '#000'; pctx.fillRect(0, 0, VW, VH); pctx.restore();
    fadeAcc = 0;
  }
};

/* ---------- 9. 遗物有代价：每张卡附带一个小坏处；卡角加一幅小图 ---------- */
const RELIC_BAD = [
  ['Hero damage −10%', () => { G.mods.heroDmg *= .9; }],
  ['Move speed −8%', () => { G.mods.sp *= .92; }],
  ['Buildings cost +10%', () => { G.mods.cost *= 1.1; }],
  ['Gathering −15%', () => { G.mods.gather *= .85; }],
  ['Towers fire 10% slower', () => { G.mods.rate *= .9; }],
  ['Skill cooldown +15%', () => { G.mods.skillCd = (G.mods.skillCd || 1) * 1.15; }],
  ['Walls −15% health', () => { G.mods.wallHp *= .85; }],
  ['Hero max health −12%', () => { const h = G.hero; h.maxHp = Math.round(h.maxHp * .88); h.hp = Math.min(h.hp, h.maxHp); }],
  ['Lamp max health −10%', () => { LAMP.maxHp = Math.round(LAMP.maxHp * .9); LAMP.hp = Math.min(LAMP.hp, LAMP.maxHp); }]
];
const _rollRelics5 = rollRelics;
rollRelics = function () {
  _rollRelics5();
  G.cardBad = {};
  if (G.skillRound || !G.cards) return;
  const idx = RELIC_BAD.map((_, i) => i).sort(() => Math.random() - .5);
  G.cards.forEach((k, i) => { if (k !== 'whet') G.cardBad[k] = idx[i % idx.length]; });
};
const _takeRelic5 = takeRelic;
takeRelic = function (k) {
  _takeRelic5(k);
  if (G.meta.mode !== 'easy' && G.state === 'relic' && G.cardBad && G.cardBad[k] !== undefined) { RELIC_BAD[G.cardBad[k]][1](); G.cardBad = {}; }
};
function relicMotif(k) {
  const R = TXT.relic[k] || {}, s = ((R.name || '') + ' ' + (R.desc || '')).toLowerCase();
  if (/fire|burn|ember|flame/.test(s)) return 'flame';
  if (/frost|ice|cold|chill|slow/.test(s)) return 'snow';
  if (/lightning|thunder|zap|chain|spark/.test(s)) return 'bolt';
  if (/lamp|light/.test(s)) return 'lamp';
  if (/wall|build|tower|cost|repair/.test(s)) return 'tower';
  if (/gather|bamboo|stone|cinnabar/.test(s)) return 'leaf';
  if (/soul|ink/.test(s)) return 'drop';
  if (/strike|blade|dash|skill|hero|damage/.test(s)) return 'blade';
  return 'moon';
}
function drawMotif(c, m, x, y, s, col) {
  c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 2.5; c.lineCap = 'round'; c.lineJoin = 'round';
  if (m === 'flame') { c.beginPath(); c.moveTo(0, 14); c.bezierCurveTo(-14, 10, -10, -4, 0, -16); c.bezierCurveTo(2, -6, 12, -2, 9, 8); c.bezierCurveTo(7, 12, 4, 14, 0, 14); c.fill(); }
  else if (m === 'snow') { for (let i = 0; i < 3; i++) { c.save(); c.rotate(i * Math.PI / 3); c.beginPath(); c.moveTo(0, -15); c.lineTo(0, 15); c.moveTo(-4, -11); c.lineTo(0, -7); c.lineTo(4, -11); c.moveTo(-4, 11); c.lineTo(0, 7); c.lineTo(4, 11); c.stroke(); c.restore(); } }
  else if (m === 'bolt') { c.beginPath(); c.moveTo(4, -16); c.lineTo(-8, 2); c.lineTo(0, 2); c.lineTo(-4, 16); c.lineTo(8, -2); c.lineTo(0, -2); c.closePath(); c.fill(); }
  else if (m === 'lamp') { c.beginPath(); c.ellipse(0, 2, 9, 12, 0, 0, TAU); c.stroke(); c.fillRect(-6, 13, 12, 3); c.fillRect(-4, -13, 8, 3); c.beginPath(); c.arc(0, 3, 4, 0, TAU); c.fill(); }
  else if (m === 'tower') { c.fillRect(-9, -6, 18, 20); c.fillRect(-11, -12, 5, 6); c.fillRect(-2.5, -12, 5, 6); c.fillRect(6, -12, 5, 6); }
  else if (m === 'leaf') { c.beginPath(); c.moveTo(-12, 12); c.quadraticCurveTo(-12, -12, 12, -12); c.quadraticCurveTo(12, 12, -12, 12); c.fill(); }
  else if (m === 'drop') { c.beginPath(); c.moveTo(0, -16); c.bezierCurveTo(10, -2, 11, 4, 11, 6); c.arc(0, 6, 11, 0, Math.PI); c.bezierCurveTo(-11, 4, -10, -2, 0, -16); c.fill(); }
  else if (m === 'blade') { c.beginPath(); c.moveTo(-12, 12); c.lineTo(10, -10); c.stroke(); c.beginPath(); c.moveTo(10, -10); c.lineTo(14, -14); c.lineTo(12, -6); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-10, 4); c.lineTo(-4, 10); c.stroke(); }
  else { c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.fill(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(6, -4, 11, 0, TAU); c.fill(); }
  c.restore();
}
const _drawRelics5 = drawRelics;
drawRelics = function () {
  _drawRelics5();
  if (!G.cards) return;
  const n = G.cards.length, w = 270, h = 330, gap = 30, x0 = VW / 2 - (n * w + (n - 1) * gap) / 2, y = 270;
  G.cards.forEach((k, i) => {
    const x = x0 + i * (w + gap), hov = mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h, yy = y - (hov ? 10 : 0);
    // 卡角两幅小图：左上主题，右上主题（同一个），让卡一眼能认
    const m = relicMotif(k), col = hov ? RED : INK;
    drawMotif(ctx, m, x + 34, yy + 34, .9, col); ctx.globalAlpha = .25; drawMotif(ctx, m, x + w - 34, yy + 34, .9, col); ctx.globalAlpha = 1;
    // 代价：卡片下方一条红色小牌
    const b = G.cardBad && G.cardBad[k];
    if (b !== undefined && !G.skillRound && G.meta.mode !== 'easy') {
      panel(x + 14, yy + h + 10, w - 28, 40, .95);
      ctx.strokeStyle = RED; ctx.lineWidth = 1.5; rrect(ctx, x + 14, yy + h + 10, w - 28, 40, 12); ctx.stroke();
      text('Cost:  ' + RELIC_BAD[b][0], x + w / 2, yy + h + 30, 16, RED, 'center', 1, null, 'italic');
    }
  });
};

/* ---------- 10. 资源点不挨着岩石和河：周围两格内有障碍就换个地方 ---------- */
function nodeCrowded(x, y) {
  const c0 = colOf(x), r0 = rowOf(y);
  for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++) {
    const c = c0 + dc, r = r0 + dr; if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
    const b = grid[idx(c, r)]; if (b && b !== 'lamp' && b.type === 'rock') return true;
  }
  return false;
}
const _spawnNodes5 = spawnNodes;
spawnNodes = function () {
  const before = new Set(G.nodes);
  _spawnNodes5();
  const MD = modeOf();
  for (const n of G.nodes) {
    if (before.has(n) || !nodeCrowded(n.x, n.y)) continue;
    for (let t = 0; t < 30; t++) {
      const p = MD.nodeFar ? (freeSpot(300, 540) || freeSpot(230, 520)) : freeSpot(170, 470);
      if (p && !nodeCrowded(p.x, p.y) && !G.nodes.some(o => o !== n && Math.hypot(o.x - p.x, o.y - p.y) < 70)) { n.x = p.x; n.y = p.y; break; }
    }
  }
};

/* ---------- 11. 英雄的箭碰到墙、塔、岩石就钉在上面（河水上面可以飞过去） ---------- */
const _updProj5b = updProj;
updProj = function (p, dt) {
  if (p.kind === 'harrow' && !p.dead) {
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, c = colOf(nx), r = rowOf(ny);
    if (c >= 0 && r >= 0 && c < COLS && r < ROWS) {
      const b = grid[idx(c, r)];
      if (b && b !== 'lamp' && !b.water && b.type === 'rock') { // 只钉在岩石上；自己的塔和墙箭能穿过去
        (G.stuck = G.stuck || []).push({ x: p.x, y: p.y, a: Math.atan2(p.vy, p.vx), t: 1.1, wall: true });
        p.dead = true; thud(.05, 500); return;
      }
    }
  }
  return _updProj5b(p, dt);
};

/* ---------- 12. 难度一排：左边加"Difficulty"标签，从没选过时外框轻轻闪 ---------- */
const _drawModes5 = drawModes;
drawModes = function (y) {
  const w = 150, gap = 15, x0 = VW / 2 - (3 * w + 2 * gap) / 2;
  text('Difficulty', x0 - 16, y, 18, INK, 'right', .85, null, 'italic');
  if (!G.meta.mode) { ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.globalAlpha = .3 + .4 * Math.abs(Math.sin(G.time * 3)); rrect(ctx, x0 - 8, y - 30, 3 * w + 2 * gap + 16, 60, 18); ctx.stroke(); ctx.globalAlpha = 1; }
  _drawModes5(y);
};

/* ---------- 13. 弓箭手再削一点：伤害 16→13，射速 0.28→0.34 秒一箭，穿透 2→1 ---------- */
if (BAL.hero.bow) { const b = BAL.hero.bow; b.dmg = Math.min(b.dmg, 15); b.cd = Math.max(b.cd, .3); b.pierce = Math.min(b.pierce, 2); } // 测出来比剑客弱太多（55% vs 90%），调回一半
if (BAL.hero.seal) { const s = BAL.hero.seal; s.dmg = Math.max(s.dmg, 34); s.cd = Math.min(s.cd, .66); } // 印师也偏弱（65%），加强一点

/* ---------- 14. 技能冷却卡（Quick Stroke）太猛：每张 −30% → −15%，叠多少张冷却最多只到原来的 70% ---------- */
RELIC_FX.sk_cd = () => { G.mods.skillCd = Math.max(.7, (G.mods.skillCd || 1) * .85); };
TXT.relic.sk_cd = Object.assign({}, TXT.relic.sk_cd, { desc: 'Your skill comes back 15% sooner. Stacks down to 70%.' });

/* ---------- 15. 弓箭手大招（箭雨）修 bug ----------
   a) 以前能落在地图任何地方（点哪儿落哪儿，能打到屏幕边刚刷出来的怪）→ 最远 420 像素
   b) 手机上用的是最后一次触摸的位置，经常落在空地上 → 手机自动瞄最近的怪
   c) Echo 遗物的第二次箭雨会把第一次还没下完的几波直接覆盖掉 → 改成接在后面
   d) 落下的箭只是几条细线 → 画成从天上掉下来的箭 */
const RAIN_RANGE = 420;
const _arrowRain5 = arrowRain;
arrowRain = function (x, y) {
  const h = G.hero;
  if (TOUCH) { const m = nearestMon(h.x, h.y, RAIN_RANGE); if (m) { x = m.x; y = m.y; } else { x = h.x + Math.cos(h.face) * 200; y = h.y + Math.sin(h.face) * 200; } }
  const d = Math.hypot(x - h.x, y - h.y);
  if (d > RAIN_RANGE) { x = h.x + (x - h.x) / d * RAIN_RANGE; y = h.y + (y - h.y) / d * RAIN_RANGE; }
  x = clamp(x, 20, VW - 20); y = clamp(y, 20, VH - 20);
  if (h.rain && h.rain.n > 0) { h.rain.n += 6; h.rain.x = x; h.rain.y = y; ring(x, y, BAL.hero.bow.skillR, INK, .5); return; }
  _arrowRain5(x, y);
  (G.rainFx = G.rainFx || []);
};
// 落箭的样子：从上方斜着落下，扎进地里
let rainLast = 0;
const _updHero5r = updHero;
updHero = function (dt, rdt) {
  const h = G.hero, before = h && h.rain ? h.rain.n : 0;
  _updHero5r(dt, rdt);
  if (h && before && (!h.rain || h.rain.n < before)) { // 这一帧下了一波
    const r = h.rain || { x: h.lastRainX, y: h.lastRainY };
    for (let k = 0; k < 6; k++) { const a = rand(TAU), d = rand(BAL.hero.bow.skillR); (G.rainFx = G.rainFx || []).push({ x: r.x + Math.cos(a) * d, y: r.y + Math.sin(a) * d, t: 0 }); }
  }
  if (h && h.rain) { h.lastRainX = h.rain.x; h.lastRainY = h.rain.y; }
  if (G.rainFx) { for (const f of G.rainFx) f.t += dt; G.rainFx = G.rainFx.filter(f => f.t < .5); }
};
const _drawFx5r = drawFx;
drawFx = function () {
  if (G.rainFx && G.state !== 'title') for (const f of G.rainFx) {
    if (f.t < .12) { const k = f.t / .12; drawArrowShape(ctx, f.x - 18 * (1 - k), f.y - 60 * (1 - k), Math.atan2(60, 18), 22, 1); }
    else (G.stuck = G.stuck || []).length < 60 && !f.done && (f.done = 1, G.stuck.push({ x: f.x, y: f.y, a: 0, t: .8 }));
  }
  return _drawFx5r.apply(this, arguments);
};

/* ---------- 16. 电脑上也显示技能冷却：右下角一个圆，转圈 + 剩余秒数（手机上本来就有按钮） ---------- */
const _drawHud5 = drawHud;
drawHud = function () {
  _drawHud5();
  if (TOUCH || G.state === 'prelude' || !G.hero) return;
  const h = G.hero, B = BAL.hero[h.type], full = B.skillCd * (G.mods.skillCd || 1), left = Math.max(0, h.skillCd), ready = left <= 0;
  const night = G.state === 'night', cx = 1520, cy = G.state === 'day' ? 730 : 820, r = 46;
  ctx.fillStyle = night ? 'rgba(20,22,30,.75)' : 'rgba(244,237,219,.92)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  if (!ready) { ctx.fillStyle = 'rgba(22,19,15,.35)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 3, -Math.PI / 2, -Math.PI / 2 + TAU * (left / full)); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = ready ? RED : (night ? '#cfc6b2' : INK); ctx.lineWidth = ready ? 3 + Math.abs(Math.sin(G.time * 4)) * 2 : 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  const ink = night ? '#efe6d0' : INK;
  if (ready) text(HERO_SKILL[h.type] || 'Skill', cx, cy - 6, 18, RED, 'center', 1, null, 'italic');
  else text(left.toFixed(left < 1 ? 1 : 0) + 's', cx, cy - 6, 26, ink, 'center', 1, null, 'bold');
  text('Space', cx, cy + 20, 13, night ? '#cfc6b2' : GREY, 'center', .9, null, 'bold');
};

/* ---------- 17. 手机上的文字：没有 Enter 键，也没有右键 ---------- */
if (TOUCH) {
  TXT.ui = Object.assign({}, TXT.ui, { startNight: 'Start the night', placeTip: 'tap the ground to build, tap the card again to cancel' });
}

/* ---------- 18. 标题页：鼠标放在英雄按钮上，弹一张小卡写技能、冷却和打法 ---------- */
const HERO_INFO = {
  sword: ['Close range. Wide sweeping cuts.', 'cuts through every enemy in a straight line'],
  bow: ['Long range. Arrows slow down and drop.', 'six volleys of arrows on one spot'],
  brush: ['Mid range. Thrown ink blots splash.', 'a wall of ink that blocks them for a few seconds'],
  seal: ['Close range. Heavy stamps; three marks burst.', 'stuns everything in a circle']
};
const _drawTitle5 = drawTitle;
drawTitle = function () {
  _drawTitle5();
  const M = G.meta; if (!M.runs || G.showAbout || G.showDeeds || TOUCH) return;
  if (!(M.unlocks.archer || M.runs > 0)) return;
  heroList().forEach((k, i) => {
    const x = 120 + 56 + i * 110;
    if (mouse.x < x || mouse.x > x + 104 || mouse.y < 555 || mouse.y > 589) return;
    const B = BAL.hero[k], I = HERO_INFO[k]; if (!B || !I) return;
    const w = 480, h = 96, px = clamp(x + 52 - w / 2, 12, VW - 12 - w), py = 452;
    panel(px, py, w, h, .98);
    text((TXT.heroes[k] || k) + '   ·   ' + I[0], px + 18, py + 24, 16, INK, 'left', 1, null, 'italic');
    text('Space: ' + (HERO_SKILL[k] || 'Great Seal') + ', ' + I[1] + '.', px + 18, py + 52, 15, GREY, 'left', 1, null, 'italic');
    text('Cooldown ' + Math.round(B.skillCd) + 's   ·   Health ' + B.hp, px + 18, py + 76, 15, RED, 'left', 1, null, 'bold');
  });
};

/* 19-20. 瞄准线、范围圈、按住瞄准：试过后按组长要求全部去掉 */
