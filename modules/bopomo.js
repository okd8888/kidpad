/* 注音符號
   小一上才會正式學，所以題目要從「完全沒學過」開始：
     Level 1 看注音找圖 —— 記住符號和音的連結，選項是圖，有語意線索
     Level 2 接下去／倒著找 —— 只考 ㄅㄆㄇㄈ 開頭這幾個，正著反著都要會
     Level 3 看圖選注音 —— 要聽出開頭的音，答錯兩次會把整個詞的注音給他看
     Level 4 拼拼看   —— 把兩個符號拼起來，這才是注音真正的用途
   注音符號在筆順資料庫裡查不到（全部 404），所以不做描寫，只做認讀。 */

import { createLeveledModule } from '../lib/level-module.js';

/** 37 個注音符號，順序就是課本的順序 */
const ALL = 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ'.split('');

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

/** Level 1：看注音找圖 —— 選項是圖，有語意線索，比純選符號好入手 */
function qFindPic() {
  const [sym, word, emoji] = pick(EASY);
  const others = EASY.filter(e => e[0] !== sym).sort(() => Math.random() - 0.5).slice(0, 2);
  return {
    promptHtml: `
      <div class="bopomo-big">${sym}</div>
      <div class="q-expr">哪一個是這個注音開頭？</div>`,
    options: [[sym, word, emoji], ...others]
      .sort(() => Math.random() - 0.5)
      .map(([s, w, e]) => ({ text: `${e} ${w}`, correct: s === sym })),
    sayZh: '哪一個是這個注音開頭',
  };
}

/** Level 2a：ㄅ ㄆ ㄇ □ —— 從頭開始，只考前 8 個 */
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

/** Level 2b：□ ㄆ ㄇ ㄈ —— 倒著推，順序要更熟 */
function qPrev() {
  const miss = rnd(FIRST_EIGHT.length - 3);          // 缺的是前面那一個
  const shown = FIRST_EIGHT.slice(miss + 1, miss + 4).join('　');
  const answer = FIRST_EIGHT[miss];
  return {
    promptHtml: `
      <div class="bopomo-row"><span class="blank">□</span>　${shown}</div>
      <div class="q-expr">前面少了哪一個？</div>`,
    options: options(answer, FIRST_EIGHT),
    sayZh: '前面少了哪一個',
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

/** Level 4：拼拼看 —— 兩個符號拼成一個字，這是注音真正的用途 */
const WORDS = [
  ['狗', 'ㄍㄡˇ', '🐶'], ['貓', 'ㄇㄠ', '🐱'],  ['馬', 'ㄇㄚˇ', '🐴'], ['車', 'ㄔㄜ', '🚗'],
  ['山', 'ㄕㄢ', '⛰️'],  ['書', 'ㄕㄨ', '📖'],  ['手', 'ㄕㄡˇ', '✋'], ['口', 'ㄎㄡˇ', '👄'],
  ['兔', 'ㄊㄨˋ', '🐰'], ['豬', 'ㄓㄨ', '🐷'],  ['米', 'ㄇㄧˇ', '🍚'], ['筆', 'ㄅㄧˇ', '✏️'],
  ['門', 'ㄇㄣˊ', '🚪'], ['星', 'ㄒㄧㄥ', '⭐'], ['月', 'ㄩㄝˋ', '🌙'], ['魚', 'ㄩˊ', '🐟'],
  ['耳', 'ㄦˇ', '👂'],   ['鵝', 'ㄜˊ', '🦢'],   ['鴨', 'ㄧㄚ', '🦆'],  ['牙', 'ㄧㄚˊ', '🦷'],
];

function qBlend() {
  const [word, zhuyin, emoji] = pick(WORDS);
  const others = WORDS.filter(w => w[0] !== word).sort(() => Math.random() - 0.5).slice(0, 2);
  // 把注音一個一個拆開排，看起來像在拼
  const spaced = [...zhuyin].join(' ');
  return {
    promptHtml: `
      <div class="bopomo-row">${spaced}</div>
      <div class="q-expr">拼起來是哪一個？</div>`,
    options: [[word, zhuyin, emoji], ...others]
      .sort(() => Math.random() - 0.5)
      .map(([w, _z, e]) => ({ text: `${e} ${w}`, correct: w === word })),
    sayZh: '拼起來是哪一個',
    hintHtml: `<div class="bopomo-row small">${emoji}　${word}　${zhuyin}</div>`,
    hintTip: '慢慢唸唸看',
  };
}

export default createLeveledModule({
  id: 'bopomo',
  title: '注音符號',
  icon: 'ㄅ',
  storeKey: 'kidpad.bopomo.progress',
  buddy: '🐿️',
  intro: '這裡是注音符號，看看這個注音是什麼東西的開頭',
  levels: [
    { name: 'Level 1 · 看注音找圖', note: '這個注音是什麼東西的開頭', make: qFindPic },
    { name: 'Level 2 · 排順序',     note: 'ㄅㄆㄇㄈ 正著反著都要會', make: () => (rnd(2) ? qNext() : qPrev()) },
    { name: 'Level 3 · 看圖選注音', note: '這個東西是哪個注音開頭', make: qInitial },
    { name: 'Level 4 · 拼拼看',     note: '把注音拼起來，是哪一個字', make: qBlend },
  ],
});
