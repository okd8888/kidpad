/* 分級選擇題模組的共用骨架
   注音、時鐘、錢幣三個模組長得一樣：一級一種題型、連續兩輪全對升一級、
   右上角一顆「🎲 隨機模式」不限題數。差別只有題庫，所以抽出來共用。

   用法：
     export default createLeveledModule({
       id, title, icon, storeKey, intro, buddy,
       levels: [{ name, note, make(index) }, ...],
     });
   make(index) 回傳 quiz-ui 的題目物件 { promptHtml, options, sayZh?, hintHtml? } */

import { createQuizView } from './quiz-ui.js';
import { stars } from './stars.js';
import { store } from './storage.js';
import { speech } from './speech.js';

const ROUND = 6;          // 一輪幾題
const LEVEL_UP_STREAK = 2; // 連續幾輪全對升一級

export function createLeveledModule(cfg) {
  const { id, title, icon, storeKey, intro, buddy, levels, roundSize = ROUND } = cfg;

  let built = false;
  let el = null;
  let quiz = null;
  let randomMode = false;
  let state = null;

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const current = () => levels[Math.min(state.level, levels.length - 1)];

  function loadState() {
    state = store.get(storeKey, null) || { level: 0, streak: 0 };
  }
  function saveState() { store.set(storeKey, state); }

  function makeQuestion(index, ctx) {
    return randomMode
      ? pick(levels).make(index, ctx)
      : current().make(index, ctx);
  }

  function renderHead() {
    const lv = current();
    const last = state.level >= levels.length - 1;
    const note = randomMode
      ? '什麼題型都會出現，輕鬆玩！'
      : last
        ? lv.note
        : `${lv.note}　·　再連續 ${Math.max(0, LEVEL_UP_STREAK - state.streak)} 輪全對就升級`;

    el.head.innerHTML = `
      <span class="level-chip${randomMode ? ' random' : ''}">${randomMode ? '🎲 隨機模式' : lv.name}</span>
      <span class="eng-note">${note}</span>
      <button class="kid-btn plain mode-btn" type="button">
        ${randomMode ? '← 回到關卡' : '🎲 隨機模式'}
      </button>
    `;
    el.head.querySelector('.mode-btn').addEventListener('click', () => {
      randomMode = !randomMode;
      quiz?.pause();
      startRound();
    });
  }

  function startRound() {
    renderHead();

    const common = { makeQuestion, buddy };

    quiz = randomMode
      ? createQuizView(el.quiz, {
          ...common,
          endless: true,
          onQuit: () => { randomMode = false; quiz?.pause(); startRound(); },
          onMilestone: () => stars.add(id, 1),      // 每答對 5 題一顆星
        })
      : createQuizView(el.quiz, {
          ...common,
          roundSize,
          onDone: () => { renderHead(); quiz.start(); },
          onFinish({ correct, total }) {
            if (state.level < levels.length - 1) {
              state.streak = correct === total ? state.streak + 1 : 0;
              if (state.streak >= LEVEL_UP_STREAK) { state.level++; state.streak = 0; }
              saveState();
            }
            const gained = correct === total ? 2 : 1;
            stars.add(id, gained);
            return gained;
          },
        });
    quiz.start();
  }

  return {
    id, title, icon,

    mount(container) {
      if (built) return;
      loadState();
      container.innerHTML = `
        <div class="lvl-head" id="lvlHead"></div>
        <div id="lvlQuiz"></div>
      `;
      el = {
        head: container.querySelector('#lvlHead'),
        quiz: container.querySelector('#lvlQuiz'),
      };
      built = true;
      startRound();
      if (intro) speech.prepare().then(() => speech.zh(intro));
    },

    unmount() {
      quiz?.pause();
      speech.stop();
    },
  };
}
