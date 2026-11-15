/* extras4：英雄被建筑挡住 + 一步一步的聚光灯新手引导
   - 英雄和怪一样，不能穿过墙、塔、岩石、河水和灯（地刺、墨井是地面，可以走）
   - 冲刺照样能穿过去（落点在墙里会被推出来）；万一被自己的墙整个围死，顶着墙走一会儿就能挤出去
   - 引导：压暗屏幕，只把要点的地方照亮，旁边一块小牌写"按什么键 / 点哪里"，做完自动进下一步 */

/* 冲刺冷却保持 C 定的 4 秒；冲刺撞墙就停（见 extras5 的 swordDash），不再穿墙 */

/* ---------- 英雄碰撞 ---------- */
const HERO_R = 14;
function heroBlockedAt(c, r) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
  const b = grid[idx(c, r)];
  return b === 'lamp' || !!(b && b.type === 'rock'); // 只有灯、岩石、河挡英雄；自己的塔和墙可以走过去
}
function heroPush(h) { // 和 unclip 一样：把圆从挡路的格子里推出来，返回推了多少
  let moved = 0;
  for (let pass = 0; pass < 2; pass++) {
    const c0 = colOf(h.x), r0 = rowOf(h.y);
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
      const c = c0 + dc, r = r0 + dr; if (!heroBlockedAt(c, r)) continue;
      const x0 = c * CELL, y0 = r * CELL, px = clamp(h.x, x0, x0 + CELL), py = clamp(h.y, y0, y0 + CELL);
      let dx = h.x - px, dy = h.y - py, d = Math.hypot(dx, dy);
      if (d >= HERO_R) continue;
      if (d < .01) { // 圆心已经在格子里：往格子中心反方向推出去
        const cx = x0 + CELL / 2, cy = y0 + CELL / 2; dx = h.x - cx; dy = h.y - cy; d = Math.hypot(dx, dy) || 1;
        const nx = cx + dx / d * (CELL * .71 + HERO_R), ny = cy + dy / d * (CELL * .71 + HERO_R);
        moved += Math.hypot(nx - h.x, ny - h.y); h.x = nx; h.y = ny; continue;
      }
      h.x += dx / d * (HERO_R - d); h.y += dy / d * (HERO_R - d); moved += HERO_R - d;
    }
  }
  h.x = clamp(h.x, 16, VW - 16); h.y = clamp(h.y, 16, VH - 16);
  return moved;
}
function heroOverlaps(h) {
  const c0 = colOf(h.x), r0 = rowOf(h.y);
  for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
    const c = c0 + dc, r = r0 + dr; if (!heroBlockedAt(c, r)) continue;
    const x0 = c * CELL, y0 = r * CELL;
    if (Math.hypot(h.x - clamp(h.x, x0, x0 + CELL), h.y - clamp(h.y, y0, y0 + CELL)) < HERO_R - 1) return true;
  }
  return false;
}
// 从英雄所在格出发能不能走到灯旁边（灯周围一圈永远不能造东西）。走不到 = 被围死了
function heroEnclosed(h) {
  const start = idx(clamp(colOf(h.x), 0, COLS - 1), clamp(rowOf(h.y), 0, ROWS - 1));
  const seen = new Uint8Array(COLS * ROWS), q = [start]; seen[start] = 1;
  while (q.length) {
    const i = q.pop(), c = i % COLS, r = (i / COLS) | 0;
    if (nearLamp(i) && grid[i] !== 'lamp') return false;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const cc = c + dc, rr = r + dr; if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) continue;
      const j = idx(cc, rr); if (seen[j] || heroBlockedAt(cc, rr)) continue; seen[j] = 1; q.push(j);
    }
  }
  return true;
}
const _updHero4 = updHero;
updHero = function (dt, rdt) {
  const h = G.hero, bx = h ? h.x : 0, by = h ? h.y : 0;
  _updHero4(dt, rdt);
  if (!h || h.down || h.dash) return;
  if (h.ghost) { if (!heroOverlaps(h)) { h.ghost = false; h.stuckT = 0; } return; } // 正在挤出去
  const want = keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight || (joy.id !== null && (joy.dx || joy.dy));
  heroPush(h);
  // 顶着墙却几乎没挪动：如果是被围死了，1.2 秒后放他挤出去
  if (want && Math.hypot(h.x - bx, h.y - by) < 20 * dt) { h.stuckT = (h.stuckT || 0) + dt; if (h.stuckT > 1.2) { h.stuckT = 0; if (heroEnclosed(h)) { h.ghost = true; addText(TXT.ui.squeeze || 'Squeezed through', h.x, h.y - 40, 18, GREY, 1); } } }
  else h.stuckT = 0;
};
// 冲刺结束时如果停在墙里，下一帧会被正常推出来；这里只保证冲刺落点不出屏幕
const _drawHero4 = drawHero;
drawHero = function () { const h = G.hero; if (h && h.ghost) { ctx.globalAlpha = .55; _drawHero4(); ctx.globalAlpha = 1; } else _drawHero4(); };

/* ---------- 聚光灯新手引导 ---------- */
const TOUR_ORDER = ['fight', 'gather', 'pick', 'place', 'start', 'defend', 'skill', 'learn', 'report', 'relic', 'counter'];
G.tourT = {};
function tourOn() { return G.meta && !G.meta.noTut && !G.meta.tourDone && !G.endless && (G.state === 'prelude' || G.state === 'day' || G.state === 'night' || G.state === 'report' || G.state === 'relic'); }
function tourDone() { if (!G.meta.tourDone) { G.meta.tourDone = 1; saveMeta(); } }
function tourStep() {
  const n = G.night, s = G.state, T = G.tourT;
  if (s === 'prelude') return 'fight';
  if (s === 'day' && n === 0) {
    const fire = G.builds.some(b => b.type === 'fire');
    if (!G.gathered && !fire) return 'gather';
    if (!fire) return G.buildSel === 'fire' ? 'place' : 'pick';
    return 'start';
  }
  if (s === 'night' && n === 1) {
    if ((T.defend || 0) < 5) return 'defend';
    if (!T.skillUsed && (T.skill || 0) < 14) return 'skill';
    if ((T.learn || 0) < 7) return 'learn';
    return null;
  }
  if (s === 'report' && n === 1) return 'report';
  if (s === 'relic' && n === 1) return 'relic';
  if (s === 'day' && n === 1) {
    if ((T.counter || 0) < 12 && !(G.evo.flame && G.builds.some(b => b.type === 'ice'))) return 'counter';
    tourDone(); return null;
  }
  if (n >= 2) tourDone();
  return null;
}
function slotRect(k) {
  const n = BUILD_KEYS.length, { w, h, gap, y } = BAR, x0 = VW / 2 - (n * w + (n - 1) * gap) / 2, i = BUILD_KEYS.indexOf(k);
  return { x: x0 + i * (w + gap), y, w, h, round: 14 };
}
function tourCell() { // 灯旁边推荐放火盆的一格：第一个能放的
  const tries = [[0, -2], [2, 0], [-2, 0], [0, 2], [2, -2], [-2, -2], [2, 2], [-2, 2], [0, -3], [3, 0], [-3, 0]];
  for (const [dc, dr] of tries) { const c = LAMP.c + dc, r = LAMP.r + dr; if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue; const i = idx(c, r); if (!grid[i] && !nearLamp(i)) return i; }
  return -1;
}
function reportRect() { // 和 drawReport 的算法一致
  const R = G.report; if (!R) return { x: VW / 2 - 470, y: 120, w: 940, h: 600 };
  const n = R.adapt.length, cardH = 156, gap = 16, bodyH = n ? n * cardH + (n - 1) * gap : 90, fadedH = R.faded.length * 24;
  const pw = 940, ph = 150 + bodyH + fadedH + 130 + (G.bountyLine ? 26 : 0), px = VW / 2 - pw / 2, py = Math.round((VH - ph) / 2);
  return n ? { x: px + 50, y: py + 130, w: pw - 100, h: cardH + 30, round: 16 } : { x: px, y: py, w: pw, h: ph, round: 16 };
}
// 每一步：照亮哪里(target)、标题、正文、按键
function tourInfo(k) {
  const h = G.hero, T = TOUCH, nm = (typeof HERO_SKILL !== 'undefined' && HERO_SKILL[h.type]) || 'Skill';
  switch (k) {
    case 'fight': {
      const m = G.mons.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0];
      return { t: m ? { cx: m.x, cy: m.y, r: 46 } : { cx: h.x, cy: h.y, r: 46 }, dim: .25, title: 'Strike the ink',
        body: T ? 'Ink is crawling toward the lamp. Drag the stick on the left to walk up to it. You strike on your own.' : 'Ink is crawling toward the lamp. Walk up to it and hold the left mouse button to strike.',
        keys: T ? ['Drag stick'] : ['W A S D', 'Hold Left Click'] };
    }
    case 'gather': {
      const nd = G.nodes.length ? G.nodes.reduce((a, b) => Math.hypot(b.x - h.x, b.y - h.y) < Math.hypot(a.x - h.x, a.y - h.y) ? b : a) : null;
      return { t: nd ? { cx: nd.x, cy: nd.y, r: 48 } : null, dim: .4, title: 'Gather materials',
        body: 'Walk onto the glowing patch and stand there. Bamboo and cinnabar pay for every building.', keys: T ? ['Drag stick'] : ['W A S D'] };
    }
    case 'pick': return { t: slotRect('fire'), dim: .5, title: 'Pick a Fire Brazier',
      body: T ? 'Tap this card to pick it up.' : 'Press 3, or click this card to pick it up.', keys: T ? ['Tap'] : ['3', 'or  Click'] };
    case 'place': {
      const i = tourCell();
      return { t: i < 0 ? null : { x: (i % COLS) * CELL, y: ((i / COLS) | 0) * CELL, w: CELL, h: CELL, round: 6, pad: 6 }, dim: .45, title: 'Place it near the lamp',
        body: T ? 'Tap the lit square. Any free square near the lamp works too.' : 'Click the lit square. Any free square near the lamp works too. Right-click cancels.', keys: T ? ['Tap'] : ['Left Click'] };
    }
    case 'start': return { t: { x: 1300, y: 812, w: 280, h: 64, round: 16 }, dim: .5, title: 'Start the night',
      body: T ? 'Build more if you like, then tap Start Night.' : 'Build more if you like, then press Enter or click Start Night.', keys: T ? ['Tap'] : ['Enter', 'or  Click'] };
    case 'defend': return { t: { cx: LAMP.x, cy: LAMP.y, r: 60 }, dim: .2, title: 'Keep the lamp lit',
      body: 'They come in from the edges. If the lamp goes out, the run ends. Fight near it.', keys: [] };
    case 'skill': return { t: T ? { cx: 1500, cy: 800, r: 66 } : { cx: h.x, cy: h.y, r: 50 }, dim: .2, title: 'Use your skill: ' + nm,
      body: T ? 'Tap the round button to use it.' : (h.type === 'sword' ? 'Press Space to dash toward the mouse. It cuts through every enemy on the line, and through walls.' : 'Press Space. It fires toward your mouse.'), keys: T ? ['Tap'] : ['Space'] };
    case 'learn': return { t: { x: VW - 470, y: 14, w: 456, h: 150, round: 14 }, dim: .3, title: 'They are learning',
      body: 'This corner shows what the tide is learning from the way you fight, right now. Change how you fight and it learns something else.', keys: [] };
    case 'report': return { t: reportRect(), dim: .3, title: 'Dawn report',
      body: 'Each card is one thing they learned. The red line is its weakness. Use it tomorrow.', keys: [T ? 'Tap anywhere' : 'Click anywhere'] };
    case 'relic': return { t: (() => { const n = (G.cards || []).length || 3, W = n * 270 + (n - 1) * 30; return { x: VW / 2 - W / 2 - 6, y: 252, w: W + 12, h: 400, round: 16 }; })(), dim: .3, title: 'Pick one relic',
      body: 'It stays with you for the whole run. Choose one card.', keys: [T ? 'Tap a card' : 'Click a card'] };
    case 'counter': {
      const frost = G.evo.flame && available('ice');
      return { t: frost ? slotRect('ice') : { x: BAR.y ? slotRect('wall').x - 8 : 340, y: BAR.y - 8, w: 7 * BAR.w + 6 * BAR.gap + 16, h: BAR.h + 16, round: 16 }, dim: .35,
        title: frost ? 'Counter what they learned' : 'Your turn',
        body: frost ? (T ? 'Their shells resist fire now. Tap Frost and build a Frost Bell.' : 'Their shells resist fire now. Press 4 and build a Frost Bell.') : 'Build against what they learned, then start the night. You are on your own from here.',
        keys: frost ? [T ? 'Tap' : '4'] : [] };
    }
  }
  return null;
}
function tourWrap(s, size, maxW) {
  ctx.font = `italic ${size}px ${FONT}`;
  const out = []; let cur = '';
  for (const w of s.split(' ')) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur); return out;
}
function keyCap(s, x, y) { // 画一个键帽，返回宽度
  ctx.font = `bold 17px ${FONT}`; const w = Math.max(40, ctx.measureText(s).width + 26);
  if (s.startsWith('or ')) { text(s, x, y, 16, GREY, 'left', 1, null, 'italic'); ctx.font = `italic 16px ${FONT}`; return ctx.measureText(s).width + 8; }
  ctx.fillStyle = 'rgba(22,19,15,.25)'; rrect(ctx, x, y - 15 + 3, w, 32, 8); ctx.fill();
  ctx.fillStyle = '#fbf6ea'; rrect(ctx, x, y - 15, w, 30, 8); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rrect(ctx, x, y - 15, w, 30, 8); ctx.stroke();
  text(s, x + w / 2, y + 1, 16, INK, 'center', 1, null, 'bold');
  return w + 10;
}
let tourLast = 0, tourShown = null, tourA = 0;
function drawTour() {
  const dt = Math.min(.1, Math.max(0, G.time - tourLast)); tourLast = G.time;
  if (!tourOn()) { tourA = 0; return; }
  const k = tourStep(); if (!k) { tourA = 0; return; }
  if (k !== tourShown) { tourShown = k; tourA = 0; tone(660, 990, .12, .05, 'triangle'); }
  const run = !(typeof paused !== 'undefined' && paused) && !(G.spot) && G.bossIntro == null && !(G.state === 'night' && G.nightIntro != null);
  if (run) G.tourT[k] = (G.tourT[k] || 0) + dt;
  if (k === 'skill' && G.hero.skillCd > .1) G.tourT.skillUsed = 1;
  if (!run) return; // 慢动作亮相和入夜标题时先不盖
  tourA = Math.min(1, tourA + dt * 3);
  const I = tourInfo(k); if (!I) return;
  const a = tourA, t = I.t, pulse = .5 + .5 * Math.sin(G.time * 5);
  // 1. 压暗，挖出一个洞
  let tx, ty, tw, th;
  if (t) {
    if (t.r) { tx = t.cx - t.r; ty = t.cy - t.r; tw = th = t.r * 2; }
    else { const p = t.pad || 8; tx = t.x - p; ty = t.y - p; tw = t.w + p * 2; th = t.h + p * 2; }
  }
  ctx.save();
  ctx.fillStyle = 'rgba(12,10,8,1)'; ctx.globalAlpha = I.dim * a;
  ctx.beginPath(); ctx.rect(0, 0, VW, VH);
  if (t) { if (t.r) { ctx.moveTo(t.cx + t.r, t.cy); ctx.arc(t.cx, t.cy, t.r, 0, TAU, true); } else { if (ctx.roundRect) ctx.roundRect(tx, ty, tw, th, t.round || 10); else ctx.rect(tx, ty, tw, th); } }
  ctx.fill('evenodd'); ctx.globalAlpha = 1;
  // 2. 红圈呼吸 + 往外扩的波纹
  if (t) {
    const grow = (G.time * 1.2) % 1;
    for (const [ex, al, lw] of [[0, .7 + .3 * pulse, 3.5], [grow * 22, (1 - grow) * .6, 2]]) {
      ctx.strokeStyle = RED; ctx.lineWidth = lw; ctx.globalAlpha = al * a; ctx.beginPath();
      if (t.r) ctx.arc(t.cx, t.cy, t.r + ex, 0, TAU); else rrect(ctx, tx - ex, ty - ex, tw + ex * 2, th + ex * 2, (t.round || 10) + ex);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // 3. 说明牌：优先放目标上方/下方，放不下放左右
  const PW = 420, body = tourWrap(I.body, 19, PW - 48), hasKeys = I.keys && I.keys.length;
  const PH = 64 + 30 + body.length * 26 + (hasKeys ? 48 : 0) + 30;
  let px, py, side;
  const fits = (x, y) => x >= 12 && y >= 12 && x + PW <= VW - 12 && y + PH <= VH - 12 && (!t || x > tx + tw + 8 || x + PW < tx - 8 || y > ty + th + 8 || y + PH < ty - 8);
  const ccx = t ? tx + tw / 2 : VW / 2, ccy = t ? ty + th / 2 : VH / 2;
  const opts = t ? [['up', ccx - PW / 2, ty - 40 - PH], ['down', ccx - PW / 2, ty + th + 40], ['right', tx + tw + 50, ccy - PH / 2], ['left', tx - 50 - PW, ccy - PH / 2]] : [['none', VW / 2 - PW / 2, 160]];
  for (const [s, x, y] of opts) { const cxp = clamp(x, 12, VW - 12 - PW), cyp = clamp(y, 12, VH - 12 - PH); if (fits(cxp, cyp)) { px = cxp; py = cyp; side = s; break; } }
  if (px === undefined) { px = 30; py = 30; side = 'none'; }
  const slide = (1 - a) * 14;
  py += side === 'up' ? -slide : side === 'down' ? slide : 0;
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(12,10,8,.35)'; rrect(ctx, px + 4, py + 6, PW, PH, 16); ctx.fill();
  ctx.fillStyle = '#f6efdf'; rrect(ctx, px, py, PW, PH, 16); ctx.fill();
  ctx.strokeStyle = RED; ctx.lineWidth = 2.5; rrect(ctx, px, py, PW, PH, 16); ctx.stroke();
  ctx.fillStyle = RED; rrect(ctx, px, py, 8, PH, 4); ctx.fill();
  ctx.globalAlpha = 1;
  const n = TOUR_ORDER.indexOf(k) + 1, N = TOUR_ORDER.length;
  text('STEP ' + n + ' / ' + N, px + 28, py + 26, 14, RED, 'left', a, null, 'bold');
  for (let i = 0; i < N; i++) { ctx.fillStyle = i < n ? RED : 'rgba(22,19,15,.18)'; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(px + PW - 30 - (N - 1 - i) * 13, py + 26, i === n - 1 ? 5 : 3.5, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  text(I.title, px + 28, py + 62, 28, INK, 'left', a, null, 'italic');
  body.forEach((s, i) => text(s, px + 28, py + 100 + i * 26, 19, '#4a4237', 'left', a, null, 'italic'));
  let ky = py + 100 + body.length * 26 + 22;
  if (hasKeys) { let kx = px + 28; for (const s of I.keys) kx += keyCap(s, kx, ky); ky += 44; }
  // 跳过
  const sk = 'Skip tutorial', sx = px + PW - 24, sy = py + PH - 22;
  ctx.font = `italic 15px ${FONT}`; const sw = ctx.measureText(sk).width;
  const hov = btn(sx - sw - 8, sy - 14, sw + 16, 28, () => { tourDone(); addText('Tutorial off. Turn it back on from the title screen.', VW / 2, 300, 22, GREY, 2); });
  text(sk, sx, sy, 15, hov ? RED : GREY, 'right', a * .9, null, 'italic');
  // 4. 箭头：从牌子指向目标，一上一下地跳
  if (t && side !== 'none') {
    const bob = Math.sin(G.time * 7) * 7;
    let ax, ay, ang;
    if (side === 'up') { ax = ccx; ay = ty - 10 - bob; ang = Math.PI / 2; }
    else if (side === 'down') { ax = ccx; ay = ty + th + 10 + bob; ang = -Math.PI / 2; }
    else if (side === 'right') { ax = tx + tw + 10 + bob; ay = ccy; ang = Math.PI; }
    else { ax = tx - 10 - bob; ay = ccy; ang = 0; }
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang); ctx.globalAlpha = a;
    ctx.fillStyle = RED; ctx.strokeStyle = '#f6efdf'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, -16); ctx.lineTo(-22, -6); ctx.lineTo(-40, -6); ctx.lineTo(-40, 6); ctx.lineTo(-22, 6); ctx.lineTo(-22, 16); ctx.closePath();
    ctx.stroke(); ctx.fill(); ctx.restore();
  }
  // 5. 点击类步骤：画一只"手指"点击的小圈，告诉你点这里
  if (t && (k === 'pick' || k === 'place' || k === 'start' || (k === 'counter' && I.keys.length))) {
    const ph = (G.time * 1.4) % 1, fx = ccx + 18, fy = ccy + 14;
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.globalAlpha = (1 - ph) * a; ctx.beginPath(); ctx.arc(fx, fy, 6 + ph * 18, 0, TAU); ctx.stroke();
    ctx.globalAlpha = a; ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(fx, fy, 5, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// 引导开着时，旧的底部提示、第一天清单、提示箭头都不画
const _hints4 = hints;
hints = function (dt) { _hints4(dt); if (tourOn() && tourStep()) G.hintA = 0; };
const _checklist4 = drawChecklist;
drawChecklist = function () { if (tourOn()) return; _checklist4(); };
const _hintArrow4 = hintArrow;
hintArrow = function () { if (tourOn()) return; _hintArrow4(); };
// 新一局清空计时；在标题页把教学重新打开时，引导从头再来
const _newRun4 = newRun;
newRun = function () { G.tourT = {}; tourShown = null; return _newRun4.apply(this, arguments); };
let tutPrev = null;
const _draw4 = draw;
draw = function () {
  _draw4();
  if (G.meta) { if (tutPrev === true && !G.meta.noTut && G.meta.tourDone) { G.meta.tourDone = 0; saveMeta(); } tutPrev = !!G.meta.noTut; }
  if (G.state === 'over' && tourOn() === false && G.meta && !G.meta.tourDone && G.night >= 1) tourDone(); // 输过一局就不再从头教
  if (typeof paused !== 'undefined' && paused) return;
  drawTour();
};

/* 绕路：英雄从 (x0,y0) 去 (x1,y1)，按格子做一次宽度搜索，返回下一个要走向的点（直线不挡就直接返回终点）。自动试玩用 */
function heroLineClear(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 10);
  for (let k = 1; k <= n; k++) { const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; for (const [ox, oy] of [[0, 0], [HERO_R, 0], [-HERO_R, 0], [0, HERO_R], [0, -HERO_R]]) if (heroBlockedAt(colOf(x + ox), rowOf(y + oy))) return false; }
  return true;
}
function heroPathStep(x0, y0, x1, y1) {
  if (heroLineClear(x0, y0, x1, y1)) return { x: x1, y: y1 };
  const s = idx(clamp(colOf(x0), 0, COLS - 1), clamp(rowOf(y0), 0, ROWS - 1)), g = idx(clamp(colOf(x1), 0, COLS - 1), clamp(rowOf(y1), 0, ROWS - 1));
  const prev = new Int32Array(COLS * ROWS).fill(-1), q = [s]; prev[s] = s;
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi]; if (i === g) break;
    const c = i % COLS, r = (i / COLS) | 0;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const cc = c + dc, rr = r + dr; if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) continue; const j = idx(cc, rr); if (prev[j] >= 0 || (heroBlockedAt(cc, rr) && j !== g)) continue; prev[j] = i; q.push(j); }
  }
  if (prev[g] < 0) return { x: x1, y: y1 };
  const path = []; for (let i = g; i !== s; i = prev[i]) path.push(i);
  path.reverse();
  // 往前看：找最远一个直线能到的格子
  let best = path[0];
  for (const i of path) { const px = ccx(i), py = ccy(i); if (heroLineClear(x0, y0, px, py)) best = i; else break; }
  return best === g ? { x: x1, y: y1 } : { x: ccx(best), y: ccy(best) };
}

// 技能那一步写明冷却时间
const _tourInfo4 = tourInfo;
tourInfo = function (k) { const I = _tourInfo4(k); if (k === 'skill' && I) I.body += ' It comes back after ' + Math.round(BAL.hero[G.hero.type].skillCd * (G.mods.skillCd || 1)) + ' seconds.'; return I; };
