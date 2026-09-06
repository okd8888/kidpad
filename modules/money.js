/* 認識錢幣 —— 拖硬幣湊金額
   給一個目標金額，小朋友把 1、5、10、50 元硬幣拖進盤子裡湊出來。
   選擇題只能練「認得幣值」，用拖的才練得到「怎麼湊」。
   拖曳用 pointer events 自己做（HTML5 drag&drop 在平板上不好用）；
   拖不動的時候點一下硬幣也會放進去，不會卡住。 */

import { stars } from '../lib/stars.js';
import { store } from '../lib/storage.js';
import { speech } from '../lib/speech.js';
import { sound } from '../lib/sound.js';

const KEY = 'kidpad.money.progress';
const ROUND = 5;          // 一輪幾題
const IDLE_MS = 15000;

/** 面額 → 畫多大、什麼顏色 */
const COINS = [
  { value: 1,  r: 26, face: '#d7dade', edge: '#a9aeb5' },
  { value: 5,  r: 30, face: '#d7dade', edge: '#a9aeb5' },
  { value: 10, r: 34, face: '#d7dade', edge: '#a9aeb5' },
  { value: 50, r: 38, face: '#e8c46a', edge: '#c39a2e' },
];

const LEVELS = [
  { name: 'Level 1 · 湊 20 以內', note: '用 1 元、5 元、10 元湊湊看', coins: [1, 5, 10],     min: 3,  max: 20 },
  { name: 'Level 2 · 湊 50 以內', note: '50 元也可以用了',            coins: [1, 5, 10, 50], min: 15, max: 50 },
  { name: 'Level 3 · 湊 99 以內', note: '想想看怎麼湊最快',            coins: [1, 5, 10, 50], min: 40, max: 99 },
];

let built = false;
let el = null;
let state = null;         // { level, streak }
let randomMode = false;

let goal = 0;             // 這一題要湊多少
let tray = [];            // 盤子裡的硬幣
let index = 0;            // 這一輪第幾題
let cleared = 0;          // 這一輪一次就湊對幾題
let firstTry = true;
let idleTimer = null;

const rnd = n => Math.floor(Math.random() * n);
const sum = list => list.reduce((a, b) => a + b, 0);
const coinOf = v => COINS.find(c => c.value === v);
const level = () => LEVELS[Math.min(state.level, LEVELS.length - 1)];

function loadState() { state = store.get(KEY, null) || { level: 0, streak: 0 }; }
function saveState() { store.set(KEY, state); }

/* ================= 硬幣 ================= */

function coinSvg(value) {
  const c = coinOf(value);
  const size = c.r * 2 + 8;
  return `
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${c.r}" fill="${c.face}" stroke="${c.edge}" stroke-width="4" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${c.r - 6}" fill="none" stroke="${c.edge}" stroke-width="2" opacity=".6" />
      <text x="${size / 2}" y="${size / 2 + 10}" text-anchor="middle"
            font-size="${c.r > 30 ? 28 : 24}" font-weight="800" fill="#3d3630">${value}</text>
    </svg>`;
}

function coinEl(value, kind) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `coin-btn ${kind}`;
  b.dataset.value = value;
  b.setAttribute('aria-label', `${value} 元`);
  b.innerHTML = coinSvg(value);
  return b;
}

/* ================= 出題 ================= */

function newQuestion() {
  const lv = level();
  const span = lv.max - lv.min + 1;
  let next = lv.min + rnd(span);
  if (next === goal) next = lv.min + rnd(span);      // 不要連續出一樣的
  goal = next;
  tray = [];
  firstTry = true;
  render();
  speech.prepare().then(() => speech.zh(`湊出 ${goal} 元`));
  armIdle();
}

/* ================= 畫面 ================= */

function render() {
  const lv = level();
  const total = sum(tray);

  el.head.innerHTML = `
    <span class="level-chip${randomMode ? ' random' : ''}">${randomMode ? '🎲 隨機模式' : lv.name}</span>
    <span class="eng-note">${randomMode ? '一直湊下去，想停再按結束' : lv.note}</span>
    <button class="kid-btn plain mode-btn" type="button">${randomMode ? '← 回到關卡' : '🎲 隨機模式'}</button>
  `;
  el.head.querySelector('.mode-btn').addEventListener('click', toggleMode);

  el.bar.innerHTML = randomMode
    ? `<div class="quiz-stars">⭐ 湊對 ${cleared} 題</div><div class="quiz-count">第 ${index + 1} 題</div>`
    : `<div class="quiz-stars">${'⭐'.repeat(cleared)}${'☆'.repeat(ROUND - cleared)}</div>
       <div class="quiz-count">第 ${index + 1} 題 / 共 ${ROUND} 題</div>`;

  el.goal.innerHTML = `湊出 <b>${goal}</b> 元`;

  // 盤子
  el.tray.innerHTML = tray.length
    ? ''
    : '<p class="tray-hint">把硬幣拖到這裡 👇</p>';
  tray.forEach((v, i) => {
    const c = coinEl(v, 'in-tray');
    c.addEventListener('click', () => removeAt(i));
    el.tray.appendChild(c);
  });

  el.total.innerHTML = total === 0
    ? '還沒放硬幣'
    : `已經放了 <b class="${total > goal ? 'over' : ''}">${total}</b> 元`;

  // 可以拿的硬幣
  el.source.innerHTML = '';
  lv.coins.forEach(v => {
    const c = coinEl(v, 'in-source');
    makeDraggable(c, v);
    el.source.appendChild(c);
  });

  el.actions.innerHTML = tray.length
    ? '<button class="kid-btn plain" id="btnClear" type="button">全部拿掉</button>'
    : '';
  el.actions.querySelector('#btnClear')?.addEventListener('click', clearTray);
}

/* ================= 拖曳 ================= */

function makeDraggable(node, value) {
  node.addEventListener('pointerdown', e => {
    e.preventDefault();
    stopIdle();

    const startX = e.clientX;
    const startY = e.clientY;
    const ghost = node.cloneNode(true);
    ghost.className = 'coin-btn ghost';
    document.body.appendChild(ghost);
    moveGhost(e);

    node.setPointerCapture(e.pointerId);

    function moveGhost(ev) {
      ghost.style.left = ev.clientX + 'px';
      ghost.style.top = ev.clientY + 'px';
    }
    function onMove(ev) {
      moveGhost(ev);
      const over = hitTray(ev);
      el.tray.classList.toggle('over', over);
    }
    function onUp(ev) {
      node.releasePointerCapture(ev.pointerId);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onUp);
      ghost.remove();
      el.tray.classList.remove('over');

      const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY);
      // 拖進盤子，或根本沒拖動（當成點一下）都算放進去
      if (hitTray(ev) || moved < 8) addCoin(value);
    }

    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerup', onUp);
    node.addEventListener('pointercancel', onUp);
  });
}

function hitTray(ev) {
  const r = el.tray.getBoundingClientRect();
  return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
}

/* ================= 盤子 ================= */

function addCoin(value) {
  tray.push(value);
  sound.good();
  render();
  check();
  armIdle();
}

function removeAt(i) {
  tray.splice(i, 1);
  sound.hint();
  render();
  armIdle();
}

function clearTray() {
  tray = [];
  render();
  armIdle();
}

function check() {
  const total = sum(tray);
  if (total === goal) return win();
  if (total > goal) {
    firstTry = false;
    buddySay('太多了，拿掉一些');
  }
}

function win() {
  stopIdle();
  if (firstTry) cleared++;
  sound.win();
  buddySay('湊對了！', 'good');
  el.tray.classList.add('done');

  setTimeout(() => {
    el.tray.classList.remove('done');
    index++;
    if (!randomMode && index >= ROUND) return finishRound();
    if (randomMode && cleared > 0 && cleared % 5 === 0) stars.add('money', 1);
    newQuestion();
  }, 1200);
}

function finishRound() {
  if (state.level < LEVELS.length - 1) {
    state.streak = cleared === ROUND ? state.streak + 1 : 0;
    if (state.streak >= 2) { state.level++; state.streak = 0; }
    saveState();
  }
  const gained = cleared === ROUND ? 2 : 1;
  stars.add('money', gained);

  const text = cleared === ROUND
    ? `全部湊對！拿到 ${gained} 顆星！`
    : `湊對 ${cleared} 題，拿到 ${gained} 顆星！`;
  el.reward.querySelector('.reward-text').textContent = text;
  el.reward.hidden = false;
  speech.zh(text);
}

/* ================= 夥伴與提示 ================= */

function buddySay(text, kind = 'hint') {
  const bubble = el.root.querySelector('.bubble');
  const buddy = el.root.querySelector('.buddy');
  if (bubble) {
    bubble.textContent = text;
    bubble.hidden = false;
    bubble.classList.toggle('good', kind === 'good');
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
  }
  if (buddy) {
    buddy.classList.remove('cheer', 'tilt');
    void buddy.offsetWidth;
    buddy.classList.add(kind === 'good' ? 'cheer' : 'tilt');
  }
  if (kind === 'hint') speech.zh(text);
}

function armIdle() {
  stopIdle();
  idleTimer = setTimeout(() => {
    el.source.querySelectorAll('.coin-btn').forEach(c => c.classList.add('pulse'));
    buddySay('把硬幣拖到盤子裡');
  }, IDLE_MS);
}

function stopIdle() {
  clearTimeout(idleTimer);
  el?.source?.querySelectorAll('.pulse').forEach(c => c.classList.remove('pulse'));
}

/* ================= 模式切換 ================= */

function toggleMode() {
  randomMode = !randomMode;
  index = 0;
  cleared = 0;
  el.reward.hidden = true;
  newQuestion();
}

function startRound() {
  index = 0;
  cleared = 0;
  el.reward.hidden = true;
  newQuestion();
}

/* ================= 模組介面 ================= */

export default {
  id: 'money',
  title: '認識錢幣',
  icon: '💰',

  mount(container) {
    if (built) return;
    loadState();
    container.innerHTML = `
      <div class="money" id="moneyRoot">
        <div class="lvl-head" id="moneyHead"></div>
        <div class="quiz-head" id="moneyBar"></div>

        <div class="money-goal" id="moneyGoal"></div>
        <div class="tray" id="moneyTray"></div>
        <div class="tray-total" id="moneyTotal"></div>

        <p class="tray-label">拖一枚硬幣到盤子裡（點一下也可以）</p>
        <div class="coin-source" id="moneySource"></div>
        <div class="money-actions" id="moneyActions"></div>

        <div class="buddy-wrap">
          <div class="bubble" hidden></div>
          <div class="buddy">🐷</div>
        </div>

        <div class="reward" id="moneyReward" hidden>
          <div class="reward-inner">
            <div class="reward-emoji">🌟</div>
            <div class="reward-text"></div>
            <button class="kid-btn mint reward-btn" type="button">再玩一次</button>
          </div>
        </div>
      </div>
    `;
    el = {
      root:    container.querySelector('#moneyRoot'),
      head:    container.querySelector('#moneyHead'),
      bar:     container.querySelector('#moneyBar'),
      goal:    container.querySelector('#moneyGoal'),
      tray:    container.querySelector('#moneyTray'),
      total:   container.querySelector('#moneyTotal'),
      source:  container.querySelector('#moneySource'),
      actions: container.querySelector('#moneyActions'),
      reward:  container.querySelector('#moneyReward'),
    };
    el.reward.querySelector('.reward-btn').addEventListener('click', startRound);
    built = true;

    startRound();
    speech.prepare().then(() => speech.zh('這裡是湊錢，把硬幣拖到盤子裡'));
  },

  unmount() {
    stopIdle();
    speech.stop();
  },
};
