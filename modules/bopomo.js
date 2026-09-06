/* 注音符號
   小一上就要學，先從「認得符號」開始。
   注音符號在筆順資料庫裡查不到（全部 404），所以不做描寫，只做認讀。
   題目一律看得懂就答得出來，不需要用聽的。 */

import { createLeveledModule } from '../lib/level-module.js';

/** 37 個注音符號，順序就是課本的順序 */
const ALL = 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ'.split('');

/** 21 個聲母 → 代表詞與圖，全部都是那個聲母開頭 */
const INITIALS = [
  ['ㄅ', '包子', '🥟'], ['ㄆ', '葡萄', '🍇'], ['ㄇ', '貓咪', '🐱'], ['ㄈ', '飛機', '✈️'],
  ['ㄉ', '雞蛋', '🥚'], ['ㄊ', '兔子', '🐰'], ['ㄋ', '牛', '🐮'],   ['ㄌ', '老虎', '🐯'],
  ['ㄍ', '狗', '🐶'],   ['ㄎ', '咖啡', '☕'], ['ㄏ', '花', '🌸'],   ['ㄐ', '雞', '🐔'],
  ['ㄑ', '汽車', '🚗'], ['ㄒ', '西瓜', '🍉'], ['ㄓ', '豬', '🐷'],   ['ㄔ', '蟲', '🐛'],
  ['ㄕ', '樹', '🌳'],   ['ㄖ', '太陽', '☀️'], ['ㄗ', '足球', '⚽'], ['ㄘ', '草莓', '🍓'],
  ['ㄙ', '雨傘', '☂️'],
];

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

function optionsOf(answer) {
  const set = new Set([answer]);
  while (set.size < 3) set.add(pick(ALL));
  return [...set]
    .sort(() => Math.random() - 0.5)
    .map(v => ({ text: v, correct: v === answer }));
}

/** 符號順序：ㄅ ㄆ □ ㄈ */
function qOrder() {
  const i = rnd(ALL.length - 3);
  const seq = ALL.slice(i, i + 4);
  const miss = 1 + rnd(2);
  const answer = seq[miss];
  const shown = seq.map((c, k) => (k === miss ? '□' : c)).join('　');
  return {
    promptHtml: `
      <div class="letter-row">${shown}</div>
      <div class="q-expr">中間少了哪一個？</div>`,
    options: optionsOf(answer),
    sayZh: '中間少了哪一個',
  };
}

/** 看圖選聲母：🐱 貓咪 → ㄇ */
function qInitial() {
  const [sym, word, emoji] = pick(INITIALS);
  return {
    promptHtml: `
      <div class="pic-big">${emoji}</div>
      <div class="q-expr">「${word}」是哪個注音開頭？</div>`,
    options: optionsOf(sym),
    sayZh: `${word}，是哪個注音開頭`,
  };
}

/** 反過來：給注音，選出開頭是它的那個詞 */
function qWord() {
  const [sym, word, emoji] = pick(INITIALS);
  const others = INITIALS.filter(x => x[0] !== sym).sort(() => Math.random() - 0.5).slice(0, 2);
  const opts = [[sym, word, emoji], ...others]
    .sort(() => Math.random() - 0.5)
    .map(([s, w, e]) => ({ text: `${e} ${w}`, correct: s === sym }));
  return {
    promptHtml: `
      <div class="letter-big">${sym}</div>
      <div class="q-expr">哪一個是這個注音開頭？</div>`,
    options: opts,
    sayZh: '哪一個是這個注音開頭',
  };
}

export default createLeveledModule({
  id: 'bopomo',
  title: '注音符號',
  icon: 'ㄅ',
  storeKey: 'kidpad.bopomo.progress',
  buddy: '🐿️',
  intro: '這裡是注音符號，看圖片選出正確的注音',
  levels: [
    { name: 'Level 1 · 記順序', note: 'ㄅㄆㄇㄈ 排下去，少了哪一個', make: qOrder },
    { name: 'Level 2 · 看圖選注音', note: '這個東西是哪個注音開頭', make: qInitial },
    { name: 'Level 3 · 反過來找', note: '看注音，選出開頭是它的東西', make: () => (rnd(2) ? qWord() : qInitial()) },
  ],
});
