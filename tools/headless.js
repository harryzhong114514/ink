#!/usr/bin/env node
'use strict';
/* 不用浏览器的整局试跑：用 vm 把游戏脚本装进一个假 DOM，让自动玩家打完整局，
   任何一局抛错就以退出码 1 结束并打印堆栈。
   用法：
     node tools/headless.js 5                  跑 5 局，默认策略
     node tools/headless.js 3 fire             只造火塔
     node tools/headless.js 3 none             不造塔
     node tools/headless.js 3 --relic kindling 开局先拿指定遗物
   策略就是 sim.js 里 bot(opts) 的 opts.build。
*/

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
// 加载顺序跟 index.html 一致；?test 那份 sim.js 本来是 document.write 进去的，这里直接加载
const SCRIPTS = [
  'data/balance.js', 'data/text.js',
  'js/core.js', 'js/world.js', 'js/entities.js', 'js/learn.js', 'js/meta.js',
  'js/ui.js', 'js/main.js', 'js/extras.js', 'js/extras2.js', 'js/music.js', 'js/pause.js', 'js/extras3.js', 'js/extras4.js', 'js/extras5.js', 'js/extras6.js', 'js/extras7.js', 'js/sim.js'
];

/* ---------- 假 canvas / 假 2D 上下文 ---------- */
function makeCtx(canvas) {
  const own = { canvas };
  const api = {
    measureText: s => ({ width: String(s).length * 8 }), // 只要求宽度的近似值，没有真排版
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} })
  };
  // 没列出来的方法一律当空函数，游戏里再多的绘制调用也不会炸
  return new Proxy(own, {
    get(t, k) { return (k in api) ? api[k] : (k in t) ? t[k] : () => {}; },
    set(t, k, v) { t[k] = v; return true; },
    has() { return true; }
  });
}
function makeCanvas(w, h) {
  const c = { width: w || 1600, height: h || 900, style: {}, addEventListener() {}, setPointerCapture() {} };
  const g = makeCtx(c);
  c.getContext = () => g;
  return c;
}

/* ---------- 假 DOM ---------- */
function makeSandbox() {
  const store = new Map();
  const localStorage = {
    getItem: k => store.has(String(k)) ? store.get(String(k)) : null,
    setItem: (k, v) => { store.set(String(k), String(v)); },
    removeItem: k => { store.delete(String(k)); },
    clear: () => store.clear(),
    get length() { return store.size; }
  };
  const mainCanvas = makeCanvas();
  const document = {
    getElementById: () => mainCanvas,
    createElement: () => makeCanvas(),
    addEventListener() {},
    write() {},
    hidden: false,
    hasFocus: () => true
  };
  const sandbox = {
    console, Math, Date, JSON, parseInt, parseFloat, isNaN, Number, String, Boolean, Object, Array, Map, Set,
    setTimeout, clearTimeout, setInterval, clearInterval,
    performance: { now: () => Date.now() },
    document, localStorage,
    location: { search: '?test' },
    requestAnimationFrame() {},
    innerWidth: 1600, innerHeight: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}
    // 故意不给 AudioContext：AC 保持 null，所有声音代码自己跳过
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

/* ---------- 装载 ---------- */
function boot() {
  const sandbox = makeSandbox();
  const ctx = vm.createContext(sandbox, { name: 'ink-tide' });
  for (const rel of SCRIPTS) {
    const file = path.join(ROOT, rel);
    const code = fs.readFileSync(file, 'utf8');
    vm.runInContext(code, ctx, { filename: file }); // 同一个上下文逐个执行，顶层 const/let 才能互通
  }
  const run = (code) => vm.runInContext(code, ctx, { filename: 'headless-eval' });
  return { ctx, sandbox, run };
}

/* ---------- 命令行参数 ---------- */
function parseArgs(argv) {
  const out = { runs: 5, strategy: 'default', relic: null, mode: 'normal', hero: null };
  const seen = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--relic') { out.relic = argv[++i]; if (!out.relic) throw new Error('--relic needs a key'); }
    else if (a.startsWith('--relic=')) out.relic = a.slice(8);
    else if (a === 'easy' || a === 'normal' || a === 'hard') out.mode = a;
    else if (a === 'sword' || a === 'bow' || a === 'brush' || a === 'seal') out.hero = a;
    else if (/^\d+$/.test(a)) { out.runs = Math.max(1, parseInt(a, 10)); }
    else if (a === 'fire' || a === 'none' || a === 'default' || a === 'mixed') out.strategy = a === 'mixed' ? 'default' : a;
    else seen.push(a);
  }
  if (seen.length) throw new Error('unknown argument(s): ' + seen.join(' ') + '\nusage: node tools/headless.js [runs] [fire|none] [easy|normal|hard] [--relic key]');
  return out;
}

/* ---------- 一局 ---------- */
const STRATEGY_SRC = {
  default: 'ff(SECS)',
  fire: "ff(SECS, { build: () => ['fire'] })",
  none: 'ff(SECS, { build: () => [] })'
};
const SECS = 60 * 25; // 跟 tune() 里一样，25 分钟游戏时间足够打完一局

function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (e) { console.error(e.message); process.exit(2); }

  const { run } = boot();
  if (args.relic) {
    const ok = run('Object.prototype.hasOwnProperty.call(RELIC_FX, ' + JSON.stringify(args.relic) + ')');
    if (!ok) {
      console.error('no such relic: ' + args.relic + '\navailable: ' + run('Object.keys(RELIC_FX).join(", ")'));
      process.exit(2);
    }
  }

  const ffSrc = STRATEGY_SRC[args.strategy].replace('SECS', String(SECS));
  const started = Date.now();
  let wins = 0, losses = 0, totBounty = 0, totLeech = 0, totHerald = 0;

  console.log('headless: ' + args.runs + ' run(s), strategy ' + args.strategy + (args.relic ? ', relic ' + args.relic : ''));

  for (let i = 1; i <= args.runs; i++) {
    const t0 = Date.now();
    try {
      // 每局清空存档再读回来，各局互不影响
      run('localStorage.clear(); G.meta = loadMeta(); G.meta.mode = ' + JSON.stringify(args.mode) + ';' + (args.hero ? ' G.meta.hero = ' + JSON.stringify(args.hero) + '; G.meta.unlocks.archer = 1; G.meta.best = Math.max(G.meta.best || 0, 5); G.meta.wins = Math.max(G.meta.wins || 0, 1);' : '') + ' G.state = "title";');
      run('newRun();');
      if (args.relic) run('takeRelic(' + JSON.stringify(args.relic) + ');');
      const logs = JSON.parse(run('JSON.stringify(' + ffSrc + ')'));
      const state = run('G.state');
      const night = run('G.night');
      const lamp = Math.round(run('LAMP.hp'));
      const bounties = run('G.bountyCount || 0');
      const leech = run('G.leechSpawned || 0');
      const herald = run('G.heraldSpawned || 0');
      totBounty += bounties; totLeech += leech; totHerald += herald;
      const res = state === 'win' ? 'WIN' : state === 'over' ? 'lost@N' + night : 'unfinished@N' + night;
      if (state === 'win') wins++; else losses++;
      const ms = Date.now() - t0;
      console.log('run ' + i + '  ' + res.padEnd(12) + ' lamp ' + String(lamp).padStart(4) + '  ' + (ms / 1000).toFixed(1) + 's'
        + '  bounty ' + bounties + '  leech ' + leech + '  herald ' + herald
        + '  | ' + (logs.length ? logs.join(' | ') : '(no report)'));
    } catch (e) {
      let snap = 'unavailable';
      try { snap = 'G.state=' + run('G.state') + ' G.night=' + run('G.night'); } catch (e2) { snap = 'G.state/G.night unreadable: ' + e2.message; }
      console.error('\nrun ' + i + ' threw. ' + snap);
      console.error((e && e.stack) || e);
      process.exit(1);
    }
  }

  const total = ((Date.now() - started) / 1000).toFixed(1);
  console.log('done: ' + wins + ' win, ' + losses + ' loss, ' + args.runs + ' run(s) in ' + total + 's');
  console.log('totals: bounty ' + totBounty + ', leech ' + totLeech + ', herald ' + totHerald);
}

main();
