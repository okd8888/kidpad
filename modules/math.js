/* 算術練習 — S1：Level 2（10 以內加減）
   起點設在這一級，因為小朋友 10 以內加減已經會了（見 docs/CONTENT-PLAN.md）。
   Level 1 後備題庫與升降級規則排在 S2。 */

import { createQuizView } from '../lib/quiz-ui.js';
import { stars } from '../lib/stars.js';

const ROUND = 6;
const PICS = ['🍎', '🍪', '🐟', '🎈', '⭐', '🚗'];

let built = false;
let quiz = null;

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];
const repeat = (emoji, n) => emoji.repeat(n);

/* ---------- 四種題型 ---------- */

function addPic() {
  const a = 1 + rnd(5);
  const b = 1 + rnd(Math.min(5, 10 - a));
  const pic = pick(PICS);
  return {
    answer: a + b,
    promptHtml: `
      <div class="q-row">
        <span class="q-pic">${repeat(pic, a)}</span>
        <span class="q-op">＋</span>
        <span class="q-pic">${repeat(pic, b)}</span>
      </div>
      <div class="q-expr">${a} ＋ ${b} ＝ ?</div>`,
  };
}

function subPic() {
  const a = 3 + rnd(8);            // 3..10
  const b = 1 + rnd(a - 1);        // 1..a-1
  const pic = pick(PICS);
  return {
    answer: a - b,
    promptHtml: `
      <div class="q-row">
        <span class="q-pic">${repeat(pic, a - b)}<span class="eaten">${repeat(pic, b)}</span></span>
      </div>
      <div class="q-expr">${a} － ${b} ＝ ?</div>`,
  };
}

function plain() {
  if (rnd(2)) {
    const a = 1 + rnd(9);
    const b = 1 + rnd(10 - a);
    return { answer: a + b, promptHtml: `<div class="q-expr big">${a} ＋ ${b} ＝ ?</div>` };
  }
  const a = 2 + rnd(9);
  const b = 1 + rnd(a - 1);
  return { answer: a - b, promptHtml: `<div class="q-expr big">${a} － ${b} ＝ ?</div>` };
}

function makeTen() {
  const a = 1 + rnd(9);
  return { answer: 10 - a, promptHtml: `<div class="q-expr big">${a} ＋ ? ＝ 10</div>` };
}

const TYPES = [addPic, addPic, subPic, subPic, plain, makeTen];

/* ---------- 出題 ---------- */

/** 兩個干擾選項：答案附近的數字，不重複、不為負 */
function optionsFor(answer) {
  const set = new Set([answer]);
  while (set.size < 3) {
    const delta = [-2, -1, 1, 2][rnd(4)];
    const v = answer + delta;
    if (v >= 0 && v <= 20) set.add(v);
  }
  return [...set]
    .sort(() => Math.random() - 0.5)
    .map(v => ({ text: String(v), correct: v === answer }));
}

const usedThisRound = new Set();

function makeQuestion(index) {
  if (index === 0) usedThisRound.clear();

  let q;
  for (let tries = 0; tries < 20; tries++) {
    q = pick(TYPES)();
    const key = q.promptHtml;
    if (!usedThisRound.has(key)) { usedThisRound.add(key); break; }
  }

  return { promptHtml: q.promptHtml, options: optionsFor(q.answer) };
}

/* ---------- 模組介面 ---------- */

export default {
  id: 'math',
  title: '算術練習',
  icon: '➕',

  mount(container) {
    if (built) return;          // 切回來時畫面和進度都還在
    quiz = createQuizView(container, {
      roundSize: ROUND,
      makeQuestion,
      onFinish({ correct, total }) {
        const gained = correct === total ? 2 : 1;
        stars.add('math', gained);
        return gained;
      },
    });
    quiz.start();
    built = true;
  },

  unmount() {
    quiz?.pause();
  },
};
