/* extras7：Boss 加强。三个 Boss 共用：
   - 血更厚（×1.5）、走得更快（26 → 40）、蹭到建筑每秒伤害翻倍
   - 震地：英雄靠近时，地上先出一个红圈 0.8 秒，然后砸下：英雄掉血被击退，圈里的建筑掉血
   - 冲锋：先瞄准 0.7 秒（画一条红线），然后朝最近的塔或灯冲过去，一路撞建筑
   - 半血进入第二阶段：变红、更快、出招更频繁
   数值都在 BOSS_PLUS 里，C 想调就改这里 */
const BOSS_PLUS = { hpMul: 1.25, sp: 36, buildDps: 45, slamR: 140, slamDmg: 20, slamBuild: 45, slamCd: 4.5, slamCdRage: 3, slamWarn: .8,
  chargeCd: 10, chargeCdRage: 7, chargeWarn: .8, chargeSp: 480, chargeLen: 240, chargeBuild: 40, rageAt: .5, rageSp: 1.45 };
if (BAL.mon.boss && !BAL.mon.boss._plus) { BAL.mon.boss.hp = Math.round(BAL.mon.boss.hp * BOSS_PLUS.hpMul); BAL.mon.boss.sp = Math.max(BAL.mon.boss.sp, BOSS_PLUS.sp); BAL.mon.boss._plus = 1; }

function bossTarget(m) { // 冲锋目标：最近的塔（不算墙和地面建筑），没有就冲灯
  let best = null, bd = 1e9;
  for (const b of G.builds) { if (b.dead || b.type === 'wall' || b.type === 'rock' || isGround(b.type)) continue; const d = Math.hypot(b.x - m.x, b.y - m.y); if (d < bd) { bd = d; best = b; } }
  return best && bd < 700 ? best : LAMP;
}
const _updBoss7 = updBoss;
updBoss = function (m, dt) {
  const P = BOSS_PLUS, h = G.hero;
  if (!m.p7) { m.p7 = 1; m.slamT = 3; m.chargeT = 6; }
  // 第二阶段
  if (!m.rage && m.hp / m.maxHp < P.rageAt) {
    m.rage = true; m.sp *= P.rageSp; m.spawnT = 0; m.waveT = Math.min(m.waveT, .5);
    addText('It rises in fury', VW / 2, 300, 46, RED, 2.2); addShake(16); sfx('roar', 1, .8); FX.flash = .5; FX.flashCol = RED;
  }
  if (m.rage) { m.waveT -= dt * .5; m.spawnT -= dt * .3; }
  // 震地
  m.slamT -= dt;
  if (m.slam) {
    m.slam.t += dt;
    if (m.slam.t >= P.slamWarn) {
      const s = m.slam; m.slam = null; m.slamT = m.rage ? P.slamCdRage : P.slamCd;
      ring(s.x, s.y, P.slamR, RED, .9); addShake(12); thud(.9, 50); splat(s.x, s.y, 50, 0, 0);
      if (h && !h.down) { const d = Math.hypot(h.x - s.x, h.y - s.y); if (d < P.slamR + 10) { hurtHero(P.slamDmg, s.x, s.y); const k = (P.slamR + 40 - d) / (d || 1); h.x = clamp(h.x + (h.x - s.x) * k, 16, VW - 16); h.y = clamp(h.y + (h.y - s.y) * k, 16, VH - 16); } }
      for (const b of G.builds.slice()) if (!b.dead && b.type !== 'rock' && Math.hypot(b.x - s.x, b.y - s.y) < P.slamR) hurtBuild(b, P.slamBuild);
    }
  } else if (!m.charge && !m.hidden && m.slamT <= 0 && h && !h.down && Math.hypot(h.x - m.x, h.y - m.y) < m.r + 190) {
    m.slam = { t: 0, x: m.x, y: m.y }; sfx('roar', .5, 1.4);
  }
  // 冲锋
  m.chargeT -= dt;
  if (m.charge) {
    const c = m.charge; c.t += dt;
    if (c.t >= P.chargeWarn) {
      const step = P.chargeSp * dt; m.x += Math.cos(c.a) * step; m.y += Math.sin(c.a) * step; c.gone += step;
      m.x = clamp(m.x, 40, VW - 40); m.y = clamp(m.y, 40, VH - 40);
      if (Math.random() < .5) splat(m.x + rand(-30, 30), m.y + rand(-30, 30), 12, 0, 0);
      for (const b of G.builds.slice()) if (!b.dead && b.type !== 'rock' && !c.hit.has(b) && Math.hypot(b.x - m.x, b.y - m.y) < m.r + 24) { c.hit.add(b); hurtBuild(b, P.chargeBuild); addShake(6); }
      if (h && !h.down && !c.hero && Math.hypot(h.x - m.x, h.y - m.y) < m.r + 14) { c.hero = 1; hurtHero(P.slamDmg * .8, m.x, m.y); }
      if (Math.hypot(LAMP.x - m.x, LAMP.y - m.y) < m.r + LAMP.rad + 4 || c.gone >= P.chargeLen) { m.charge = null; m.chargeT = m.rage ? P.chargeCdRage : P.chargeCd; thud(.7, 70); }
    }
  } else if (!m.slam && !m.hidden && m.chargeT <= 0) {
    const t = bossTarget(m); m.charge = { t: 0, a: Math.atan2(t.y - m.y, t.x - m.x), gone: 0, hit: new Set(), hero: 0 }; sfx('roar', .6, .9);
  }
  _updBoss7(m, dt);
};
// 蹭建筑伤害：原来 30/秒，再补一份
const _updMon7 = updMon;
updMon = function (m, dt) {
  const r = _updMon7.apply(this, arguments);
  if (m.type === 'boss' && !m.dead) for (const b of G.builds.slice()) if (!b.dead && b.type !== 'rock' && Math.hypot(b.x - m.x, b.y - m.y) < m.r + 26) hurtBuild(b, (BOSS_PLUS.buildDps - 30) * dt);
  return r;
};
// 预警画面：震地红圈慢慢填满；冲锋一条红色箭头线；第二阶段身上一圈红光
const _drawMon7 = drawMon;
drawMon = function (m) {
  if (m.type === 'boss' && !m.dead) {
    const c = ctx;
    if (m.rage) { c.save(); c.globalAlpha = .25 + .15 * Math.sin(G.time * 8); c.fillStyle = RED; c.beginPath(); c.arc(m.x, m.y, m.r + 16, 0, TAU); c.fill(); c.restore(); }
    if (m.slam) {
      const k = Math.min(1, m.slam.t / BOSS_PLUS.slamWarn);
      c.save(); c.fillStyle = RED; c.globalAlpha = .12 + .2 * k; c.beginPath(); c.arc(m.slam.x, m.slam.y, BOSS_PLUS.slamR * k, 0, TAU); c.fill();
      c.strokeStyle = RED; c.globalAlpha = .8; c.lineWidth = 3; c.setLineDash([10, 8]); c.beginPath(); c.arc(m.slam.x, m.slam.y, BOSS_PLUS.slamR, 0, TAU); c.stroke(); c.restore();
    }
    if (m.charge && m.charge.t < BOSS_PLUS.chargeWarn) {
      const a = m.charge.a, L = BOSS_PLUS.chargeLen + m.r, k = m.charge.t / BOSS_PLUS.chargeWarn;
      c.save(); c.strokeStyle = RED; c.globalAlpha = .35 + .5 * k; c.lineWidth = m.r * 1.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + Math.cos(a) * L * k, m.y + Math.sin(a) * L * k); c.globalAlpha = .18 + .2 * k; c.stroke();
      c.globalAlpha = .9; c.lineWidth = 3; c.setLineDash([12, 8]); c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + Math.cos(a) * L, m.y + Math.sin(a) * L); c.stroke(); c.restore();
    }
  }
  return _drawMon7.apply(this, arguments);
};

/* ---------- 掉落物：精英和 Boss 的材料撒在地上，走过去才算捡到 ---------- */
const LOOT_LIFE = 40, LOOT_MAGNET = 80, LOOT_TAKE = 26;
function dropLoot(x, y, drop) {
  G.loot = G.loot || [];
  for (const k in drop) {
    let left = drop[k];
    while (left > 0) {
      const amt = Math.min(5, left); left -= amt;
      const a = rand(TAU), sp = rand(80, 220);
      G.loot.push({ type: k, amt, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: LOOT_LIFE, seed: rand(10) });
    }
  }
  sfx('coin', .5, 1.3);
}
function updLoot(dt) {
  if (!G.loot || !G.loot.length) return;
  const h = G.hero;
  for (const l of G.loot) {
    l.t -= dt; l.x += l.vx * dt; l.y += l.vy * dt; l.vx *= Math.exp(-5 * dt); l.vy *= Math.exp(-5 * dt);
    l.x = clamp(l.x, 20, VW - 20); l.y = clamp(l.y, 20, VH - 20);
    if (!h || h.down) continue;
    const d = Math.hypot(h.x - l.x, h.y - l.y);
    if (d < LOOT_MAGNET && l.t < LOOT_LIFE - .4) { const k = Math.min(1, dt * 7); l.x += (h.x - l.x) * k; l.y += (h.y - l.y) * k; } // 走近了自己飞过来
    if (d < LOOT_TAKE && l.t < LOOT_LIFE - .4) { G.res[l.type] += l.amt; l.t = 0; addText('+' + l.amt, h.x, h.y - 34, 18, RES_COL[l.type], .8); tone(900, 1300, .05, .04); }
  }
  G.loot = G.loot.filter(l => l.t > 0);
}
function drawLoot() {
  if (!G.loot || !G.loot.length) return;
  for (const l of G.loot) {
    if (l.t < 6 && Math.sin(G.time * 18) > 0) continue; // 快消失了：闪
    const bob = Math.sin(G.time * 4 + l.seed) * 3;
    ctx.save();
    ctx.fillStyle = 'rgba(22,19,15,.18)'; ctx.beginPath(); ctx.ellipse(l.x, l.y + 9, 9, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = GOLD; ctx.globalAlpha = .25 + .15 * Math.sin(G.time * 5 + l.seed); ctx.beginPath(); ctx.arc(l.x, l.y - 3 + bob, 15, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    resIcon(l.type, l.x, l.y - 3 + bob, 8);
    ctx.restore();
  }
}
const _updExtras7 = updExtras;
updExtras = function (dt) { _updExtras7(dt); updLoot(dt); };
const _drawFx7 = drawFx;
drawFx = function () { if (G.state === 'day' || G.state === 'night') drawLoot(); return _drawFx7.apply(this, arguments); };
const _newRun7 = newRun;
newRun = function () { G.loot = []; return _newRun7.apply(this, arguments); };

/* ---------- 每个 Boss 的专属招式 ----------
   洪潮（tide）   第二阶段：震地之后再推出三圈冲击波，一圈一圈往外扩，被扫到就掉血
   千手（hands）  远程抓人：伸出一只墨手（0.9 秒预警），抓到英雄就拖到身前
   空山（hollow） 现身前 1 秒，地上先亮出它要落下的位置（就在英雄附近），落地砸一下 */
const BOSS_SIG = { waveN: 3, waveGap: .35, waveSp: 300, waveMax: 440, waveDmg: 10,
  grabCd: 8, grabWarn: .9, grabSp: 760, grabRange: 520, grabDmg: 12,
  landWarn: 1, landR: 150, landDmg: 26 };
function shockAt(x, y, delay) { (G.shocks = G.shocks || []).push({ x, y, r: 0, t: -delay, hit: false }); }
const _updBoss7b = updBoss;
updBoss = function (m, dt) {
  const S = BOSS_SIG, h = G.hero, kind = m.kind || G.bossKind || 'tide';
  const wasSlam = !!m.slam, wasHidden = !!m.hidden;
  // 空山：现身前预告落点
  if (kind === 'hollow' && m.hidden && m.blinkT <= S.landWarn && !m.land && h) {
    const a = rand(TAU), d = rand(60, 140); m.land = { x: clamp(h.x + Math.cos(a) * d, 60, VW - 60), y: clamp(h.y + Math.sin(a) * d, 60, VH - 60), t: 0 };
  }
  if (m.land) m.land.t += dt;
  // 千手：抓人
  if (kind === 'hands') {
    m.grabT = (m.grabT === undefined ? 5 : m.grabT) - dt;
    if (m.grab) {
      const g = m.grab; g.t += dt;
      if (g.phase === 'warn' && g.t >= S.grabWarn) { g.phase = 'reach'; g.len = 0; }
      if (g.phase === 'reach') {
        g.len += S.grabSp * dt;
        const hx = m.x + Math.cos(g.a) * g.len, hy = m.y + Math.sin(g.a) * g.len; g.hx = hx; g.hy = hy;
        if (h && !h.down && Math.hypot(h.x - hx, h.y - hy) < 30) { g.phase = 'pull'; g.t = 0; hurtHero(S.grabDmg, hx, hy); addShake(8); sfx('roar', .5, 1.6); }
        else if (g.len >= S.grabRange) { m.grab = null; m.grabT = S.grabCd; }
      } else if (g.phase === 'pull' && h) {
        const tx = m.x + Math.cos(g.a) * (m.r + 46), ty = m.y + Math.sin(g.a) * (m.r + 46), k = Math.min(1, dt * 9);
        h.x += (tx - h.x) * k; h.y += (ty - h.y) * k; g.hx = h.x; g.hy = h.y;
        if (g.t > .45) { m.grab = null; m.grabT = m.rage ? S.grabCd * .7 : S.grabCd; m.slamT = Math.min(m.slamT, .2); } // 拖过来立刻接一个震地
      }
    } else if (m.grabT <= 0 && h && !h.down && !m.charge && !m.slam) {
      const d = Math.hypot(h.x - m.x, h.y - m.y);
      if (d > m.r + 120 && d < S.grabRange) { m.grab = { phase: 'warn', t: 0, a: Math.atan2(h.y - m.y, h.x - m.x), len: 0 }; }
      else m.grabT = 1;
    }
  }
  _updBoss7b(m, dt);
  // 洪潮第二阶段：震地落下那一刻推出冲击波
  if (kind === 'tide' && m.rage && wasSlam && !m.slam) for (let i = 0; i < S.waveN; i++) shockAt(m.x, m.y, i * S.waveGap);
  // 空山：刚现身，挪到预告的位置并砸下
  if (kind === 'hollow' && wasHidden && !m.hidden && m.land) {
    const L = m.land; m.land = null; m.x = L.x; m.y = L.y;
    ring(L.x, L.y, S.landR, RED, .9); addShake(14); thud(1, 45); splat(L.x, L.y, 60, 0, 0);
    if (h && !h.down && Math.hypot(h.x - L.x, h.y - L.y) < S.landR) hurtHero(S.landDmg, L.x, L.y);
    for (const b of G.builds.slice()) if (!b.dead && b.type !== 'rock' && Math.hypot(b.x - L.x, b.y - L.y) < S.landR) hurtBuild(b, 40);
  }
};
function updShocks(dt) {
  if (!G.shocks || !G.shocks.length) return;
  const S = BOSS_SIG, h = G.hero;
  for (const s of G.shocks) {
    s.t += dt; if (s.t < 0) continue;
    s.r = s.t * S.waveSp;
    if (!s.hit && h && !h.down && Math.abs(Math.hypot(h.x - s.x, h.y - s.y) - s.r) < 18) { s.hit = true; hurtHero(S.waveDmg, s.x, s.y); }
  }
  G.shocks = G.shocks.filter(s => s.r < S.waveMax);
}
const _updExtras7b = updExtras;
updExtras = function (dt) { _updExtras7b(dt); updShocks(dt); if (G.state !== 'night') G.shocks = []; };
const _drawMon7b = drawMon;
drawMon = function (m) {
  if (m.type === 'boss' && !m.dead) {
    const c = ctx;
    if (m.grab) { // 墨手：预警时一条虚线，伸出去时一条粗墨臂，末端一只爪
      const g = m.grab, a = g.a;
      c.save();
      if (g.phase === 'warn') { c.strokeStyle = RED; c.globalAlpha = .4 + .5 * (g.t / BOSS_SIG.grabWarn); c.lineWidth = 3; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + Math.cos(a) * BOSS_SIG.grabRange, m.y + Math.sin(a) * BOSS_SIG.grabRange); c.stroke(); }
      else { const ex = g.hx, ey = g.hy; c.strokeStyle = INK; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(m.x, m.y); c.quadraticCurveTo((m.x + ex) / 2 + Math.sin(G.time * 12) * 18, (m.y + ey) / 2, ex, ey); c.stroke();
        c.fillStyle = INK; for (let k = -1; k <= 1; k++) { const fa = a + k * .5; c.beginPath(); c.arc(ex + Math.cos(fa) * 16, ey + Math.sin(fa) * 16, 6, 0, TAU); c.fill(); } }
      c.restore();
    }
  }
  return _drawMon7b.apply(this, arguments);
};
function drawBossMarks() {
  const c = ctx;
  if (G.shocks) for (const s of G.shocks) { if (s.t < 0) continue; c.save(); c.strokeStyle = RED; c.globalAlpha = .7 * (1 - s.r / BOSS_SIG.waveMax); c.lineWidth = 8; c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.stroke(); c.restore(); }
  const m = G.boss; if (m && !m.dead && m.land) { // 空山落点预告
    const k = Math.min(1, m.land.t / BOSS_SIG.landWarn), L = m.land;
    c.save(); c.fillStyle = RED; c.globalAlpha = .12 + .25 * k; c.beginPath(); c.arc(L.x, L.y, BOSS_SIG.landR * k, 0, TAU); c.fill();
    c.strokeStyle = RED; c.globalAlpha = .9; c.lineWidth = 3; c.setLineDash([10, 8]); c.beginPath(); c.arc(L.x, L.y, BOSS_SIG.landR, 0, TAU); c.stroke(); c.restore();
  }
}
const _drawFx7b = drawFx;
drawFx = function () { if (G.state === 'night') drawBossMarks(); return _drawFx7b.apply(this, arguments); };

/* ---------- 简单难度：Boss 血少 15%、招式伤害少 25%（普通和困难不变） ---------- */
const BOSS_BASE_DMG = { slamDmg: BOSS_PLUS.slamDmg, waveDmg: BOSS_SIG.waveDmg, grabDmg: BOSS_SIG.grabDmg, landDmg: BOSS_SIG.landDmg };
const _newRun7b = newRun;
newRun = function () {
  const r = _newRun7b.apply(this, arguments);
  const k = G.meta.mode === 'easy' ? .75 : 1;
  BOSS_PLUS.slamDmg = BOSS_BASE_DMG.slamDmg * k; BOSS_SIG.waveDmg = BOSS_BASE_DMG.waveDmg * k; BOSS_SIG.grabDmg = BOSS_BASE_DMG.grabDmg * k; BOSS_SIG.landDmg = BOSS_BASE_DMG.landDmg * k;
  return r;
};
const _updBoss7c = updBoss;
updBoss = function (m, dt) { if (!m.ez7) { m.ez7 = 1; if (G.meta.mode === 'easy') { m.hp *= .85; m.maxHp *= .85; } } return _updBoss7c(m, dt); };
