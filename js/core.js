'use strict';
/* 画布、输入、声音、水墨绘制、通用特效 */
const TAU = Math.PI * 2;
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const pick = a => a[Math.random() * a.length | 0];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] !== undefined ? o[k] : '');
const INK = '#16130f', PAPER = '#ece4d0', RED = '#b8321f', QING = '#3d7f93', GOLD = '#b08a3c', GREEN = '#4f6f3c', GREY = '#7d776b', NIGHT = '#141a26';
const FONT = '"Palatino Linotype","Book Antiqua",Palatino,Georgia,serif';
const VW = 1600, VH = 900; // 逻辑画面大小，实际按窗口等比缩放

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const paper = mk(VW, VH), pctx = paper.getContext('2d');   // 留在纸上的墨
const bg = mk(VW, VH);                                     // 宣纸底
const nightCv = mk(VW / 2, VH / 2), nctx = nightCv.getContext('2d');
let W = 0, H = 0, DPR = 1, SC = 1, OX = 0, OY = 0;

function makeBg() {
  const b = bg.getContext('2d');
  b.fillStyle = PAPER; b.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 1700; i++) {
    b.strokeStyle = `rgba(${Math.random() < .5 ? '120,100,70' : '255,250,235'},${rand(.03, .09)})`;
    b.lineWidth = rand(.4, 1.2);
    const x = rand(VW), y = rand(VH), a = rand(TAU), l = rand(6, 26);
    b.beginPath(); b.moveTo(x, y); b.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); b.stroke();
  }
  const g = b.createRadialGradient(VW / 2, VH / 2, 320, VW / 2, VH / 2, 1050);
  g.addColorStop(0, 'rgba(120,95,60,0)'); g.addColorStop(1, 'rgba(120,95,60,.3)');
  b.fillStyle = g; b.fillRect(0, 0, VW, VH);
}
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  // 手机：用真正看得见的那块区域（地址栏、底部工具栏占掉的不算），画布的 CSS 尺寸也跟着设成同样大，坐标才对得上
  const vv = window.visualViewport;
  W = Math.round(vv ? vv.width : window.innerWidth); H = Math.round(vv ? vv.height : window.innerHeight);
  if (cv.style) { cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
  cv.width = W * DPR; cv.height = H * DPR;
  SC = Math.min(W / VW, H / VH); OX = (W - VW * SC) / 2; OY = (H - VH * SC) / 2;
}
function useWorld(sx = 0, sy = 0) { ctx.setTransform(SC * DPR, 0, 0, SC * DPR, (OX + sx) * DPR, (OY + sy) * DPR); }

/* ---------- 输入 ---------- */
const mouse = { x: VW / 2, y: VH / 2, down: false, pressed: false, rpressed: false };
const keys = {}, pressed = {};
const UI = { btns: [], modal: false };
function setMouse(e) { mouse.x = (e.clientX - OX) / SC; mouse.y = (e.clientY - OY) / SC; }
function uiClick(x, y) {
  for (let i = UI.btns.length - 1; i >= 0; i--) {
    const b = UI.btns[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.cb(); return true; }
  }
  return UI.modal;
}
function btn(x, y, w, h, cb) { UI.btns.push({ x, y, w, h, cb }); return mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h; }
const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const joy = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
const JOY_ZONE = p => p.x < 380 && p.y > 520; // 左下这块按下就是摇杆
function toWorld(e) { return { x: (e.clientX - OX) / SC, y: (e.clientY - OY) / SC }; }
cv.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' && joy.id === null && typeof G !== 'undefined' && (G.state === 'day' || G.state === 'night' || G.state === 'prelude')) {
    const p = toWorld(e);
    if (JOY_ZONE(p) && !(G.buildSel)) { e.preventDefault(); initAudio(); joy.id = e.pointerId; joy.ox = p.x; joy.oy = p.y; joy.dx = joy.dy = 0; return; }
  }
  e.preventDefault(); setMouse(e); initAudio();
  if (e.button === 2) { mouse.rpressed = true; return; }
  if (uiClick(mouse.x, mouse.y)) return;
  mouse.down = true; mouse.pressed = true;
});
cv.addEventListener('pointermove', e => {
  if (e.pointerId === joy.id) { const p = toWorld(e), dx = p.x - joy.ox, dy = p.y - joy.oy, l = Math.hypot(dx, dy), k = l > 70 ? 70 / l : 1; joy.dx = dx * k / 70; joy.dy = dy * k / 70; return; }
  setMouse(e);
});
window.addEventListener('pointerup', e => { if (e.pointerId === joy.id) { joy.id = null; joy.dx = joy.dy = 0; return; } mouse.down = false; });
window.addEventListener('pointercancel', e => { if (e.pointerId === joy.id) { joy.id = null; joy.dx = joy.dy = 0; } });
window.addEventListener('blur', () => { mouse.down = false; for (const k in keys) keys[k] = false; });
window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (!e.repeat) pressed[e.code] = true;
  keys[e.code] = true;
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.code === 'KeyM') muted = !muted;
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize); // 手机地址栏收起/弹出
window.addEventListener('orientationchange', () => setTimeout(resize, 300));

/* ---------- 声音（全部现场合成） ---------- */
let AC = null, master = null, noiseBuf = null, muted = false, lastPluck = 0, verb = null;
const PENTA = [0, 2, 4, 7, 9];
/* 声音总线：所有声音 → master → 一道温和的低通（削掉刺耳的高频）→ 压缩 → 输出；
   另分一路进混响，让声音像在空屋子里，不再是"干巴巴的电子音" */
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = .6;
    const warm = AC.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 9000; warm.Q.value = .5;
    const comp = AC.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    master.connect(warm); warm.connect(comp); comp.connect(AC.destination);
    // 合成一段 1.8 秒的立体声衰减噪声当混响的脉冲
    const len = Math.floor(AC.sampleRate * 1.8), ir = AC.createBuffer(2, len, AC.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    const conv = AC.createConvolver(); conv.buffer = ir;
    verb = AC.createGain(); verb.gain.value = .12;
    verb.connect(conv); conv.connect(warm);
    master.connect(verb);
    noiseBuf = AC.createBuffer(1, Math.floor(AC.sampleRate * .5), AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    loadSfx();
  } catch (e) { AC = null; }
}
/* ---------- 真实音效 ----------
   sfx/ 里是 CC0 的真实录音（Kenney RPG Sounds、80 CC0 RPG SFX，见 sfx/CREDITS.txt）。
   名字后面带数字的是同一组的几个变体，每次随机挑一个，再微调一点音高，听起来不重复。
   下面 whoosh / pluck / hitSnd / thud / tone 保留原来的名字和参数，各处调用不用改，内部按用途换成录音。 */
const SFX_FILES = ['swing1', 'swing2', 'swing3', 'hit1', 'hit2', 'hit3', 'kill1', 'kill2', 'kill3', 'kill4', 'build1', 'build2', 'build3', 'crumble1', 'crumble2',
  'fire1', 'fire2', 'fire3', 'ice1', 'ice2', 'zap1', 'zap2', 'arrow1', 'arrow2', 'gwood', 'gstone', 'ggem', 'coin', 'click', 'page', 'page2', 'open', 'upgrade',
  'lamp1', 'lamp2', 'roar1', 'roar2', 'growl', 'hurt', 'step1', 'step2', 'step3', 'door', 'spell', 'boom'];
const SFX = {}, sfxLast = {};
function loadSfx() {
  for (const f of SFX_FILES) {
    const g = f.replace(/\d+$/, '');
    fetch('sfx/' + f + '.mp3').then(r => r.arrayBuffer()).then(buf => AC.decodeAudioData(buf)).then(d => { (SFX[g] = SFX[g] || []).push(d); }).catch(() => {});
  }
}
function sfx(name, vol = 1, rate = 1, gap = .04) {
  if (!AC || muted) return;
  const list = SFX[name]; if (!list || !list.length) return;
  const t = AC.currentTime; if (t - (sfxLast[name] || -1) < gap) return; sfxLast[name] = t;
  const src = AC.createBufferSource(), g = AC.createGain();
  src.buffer = list[Math.random() * list.length | 0];
  src.playbackRate.value = rate * (0.94 + Math.random() * .12);
  g.gain.value = vol; src.connect(g); g.connect(master); src.start(t);
}
function whoosh(vol = .5, rate = 1) {
  if (rate >= 2) sfx('arrow', Math.min(1, vol * 5), 1.1);      // 射箭（英雄的箭、箭塔）
  else if (vol >= .5) sfx('swing', 1, .8);                      // 冲刺：更低更重的一刀
  else sfx('swing', Math.min(1, vol * 3.5), rate > 1.4 ? 1.2 : 1);
}
// 击杀：一声墨团"啪"地溅开；英雄连斩越多，音调一点点升高
function pluck(n, vol = .25) { sfx('kill', vol < .15 ? .35 : .8, 1 + Math.min(n, 14) * .025, .03); }
let lastHit = 0;
// 打中：刀砍进去的声音。pitch 高 = 砍在抗性甲上（发薄），低 = 打中弱点（更沉）
function hitSnd(vol = .3, pitch = 1) { sfx('hit', Math.min(1, vol * 2.6), pitch, .05); }
function thud(vol = .5, f0 = 150) {
  if (f0 >= 280) return sfx('click', .5, .7);                   // 资源不够
  if (f0 >= 240) return sfx('build', .9);                       // 放下建筑
  if (f0 >= 200) return sfx('fire', .5, 1.2);                   // 火球落地
  if (f0 >= 150) return sfx('door', .8);                        // 开局
  if (f0 >= 115) return sfx('hit', .9, .7);                     // 英雄挨打
  if (f0 >= 100) return;                                        // 击杀的闷响：溅墨声已经够了
  if (f0 >= 85) return sfx('crumble', .9);                      // 建筑被拆碎
  if (f0 >= 75) return sfx('boom', 1, .8);                      // 自爆
  if (f0 >= 65) return vol < .3 ? sfx('lamp', .6, 1, .25) : sfx('growl', .9, .9); // 灯挨打 / 入夜、亮相
  sfx('roar', Math.min(1, vol + .3), f0 < 55 ? .75 : 1);        // Boss
}
const lastTone = {};
function tone(f0, f1, dur, vol = .15, type = 'sine') {
  if (type === 'sawtooth') { if (f0 === 300) sfx('fire', .45, 1, .08); return; } // 火塔出手；入夜和失败另有声音
  if (type === 'square') return sfx('zap', .55, 1, .08);         // 雷塔
  if (type === 'sine') return sfx('ice', .5, 1.1, .08);          // 冰塔
  if (f0 >= 800) return sfx('spell', .8);                        // 学过的怪亮相
  if (f0 >= 600) return sfx('click', .45);                       // 选建筑、点按钮
  sfx('page', .8);                                               // 天亮翻开新的一天
}


/* ---------- 水墨绘制 ---------- */
function blobPath(c, x, y, r, seed, t, amp = .13) {
  c.beginPath();
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU;
    const rr = r * (1 + amp * Math.sin(a * 3 + seed + t * 3) + amp * .6 * Math.sin(a * 5 - seed * 2 - t * 4.3));
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}
function brush(c, x0, y0, x1, y1, w, color, alpha) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, n = 12;
  const prof = s => w * Math.pow(Math.sin(Math.PI * (.06 + s * .94)), .55) * (1 - .55 * s);
  c.fillStyle = color; c.globalAlpha = alpha; c.beginPath();
  for (let i = 0; i <= n; i++) { const s = i / n, ww = prof(s); c.lineTo(x0 + dx * s + nx * ww, y0 + dy * s + ny * ww); }
  for (let i = n; i >= 0; i--) { const s = i / n, ww = prof(s); c.lineTo(x0 + dx * s - nx * ww, y0 + dy * s - ny * ww); }
  c.closePath(); c.fill(); c.globalAlpha = 1;
}
function splat(x, y, size, dx, dy, color = INK) {
  pctx.fillStyle = color; pctx.globalAlpha = rand(.4, .65);
  blobPath(pctx, x, y, size * rand(.7, 1.1), rand(9), 0, .25); pctx.fill();
  const n = 3 + (size * .3 | 0), base = Math.atan2(dy, dx);
  for (let i = 0; i < n; i++) {
    const d = rand(size * .8, size * 4), a = base + rand(-.5, .5), s = rand(1, Math.max(1.5, size * .26));
    pctx.globalAlpha = rand(.25, .6);
    pctx.beginPath(); pctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, s * 1.6, s * .7, a, 0, TAU); pctx.fill();
  }
  pctx.globalAlpha = 1;
}
function fadePaper(a) {
  pctx.globalCompositeOperation = 'destination-out'; pctx.fillStyle = `rgba(0,0,0,${a})`;
  pctx.fillRect(0, 0, VW, VH); pctx.globalCompositeOperation = 'source-over';
}
function rrect(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
function text(s, x, y, size, color, align = 'center', alpha = 1, outline = null, style = '') {
  ctx.font = `${style} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.globalAlpha = alpha;
  if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * .2); ctx.strokeStyle = outline; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y); ctx.globalAlpha = 1;
}
function wrapText(s, x, y, size, maxW, color, align = 'center', alpha = 1, lh = 1.35) {
  ctx.font = ` ${size}px ${FONT}`;
  const words = s.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  lines.forEach((ln, i) => text(ln, x, y + i * size * lh, size, color, align, alpha));
  return lines.length * size * lh;
}
function seal(c, x, y, s, ch) {
  c.save(); c.translate(x, y); c.rotate(-.05);
  c.fillStyle = RED; c.globalAlpha = .92; rrect(c, -s / 2, -s / 2, s, s, s * .12); c.fill(); c.globalAlpha = 1;
  c.fillStyle = PAPER; c.font = /^[ -~]+$/.test(ch) ? `italic bold ${s * (ch.length > 1 ? .42 : .6)}px ${FONT}` : `${s * .62}px "KaiTi","STKaiti",serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(ch, 0, s * .03); c.restore();
}

/* ---------- 通用特效 ---------- */
const FX = { parts: [], texts: [], lines: [], rings: [], arcs: [], shake: 0, hitstop: 0, flash: 0, flashCol: RED };
function addText(s, x, y, size, color, dur = 1) { FX.texts.push({ s, x, y, size, color, t: 0, dur }); }
function addShake(v) { FX.shake = Math.min(22, FX.shake + v); }
function burst(x, y, dx, dy, n, color = INK, spread = .9) {
  const base = Math.atan2(dy, dx);
  for (let i = 0; i < n && FX.parts.length < 420; i++) {
    const a = base + rand(-spread, spread), s = rand(100, 460);
    FX.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.2, .5), r: rand(1.5, 4), color });
  }
}
function beam(x0, y0, x1, y1, col, w = 3, dur = .18) { FX.lines.push({ x0, y0, x1, y1, col, w, t: 0, dur }); }
function ring(x, y, r, col, dur = .3) { FX.rings.push({ x, y, r, col, t: 0, dur }); }
function updFx(rdt) {
  FX.shake *= Math.pow(.002, rdt); FX.flash = Math.max(0, FX.flash - rdt * 2.5);
  for (const k of ['texts', 'lines', 'rings', 'arcs']) { for (const o of FX[k]) o.t += rdt; FX[k] = FX[k].filter(o => o.t < o.dur); }
  for (const p of FX.parts) { p.x += p.vx * rdt; p.y += p.vy * rdt; const k = Math.pow(.03, rdt); p.vx *= k; p.vy *= k; p.life -= rdt; }
  FX.parts = FX.parts.filter(p => p.life > 0);
}
function drawFx() {
  const c = ctx;
  for (const a of FX.arcs) {
    const k = a.t / a.dur; c.strokeStyle = a.col || INK; c.globalAlpha = (1 - k) * .85; c.lineWidth = 16 * (1 - k) + 2; c.lineCap = 'round';
    c.beginPath(); c.arc(a.x, a.y, a.r * (.72 + .28 * k), a.a - a.arc / 2 + k * .5, a.a - a.arc / 2 + a.arc * Math.min(1, .35 + k * 1.6)); c.stroke();
  }
  for (const l of FX.lines) {
    const k = l.t / l.dur;
    if (l.brush) brush(c, l.x0, l.y0, l.x1, l.y1, l.w * (1 + .3 * k), l.col, (1 - k) * .9);
    else { c.strokeStyle = l.col; c.globalAlpha = 1 - k; c.lineWidth = l.w * (1 - k * .6); c.lineCap = 'round'; c.beginPath(); c.moveTo(l.x0, l.y0); c.lineTo(l.x1, l.y1); c.stroke(); }
  }
  for (const r of FX.rings) {
    const k = r.t / r.dur; c.strokeStyle = r.col; c.globalAlpha = (1 - k) * .8; c.lineWidth = 6 * (1 - k) + 1;
    c.beginPath(); c.arc(r.x, r.y, r.r * (.35 + .65 * k), 0, TAU); c.stroke();
  }
  c.globalAlpha = 1;
  for (const p of FX.parts) { c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
}
const NIGHT_COL = { [GREY]: '#d6cfbc', [RED]: '#f0694a', [QING]: '#7cc4d8', [GREEN]: '#9cc47e', [INK]: '#efe6d0', [GOLD]: '#e0bd62' };
function drawTexts(outline) {
  for (const t of FX.texts) {
    const k = t.t / t.dur, pop = 1 + .4 * Math.max(0, 1 - t.t * 8);
    const col = G.dark > .3 ? NIGHT_COL[t.color] || t.color : t.color; // 夜里把深色字提亮，否则看不清
    text(t.s, t.x, t.y - k * 24, t.size * pop, col, 'center', 1 - k * k, outline, 'italic');
  }
}
