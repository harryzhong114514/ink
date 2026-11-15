/* 测试面板：只有网址带 ?test 才加载。屏幕右侧一列按钮，按 T 收起/展开。
   给组员用：不用开控制台，就能跳夜、跳 Boss、加资源、无敌、加速、让机器人代打 */
(function () {
  const TP = { open: true, god: false, speed: 1, auto: false, msg: '', msgT: 0 };
  window.TP = TP;
  const say = s => { TP.msg = s; TP.msgT = 2.5; };
  const inRun = () => G.state === 'day' || G.state === 'night' || G.state === 'prelude';
  const toDay = () => { // 不管现在在哪个阶段，先回到白天
    if (G.state === 'prelude') { for (const m of G.mons) m.dead = true; G.mons = []; startDay(); }
    else if (G.state === 'night') { for (const m of G.mons) m.dead = true; G.mons = []; G.queue = []; dawn(); }
    if (G.state === 'report') { G.modalT = 2; reportClick(); }
    if (G.state === 'relic') { takeRelic(G.cards[0]); G.cards = null; startDay(); }
  };
  const bossTo = k => { G.bossKind = k; TXT.mon.boss = Object.assign({}, BOSS_BASE, BOSSES[k] || {}); };

  const BTN = [
    ['Start a run', () => { G.introT = 9; newRun(); say('New run'); }, () => G.state === 'title' || G.state === 'over' || G.state === 'win'],
    ['+200 materials', () => { G.res.bamboo += 200; G.res.stone += 200; G.res.cinnabar += 200; say('+200 of each'); }, inRun],
    ['Skip to next night', () => { toDay(); startNight(); say('Night ' + G.night); }, () => inRun() || G.state === 'report' || G.state === 'relic'],
    ['End night (dawn)', () => { for (const m of G.mons) m.dead = true; G.mons = []; G.queue = []; dawn(); say('Dawn'); }, () => G.state === 'night' && !G.bossNight],
    ['Kill all enemies', () => { for (const m of G.mons) if (!m.dead) dmgMon(m, 1e9, 'phys', 'hero', 0, 0); say('Cleared'); }, () => G.state === 'night' || G.state === 'prelude'],
    ['Boss: Deluge', () => { bossTo('tide'); toDay(); G.night = BAL.night.total - 1; startNight(); say('Boss night: The Deluge'); }, () => inRun() || G.state === 'report' || G.state === 'relic'],
    ['Boss: Thousand Hands', () => { bossTo('hands'); toDay(); G.night = BAL.night.total - 1; startNight(); say('Boss night: The Thousand Hands'); }, () => inRun() || G.state === 'report' || G.state === 'relic'],
    ['Boss: Empty Mountain', () => { bossTo('hollow'); toDay(); G.night = BAL.night.total - 1; startNight(); say('Boss night: The Empty Mountain'); }, () => inRun() || G.state === 'report' || G.state === 'relic'],
    [() => 'Invincible: ' + (TP.god ? 'ON' : 'off'), () => { TP.god = !TP.god; }, () => true],
    [() => 'Speed: x' + TP.speed, () => { TP.speed = TP.speed === 1 ? 2 : TP.speed === 2 ? 4 : 1; }, () => true],
    [() => 'Bot plays: ' + (TP.auto ? 'ON' : 'off'), () => { TP.auto = !TP.auto; }, () => true],
    ['Lamp to 15%', () => { LAMP.hp = LAMP.maxHp * .15; TP.god = false; say('Lamp at 15%'); }, inRun],
    ['Lose now', () => { LAMP.hp = 0; TP.god = false; gameOver(); }, () => G.state === 'night'],
    ['Unlock everything', () => { devUnlock(); say('All heroes and shop items unlocked'); }, () => true],
    ['Replay tutorial', () => { G.meta.noTut = false; G.meta.tourDone = 0; saveMeta(); G.introT = 9; newRun(); say('Tutorial from step 1'); }, () => true]
  ];

  // 无敌 / 加速 / 机器人：包一层 update
  const _upd = update;
  update = function (dt, rdt) {
    const n = (typeof paused !== 'undefined' && paused) ? 1 : TP.speed;
    for (let i = 0; i < n; i++) {
      if (TP.auto && inRun()) bot(); else if (TP.auto && (G.state === 'report' || G.state === 'relic')) bot();
      _upd(dt, rdt);
      if (TP.god && inRun()) { LAMP.hp = LAMP.maxHp; if (G.hero) { G.hero.hp = G.hero.maxHp; G.hero.down = false; } }
    }
    if (TP.auto && !inRun()) { keys.KeyW = keys.KeyA = keys.KeyS = keys.KeyD = false; mouse.down = false; }
  };
  // 机器人只在开着的时候接管键盘；关掉时把它按下的键松开
  let wasAuto = false;
  setInterval(() => { if (wasAuto && !TP.auto) { keys.KeyW = keys.KeyA = keys.KeyS = keys.KeyD = false; mouse.down = false; } wasAuto = TP.auto; }, 200);

  window.addEventListener('keydown', e => { if (e.code === 'KeyT' && !e.repeat) TP.open = !TP.open; });

  const _draw = draw;
  draw = function () {
    _draw();
    if (TP.msgT > 0) TP.msgT -= 1 / 60;
    const x = VW - 236, w = 220, h = 30, gap = 5;
    const tab = btn(x + w - 70, 150, 70, 26, () => { TP.open = !TP.open; });
    ctx.fillStyle = TP.open ? RED : 'rgba(22,19,15,.75)'; rrect(ctx, x + w - 70, 150, 70, 26, 8); ctx.fill();
    text(TP.open ? 'TEST  ×' : 'TEST', x + w - 35, 163, 13, '#f4eddb', 'center', 1, null, 'bold');
    if (!TP.open) return;
    const list = BTN.filter(b => b[2]());
    const top = 182;
    TP.drawn = list.map((b, i) => ({ s: typeof b[0] === 'function' ? b[0]() : b[0], x: x + w / 2, y: top + i * (h + gap) + h / 2 }));
    ctx.fillStyle = 'rgba(22,19,15,.82)'; rrect(ctx, x - 8, top - 8, w + 16, list.length * (h + gap) + 30, 10); ctx.fill();
    list.forEach(([label, fn], i) => {
      const y = top + i * (h + gap), s = typeof label === 'function' ? label() : label;
      const hov = btn(x, y, w, h, () => { try { fn(); } catch (e) { say('Error: ' + e.message); console.error(e); } });
      ctx.fillStyle = hov ? '#f4eddb' : 'rgba(244,237,219,.12)'; rrect(ctx, x, y, w, h, 7); ctx.fill();
      const on = /ON|x[24]/.test(s);
      text(s, x + 12, y + h / 2 + 1, 15, hov ? INK : on ? '#f0a070' : '#efe6d0', 'left', 1, null, on ? 'bold' : '');
    });
    text('T  hides this panel', x + w / 2, top + list.length * (h + gap) + 10, 12, '#b9b2a2', 'center', 1, null, 'italic');
    if (TP.msgT > 0) text(TP.msg, VW / 2, 240, 26, RED, 'center', Math.min(1, TP.msgT * 2), PAPER, 'italic');
  };
})();
