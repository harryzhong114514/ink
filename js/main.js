'use strict';
/* 游戏状态、昼夜流程、新手剧本、世界绘制、主循环 */
const G = {
  state: 'title', time: 0, meta: loadMeta(), mons: [], builds: [], projs: [], nodes: [], lights: [], survivors: [], evo: {}, stats: null,
  res: { bamboo: 0, stone: 0, cinnabar: 0 }, mods: {}, relics: [], hero: null, night: 0, phaseT: 0, dayLen: 60, hint: '', hintA: 0, dark: 0,
  combo: 0, comboT: 0, maxCombo: 0, kills: 0, runSouls: 0, hitstop: 0, modalT: 0, nextMul: 1, diffMul: { hp: 1, budget: 1 }, queue: [], incoming: [0, 0, 0, 0],
  rescued: 0, runDeeds: [], deedQ: [], buildSel: null, caller: null, boss: null, bossNight: false, bossDead: false, endless: false, loop: 0, cards: null, report: null, newBuild: null
};
G.stats = newStats();

function newRun() {
  initAudio();
  grid.fill(null); grid[LAMP_I] = 'lamp'; G.nodes = []; genRocks();
  const M = G.meta, mul = M.unlocks.satchel ? 1.5 : 1;
  const MD = modeOf();
  LAMP.maxHp = Math.round(BAL.lamp.hp * MD.lampHp) + (M.unlocks.oil ? 100 : 0); LAMP.hp = LAMP.maxHp;
  Object.assign(G, {
    state: 'prelude', mons: [], builds: [], projs: [], nodes: [], lights: [], survivors: [], evo: {}, stats: newStats(), relics: [],
    res: { bamboo: BAL.start.bamboo * mul, stone: BAL.start.stone * mul, cinnabar: BAL.start.cinnabar * mul },
    mods: { heroDmg: 1, sp: 1, cost: 1, gather: 1, fire: 1, ice: 1, slowT: 1, chain: 0, rate: 1, wallHp: MD.wallHp, thirst: false, echo: false, souls: 1, mask: false,
      kindling: false, brittle: false, conductor: false, quiet: false, mason: false, warden: false },
    hero: makeHero(heroPick()), night: 0, phaseT: 0, hint: '', hintA: 0, combo: 0, comboT: 0, maxCombo: 0, kills: 0, runSouls: 0,
    rocks: G.rocks, allies: [], selB: null, omen: null, om: {}, runEvo: {}, hintRaw: '', nextMul: 1, diffMul: diffFor(M.depth), queue: [], buildSel: null, caller: null, boss: null, bossNight: false, bossDead: false, endless: false, loop: 0,
    cards: null, report: null, newBuild: null, bossT: 0, hitstop: 0, gathered: false, rescued: 0, runDeeds: [], deedQ: [], tut: {}, closeS: 0, earned: 0, newDepth: 0, preludeT: 0,
    bounty: null, bountyLine: '', bountyKept: false, bountyPlaced: 0, bountyCount: 0,
    rerollLeft: G.meta.unlocks.reroll ? 1 : 0, // 每局一次的悬赏重掷，开局就有、用完就没了
    leechSpawned: 0, heraldSpawned: 0
  });
  G.hero.maxHp = G.hero.hp = Math.round(G.hero.maxHp * MD.heroHp);
  if (M.unlocks.survivor) G.survivors.push({ name: pick(TXT.survivors), job: pick(['bamboo', 'stone', 'cinnabar']), a: 0 });
  startRelics(); // 商店买的开局遗物（First Gift / Heirloom）
  buildFlow();
  pctx.clearRect(0, 0, VW, VH);
  FX.parts = []; FX.texts = []; FX.lines = []; FX.rings = []; FX.arcs = [];
  M.runs++; saveMeta();
  // 开场：不进菜单，直接打一小波
  for (let i = 0; i < BAL.wave.prelude; i++) { // 墨滴落在灯北边约 250 像素处，3 秒内就会接触
    const x = LAMP.x + (i - (BAL.wave.prelude - 1) / 2) * 52 + rand(-14, 14), y = LAMP.y - 200 - (i % 3) * 34 - rand(0, 20);
    spawnMon('blob', x, y, 1, { noEvo: true });
    ring(x, y, 40, INK, .45); splat(x, y, 9, 0, 1);
  }
  addText(TXT.title, VW / 2, 240, 90, INK, 2.2);
  thud(.5, 160);
}
function toTitle() { G.state = 'title'; G.modalT = 0; G.boss = null; G.showDeeds = false; pctx.clearRect(0, 0, VW, VH); FX.texts = []; } // 回标题时擦掉上一局的墨迹，否则会盖住标题页文字

function startDay() {
  G.state = 'day'; G.buildSel = null;
  G.dayLen = G.night === 0 ? BAL.day.firstLen : BAL.day.len; G.phaseT = G.dayLen;
  rollOmen(); // 11. 先定天象，资源点的量要用到
  spawnNodes();
  // 幸存者少而珍贵：第 2 天必有一个，之后偶尔来，整局最多 3 个
  if (G.survivors.length < 3) { if (G.night === 1) spawnSurvivor(); else if (G.night >= 3 && Math.random() < .3) spawnSurvivor(); }
  G.deedQ.forEach((d, i) => addText(fmt(TXT.ui.deedDone || 'Deed: {name}   +{n} souls', { name: d.name, n: d.reward }), VW / 2, 300 + i * 36, 28, GOLD, 3.2)); G.deedQ = [];
  if (G.caller) addText(TXT.survivorCall, G.caller.x, G.caller.y - 60, 24, GREEN, 3);
  G.newBuild = BUILD_KEYS.filter(k => available(k) && !G.tut['seen_' + k]);
  for (const k of G.newBuild) G.tut['seen_' + k] = 1;
  if (G.night === 0) G.newBuild = null;
  if (G.night >= 5 && (G.allies || []).length < 2) addAlly(); // 第 5 晚过后，每天来一个队友，最多两个
  planNight(G.night + 1);
  rollBounty(G.night + 1); // 每天白天抽一个悬赏；第 1 夜不出
  addText(TXT.ui.day + ' ' + (G.night + 1), VW / 2, 200, 70, INK, 1.8);
  if ((G.night + 1) % BAL.night.total === 0) addText(TXT.ui.bossComing, VW / 2, 270, 30, RED, 3);
  tone(330, 660, .5, .1, 'triangle');
}
function startNight() {
  if (G.state !== 'day') return;
  if (G.caller) { addText(TXT.ui.lost, G.caller.x, G.caller.y - 40, 22, GREY, 2); G.caller = null; }
  if (G.night === 0 && !G.builds.some(b => b.type === 'fire')) { // 新手保底：送一座火塔
    const i = [LAMP_I - COLS * 2, LAMP_I - COLS * 2 + 1, LAMP_I - COLS * 2 - 1, LAMP_I + 2].find(j => !grid[j]);
    if (i !== undefined) { place('fire', i, true); addText(TXT.ui.freeTower, ccx(i), ccy(i) - 50, 22, RED, 2.5); }
  }
  G.night++; G.state = 'night'; G.phaseT = 0; G.stats = newStats(); G.buildSel = null; G.nightIntro = 0; G.trails = []; G.inkWalls = []; G.incomingNight = (G.incoming || [1, 1, 1, 1]).slice();
  G.stats.wallsAtStart = G.builds.filter(b => b.type === 'wall').length; // 悬赏"墙一块不倒"的起点
  G.bossNight = G.night % BAL.night.total === 0; G.bossDead = false; G.boss = null; planNightEvent();
  addText(TXT.ui.night + ' ' + G.night, VW / 2, 200, 76, RED, 1.8);
  tone(220, 55, 1.4, .25, 'sawtooth'); thud(.6, 70);
}
function dawn() {
  for (const m of G.mons) { splat(m.x, m.y, m.r * .6, 0, -1, INK); m.dead = true; }
  G.mons = []; G.projs = [];
  if (G.combo) G.combo = 0;
  const tonight = { st: G.stats, evo: G.evo, walls: G.builds.filter(b => b.type === 'wall').length, night: G.night };
  settleBounty(G.stats); // 先结算悬赏再 learn()，奖励加的是资源/墨魂，不影响学习统计
  learn();
  checkDeeds(tonight);
  LAMP.hp = Math.min(LAMP.maxHp, LAMP.hp + LAMP.maxHp * BAL.lamp.healPerDawn);
  if (G.mods.mason) for (const b of G.builds) if (b.type === 'wall') b.hp = b.maxHp; // 砌匠：黎明把墙补满
  for (const s of G.survivors) G.res[s.job] += BAL.survivorIncome;
  G.runSouls += BAL.souls.perNight;
  fadePaper(.45); FX.texts = []; // 报告页下面不要透出旧的飘字
  G.state = 'report'; G.modalT = 0;
  saveMeta();
}
function finishRun(win) {
  const M = G.meta;
  G.earned = Math.round((G.runSouls + (win ? BAL.souls.win : 0)) * G.mods.souls);
  if (M.runs <= 3) { // 前三局保底：至少够买最便宜的未拥有项，别让新手空手而归
    const cheap = SHOP.filter(it => !M.unlocks[it.k]).sort((a, b) => a.cost - b.cost)[0];
    if (cheap) G.earned = Math.max(G.earned, cheap.cost - M.souls);
  }
  M.souls += G.earned; M.best = Math.max(M.best, G.night);
  if (win) { M.wins++; if (M.depth >= M.depthMax && M.depthMax < 5) { M.depthMax++; G.newDepth = M.depthMax; } }
  saveMeta();
}
function gameOver() {
  if (G.state !== 'night' && G.state !== 'day') return;
  G.closeS = G.state === 'night' && !G.bossNight ? Math.max(0, nightLen(G.night) - G.phaseT) : 0;
  G.state = 'over'; G.modalT = 0; G.buildSel = null; mouse.down = false;
  finishRun(false);
  addShake(20); FX.flash = 1; FX.flashCol = RED; thud(1, 50); tone(200, 40, 2, .3, 'sawtooth');
  for (let k = 0; k < 10; k++) splat(LAMP.x + rand(-80, 80), LAMP.y + rand(-80, 80), rand(10, 30), rand(-1, 1), rand(-1, 1));
}
function winRun() { G.state = 'win'; G.modalT = 0; settleBounty(G.stats); finishRun(true); sfx('coin', 1); sfx('open', 1); } // Boss 夜没有黎明报告，悬赏在这里结
function continueEndless() { G.endless = true; G.state = 'night'; G.bossDead = false; G.runSouls = 0; G.newDepth = 0; dawn(); } // 胜利时墨魂已入账，无尽模式从 0 重新计

/* ---------- 新手提示 ----------
   手机上没有键盘和鼠标：凡是提到按键、左键、右键、指向的提示，换成点按的说法。
   按原句查表，原句（来自 data/text.js 或这里的默认句）对不上就原样显示 */
function touchHint(h) {
  const T = TXT.hint, M = {};
  M[T.move] = 'Drag the bottom-left to move. You strike on your own.';
  M[T.build] = 'Tap Fire below, then tap the ground near the lamp.';
  M[T.place || 'Click the ground near the lamp to place it.'] = 'Tap the ground near the lamp to place it.';
  M[T.ready] = 'Build more if you can.   Tap Start Night.';
  M[T.day2] = 'Ember Shell resists fire. Tap Frost to build a Frost Bell.';
  M[T.strike || 'Hold left-click to strike.   Space dashes through them.'] = 'You strike on your own.   Tap Dash to cut through them.';
  M[T.remove || 'Right-click a building to take it down. Half the cost comes back.'] = 'Tap a building to upgrade, repair or take it down.';
  M[T.hover || 'Point at anything to see what it does.'] = 'Tap a building to see what it can do.';
  return M[h] || h;
}
function hints(dt) {
  if (G.meta.noTut) { G.hintA += (0 - G.hintA) * Math.min(1, dt * 4); return; } // 9. 关掉教学
  const T = TXT.hint, n = G.night; let h = '';
  if (G.state === 'prelude') h = T.move;
  else if (G.state === 'day' && n === 0) {
    if (!G.builds.some(b => b.type === 'fire')) h = G.buildSel === 'fire' ? (T.place || 'Click the ground near the lamp to place it.') : !G.gathered && G.dayLen - G.phaseT < 9 ? T.gather : T.build;
    else h = !G.gathered ? T.gather : T.ready;
  } else if (G.state === 'night' && n === 1 && G.phaseT < 7) h = T.night1;
  else if (G.state === 'night' && n === 1 && G.phaseT < 15) h = T.strike || 'Hold left-click to strike.   Space dashes through them.';
  else if (G.state === 'day' && n === 1) h = G.caller && G.dayLen - G.phaseT > 12 ? T.rescue : G.evo.flame ? T.day2 : '';
  else if (G.state === 'night' && n === 2 && G.phaseT < 7) h = T.night2;
  else if (G.state === 'day' && n === 2) { const e = G.dayLen - G.phaseT; h = e < 10 ? (T.remove || 'Right-click a building to take it down. Half the cost comes back.') : e < 18 ? (T.hover || 'Point at anything to see what it does.') : G.phaseT < 10 ? T.free : ''; }
  else if (G.state === 'day' && n === 3 && G.dayLen - G.phaseT < 10) h = T.raid || 'A red bar over an enemy means it hunts your towers.';
  if (h) { G.hintRaw = h; G.hint = TOUCH ? touchHint(h) : h; }
  G.hintA += ((h ? 1 : 0) - G.hintA) * Math.min(1, dt * 4);
}

/* ---------- 更新 ---------- */
function update(dt, rdt) {
  G.time += rdt; G.modalT += rdt; G.introT += rdt;
  if (G.spotWait) { const w = G.spotWait, m = w.m; G.spotWait = null;
    if (m.dead || G.state !== 'night') G.tut.spot = 0; // 没来得及亮相就死了：换下一只
    else if (m.x > 160 && m.x < VW - 160 && m.y > 160 && m.y < VH - 240) { G.spot = { m, t: 0, k: w.k }; thud(.6, 70); tone(880, 440, .9, .08, 'triangle'); }
    else G.spotWait = w; }
  if (G.bossIntro !== undefined && G.bossIntro !== null) { G.bossIntro += rdt; if (G.bossIntro < 2.2) dt *= .15; if (G.bossIntro > 3.2 || G.state !== 'night') G.bossIntro = null; }
  if (G.state === 'night' && G.nightIntro !== null && G.nightIntro !== undefined) { G.nightIntro += rdt; if (G.nightIntro > 3) G.nightIntro = null; }
  if (G.trails) { for (const tr of G.trails) tr.t -= dt; G.trails = G.trails.filter(tr => tr.t > 0); }
  if (G.state === 'night' && G.surgeAt > 0 && !G.surgeSaid && G.phaseT >= G.surgeAt - 1.5) { G.surgeSaid = true; addText(TXT.ui.surge || 'The tide surges', VW / 2, 260, 52, RED, 2); addShake(8); sfx('roar', .8, 1.2); sfx('boom', .8); } // 7. 高潮波预警
  if (G.spot) { G.spot.t += rdt; if (G.spot.t < 1.8) dt *= .2; if (G.spot.t > 3.4 || G.state !== 'night') G.spot = null; } // 慢动作亮相
  if (G.state === 'title' && !G.showDeeds && !G.showAbout && G.introT > 2.8 && G.modalT > .3 && (pressed.Enter || pressed.NumpadEnter || pressed.Space)) { pressed.Enter = pressed.NumpadEnter = pressed.Space = false; newRun(); return; }
  updFx(rdt);
  LAMP.hitT = Math.max(0, LAMP.hitT - rdt);
  const darkTarget = (G.state === 'night' || (G.state === 'over' && G.night > 0)) ? (G.mapKind === 'forest' ? .8 : .66) : 0;
  G.dark += clamp(darkTarget - G.dark, -rdt * .7, rdt * .5);
  for (const l of G.lights) l.t -= rdt; G.lights = G.lights.filter(l => l.t > 0);
  const play = G.state === 'prelude' || G.state === 'day' || G.state === 'night';
  if (!play) { for (const k in pressed) pressed[k] = false; mouse.pressed = mouse.rpressed = false; return; }

  // 建造输入
  const canBuild = G.state === 'day'; // 夜里不能造、不能拆、不能升级，防误触
  if (!canBuild) { G.buildSel = null; G.selB = null; }
  BUILD_KEYS.forEach((k, i) => { if (pressed['Digit' + (i + 1)] && canBuild && available(k)) { G.buildSel = G.buildSel === k ? null : k; tone(700, 900, .06, .05); } });
  if (pressed.KeyR) rerollBounty(); // 商店买的"再想想"：白天重掷一次悬赏
  if (pressed.Escape) { G.buildSel = null; G.selB = null; }
  if (G.selB && (G.selB.dead || !canBuild)) G.selB = null;
  if (pressed.Enter || pressed.NumpadEnter) startNight();
  if (mouse.rpressed && canBuild) {
    if (G.buildSel) G.buildSel = null;
    else { const b = grid[cellAt(mouse.x, mouse.y)]; if (b && b !== 'lamp' && b.type !== 'rock') { removeBuild(b, true); G.selB = null; } }
  }
  // 白天空手点一座建筑：弹出 升级 / 修理 / 拆除 小菜单（手机上也能用）。点菜单按钮本身不会走到这里
  if (canBuild && !G.buildSel && mouse.pressed) { const b = grid[cellAt(mouse.x, mouse.y)]; G.selB = b && b !== 'lamp' && b.type !== 'rock' ? (G.selB === b ? null : b) : null; }
  if (G.buildSel && (mouse.pressed || (mouse.down && G.buildSel === 'wall'))) {
    const i = cellAt(mouse.x, mouse.y);
    if (canPlace(G.buildSel, i)) place(G.buildSel, i);
    else if (mouse.pressed && !grid[i] && !afford(G.buildSel)) { addText(TXT.ui.notEnough, mouse.x, mouse.y - 30, 20, RED, .8); thud(.15, 300); }
  }
  mouse.pressed = mouse.rpressed = false;

  updHero(dt, rdt);
  if (G.state !== 'night') gather(dt);
  updSurvivor(dt);
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
  for (const k in pressed) pressed[k] = false;

  if (G.state === 'day') { G.phaseT -= dt; if (G.phaseT <= 0) startNight(); }
  if (G.state === 'night') {
    G.phaseT += dt;
    while (G.queue.length && G.queue[0].t <= G.phaseT) {
      const q = G.queue.shift(), m = spawnMon(q.type, q.x, q.y, q.dir);
      if (q.type === 'boss') { G.boss = m; addShake(14); thud(.9, 45); G.bossIntro = 0; } // 14. Boss 登场演出
    }
  }
  for (const b of G.builds) updBuild(b, dt);
  heraldAura(); // 传令的怪每帧给身边的人续加速
  for (const m of G.mons) if (!m.dead) updMon(m, dt);
  separate(); for (const m of G.mons) unclip(m);
  updAllies(dt); updExtras(dt);
  for (const p of G.projs) updProj(p, dt);
  G.mons = G.mons.filter(m => !m.dead); G.projs = G.projs.filter(p => !p.dead);
  if (G.state !== 'night' && G.state !== 'prelude' && G.state !== 'day') return; // 期间可能已经失败

  if (G.state === 'prelude' && !G.mons.length) { G.preludeT += dt; if (G.preludeT > 1) { G.stats = newStats(); startDay(); } }
  if (G.state === 'night') {
    // 悬赏"天亮前清场"：怪和队列都清空的那一刻记下时间，给够 20 秒余量才算
    const clear = !G.queue.length && !G.mons.length && G.phaseT > 6;
    if (clear && !G.stats.clearT) G.stats.clearT = G.phaseT;
    if (G.bossNight) { if (G.bossDead && !G.mons.some(m => m.type === 'boss')) { G.bossT = (G.bossT || 0) + dt; if (G.bossT > 2.5) { G.bossT = 0; if (G.endless) dawn(); else { for (const m of G.mons) m.dead = true; G.mons = []; winRun(); } } } }
    else if (clear || G.phaseT >= nightLen(G.night)) dawn();
  }
  hints(dt);
}

/* ---------- 绘制世界 ---------- */
function drawNode(n) {
  const c = ctx, k = .45 + .55 * n.amt / n.max;
  if (n.type === 'bamboo') {
    for (let j = 0; j < 4; j++) {
      const x = n.x - 15 + j * 10, h = (34 + (j * 7 + n.seed * 5) % 16) * k;
      c.strokeStyle = GREEN; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, n.y + 14); c.lineTo(x + Math.sin(G.time + j) * 2, n.y + 14 - h); c.stroke();
      c.fillStyle = INK; for (let s = 1; s < 3; s++) c.fillRect(x - 3, n.y + 14 - h * s / 3, 6, 2);
    }
  } else if (n.type === 'stone') {
    blobPath(c, n.x, n.y, 22 * k + 6, n.seed, 0, .18); c.fillStyle = GREY; c.fill();
    c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  } else {
    for (let j = 0; j < 3; j++) {
      const a = j * 2.1 + n.seed, x = n.x + Math.cos(a) * 9, y = n.y + Math.sin(a) * 6, s = (11 + j * 3) * k + 3;
      c.fillStyle = j ? RED : '#8e2414'; c.beginPath(); c.moveTo(x, y - s * 1.3); c.lineTo(x + s * .55, y); c.lineTo(x, y + s * .5); c.lineTo(x - s * .55, y); c.closePath(); c.fill();
    }
  }
  if (Math.hypot(G.hero.x - n.x, G.hero.y - n.y) < BAL.gather.reach + 14) {
    c.strokeStyle = RES_COL[n.type]; c.lineWidth = 2; c.globalAlpha = .6; c.beginPath(); c.arc(n.x, n.y, 30, -Math.PI / 2, -Math.PI / 2 + TAU * n.amt / n.max); c.stroke(); c.globalAlpha = 1;
  }
}
function drawBuildIcon(k, x, y, s = 1, a = 1) {
  const c = ctx; c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= a;
  if (k === 'wall') { for (let j = 0; j < 4; j++) { c.fillStyle = j % 2 ? '#3f5a30' : GREEN; c.fillRect(-17 + j * 9, -16 + (j % 2) * 2, 7, 33 - (j % 2) * 2); } c.fillStyle = INK; c.fillRect(-18, -6, 36, 3); c.fillRect(-18, 7, 36, 3); }
  else if (k === 'spike') { c.fillStyle = GREY; c.globalAlpha *= .5; c.fillRect(-17, -17, 34, 34); c.globalAlpha /= .5; c.fillStyle = INK; for (let j = 0; j < 9; j++) { const px = -12 + (j % 3) * 12, py = -10 + ((j / 3) | 0) * 11; c.beginPath(); c.moveTo(px - 4, py + 5); c.lineTo(px, py - 6); c.lineTo(px + 4, py + 5); c.fill(); } }
  else {
    blobPath(c, 0, 4, 17, 2, 0, .08); c.fillStyle = INK; c.fill();
    const col = TOWER_COL[k];
    if (k === 'arrow') { c.fillStyle = PAPER; c.beginPath(); c.moveTo(0, -18); c.lineTo(9, 2); c.lineTo(-9, 2); c.fill(); }
    else if (k === 'fire') { const f = 1 + Math.sin(G.time * 12) * .1; c.fillStyle = col; c.beginPath(); c.moveTo(0, -24 * f); c.quadraticCurveTo(13, -4, 0, 8); c.quadraticCurveTo(-13, -4, 0, -24 * f); c.fill(); c.fillStyle = '#f0a050'; c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill(); }
    else if (k === 'ice') { c.fillStyle = col; c.beginPath(); c.moveTo(-11, 6); c.quadraticCurveTo(-11, -18, 0, -18); c.quadraticCurveTo(11, -18, 11, 6); c.closePath(); c.fill(); c.fillStyle = PAPER; c.beginPath(); c.arc(0, 8, 3, 0, TAU); c.fill(); }
    else if (k === 'thunder') { c.fillStyle = col; c.beginPath(); c.ellipse(0, -2, 13, 9, 0, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(-3, -9); c.lineTo(2, -2); c.lineTo(-2, -1); c.lineTo(3, 6); c.stroke(); }
  }
  c.restore();
}
function drawBuild(b) {
  const c = ctx;
  if (b.hitT > 0) { c.save(); c.translate(rand(-2, 2), rand(-2, 2)); }
  drawBuildIcon(b.type, b.x, b.y, 1, 1);
  if (b.hitT > 0) c.restore();
  if (b.hp < b.maxHp) { const f = b.hp / b.maxHp; bar(b.x - 16, b.y + 20, 32, 4, f, f < .35 ? RED : INK); }
}
function drawLamp() {
  /* 长明灯：一座石灯笼——底座、灯柱、灯室、弯檐屋顶，灯室里一团火，外面一圈暖光 */
  const c = ctx, x = LAMP.x, y = LAMP.y, f = LAMP.hp / LAMP.maxHp, fl = 1 + Math.sin(G.time * 9) * .06 + Math.sin(G.time * 23) * .04;
  c.save(); if (LAMP.hitT > 0) c.translate(rand(-3, 3), rand(-3, 3));
  const g = c.createRadialGradient(x, y - 14, 4, x, y - 14, 90 * (.5 + .5 * f));
  g.addColorStop(0, 'rgba(242,180,90,' + (.35 * f + .05) + ')'); g.addColorStop(1, 'rgba(242,180,90,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y - 14, 90, 0, TAU); c.fill();
  c.fillStyle = INK;
  c.beginPath(); c.moveTo(x - 24, y + 28); c.lineTo(x + 24, y + 28); c.lineTo(x + 17, y + 20); c.lineTo(x - 17, y + 20); c.fill();   // 底座
  c.fillRect(x - 5, y + 4, 10, 17);                                                                                                    // 灯柱
  c.beginPath(); c.moveTo(x - 16, y + 6); c.lineTo(x + 16, y + 6); c.lineTo(x + 12, y + 1); c.lineTo(x - 12, y + 1); c.fill();      // 托盘
  c.strokeStyle = INK; c.lineWidth = 2.5; rrect(c, x - 12, y - 24, 24, 25, 3); c.stroke();                                            // 灯室
  c.fillStyle = LAMP.hitT > 0 ? RED : '#f2c26b'; c.globalAlpha = .3 + .55 * f; rrect(c, x - 10, y - 22, 20, 21, 2); c.fill(); c.globalAlpha = 1;
  c.fillStyle = INK; c.fillRect(x - 1.2, y - 23, 2.4, 22);                                                                             // 窗棂
  c.beginPath(); c.moveTo(x - 26, y - 25); c.quadraticCurveTo(x - 10, y - 30, x, y - 42); c.quadraticCurveTo(x + 10, y - 30, x + 26, y - 25); // 弯檐屋顶
  c.quadraticCurveTo(x, y - 27, x - 26, y - 25); c.fill();
  c.beginPath(); c.arc(x, y - 44, 3.5, 0, TAU); c.fill();                                                                             // 宝珠
  c.fillStyle = RED; c.beginPath(); const h = 13 * fl * (.4 + .6 * f);
  c.moveTo(x, y - 6 - h); c.quadraticCurveTo(x + 6, y - 8, x, y - 3); c.quadraticCurveTo(x - 6, y - 8, x, y - 6 - h); c.fill();
  c.fillStyle = '#f7d27a'; c.beginPath(); c.arc(x, y - 6, 2.2 * fl, 0, TAU); c.fill();
  c.restore();
  if (f < .3 && G.state === 'night' && Math.random() < .2 && FX.parts.length < 420) FX.parts.push({ x: x + rand(-8, 8), y: y - 20, vx: rand(-15, 15), vy: -rand(30, 60), life: .6, r: 2, color: GREY }); // 快灭了冒烟
}
function drawMon(m) {
  const c = ctx, col = m.flashW > 0 ? '#f4eddb' : m.flash > 0 ? RED : INK; if (m.flashW > 0) m.flashW -= 1 / 60;
  let y = m.y;
  if (m.fly) { c.fillStyle = 'rgba(22,19,15,.18)'; c.beginPath(); c.ellipse(m.x, m.y + 8, m.r, m.r * .4, 0, 0, TAU); c.fill(); y -= 16 + Math.sin(m.age * 6) * 3; }
  if (m.grudge) { c.strokeStyle = EVO_COL[m.armor]; c.lineWidth = 2; c.globalAlpha *= .6; blobPath(c, m.x, m.y, m.r + 11, m.seed + 2, G.time, .2); c.stroke(); c.globalAlpha = 1; } // 记仇的甲：外面再多一圈
  if (m.armor) {
    const a0 = c.globalAlpha; c.strokeStyle = EVO_COL[m.armor]; c.lineWidth = m.armor === 'hard' ? 6 : 5; c.globalAlpha = a0 * .9;
    if (m.armor === 'flame') { c.setLineDash([6, 5]); c.lineDashOffset = -G.time * 30; }
    if (m.armor === 'insul') c.setLineDash([2, 6]);
    blobPath(c, m.x, y, m.r + 5, m.seed + 1, G.time, .18); c.stroke(); c.setLineDash([]);
    if (m.armor !== 'hard') { c.fillStyle = EVO_COL[m.armor]; c.globalAlpha = a0 * .28; c.fill(); }
    c.globalAlpha = a0;
  }
  if (m.type === 'swift') {
    const a = Math.atan2(m.vy, m.vx);
    c.save(); c.translate(m.x, y); c.rotate(a); c.fillStyle = col; c.beginPath();
    c.moveTo(m.r * 1.7, 0); c.quadraticCurveTo(-m.r * .2, m.r * 1.1, -m.r * 1.3, m.r * .5); c.lineTo(-m.r * .7, 0); c.lineTo(-m.r * 1.3, -m.r * .5); c.quadraticCurveTo(-m.r * .2, -m.r * 1.1, m.r * 1.7, 0);
    c.fill(); c.restore();
  } else { blobPath(c, m.x, y, m.r, m.seed, G.time, m.type === 'boss' ? .09 : .13); c.fillStyle = col; c.fill(); }
  if (m.type === 'leech') { // 一只扁平的吸盘贴在塔上，几条细足抓进去
    c.strokeStyle = m.flash > 0 ? RED : INK; c.lineWidth = 2;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(m.x + s * m.r * .6, y); c.quadraticCurveTo(m.x + s * m.r * 1.6, y + m.r * .5, m.x + s * m.r * .3, y + m.r * 1.5); c.stroke(); }
    c.fillStyle = PAPER; c.beginPath(); c.arc(m.x, y, m.r * .34, 0, TAU); c.fill();
  }
  if (m.type === 'herald') { // 头顶一圈淡墨，表示它身边的怪被催快了
    c.strokeStyle = m.flash > 0 ? RED : GREY; c.globalAlpha *= .35;
    c.lineWidth = 2; c.setLineDash([5, 7]); c.lineDashOffset = G.time * 14;
    c.beginPath(); c.arc(m.x, y, (BAL.mon.herald.aura || 130) * .34, 0, TAU); c.stroke();
    c.setLineDash([]); c.globalAlpha = 1;
    c.fillStyle = RED; c.beginPath(); c.moveTo(m.x, y - m.r * 2.1); c.lineTo(m.x + 5, y - m.r * 1.55); c.lineTo(m.x - 5, y - m.r * 1.55); c.fill();
  }
  if (m.type === 'spit') { c.fillStyle = PAPER; c.beginPath(); c.arc(m.x, y, m.r * .45, 0, TAU); c.fill(); c.fillStyle = RED; c.beginPath(); c.arc(m.x, y, m.r * .35 * clamp(1 - m.shoot / 2.2, .2, 1), 0, TAU); c.fill(); }
  if (m.type === 'bomb') { c.fillStyle = RED; c.globalAlpha *= .6 + .4 * Math.sin(m.age * 14); c.beginPath(); c.arc(m.x, y, m.r * .5, 0, TAU); c.fill(); c.globalAlpha = 1; }
  if (m.fly) { c.strokeStyle = INK; c.lineWidth = 2.5; const w = Math.sin(m.age * 18) * 6; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(m.x + s * m.r * .6, y); c.quadraticCurveTo(m.x + s * m.r * 1.8, y - 12 + w, m.x + s * m.r * 2.1, y + 2 + w); c.stroke(); } }
  if (m.beh === 'sapper') { c.fillStyle = RED; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(m.x + s * m.r * .5, y - m.r * .7); c.lineTo(m.x + s * m.r * .9, y - m.r * 1.5); c.lineTo(m.x + s * m.r * .15, y - m.r * .85); c.fill(); } }
  if (m.raid) { c.strokeStyle = RED; c.lineWidth = 2.5; c.beginPath(); c.moveTo(m.x - m.r * .6, y - m.r * 1.2); c.lineTo(m.x + m.r * .6, y - m.r * 1.2); c.stroke(); } // 一道朱红横杠：它要去拆塔
  if (m.split) { c.fillStyle = INK; c.beginPath(); c.arc(m.x + m.r * .9, y + m.r * .6, m.r * .3, 0, TAU); c.arc(m.x - m.r * .9, y + m.r * .5, m.r * .25, 0, TAU); c.fill(); }
  if (m.slowT > 0) { c.fillStyle = QING; c.globalAlpha *= .7; for (let j = 0; j < 3; j++) { const a = G.time * 2 + j * 2.1; c.beginPath(); c.arc(m.x + Math.cos(a) * m.r, y + Math.sin(a) * m.r, 2.5, 0, TAU); c.fill(); } c.globalAlpha = 1; }
  if (m.burnT > 0 && Math.random() < .3 && FX.parts.length < 420) FX.parts.push({ x: m.x + rand(-m.r, m.r), y: y - m.r * .5, vx: rand(-20, 20), vy: -rand(40, 90), life: .3, r: 2.5, color: RED });
  if ((m.type === 'brute' || m.type === 'boss') && m.hp < m.maxHp && m.type !== 'boss') bar(m.x - m.r, y - m.r - 12, m.r * 2, 4, m.hp / m.maxHp, RED);
}
function drawEyes(m) {
  const c = ctx, y = m.fly ? m.y - 16 - Math.sin(m.age * 6) * 3 : m.y;
  const tx = m.beh === 'assassin' ? G.hero.x : LAMP.x, ty = m.beh === 'assassin' ? G.hero.y : LAMP.y;
  const a = m.type === 'swift' ? Math.atan2(m.vy, m.vx) : Math.atan2(ty - m.y, tx - m.x), ex = Math.cos(a), ey = Math.sin(a);
  const red = m.beh === 'assassin' || m.type === 'brute' || m.type === 'boss';
  c.fillStyle = red ? '#e0482c' : '#f4eddb';
  const n = m.type === 'boss' ? 3 : 2, s = Math.max(1.8, m.r * (m.type === 'boss' ? .08 : .15));
  for (let k = 0; k < n; k++) {
    const o = (k - (n - 1) / 2) * m.r * (m.type === 'boss' ? .35 : .55);
    const px = m.x + ex * m.r * .35 - ey * o, py = y + ey * m.r * .35 + ex * o;
    if (m.beh === 'assassin') { c.beginPath(); c.ellipse(px, py, s * 1.4, s * .55, a, 0, TAU); c.fill(); }
    else { c.beginPath(); c.arc(px, py, s, 0, TAU); c.fill(); }
  }
}
function drawHero() {
  const h = G.hero, c = ctx;
  if (h.down) { c.globalAlpha = .4; c.strokeStyle = RED; c.lineWidth = 2; c.beginPath(); c.arc(LAMP.x, LAMP.y + 60, 16, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - h.downT / BAL.hero.respawn)); c.stroke(); c.globalAlpha = 1; return; }
  // 走路：身体一上一下、两条腿交替、身子往前倾；采集：手里的工具一下下敲向资源点
  const moving = h.lastX !== undefined && Math.hypot(h.x - h.lastX, h.y - h.lastY) > .3;
  const vx = h.x - (h.lastX ?? h.x); h.lastX = h.x; h.lastY = h.y;
  h.anim = (h.anim || 0) + (moving ? .26 : 0);
  if (moving && Math.floor(h.anim / Math.PI) !== Math.floor((h.anim - .26) / Math.PI)) { pctx.fillStyle = INK; pctx.globalAlpha = .05; pctx.beginPath(); pctx.ellipse(h.x + rand(-3, 3), h.y + 10, 3, 1.6, 0, 0, TAU); pctx.fill(); pctx.globalAlpha = 1; sfx('step', .18, 1, .2); } // 每一步在纸上留一点淡墨脚印
  const bob = moving ? Math.abs(Math.sin(h.anim)) * 3 : Math.sin(G.time * 2.2) * .8, lean = clamp(vx * .05, -.18, .18), y = h.y - bob;
  const sc = h.scarf; c.lineCap = 'round'; c.strokeStyle = RED;
  for (let i = 1; i < sc.length; i++) { const k = 1 - i / sc.length; c.globalAlpha = .35 + k * .6; c.lineWidth = 1 + k * 5; c.beginPath(); c.moveTo(sc[i - 1].x, sc[i - 1].y - bob); c.lineTo(sc[i].x, sc[i].y - bob); c.stroke(); }
  c.globalAlpha = h.inv > 0 && Math.floor(G.time * 18) % 2 ? .35 : 1;
  // 腿
  c.strokeStyle = INK; c.lineWidth = 3.2;
  const st = moving ? Math.sin(h.anim) * 6 : 0;
  c.beginPath(); c.moveTo(h.x - 3, y + 8); c.lineTo(h.x - 4 + st, h.y + 15); c.moveTo(h.x + 3, y + 8); c.lineTo(h.x + 4 - st, h.y + 15); c.stroke();
  c.save(); c.translate(h.x, y); c.rotate(lean);
  c.fillStyle = h.hitT > 0 ? RED : INK; c.beginPath(); c.ellipse(0, 0, 10.5, 12, 0, 0, TAU); c.fill();
  c.strokeStyle = RED; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-9, -2); c.lineTo(9, -2); c.stroke();
  c.restore();
  let a = h.face;
  const gath = h.gath && h.gath.t > 0;
  if (gath) { h.gath.t -= 1 / 60; a = Math.atan2(h.gath.y - h.y, h.gath.x - h.x) + Math.sin(G.time * 16) * .5; if (Math.random() < .25 && FX.parts.length < 420) FX.parts.push({ x: h.gath.x + rand(-10, 10), y: h.gath.y + rand(-10, 10), vx: (h.x - h.gath.x) * 2.2, vy: (h.y - h.gath.y) * 2.2 - 40, life: .35, r: 3, color: h.gath.col }); }
  if (gath && typeof drawGatherTool === 'function') drawGatherTool(c, h, y);
  else if (h.type === 'sword') { c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(h.x + Math.cos(a) * 8, y + Math.sin(a) * 8); c.lineTo(h.x + Math.cos(a) * 30, y + Math.sin(a) * 30); c.stroke(); c.fillStyle = PAPER; c.globalAlpha *= .6; c.beginPath(); c.arc(h.x + Math.cos(a) * 29, y + Math.sin(a) * 29, 1.6, 0, TAU); c.fill(); c.globalAlpha = 1; }
  else if (h.type === 'brush') drawBrushHeld(c, h.x, y, a);
  else if (h.type === 'seal') drawSealHeld(c, h.x, y, a);
  else { c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.arc(h.x, y, 22, a - .9, a + .9); c.stroke(); c.lineWidth = 1; c.beginPath(); c.moveTo(h.x + Math.cos(a - .9) * 22, y + Math.sin(a - .9) * 22); c.lineTo(h.x + Math.cos(a + .9) * 22, y + Math.sin(a + .9) * 22); c.stroke(); }
  c.globalAlpha = 1;
  if (h.hp < h.maxHp || G.state === 'night') { ctx.fillStyle = 'rgba(22,19,15,.35)'; rrect(ctx, h.x - 29, h.y - 47, 58, 11, 5); ctx.fill(); bar(h.x - 27, h.y - 45, 54, 7, h.hp / h.maxHp, h.hp / h.maxHp < .35 ? '#e0402a' : RED, 'rgba(244,237,219,.5)'); } // 血条放头顶，大一点，夜里一直显示
  const B = BAL.hero[h.type];
  if (h.skillCd > 0) { c.strokeStyle = INK; c.globalAlpha = .35; c.lineWidth = 2; c.beginPath(); c.arc(h.x, y, 17, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - h.skillCd / B.skillCd)); c.stroke(); c.globalAlpha = 1; }
}
function drawProj(p) {
  const c = ctx;
  if (p.kind === 'arrow' || p.kind === 'harrow') { const a = Math.atan2(p.vy, p.vx); c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - Math.cos(a) * 16, p.y - Math.sin(a) * 16); c.stroke(); }
  else if (p.kind === 'fire') { c.fillStyle = RED; c.beginPath(); c.arc(p.x, p.y, 7, 0, TAU); c.fill(); c.fillStyle = '#f0a050'; c.beginPath(); c.arc(p.x, p.y, 3, 0, TAU); c.fill(); if (Math.random() < .5 && FX.parts.length < 420) FX.parts.push({ x: p.x, y: p.y, vx: rand(-20, 20), vy: rand(-20, 20), life: .25, r: 3, color: RED }); }
  else if (p.kind === 'blot') drawBlot(c, p);
  else { c.fillStyle = p.el ? EL_COL[p.el] : INK; c.beginPath(); c.arc(p.x, p.y, p.big ? 8 : 6, 0, TAU); c.fill(); c.fillStyle = RED; c.beginPath(); c.arc(p.x, p.y, p.big ? 3.5 : 2.5, 0, TAU); c.fill(); }
}
/* 洪潮的剪影：从第 3 天起，白天沿西边缘缓缓漂入，越近越浓；Boss 前一天最明显。无尽模式每个周期重来 */
function bossProgress() {
  const n = G.night + 1, T = BAL.night.total, boss = Math.ceil(n / T) * T, d = n - (boss - T); // d = 这一轮的第几天
  return d >= 3 ? (d - 2) / (T - 2) : 0;
}
function drawDeluge() {
  const p = bossProgress(); if (G.state !== 'day' || p <= 0) return;
  const c = ctx, y0 = 440 + Math.sin(G.time * .07) * 60, x0 = -250 + 230 * p + Math.sin(G.time * .11) * 14, R = 300 + 40 * p;
  const al = .05 + .17 * p;
  c.fillStyle = INK; c.globalAlpha = al; blobPath(c, x0, y0, R, 4.2, G.time * .08, .1); c.fill();
  for (let k = 0; k < 3; k++) { const a = (k - 1) * .6 + Math.sin(G.time * .2 + k) * .08, L = R * (1.05 + .5 * p + k * .05); brush(c, x0 + Math.cos(a) * R * .7, y0 + Math.sin(a) * R * .7, x0 + Math.cos(a) * L, y0 + Math.sin(a) * L, 16 + 14 * p, INK, al * .75); }
  if (p >= .5) { c.fillStyle = RED; c.globalAlpha = .1 + .3 * (p - .5) * 2; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x0 + R * .62, y0 - R * .16 + k * R * .16, 10 + 8 * p, 0, TAU); c.fill(); } }
  c.globalAlpha = 1;
}
function drawIncoming() {
  if (G.state !== 'day' || !G.incoming) return;
  const tot = G.incoming.reduce((a, b) => a + b, 0) || 1, c = ctx, p = .5 + .5 * Math.sin(G.time * 3);
  G.incoming.forEach((n, d) => {
    if (!n) return; const k = n / tot;
    c.fillStyle = INK; c.globalAlpha = (.12 + .5 * k) * (.7 + .3 * p);
    const L = 220 + 500 * k, T = 6 + 10 * k;
    if (d === 0) c.fillRect(VW / 2 - L / 2, 0, L, T); else if (d === 2) c.fillRect(VW / 2 - L / 2, VH - T, L, T);
    else if (d === 1) c.fillRect(VW - T, VH / 2 - L * .3, T, L * .6); else c.fillRect(0, VH / 2 - L * .3, T, L * .6);
    c.globalAlpha = 1;
  });
}
function drawCaller() {
  const s = G.caller; if (!s) return;
  const c = ctx, b = Math.abs(Math.sin(G.time * 4)) * 6;
  c.fillStyle = INK; c.beginPath(); c.arc(s.x, s.y - 10 - b, 7, 0, TAU); c.fill(); c.fillRect(s.x - 5, s.y - 4 - b, 10, 16);
  c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.moveTo(s.x, s.y - b); c.lineTo(s.x + 12, s.y - 18 - b - Math.sin(G.time * 10) * 4); c.stroke();
  c.strokeStyle = GREEN; c.globalAlpha = .5 * (1 - (G.time % 1.2) / 1.2); c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, 20 + (G.time % 1.2) * 40, 0, TAU); c.stroke(); c.globalAlpha = 1;
  text(s.name, s.x, s.y + 30, 17, GREEN, 'center', .9, PAPER, 'italic');
  // 指向箭头
  const h = G.hero, d = Math.hypot(s.x - h.x, s.y - h.y);
  if (d > 220) { const a = Math.atan2(s.y - h.y, s.x - h.x); c.fillStyle = GREEN; c.globalAlpha = .6; c.save(); c.translate(h.x + Math.cos(a) * 46, h.y + Math.sin(a) * 46); c.rotate(a); c.beginPath(); c.moveTo(10, 0); c.lineTo(-5, 6); c.lineTo(-5, -6); c.fill(); c.restore(); c.globalAlpha = 1; }
}
function drawVillagers() {
  G.survivors.forEach((s, i) => {
    const a = i / Math.max(1, G.survivors.length) * TAU + G.time * .15, x = LAMP.x + Math.cos(a) * 46, y = LAMP.y + Math.sin(a) * 30 + 6;
    ctx.fillStyle = INK; ctx.globalAlpha = .75; ctx.beginPath(); ctx.arc(x, y - 7, 4, 0, TAU); ctx.fill(); ctx.fillRect(x - 3, y - 3, 6, 10); ctx.globalAlpha = 1;
  });
}
function drawGhost() {
  if (!G.buildSel || !(G.state === 'day' || G.state === 'night')) return;
  const i = cellAt(mouse.x, mouse.y), x = ccx(i), y = ccy(i), ok = canPlace(G.buildSel, i), c = ctx;
  c.strokeStyle = INK; c.globalAlpha = .07; c.lineWidth = 1;
  for (let cc = -4; cc <= 5; cc++) { c.beginPath(); c.moveTo(x - CELL / 2 + cc * CELL, y - 4.5 * CELL); c.lineTo(x - CELL / 2 + cc * CELL, y + 4.5 * CELL); c.stroke(); }
  for (let rr = -4; rr <= 5; rr++) { c.beginPath(); c.moveTo(x - 4.5 * CELL, y - CELL / 2 + rr * CELL); c.lineTo(x + 4.5 * CELL, y - CELL / 2 + rr * CELL); c.stroke(); }
  c.globalAlpha = 1;
  const B = BAL.build[G.buildSel];
  if (B.range) { c.strokeStyle = TOWER_COL[G.buildSel]; c.globalAlpha = .35; c.setLineDash([6, 6]); c.beginPath(); c.arc(x, y, B.range, 0, TAU); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; }
  c.globalAlpha = .55; drawBuildIcon(G.buildSel, x, y, 1, 1); c.globalAlpha = 1;
  c.strokeStyle = ok ? GREEN : RED; c.lineWidth = 2; c.strokeRect(x - CELL / 2 + 1, y - CELL / 2 + 1, CELL - 2, CELL - 2);
}
function drawNight() {
  if (G.dark < .01) return;
  const n = nctx, s = .5;
  n.globalCompositeOperation = 'source-over'; n.clearRect(0, 0, nightCv.width, nightCv.height);
  const lf = clamp(LAMP.hp / LAMP.maxHp, 0, 1); // 灯越伤越暗：整夜更黑，灯光圈更小、更弱，快灭时一闪一闪
  const dk = G.state === 'night' ? Math.min(.93, G.dark + (1 - lf) * .22) : G.dark;
  n.fillStyle = `rgba(14,18,30,${dk})`; n.fillRect(0, 0, nightCv.width, nightCv.height);
  n.globalCompositeOperation = 'destination-out';
  const light = (x, y, r, a = 1) => { const g = n.createRadialGradient(x * s, y * s, 0, x * s, y * s, r * s); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); n.fillStyle = g; n.fillRect((x - r) * s, (y - r) * s, r * 2 * s, r * 2 * s); };
  let fl = 1 + Math.sin(G.time * 9) * .03;
  if (lf < .4) { const k = (.4 - lf) / .4; fl *= 1 - k * (.12 + .18 * Math.max(0, Math.sin(G.time * 13) * Math.sin(G.time * 5.3))); } // 快灭了：火苗抖得厉害
  light(LAMP.x, LAMP.y, (90 + 250 * lf) * fl, .45 + .55 * lf);
  if (!G.hero.down) light(G.hero.x, G.hero.y, 150, .85);
  for (const b of G.builds) if (b.type !== 'wall' && !isGround(b.type)) light(b.x, b.y, b.type === 'fire' ? 120 : 80, .6);
  for (const l of G.lights) light(l.x, l.y, l.r, Math.min(1, l.t * 3));
  ctx.drawImage(nightCv, 0, 0, VW, VH);
}

/* 画面质感：每个东西脚下一团淡墨影子，让它们"站"在纸上；四周一圈暗角把视线收向中间 */
function drawShadows() {
  const c = ctx; c.fillStyle = 'rgba(22,19,15,.13)';
  const sh = (x, y, r) => { c.beginPath(); c.ellipse(x + 3, y + r * .75, r, r * .38, 0, 0, TAU); c.fill(); };
  for (const b of G.builds) if (!isGround(b.type)) sh(b.x, b.y, 19);
  for (const m of G.mons) if (!m.fly) sh(m.x, m.y, m.r * 1.05);
  if (G.hero && !G.hero.down) sh(G.hero.x, G.hero.y, 13);
  sh(LAMP.x, LAMP.y + 6, 26);
}
let vigCv = null;
function drawVignette() {
  if (!vigCv) {
    vigCv = mk(VW / 4, VH / 4); const v = vigCv.getContext('2d');
    const g = v.createRadialGradient(VW / 8, VH / 8, VH * .1, VW / 8, VH / 8, VW * .16);
    g.addColorStop(0, 'rgba(40,28,14,0)'); g.addColorStop(1, 'rgba(40,28,14,.32)');
    v.fillStyle = g; v.fillRect(0, 0, VW / 4, VH / 4);
  }
  ctx.drawImage(vigCv, 0, 0, VW, VH);
}
function drawRocks() {
  const c = ctx;
  for (const b of G.rocks || []) {
    c.fillStyle = 'rgba(22,19,15,.15)'; c.beginPath(); c.ellipse(b.x + 4, b.y + 14, 22, 7, 0, 0, TAU); c.fill();
    blobPath(c, b.x, b.y, 22, b.seed, 0, .22); c.fillStyle = '#5d584f'; c.fill();
    c.strokeStyle = INK; c.lineWidth = 2.5; c.stroke();
    c.strokeStyle = 'rgba(236,228,208,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(b.x - 9, b.y - 6); c.lineTo(b.x + 2, b.y - 11); c.stroke();
  }
}
function drawAllies() {
  const c = ctx;
  for (const a of G.allies || []) {
    const bob = a.moving ? Math.abs(Math.sin(a.walk * 10)) * 3 : 0, lean = a.gather ? Math.sin(a.walk * 8) * .3 : 0;
    c.fillStyle = 'rgba(22,19,15,.13)'; c.beginPath(); c.ellipse(a.x + 2, a.y + 9, 9, 3.5, 0, 0, TAU); c.fill();
    c.save(); c.translate(a.x, a.y - bob); c.rotate(lean);
    c.fillStyle = INK; c.beginPath(); c.arc(0, -10, 6, 0, TAU); c.fill(); c.fillRect(-4, -5, 8, 13);
    c.strokeStyle = GREEN; c.lineWidth = 3; c.beginPath(); c.moveTo(-4, -6); c.lineTo(-12, -2 + Math.sin(G.time * 6) * 2); c.stroke();
    c.restore();
  }
}
function draw() {
  UI.btns = []; UI.modal = false;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#2a241c'; ctx.fillRect(0, 0, cv.width, cv.height);
  const sh = FX.shake > .3 ? FX.shake : 0;
  useWorld(sh ? rand(-sh, sh) * SC : 0, sh ? rand(-sh, sh) * SC : 0);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
  ctx.drawImage(bg, 0, 0);
  if (G.state !== 'title' && G.night > 0) { ctx.fillStyle = '#9a7432'; ctx.globalAlpha = Math.min(.2, G.night * .028); ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; } // 13. 越往后纸越旧
  ctx.drawImage(paper, 0, 0);
  const world = G.state !== 'title';
  if (world) {
    drawIncoming(); drawDeluge(); drawShadows();
    for (const n of G.nodes) drawNode(n);
    drawRiver(); drawRocks(); drawBamboo();
    for (const b of G.builds) if (isGround(b.type)) drawBuild(b);
    drawGhost();
    for (const b of G.builds) if (!isGround(b.type)) drawBuild(b);
    drawLamp(); drawVillagers(); drawCaller(); drawAllies(); drawInkWalls(); drawCrows();
    for (const m of G.mons) if (!m.fly) drawMon(m);
    drawHero();
    for (const m of G.mons) if (m.fly) drawMon(m);
    for (const p of G.projs) drawProj(p);
    drawFx();
    drawNight(); drawVignette();
    drawFog(); drawNightEvent(); drawFlies(); drawFlareMeter();
    for (const m of G.mons) drawEyes(m);
    if (G.dark > .2) { ctx.globalAlpha = G.dark; drawLamp(); ctx.globalAlpha = 1; }
  } else {
    // 标题背景：几团墨在纸边游走
    for (let k = 0; k < 6; k++) { const x = (k * 290 + G.time * 20 * (k % 2 ? 1 : -1)) % (VW + 200) - 100, y = 120 + k * 120; blobPath(ctx, (x + VW + 200) % (VW + 200) - 100, y, 14 + k * 2, k, G.time, .15); ctx.fillStyle = 'rgba(22,19,15,.08)'; ctx.fill(); }
  }
  ctx.restore();
  useWorld();
  drawTexts(G.dark > .3 ? 'rgba(20,24,34,.6)' : PAPER);
  if (G.state === 'day' || G.state === 'night' || G.state === 'prelude') drawHud();
  if (G.spot && G.spot.m && !G.spot.m.dead) drawSpot();
  if (G.state === 'night' && G.nightIntro != null) drawNightIntro();
  if (G.state === 'night' && G.bossIntro != null && G.boss) drawBossIntro();
  if (G.state === 'night' && G.trails) for (const tr of G.trails) { ctx.strokeStyle = INK; ctx.globalAlpha = Math.min(.35, tr.t * .3); ctx.lineWidth = 20; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tr.x0, tr.y0); ctx.lineTo(tr.x1, tr.y1); ctx.stroke(); ctx.globalAlpha = 1; }
  if (G.state === 'report') drawReport();
  if (G.state === 'relic') drawRelics();
  if (G.state === 'title') drawTitle();
  if (G.state === 'over') drawEnd(false);
  if (G.state === 'win') drawEnd(true);
  if ((G.state === 'night' || G.state === 'day') && LAMP.hp / LAMP.maxHp < .3) { // 灯危险：四边一圈红色呼吸
    const p = .5 + .5 * Math.sin(G.time * 5), w = 70;
    for (const [x, y, ww, hh] of [[0, 0, VW, w], [0, VH - w, VW, w], [0, 0, w, VH], [VW - w, 0, w, VH]]) { ctx.fillStyle = RED; ctx.globalAlpha = .06 + .08 * p; ctx.fillRect(x, y, ww, hh); }
    ctx.globalAlpha = 1;
  }
  if (TOUCH && H > W * 1.05) drawRotate(); // 6. 手机竖着拿：提示横过来
  if (FX.flash > 0) { ctx.fillStyle = FX.flashCol; ctx.globalAlpha = FX.flash * .22; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
}

// 报告页点击 → 遗物
function reportClick() { if (G.state === 'report' && G.modalT > .5) { G.state = 'relic'; rollRelics(); G.modalT = 0; } }

/* ---------- 主循环 ---------- */
let last = 0;
function drawCrash() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#141a26'; ctx.fillRect(0, 0, cv.width, cv.height);
  useWorld(); UI.btns = []; UI.modal = true;
  btn(0, 0, VW, VH, () => location.reload());
  text(TXT.ui.crashTitle || 'The ink spilled.', VW / 2, 380, 64, '#f4eddb', 'center', 1, null, 'italic');
  text(TXT.ui.crashSub || 'Something went wrong. Your progress is saved. Click to start again.', VW / 2, 460, 24, '#cfc6b2', 'center', 1, null, 'italic');
  text(G.crash.slice(0, 120), VW / 2, 520, 14, '#7d776b', 'center', .8);
}
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  if (window.innerWidth !== W || window.innerHeight !== H) resize();
  if (!W || !H) return;
  let dt = rdt;
  if (G.hitstop > 0) { G.hitstop -= rdt; dt = 0; }
  // 13. 出错兜底：任何一帧报错都不白屏，存好进度，提示点一下重开
  if (G.crash) { drawCrash(); return; }
  try {
    update(dt, rdt); draw();
    if (G.state === 'report') UI.btns.unshift({ x: 0, y: 0, w: VW, h: VH, cb: reportClick });
  } catch (e) {
    G.crash = String(e && e.message || e); try { saveMeta(); } catch (_) {}
    if (typeof console !== 'undefined') console.error(e);
    drawCrash();
  }
}
makeBg(); resize();
grid[LAMP_I] = 'lamp'; buildFlow();
G.hero = makeHero('sword');
window.__G = G;
G.introT = location.search.includes('test') ? 9 : 0; // 8. 第一次打开网页播一次片头；测试模式跳过
if (location.search.includes('dev')) devUnlock();
/* 5. 录视频用：?demo —— 开局资源充足、全部建筑可用，直接从第 3 天开始，火甲已经学会 */
if (location.search.includes('demo')) {
  const _nr = newRun;
  newRun = function () {
    _nr(); G.meta.unlocks.veteran = 1;
    for (const m of G.mons) m.dead = true; G.mons = [];
    G.res = { bamboo: 400, stone: 400, cinnabar: 400 }; G.night = 2; G.evo = { flame: { key: 'flame' }, detour: { key: 'detour', from: 0, to: 2 } };
    G.tut = { m_swift: 1 }; startDay();
  };
}
requestAnimationFrame(frame);
