/* 選擇題骨架：進度列 + 題目區 + 大按鈕選項 + 答對答錯回饋 + 一輪結算
   算術、英文兩個模組共用，出題內容由呼叫端提供。 */

import { sound } from './sound.js';
import { speech } from './speech.js';

const NEXT_DELAY = 800;   // 答對到跳下一題的間隔
const GUARD_DELAY = 300;  // 換題後先擋一下，避免連點的第二下直接落在新題目上
const NUDGE_AFTER = 2;    // 同一題錯幾次之後，把正確答案輕輕點亮
const IDLE_MS = 15000;    // 發呆這麼久就出聲提醒他要做什麼

/**
 * @param {HTMLElement} container 放題目的容器
 * @param {object} opts
 *   roundSize   一輪幾題（endless 模式下不使用）
 *   endless     true = 一直出題不結算，畫面上多一顆「結束」按鈕
 *   onQuit()    endless 模式按下「結束」時做什麼
 *   onMilestone(n) endless 模式每答對 5 題呼叫一次，用來發星星
 *   makeQuestion(index, ctx) ctx = { combo, correctCount }
 *               回傳 { promptHtml, options:[{text, correct}], say?, sayZh?, hintHtml? }
 *               hintHtml = 同一題連錯兩次才顯示的鷹架（例如可以數的圖案）
 *               say   = 題目出現時要唸的英文（需要 onSpeak）
 *               sayZh = 題目出現時要唸的中文（畫面上的題目直接唸出來）
 *   onFinish({ correct, total }) 一輪結束時呼叫，回傳值當作這一輪拿到的星星數
 *   doneLabel   結算畫面的按鈕文字（預設「再玩一次」）
 *   onDone()    按下結算按鈕時做什麼（預設重新開一輪）
 *   buddy       陪在旁邊的小動物 emoji，答對會跳、答錯會歪頭並說話
 *   onSpeak(t)  題目裡按下 [data-say] 的喇叭時要唸什麼；沒給就不處理
 */
export function createQuizView(container, opts) {
  const {
    roundSize = 6, makeQuestion, onFinish, doneLabel, onDone, buddy, onSpeak,
    endless = false, onQuit, onMilestone,
  } = opts;

  const MILESTONE = 5;   // endless 模式每答對幾題給一顆星

  container.innerHTML = `
    <div class="quiz">
      <div class="quiz-head">
        <div class="quiz-stars"></div>
        <div class="quiz-count"></div>
        ${endless ? '<button class="kid-btn plain quit-btn" type="button">結束</button>' : ''}
      </div>

      <div class="combo" hidden></div>

      <div class="quiz-prompt"></div>

      <div class="quiz-hint" hidden></div>

      <div class="quiz-options"></div>

      <div class="quiz-tip"></div>

      ${buddy ? `
        <div class="buddy-wrap">
          <div class="bubble" hidden></div>
          <div class="buddy">${buddy}</div>
        </div>` : ''}

      <div class="reward" hidden>
        <div class="reward-inner">
          <div class="reward-emoji">🌟</div>
          <div class="reward-text"></div>
          <button class="kid-btn mint reward-btn" type="button"></button>
        </div>
      </div>
    </div>
  `;

  const el = {
    stars:   container.querySelector('.quiz-stars'),
    count:   container.querySelector('.quiz-count'),
    combo:   container.querySelector('.combo'),
    prompt:  container.querySelector('.quiz-prompt'),
    options: container.querySelector('.quiz-options'),
    tip:     container.querySelector('.quiz-tip'),
    hint:    container.querySelector('.quiz-hint'),
    reward:  container.querySelector('.reward'),
    buddy:   container.querySelector('.buddy'),
    bubble:  container.querySelector('.bubble'),
    rewardText: container.querySelector('.reward-text'),
  };

  let index = 0;        // 目前第幾題（0-based）
  let correctCount = 0; // 這一輪第一次就答對的題數
  let combo = 0;        // 連對幾題
  let firstTry = true;  // 這一題還沒答錯過
  let wrongHere = 0;    // 這一題錯了幾次
  let locked = false;   // 答對後到跳下一題之間，擋住重複點擊
  let hintHtml = null;  // 這一題的鷹架，卡住才拿出來
  let timer = null;
  let guardTimer = null;
  let idleTimer = null;

  speech.prepare();     // 先把語音清單載起來，之後唸提示才不會第一句沒聲音

  // 題目裡的喇叭按鈕
  if (onSpeak) {
    el.prompt.addEventListener('click', e => {
      const b = e.target.closest('[data-say]');
      if (b) onSpeak(b.dataset.say);
    });
  }

  container.querySelector('.quit-btn')?.addEventListener('click', () => onQuit?.(correctCount));

  const doneBtn = container.querySelector('.reward-btn');
  doneBtn.textContent = doneLabel || '再玩一次';
  doneBtn.addEventListener('click', () => (onDone ? onDone() : start()));

  function start() {
    index = 0;
    correctCount = 0;
    combo = 0;
    hideCombo();
    el.reward.hidden = true;
    showQuestion();
  }

  function showQuestion() {
    firstTry = true;
    wrongHere = 0;
    setTip('');
    hideBubble();

    // 新的一題一律從「都沒選」開始：選項全部重建，並且先擋住 300 毫秒，
    // 這樣連點的第二下不會直接落在新題目同一個位置的按鈕上。
    locked = true;
    clearTimeout(guardTimer);
    guardTimer = setTimeout(() => { locked = false; }, GUARD_DELAY);

    const q = makeQuestion(index, { combo, correctCount });
    el.prompt.innerHTML = q.promptHtml;

    hintHtml = q.hintHtml || null;
    el.hint.hidden = true;
    el.hint.innerHTML = '';

    el.options.innerHTML = '';
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opt-btn';
      btn.textContent = opt.text;
      btn.dataset.correct = opt.correct ? '1' : '0';
      btn.addEventListener('click', () => answer(btn, opt.correct));
      el.options.appendChild(btn);
    });

    renderHead();

    armIdle();

    if (q.say && onSpeak) setTimeout(() => onSpeak(q.say), 300);
    // 還不太會讀字的年紀，中文題目直接唸出來
    if (q.sayZh) speech.prepare().then(() => setTimeout(() => speech.zh(q.sayZh), 250));
  }

  function renderHead() {
    if (endless) {
      el.stars.textContent = `⭐ 答對 ${correctCount} 題`;
      el.count.textContent = `第 ${index + 1} 題`;
      return;
    }
    el.stars.textContent = '⭐'.repeat(correctCount) + '☆'.repeat(roundSize - correctCount);
    el.count.textContent = `第 ${index + 1} 題 / 共 ${roundSize} 題`;
  }

  function answer(btn, isCorrect) {
    if (locked) return;

    btn.blur();          // 點過的按鈕不要留著焦點樣式
    stopIdle();

    if (!isCorrect) {
      firstTry = false;
      wrongHere++;
      combo = 0;
      hideCombo();
      btn.classList.add('wrong');
      btn.disabled = true;
      sound.hint();
      react('tilt');
      say('再想想看～');

      // 連錯兩次就把正確答案輕輕點亮，不要讓他卡在那裡
      if (wrongHere >= NUDGE_AFTER) nudgeCorrect();
      return;
    }

    locked = true;
    btn.classList.add('right');
    sound.good();
    burst(btn);
    react('cheer');
    say('答對了！', 'good');
    setTip('');

    if (firstTry) {
      correctCount++;
      combo++;
      showCombo();
      if (endless && correctCount % MILESTONE === 0) {
        onMilestone?.(correctCount);
        say(`答對 ${correctCount} 題了，拿一顆星！`, 'good');
      }
    } else {
      combo = 0;
      hideCombo();
    }
    renderHead();

    timer = setTimeout(() => {
      index++;
      if (!endless && index >= roundSize) finish();
      else showQuestion();
    }, NEXT_DELAY);
  }

  /** 把正確答案輕輕點亮（呼吸發光 + 很輕的一聲），不直接說出答案 */
  function nudgeCorrect() {
    const right = [...el.options.children].find(b => b.dataset.correct === '1');
    if (!right || right.classList.contains('nudge')) return;
    right.classList.add('nudge');
    sound.nudge();

    // 有鷹架就先給鷹架（例如可以數的圖案），沒有才直接點亮答案
    if (hintHtml) {
      el.hint.innerHTML = hintHtml;
      el.hint.hidden = false;
      setTip('數數看這些圖案～', 'hint');
      speech.zh('數數看這些圖案');
    } else {
      setTip('在這裡喔，試試看！', 'hint');
      speech.zh('在這裡喔');
    }
  }

  function finish() {
    hideBubble();
    const gained = onFinish?.({ correct: correctCount, total: roundSize }) ?? 1;
    const text = correctCount === roundSize
      ? `全部答對！拿到 ${gained} 顆星！`
      : `答對 ${correctCount} 題，拿到 ${gained} 顆星！`;
    el.rewardText.textContent = text;
    el.reward.hidden = false;
    speech.zh(text);
  }

  /* ---------- 發呆太久就提醒 ---------- */
  function armIdle() {
    stopIdle();
    idleTimer = setTimeout(() => {
      say('選一個答案看看');
      el.options.querySelectorAll('.opt-btn').forEach(b => b.classList.add('pulse'));
    }, IDLE_MS);
  }

  function stopIdle() {
    clearTimeout(idleTimer);
    el.options.querySelectorAll('.pulse').forEach(b => b.classList.remove('pulse'));
  }

  /* ---------- 提示文字 ---------- */
  function setTip(text, kind = '') {
    el.tip.textContent = text;
    el.tip.classList.toggle('hint', kind === 'hint');
    el.tip.classList.remove('pop');
    if (text) { void el.tip.offsetWidth; el.tip.classList.add('pop'); }
  }

  /* ---------- 夥伴的反應與說話泡泡 ---------- */
  function react(kind) {
    if (!el.buddy) return;
    el.buddy.classList.remove('cheer', 'tilt');
    void el.buddy.offsetWidth;
    el.buddy.classList.add(kind);
  }

  function say(text, kind = 'hint') {
    if (el.bubble) {
      el.bubble.textContent = text;
      el.bubble.hidden = false;
      el.bubble.classList.toggle('good', kind === 'good');
      el.bubble.classList.remove('pop');
      void el.bubble.offsetWidth;
      el.bubble.classList.add('pop');
    }
    if (kind === 'hint') {
      setTip(text, 'hint');
      speech.zh(text);
    }
  }

  function hideBubble() {
    if (el.bubble) el.bubble.hidden = true;
  }

  /* ---------- 連對標籤 ---------- */
  function showCombo() {
    if (combo < 2) return;
    el.combo.hidden = false;
    el.combo.textContent = combo >= 3 ? `🔥 連對 ${combo}！` : `連對 ${combo}！`;
    el.combo.classList.toggle('hot', combo >= 3);
    // 重新觸發跳動動畫
    el.combo.classList.remove('pop');
    void el.combo.offsetWidth;
    el.combo.classList.add('pop');
  }

  function hideCombo() {
    el.combo.hidden = true;
    el.combo.classList.remove('hot', 'pop');
  }

  /* ---------- 答對時從按鈕噴出星星 ---------- */
  function burst(btn) {
    const box = container.querySelector('.quiz');
    const b = btn.getBoundingClientRect();
    const p = box.getBoundingClientRect();
    const cx = b.left - p.left + b.width / 2;
    const cy = b.top - p.top + b.height / 2;

    for (let i = 0; i < 8; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.textContent = '⭐';
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
      const dist = 60 + Math.random() * 40;
      s.style.left = cx + 'px';
      s.style.top = cy + 'px';
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', (Math.sin(angle) * dist - 30) + 'px');
      box.appendChild(s);
      // animationend 為主，逾時清除為輔（有些環境會停用動畫，事件不會來）
      s.addEventListener('animationend', () => s.remove());
      setTimeout(() => s.remove(), 1000);
    }
  }

  return {
    start,
    /** 模組被切走時呼叫：停掉排程中的跳題與正在唸的話 */
    pause() {
      clearTimeout(timer);
      clearTimeout(guardTimer);
      stopIdle();
      speech.stop();
    },
  };
}
