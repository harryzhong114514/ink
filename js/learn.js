'use strict';
/* 学习系统：统计每夜打法 → 选出进化 → 生成下一夜的怪潮 */
const DMG_TYPES = ['phys', 'fire', 'ice', 'zap'];
const DMG_COL = { phys: INK, fire: RED, ice: QING, zap: GOLD };
const ARMOR_OF = { phys: 'hard', fire: 'flame', ice: 'frost', zap: 'insul' };
const ARMOR_RES = { flame: ['fire', 'ice'], frost: ['ice', 'fire'], insul: ['zap', 'phys'], hard: ['phys', 'zap'] };
const EVO_COL = { flame: '#c4502a', frost: '#8fbccb', insul: GOLD, hard: GREY, sapper: RED, assassin: RED, fly: INK, detour: INK, split: INK, scatter: INK };

/* Loose Ranks 的文案：data/text.js 里写了就用文案组的，没写才用这里的默认值 */
TXT.evo.scatter = TXT.evo.scatter || { name: 'Loose Ranks', why: 'Your blasts caught too many at once.', weak: 'They keep apart. Single shots still land.' };

/* 黎明报告里每条进化下面的"证据"句：告诉玩家它们是凭什么学到的。
   文案组想改的话，在 data/text.js 的 report 里加一个 ev: { armor: '...', ... } 就会覆盖这里 */
const EV_TXT = Object.assign({
  armor: "{type} did {n}% of your towers' damage.",
  phys: 'Blades and arrows did {n}% of all damage.',
  sapper: 'Towers did {n}% of the damage.',
  assassin: 'You did {n}% of the damage yourself.',
  fly: '{n} walls stood in their way.',
  detour: '{n} of {m} fell in the {from}.',
  split: 'The lamp was never touched.',
  scatter: "Blasts and chains did {n}% of your towers' damage."
}, TXT.report.ev || {});
const pct = v => Math.round(v * 100);

function newStats() {
  return { dmg: { phys: 0, fire: 0, ice: 0, zap: 0 }, tdmg: { phys: 0, fire: 0, ice: 0, zap: 0 }, src: { hero: 0, tower: 0 }, deathDir: [0, 0, 0, 0], kills: 0, heroKills: 0, towerKills: 0,
    lampDmg: 0, heroDowns: 0, spawned: 0, buildDmg: 0, wallDmg: 0, shellIce: 0, lostB: 0,
    // 悬赏用的计数：只数人头，不读伤害占比，所以静功（quiet）不会让悬赏判不了
    killsByType: { phys: 0, fire: 0, ice: 0, zap: 0 }, spawnDir: [0, 0, 0, 0], killDir: [0, 0, 0, 0],
    maxCombo: 0, lostWall: 0, skillUses: 0, clearT: 0, wallsAtStart: 0 };
}

// 黎明报告里的预告：和白天的洪潮剪影对应。无尽模式每 7 夜一个周期
const TEASE_ADD = { 2: 'Something vast has drifted onto the page.', 4: 'It is nearer now. You can see its outline.', 6: TXT.teaser[6] };
function teaserFor(n) {
  const T = BAL.night.total, k = (n - 1) % T;
  if (n % T === 0) return TXT.ui.tideTurns || 'The tide draws back. It will return.'; // 只会在无尽模式里出现
  return TEASE_ADD[k + 1] || TXT.teaser[clamp(k, 0, TXT.teaser.length - 1)];
}
// 第一夜 50 秒（新手早点看到第一次进化），之后按数值表
const nightLen = n => n === 1 ? Math.min(50, BAL.night.len) : BAL.night.len;
/* 1. 怪潮正在学什么：夜里实时算一遍，和 learn() 用同一套门槛，给右上角显示 */
function predictEvo() {
  const s = G.stats, L = BAL.learn; if (!s) return null;
  const ttot = DMG_TYPES.reduce((a, k) => a + s.tdmg[k], 0), tot = DMG_TYPES.reduce((a, k) => a + s.dmg[k], 0);
  if (tot < 60) return null;
  const order = DMG_TYPES.slice().sort((a, b) => s.tdmg[b] - s.tdmg[a]), top = G.mods.mask ? order[1] : order[0];
  const st = s.src.hero + s.src.tower || 1;
  const opts = [];
  if (ttot > 0) opts.push({ k: ARMOR_OF[top], v: s.tdmg[top] / ttot / L.armorShare, why: TXT.dmg[top] + ' ' + pct(s.tdmg[top] / ttot) + '%' });
  if (G.night >= 1) opts.push({ k: 'sapper', v: s.src.tower / st / L.sapperShare, why: 'Towers ' + pct(s.src.tower / st) + '%' });
  if (G.night >= 1) opts.push({ k: 'assassin', v: s.src.hero / st / L.assassinShare, why: 'You ' + pct(s.src.hero / st) + '%' });
  opts.sort((a, b) => b.v - a.v);
  const o = opts[0]; if (!o || o.v < .75 || !TXT.evo[o.k]) return null;
  return { k: o.k, name: TXT.evo[o.k].name, why: o.why, sure: o.v >= 1 };
}
function learn() {
  const s = G.stats, L = BAL.learn, cands = [];
  const tot = DMG_TYPES.reduce((a, k) => a + s.dmg[k], 0) || 1;
  // 长什么甲看"塔"用的伤害类型；英雄的刀伤另算（太多会招来猎手）
  const ttot = DMG_TYPES.reduce((a, k) => a + s.tdmg[k], 0) || 1;
  const order = DMG_TYPES.slice().sort((a, b) => s.tdmg[b] - s.tdmg[a]);
  const top = G.mods.mask ? order[1] : order[0];
  const share = s.tdmg[top] / ttot;
  G.grudge = G.grudge || {};
  for (const k of DMG_TYPES) G.grudge[k] = (k === top && share > .35 && s.tdmg[top] > 0) ? (G.grudge[k] || 0) + 1 : 0; // 连续第几晚
  const grudgeEv = g => g >= 3 ? '   ' + fmt(TXT.ui.grudge || 'They remember: {n} nights of it.', { n: g }) : '';
  if (G.night === 1 && s.tdmg.fire > 0) cands.push({ key: 'flame', score: 9, ev: fmt(EV_TXT.armor, { type: TXT.dmg.fire, n: pct(s.tdmg.fire / ttot) }) });
  else if (share > L.armorShare && s.tdmg[top] > 0 && ttot > tot * .2) cands.push({ key: ARMOR_OF[top], score: (share - L.armorShare) * 3 + .5, ev: fmt(EV_TXT.armor, { type: TXT.dmg[top], n: pct(share) }) + grudgeEv(G.grudge[top]) });
  if (s.dmg.phys / tot > .8 && G.night >= 2) cands.push({ key: 'hard', score: s.dmg.phys / tot - .8 + .2, ev: fmt(EV_TXT.phys, { n: pct(s.dmg.phys / tot) }) });
  const st = s.src.hero + s.src.tower || 1;
  if (G.night >= 2 && s.src.tower / st > L.sapperShare) cands.push({ key: 'sapper', score: s.src.tower / st - L.sapperShare + .3, ev: fmt(EV_TXT.sapper, { n: pct(s.src.tower / st) }) });
  if (G.night >= 2 && s.src.hero / st > L.assassinShare) cands.push({ key: 'assassin', score: s.src.hero / st - L.assassinShare + .3, ev: fmt(EV_TXT.assassin, { n: pct(s.src.hero / st) }) });
  const walls = G.builds.filter(b => b.type === 'wall').length;
  if (G.night >= 2 && walls >= L.flyWalls) cands.push({ key: 'fly', score: .4 + walls / 60, ev: fmt(EV_TXT.fly, { n: walls }) });
  const dd = s.deathDir, dt = dd.reduce((a, b) => a + b, 0);
  if (dt >= 10 && G.night >= 2) { // 第一夜只教火，不同时给绕路
    let from = 0; for (let k = 1; k < 4; k++) if (dd[k] > dd[from]) from = k;
    let to = (from + 2) % 4; for (let k = 0; k < 4; k++) if (k !== from && dd[k] < dd[to]) to = k;
    const sh = dd[from] / dt;
    if (G.night === 2 || sh > .42) cands.push({ key: 'detour', score: G.night === 2 ? 8 : sh, from, to, ev: fmt(EV_TXT.detour, { n: dd[from], m: dt, from: TXT.dir[from] }) });
  }
  if (G.night >= 3 && s.lampDmg === 0 && s.heroDowns === 0) cands.push({ key: 'split', score: .35, ev: EV_TXT.split });
  // 主要靠爆炸和连锁清场，就散开走：范围伤害一次只能碰到一两只
  if (G.night >= 3 && s.tdmg.fire + s.tdmg.zap > 0 && (s.tdmg.fire + s.tdmg.zap) / ttot > .7) cands.push({ key: 'scatter', score: .45, ev: fmt(EV_TXT.scatter, { n: pct((s.tdmg.fire + s.tdmg.zap) / ttot) }) });
  if (typeof extraEvoCands === 'function') extraEvoCands(s, cands);
  cands.sort((a, b) => b.score - a.score);
  const prev = G.evo, next = {};
  for (const c of cands) { if (Object.keys(next).length >= 2) break; if (!next[c.key]) next[c.key] = c; }
  G.evo = next;
  for (const k in next) { G.meta.seenEvo[k] = 1; (G.runEvo = G.runEvo || {})[k] = 1; } // runEvo：本局学会过的全部，结算页用

  // 暗中调节强度
  G.nextMul = (s.lampDmg > LAMP.maxHp * .35 || s.heroDowns >= 2) ? L.easeMul : (s.lampDmg === 0 && s.heroDowns === 0) ? L.hardMul : 1;

  const dirName = d => TXT.dir[d];
  G.report = {
    night: G.night, tot, shares: DMG_TYPES.map(k => ({ k, v: s.dmg[k] / tot })),
    hero: s.src.hero / st, deaths: dd.slice(), deathTot: dt, lampDmg: Math.round(s.lampDmg),
    adapt: Object.keys(next).map(k => { const E = TXT.evo[k], o = next[k]; const f = { from: dirName(o.from), to: dirName(o.to) }; return { k, name: E.name, why: fmt(E.why, f), weak: fmt(E.weak, f), ev: o.ev || '' }; }),
    faded: Object.keys(prev).filter(k => !next[k]).map(k => fmt(TXT.gone, { name: TXT.evo[k].name })),
    teaser: fmt(teaserFor(G.night), { to: next.detour ? dirName(next.detour.to) : dirName(Math.random() * 4 | 0) })
  };
}

function applyEvo(m) {
  const L = BAL.learn, E = G.evo;
  const armors = Object.keys(ARMOR_RES).filter(k => E[k]);
  if (armors.length && (m.type === 'boss' || Math.random() < L.armorFrac)) {
    const a = pick(armors); m.armor = a; const [r, w] = ARMOR_RES[a];
    m.res[r] *= L.resMul; m.res[w] *= L.weakMul;
    const dt = DMG_TYPES.find(t => ARMOR_OF[t] === a);
    if (G.grudge && (G.grudge[dt] || 0) >= 3) { m.grudge = true; m.hp = m.maxHp = m.maxHp * 1.3; m.res[r] *= .8; } // 记了三晚以上的仇：甲更厚
  }
  if (m.type === 'boss') return;
  const small = m.type === 'blob' || m.type === 'swift';
  if (E.sapper && (small || m.type === 'brute') && Math.random() < L.behaviorFrac) m.beh = 'sapper';
  if (E.assassin && small && !m.beh && Math.random() < L.behaviorFrac) { m.beh = 'assassin'; m.sp *= 1.15; }
  if (E.fly && small && Math.random() < L.flyFrac) { m.fly = true; m.hp = m.maxHp = m.maxHp * .6; }
  if (E.split && m.type === 'blob') m.split = true;
  if (E.scatter) m.scatter = true;
}

function edgePoint(d) {
  return d === 0 ? [rand(120, VW - 120), -30] : d === 1 ? [VW + 30, rand(90, VH - 90)] : d === 2 ? [rand(120, VW - 120), VH + 30] : [-30, rand(90, VH - 90)];
}
function wpick(w) { const s = w.reduce((a, b) => a + b, 0); let r = rand(s); for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; } return w.length - 1; }

function planNight(n) {
  const boss = n % BAL.night.total === 0;
  let budget = (n === 1 ? BAL.wave.tutorial1 : BAL.wave.base + BAL.wave.perNight * n) * G.nextMul * G.diffMul.budget;
  if (boss) budget *= .6;
  const w = [1, 1, 1, 1];
  if (n === 1) { w[0] = 2; w[1] = 1.4; w[2] = .2; w[3] = .2; }
  else w[Math.random() * 4 | 0] += 1.2;
  if (G.evo.detour) { w[G.evo.detour.from] = .2; w[G.evo.detour.to] += 3; }
  const types = Object.keys(BAL.mon).filter(t => t !== 'boss' && BAL.mon[t].from <= Math.max(1, n + (modeOf().early || 0)));
  const tw = { blob: 5, swift: 3, brute: 1.3, spit: 1.5, bomb: 1.2, leech: 1.1, herald: .9, mimic: .7, weaver: .8 };
  const groups = [];
  while (budget > 0) {
    const ty = types[wpick(types.map(t => tw[t]))], c = BAL.mon[ty].cost;
    let cnt = ty === 'blob' ? 4 + (rand(5) | 0) : ty === 'swift' ? 3 + (rand(3) | 0) : ty === 'brute' ? 1 : ty === 'leech' ? 1 + (rand(2) | 0) : ty === 'herald' || ty === 'weaver' || ty === 'mimic' ? 1 + (rand(2) | 0) : 2;
    cnt = Math.max(1, Math.min(cnt, Math.ceil(budget / c)));
    budget -= cnt * c; groups.push({ ty, cnt, dir: wpick(w) });
  }
  groups.sort(() => Math.random() - .5);
  const q = [], span = nightLen(n) * BAL.wave.span;
  groups.forEach((g, k) => {
    const surge = n > 1 && k % 3 === 0, t0 = surge ? 2 + span * .62 + rand(0, 3) : 2 + span * k / groups.length + rand(0, 1.5), [ex, ey] = edgePoint(g.dir);
    for (let i = 0; i < g.cnt; i++) q.push({ t: t0 + i * .14, type: g.ty, dir: g.dir, x: ex + (g.dir % 2 ? rand(-20, 20) : rand(-60, 60)), y: ey + (g.dir % 2 ? rand(-60, 60) : rand(-20, 20)) });
  });
  if (boss) q.push({ t: 5, type: 'boss', dir: 0, x: VW / 2, y: -60 });
  q.sort((a, b) => a.t - b.t);
  G.queue = q; G.queueTotal = q.length; G.surgeAt = n > 1 ? 2 + span * .62 : -1; G.surgeSaid = false;
  G.incoming = [0, 1, 2, 3].map(d => q.filter(e => e.dir === d).length);
}
