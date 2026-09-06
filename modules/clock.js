/* 時鐘認讀
   小一的範圍是整點與半點，所以只做這兩種，時鐘用 SVG 畫，不需要圖檔。 */

import { createLeveledModule } from '../lib/level-module.js';

const rnd = n => Math.floor(Math.random() * n);

/** 畫一個時鐘：h 點 m 分 */
function clockSvg(h, m) {
  const hourAngle = ((h % 12) + m / 60) * 30;   // 分針走的時候時針也會跟著移動
  const minAngle = m * 6;
  const hand = (angle, len, width, color) => {
    const rad = (angle - 90) * Math.PI / 180;
    return `<line x1="100" y1="100" x2="${100 + len * Math.cos(rad)}" y2="${100 + len * Math.sin(rad)}"
             stroke="${color}" stroke-width="${width}" stroke-linecap="round" />`;
  };

  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const rad = (i * 30 - 90) * Math.PI / 180;
    const num = i === 0 ? 12 : i;
    ticks += `<text x="${100 + 74 * Math.cos(rad)}" y="${100 + 74 * Math.sin(rad) + 8}"
                text-anchor="middle" font-size="22" font-weight="800" fill="#3d3630">${num}</text>`;
  }

  return `
    <svg class="clock" viewBox="0 0 200 200" role="img" aria-label="時鐘">
      <circle cx="100" cy="100" r="94" fill="#fffdf8" stroke="#f0e3d2" stroke-width="8" />
      ${ticks}
      ${hand(hourAngle, 46, 10, '#f08c00')}
      ${hand(minAngle, 68, 6, '#4cc9f0')}
      <circle cx="100" cy="100" r="7" fill="#3d3630" />
    </svg>`;
}

const label = (h, m) => (m === 0 ? `${h} 點` : `${h} 點半`);

/** 干擾選項：附近的整點與半點 */
function optionsFor(h, m) {
  const set = new Set([label(h, m)]);
  const nudge = () => {
    const dh = ((h + [-2, -1, 1, 2][rnd(4)] + 11) % 12) + 1;
    const dm = rnd(2) ? 0 : 30;
    return label(dh, dm);
  };
  set.add(label(h, m === 0 ? 30 : 0));            // 一定放一個「同一個鐘點的另一半」
  while (set.size < 3) set.add(nudge());
  return [...set]
    .sort(() => Math.random() - 0.5)
    .map(v => ({ text: v, correct: v === label(h, m) }));
}

function ask(h, m) {
  return {
    promptHtml: `${clockSvg(h, m)}<div class="q-expr">現在幾點？</div>`,
    options: optionsFor(h, m),
    sayZh: '現在幾點',
  };
}

const qHour = () => ask(1 + rnd(12), 0);
const qHalf = () => ask(1 + rnd(12), 30);
const qMix  = () => (rnd(2) ? qHour() : qHalf());

export default createLeveledModule({
  id: 'clock',
  title: '時鐘',
  icon: '🕐',
  storeKey: 'kidpad.clock.progress',
  buddy: '🦉',
  intro: '這裡是看時鐘，看看長針短針指到哪裡',
  levels: [
    { name: 'Level 1 · 整點', note: '長針指到 12，就是整點', make: qHour },
    { name: 'Level 2 · 半點', note: '長針指到 6，就是幾點半', make: qHalf },
    { name: 'Level 3 · 混在一起', note: '整點和半點都會出現，看清楚長針', make: qMix },
  ],
});
