/* 英文練習
   S3：Level 1 字母認讀（快速過關）、Level 2 發音與看圖選字母、夥伴角色 🐧
   26 個字母小朋友都認得，所以 Level 1 的任務是抓出還會混淆的那幾組。
   內容設計見 docs/CONTENT-PLAN.md */

import { createQuizView } from '../lib/quiz-ui.js';
import { stars } from '../lib/stars.js';
import { store } from '../lib/storage.js';
import { speech } from '../lib/speech.js';

const ROUND = 6;
const KEY = 'kidpad.english.progress';
const CONFUSING_QUOTA = 4;   // 一輪至少幾題來自易混淆組

/** 容易搞混的字母，這是這個年紀真正的難點 */
const CONFUSING = [
  ['b', 'd'],
  ['p', 'q'],
  ['M', 'N', 'W'],
  ['i', 'j'],
  ['u', 'v'],
];

/** 字母 → 好幾個代表單字，題目才不會每次都一樣 */
const WORDS = {
  A: [['apple', '🍎'], ['ant', '🐜']],
  B: [['ball', '⚽'], ['bear', '🐻'], ['bus', '🚌']],
  C: [['cat', '🐱'], ['car', '🚗'], ['cake', '🍰']],
  D: [['dog', '🐶'], ['duck', '🦆']],
  E: [['egg', '🥚'], ['elephant', '🐘']],
  F: [['fish', '🐟'], ['frog', '🐸'], ['flower', '🌸']],
  G: [['goat', '🐐'], ['grapes', '🍇']],
  H: [['hat', '🎩'], ['house', '🏠'], ['horse', '🐴']],
  I: [['ice', '🧊'], ['ice cream', '🍦']],
  J: [['jet', '✈️'], ['juice', '🧃']],
  K: [['key', '🔑'], ['kite', '🪁']],
  L: [['lion', '🦁'], ['leaf', '🍃']],
  M: [['moon', '🌙'], ['milk', '🥛'], ['monkey', '🐵']],
  N: [['nose', '👃'], ['nut', '🥜']],
  O: [['orange', '🍊'], ['owl', '🦉']],
  P: [['pig', '🐷'], ['pizza', '🍕'], ['pencil', '✏️']],
  Q: [['queen', '👑'], ['question', '❓']],
  R: [['rabbit', '🐰'], ['rainbow', '🌈']],
  S: [['sun', '☀️'], ['star', '⭐'], ['snake', '🐍']],
  T: [['tiger', '🐯'], ['tree', '🌳'], ['train', '🚆']],
  U: [['umbrella', '☂️'], ['unicorn', '🦄']],
  V: [['van', '🚐'], ['violin', '🎻']],
  W: [['water', '💧'], ['watch', '⌚'], ['whale', '🐳']],
  Y: [['yellow', '🟡'], ['yoyo', '🪀']],
  Z: [['zebra', '🦓'], ['zoo', '🦁']],
};

/** 認讀題用得到全部 26 個字母；X 開頭的常用單字對這個年紀太難，發音題就跳過它 */
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const WORD_LETTERS = Object.keys(WORDS);

const LEVEL_NAME = {
  1: 'Level 1 · 認字母',
  2: 'Level 2 · 聽發音',
};

let built = false;
let el = null;
let quiz = null;
let hasVoice = false;
let state = null;
let randomMode = false;

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

function loadState() {
  state = store.get(KEY, null) || { level: 1, streak: 0 };
}
function saveState() { store.set(KEY, state); }

/** 這個字母的其中一個代表單字 */
function wordOf(letter) { return pick(WORDS[letter]); }

/* ================= 題庫 ================= */

/** 從易混淆組挑一個字母，並用同組的當干擾選項 */
function confusingPair() {
  const group = pick(CONFUSING);
  const answer = pick(group);
  return { answer, others: group.filter(c => c !== answer) };
}

function optionsOf(answer, others = []) {
  const set = new Set([answer, ...others]);
  while (set.size < 3) {
    const c = pick(LETTERS);
    set.add(answer === answer.toLowerCase() ? c.toLowerCase() : c);
  }
  return [...set]
    .slice(0, 3)
    .sort(() => Math.random() - 0.5)
    .map(v => ({ text: v, correct: v === answer }));
}

/* --- Level 1：認字母 --- */

/** 大小寫配對：看大寫選小寫 */
function q1Case(useConfusing) {
  const { answer, others } = useConfusing
    ? confusingPair()
    : { answer: pick(LETTERS).toLowerCase(), others: [] };

  return {
    promptHtml: `
      <div class="letter-big">${answer.toUpperCase()}</div>
      <div class="q-expr">哪一個是它的小寫？</div>`,
    options: optionsOf(answer.toLowerCase(), others.map(o => o.toLowerCase())),
    say: hasVoice ? answer.toUpperCase() : null,
    sayZh: '哪一個是它的小寫',
  };
}

/** 聽音找字母（要有語音） */
function q1Listen(useConfusing) {
  const { answer, others } = useConfusing
    ? confusingPair()
    : { answer: pick(LETTERS), others: [] };

  return {
    promptHtml: `
      <button class="speak-btn" data-say="${answer}" type="button" aria-label="再聽一次">🔊</button>
      <div class="q-expr">聽聽看，是哪一個字母？</div>`,
    options: optionsOf(answer, others),
    say: answer,
  };
}

/** 字母順序 */
function q1Sequence() {
  const i = rnd(LETTERS.length - 3);
  const seq = LETTERS.slice(i, i + 4);
  const miss = 1 + rnd(2);
  const answer = seq[miss];
  const shown = seq.map((c, k) => (k === miss ? '□' : c)).join('　');
  return {
    promptHtml: `
      <div class="letter-row">${shown}</div>
      <div class="q-expr">中間少了哪一個？</div>`,
    options: optionsOf(answer, [seq[miss === 1 ? 2 : 1]]),
    sayZh: '中間少了哪一個',
  };
}

/* --- Level 2：聽發音 --- */

/** 聽單字選開頭字母（唸整個單字，不唸音素）
    單字本身也要看得見，只把開頭那個字母遮起來，
    不然沒聽清楚的時候畫面上等於什麼題目都沒有。 */
function q2Word() {
  const letter = pick(WORD_LETTERS);
  const [word] = wordOf(letter);
  const masked = '_' + word.slice(1);
  return {
    promptHtml: `
      <button class="speak-btn" data-say="${word}" type="button" aria-label="再聽一次">🔊</button>
      <div class="word-masked">${masked}</div>
      <div class="q-expr">這個字是哪個字母開頭？</div>`,
    options: optionsOf(letter),
    say: word,
  };
}

/** 看圖選字母 */
function q2Pic() {
  const letter = pick(WORD_LETTERS);
  const [word, emoji] = wordOf(letter);
  return {
    promptHtml: `
      <div class="pic-big">${emoji}</div>
      <div class="q-expr">${word} 是哪個字母開頭？</div>`,
    options: optionsOf(letter),
    say: hasVoice ? word : null,
  };
}

/* ================= 出題 ================= */

function makeQuestion(index) {
  if (randomMode) {
    const pool = hasVoice
      ? [q1Case, q1Listen, q1Sequence, q2Word, q2Pic]
      : [q1Case, q1Sequence, q2Pic];
    const fn = pick(pool);
    return fn === q1Case || fn === q1Listen ? fn(rnd(2) === 0) : fn();
  }

  const useConfusing = index < CONFUSING_QUOTA;

  if (state.level === 1) {
    if (useConfusing) return hasVoice ? pick([q1Case, q1Listen])(true) : q1Case(true);
    const pool = hasVoice ? [q1Case, q1Case, q1Listen, q1Sequence] : [q1Case, q1Case, q1Sequence];
    return pick(pool)(false);
  }

  // Level 2：有語音就聽單字與看圖交替，沒語音只出看圖
  if (!hasVoice) return q2Pic();
  return index % 2 === 0 ? q2Word() : q2Pic();
}

/* ================= 畫面 ================= */

function renderHead() {
  const note = randomMode
    ? '什麼題型都會出現，輕鬆玩！'
    : state.level === 1
      ? `再連續 ${Math.max(0, 2 - state.streak)} 輪全對就解鎖新玩法`
      : (hasVoice ? '聽聽看，選出開頭的字母' : '這台裝置沒有英文語音，改成看圖選字母');

  el.head.innerHTML = `
    <span class="level-chip${randomMode ? ' random' : ''}">${randomMode ? '🎲 隨機模式' : LEVEL_NAME[state.level]}</span>
    <span class="eng-note">${note}</span>
    <button class="kid-btn plain mode-btn" id="btnMode" type="button">
      ${randomMode ? '← 回到關卡' : '🎲 隨機模式'}
    </button>
  `;
  el.head.querySelector('#btnMode').addEventListener('click', () => {
    randomMode = !randomMode;
    renderHead();
    quiz.start();
  });
}

function startRound() {
  renderHead();
  quiz = createQuizView(el.quiz, {
    roundSize: ROUND,
    makeQuestion,
    buddy: '🐧',
    onSpeak: t => speech.say(t, 'en'),
    onDone: () => { renderHead(); quiz.start(); },
    onFinish({ correct, total }) {
      if (!randomMode && state.level === 1) {
        state.streak = correct === total ? state.streak + 1 : 0;
        if (state.streak >= 2) { state.level = 2; state.streak = 0; }
        saveState();
      }
      const gained = correct === total ? 2 : 1;
      stars.add('english', gained);
      return gained;
    },
  });
  quiz.start();
}

/* ================= 模組介面 ================= */

export default {
  id: 'english',
  title: '英文練習',
  icon: '🔤',

  mount(container) {
    if (built) return;
    loadState();
    container.innerHTML = `
      <div class="eng-head" id="engHead"></div>
      <div id="engQuiz"><p class="side-note">正在準備發音…</p></div>
    `;
    el = {
      head: container.querySelector('#engHead'),
      quiz: container.querySelector('#engQuiz'),
    };
    built = true;

    speech.prepare().then(ok => {
      hasVoice = ok.en;
      startRound();
    });
  },

  unmount() {
    quiz?.pause();
    speech.stop();
  },
};
