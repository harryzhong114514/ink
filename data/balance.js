'use strict';
/* ============================================================
   《Ink Tide》数值表 —— 组员 C 负责
   规则：只改冒号右边的数字。不要改左边的名字、括号、逗号。
   改完保存，刷新网页就生效。改坏了游戏会白屏，把文件还原即可。
   ============================================================ */
const BAL = {
  // 白天和夜晚的长度（秒）
  day:   { len: 60, firstLen: 45 },
  night: { len: 75, total: 7 },          // total = 第几夜出 Boss

  // 长明灯
  lamp:  { hp: 300, healPerDawn: 0.15 }, // 每天黎明回复 15%

  // 开局资源
  start: { bamboo: 40, stone: 30, cinnabar: 20 },

  // 英雄：hp 血量，sp 移动速度，dmg 伤害，cd 攻击间隔（秒，越小越快）
  hero: {
    sword: { hp: 120, sp: 250, dmg: 20, cd: 0.32, range: 105, arc: 2.0, skillCd: 4, skillDmg: 55, skillRange: 340 },
    bow:   { hp: 90,  sp: 265, dmg: 16, cd: 0.28, range: 520, pierce: 2, skillCd: 6, skillDmg: 14, skillR: 120 },
    respawn: 6                           // 倒下后几秒复活
  },

  // 采集：rate 每秒采多少，reach 多近能采
  gather: { rate: 14, reach: 48 },
  // 每天刷新的资源点：n 个数，amt 每个有多少
  nodes: {
    bamboo:   { n: 4, amt: 25 },
    stone:    { n: 3, amt: 20 },
    cinnabar: { n: 3, amt: 15 }
  },
  survivorIncome: 10,                    // 每个幸存者每天带来的资源

  // 建筑：hp 血量，cost 造价，range 射程，cd 攻击间隔，dmg 伤害
  build: {
    wall:    { hp: 140, cost: { bamboo: 8 } },
    arrow:   { hp: 90, cost: { bamboo: 15, stone: 10 },   range: 280, cd: 0.55, dmg: 10 },
    fire:    { hp: 90, cost: { stone: 15, cinnabar: 12 }, range: 200, cd: 1.1,  dmg: 10, aoe: 62, burn: 4, burnT: 3 },
    ice:     { hp: 90, cost: { stone: 15, cinnabar: 10 }, range: 215, cd: 1.0,  dmg: 8,  slow: 0.5, slowT: 2.5, targets: 3 },
    thunder: { hp: 90, cost: { stone: 25, cinnabar: 20 }, range: 240, cd: 1.4,  dmg: 12, chain: 4 },
    spike:   { hp: 60, cost: { bamboo: 10, stone: 5 },    dmg: 9, cd: 0.5 }
  },
  refund: 0.5,                           // 拆除返还比例
  costGrowth: { wall: 0.03, other: 0.25 },// 每多一座同类建筑，造价涨多少

  // 怪：hp 血量，sp 速度，dmg 伤害，r 体型，cost 占用波次预算，from 第几夜开始出现
  mon: {
    blob:  { hp: 30,   sp: 62,  dmg: 6,  r: 13, cost: 1, from: 1 },
    swift: { hp: 16,   sp: 128, dmg: 4,  r: 10, cost: 1, from: 2 },
    brute: { hp: 170,  sp: 36,  dmg: 18, r: 26, cost: 5, from: 3 },
    spit:  { hp: 28,   sp: 50,  dmg: 8,  r: 14, cost: 2, from: 3, range: 230 },
    bomb:  { hp: 22,   sp: 96,  dmg: 60, r: 12, cost: 2, from: 4, aoe: 75 },
    boss:  { hp: 2000, sp: 26,  dmg: 40, r: 58, cost: 0, from: 99 }
  },

  // 波次强度：第 n 夜的预算 = base + n × perNight
  // hpPerNight：每过一夜怪血量涨多少；span：怪在夜晚前百分之多少的时间里出完
  wave: { base: 30, perNight: 30, tutorial1: 34, prelude: 7, hpPerNight: 0.22, span: 0.6 },

  // 寻路：怪把"打穿一堵墙"当成多走几格路
  path: { wall: 7, tower: 5 },

  // 学习系统（最重要的一组）
  learn: {
    armorShare: 0.42,    // 某种伤害占比超过它，怪就长出对应的甲
    armorFrac: 0.7,      // 多大比例的怪会带甲
    resMul: 0.5,         // 带甲后该伤害打几折（不要低于 0.5）
    weakMul: 1.6,        // 被克制的伤害倍率
    sapperShare: 0.68,   // 塔的伤害占比超过它 → 出现拆塔怪
    assassinShare: 0.6,  // 英雄的伤害占比超过它 → 出现刺客
    behaviorFrac: 0.3,   // 拆塔怪 / 刺客占比
    flyWalls: 10,        // 墙超过这么多 → 出现飞行怪
    flyFrac: 0.3,
    detour: 0.75,        // 绕路强度（0 不绕，1 完全避开死得最多的方向）
    easeMul: 0.85,       // 上一夜输得惨，下一夜的强度倍率
    hardMul: 1.1         // 上一夜毫发无伤，下一夜的强度倍率
  },

  // 每夜结算的墨魂
  souls: { perKill: 1, perNight: 10, boss: 150, win: 200 }
};
