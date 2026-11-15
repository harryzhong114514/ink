'use strict';
/* 界面：HUD、建造栏、黎明报告、遗物三选一、标题、结算 */
function panel(x, y, w, h, a = .93) {
  ctx.fillStyle = '#f4eddb'; ctx.globalAlpha = a; rrect(ctx, x, y, w, h, 14); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.globalAlpha = .7; rrect(ctx, x, y, w, h, 14); ctx.stroke(); ctx.globalAlpha = 1;
}
function bar(x, y, w, h, f, col, back = 'rgba(22,19,15,.15)') {
  ctx.fillStyle = back; rrect(ctx, x, y, w, h, h / 2); ctx.fill();
  if (f > 0) { ctx.fillStyle = col; rrect(ctx, x, y, Math.max(h, w * clamp(f, 0, 1)), h, h / 2); ctx.fill(); }
}
function resIcon(type, x, y, s = 9) {
  ctx.fillStyle = RES_COL[type];
  if (type === 'bamboo') { ctx.fillRect(x - s * .25, y - s, s * .5, s * 2); ctx.fillRect(x - s * .6, y - s * .2, s * 1.2, s * .25); }
  else if (type === 'stone') { blobPath(ctx, x, y, s * .9, 3, 0, .2); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * .7, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * .7, y); ctx.closePath(); ctx.fill(); }
}

function drawHud() {
  const night = G.state === 'night';
  const ink = night ? '#efe6d0' : INK, out = night ? 'rgba(10,12,20,.55)' : PAPER;
  // 左上：阶段
  panel(18, 14, 330, 112, .82);
  const label = G.state === 'prelude' ? TXT.ui.firstInk : night ? TXT.ui.night + ' ' + G.night : TXT.ui.day + ' ' + (G.night + 1);
  text(label, 36, 44, 34, night ? RED : INK, 'left', 1, null, 'italic');
  // 倒计时：右边一个大数字，上面一行小字说倒数的是什么；最后 10 秒变红并跳动
  let f = 0, cap = '', secs = -1;
  if (night) {
    if (G.bossNight) { cap = TXT.mon.boss.name; f = G.boss ? G.boss.hp / G.boss.maxHp : 1; }
    else { const NL = nightLen(G.night), left = Math.max(0, NL - G.phaseT); cap = 'dawn in'; secs = Math.ceil(left); f = 1 - left / NL; }
  } else if (G.state === 'day') { cap = 'night in'; secs = Math.ceil(G.phaseT); f = G.phaseT / G.dayLen; }
  text(cap, 330, 26, 14, GREY, 'right', 1, null, 'italic');
  if (secs >= 0) {
    const urgent = secs <= 10, s = urgent ? 1 + .12 * Math.abs(Math.sin(G.time * 6)) : 1;
    text(secs + 's', 330, 50, Math.round(36 * s), urgent ? RED : INK, 'right', 1, null, 'bold'); // 面板底是纸色，夜里也用墨色才看得清
    // 白天最后 5 秒：屏幕中间一个淡淡的大数字
    if (G.state === 'day' && secs <= 5 && secs > 0) text(String(secs), VW / 2, 330, 160, RED, 'center', .18 + .1 * (G.phaseT % 1), null, 'italic');
  }
  bar(36, 70, 294, 9, f, night ? RED : GOLD);
  let x = 40;
  for (const k of ['bamboo', 'stone', 'cinnabar']) {
    resIcon(k, x, 101, 9); text(String(Math.floor(G.res[k])), x + 16, 102, 24, INK, 'left'); x += 100;
  }
  // 中上：长明灯
  const lf = LAMP.hp / LAMP.maxHp;
  text(TXT.ui.lamp, VW / 2, 24, 16, ink, 'center', .75, out);
  bar(VW / 2 - 200, 36, 400, 12, lf, lf < .3 ? RED : GOLD);
  text(Math.ceil(LAMP.hp) + ' / ' + LAMP.maxHp, VW / 2, 62, 15, ink, 'center', .6, out);
  if (G.boss && !G.boss.dead) {
    text(TXT.mon.boss.name, VW / 2, 86, 20, night ? '#f0694a' : RED, 'center', 1, out, 'italic');
    bar(VW / 2 - 260, 100, 520, 10, G.boss.hp / G.boss.maxHp, RED);
  }
  // 右上：今夜的进化
  const ev = Object.keys(G.evo);
  const quiet = G.state === 'prelude' || (G.state === 'day' && G.night === 0); // 还没看过黎明报告，先不显示进化栏
  if (!quiet) {
    text(TXT.ui.tonight, VW - 24, 30, 18, ink, 'right', .7, out, 'italic');
    if (!ev.length) text(TXT.ui.nothing, VW - 24, 56, 16, GREY, 'right', .8, out);
    ev.forEach((k, i) => {
      const ec = EVO_COL[k] === INK ? ink : night ? NIGHT_COL[EVO_COL[k]] || EVO_COL[k] : EVO_COL[k];
      text(TXT.evo[k].name, VW - 44, 58 + i * 28, 22, ec, 'right', 1, out, 'italic');
      ctx.fillStyle = ec; ctx.beginPath(); ctx.arc(VW - 28, 58 + i * 28, 6, 0, TAU); ctx.fill();
    });
  }
  text(TXT.ui.souls + ' ' + G.runSouls + '   ' + TXT.ui.kills + ' ' + G.kills, VW - 24, quiet ? 30 : 60 + Math.max(1, ev.length) * 28, 15, night ? '#b9b2a2' : GREY, 'right', .9);
  if (night && !G.bossNight) {
    const P = predictEvo(), py = (quiet ? 30 : 60 + Math.max(1, ev.length) * 28) + 26;
    if (P) {
      text((P.sure ? 'They are learning: ' : 'They are watching: ') + P.name, VW - 24, py, 17, P.sure ? '#f0694a' : '#e0bd62', 'right', .6 + .4 * Math.abs(Math.sin(G.time * (P.sure ? 4 : 2))), out, 'italic');
      text(P.why + (P.sure ? '   ·   change it before dawn' : ''), VW - 24, py + 20, 13, '#b9b2a2', 'right', .9, out, 'italic');
    }
  }
  if (G.combo >= 3) text(G.combo + '', VW - 30, 214, 54 + Math.min(30, G.combo), night ? '#f0694a' : RED, 'right', clamp(G.comboT, .3, 1), out, 'italic');

  drawBounty(night, ink, out);
  drawOmen(night, out);
  drawChecklist();

  if (G.state === 'day') { drawBuildBar(); drawBuildMenu(); } // 夜里整条建造栏不显示，免得误触
  // 提示：建造栏上方（栏顶 y=786，选中时的说明在 764，提示放 724）
  if (G.hint && G.hintA > .01) text(G.hint, VW / 2, 724, 26, ink, 'center', G.hintA, out, 'italic');
  // 白天的入夜按钮
  if (G.state === 'day') {
    const hov = btn(1300, 812, 280, 64, () => startNight());
    const pulse = G.hintRaw === TXT.hint.ready ? .5 + .5 * Math.sin(G.time * 5) : 0;
    panel(1300, 812, 280, 64, hov ? 1 : .88);
    if (pulse) { ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.globalAlpha = pulse; rrect(ctx, 1296, 808, 288, 72, 16); ctx.stroke(); ctx.globalAlpha = 1; }
    text(TXT.ui.startNight, 1440, 836, 21, hov ? RED : ink, 'center', 1, null, 'italic');
    if (!TOUCH) text('Enter', 1440, 862, 14, GREY, 'center', .8);
  }
  // 左下角操作说明：三行，最宽约 300px
  if (!TOUCH && (G.state === 'day' || G.state === 'night' || G.state === 'prelude')) {
    const c = night ? '#cfc6b2' : GREY;
    if (typeof drawControls === 'function') drawControls(night, c, out);
    else ['WASD  move     Left-click  attack', 'Space  skill     1–7  build', 'Right-click  remove     P  pause'].forEach((s, i) => text(s, 24, 826 + i * 24, 16, c, 'left', .9, out));
  }
  if (!TOUCH) worldTip();
  hintArrow();
  if (TOUCH) { drawTouchPad(); drawPauseBtn(); }
}
/* 手机操作：左下摇杆（按下的地方就是圆心），右边技能键 */
function drawTouchPad() {
  const night = G.state === 'night', col = night ? '#efe6d0' : INK;
  const cx = joy.id !== null ? joy.ox : 170, cy = joy.id !== null ? joy.oy : 740;
  ctx.globalAlpha = .18; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, 70, 0, TAU); ctx.fill();
  ctx.globalAlpha = .45; ctx.beginPath(); ctx.arc(cx + joy.dx * 70, cy + joy.dy * 70, 30, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  if (joy.id === null) text('move', cx, cy, 16, col, 'center', .6, null, 'italic');
  if (G.state === 'prelude') return;
  const sx = 1500, sy = G.state === 'day' ? 720 : 800, r = 58, hov = btn(sx - r, sy - r, r * 2, r * 2, () => { pressed.Space = true; });
  const cd = G.hero.skillCd > 0 ? G.hero.skillCd / BAL.hero[G.hero.type].skillCd : 0;
  ctx.globalAlpha = .85; panel(sx - r, sy - r, r * 2, r * 2, .9); ctx.globalAlpha = 1;
  if (cd > 0) { ctx.fillStyle = 'rgba(22,19,15,.25)'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, r - 4, -Math.PI / 2, -Math.PI / 2 + TAU * cd); ctx.fill(); }
  if (cd > 0) text(Math.max(0, G.hero.skillCd).toFixed(G.hero.skillCd < 1 ? 1 : 0) + 's', sx, sy, 28, INK, 'center', 1, null, 'bold'); // 冷却中：显示剩几秒
  else text(HERO_SKILL[G.hero.type] || 'Skill', sx, sy, 22, RED, 'center', 1, null, 'italic');
}
/* 4. 第一个白天的三步清单：挂在左上阶段牌下面（y=140 起，第 1 天没有悬赏，不会和悬赏那行重叠） */
function drawChecklist() {
  if (G.state !== 'day' || G.night !== 0 || G.meta.noTut) return;
  const items = [
    [TXT.ui.todoGather || 'Gather materials', G.gathered],
    [TOUCH ? 'Build a Fire Brazier' : TXT.ui.todoFire || 'Build a Fire Brazier  (3)', G.builds.some(b => b.type === 'fire')],
    [TOUCH ? 'Tap Start Night' : TXT.ui.todoNight || 'Start the night  (Enter)', false]
  ];
  const x = 18, y = 140, w = 330, h = 40 + items.length * 30;
  panel(x, y, w, h, .82);
  text(TXT.ui.todoTitle || 'First day', x + 18, y + 22, 16, GREY, 'left', 1, null, 'italic');
  const cur = items.findIndex(it => !it[1]);
  items.forEach(([s, done], i) => {
    const yy = y + 50 + i * 30, now = i === cur;
    ctx.strokeStyle = done ? GREEN : now ? RED : GREY; ctx.lineWidth = 2; rrect(ctx, x + 18, yy - 9, 18, 18, 5); ctx.stroke();
    if (done) { ctx.beginPath(); ctx.moveTo(x + 22, yy); ctx.lineTo(x + 26, yy + 5); ctx.lineTo(x + 33, yy - 6); ctx.stroke(); }
    text(s, x + 48, yy + 1, 18, done ? GREY : now ? INK : GREY, 'left', done ? .6 : 1, null, now ? 'italic' : '');
    if (done) { ctx.strokeStyle = GREY; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 48, yy + 1); ctx.lineTo(x + 48 + s.length * 7.4, yy + 1); ctx.stroke(); }
  });
}
/* 3. 学过的怪亮相：外圈墨环收紧，旁边一句话写它学会了什么 */
function drawSpot() {
  const S = G.spot, m = S.m, a = clamp(S.t * 3, 0, 1) * clamp((3.4 - S.t) * 2, 0, 1), E = TXT.evo[S.k];
  ctx.fillStyle = NIGHT; ctx.globalAlpha = .35 * a; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1;
  const r = m.r + 18 + 40 * Math.max(0, 1 - S.t * 1.5);
  ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  const tx = clamp(m.x, 260, VW - 260), ty = clamp(m.y < VH / 2 ? m.y + r + 50 : m.y - r - 70, 170, VH - 230);
  text(TXT.ui.spotTitle || 'They learned.', tx, ty, 38, '#f4eddb', 'center', a, 'rgba(10,12,20,.6)', 'italic');
  text(E.name + ' — ' + fmt(E.weak, { to: '', from: '' }), tx, ty + 40, 20, '#f0c48a', 'center', a, 'rgba(10,12,20,.6)', 'italic');
}
/* 6. 手机竖屏：盖一层提示，画一部横过来的手机 */
function drawRotate() {
  // 用屏幕坐标铺满整个手机屏，不只是中间那块游戏区
  ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#141a26'; ctx.fillRect(0, 0, W, H);
  const k = (Math.sin(G.time * 2) + 1) / 2, s = Math.min(W, H) / 375;
  ctx.translate(W / 2, H / 2 - 40 * s); ctx.rotate(-Math.PI / 2 * k);
  ctx.strokeStyle = '#f4eddb'; ctx.lineWidth = 4 * s; rrect(ctx, -30 * s, -55 * s, 60 * s, 110 * s, 12 * s); ctx.stroke();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#f4eddb'; ctx.font = `italic ${Math.round(26 * s)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(TXT.ui.rotate || 'Turn your phone sideways', W / 2, H / 2 + 70 * s);
  ctx.restore(); useWorld();
}
/* 6. 入夜：四个方向按来袭多少依次亮起一道红色笔触，每亮一个一声鼓 */
function drawNightIntro() {
  const t = G.nightIntro, inc = G.incomingNight || [1, 1, 1, 1], tot = inc.reduce((a, b) => a + b, 0) || 1;
  [0, 1, 2, 3].forEach((d, i) => {
    if (!inc[d]) return;
    const k = clamp((t - i * .35) * 3, 0, 1) * clamp((3 - t) * 1.5, 0, 1); if (k <= 0) return;
    if (!G['introDrum' + d] && t > i * .35) { G['introDrum' + d] = 1; sfx('boom', .5 + .4 * inc[d] / tot, 1.3 - i * .1); }
    const L = 160 + 400 * inc[d] / tot;
    ctx.fillStyle = RED; ctx.globalAlpha = .55 * k;
    if (d === 0) ctx.fillRect(VW / 2 - L / 2, 0, L, 12); else if (d === 2) ctx.fillRect(VW / 2 - L / 2, VH - 12, L, 12);
    else if (d === 1) ctx.fillRect(VW - 12, VH / 2 - L * .3, 12, L * .6); else ctx.fillRect(0, VH / 2 - L * .3, 12, L * .6);
    ctx.globalAlpha = 1;
    const p = [[VW / 2, 135], [VW - 70, VH / 2], [VW / 2, VH - 140], [70, VH / 2]][d];
    text(TXT.dir[d] + '  ' + inc[d], p[0], p[1], 24, '#f0694a', 'center', k, 'rgba(10,12,20,.6)', 'italic');
  });
  if (t > 2.9) for (let d = 0; d < 4; d++) G['introDrum' + d] = 0;
}
/* 14. Boss 登场：画面放慢、压暗，一笔浓墨横过屏幕，上面写它的名字 */
function drawBossIntro() {
  const t = G.bossIntro, k = clamp(t * 2.5, 0, 1) * clamp((3.2 - t) * 2, 0, 1), sw = clamp(t * 1.6, 0, 1);
  ctx.fillStyle = NIGHT; ctx.globalAlpha = .55 * k; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1;
  brush(ctx, VW / 2 - 520, 430, VW / 2 - 520 + 1040 * sw, 418, 70, INK, .9 * k);
  text(TXT.mon.boss.name, VW / 2, 420, 96, '#f4eddb', 'center', k, null, 'italic');
  text(TXT.mon.boss.desc, VW / 2, 500, 24, '#f0c48a', 'center', k * clamp(t - .6, 0, 1), null, 'italic');
}
/* 11. 天象：左上阶段牌下方一行（悬赏在 y=143，重掷提示在 164，所以放 188） */
function drawOmen(night, out) {
  if (!G.omen || (G.state !== 'day' && G.state !== 'night')) return;
  const O = G.omen, y = G.night === 0 && G.state === 'day' ? 0 : 188; if (!y) return;
  text(O.name, 36, y, 17, O.good ? (night ? NIGHT_COL[GREEN] || '#8fbf7a' : GREEN) : (night ? '#f0694a' : RED), 'left', 1, out, 'italic');
  text(O.desc, 36 + O.name.length * 9 + 14, y, 14, night ? '#cfc6b2' : GREY, 'left', .95, out, 'italic');
}
/* 新手引导的指向箭头：提示"去采集"时指最近的资源点 */
function hintArrow() {
  if (G.hintA < .3 || !G.hint) return;
  let t = null;
  if (G.hintRaw === TXT.hint.gather && G.nodes.length) t = G.nodes.reduce((a, n) => Math.hypot(n.x - G.hero.x, n.y - G.hero.y) < Math.hypot(a.x - G.hero.x, a.y - G.hero.y) ? n : a);
  else if (G.hintRaw === TXT.hint.rescue && G.caller) t = G.caller;
  if (!t) return;
  const bob = Math.sin(G.time * 6) * 6;
  ctx.fillStyle = RED; ctx.globalAlpha = G.hintA;
  ctx.beginPath(); ctx.moveTo(t.x, t.y - 34 + bob); ctx.lineTo(t.x - 11, t.y - 54 + bob); ctx.lineTo(t.x + 11, t.y - 54 + bob); ctx.fill();
  ctx.globalAlpha = 1;
}

/* 悬赏：一行小字，挂在左上阶段牌下面。
   位置依据：阶段牌是 panel(18,14,330,112)，底边 y=126；长明灯那一栏最低到 y=110（Boss 血条），
   右上进化栏从 y=30 往下排。所以 y=143 这一条横向 x=36..430 是空的：
   上不碰阶段牌和灯，下离建造栏（y=806）和提示（y=734）很远，右边也够不到居中的灯。 */
function drawBounty(night, ink, out) {
  if (!G.bounty || G.state === 'prelude') return;
  const B = bountyLive(); if (!B) return;
  const x = 36, y = 143, rx = 430, dim = night ? '#b9b2a2' : GREY;
  const col = B.done ? (night ? NIGHT_COL[GREEN] : GREEN) : !night ? dim : (night ? NIGHT_COL[GOLD] : GOLD);
  text(TXT.ui.bounty, x, y, 14, dim, 'left', .85, out, 'italic');
  text(B.name, x + 62, y, 17, ink, 'left', 1, out);
  text(B.right, rx, y, 16, col, 'right', 1, out);
  if (G.rerollLeft > 0 && G.state === 'day') text(TXT.ui.bountyReroll, rx, y + 21, 13, dim, 'right', .8, out, 'italic');
}

/* 建造栏：六格，每格 128×100，总宽 830，居中后 x=385..1215；
   左下角操作说明最宽到 x≈330，右下"入夜"按钮从 x=1300 起，都碰不到。 */
const BAR = { w: 118, h: 100, gap: 10, y: 786 }; // seven slots: 886 wide, x 357..1243
function drawBuildBar() {
  const n = BUILD_KEYS.length, { w, h, gap, y } = BAR, x0 = VW / 2 - (n * w + (n - 1) * gap) / 2;
  let hovK = null, hovX = 0;
  BUILD_KEYS.forEach((k, i) => {
    const x = x0 + i * (w + gap), av = available(k), ok = av && afford(k), sel = G.buildSel === k;
    const hov = btn(x, y, w, h, () => { if (av) { G.buildSel = sel ? null : k; tone(700, 900, .06, .05); } });
    if (hov) { hovK = k; hovX = x + w / 2; }
    const yy = y - (sel ? 8 : hov ? 4 : 0);
    ctx.fillStyle = 'rgba(22,19,15,.18)'; rrect(ctx, x + 3, y + 5, w, h, 14); ctx.fill(); // 落在纸上的影子
    ctx.fillStyle = '#f4eddb'; ctx.globalAlpha = sel ? 1 : hov ? .97 : .88; rrect(ctx, x, yy, w, h, 14); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = sel ? RED : INK; ctx.lineWidth = sel ? 3 : 1.2; ctx.globalAlpha = sel ? 1 : hov ? .8 : .45; rrect(ctx, x, yy, w, h, 14); ctx.stroke(); ctx.globalAlpha = 1;
    text(String(i + 1), x + 13, yy + 16, 17, sel ? RED : GREY, 'left', 1, null, 'bold');
    if (av && k === 'fire' && G.state === 'day' && G.night === 0 && !sel && !G.builds.some(b => b.type === 'fire')) { ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.globalAlpha = .4 + .5 * Math.abs(Math.sin(G.time * 4)); rrect(ctx, x - 4, y - 4, w + 8, h + 8, 16); ctx.stroke(); ctx.globalAlpha = 1; }
    if (!av) { text(TXT.ui.locked, x + w / 2, yy + 50, 18, GREY, 'center', .8, null, 'italic'); return; }
    drawBuildIcon(k, x + w / 2, yy + 34, .9, ok ? 1 : .35);
    text(TXT.build[k].short, x + w / 2, yy + 66, 19, ok ? INK : GREY, 'center', 1, null, 'italic');
    const c = costOf(k), nk = Object.keys(c).length; let cx = x + w / 2 - (nk - 1) * 25;
    for (const r in c) { resIcon(r, cx - 10, yy + 86, 6); text(String(c[r]), cx + 7, yy + 87, 15, (G.res[r] || 0) >= c[r] ? INK : RED, 'center'); cx += 50; }
    if (G.newBuild && G.newBuild.includes(k)) { ctx.fillStyle = RED; rrect(ctx, x + w - 44, yy - 10, 50, 22, 4); ctx.fill(); text(TXT.ui.newTag, x + w - 19, yy + 1, 14, PAPER, 'center', 1, null, 'bold'); }
  });
  if (hovK && available(hovK)) buildTip(hovK, hovX, y - 14);
  else if (G.buildSel) {
    const k = G.buildSel, night = G.state === 'night';
    text(TXT.build[k].name + ' — ' + (TXT.ui.placeTip || 'click the ground to build, right-click to cancel'), VW / 2, y - 22, 19, night ? '#efe6d0' : INK, 'center', .95, night ? 'rgba(10,12,20,.55)' : PAPER, 'italic');
  }
}
/* 点中建筑后的小菜单：升级 / 修理 / 拆除，挂在建筑上方。按钮各 112×40 */
function drawBuildMenu() {
  const b = G.selB; if (!b || b.dead) return;
  const items = [];
  const maxLv = b.type === 'spike' ? 2 : LV_MAX;
  if (b.lv < maxLv) items.push(['Upgrade', upgradeCost(b), () => upgradeBuild(b)]);
  else items.push(['Max level', null, () => {}]);
  const rc = repairCost(b);
  if (Object.keys(rc).length) items.push(['Repair', rc, () => repairBuild(b)]);
  items.push(['Remove', null, () => { removeBuild(b, true); G.selB = null; }, refundOf(b)]);
  const w = 112, h = 52, gap = 8, tw = items.length * w + (items.length - 1) * gap;
  const x0 = clamp(b.x - tw / 2, 12, VW - 12 - tw), y = clamp(b.y - 104, 160, VH - 200);
  ctx.strokeStyle = INK; ctx.globalAlpha = .35; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x, b.y - 22); ctx.lineTo(b.x, y + h); ctx.stroke(); ctx.globalAlpha = 1;
  text(TXT.build[b.type].name + '  ·  Lv ' + b.lv, x0 + tw / 2, y - 16, 18, INK, 'center', 1, PAPER, 'italic');
  items.forEach(([label, cost, cb, back], i) => {
    const x = x0 + i * (w + gap), ok = !cost || canPay(cost), hov = btn(x, y, w, h, cb);
    panel(x, y, w, h, hov ? 1 : .92);
    if (hov) { ctx.strokeStyle = RED; ctx.lineWidth = 2; rrect(ctx, x, y, w, h, 14); ctx.stroke(); }
    text(label, x + w / 2, y + 17, 17, ok ? (hov ? RED : INK) : GREY, 'center', 1, null, 'italic');
    const show = cost || back;
    if (show) { let cx = x + w / 2 - (Object.keys(show).length - 1) * 22; for (const r in show) { resIcon(r, cx - 8, y + 38, 5); text((back ? '+' : '') + show[r], cx + 6, y + 39, 13, back ? GREEN : (G.res[r] || 0) >= show[r] ? INK : RED, 'center'); cx += 44; } }
  });
}
/* 一张说明卡：标题 + 若干行，底边对齐 (x, by)，横向夹在屏幕里 */
function tipCard(title, lines, x, by, col = INK) {
  ctx.font = `17px ${FONT}`;
  const w = Math.max(220, ctx.measureText(title).width * 1.3, ...lines.map(l => ctx.measureText(l).width)) + 40;
  const h = 46 + lines.length * 25, px = clamp(x - w / 2, 12, VW - 12 - w), py = Math.max(12, by - h);
  panel(px, py, w, h, .97);
  text(title, px + 20, py + 25, 21, col, 'left', 1, null, 'italic');
  lines.forEach((l, i) => text(l, px + 20, py + 52 + i * 25, 16, i === lines.length - 1 && l.startsWith('·') ? GREY : INK, 'left', .92));
}
function buildStats(k) {
  const B = BAL.build[k], s = [];
  if (B.dmg) s.push('Damage ' + B.dmg);
  if (B.range) s.push('Range ' + B.range);
  if (B.cd) s.push((1 / B.cd).toFixed(1) + ' hits/s');
  s.push('Health ' + Math.round(B.hp * (k === 'wall' ? G.mods.wallHp : 1)));
  return s.join('   ·   ');
}
function buildTip(k, x, by) {
  tipCard(TXT.build[k].name, [TXT.build[k].desc, buildStats(k), '· key ' + (BUILD_KEYS.indexOf(k) + 1) + ' or click, then click the ground'], x, by, TOWER_COL[k] === INK ? INK : TOWER_COL[k]);
}
/* 鼠标停在地图上的东西上：告诉玩家这是什么、能做什么 */
function worldTip() {
  if (G.buildSel || G.selB || UI.modal || mouse.y > BAR.y - 10) return; // 菜单开着时不弹说明卡，免得盖住菜单
  const mx = mouse.x, my = mouse.y, R = { bamboo: 'Bamboo', stone: 'Stone', cinnabar: 'Cinnabar' };
  const b = grid[cellAt(mx, my)];
  if (b === 'lamp' || Math.hypot(mx - LAMP.x, my - LAMP.y) < 30) return tipCard(TXT.ui.lamp, ['If it goes out, the run is over.', 'Health ' + Math.ceil(LAMP.hp) + ' / ' + LAMP.maxHp + '   ·   heals a little each dawn'], mx, my - 24, RED);
  if (b && b.water) return tipCard('River', ['Deep and cold. Cross at the bridges.'], mx, my - 24, QING);
  if (b && b.type === 'rock') return tipCard(TXT.ui.rockName || 'Rock', [TXT.ui.rockDesc || 'Nothing passes through. Not even their ink.'], mx, my - 24, GREY);
  if (b && b.type) return tipCard(TXT.build[b.type].name, [TXT.build[b.type].desc, 'Health ' + Math.ceil(b.hp) + ' / ' + Math.round(b.maxHp) + (b.leech && !b.leech.dead ? '   ·   silenced by a Leech' : ''), '· right-click to take it down, half the cost back'], mx, my - 24);
  for (const n of G.nodes) if (Math.hypot(n.x - mx, n.y - my) < 30) return tipCard(R[n.type], ['Walk into it to gather.   ' + Math.ceil(n.amt) + ' left', '· used to build: see the costs on the bar below'], mx, my - 30, RES_COL[n.type]);
  for (const m of G.mons) if (!m.dead && Math.hypot(m.x - mx, m.y - my) < m.r + 8 && TXT.mon[m.type]) {
    const L = [TXT.mon[m.type].desc];
    if (m.armor) L.push(TXT.evo[m.armor].name + ': ' + fmt(TXT.evo[m.armor].weak, { to: '', from: '' }));
    if (m.raid) L.push('The red bar: it goes for your towers.');
    return tipCard(TXT.mon[m.type].name, L, mx, my - m.r - 16, RED);
  }
  const s = G.caller; if (s && Math.hypot(s.x - mx, s.y - my) < 30) tipCard(s.name, ['Walk to them before night.', 'Each survivor brings materials every dawn.'], mx, my - 30, GREEN);
}

/* ---------- 黎明报告 ---------- */
function drawReport() {
  // 只讲三件事：它们学会了什么、凭什么（一句证据）、怎么破。
  // 伤害占比图、"谁杀的"比例条、方向罗盘和击杀数已按试玩反馈去掉，页面高度随进化条数变化
  const R = G.report; UI.modal = true;
  ctx.fillStyle = NIGHT; ctx.globalAlpha = .35; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1;
  const a = clamp(G.modalT * 3, 0, 1), n = R.adapt.length, cx = VW / 2;
  const cardH = 156, gap = 16, bodyH = n ? n * cardH + (n - 1) * gap : 90, fadedH = R.faded.length * 24;
  const pw = 940, ph = 150 + bodyH + fadedH + 130 + (G.bountyLine ? 26 : 0), px = cx - pw / 2, py = Math.round((VH - ph) / 2);
  ctx.globalAlpha = a;
  panel(px, py, pw, ph, .97);
  text(TXT.ui.dawn + '  ·  ' + TXT.ui.day + ' ' + (R.night + 1), cx, py + 38, 18, GREY, 'center', a, null, 'italic');
  text(TXT.report.title, cx, py + 84, 46, INK, 'center', a, null, 'italic');
  let y = py + 150;
  const shown = clamp(G.modalT * 2.2 - .3, 0, 1), x0 = px + 70, w = pw - 140;
  if (!n) wrapText(TXT.report.none, cx, y + 30, 21, w - 120, GREY, 'center', a);
  R.adapt.forEach((e, i) => {
    const k = clamp(shown * 2 - i, 0, 1), col = EVO_COL[e.k] === INK ? INK : EVO_COL[e.k];
    if (k > 0) {
      ctx.fillStyle = EVO_COL[e.k]; ctx.globalAlpha = a * k * .12; rrect(ctx, x0, y, w, cardH, 12); ctx.fill(); ctx.globalAlpha = 1;
      drawMonSample(e.k, x0 + 62, y + cardH / 2, a * k);
      text(e.name, x0 + 124, y + 34, 34, col, 'left', a * k, null, 'italic');
      text(e.why, x0 + 124, y + 72, 20, INK, 'left', a * k);
      if (e.ev) text(e.ev, x0 + 124, y + 100, 17, INK, 'left', a * k * .7, null, 'italic');
      text(e.weak, x0 + 124, y + 128, 17, GREY, 'left', a * k);
    }
    y += cardH + gap;
  });
  y = py + 150 + bodyH + 14;
  R.faded.forEach(s => { text(s, cx, y + 10, 16, GREY, 'center', a, null, 'italic'); y += 24; });
  const late = a * clamp((G.modalT - .6) * 2, 0, 1);
  text(R.teaser, cx, y + 30, 22, RED, 'center', late, null, 'italic');
  // 悬赏那一行放在"预告"和"功绩"之间，都靠中，行高 24；ph 里给这两行预留的就是这 130 的底部区
  if (G.bountyLine) { text(G.bountyLine, cx, y + 58, 17, G.bountyKept ? GREEN : GREY, 'center', late, null, 'italic'); y += 24; }
  if (G.deedQ.length) text(G.deedQ.map(d => fmt(TXT.ui.deedDone || 'Deed: {name}   +{n} souls', { name: d.name, n: d.reward })).join('     '), cx, y + 60, 18, GREEN, 'center', late, null, 'italic');
  if (G.modalT > .5) text(TXT.ui.continue, cx, py + ph - 26, 18, GREY, 'center', a * (.6 + .4 * Math.sin(G.time * 3)));
  ctx.globalAlpha = 1;
}
function drawMonSample(k, x, y, a) {
  const m = { type: 'blob', x, y, r: 22, seed: 3, flash: 0, armor: ARMOR_RES[k] ? k : null, beh: k === 'sapper' || k === 'assassin' ? k : null, fly: k === 'fly', split: k === 'split', slowT: 0, burnT: 0, hp: 1, maxHp: 1, vx: 1, vy: 0, age: G.time };
  ctx.globalAlpha = a; drawMon(m); drawEyes(m); ctx.globalAlpha = 1;
}

/* ---------- 遗物 ---------- */
function drawRelics() {
  UI.modal = true;
  ctx.fillStyle = NIGHT; ctx.globalAlpha = .3; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1;
  text(G.skillRound ? (TXT.ui.chooseSkill || 'Sharpen your skill') : TXT.ui.choose, VW / 2, 200, 50, INK, 'center', 1, PAPER, 'italic');
  const n = G.cards.length, w = 270, h = 330, gap = 30, x0 = VW / 2 - (n * w + (n - 1) * gap) / 2, y = 270;
  G.cards.forEach((k, i) => {
    const x = x0 + i * (w + gap), R = TXT.relic[k];
    const hov = btn(x, y, w, h, () => { takeRelic(k); G.cards = null; startDay(); });
    const yy = y - (hov ? 10 : 0);
    panel(x, yy, w, h, 1);
    if (hov) { ctx.strokeStyle = RED; ctx.lineWidth = 3; rrect(ctx, x, yy, w, h, 14); ctx.stroke(); }
    blobPath(ctx, x + w / 2, yy + 92, 44, i * 2 + k.length, G.time * .3, .08); ctx.fillStyle = hov ? RED : INK; ctx.fill();
    seal(ctx, x + w / 2, yy + 92, 40, RELIC_GLYPH[k] || R.name.replace(/^The /, '')[0]);
    text(R.name, x + w / 2, yy + 178, 30, hov ? RED : INK, 'center', 1, null, 'italic');
    wrapText(R.desc, x + w / 2, yy + 224, 19, w - 40, INK, 'center', .85);
  });
}
const RELIC_GLYPH = {}; // 印章上只放遗物英文名的首字母，不再出现汉字

/* ---------- 标题 ---------- */
function drawTitle() {
  UI.modal = true;
  const M = G.meta, cx = VW / 2;
  const first = !M.runs;
  btn(0, 0, VW, first ? 640 : 500, () => newRun());
  if (first) { ctx.save(); ctx.translate(0, 140); }
  brush(ctx, cx - 420, 300, cx + 440, 282, 26, INK, .85);
  text(TXT.title, cx, 210, 150, INK, 'center', 1, null, 'italic');
  seal(ctx, cx + 400, 170, 74, 'T');
  text(TXT.tagline, cx, 350, 30, INK, 'center', .85, null, 'italic');
  text(TXT.pitch || 'Every night the tide studies you. Every dawn it shows what it learned.', cx, 388, 19, GREY, 'center', .9, null, 'italic');
  text(TXT.menu.begin, cx, 430, 34, RED, 'center', .55 + .45 * Math.sin(G.time * 3), null, 'italic');
  if (first) { ctx.restore(); drawModes(700); drawIntro(); return; }
  const info = [];
  if (M.best) info.push(fmt(TXT.ui.best, { n: M.best }));
  if (M.wins) info.push(TXT.menu.wins + ' ' + M.wins);
  info.push(TXT.ui.souls + ' ' + M.souls);
  if (M.dev) info.push('DEV');
  text(info.join('     '), cx, 488, 20, INK, 'center', .7);
  drawModes(530);
  // 英雄和深度
  let hx = 120;
  if (M.unlocks.archer || M.runs > 0) {
    text(TXT.menu.hero, hx, 572, 17, GREY, 'left', 1, null, 'italic');
    heroList().forEach((k, i) => {
      const lock = heroLocked(k), x = hx + 56 + i * 110, on = heroPick() === k, hov = btn(x, 555, 104, 34, () => { if (lock) { addText(heroLockMsg(k), x + 52, 535, 18, RED, 1.4); thud(.15, 300); return; } M.hero = k; saveMeta(); });
      panel(x, 555, 104, 34, on || hov ? 1 : .6); if (on) { ctx.strokeStyle = RED; ctx.lineWidth = 2.5; rrect(ctx, x, 555, 104, 34, 12); ctx.stroke(); }
      text(lock ? heroLockTag(k) : TXT.heroes[k], x + 52, 572, 15, lock ? GREY : on ? RED : INK, 'center', lock ? .7 : 1, null, lock ? 'italic' : undefined);
    });
  }
  if (M.depthMax > 1) {
    const x = VW - 420;
    text(TXT.menu.depth, x, 540, 18, GREY, 'left', 1, null, 'italic');
    for (let d = 1; d <= M.depthMax; d++) {
      const bx = x + 70 + (d - 1) * 50, on = M.depth === d, hov = btn(bx, 520, 42, 40, () => { M.depth = d; saveMeta(); });
      panel(bx, 520, 42, 40, on || hov ? 1 : .6); text(String(d), bx + 21, 540, 20, on ? RED : INK);
    }
  }
  // 商店：九项一行，屏宽两侧各留 44 的白。长期项目（贵的）用一道淡金边和前面的基础项分开，
  // 不用颜色块、不加图标。字级比原来小一档，因为卡片变窄了
  text(TXT.menu.shop, cx, 596, 22, INK, 'center', .8, null, 'italic');
  const n = SHOP.length, gap = 8, w = Math.floor((VW - 88 - (n - 1) * gap) / n), x0 = cx - (n * w + (n - 1) * gap) / 2, y = 614, h = 118;
  SHOP.forEach((s, i) => {
    const x = x0 + i * (w + gap), own = M.unlocks[s.k], can = M.souls >= s.cost, long = s.cost >= 400;
    const hov = btn(x, y, w, h, () => buy(s));
    panel(x, y, w, h, own ? .5 : hov ? 1 : .8);
    if (long && !own && !hov) { ctx.strokeStyle = GOLD; ctx.globalAlpha = .5; ctx.lineWidth = 1.5; rrect(ctx, x, y, w, h, 14); ctx.stroke(); ctx.globalAlpha = 1; }
    if (hov && !own) { ctx.strokeStyle = can ? RED : GREY; ctx.lineWidth = 2; rrect(ctx, x, y, w, h, 14); ctx.stroke(); }
    text(TXT.shop[s.k].name, x + w / 2, y + 19, 16, own ? GREY : INK, 'center', 1, null, 'italic');
    wrapText(TXT.shop[s.k].desc, x + w / 2, y + 40, 12.5, w - 18, INK, 'center', own ? .4 : .8);
    text(own ? TXT.menu.owned : s.cost + ' ' + TXT.ui.souls.toLowerCase(), x + w / 2, y + 102, 14, own ? GREEN : can ? RED : GREY, 'center');
  });
  // 图鉴：条目变多以后一行放不下 60px 间距；总宽最多 940，居中后右端 1270，
  // 离右下角功绩按钮（x=1310 起）还有 40px，图标半径 24 也不会压上去
  const all = archiveList(), seenN = all.filter(([t, k]) => seenOf(t, k)).length;
  text(TXT.menu.archive + '  ' + seenN + ' / ' + all.length, cx, 780, 20, INK, 'center', .7, null, 'italic');
  const step = Math.min(60, 940 / Math.max(1, all.length - 1)), ax = cx - (all.length - 1) * step / 2;
  let tip = null;
  all.forEach(([t, k], i) => {
    const seen = seenOf(t, k), x = ax + i * step, y = 830;
    if (!seen) { drawUnseen(x, y, i, 16, false); return; }
    if (t === 'm') { const m = { type: k, x, y, r: k === 'boss' ? 20 : k === 'brute' ? 17 : 13, seed: i, flash: 0, armor: null, beh: null, fly: false, slowT: 0, burnT: 0, hp: 1, maxHp: 1, vx: 1, vy: 0, age: G.time, shoot: 1 }; drawMon(m); drawEyes(m); }
    else drawMonSample(k, x, y, 1);
    if (Math.hypot(mouse.x - x, mouse.y - y) < 24) tip = { x, name: t === 'm' ? TXT.mon[k].name : TXT.evo[k].name, desc: t === 'm' ? TXT.mon[k].desc : fmt(TXT.evo[k].weak, { to: 'quietest side', from: 'busiest side' }), note: typeof ARCH_NOTE !== 'undefined' ? ARCH_NOTE[k] : '' };
  });
  if (tip) { // 名字 + 说明，放在图标上方，横向夹在屏幕内
    ctx.font = `italic 17px ${FONT}`; const dw = Math.max(ctx.measureText(tip.desc).width, tip.note ? ctx.measureText(tip.note).width : 0), nw = Math.max(dw, 150) + 36, px = clamp(tip.x - nw / 2, 12, VW - 12 - nw);
    panel(px, tip.note ? 694 : 718, nw, tip.note ? 96 : 70, .97); if (tip.note) text(tip.note, px + nw / 2, 778, 16, RED, 'center', .85, null, 'italic');
    text(tip.name, px + nw / 2, tip.note ? 716 : 742, 20, INK, 'center', 1, null, 'italic'); text(tip.desc, px + nw / 2, tip.note ? 746 : 768, 17, GREY, 'center', 1, null, 'italic');
  }
  // 功绩
  const dn = DEEDS.filter(d => M.deeds[d.id]).length, dx = VW - 290, dh = btn(dx, 806, 250, 44, () => { G.showDeeds = true; });
  panel(dx, 806, 250, 44, dh ? 1 : .6); text((TXT.menu.deeds || 'Deeds') + '  ' + dn + ' / ' + DEEDS.length, dx + 125, 828, 19, dh ? RED : INK, 'center', 1, null, 'italic');
  // 9. 教学开关：难度说明右边（难度一排到 x=1040，说明文字在 y=568）
  { const tx = VW - 380, ty = 572, on = !M.noTut, hv = btn(tx, ty - 16, 200, 32, () => { M.noTut = !M.noTut; saveMeta(); });
    text((TXT.menu.tutorial || 'Tutorial') + ':  ' + (on ? 'On' : 'Off'), tx, ty, 17, hv ? RED : on ? INK : GREY, 'left', .9, null, 'italic'); }
  // 10. 设计说明：左下角，和右下角功绩按钮对称
  { const ax = 40, ah = btn(ax, 806, 250, 44, () => { G.showAbout = true; });
    panel(ax, 806, 250, 44, ah ? 1 : .6); text(TXT.menu.about || 'How it works', ax + 125, 828, 19, ah ? RED : INK, 'center', 1, null, 'italic'); }
  if (G.showAbout) drawAbout();
  if (G.showDeeds) drawDeeds();
  drawIntro();
}
/* 难度三选一：居中一排，每个 150×44，总宽 480（x=560..1040）；
   左边英雄选择最多到 x=480，右边深度从 x=1180 起，不重叠。下面一行小字说明当前难度 */
function drawModes(y) {
  const M = G.meta, w = 150, gap = 15, x0 = VW / 2 - (3 * w + 2 * gap) / 2, cur = MODES[M.mode] ? M.mode : 'normal';
  MODE_KEYS.forEach((k, i) => {
    const x = x0 + i * (w + gap), on = cur === k, hov = btn(x, y - 22, w, 44, () => { M.mode = k; saveMeta(); tone(700, 900, .06, .05); });
    panel(x, y - 22, w, 44, on || hov ? 1 : .6);
    if (on) { ctx.strokeStyle = RED; ctx.lineWidth = 2.5; rrect(ctx, x, y - 22, w, 44, 14); ctx.stroke(); }
    text(TXT.menu.modes[k], x + w / 2, y, 20, on ? RED : INK, 'center', 1, null, 'italic');
  });
  text(TXT.menu.modeDesc[cur], VW / 2, y + 38, 16, GREY, 'center', .9, null, 'italic');
}
function archiveList() { return [...Object.keys(BAL.mon).map(k => ['m', k]), ...Object.keys(TXT.evo).map(k => ['e', k])]; }
const seenOf = (t, k) => t === 'm' ? G.meta.seenMon[k] : G.meta.seenEvo[k];
// 没见过的怪：墨色剪影加问号（标题图鉴和结算页共用）。dark 为深色背景
function drawUnseen(x, y, i, r, dark) {
  blobPath(ctx, x, y, r, i, G.time * .5, .15); ctx.fillStyle = dark ? 'rgba(236,228,208,.22)' : 'rgba(22,19,15,.18)'; ctx.fill();
  text('?', x, y, Math.round(r * 1.1), dark ? PAPER : GREY, 'center', dark ? .8 : 1);
}
/* 10. 设计说明页：三十秒讲清楚这个游戏新在哪 */
const ABOUT = [
  ['The tide keeps score.', 'Every night it counts which damage you dealt, who dealt it, and where its dead fell.'],
  ['At dawn it adapts.', 'Burn it and it grows Ember Shell. Wall it in and it learns to fly. Hunt it yourself and it hunts you.'],
  ['Every adaptation has a weakness.', 'The dawn report says what it learned, why, and what breaks it.'],
  ['So you can bait it.', 'Lean on fire for a night, then meet the shelled tide with frost. The top-right corner shows what it is learning.'],
  ['Made with code.', 'Every picture and the music are drawn and played by code. Sound effects are CC0 recordings.']
];
function drawAbout() {
  const w = 1000, h = 140 + ABOUT.length * 76, x = VW / 2 - w / 2, y = Math.max(20, (VH - h) / 2);
  btn(0, 0, VW, VH, () => { G.showAbout = false; });
  ctx.fillStyle = NIGHT; ctx.globalAlpha = .45; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1;
  panel(x, y, w, h, .98);
  text(TXT.menu.aboutTitle || 'How the tide learns', VW / 2, y + 50, 38, INK, 'center', 1, null, 'italic');
  ABOUT.forEach(([a, b], i) => {
    const yy = y + 116 + i * 76;
    text(a, x + 60, yy, 23, i === 3 ? RED : INK, 'left', 1, null, 'italic');
    text(b, x + 60, yy + 30, 17, GREY, 'left', 1);
  });
  text(TXT.menu.deedsClose || 'Click to close', VW / 2, y + h - 22, 16, GREY, 'center', .6 + .4 * Math.sin(G.time * 3));
}
/* 8. 片头：黑底，一滴墨落下，落点晕开成一个圆，把标题页"揭"出来。点一下跳过 */
function drawIntro() {
  const t = G.introT; if (t >= 2.8) return;
  btn(0, 0, VW, VH, () => { G.introT = 9; });
  const cx = VW / 2, cy = 300;
  const r = t < .8 ? 0 : Math.pow(clamp((t - .8) / 1.6, 0, 1), 1.6) * 1250;
  ctx.fillStyle = '#0d0b09'; ctx.beginPath(); ctx.rect(0, 0, VW, VH); if (r > 0) ctx.arc(cx, cy, r, 0, TAU, true); ctx.fill('evenodd');
  if (t < .8) { const y = -20 + (cy + 20) * Math.pow(t / .8, 2); ctx.fillStyle = '#ece4d0'; ctx.beginPath(); ctx.ellipse(cx, y, 7, 11, 0, 0, TAU); ctx.fill(); }
  else if (r < 300) { ctx.strokeStyle = '#ece4d0'; ctx.globalAlpha = 1 - r / 300; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r + 20, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
}
function drawDeeds() {
  const M = G.meta, w = 1100, h = 150 + DEEDS.length * 50, x = VW / 2 - w / 2, y = Math.max(20, (VH - h) / 2);
  btn(0, 0, VW, VH, () => { G.showDeeds = false; });
  ctx.fillStyle = NIGHT; ctx.globalAlpha = .45; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1;
  panel(x, y, w, h, .98);
  text(TXT.menu.deeds || 'Deeds', VW / 2, y + 44, 36, INK, 'center', 1, null, 'italic');
  text(TXT.menu.deedsSub || 'Optional goals. Each pays souls once.', VW / 2, y + 78, 17, GREY, 'center', 1, null, 'italic');
  DEEDS.forEach((d, i) => {
    const yy = y + 124 + i * 50, done = M.deeds[d.id];
    ctx.strokeStyle = INK; ctx.globalAlpha = .15; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 40, yy - 22); ctx.lineTo(x + w - 40, yy - 22); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.strokeStyle = done ? GREEN : GREY; ctx.lineWidth = 2; rrect(ctx, x + 44, yy - 10, 20, 20, 4); ctx.stroke();
    if (done) { ctx.beginPath(); ctx.moveTo(x + 49, yy); ctx.lineTo(x + 54, yy + 6); ctx.lineTo(x + 61, yy - 7); ctx.stroke(); }
    text(d.name, x + 84, yy, 21, done ? GREY : INK, 'left', 1, null, 'italic');
    text(d.desc, x + 340, yy, 17, done ? GREY : INK, 'left', done ? .6 : .9);
    text(done ? (TXT.menu.done || 'done') : '+' + d.reward, x + w - 44, yy, 18, done ? GREEN : RED, 'right');
  });
  text(TXT.menu.deedsClose || 'Click to close', VW / 2, y + h - 22, 16, GREY, 'center', .6 + .4 * Math.sin(G.time * 3));
}

/* ---------- 结算 ---------- */
function drawEnd(win) {
  UI.modal = true;
  const a = clamp(G.modalT * 1.5, 0, 1), cx = VW / 2;
  ctx.fillStyle = win ? PAPER : NIGHT; ctx.globalAlpha = a * (win ? .88 : .86); ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1;
  const col = win ? INK : PAPER, hi = win ? RED : '#f0694a';
  const sw = clamp(G.modalT * 1.4, 0, 1); // 一笔墨从左往右拖出来
  brush(ctx, cx - 330, 236, cx - 330 + 660 * sw, 230, 30, win ? INK : '#05070c', .55 * a);
  text(win ? TXT.ui.win : TXT.ui.gameOver, cx, 180, 92, col, 'center', a, null, 'italic');
  ctx.font = `italic 92px ${FONT}`; seal(ctx, cx + ctx.measureText(win ? TXT.ui.win : TXT.ui.gameOver).width / 2 + 50, 150, 52, win ? 'W' : 'IT'); // 印章落在标题右边，不压字
  const stats = [[TXT.ui.night, G.night], [TXT.ui.kills, G.kills], ['Best chain', G.maxCombo]];
  stats.forEach(([k, v], i) => {
    const x = cx + (i - 1) * 190, s = clamp(G.modalT * 2 - .4 - i * .2, 0, 1);
    text(String(v), x, 282, 44, win ? RED : '#e0bd62', 'center', a * s, null, 'italic');
    text(k, x, 316, 16, col, 'center', a * s * .75, null, 'italic');
    if (i) { ctx.strokeStyle = col; ctx.globalAlpha = a * .2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 95, 262); ctx.lineTo(x - 95, 322); ctx.stroke(); ctx.globalAlpha = 1; }
  });
  if (win && Math.random() < .3 && FX.parts.length < 300) FX.parts.push({ x: rand(VW), y: -10, vx: rand(-20, 20), vy: rand(60, 140), life: 4, r: rand(2, 4), color: pick([RED, GOLD, INK]) }); // 胜利时飘落的朱砂和金点
  if (!win && G.closeS > 0 && G.closeS <= 35) text(fmt(TXT.ui.close, { s: Math.ceil(G.closeS) }), cx, 360, 26, hi, 'center', a, null, 'italic');
  let y = 420;
  text(fmt(TXT.ui.earned, { n: G.earned }), cx, y, 46, win ? RED : '#e0bd62', 'center', a, null, 'italic'); y += 46;
  const lr = Object.keys(G.runEvo || {}).filter(k => TXT.evo[k]).map(k => TXT.evo[k].name);
  if (lr.length) { text((TXT.ui.theyLearned || 'This run they learned') + ':  ' + lr.join('  ·  '), cx, y, 20, col, 'center', a * .85, null, 'italic'); y += 34; }
  G.runDeeds.slice(0, 3).forEach(d => { text(fmt(TXT.ui.deedDone || 'Deed: {name}   +{n} souls', { name: d.name, n: d.reward }), cx, y, 22, win ? GREEN : '#e0bd62', 'center', a, null, 'italic'); y += 30; });
  if (G.runDeeds.length > 3) { text('+' + (G.runDeeds.length - 3) + ' more', cx, y, 18, col, 'center', a * .7); y += 28; }
  if (G.newDepth) { text(fmt(TXT.menu.newDepth, { n: G.newDepth }), cx, y, 24, hi, 'center', a, null, 'italic'); y += 36; }
  if (!win) { // 10. 下一局的建议：按最后一晚它们会的本事给克制方法
    const ks = Object.keys(G.evo || {}).filter(k => TXT.evo[k]);
    const adv = ks.length ? (TXT.ui.nextTime || 'Next time') + ':  ' + TXT.evo[ks[0]].name + ' — ' + fmt(TXT.evo[ks[0]].weak, { to: 'the quiet side', from: 'the busy side' }) : (TXT.ui.nextTimeNone || 'Next time: build earlier, and keep the lamp ringed.');
    text(adv, cx, y, 20, '#f0c48a', 'center', a * .95, null, 'italic'); y += 36;
  }
  const g = nextGoal();
  if (g) { text(g.need ? fmt(TXT.menu.goal, { n: g.need, name: g.name }) : fmt(TXT.menu.afford, { name: g.name }), cx, y, 22, col, 'center', a * .9, null, 'italic'); y += 44; }
  // 还没见过的东西：给下一局一个理由
  const un = archiveList().map(([t, k], i) => [t, k, i]).filter(([t, k]) => !seenOf(t, k)).slice(0, 2);
  if (un.length) {
    text(TXT.ui.notSeen || 'Not yet seen', cx - 70, y + 6, 18, col, 'right', a * .8, null, 'italic');
    ctx.globalAlpha = a; un.forEach(([t, k, i], j) => drawUnseen(cx - 30 + j * 56, y + 6, i, 18, !win)); ctx.globalAlpha = 1;
    y += 50;
  }
  if (G.modalT < 1.2) return;
  y = Math.max(y + 20, 640);
  if (win) {
    const h1 = btn(cx - 310, y, 300, 60, () => continueEndless()), h2 = btn(cx + 10, y, 300, 60, () => toTitle());
    panel(cx - 310, y, 300, 60, h1 ? 1 : .8); text(TXT.menu.endless, cx - 160, y + 30, 19, h1 ? RED : INK, 'center', 1, null, 'italic');
    panel(cx + 10, y, 300, 60, h2 ? 1 : .8); text(TXT.menu.back, cx + 160, y + 30, 19, h2 ? RED : INK, 'center', 1, null, 'italic');
  } else {
    btn(0, 0, VW, VH, () => toTitle());
    text(TXT.ui.again, cx, y + 20, 24, col, 'center', .55 + .4 * Math.sin(G.time * 3));
  }
}
