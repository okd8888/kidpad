/* 選擇題骨架：進度列 + 題目區 + 大按鈕選項 + 答對答錯回饋 + 一輪結算
   算術、英文兩個模組共用，出題內容由呼叫端提供。 */

import { sound } from './sound.js';

const NEXT_DELAY = 800;   // 答對到跳下一題的間隔

/**
 * @param {HTMLElement} container 這個模組的 panel
 * @param {object} opts
 *   roundSize   一輪幾題
 *   makeQuestion(index) 回傳 { promptHtml, options:[{text, correct}] }
 *   onFinish({ correct, total }) 一輪結束時呼叫，回傳值當作這一輪拿到的星星數
 */
export function createQuizView(container, opts) {
  const { roundSize = 6, makeQuestion, onFinish } = opts;

  container.innerHTML = `
    <div class="quiz">
      <div class="quiz-head">
        <div class="quiz-stars" id="quizStars"></div>
        <div class="quiz-count" id="quizCount"></div>
      </div>

      <div class="combo" id="combo" hidden></div>

      <div class="quiz-prompt" id="quizPrompt"></div>

      <div class="quiz-options" id="quizOptions"></div>

      <div class="quiz-tip" id="quizTip"></div>

      <div class="reward" id="quizReward" hidden>
        <div class="reward-inner">
          <div class="reward-emoji" id="rewardEmoji">🌟</div>
          <div class="reward-text" id="quizRewardText"></div>
          <button class="kid-btn mint" id="rewardAgain" type="button">再玩一次</button>
        </div>
      </div>
    </div>
  `;

  const el = {
    stars:   container.querySelector('#quizStars'),
    count:   container.querySelector('#quizCount'),
    combo:   container.querySelector('#combo'),
    prompt:  container.querySelector('#quizPrompt'),
    options: container.querySelector('#quizOptions'),
    tip:     container.querySelector('#quizTip'),
    reward:  container.querySelector('#quizReward'),
    rewardText: container.querySelector('#quizRewardText'),
  };

  let index = 0;        // 目前第幾題（0-based）
  let correctCount = 0; // 這一輪第一次就答對的題數
  let combo = 0;        // 連對幾題
  let firstTry = true;  // 這一題還沒答錯過
  let locked = false;   // 答對後到跳下一題之間，擋住重複點擊
  let timer = null;

  container.querySelector('#rewardAgain').addEventListener('click', start);

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
    locked = false;
    el.tip.textContent = '';

    const q = makeQuestion(index);
    el.prompt.innerHTML = q.promptHtml;

    el.options.innerHTML = '';
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opt-btn';
      btn.textContent = opt.text;
      btn.addEventListener('click', () => answer(btn, opt.correct));
      el.options.appendChild(btn);
    });

    renderHead();
  }

  function renderHead() {
    el.stars.textContent = '⭐'.repeat(correctCount) + '☆'.repeat(roundSize - correctCount);
    el.count.textContent = `第 ${index + 1} 題 / 共 ${roundSize} 題`;
  }

  function answer(btn, isCorrect) {
    if (locked) return;

    if (!isCorrect) {
      firstTry = false;
      combo = 0;
      hideCombo();
      btn.classList.add('wrong');
      btn.disabled = true;
      sound.hint();
      el.tip.textContent = '再想想看～';
      return;
    }

    locked = true;
    btn.classList.add('right');
    sound.good();
    burst(btn);
    el.tip.textContent = '';

    if (firstTry) {
      correctCount++;
      combo++;
      showCombo();
    } else {
      combo = 0;
      hideCombo();
    }
    renderHead();

    timer = setTimeout(() => {
      index++;
      if (index >= roundSize) finish();
      else showQuestion();
    }, NEXT_DELAY);
  }

  function finish() {
    const gained = onFinish?.({ correct: correctCount, total: roundSize }) ?? 1;
    el.rewardText.textContent = correctCount === roundSize
      ? `全部答對！拿到 ${gained} 顆星！`
      : `答對 ${correctCount} 題，拿到 ${gained} 顆星！`;
    el.reward.hidden = false;
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
    /** 模組被切走時呼叫：停掉排程中的跳題 */
    pause() { clearTimeout(timer); },
  };
}
