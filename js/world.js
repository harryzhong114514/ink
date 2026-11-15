'use strict';
/* 地图格子、寻路（流场）、建筑、资源点、幸存者 */
const CELL = 40, COLS = 40, ROWS = 22;
const LAMP = { c: 20, r: 11, x: 820, y: 460, rad: 24, hp: 300, maxHp: 300, hitT: 0 };
const LAMP_I = LAMP.r * COLS + LAMP.c;
const grid = new Array(COLS * ROWS).fill(null);
const flow = new Float32Array(COLS * ROWS);
const idx = (c, r) => r * COLS + c;
const colOf = x => clamp(Math.floor(x / CELL), 0, COLS - 1), rowOf = y => clamp(Math.floor(y / CELL), 0, ROWS - 1);
const cellAt = (x, y) => idx(colOf(x), rowOf(y));
const ccx = i => (i % COLS) * CELL + CELL / 2, ccy = i => ((i / COLS) | 0) * CELL + CELL / 2;
const blocking = b => !!b && b !== 'lamp' && !isGround(b.type);
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const BUILD_KEYS = ['wall', 'arrow', 'fire', 'ice', 'thunder', 'spike', 'well'];
const isGround = t => t === 'spike' || t === 'well'; // things enemies walk over instead of around
const TOWER_COL = { wall: GREEN, arrow: INK, fire: RED, ice: QING, thunder: GOLD, spike: GREY, well: INK };
const RES_COL = { bamboo: GREEN, stone: GREY, cinnabar: RED };

function enterCost(i) {
  const b = grid[i];
  if (!b || b === 'lamp') return 1;
  if (b.type === 'rock') return 1e5;
  if (b.type === 'wall') return BAL.path.wall;
  if (isGround(b.type)) return 1;
  return BAL.path.tower;
}
function neighbors(i, fn) {
  const c = i % COLS, r = (i / COLS) | 0;
  for (const [dc, dr] of NB) {
    const nc = c + dc, nr = r + dr;
    if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
    if (dc && dr && (blocking(grid[idx(c + dc, r)]) || blocking(grid[idx(c, r + dr)]))) continue;
    fn(idx(nc, nr), dc && dr ? 1.414 : 1);
  }
}
function buildFlow() {
  flow.fill(1e9); flow[LAMP_I] = 0;
  const hk = [0], hv = [LAMP_I];
  const sw = (a, b) => { let t = hk[a]; hk[a] = hk[b]; hk[b] = t; t = hv[a]; hv[a] = hv[b]; hv[b] = t; };
  const push = (k, v) => { let i = hk.length; hk.push(k); hv.push(v); while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= hk[i]) break; sw(p, i); i = p; } };
  while (hk.length) {
    const d = hk[0], i = hv[0], lk = hk.pop(), lv = hv.pop();
    if (hk.length) {
      hk[0] = lk; hv[0] = lv; let j = 0;
      for (;;) { const l = 2 * j + 1, r = l + 1; let m = j; if (l < hk.length && hk[l] < hk[m]) m = l; if (r < hk.length && hk[r] < hk[m]) m = r; if (m === j) break; sw(m, j); j = m; }
    }
    if (d > flow[i] + 1e-3) continue; // flow is Float32: compare with a little slack or cells get skipped
    const ci = enterCost(i);
    neighbors(i, (n, m) => { const nd = d + ci * m; if (nd < flow[n]) { flow[n] = nd; push(nd, n); } });
  }
}
function nextCell(i) {
  let best = i, bd = flow[i];
  neighbors(i, (n, m) => { const v = flow[n] + enterCost(n) * m * .001; if (v < bd) { bd = v; best = n; } });
  return best;
}

/* ---------- 建筑 ---------- */
function costOf(type) {
  const c = BAL.build[type].cost, o = {};
  const same = G.builds.filter(b => b.type === type).length;  // 同类越造越贵
  const inc = 1 + BAL.costGrowth[type === 'wall' ? 'wall' : 'other'] * same;
  for (const k in c) o[k] = Math.ceil(c[k] * G.mods.cost * inc);
  return o;
}
function afford(type) { const c = costOf(type); for (const k in c) if ((G.res[k] || 0) < c[k]) return false; return true; }
function available(type) {
  if (G.meta.unlocks.veteran) return true;
  const n = G.state === 'night' ? G.night : G.night + 1; // 即将到来（或正在进行）的夜晚
  if (type === 'ice') return n >= 2;
  if (type === 'thunder' || type === 'spike') return n >= 3;
  if (type === 'well') return n >= 4;
  return true;
}
// 灯周围 3×3 不能造：给灯留出空地，也免得一圈墙把灯封死
const nearLamp = i => Math.abs(i % COLS - LAMP.c) <= 1 && Math.abs(((i / COLS) | 0) - LAMP.r) <= 1;
function canPlace(type, i) { return G.state !== 'night' && !nearLamp(i) && !grid[i] && available(type) && afford(type); }
function place(type, i, free = false) {
  const paid = free ? {} : costOf(type);
  if (!free) for (const k in paid) G.res[k] -= paid[k];
  const B = BAL.build[type];
  const hp = B.hp * (type === 'wall' ? G.mods.wallHp : 1);
  const b = { type, i, x: ccx(i), y: ccy(i), hp, maxHp: hp, cd: rand(.3), hitT: 0, age: 0, seed: rand(10), dead: false, lv: 1, paid };
  grid[i] = b; G.builds.push(b); buildFlow();
  if (!free) G.bountyPlaced = (G.bountyPlaced || 0) + 1; // 悬赏：从这次黎明到下次黎明亲手造了几座（白天夜里都算）
  ring(b.x, b.y, 34, TOWER_COL[type], .35); thud(.25, 260);
  for (let k = 0; k < 6; k++) splat(b.x + rand(-14, 14), b.y + rand(-14, 14), rand(2, 5), rand(-1, 1), rand(-1, 1), INK);
  return b;
}
function removeBuild(b, refund) {
  if (b.dead) return;
  b.dead = true; grid[b.i] = null; G.builds = G.builds.filter(x => x !== b); buildFlow();
  if (refund) { const r = refundOf(b); for (const k in r) G.res[k] += r[k]; if (Object.keys(r).length) addText('+' + Object.values(r).join(' / '), b.x, b.y - 30, 18, GREEN, 1); }
  burst(b.x, b.y, 0, -1, 10, TOWER_COL[b.type], Math.PI);
}
function hurtBuild(b, d) {
  if (b.dead || b.type === 'rock') return;
  b.hp -= d; b.hitT = .12; G.stats.buildDmg += d;
  if (b.type === 'wall') G.stats.wallDmg += d;
  if (b.hp <= 0) { G.stats.lostB++; if (b.type === 'wall') G.stats.lostWall++; removeBuild(b, false); thud(.4, 90); addShake(4); splat(b.x, b.y, 12, rand(-1, 1), rand(-1, 1)); }
}
/* 拆除返还：按难度（简单 75% / 普通 50% / 困难 10%）乘剩余血量比例，四舍五入取整。升级花的钱也算在 paid 里 */
function refundOf(b) {
  const o = {}, k = modeOf().refund * clamp(b.hp / b.maxHp, 0, 1);
  for (const r in b.paid || {}) { const v = Math.round(b.paid[r] * k); if (v > 0) o[r] = v; }
  return o;
}
/* 升级：最高 3 级。价格 = 基础造价 × 等级；塔伤害、射程变大，墙和塔血量变多 */
const LV_MAX = 3;
function upgradeCost(b) { const c = BAL.build[b.type].cost, o = {}; for (const k in c) o[k] = Math.ceil(c[k] * G.mods.cost * b.lv * 1.2); return o; }
function canPay(c) { for (const k in c) if ((G.res[k] || 0) < c[k]) return false; return true; }
function pay(c, b) { for (const k in c) { G.res[k] -= c[k]; if (b) b.paid[k] = (b.paid[k] || 0) + c[k]; } }
function upgradeBuild(b) {
  if (b.lv >= LV_MAX || b.type === 'spike' && b.lv >= 2) return false;
  const c = upgradeCost(b); if (!canPay(c)) { addText(TXT.ui.notEnough, b.x, b.y - 30, 20, RED, .8); thud(.15, 300); return false; }
  pay(c, b); b.lv++; const m = b.type === 'wall' ? 1.6 : 1.35; b.maxHp *= m; b.hp = b.maxHp;
  ring(b.x, b.y, 40, GOLD, .5); burst(b.x, b.y, 0, -1, 14, GOLD, Math.PI); sfx('upgrade', 1); sfx('coin', .6);
  addText('Level ' + b.lv, b.x, b.y - 34, 22, GOLD, 1.2); return true;
}
/* 修理：补满血，价格 = 造价 × 缺的血量比例 × 0.6（向上取整，至少 1） */
function repairCost(b) { const f = 1 - b.hp / b.maxHp, c = BAL.build[b.type].cost, o = {}; if (f <= 0) return o; for (const k in c) o[k] = Math.max(1, Math.ceil(c[k] * G.mods.cost * b.lv * f * .6)); return o; }
function repairBuild(b) {
  const c = repairCost(b); if (!Object.keys(c).length) return false;
  if (!canPay(c)) { addText(TXT.ui.notEnough, b.x, b.y - 30, 20, RED, .8); thud(.15, 300); return false; }
  pay(c); b.hp = b.maxHp; ring(b.x, b.y, 30, GREEN, .4); sfx('build', .8, 1.1); return true;
}
const lvMul = b => 1 + .45 * ((b.lv || 1) - 1);
/* 防穿模：怪的圆和挡路格子的方块做碰撞，把怪推到格子外面（原来只按圆形推，角上会挤进去） */
function unclip(m) {
  if (m.fly) return;
  const c0 = colOf(m.x), r0 = rowOf(m.y), R = m.r * .85;
  for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
    const c = c0 + dc, r = r0 + dr; if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
    const b = grid[idx(c, r)]; if (!(blocking(b) || b === 'lamp')) continue;
    const x0 = c * CELL, y0 = r * CELL, px = clamp(m.x, x0, x0 + CELL), py = clamp(m.y, y0, y0 + CELL);
    let dx = m.x - px, dy = m.y - py, d = Math.hypot(dx, dy);
    if (d >= R) continue;
    if (d < .01) { const cx = x0 + CELL / 2, cy = y0 + CELL / 2; dx = m.x - cx; dy = m.y - cy; d = Math.hypot(dx, dy) || 1; m.x = cx + dx / d * (CELL * .71 + R); m.y = cy + dy / d * (CELL * .71 + R); continue; }
    m.x += dx / d * (R - d); m.y += dy / d * (R - d);
  }
}
function genRocks() {
  G.rocks = [];
  const lc = LAMP.c, lr = LAMP.r, want = 4 + (Math.random() * 3 | 0);
  for (let tries = 0; tries < 80 && G.rocks.length < want * 3; tries++) {
    const c0 = 3 + (Math.random() * (COLS - 6) | 0), r0 = 2 + (Math.random() * (ROWS - 5) | 0);
    if (Math.abs(c0 - lc) < 6 && Math.abs(r0 - lr) < 5) continue;                 // 灯周围留出空地
    if ((r0 < 6 && (c0 < 11 || c0 > 29)) || r0 > 16) continue;                   // 左上、右上的信息栏和底部建造栏下面不放
    const cells = [[c0, r0]], n = 2 + (Math.random() * 3 | 0);
    for (let k = 1; k < n; k++) { const [pc, pr] = cells[cells.length - 1], d = pick([[1, 0], [0, 1], [-1, 0], [0, -1]]); cells.push([pc + d[0], pr + d[1]]); }
    const ids = cells.map(([c, r]) => idx(clamp(c, 1, COLS - 2), clamp(r, 1, ROWS - 2))).filter((v, i, a) => a.indexOf(v) === i && !grid[v]);
    const made = ids.map(i => { const b = { type: 'rock', i, x: ccx(i), y: ccy(i), hp: 1, maxHp: 1, seed: rand(10), dead: false }; grid[i] = b; return b; });
    buildFlow();
    // 四条边的中点必须还走得到灯，不然这堆石头撤掉
    const ok = [idx(COLS >> 1, 0), idx(COLS >> 1, ROWS - 1), idx(0, ROWS >> 1), idx(COLS - 1, ROWS >> 1)].every(i => flow[i] < 5e4);
    if (ok) G.rocks.push(...made); else for (const b of made) grid[b.i] = null;
  }
  buildFlow();
}
function towers() { return G.builds.filter(b => b.type !== 'wall' && !isGround(b.type)); }

/* ---------- 资源点 ---------- */
function freeSpot(minD, maxD, margin = 60) {
  for (let k = 0; k < 60; k++) {
    const a = rand(TAU), d = rand(minD, maxD);
    const x = LAMP.x + Math.cos(a) * d * 1.45, y = LAMP.y + Math.sin(a) * d * .8;
    if (x < margin || x > VW - margin || y < 90 || y > VH - 150) continue;
    if (grid[cellAt(x, y)]) continue;
    if (G.nodes.some(n => Math.hypot(n.x - x, n.y - y) < 70)) continue;
    return { x, y };
  }
  return null;
}
function spawnNodes() {
  for (const type of ['bamboo', 'stone', 'cinnabar']) {
    const N = BAL.nodes[type], have = G.nodes.filter(n => n.type === type).length, MD = modeOf();
    const amt = Math.max(5, Math.round(N.amt * MD.nodeAmt * (G.om && G.om.nodeAmt || 1)));
    for (let k = have; k < N.n; k++) {
      // 普通/困难：资源点离灯更远，采一趟要跑，白天的时间才紧张
      const p = MD.nodeFar ? (freeSpot(300, 540) || freeSpot(230, 520)) : freeSpot(170, 470); if (!p) continue;
      G.nodes.push({ type, x: p.x, y: p.y, amt, max: amt, seed: rand(10), acc: 0 });
    }
  }
}
function gather(dt) {
  const h = G.hero; if (h.down) return;
  for (const n of G.nodes) {
    if (Math.hypot(n.x - h.x, n.y - h.y) > BAL.gather.reach + 14) continue;
    const take = Math.min(n.amt, BAL.gather.rate * G.mods.gather * dt);
    n.amt -= take; n.acc += take; G.res[n.type] += take; G.gathered = true; h.gath = { x: n.x, y: n.y, t: .15, col: RES_COL[n.type], type: n.type };
    if (n.acc >= 4) { addText('+' + Math.round(n.acc), n.x, n.y - 30, 20, RES_COL[n.type], .7); n.acc = 0; sfx(n.type === 'bamboo' ? 'gwood' : n.type === 'stone' ? 'gstone' : 'ggem', .7, 1, .12); }
    if (Math.random() < dt * 10) burst(n.x, n.y, h.x - n.x, h.y - n.y, 1, RES_COL[n.type], .4);
    break;
  }
  G.nodes = G.nodes.filter(n => n.amt > .5);
}

/* ---------- 幸存者 ---------- */
function spawnSurvivor() {
  const p = freeSpot(380, 560, 80); if (!p) return;
  const pool = TXT.survivors.filter(nm => !G.survivors.some(s => s.name === nm));
  if (!pool.length) return;
  G.caller = { name: pick(pool), x: p.x, y: p.y, job: pick(['bamboo', 'stone', 'cinnabar']), t: 0 };
}
function updSurvivor(dt) {
  const s = G.caller; if (!s) return;
  s.t += dt;
  if (!G.hero.down && Math.hypot(s.x - G.hero.x, s.y - G.hero.y) < 46) {
    G.survivors.push({ name: s.name, job: s.job, a: rand(TAU) });
    addText(fmt(TXT.ui.rescued, { name: s.name }), s.x, s.y - 40, 26, GREEN, 2);
    sfx('open', 1); sfx('coin', .5); G.caller = null; G.rescued++; checkDeeds();
  }
}
