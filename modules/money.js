/* 錢幣認識
   台灣的 1、5、10、50 元硬幣。硬幣用 SVG 畫，不需要圖檔。
   數錢那一級剛好接上他已經會的加法。 */

import { createLeveledModule } from '../lib/level-module.js';

/** 面額 → 畫多大、什麼顏色 */
const COINS = [
  { value: 1,  r: 30, face: '#d7dade', edge: '#a9aeb5' },
  { value: 5,  r: 34, face: '#d7dade', edge: '#a9aeb5' },
  { value: 10, r: 38, face: '#d7dade', edge: '#a9aeb5' },
  { value: 50, r: 42, face: '#e8c46a', edge: '#c39a2e' },
];

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];
const coinOf = v => COINS.find(c => c.value === v);

function coinSvg(value) {
  const c = coinOf(value);
  const size = c.r * 2 + 8;
  return `
    <svg class="coin" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${value} 元">
      <circle cx="${size / 2}" cy="${size / 2}" r="${c.r}" fill="${c.face}" stroke="${c.edge}" stroke-width="4" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${c.r - 7}" fill="none" stroke="${c.edge}" stroke-width="2" opacity=".6" />
      <text x="${size / 2}" y="${size / 2 + 11}" text-anchor="middle"
            font-size="${c.r > 34 ? 30 : 26}" font-weight="800" fill="#3d3630">${value}</text>
    </svg>`;
}

const rowOf = list => `<div class="coin-row">${list.map(coinSvg).join('')}</div>`;
const sum = list => list.reduce((a, b) => a + b, 0);

function optionsFor(answer, step = 1) {
  const set = new Set([answer]);
  while (set.size < 3) {
    const v = answer + [-2, -1, 1, 2][rnd(4)] * step;
    if (v > 0 && v <= 100) set.add(v);
  }
  return [...set]
    .sort(() => Math.random() - 0.5)
    .map(v => ({ text: `${v} 元`, correct: v === answer }));
}

/** 一堆硬幣（至少兩枚），總額不超過 max。
    挑硬幣時要留額度給後面的，不然第一枚抽到 50 就只剩一枚了。 */
function randomPile(maxCoins, max) {
  const n = 2 + rnd(maxCoins - 1);
  const pile = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const remain = n - pile.length;                 // 含這一枚，還要放幾枚
    const budget = max - total - (remain - 1);      // 後面每枚至少留 1 元
    const choices = COINS.filter(c => c.value <= budget);
    if (!choices.length) break;
    const c = pick(choices);
    pile.push(c.value);
    total += c.value;
  }
  return pile.length >= 2 ? pile : [...pile, 1];
}

/** Level 1：這是幾元？ */
function qOne() {
  const v = pick(COINS).value;
  return {
    promptHtml: `${rowOf([v])}<div class="q-expr">這是幾元？</div>`,
    options: optionsFor(v, v >= 10 ? 5 : 1),
    sayZh: '這是幾元',
  };
}

/** Level 2：全部加起來幾元？ */
function qCount() {
  const pile = randomPile(4, 50).sort((a, b) => b - a);
  return {
    promptHtml: `${rowOf(pile)}<div class="q-expr">全部加起來幾元？</div>`,
    options: optionsFor(sum(pile), 5),
    sayZh: '全部加起來幾元',
  };
}

/** Level 3：兩堆比較，哪一堆比較多？（選較多的那個金額） */
function qCompare() {
  let a = randomPile(3, 40);
  let b = randomPile(3, 40);
  while (sum(a) === sum(b)) b = randomPile(3, 40);
  const more = Math.max(sum(a), sum(b));
  return {
    promptHtml: `
      ${rowOf(a.sort((x, y) => y - x))}
      <div class="q-op">和</div>
      ${rowOf(b.sort((x, y) => y - x))}
      <div class="q-expr">哪一邊比較多？選比較多的金額</div>`,
    options: [
      { text: `${sum(a)} 元`, correct: sum(a) === more },
      { text: `${sum(b)} 元`, correct: sum(b) === more },
    ].sort(() => Math.random() - 0.5),
    sayZh: '哪一邊比較多',
  };
}

export default createLeveledModule({
  id: 'money',
  title: '認識錢幣',
  icon: '💰',
  storeKey: 'kidpad.money.progress',
  buddy: '🐷',
  intro: '這裡是認識錢幣，看看這些硬幣是幾元',
  levels: [
    { name: 'Level 1 · 這是幾元', note: '看硬幣上的數字', make: qOne },
    { name: 'Level 2 · 數錢', note: '把硬幣加起來', make: qCount },
    { name: 'Level 3 · 比多少', note: '哪一邊的錢比較多', make: qCompare },
  ],
});
