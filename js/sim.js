'use strict';
/* 自动试玩：网址加 ?test 才会加载。控制台里跑 ff(秒数) 快进，sim(局数) 批量测胜率 */
muted = true; // 测试模式默认静音（音效和音乐都关），想听的话按 M
window.bot = function (opts = {}) {
  const h = G.hero; keys.KeyW = keys.KeyA = keys.KeyS = keys.KeyD = false; mouse.down = false;
  const go = (x, y) => { if (typeof heroPathStep === 'function') { const p = heroPathStep(h.x, h.y, x, y); x = p.x; y = p.y; } if (y < h.y - 6) keys.KeyW = true; if (y > h.y + 6) keys.KeyS = true; if (x < h.x - 6) keys.KeyA = true; if (x > h.x + 6) keys.KeyD = true; };
  if (G.state === 'report') { G.modalT = 2; reportClick(); return; }
  if (G.state === 'relic') { takeRelic(G.cards[0]); G.cards = null; startDay(); return; }
  if (G.state === 'day') {
    const want = opts.build ? opts.build(G.night) : G.night === 0 ? ['fire'] : G.night === 1 ? ['ice', 'ice'] : ['ice', 'fire', 'arrow', 'thunder'];
    const spots = [];
    for (let r = 2; r <= 5; r++) for (const [dc, dr] of [[0, -r], [0, r], [-r, 0], [r, 0], [-r, -r], [r, r], [-r, r], [r, -r]]) spots.push(LAMP_I + dr * COLS + dc);
    for (const k of want) if (available(k) && afford(k)) { const i = spots.find(j => j >= 0 && j < COLS * ROWS && canPlace(k, j)); if (i !== undefined) place(k, i); }
    if (G.loot && G.loot.length) { const l = G.loot.slice().sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0]; go(l.x, l.y); return; } // 先捡地上的掉落
    if (G.caller) { go(G.caller.x, G.caller.y); return; }
    const n = G.nodes.slice().sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0];
    if (n && G.phaseT > 6) { go(n.x, n.y); return; }
    startNight(); return;
  }
  let t = null, bd = 1e9;
  const R = opts.guard || 260; // 像真人一样守在灯附近
  for (const m of G.mons) { const d = Math.hypot(m.x - LAMP.x, m.y - LAMP.y); if (d < bd && d < R) { bd = d; t = m; } }
  if (t) { mouse.x = t.x; mouse.y = t.y; if (Math.hypot(t.x - h.x, t.y - h.y) > 70) go(t.x, t.y); mouse.down = true; if (h.skillCd <= 0 && Math.hypot(t.x - h.x, t.y - h.y) < 300) pressed.Space = true; }
  else go(LAMP.x, LAMP.y + 60);
};
window.ff = function (sec, opts) {
  const out = []; let last = G.state + G.night;
  for (let i = 0; i < sec * 60; i++) {
    bot(opts); update(1 / 60, 1 / 60);
    const s = G.state + G.night;
    if (s !== last) {
      if (G.state === 'report') { const S = G.stats; out.push('N' + G.night + ' lampDmg' + Math.round(S.lampDmg) + ' downs' + S.heroDowns + ' bld' + Math.round(S.buildDmg) + ' kills' + S.kills + '/' + S.spawned + ' hero%' + Math.round(100 * S.src.hero / (S.src.hero + S.src.tower || 1)) + ' tower:' + JSON.stringify(S.tdmg, (k, v) => typeof v === 'number' ? Math.round(v) : v) + ' -> ' + Object.keys(G.evo).join(',')); }
      last = s;
    }
    if (G.state === 'over' || G.state === 'win') break;
  }
  return out;
};
// tune(()=>{ 改 BAL 里的数 }, 局数)：试一组数值，返回每局结果和每夜灯/建筑掉血
window.tune = function (cfg, runs = 4, opts) {
  const keep = JSON.stringify(G.meta), all = [];
  for (let k = 0; k < runs; k++) {
    if (cfg) cfg(); newRun(); const r = ff(60 * 25, opts);
    all.push((G.state === 'win' ? 'WIN' : 'lost@N' + G.night) + ' lamp' + Math.round(LAMP.hp) + ' | ' + r.map(s => { const m = s.match(/lampDmg(\d+) downs(\d+) bld(\d+)/); return m ? m[1] + '/' + m[3] : ''; }).join(' '));
  }
  G.meta = JSON.parse(keep); saveMeta(); G.state = 'title';
  return all;
};
window.sim = function (runs = 10, opts) {
  const res = [];
  for (let r = 0; r < runs; r++) { newRun(); ff(60 * 30, opts); res.push(G.state === 'win' ? 'W' : G.night); }
  return res;
};
