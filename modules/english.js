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

/** 字母 → 代表單字與圖 */
const WORDS = {
  A: ['apple', '🍎'],  B: ['ball', '⚽'],   C: ['cat', '🐱'],     D: ['dog', '🐶'],
  E: ['egg', '🥚'],    F: ['fish', '🐟'],   G: ['goat', '🐐'],    H: ['hat', '🎩'],
  I: ['ice', '🧊'],    J: ['juice', '🧃'],  K: ['kite', '🪁'],    L: ['lion', '🦁'],
  M: ['moon', '🌙'],   N: ['nose', '👃'],   O: ['orange', '🍊'],  P: ['pig', '🐷'],
  Q: ['queen', '👑'],  R: ['rabbit', '🐰'], S: ['sun', '☀️'],     T: ['tiger', '🐯'],
  U: ['umbrella', '☂️'], V: ['van', '🚐'],  W: ['water', '💧'],   X: ['box', '📦'],
  Y: ['yoyo', '🪀'],   Z: ['zoo', '🦓'],
};

const LETTERS = Object.keys(WORDS);

const LEVEL_NAME = {
  1: 'Level 1 · 認字母',
  2: 'Level 2 · 聽發音',
};

let built = false;
let el = null;
let quiz = null;
let hasVoice = false;
let state = null;

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

function loadState() {
  state = store.get(KEY, null) || { level: 1, streak: 0 };
}
function saveState() { store.set(KEY, state); }

/* ================= 題庫 ================= */

/** 從易混淆組挑一個字母，並用同組的當干擾選項 */
function confusingPair() {
  const group = pick(CONFUSING);
  const answer = pick(group);
  const others = group.filter(c => c !== answer);
  return { answer, others };
}

function optionsOf(answer, others = []) {
  const set = new Set([answer, ...others]);
  while (set.size < 3) {
    const c = pick(LETTERS);
    const v = answer === answer.toLowerCase() ? c.toLowerCase() : c;
    set.add(v);
  }
  return [...set]
    .slice(0, 3)
    .sort(() => Math.random() - 0.5)
    .map(v => ({ text: v, correct: v === answer }));
}

/* --- Level 1 --- */

/** 大小寫配對：看大寫選小寫 */
function q1Case(useConfusing) {
  const { answer, others } = useConfusing
    ? confusingPair()
    : { answer: pick(LETTERS).toLowerCase(), others: [] };

  const lower = answer.toLowerCase();
  const upper = answer.toUpperCase();
  return {
    promptHtml: `
      <div class="letter-big">${upper}</div>
      <div class="q-expr">哪一個是它的小寫？</div>`,
    options: optionsOf(lower, others.map(o => o.toLowerCase())),
    say: hasVoice ? upper : null,
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
  };
}

/* --- Level 2 --- */

/** 聽單字選開頭字母（唸整個單字，不唸音素） */
function q2Word() {
  const letter = pick(LETTERS);
  const [word] = WORDS[letter];
  return {
    promptHtml: `
      <button class="speak-btn" data-say="${word}" type="button" aria-label="再聽一次">🔊</button>
      <div class="q-expr">這個字是哪個字母開頭？</div>`,
    options: optionsOf(letter),
    say: word,
  };
}

/** 看圖選字母 */
function q2Pic() {
  const letter = pick(LETTERS);
  const [word, emoji] = WORDS[letter];
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
  const useConfusing = index < CONFUSING_QUOTA;

  if (state.level === 1) {
    const pool = hasVoice ? [q1Case, q1Case, q1Listen, q1Sequence] : [q1Case, q1Case, q1Sequence];
    const fn = useConfusing ? pick([q1Case, q1Listen].filter(f => hasVoice || f !== q1Listen)) : pick(pool);
    return fn(useConfusing);
  }

  // Level 2：有語音就聽單字與看圖交替，沒語音只出看圖
  if (!hasVoice) return q2Pic();
  return index % 2 === 0 ? q2Word() : q2Pic();
}

/* ================= 畫面 ================= */

function renderHead() {
  const note = state.level === 1
    ? `再連續 ${Math.max(0, 2 - state.streak)} 輪全對就解鎖新玩法`
    : (hasVoice ? '聽聽看，選出開頭的字母' : '這台裝置沒有英文語音，改成看圖選字母');

  el.head.innerHTML = `
    <span class="level-chip">${LEVEL_NAME[state.level]}</span>
    <span class="eng-note">${note}</span>
  `;
}

function startRound() {
  renderHead();
  quiz = createQuizView(el.quiz, {
    roundSize: ROUND,
    makeQuestion,
    buddy: '🐧',
    onSpeak: t => speech.say(t),
    onDone: () => { renderHead(); quiz.start(); },
    onFinish({ correct, total }) {
      if (state.level === 1) {
        state.streak = correct === total ? state.streak + 1 : 0;
        if (state.streak >= 2) { state.level = 2; state.streak = 0; }
      }
      saveState();

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
      hasVoice = ok;
      startRound();
    });
  },

  unmount() {
    quiz?.pause();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  },
};
