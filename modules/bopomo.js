/* 注音符號
   小一上才會正式學，所以題目要從「完全沒學過」開始：
     Level 1 找一樣的  —— 純看形狀，不需要任何注音知識
     Level 2 接下去    —— 只考 ㄅㄆㄇㄈ 開頭這幾個，會唱就答得出來
     Level 3 看圖選注音 —— 才開始需要聽出開頭的音，答錯兩次會把整個字的注音給他看
   注音符號在筆順資料庫裡查不到（全部 404），所以不做描寫，只做認讀。 */

import { createLeveledModule } from '../lib/level-module.js';

/** 37 個注音符號，順序就是課本的順序 */
const ALL = 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ'.split('');

/** 長得像的符號，Level 1 拿來當干擾選項 */
const LOOK_ALIKE = [
  ['ㄅ', 'ㄆ'], ['ㄋ', 'ㄇ', 'ㄊ'], ['ㄈ', 'ㄏ'], ['ㄗ', 'ㄘ'], ['ㄓ', 'ㄔ'],
  ['ㄛ', 'ㄜ'], ['ㄝ', 'ㄟ'], ['ㄨ', 'ㄩ'], ['ㄣ', 'ㄥ'], ['ㄞ', 'ㄠ'],
];

/** Level 2 只考開頭這 8 個，就是大家會唱的那一段 */
const FIRST_EIGHT = ALL.slice(0, 8);      // ㄅㄆㄇㄈㄉㄊㄋㄌ

/** Level 3 只用最好認的 10 個聲母，每個都配一張圖和完整注音 */
const EASY = [
  ['ㄅ', '包子', '🥟', 'ㄅㄠ˙ㄗ'],
  ['ㄆ', '葡萄', '🍇', 'ㄆㄨˊㄊㄠˊ'],
  ['ㄇ', '貓咪', '🐱', 'ㄇㄠㄇㄧ'],
  ['ㄈ', '飛機', '✈️', 'ㄈㄟㄐㄧ'],
  ['ㄉ', '大象', '🐘', 'ㄉㄚˋㄒㄧㄤˋ'],
  ['ㄊ', '兔子', '🐰', 'ㄊㄨˋ˙ㄗ'],
  ['ㄋ', '牛奶', '🥛', 'ㄋㄧㄡˊㄋㄞˇ'],
  ['ㄌ', '老虎', '🐯', 'ㄌㄠˇㄏㄨˇ'],
  ['ㄍ', '狗狗', '🐶', 'ㄍㄡˇㄍㄡˇ'],
  ['ㄎ', '咖啡', '☕', 'ㄎㄚㄈㄟ'],
];

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

function options(answer, pool) {
  const set = new Set([answer]);
  while (set.size < 3) set.add(pick(pool));
  return [...set]
    .sort(() => Math.random() - 0.5)
    .map(v => ({ text: v, correct: v === answer }));
}

/** Level 1：找出一模一樣的那個（只看形狀，不用會唸） */
function qMatch() {
  const group = pick(LOOK_ALIKE);
  const answer = pick(group);
  const set = new Set([answer, ...group.filter(c => c !== answer)]);
  while (set.size < 3) set.add(pick(ALL));

  return {
    promptHtml: `
      <div class="bopomo-big">${answer}</div>
      <div class="q-expr">找出一樣的那一個</div>`,
    options: [...set].slice(0, 3)
      .sort(() => Math.random() - 0.5)
      .map(v => ({ text: v, correct: v === answer })),
    sayZh: '找出一樣的那一個',
  };
}

/** Level 2：ㄅ ㄆ □ —— 從頭開始，只考前 8 個 */
function qNext() {
  const miss = 2 + rnd(FIRST_EIGHT.length - 2);      // 至少從第 3 個開始問
  const shown = FIRST_EIGHT.slice(0, miss).join('　');
  const answer = FIRST_EIGHT[miss];
  return {
    promptHtml: `
      <div class="bopomo-row">${shown}　<span class="blank">□</span></div>
      <div class="q-expr">接下來是哪一個？</div>`,
    options: options(answer, FIRST_EIGHT),
    sayZh: '接下來是哪一個',
  };
}

/** Level 3：看圖選開頭的注音，答錯兩次會把整個詞的注音給他看 */
function qInitial() {
  const [sym, word, emoji, zhuyin] = pick(EASY);
  const pool = EASY.map(e => e[0]);
  return {
    promptHtml: `
      <div class="pic-big">${emoji}</div>
      <div class="q-expr">「${word}」是哪個注音開頭？</div>`,
    options: options(sym, pool),
    sayZh: `${word}，是哪個注音開頭`,
    hintHtml: `<div class="bopomo-row small">${word}　${zhuyin}</div>`,
    hintTip: '看看這個字怎麼拼',
  };
}

export default createLeveledModule({
  id: 'bopomo',
  title: '注音符號',
  icon: 'ㄅ',
  storeKey: 'kidpad.bopomo.progress',
  buddy: '🐿️',
  intro: '這裡是注音符號，先從找出一樣的開始',
  levels: [
    { name: 'Level 1 · 找一樣的', note: '看形狀就好，還不用會唸', make: qMatch },
    { name: 'Level 2 · 接下去',   note: 'ㄅㄆㄇㄈ 唱下去，接下來是哪一個', make: qNext },
    { name: 'Level 3 · 看圖選注音', note: '聽聽看這個東西，是哪個注音開頭', make: qInitial },
  ],
});
