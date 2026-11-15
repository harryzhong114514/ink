// js/extras6.js — 地面墨迹控制
// 1) 新墨迹更淡（alpha 约为原来的 55%）、略小（约 85%）
// 2) 每次黎明额外擦掉大部分地面墨迹，只留淡淡一层
// 依赖 core.js 的 splat / fadePaper / pctx，以及 main.js 的 dawn。
// 需在 core.js、main.js、extras3.js 之后加载（extras3 也包了 dawn，顺序要在它之后）。

const SPLAT_ALPHA_K = .55; // 新墨迹透明度倍率
const SPLAT_SIZE_K = .85;  // 新墨迹尺寸倍率
const DAWN_FADE = .6;      // 黎明擦除强度（destination-out）

// splat 内部直接写 pctx.globalAlpha，这里在调用期间临时把 globalAlpha 的写入乘以倍率，调用结束后删掉临时属性
const _splat6 = splat;
splat = function () {
  const args = Array.prototype.slice.call(arguments);
  if (typeof args[2] === 'number') args[2] *= SPLAT_SIZE_K;
  const desc = typeof CanvasRenderingContext2D !== 'undefined' ? Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'globalAlpha') : null;
  if (!desc || !desc.set) return _splat6.apply(this, args);
  Object.defineProperty(pctx, 'globalAlpha', {
    configurable: true,
    get() { return desc.get.call(pctx); },
    set(v) { desc.set.call(pctx, v * SPLAT_ALPHA_K); }
  });
  try { return _splat6.apply(this, args); }
  finally { delete pctx.globalAlpha; } // 删掉实例上的临时属性，恢复原型上的 globalAlpha
};

// 黎明：在原 dawn（含 extras3 的包装）跑完后，再把地面墨迹大幅擦淡
const _dawn6 = dawn;
dawn = function () {
  const r = _dawn6.apply(this, arguments);
  fadePaper(DAWN_FADE);
  return r;
};
