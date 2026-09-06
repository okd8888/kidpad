/* 算術練習
   S1：Level 2（10 以內加減）
   S2：關卡地圖、Level 3（20 以內進退位，十格框）、升降級、Level 1 後備題庫
   內容設計見 docs/CONTENT-PLAN.md */

import { createQuizView } from '../lib/quiz-ui.js';
import { stars } from '../lib/stars.js';
import { store } from '../lib/storage.js';

const ROUND       = 6;   // 一關幾題
const STAGES      = 5;   // 一張地圖幾關
const START_LEVEL = 2;   // 起點：10 以內加減
const MAX_LEVEL   = 3;
const KEY = 'kidpad.math.progress';

const LEVEL_NAME = {
  1: '數一數、比大小',
  2: '10 以內加減',
  3: '20 以內進位退位',
};

const PICS = ['🍎', '🍪', '🐟', '🎈', '⭐', '🚗'];

let built = false;
let el = null;
let quiz = null;
let stage = 0;        // 目前正在打第幾關（0-based）
let hopFrom = -1;     // 上一關的位置，用來播前進動畫

/** { level, cleared: {2:0,3:0}, bias } bias 為 -1 時下一關出簡單一點的題 */
let state = null;

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];
const repeat = (emoji, n) => emoji.repeat(n);

function loadState() {
  state = store.get(KEY, null) || { level: START_LEVEL, cleared: {}, bias: 0 };
  state.cleared = state.cleared || {};
}
function saveState() { store.set(KEY, state); }

const clearedCount = lv => state.cleared[lv] || 0;

/* ================= 題庫 ================= */

/* --- Level 1：數與量（降級後備） --- */
function l1Count() {
  const n = 3 + rnd(8);
  const pic = pick(PICS);
  return {
    answer: n,
    promptHtml: `
      <div class="q-row"><span class="q-pic">${repeat(pic, n)}</span></div>
      <div class="q-expr">有幾個？</div>`,
  };
}

function l1Compare() {
  let a = 1 + rnd(9), b = 1 + rnd(9);
  while (a === b) b = 1 + rnd(9);
  const pic = pick(PICS);
  return {
    answer: Math.max(a, b),
    promptHtml: `
      <div class="q-row"><span class="q-pic">${repeat(pic, a)}</span></div>
      <div class="q-row"><span class="q-pic">${repeat(pic, b)}</span></div>
      <div class="q-expr">哪一邊比較多？選比較多的數字</div>`,
    fixedOptions: [a, b],
  };
}

function l1Sequence() {
  const start = 1 + rnd(6);
  const miss = 1 + rnd(2);            // 缺第 2 或第 3 個
  const seq = [start, start + 1, start + 2, start + 3];
  const answer = seq[miss];
  const shown = seq.map((v, i) => (i === miss ? '□' : v)).join('、');
  return { answer, promptHtml: `<div class="q-expr big">${shown}</div>` };
}

/* --- Level 2：10 以內加減 --- */
function l2AddPic() {
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

function l2SubPic() {
  const a = 3 + rnd(8);
  const b = 1 + rnd(a - 1);
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

function l2Plain() {
  if (rnd(2)) {
    const a = 1 + rnd(9);
    const b = 1 + rnd(10 - a);
    return { answer: a + b, promptHtml: `<div class="q-expr big">${a} ＋ ${b} ＝ ?</div>` };
  }
  const a = 2 + rnd(9);
  const b = 1 + rnd(a - 1);
  return { answer: a - b, promptHtml: `<div class="q-expr big">${a} － ${b} ＝ ?</div>` };
}

function l2MakeTen() {
  const a = 1 + rnd(9);
  return { answer: 10 - a, promptHtml: `<div class="q-expr big">${a} ＋ ? ＝ 10</div>` };
}

/* --- Level 3：20 以內進位退位（十格框） --- */

/** 一個十格框：filled 個填色，其中最後 crossed 個畫成拿走 */
function tenFrame(filled, tone, crossed = 0) {
  let cells = '';
  for (let i = 0; i < 10; i++) {
    let cls = 'cell';
    if (i < filled) cls += ` on ${tone}`;
    if (i >= filled - crossed && i < filled) cls += ' off';
    cells += `<span class="${cls}"></span>`;
  }
  return `<div class="tf">${cells}</div>`;
}

function l3Split() {
  const total = 6 + rnd(5);           // 6..10
  const a = 1 + rnd(total - 1);
  return {
    answer: total - a,
    promptHtml: `<div class="q-expr big">把 ${total} 拆成 ${a} 和 ?</div>`,
  };
}

function l3CarryAdd() {
  const a = 5 + rnd(5);               // 5..9
  const b = Math.max(11 - a, 1) + rnd(9 - Math.max(11 - a, 1) + 1);  // 讓 a+b > 10
  return {
    answer: a + b,
    promptHtml: `
      <div class="ten-frames">${tenFrame(a, 'blue')}${tenFrame(b, 'orange')}</div>
      <div class="q-expr">${a} ＋ ${b} ＝ ?</div>`,
  };
}

function l3BorrowSub() {
  const a = 11 + rnd(8);              // 11..18
  const ones = a - 10;
  const b = ones + 1 + rnd(9 - ones); // 個位不夠減，要退位
  const second = a - 10;
  return {
    answer: a - b,
    promptHtml: `
      <div class="ten-frames">${tenFrame(10, 'blue', Math.max(0, b - second))}${tenFrame(second, 'blue', Math.min(b, second))}</div>
      <div class="q-expr">${a} － ${b} ＝ ?</div>`,
  };
}

const POOL = {
  1: [l1Count, l1Count, l1Compare, l1Sequence],
  2: [l2AddPic, l2AddPic, l2SubPic, l2SubPic, l2Plain, l2MakeTen],
  3: [l3CarryAdd, l3CarryAdd, l3BorrowSub, l3Split],
};

/* ================= 出題 ================= */

function optionsFor(answer, fixed) {
  if (fixed) {
    return fixed
      .sort(() => Math.random() - 0.5)
      .map(v => ({ text: String(v), correct: v === answer }));
  }
  const set = new Set([answer]);
  while (set.size < 3) {
    const v = answer + [-2, -1, 1, 2][rnd(4)];
    if (v >= 0 && v <= 20) set.add(v);
  }
  return [...set]
    .sort(() => Math.random() - 0.5)
    .map(v => ({ text: String(v), correct: v === answer }));
}

/** 這一題要用哪一級：地圖等級 + 降級調整；一關內連對 3 題就臨時加難 */
function levelFor(ctx) {
  let lv = state.level + state.bias;
  if (ctx.combo >= 3) lv = state.level + 1;
  return Math.min(MAX_LEVEL, Math.max(1, lv));
}

const usedThisRound = new Set();

function makeQuestion(index, ctx) {
  if (index === 0) usedThisRound.clear();

  const lv = levelFor(ctx);
  let q;
  for (let tries = 0; tries < 20; tries++) {
    q = pick(POOL[lv])();
    if (!usedThisRound.has(q.promptHtml)) { usedThisRound.add(q.promptHtml); break; }
  }
  return { promptHtml: q.promptHtml, options: optionsFor(q.answer, q.fixedOptions) };
}

/* ================= 關卡地圖 ================= */

function renderMap() {
  const lv = state.level;
  const done = clearedCount(lv);
  const nodes = [];

  for (let i = 0; i < STAGES; i++) {
    const isCleared = i < done;
    const isCurrent = i === done;
    const cls = isCleared ? 'cleared' : isCurrent ? 'current' : 'locked';
    const face = isCleared ? '⭐' : isCurrent ? '▶' : '🔒';
    const hero = (i === done && done < STAGES) || (done >= STAGES && i === STAGES - 1)
      ? `<span class="hero${hopFrom >= 0 ? ' hop' : ''}">🦊</span>` : '';
    nodes.push(`
      <button class="node ${cls}" data-stage="${i}" type="button" ${cls === 'locked' ? 'disabled' : ''}>
        ${hero}
        <span class="node-face">${face}</span>
        <span class="node-label">第 ${i + 1} 關</span>
      </button>`);
  }

  const chestOpen = done >= STAGES;
  const nextLv = lv + 1;
  el.map.innerHTML = `
    <h2 class="section-title">${LEVEL_NAME[lv]}　第 ${lv - 1} 張地圖</h2>
    <div class="map-track">
      ${nodes.join('<span class="map-link"></span>')}
      <span class="map-link"></span>
      <div class="node chest ${chestOpen ? 'open' : ''}">
        <span class="node-face">${chestOpen ? '🎉' : '🎁'}</span>
        <span class="node-label">寶箱</span>
      </div>
    </div>
    <p class="map-hint">${
      chestOpen
        ? (nextLv <= MAX_LEVEL
            ? '寶箱打開了！下一張地圖解鎖囉～'
            : '全部通關！你好厲害！')
        : `還有 ${STAGES - done} 關就可以打開寶箱！`
    }</p>
    <div class="map-actions">
      ${chestOpen && nextLv <= MAX_LEVEL
        ? '<button class="kid-btn" id="btnNextMap" type="button">前往下一張地圖 →</button>'
        : ''}
      ${chestOpen
        ? '<button class="kid-btn plain" id="btnReplay" type="button">再玩一次這張地圖</button>'
        : ''}
    </div>
  `;

  el.map.querySelectorAll('.node[data-stage]').forEach(btn => {
    btn.addEventListener('click', () => startStage(+btn.dataset.stage));
  });
  el.map.querySelector('#btnNextMap')?.addEventListener('click', () => {
    state.level = Math.min(MAX_LEVEL, state.level + 1);
    state.bias = 0;
    hopFrom = -1;
    saveState();
    renderMap();
  });
  el.map.querySelector('#btnReplay')?.addEventListener('click', () => {
    state.cleared[state.level] = 0;
    hopFrom = -1;
    saveState();
    renderMap();
  });

  if (hopFrom >= 0) {
    dropStars();
    hopFrom = -1;
  }
}

/** 過關時從天上掉星星 */
function dropStars() {
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('span');
    s.className = 'fall';
    s.textContent = '⭐';
    s.style.left = 5 + Math.random() * 90 + '%';
    s.style.animationDelay = Math.random() * 0.5 + 's';
    el.map.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
    setTimeout(() => s.remove(), 2500);
  }
}

/* ================= 關卡 ================= */

function startStage(i) {
  stage = i;
  el.map.hidden = true;
  el.quiz.hidden = false;

  quiz = createQuizView(el.quiz, {
    roundSize: ROUND,
    makeQuestion,
    doneLabel: '回到地圖',
    onDone: backToMap,
    onFinish({ correct, total }) {
      const wrong = total - correct;
      state.bias = wrong >= 2 ? -1 : 0;              // 下一關安靜地換簡單題
      const done = clearedCount(state.level);
      if (stage === done) state.cleared[state.level] = done + 1;
      saveState();

      const gained = correct === total ? 2 : 1;
      stars.add('math', gained);
      return gained;
    },
  });
  quiz.start();
}

function backToMap() {
  quiz?.pause();
  quiz = null;
  el.quiz.hidden = true;
  el.quiz.innerHTML = '';
  el.map.hidden = false;
  hopFrom = stage;                                    // 讓角色播前進動畫
  renderMap();
}

/* ================= 模組介面 ================= */

export default {
  id: 'math',
  title: '算術練習',
  icon: '➕',

  mount(container) {
    if (built) return;
    loadState();
    container.innerHTML = `
      <div class="map-wrap" id="mathMap"></div>
      <div id="mathQuiz" hidden></div>
    `;
    el = {
      map:  container.querySelector('#mathMap'),
      quiz: container.querySelector('#mathQuiz'),
    };
    renderMap();
    built = true;
  },

  unmount() {
    quiz?.pause();
  },
};
