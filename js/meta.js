'use strict';
/* 局外：存档、商店解锁、遗物、难度 */
const SAVE_KEY = 'inktide_v1';
function loadMeta() {
  const d = { souls: 0, best: 0, runs: 0, wins: 0, seenMon: {}, seenEvo: {}, unlocks: {}, depth: 1, depthMax: 1, hero: 'sword', deeds: {}, mode: 'normal' };
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) return Object.assign(d, s); } catch (e) {}
  return d;
}
function saveMeta() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.meta)); } catch (e) {} }

const SHOP = [
  { k: 'veteran', cost: 40 },
  { k: 'satchel', cost: 60 },
  { k: 'archer', cost: 90 },
  { k: 'oil', cost: 110 },
  { k: 'fourth', cost: 150 },
  { k: 'survivor', cost: 200 },
  { k: 'relicStart', cost: 420 },
  { k: 'reroll', cost: 500 },
  { k: 'heirloom', cost: 600 }
];
/* 三个长期项目：改的是开局能选什么，不是把数字调大。文案兜底在这里，data/text.js 写同名条目会覆盖 */
TXT.shop.relicStart = TXT.shop.relicStart || { name: 'First Gift', desc: 'One relic in hand from the first morning.' };
TXT.shop.reroll = TXT.shop.reroll || { name: 'Second Thought', desc: 'Reroll a bounty once each run.' };
TXT.shop.heirloom = TXT.shop.heirloom || { name: 'Heirloom', desc: 'Start with the relic you took last run.' };
function buy(item) {
  if (G.meta.unlocks[item.k] || G.meta.souls < item.cost) { thud(.15, 300); return; }
  G.meta.souls -= item.cost; G.meta.unlocks[item.k] = 1; saveMeta();
  sfx('coin', 1);
  if (item.k === 'archer') G.meta.hero = 'bow';
}
function nextGoal() {
  const left = SHOP.filter(s => !G.meta.unlocks[s.k]).sort((a, b) => a.cost - b.cost)[0];
  return left ? { name: TXT.shop[left.k].name, need: Math.max(0, left.cost - G.meta.souls) } : null;
}

/* 新遗物的文案：data/text.js 里写了同名条目就用文案组的，没写才用这里的默认值 */
TXT.relic.kindling = TXT.relic.kindling || { name: 'Kindling', desc: 'Slain burning enemies set the ones beside them alight.' };
TXT.relic.brittle = TXT.relic.brittle || { name: 'Brittle', desc: 'Slowed enemies take 25% more damage.' };
TXT.relic.conductor = TXT.relic.conductor || { name: 'Conductor', desc: 'Lightning does double to slowed enemies.' };
TXT.relic.quiet = TXT.relic.quiet || { name: 'Quiet Work', desc: 'Kills you make yourself no longer teach the tide.' };
TXT.relic.mason = TXT.relic.mason || { name: 'Mason', desc: 'Walls are rebuilt to full at every dawn.' };
TXT.relic.warden = TXT.relic.warden || { name: 'Warden', desc: 'Enemies near the lamp take 20% more damage.' };

const RELIC_FX = {
  edge: () => G.mods.heroDmg *= 1.25,
  stride: () => G.mods.sp *= 1.15,
  oil: () => { LAMP.maxHp += 100; LAMP.hp = LAMP.maxHp; },
  crafts: () => G.mods.cost *= .85,
  harvest: () => G.mods.gather *= 1.5,
  pitch: () => G.mods.fire *= 1.3,
  marrow: () => { G.mods.ice *= 1.3; G.mods.slowT *= 1.4; },
  rod: () => G.mods.chain += 2,
  fletch: () => G.mods.rate *= 1.2,
  rampart: () => { G.mods.wallHp *= 1.6; for (const b of G.builds) if (b.type === 'wall') { b.maxHp *= 1.6; b.hp *= 1.6; } },
  thirst: () => G.mods.thirst = true,
  echo: () => G.mods.echo = true,
  hoard: () => G.mods.souls *= 1.5,
  mask: () => G.mods.mask = true,
  kindling: () => G.mods.kindling = true,
  brittle: () => G.mods.brittle = true,
  conductor: () => G.mods.conductor = true,
  quiet: () => G.mods.quiet = true,
  mason: () => G.mods.mason = true,
  warden: () => G.mods.warden = true
};
const UNIQUE = ['thirst', 'echo', 'mask', 'oil', 'kindling', 'brittle', 'conductor', 'quiet', 'mason', 'warden'];
/* 磨刀石：每天黎明固定多给一张，英雄伤害 +15%、刀的攻击范围 +8%，可以一直叠 */
TXT.relic.whet = TXT.relic.whet || { name: 'Whetstone', desc: 'Your blade: +15% damage, +8% reach. Stacks.' };
RELIC_FX.whet = () => { G.mods.heroDmg *= 1.15; G.mods.reach = (G.mods.reach || 1) * 1.08; };
TXT.relic.erase = TXT.relic.erase || { name: 'Erasure', desc: 'They forget one thing they learned, starting tonight.' };
RELIC_FX.erase = () => { const ks = Object.keys(G.evo); if (!ks.length) return; const k = pick(ks); delete G.evo[k]; addText(fmt(TXT.ui.forgot || 'They forgot {name}', { name: TXT.evo[k].name }), VW / 2, 300, 40, GOLD, 2.4); };
const SKILL_CARDS = ['sk_cd', 'sk_dmg', 'sk_burn'];
TXT.relic.sk_cd = TXT.relic.sk_cd || { name: 'Quick Stroke', desc: 'Your skill comes back 30% sooner.' };
TXT.relic.sk_dmg = TXT.relic.sk_dmg || { name: 'Heavy Stroke', desc: 'Your skill hits 50% harder.' };
TXT.relic.sk_burn = TXT.relic.sk_burn || { name: 'Burning Ink', desc: 'Your skill sets them alight.' };
RELIC_FX.sk_cd = () => { G.mods.skillCd = (G.mods.skillCd || 1) * .7; };
RELIC_FX.sk_dmg = () => { G.mods.skillDmg = (G.mods.skillDmg || 1) * 1.5; };
RELIC_FX.sk_burn = () => { G.mods.skillBurn = (G.mods.skillBurn || 0) + 6; };
function rollRelics() {
  if (G.night > 0 && G.night % 3 === 0 && !G.endless) { G.cards = SKILL_CARDS.slice(); G.cards.push('whet'); G.skillRound = true; return; } // 第 3、6 夜后：练技能
  G.skillRound = false;
  let pool = Object.keys(RELIC_FX).filter(k => !(UNIQUE.includes(k) && G.relics.includes(k)));
  if (G.night < 2) pool = pool.filter(k => k !== 'mask');
  pool = pool.filter(k => k !== 'whet' && !SKILL_CARDS.includes(k) && (k !== 'erase' || Object.keys(G.evo).length)); pool.sort(() => Math.random() - .5);
  G.cards = pool.slice(0, G.meta.unlocks.fourth ? 4 : 3); G.cards.push('whet');
}
function takeRelic(k) { RELIC_FX[k](); G.relics.push(k); G.meta.lastRelic = k; sfx('open', .9); sfx('coin', .7); }

/* 开局自带遗物：First Gift 从池子里随机给一个；Heirloom 给上一局最后拿到的那个（两个都有就各给一个）。
   在 newRun 已经把 G.relics 清空之后调用。mask 是"假面"，第一夜就给没有意义，两边都排除。 */
function startRelics() {
  const M = G.meta;
  if (M.unlocks.heirloom && M.lastRelic && RELIC_FX[M.lastRelic] && !G.relics.includes(M.lastRelic)) takeRelic(M.lastRelic);
  if (M.unlocks.relicStart) {
    const pool = Object.keys(RELIC_FX).filter(k => !G.relics.includes(k) && k !== 'mask');
    if (pool.length) takeRelic(pool[Math.random() * pool.length | 0]);
  }
}

/* 三档难度：在 data/balance.js 的基础数值上再乘一层，组员 C 改的基础数不受影响。
   heroHp 英雄血、wallHp 墙血、lampHp 灯血、nodeAmt 每个资源点的量、nodeFar 资源点离灯多远（0 近 1 远）、
   monHp 怪血、budget 每夜怪的数量、elite 精英（墨甲、带甲怪、Boss）的加强、raid 普通怪改去打塔的比例 */
const MODES = {
  easy:   { refund: .75, early: -1, heroHp: 1,   wallHp: .8,  lampHp: 1.2, nodeAmt: 1,   nodeFar: 0, monHp: .95, budget: 1,    elite: 1,   raid: .15 },
  normal: { refund: .5, early: 0, heroHp: .85, wallHp: .65, lampHp: 1,   nodeAmt: .85, nodeFar: 1, monHp: 1.02, budget: 1.02, elite: 1.35, raid: .25 },
  hard:   { refund: .1, early: 0, heroHp: .75, wallHp: .55, lampHp: 1.25, nodeAmt: .8,  nodeFar: 1, monHp: 1, budget: 1, elite: 1.5, raid: .35 },
};
const MODE_KEYS = ['easy', 'normal', 'hard'];
const OMENS = [
  { k: 'wind',    good: true,  name: 'High Wind',    desc: 'Fire towers reach 20% farther... and every tower a little.', om: { range: 1.12, fire: 1.15 } },
  { k: 'clear',   good: true,  name: 'Clear Sky',    desc: 'Arrows fly true. Arrow towers +30% damage.', om: { phys: 1.3 } },
  { k: 'harvest', good: true,  name: 'Harvest Moon', desc: 'Every pile holds 50% more today.', om: { nodeAmt: 1.5 } },
  { k: 'calm',    good: true,  name: 'Still Water',  desc: 'The tide is sluggish tonight. Enemies 12% slower.', om: { monSp: .88 } },
  { k: 'storm',   good: true,  name: 'Thunderhead',  desc: 'Storm Drums hit 40% harder tonight.', om: { zap: 1.4 } },
  { k: 'rain',    good: false, name: 'Rain',         desc: 'Fire burns weak (-30%). Frost bites harder (+30%).', om: { fire: .7, ice: 1.3 } },
  { k: 'fog',     good: false, name: 'Fog',          desc: 'Towers see 15% less far tonight.', om: { range: .85 } },
  { k: 'drought', good: false, name: 'Drought',      desc: 'Piles hold 35% less today.', om: { nodeAmt: .65 } },
  { k: 'ink',     good: false, name: 'Ink Wind',     desc: 'The tide runs 12% faster tonight.', om: { monSp: 1.12 } },
  { k: 'thaw',    good: false, name: 'Thaw',         desc: 'Frost Bells hit 30% softer tonight.', om: { ice: .7 } }
];
function rollOmen() {
  G.omen = null; G.om = {};
  if (G.night < 1) return; // 第一天教学，不加变数
  const o = OMENS[Math.random() * OMENS.length | 0]; G.omen = o; G.om = Object.assign({}, o.om);
  addText(o.name, VW / 2, 340, 34, o.good ? GREEN : RED, 2.6);
}
function devUnlock() {
  const M = G.meta; for (const s of SHOP) M.unlocks[s.k] = 1;
  M.unlocks.veteran = M.unlocks.archer = 1; M.depthMax = 5; M.souls = Math.max(M.souls, 9999); M.runs = Math.max(M.runs, 1); M.dev = 1; saveMeta();
}
window.addEventListener('keydown', e => { if (e.code === 'KeyD' && e.ctrlKey && e.shiftKey && G.state === 'title') { e.preventDefault(); devUnlock(); } });
TXT.menu.modes = TXT.menu.modes || { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
TXT.menu.modeDesc = TXT.menu.modeDesc || { easy: 'More health. Resources close by.', normal: 'The tide hits towers. Elites hit hard.', hard: 'Fewer resources. The tide does not forgive.' };
const modeOf = () => MODES[G.meta.mode] || MODES.normal;
function diffFor(depth) {
  const M = modeOf();
  return { hp: (1 + .22 * (depth - 1)) * M.monHp, budget: (1 + .18 * (depth - 1)) * M.budget, elite: M.elite, raid: M.raid };
}

/* ---------- 每夜悬赏：白天抽一个目标，当晚完成，黎明发奖励；没完成没有惩罚 ----------
   数值和文案都写在这里兜底，组员在 data/ 里写同名条目就会覆盖。
   只用计数类统计（人头、灯血、建造数），不读伤害占比，所以带静功（quiet）也不会判不了。 */
TXT.ui.bounty = TXT.ui.bounty || 'Bounty';
TXT.ui.bountyNew = TXT.ui.bountyNew || 'Bounty: {name}';
TXT.ui.bountyKeptLine = TXT.ui.bountyKeptLine || 'Bounty kept: {name}   {reward}';
TXT.ui.bountyLostLine = TXT.ui.bountyLostLine || 'Bounty missed: {name}';
TXT.ui.bountyReroll = TXT.ui.bountyReroll || 'R reroll';

const BOUNTY_POOL = [
  { id: 'frost', label: 'Frost kills', from: 2, need: 15, cur: st => st.killsByType.ice, reward: { res: { cinnabar: 25 } } },
  { id: 'fire', label: 'Fire kills', from: 2, need: 12, cur: st => st.killsByType.fire, reward: { res: { stone: 25 } } },
  { id: 'blade', label: 'Kills by your own hand', from: 2, need: 20, cur: st => st.heroKills, reward: { souls: 20 } },
  { id: 'lamp', label: 'Lamp untouched', from: 2, bin: true, cur: st => st.lampDmg === 0 ? 1 : 0, word: st => st.lampDmg === 0 ? 'kept' : 'lost', reward: { souls: 30 } },
  { id: 'still', label: 'Raise nothing today', from: 2, bin: true, cur: () => G.bountyPlaced ? 0 : 1, word: () => G.bountyPlaced ? 'lost' : 'kept', reward: { res: { bamboo: 35 } } },
  { id: 'clear', label: 'Field clear before dawn', from: 2, bin: true, cur: st => st.clearT > 0 && st.clearT <= nightLen(G.night) - 20 ? 1 : 0, word: st => st.clearT > 0 && st.clearT <= nightLen(G.night) - 20 ? 'kept' : 'lost', reward: { souls: 35 } },
  { id: 'noskill', label: 'Skill unused', from: 2, bin: true, cur: st => st.skillUses === 0 ? 1 : 0, word: st => st.skillUses === 0 ? 'kept' : 'lost', reward: { res: { cinnabar: 20 } } },
  { id: 'chain', label: 'Chain of 15', from: 2, need: 15, cur: st => st.maxCombo, reward: { souls: 20 } },
  { id: 'wall', label: 'No wall falls', from: 3, bin: true, req: () => G.builds.some(b => b.type === 'wall'), cur: st => st.wallsAtStart > 0 && st.lostWall === 0 ? 1 : 0, word: st => st.wallsAtStart === 0 ? 'no walls' : st.lostWall === 0 ? 'kept' : 'lost', reward: { res: { bamboo: 20, stone: 20 } } },
  { id: 'side', label: 'Nothing gets past the {dir}', from: 3, bin: true, dir: true, cur: (st, B) => st.spawnDir[B.dir] >= 6 && st.killDir[B.dir] >= st.spawnDir[B.dir] ? 1 : 0, word: (st, B) => st.killDir[B.dir] >= st.spawnDir[B.dir] && st.spawnDir[B.dir] >= 6 ? 'kept' : 'lost', reward: { souls: 25 } },
  { id: 'zap', label: 'Lightning kills', from: 3, need: 10, cur: st => st.killsByType.zap, reward: { res: { stone: 20, cinnabar: 20 } } },
  { id: 'many', label: 'Kills tonight', from: 3, need: 45, cur: st => st.kills, reward: { souls: 25 } },
  { id: 'raise', label: 'Raise two towers', from: 4, need: 2, cur: () => G.bountyPlaced || 0, reward: { res: { bamboo: 25, stone: 25 } } }
];
const bountyDef = B => BOUNTY_POOL.find(b => b.id === B.id) || null;
const bountyName = (d, B) => fmt(d.label, { dir: TXT.dir[B.dir] });
const bountyReward = r => r.souls ? '+' + r.souls + ' souls' : Object.keys(r.res).map(k => '+' + r.res[k] + ' ' + TXT.res[k].toLowerCase()).join(', ');
function bountyRight(d, st, B) { return d.bin ? d.word(st, B) : (d.cur(st, B) | 0) + ' / ' + d.need; }
function bountyDone(d, st, B) { return d.cur(st, B) >= (d.need || 1); }

function rollBounty(n) {
  G.bounty = null; G.bountyLine = ''; G.bountyKept = false; G.bountyPlaced = 0;
  if (n < 2) return null;                                   // 第 1 夜不打扰新手
  const inc = G.incoming || [0, 0, 0, 0];
  let dir = 0; for (let k = 1; k < 4; k++) if (inc[k] > inc[dir]) dir = k;
  const pool = BOUNTY_POOL.filter(b => b.from <= n && (!b.req || b.req()) && (!b.dir || inc[dir] >= 6));
  if (!pool.length) return null;
  const b = pool[Math.random() * pool.length | 0];
  G.bounty = { id: b.id, dir };
  return G.bounty;
}
function rerollBounty() {                                   // 墨魂商店买的重掷：每局一次
  if (G.state !== 'day' || !G.bounty || G.rerollLeft <= 0) return;
  const was = G.bounty.id; G.rerollLeft--;
  const inc = G.incoming || [0, 0, 0, 0];
  let dir = 0; for (let k = 1; k < 4; k++) if (inc[k] > inc[dir]) dir = k;
  const pool = BOUNTY_POOL.filter(b => b.from <= G.night + 1 && b.id !== was && (!b.req || b.req()) && (!b.dir || inc[dir] >= 6));
  if (!pool.length) return;
  G.bounty = { id: pool[Math.random() * pool.length | 0].id, dir };
  sfx('coin', .8);
}
function settleBounty(st) {
  G.bountyLine = ''; G.bountyKept = false;
  const B = G.bounty; if (!B) return false;
  const d = bountyDef(B); if (!d) return false;
  const done = bountyDone(d, st, B);
  if (done) {
    G.bountyCount = (G.bountyCount || 0) + 1;
    if (d.reward.souls) G.runSouls += d.reward.souls;
    if (d.reward.res) for (const k in d.reward.res) G.res[k] += d.reward.res[k];
  }
  G.bountyKept = done;
  G.bountyLine = done ? fmt(TXT.ui.bountyKeptLine, { name: bountyName(d, B), reward: bountyReward(d.reward) })
                      : fmt(TXT.ui.bountyLostLine, { name: bountyName(d, B) });
  return done;
}
// HUD 上的实时进度：白天还没开打，计数项先显示 0，条件项先不判定（显示一条横线）
const BOUNTY_ZERO = newStats();
function bountyLive() {
  const B = G.bounty; if (!B) return null;
  const d = bountyDef(B); if (!d) return null;
  const night = G.state === 'night';
  const st = night ? G.stats : BOUNTY_ZERO;
  return {
    name: bountyName(d, B),
    right: night ? bountyRight(d, st, B) : d.bin ? '—' : '0 / ' + d.need,
    done: night && bountyDone(d, st, B),
    tagged: d.bin
  };
}

/* ---------- 功绩：可选目标，教玩家看懂"潮会学习"，完成即得墨魂 ----------
   check(dawn)：dawn 为黎明结算时传入的当夜数据 { st 当夜统计, evo 当夜进化, walls 墙数, night }，战斗中为 null。 */
const maxShare = st => { const t = DMG_TYPES.reduce((a, k) => a + st.dmg[k], 0) || 1; return Math.max(...DMG_TYPES.map(k => st.dmg[k] / t)); };
const DEEDS = [
  { id: 'unlearn', name: 'Nothing to Learn', desc: 'Survive a night where no damage type did over 40%.', reward: 40, check: d => d && d.night >= 2 && d.st.kills >= 20 && maxShare(d.st) <= .4 },
  { id: 'shatter', name: 'Shell Breaker', desc: 'Kill 30 Ember Shells with frost in one night.', reward: 50, check: d => !d && G.state === 'night' && !!G.evo.flame && G.stats.shellIce >= 30 },
  { id: 'hunted', name: 'Hunted, Untouched', desc: 'Survive a night of Hunters without the lamp being hit.', reward: 60, check: d => d && !!d.evo.assassin && d.st.lampDmg === 0 && d.st.kills >= 15 },
  { id: 'breakers', name: 'Hold the Line', desc: 'Survive a night of Breakers without losing a building.', reward: 45, check: d => d && !!d.evo.sapper && d.st.lostB === 0 && d.st.kills >= 25 },
  { id: 'detour', name: 'Wrong Foot', desc: 'Survive a night on a New Path without the lamp being hit.', reward: 30, check: d => d && !!d.evo.detour && d.st.lampDmg === 0 && d.st.kills >= 20 },
  { id: 'open', name: 'Open Ground', desc: 'Survive night 4 or later with no walls standing.', reward: 40, check: d => d && d.night >= 4 && d.walls === 0 && d.st.kills >= 25 },
  { id: 'chain', name: 'Unbroken', desc: 'Reach a chain of 25.', reward: 25, check: d => !d && G.maxCombo >= 25 },
  { id: 'rescue', name: 'Open Doors', desc: 'Rescue 3 survivors in one run.', reward: 25, check: d => !d && G.rescued >= 3 },
  { id: 'deluge', name: 'The Tide Recedes', desc: 'Defeat the Deluge.', reward: 50, check: d => !d && G.bossDead },
  { id: 'deluge2', name: 'Deeper Water', desc: 'Defeat the Deluge at depth 2 or more.', reward: 80, check: d => !d && G.bossDead && G.meta.depth >= 2 },
  { id: 'endless', name: 'Past the Page', desc: 'Survive night 10 in endless mode.', reward: 70, check: d => d && G.endless && d.night >= 10 }
];
function checkDeeds(dawn = null) {
  for (const d of DEEDS) {
    if (G.meta.deeds[d.id] || !d.check(dawn)) continue;
    G.meta.deeds[d.id] = 1; G.meta.souls += d.reward; G.runDeeds.push(d); saveMeta();
    sfx('open', .9); sfx('coin', .7);
    if (dawn) G.deedQ.push(d); else addText(fmt(TXT.ui.deedDone || 'Deed: {name}   +{n} souls', { name: d.name, n: d.reward }), VW / 2, 270 + (G.runDeeds.length % 3) * 36, 28, GOLD, 3.2);
  }
}
