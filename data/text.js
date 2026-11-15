'use strict';
/* ============================================================
   《Ink Tide》文案表 —— 组员 A 负责
   规则：只改引号里面的英文。不要改引号外面的名字、括号、逗号。
   句子里的 {x} 是游戏会自动填的数字或名字，保留它。
   句子尽量短，太长会超出界面。
   ============================================================ */
const TXT = {
  title: 'INK TIDE',
  tagline: 'The ink learns how you fight.',

  ui: {
    day: 'DAY', night: 'NIGHT', lamp: 'THE LAMP', souls: 'Souls', kills: 'Kills',
    startNight: 'ENTER  start the night', skill: 'SPACE  skill', sell: 'Right-click  remove',
    continue: 'Click to continue', choose: 'CHOOSE ONE', dawn: 'DAWN',
    tonight: 'Tonight', nothing: 'No adaptations yet',
    down: 'You fall. The lamp stands alone.', revive: 'Back on your feet',
    notEnough: 'Not enough materials', rescued: '{name} joins the village',
    lost: 'The call went quiet.', dawnBreaks: 'Dawn breaks. The ink dissolves.',
    gameOver: 'THE LAMP IS OUT', win: 'THE TIDE RECEDES', again: 'Click to try again',
    close: 'Dawn was {s} seconds away.', earned: '+{n} souls', best: 'Best: night {n}',
    bossComing: 'Something blots out the stars', locked: 'locked', newTag: 'NEW', firstInk: 'FIRST INK',
    freeTower: 'The village built a Fire Brazier'
  },

  res: { bamboo: 'Bamboo', stone: 'Stone', cinnabar: 'Cinnabar' },
  dir: ['north', 'east', 'south', 'west'],
  dmg: { phys: 'Blade & arrow', fire: 'Fire', ice: 'Frost', zap: 'Lightning' },

  build: {
    wall:    { name: 'Bamboo Wall',  short: 'Wall',   desc: 'Blocks paths. They go around or chew through.' },
    arrow:   { name: 'Arrow Tower',  short: 'Arrow',  desc: 'Fast single shots. Long range.' },
    fire:    { name: 'Fire Brazier', short: 'Fire',   desc: 'Burns a whole pack in one blast.' },
    ice:     { name: 'Frost Bell',   short: 'Frost',  desc: 'Chills and slows three at once.' },
    thunder: { name: 'Storm Drum',   short: 'Storm',  desc: 'Lightning jumps between enemies.' },
    spike:   { name: 'Spike Trap',   short: 'Spikes', desc: 'Cuts whatever steps on it.' }
  },

  mon: {
    blob:  { name: 'Blot',      desc: 'A drop of the tide. Never alone.' },
    swift: { name: 'Streak',    desc: 'Fast and fragile.' },
    brute: { name: 'Stain',     desc: 'Slow. Hard to wash out.' },
    spit:  { name: 'Spatter',   desc: 'Spits ink at distant towers.' },
    bomb:  { name: 'Burster',   desc: 'Runs at walls and bursts.' },
    boss:  { name: 'The Deluge', desc: 'The tide, with a body.' }
  },

  // 进化：name 名字，why 为什么出现（进化报告里显示），weak 弱点提示
  evo: {
    flame:    { name: 'Ember Shell',  why: 'They remember the fire.',            weak: 'Half fire damage. Frost shatters it.' },
    frost:    { name: 'Rime Hide',    why: 'They remember the cold.',            weak: 'Half frost damage, no slowing. Fire melts it.' },
    insul:    { name: 'Dull Skin',    why: 'They remember the lightning.',       weak: 'Half lightning damage. Blades cut deep.' },
    hard:     { name: 'Stone Husk',   why: 'They remember your blades.',         weak: 'Half blade damage. Slower. Lightning cracks it.' },
    sapper:   { name: 'Breakers',     why: 'Your towers did the killing.',       weak: 'They ignore you. Strike them yourself.' },
    assassin: { name: 'Hunters',      why: 'You did the killing yourself.',      weak: 'They hunt you. Lead them past towers.' },
    fly:      { name: 'Wings',        why: 'Your walls were in the way.',        weak: 'They fly over walls with less health.' },
    detour:   { name: 'New Path',     why: 'Too many died in the {from}.',       weak: 'Most will come from the {to} tonight.' },
    split:    { name: 'Split Blots',     why: 'The lamp took no damage.',   weak: 'Blots split in two. Hit both at once.' }
  },
  gone: '{name} has faded',

  relic: {
    edge:     { name: 'Keen Edge',     desc: 'Your hits: +25% damage.' },
    stride:   { name: 'Long Stride',   desc: 'Move 15% faster.' },
    oil:      { name: 'Lamp Oil',      desc: '+100 max lamp health. Fully heals it.' },
    crafts:   { name: 'Craftsman',     desc: 'Buildings cost 15% less.' },
    harvest:  { name: 'Harvest',       desc: 'Gather 50% faster.' },
    pitch:    { name: 'Burning Pitch', desc: '30% more fire damage.' },
    marrow:   { name: 'Cold Marrow',   desc: 'Frost: +30% damage. Slows last longer.' },
    rod:      { name: 'Copper Rod',    desc: 'Lightning jumps to 2 more enemies.' },
    fletch:   { name: 'Fletcher',      desc: 'Towers attack 20% faster.' },
    rampart:  { name: 'Rampart',       desc: 'Walls have 60% more health.' },
    thirst:   { name: 'Ink Thirst',    desc: 'Your kills heal you.' },
    echo:     { name: 'Echo',          desc: 'Your skill strikes twice.' },
    hoard:    { name: 'Hoard',         desc: 'Earn 50% more souls.' },
    mask:     { name: 'False Face',    desc: 'They adapt to your second most used tower damage.' }
  },

  // 商店（局外解锁）
  shop: {
    veteran:  { name: 'Old Plans',    desc: 'All buildings are available from day one.' },
    satchel:  { name: 'Full Satchel', desc: 'Start with 50% more materials.' },
    archer:   { name: 'The Archer',   desc: 'Another hero. Fires from a distance.' },
    oil:      { name: 'Deep Well',    desc: 'The lamp starts with 100 more health.' },
    fourth:   { name: 'Wider Choice', desc: 'Choose from four relics instead of three.' },
    survivor: { name: 'Old Friend',   desc: 'Start every run with one survivor.' }
  },
  heroes: { sword: 'The Blade', bow: 'The Archer' },
  menu: {
    begin: 'Click to begin', shop: 'Spend souls', archive: 'Archive', depth: 'Depth',
    owned: 'owned', hero: 'Hero', unseen: '???', goal: '{n} more souls for {name}', afford: 'You can now afford {name}',
    endless: 'Endless nights', back: 'Return to the village', wins: 'Wins',
    newDepth: 'Depth {n} unlocked'
  },

  survivors: ['Mei', 'Old Chen', 'Lan', 'Bo', 'Aunt Hua', 'Jun', 'Xiu', 'Little Tao', 'Wen', 'Granny Su'],
  survivorCall: 'Someone calls for help',

  // 新手提示
  hint: {
    move:    'Move with WASD.   Hold left-click to swing.',
    gather:  'Walk up to bamboo, stone or cinnabar to gather.',
    build:   'Press 3 for a Fire Brazier, then click near the lamp.',
    ready:   'Build more if you can.   Press ENTER to start the night.',
    night1:  'Keep the lamp lit until dawn.',
    day2:    'Ember Shell resists fire. Use Frost Bell (4).',
    rescue:  'Reach the caller before nightfall.',
    night2:  'Watch how fire and frost hit them now.',
    free:    'They will adapt to how you fight.'
  },

  report: {
    title: 'What the tide learned',
    howDied: 'How they died', who: 'Who killed them', where: 'Where they fell',
    you: 'You', towers: 'Towers', adapt: 'Tonight they change',
    none: 'They found no pattern. Nothing changed.',
    lampHit: 'The lamp lost {n} health.', lampSafe: 'Nothing touched the lamp.'
  },

  teaser: [
    'Something watches at the edge of the page.',
    'They learned from that.',
    'The ink is deeper to the {to}.',
    'Another night like that. They will remember.',
    'A shape gathers beyond the light.',
    'It is almost here.',
    'Tonight, the Deluge.'
  ]
};
