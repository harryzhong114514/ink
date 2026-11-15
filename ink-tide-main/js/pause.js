'use strict';
/* 暂停界面：P 键暂停/继续，暂停时世界完全冻结并显示操作说明。
   不改原函数，只包一层 update / draw；音乐音量通过 music.js 暴露的 InkMusic.duck。 */

const PAUSE_STATES = ['prelude', 'day', 'night'];
const PAUSE_LINES = TOUCH ? [
  ['Drag left', 'move'],
  ['Automatic', 'attack the nearest enemy'],
  ['Skill button', "your hero's skill"],
  ['Tap a building', 'choose it, tap the ground to place'],
  ['Tap a tower', 'upgrade, repair or remove (day)'],
  ['Start Night', 'begin the night early'],
  ['Tap', 'resume']
] : [
  ['WASD', 'move'],
  ['Hold mouse', 'attack'],
  ['SPACE', 'skill'],
  ['1-7', 'choose a building, click to place'],
  ['Click a tower', 'upgrade, repair or remove (day)'],
  ['ENTER', 'start the night early'],
  ['M', 'mute'],
  ['Esc, P or click', 'resume']
];
const PAUSE_TEST = location.search.includes('test'); // 测试模式不自动暂停，否则在控制台里跑 tune()/ff() 时页面失焦会把模拟冻住

let paused = false;

function canPause() { return PAUSE_STATES.includes(G.state); }
function setDuck(v) {
  const m = window.InkMusic;                                // 音乐没加载也不能报错
  if (m && typeof m.duck === 'function') m.duck(v);
}
function setPaused(v) {
  if (v === paused) return;
  if (v && !canPause()) return;
  paused = v;
  mouse.down = false; mouse.pressed = false; mouse.rpressed = false;
  for (const k in keys) keys[k] = false;
  setDuck(v ? .5 : 1);                                      // 暂停时音乐降到一半
}
function pauseToggle() {
  if (paused) { setPaused(false); return; }
  if (canPause()) setPaused(true);
}

window.addEventListener('keydown', e => {
  if ((e.code !== 'KeyP' && e.code !== 'Escape') || e.repeat) return;
  if (e.code === 'Escape' && !paused && G.buildSel) return; // 手里拿着建筑时 Esc 先取消建造，再按一次才暂停
  pauseToggle();
});
// 捕获阶段先拦下暂停时的鼠标，click 根本到不了游戏（建筑/攻击/右键拆）
window.addEventListener('pointerdown', e => {
  if (!paused) return;
  e.preventDefault(); e.stopPropagation();
  mouse.down = false; mouse.pressed = false; mouse.rpressed = false;
  if (e.button !== 0 && e.pointerType !== 'touch') return;
  // 菜单：点到按钮就执行；点到面板外面就继续游戏；点在面板里的空白处什么都不做
  setMouse(e);
  const hit = PAUSE_BTNS.find(b => mouse.x >= b.x && mouse.x <= b.x + b.w && mouse.y >= b.y && mouse.y <= b.y + b.h);
  if (hit) { hit.cb(); tone(700, 900, .06, .05); return; }
  const P = PAUSE_PANEL; if (!P || mouse.x < P.x || mouse.x > P.x + P.w || mouse.y < P.y || mouse.y > P.y + P.h) setPaused(false);
}, true);
window.addEventListener('blur', () => { if (!PAUSE_TEST && !paused && canPause()) setPaused(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !PAUSE_TEST && !paused && canPause()) setPaused(true); }); // phones: switching apps pauses

let PAUSE_BTNS = [], PAUSE_PANEL = null;
function drawPause() {
  useWorld();
  ctx.fillStyle = NIGHT; ctx.globalAlpha = .62; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1;
  const w = 820, h = 470, x = VW / 2 - w / 2, y = VH / 2 - h / 2;
  PAUSE_PANEL = { x, y, w, h };
  panel(x, y, w, h, .97);
  text('PAUSED', x + 54, y + 58, 44, INK, 'left', 1, null, 'italic');
  seal(ctx, x + 248, y + 58, 32, 'II');
  text('The ink holds still.', x + 56, y + 94, 17, GREY, 'left', .9, null, 'italic');
  brush(ctx, x + 54, y + 121, x + w - 54, y + 118, 2.2, INK, .28);
  // 左边一列按钮
  const items = [
    ['Resume', () => setPaused(false), true],
    ['Restart run', () => { setPaused(false); newRun(); }, false],
    [() => 'Sound:  ' + (muted ? 'Off' : 'On'), () => { muted = !muted; }, false],
    [() => 'Tutorial:  ' + (G.meta.noTut ? 'Off' : 'On'), () => { G.meta.noTut = !G.meta.noTut; if (!G.meta.noTut) G.meta.tourDone = 0; saveMeta(); }, false],
    ['Quit to title', () => { setPaused(false); toTitle(); }, false]
  ];
  PAUSE_BTNS = [];
  const bx = x + 54, bw = 290, bh = 48, gap = 12, by0 = y + 148;
  items.forEach(([label, cb, main], i) => {
    const by = by0 + i * (bh + gap), s = typeof label === 'function' ? label() : label;
    const hov = mouse.x >= bx && mouse.x <= bx + bw && mouse.y >= by && mouse.y <= by + bh;
    PAUSE_BTNS.push({ x: bx, y: by, w: bw, h: bh, cb });
    ctx.fillStyle = main ? (hov ? '#a8321f' : RED) : (hov ? '#fbf6ea' : 'rgba(22,19,15,.06)'); rrect(ctx, bx, by, bw, bh, 12); ctx.fill();
    ctx.strokeStyle = main ? RED : INK; ctx.lineWidth = 1.5; ctx.globalAlpha = main ? 1 : hov ? .8 : .35; rrect(ctx, bx, by, bw, bh, 12); ctx.stroke(); ctx.globalAlpha = 1;
    text(s, bx + 22, by + bh / 2 + 1, 21, main ? '#fbf6ea' : INK, 'left', 1, null, 'italic');
  });
  // 右边：操作说明
  const kx = x + 400, dx = x + 540, y0 = by0 + 14, lh = 34;
  text('Controls', kx, y0 - 2, 16, GREY, 'left', .9, null, 'italic');
  PAUSE_LINES.filter(([k]) => !/resume/i.test(k) && k !== 'Tap' && !/^Esc/.test(k)).forEach(([key, desc], i) => {
    const yy = y0 + 34 + i * lh;
    text(key, kx, yy, 18, RED, 'left', 1, null, 'italic');
    text(desc, dx, yy, 17, INK, 'left', .92);
  });
  text(TOUCH ? 'Tap outside to resume' : 'Esc or click outside to resume', x + w / 2, y + h - 26, 15, GREY, 'center', .85, null, 'italic');
}

const _pauseUpdate = update;
update = function (dt, rdt) {
  if (paused) {                                             // 完全冻结：怪、倒计时、特效都停
    const m = window.InkMusic;                              // 暂停中仍跟随静音开关 / 状态渐变
    if (m && typeof m.sync === 'function') m.sync();
    return;
  }
  _pauseUpdate(dt, rdt);
};

const _pauseDraw = draw;
draw = function () {
  _pauseDraw();
  if (!paused) return;
  if (!canPause()) { setPaused(false); return; }             // 状态被别处切走就自动放开
  UI.modal = true;                                          // 点击不穿透到游戏
  drawPause();
};
