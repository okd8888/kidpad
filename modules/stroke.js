/* 筆劃練習模組
   介面：{ id, title, icon, mount(container), unmount() }
   狀態（練習清單、目前選的字）存在 localStorage 與模組變數裡，
   切到別的模組再切回來不會重來。 */

import { store } from '../lib/storage.js';
import { sound } from '../lib/sound.js';
import { loadCharData } from '../lib/hanzi-data.js';
import { stars } from '../lib/stars.js';

const KEY_CHARS   = 'kidpad.stroke.chars';
const KEY_RECORDS = 'kidpad.stroke.records';
const KEY_CURRENT = 'kidpad.stroke.current';

/* 第一次打開時的預設練習字，讓畫面不是空的 */
const DEFAULT_CHARS = ['大', '小', '人', '口'];

let el = null;          // 這個模組的 panel
let built = false;      // DOM 只建一次
let writer = null;      // HanziWriter 實例
let currentChar = null;
let quizzing = false;

let chars   = [];
let records = {};

/* ---------- 資料 ---------- */
function loadState() {
  chars   = store.get(KEY_CHARS, null) || DEFAULT_CHARS.slice();
  records = store.get(KEY_RECORDS, {}) || {};
  currentChar = store.get(KEY_CURRENT, null) || chars[0] || null;
}

function saveChars()   { store.set(KEY_CHARS, chars); }
function saveRecords() { store.set(KEY_RECORDS, records); }

function starsOf(char) {
  const n = records[char]?.count || 0;
  if (!n) return '';
  return '⭐'.repeat(Math.min(5, n));
}

/* ---------- 畫面 ---------- */
function buildDom() {
  el.innerHTML = `
    <div class="stroke-layout">
      <div class="stroke-main">
        <div class="writer-box" id="writerBox">
          <div class="writer-placeholder" id="writerHint">先在右邊選一個字吧！</div>
        </div>
        <div class="stroke-tip" id="strokeTip"></div>
        <div class="stroke-actions">
          <button class="kid-btn sky"  id="btnDemo"  type="button">👀 看一次</button>
          <button class="kid-btn mint" id="btnQuiz"  type="button">✍️ 我來寫</button>
          <button class="kid-btn plain" id="btnAgain" type="button">↻ 重來</button>
        </div>
      </div>

      <aside class="stroke-side">
        <div>
          <h2 class="section-title">今日練習清單</h2>
          <div class="add-row">
            <input class="kid-input" id="charInput" type="text" inputmode="text"
                   placeholder="輸入要練的字" maxlength="10" aria-label="輸入要練習的字">
            <button class="kid-btn" id="btnAdd" type="button">加入</button>
          </div>
          <p class="side-note" id="addNote">可以一次輸入名字，例如「小明」。</p>
        </div>

        <div class="card-list" id="cardList"></div>

        <div class="confirm-bar" id="confirmBar" hidden>
          <span id="confirmText"></span>
          <button class="kid-btn plain" id="confirmNo"  type="button">不要</button>
          <button class="kid-btn"       id="confirmYes" type="button">刪掉</button>
        </div>
      </aside>
    </div>

    <div class="reward" id="reward" hidden>
      <div class="reward-inner">
        <div class="reward-emoji">🌟</div>
        <div class="reward-text" id="rewardText">好棒！寫完了！</div>
        <button class="kid-btn mint" id="rewardNext" type="button">再寫一次</button>
      </div>
    </div>
  `;

  el.querySelector('#btnAdd').addEventListener('click', addFromInput);
  el.querySelector('#charInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addFromInput();
  });
  el.querySelector('#btnDemo').addEventListener('click', playDemo);
  el.querySelector('#btnQuiz').addEventListener('click', startQuiz);
  el.querySelector('#btnAgain').addEventListener('click', startQuiz);
  el.querySelector('#rewardNext').addEventListener('click', () => {
    hideReward();
    startQuiz();
  });
  el.querySelector('#confirmNo').addEventListener('click', hideConfirm);
}

function renderList() {
  const list = el.querySelector('#cardList');
  list.innerHTML = '';

  chars.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'char-card' + (ch === currentChar ? ' active' : '');
    card.innerHTML =
      `<div class="glyph">${ch}</div>` +
      `<div class="stars">${starsOf(ch)}</div>` +
      `<button class="del" type="button" aria-label="刪掉 ${ch}">✕</button>`;

    card.addEventListener('click', e => {
      if (e.target.classList.contains('del')) {
        askDelete(ch);
        return;
      }
      selectChar(ch);
    });
    list.appendChild(card);
  });

  if (!chars.length) {
    list.innerHTML = '<p class="side-note">清單是空的，在上面輸入想練的字。</p>';
  }
}

function setTip(text, kind = 'good') {
  const tip = el.querySelector('#strokeTip');
  tip.textContent = text;
  tip.classList.toggle('hint', kind === 'hint');
}

/* ---------- 新增 / 刪除 ---------- */
function addFromInput() {
  const input = el.querySelector('#charInput');
  const note  = el.querySelector('#addNote');
  const raw   = input.value.trim();

  const found = raw.match(/[一-鿿]/g) || [];
  if (!found.length) {
    note.textContent = '請輸入中文字喔（例如：明）。';
    return;
  }

  let added = 0;
  found.forEach(ch => {
    if (!chars.includes(ch)) { chars.push(ch); added++; }
  });

  saveChars();
  input.value = '';
  note.textContent = added
    ? `加入了 ${added} 個字！`
    : '這些字已經在清單裡了。';

  renderList();
  if (!currentChar) selectChar(chars[0]);
}

let pendingDelete = null;

function askDelete(ch) {
  pendingDelete = ch;
  el.querySelector('#confirmText').textContent = `要把「${ch}」從清單刪掉嗎？`;
  el.querySelector('#confirmBar').hidden = false;
  el.querySelector('#confirmYes').onclick = () => {
    chars = chars.filter(c => c !== pendingDelete);
    saveChars();
    if (currentChar === pendingDelete) {
      currentChar = chars[0] || null;
      store.set(KEY_CURRENT, currentChar);
      currentChar ? mountWriter(currentChar) : clearWriter();
    }
    hideConfirm();
    renderList();
  };
}

function hideConfirm() {
  pendingDelete = null;
  el.querySelector('#confirmBar').hidden = true;
}

/* ---------- 寫字區 ---------- */
function clearWriter() {
  if (writer) { try { writer.cancelQuiz(); } catch {} }
  writer = null;
  quizzing = false;
  const box = el.querySelector('#writerBox');
  box.innerHTML = '<div class="writer-placeholder">先在右邊選一個字吧！</div>';
  setTip('');
}

function selectChar(ch) {
  if (ch === currentChar && writer) return;
  currentChar = ch;
  store.set(KEY_CURRENT, ch);
  renderList();
  mountWriter(ch);
}

function boxSize() {
  const box = el.querySelector('#writerBox');
  const w = box.clientWidth || 380;
  return Math.max(240, Math.min(420, w - 16));
}

function mountWriter(ch) {
  const box = el.querySelector('#writerBox');
  box.innerHTML = '<div class="writer-placeholder">正在準備這個字…</div>';
  quizzing = false;

  const size = boxSize();
  const target = document.createElement('div');
  box.innerHTML = '';
  box.appendChild(target);

  writer = HanziWriter.create(target, ch, {
    width: size,
    height: size,
    padding: 12,
    showCharacter: false,
    showOutline: true,
    strokeAnimationSpeed: 0.5,      // 慢一點，小朋友看得清楚
    delayBetweenStrokes: 500,
    strokeColor: '#f08c00',
    outlineColor: '#e6dccb',        // 淡灰的描紅底稿
    drawingColor: '#2ec4b6',
    highlightColor: '#ffd166',      // 提示用暖黃，不用紅色
    drawingWidth: 26,
    showHintAfterMisses: 3,
    highlightOnComplete: true,
    charDataLoader: (char, onComplete, onError) => {
      loadCharData(char).then(onComplete).catch(err => {
        box.innerHTML =
          '<div class="writer-placeholder">找不到這個字的筆順資料。<br>' +
          '第一次練新的字需要連上網路喔。</div>';
        onError?.(err);
      });
    },
  });

  setTip('按「看一次」看老師怎麼寫。');
}

function playDemo() {
  if (!writer) return;
  quizzing = false;
  try { writer.cancelQuiz(); } catch {}
  setTip('看清楚每一筆的順序～');
  writer.animateCharacter({
    onComplete: () => setTip('換你了！按「我來寫」。'),
  });
}

function startQuiz() {
  if (!writer) return;
  hideReward();
  quizzing = true;
  setTip('用手指或滑鼠描描看！');

  writer.quiz({
    onCorrectStroke: info => {
      sound.good();
      const left = info.strokesRemaining;
      setTip(left > 0 ? `很好！還剩 ${left} 筆` : '最後一筆完成！');
    },
    onMistake: () => {
      sound.hint();
      setTip('這一筆再試一次，慢慢來～', 'hint');
    },
    onComplete: () => {
      quizzing = false;
      recordDone(currentChar);
      sound.win();
      showReward();
    },
  });
}

function recordDone(ch) {
  if (!ch) return;
  const rec = records[ch] || { count: 0, last: 0 };
  rec.count += 1;
  rec.last = Date.now();
  records[ch] = rec;
  saveRecords();
  stars.add('stroke', 1);        // 寫完一個字 = 1 顆星
  renderList();
}

function showReward() {
  const n = records[currentChar]?.count || 1;
  el.querySelector('#rewardText').textContent = `好棒！「${currentChar}」寫完 ${n} 次了！`;
  el.querySelector('#reward').hidden = false;
}

function hideReward() {
  const r = el.querySelector('#reward');
  if (r) r.hidden = true;
}

/* ---------- 模組介面 ---------- */
export default {
  id: 'stroke',
  title: '筆劃練習',
  icon: '✍️',

  mount(container) {
    el = container;
    if (!built) {
      loadState();
      buildDom();
      renderList();
      if (currentChar) mountWriter(currentChar);
      built = true;
      return;
    }
    // 切回來：DOM 和清單都還在，只要把中斷的描紅重新接上
    if (currentChar && writer && !quizzing) {
      setTip('歡迎回來！按「我來寫」繼續。');
    }
  },

  unmount() {
    if (writer) { try { writer.cancelQuiz(); } catch {} }
    quizzing = false;
    saveChars();
    saveRecords();
  },
};
