'use strict';
/* 背景音乐：五声音阶拨弦 + 夜间低音长音 + Boss 低鼓，全部 Web Audio 现场合成。
   只读全局状态，不改任何已有函数：文件末尾给 update 包一层。
   所有音符按 AC.currentTime 排期，不用 dt 累加（快进函数一帧会调上万次 update）。 */

const MUSIC_VOL = 0.24;   // 音乐总线音量（相对 master），觉得大声就调小这里
const MUSIC_NOTE = 220;   // 主音 A3，五声音阶在此基础上上下取音

let musBus = null, musGoal = -1, musMode = null, musDuck = 1;
let musAway = false;      // 窗口失焦或标签页被藏起来时为 true：音乐静音，回来再恢复
let musNextPluck = 0, musNextDrum = 0;
let musDrone = null;      // { g, o1, o2, kind }

/* ---------- 总线 ---------- */
function musEnsure() {
  if (!AC || !master) return false;
  if (!musBus) {
    musBus = AC.createGain();
    musBus.gain.value = 0;
    musBus.connect(master);
    musGoal = -1;
  }
  return true;
}

function musKind() {
  const s = G.state;
  if (s === 'title' || s === 'day' || s === 'prelude') return 'calm';
  if (s === 'night') return 'night';
  if (s === 'over') return 'over';
  return 'soft'; // report / relic / win / 其他
}

function musUpdateBus(kind) {
  if (!musBus) return;
  const now = AC.currentTime;
  const lvl = (muted || musAway || kind === 'over') ? 0 : MUSIC_VOL * musDuck;
  if (kind === 'over' && musMode !== 'over') { // 失败后 1 秒内全部淡出
    musGoal = 0;
    musBus.gain.cancelScheduledValues(now);
    musBus.gain.setValueAtTime(musBus.gain.value, now);
    musBus.gain.linearRampToValueAtTime(0, now + .9);
    return;
  }
  if (Math.abs(lvl - musGoal) < 1e-4) return;
  musGoal = lvl;
  musBus.gain.cancelScheduledValues(now);
  musBus.gain.setValueAtTime(musBus.gain.value, now);
  musBus.gain.setTargetAtTime(lvl, now, muted || lvl === 0 ? .08 : .3); // 渐变，不出硬切
}

/* ---------- 低音长音 ---------- */
function musDroneOn(kind) {
  if (!musBus) return;
  const t = AC.currentTime, lvl = kind === 'night' ? .05 : .03;
  if (!musDrone) {
    const g = AC.createGain(), o1 = AC.createOscillator(), o2 = AC.createOscillator(), g2 = AC.createGain();
    o1.type = 'sine'; o1.frequency.value = 58;        // 约 58 Hz
    o2.type = 'sine'; o2.frequency.value = 116;       // 高八度一点点音量：笔记本喇叭听不见 58 的纯正弦
    g2.gain.value = .18;
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(musBus);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(lvl, t + 2.2);
    o1.start(t); o2.start(t);
    musDrone = { g, o1, o2, kind };
  } else if (musDrone.kind !== kind) {
    musDrone.kind = kind;
    musDrone.g.gain.setTargetAtTime(lvl, t, .8);
  }
}
function musDroneOff(fade) {
  if (!musDrone) return;
  const d = musDrone; musDrone = null;
  const t = AC.currentTime;
  d.g.gain.cancelScheduledValues(t);
  d.g.gain.setValueAtTime(Math.max(.0001, d.g.gain.value), t);
  d.g.gain.exponentialRampToValueAtTime(.0001, t + fade);
  d.o1.stop(t + fade + .05); d.o2.stop(t + fade + .05); // 一定 stop，不泄漏
}

/* ---------- 拨弦 ---------- */
function musNote(t, n, vol) {
  if (!AC || !musBus || muted) return;
  const i5 = ((n % 5) + 5) % 5, oct = Math.floor(n / 5);
  const fr = MUSIC_NOTE * Math.pow(2, (PENTA[i5] + 12 * oct) / 12);
  const dur = 1.5;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(fr * 1.02, t);
  o.frequency.exponentialRampToValueAtTime(fr, t + .07);   // 像古筝的轻微下滑
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + .008);      // 快起
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);     // 慢落
  o.connect(g); g.connect(musBus);
  o.start(t); o.stop(t + dur + .05);
}
function musPluckGap(kind) {
  if (kind === 'calm') return rand(1.5, 3);
  const k = clamp(G.mons.length / 100, 0, 1);               // 怪越多越紧
  const d = LAMP.hp / LAMP.maxHp < .35 ? .6 : 1; // 危险时拨弦也更密
  return Math.max(.22, (2.1 - 1.8 * k) * d * rand(.8, 1.25));
}
function musSchedule(kind, now) {
  if (kind !== 'calm' && kind !== 'night') return;
  if (musNextPluck <= 0 || musNextPluck < now - 1) musNextPluck = now; // 首次 / 快进回来不补一串
  if (now < musNextPluck) return;
  const at = musNextPluck + .01;
  const k = kind === 'night' ? clamp(G.mons.length / 100, 0, 1) : 0;
  const run = Math.random() < (kind === 'night' ? .2 + .45 * k : .12) ? (Math.random() < .35 ? 3 : 2) : 1;
  let n = kind === 'night' ? -2 + (Math.random() * 5 | 0) : 2 + (Math.random() * 6 | 0); // 夜里音区更低
  for (let i = 0; i < run; i++) {
    if (i) n += Math.random() < .7 ? 1 : -1;
    musNote(at + i * rand(.08, .16), n, i ? .055 : .085);
  }
  musNextPluck = at + musPluckGap(kind);
}

/* ---------- Boss 低鼓 ---------- */
function musDrum(t) {
  if (!AC || !musBus || muted) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(74, t);
  o.frequency.exponentialRampToValueAtTime(42, t + .38);
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(.14, t + .012);
  g.gain.exponentialRampToValueAtTime(.0001, t + .55);
  o.connect(g); g.connect(musBus);
  o.start(t); o.stop(t + .6);
}
function musScheduleDrum(kind, now) {
  const danger = LAMP.hp / LAMP.maxHp < .35, surge = G.surgeAt > 0 && G.phaseT > G.surgeAt - 1.5 && G.phaseT < G.surgeAt + 10;
  if (kind !== 'night' || (!(G.boss && !G.boss.dead) && !danger && !surge)) { musNextDrum = 0; return; }
  if (musNextDrum < now - 1) musNextDrum = now + .3;
  if (now < musNextDrum) return;
  musDrum(musNextDrum + .01);
  musNextDrum += (danger ? .45 + .5 * LAMP.hp / LAMP.maxHp : surge ? .6 : .8) * rand(.92, 1.08); // 灯越危险鼓越密
}

/* ---------- 每帧 ---------- */
function musSync() {
  if (!AC) return;                                         // 玩家还没点过，直接跳过
  if (!musEnsure()) return;
  const kind = musKind();
  musUpdateBus(kind);
  if (kind === 'night' || kind === 'soft') musDroneOn(kind);
  else musDroneOff(kind === 'over' ? .9 : .8);
  musMode = kind;
}
// 切到别的窗口或标签页时不再出声（长音是持续的，不处理的话会一直在后台响）
function musSetAway(v) { if (musAway === v) return; musAway = v; if (AC && musBus) musUpdateBus(musKind()); }
window.addEventListener('blur', () => musSetAway(true));
window.addEventListener('focus', () => musSetAway(false));
document.addEventListener('visibilitychange', () => musSetAway(document.hidden || !document.hasFocus()));

function musTick() {
  if (!AC) return;
  if (musAway && !document.hidden && document.hasFocus()) musAway = false; // 保险：focus 事件漏了也能恢复
  musSync();
  musSchedule(musKind(), AC.currentTime);
  musScheduleDrum(musKind(), AC.currentTime);
}

/* 暂停界面用：0.5 = 降到一半 */
window.InkMusic = {
  duck(v) {
    musDuck = clamp(typeof v === 'number' ? v : 1, 0, 1);
    if (AC && musBus) musUpdateBus(musKind());
  },
  sync() { musSync(); }                                    // 暂停时也要跟着静音开关走
};

const _musUpdate = update;
update = function (dt, rdt) {
  _musUpdate(dt, rdt);
  musTick();
};
