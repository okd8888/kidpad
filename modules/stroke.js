/* 筆劃練習
   S1：自訂字描紅
   S4：8 個基本筆劃、5 條筆順規則、三組字表關卡
   介面：{ id, title, icon, mount(container), unmount() }
   內容設計見 docs/CONTENT-PLAN.md */

import { store } from '../lib/storage.js';
import { sound } from '../lib/sound.js';
import { loadCharData } from '../lib/hanzi-data.js';
import { stars } from '../lib/stars.js';
import { speech } from '../lib/speech.js';

const KEY_RECORDS = 'kidpad.stroke.records';   // 每個字練過幾次
const KEY_STROKES = 'kidpad.stroke.strokes';   // 每個基本筆劃練過幾次
const KEY_NAME    = 'kidpad.child.name';       // 小朋友的名字（S5 會改到家長頁設定）
const KEY_LAST    = 'kidpad.stroke.lastLesson';

/* ---------- Level 1：8 個基本筆劃 ----------
   「乀」「㇀」在筆順資料庫裡查不到，所以捺、提改用含這一筆的字，
   用 quizStartStrokeNum 直接從那一筆開始練。 */
const STROKES = [
  { key: 'heng', name: '橫', char: '一', start: 0, hint: '從左邊畫到右邊' },
  { key: 'shu',  name: '豎', char: '丨', start: 0, hint: '從上面畫到下面' },
  { key: 'pie',  name: '撇', char: '丿', start: 0, hint: '從右上滑到左下' },
  { key: 'dian', name: '點', char: '丶', start: 0, hint: '輕輕點一下' },
  { key: 'na',   name: '捺', char: '人', start: 1, hint: '從左上滑到右下（「人」的第二筆）' },
  { key: 'zhe',  name: '折', char: '乙', start: 0, hint: '轉一個彎' },
  { key: 'gou',  name: '鉤', char: '亅', start: 0, hint: '到底了往上勾' },
  { key: 'ti',   name: '提', char: '打', start: 2, hint: '從左下往右上挑（「打」的第三筆）' },
];

/* ---------- Level 2：5 條筆順規則 ---------- */
const RULES = [
  { key: 'top-down',   name: '從上到下', chars: ['三', '二'],       tip: '先寫上面，再寫下面' },
  { key: 'left-right', name: '從左到右', chars: ['川', '州'],       tip: '先寫左邊，再寫右邊' },
  { key: 'heng-shu',   name: '先橫後豎', chars: ['十', '干', '土'], tip: '先寫橫，再寫豎' },
  { key: 'pie-na',     name: '先撇後捺', chars: ['人', '八', '大'], tip: '先寫撇，再寫捺' },
  { key: 'outside-in', name: '先外後內', chars: ['月', '日', '同'], tip: '先寫外面，再寫裡面' },
];

/** 反查：這個字屬於哪一條規則，練的時候直接提示 */
const RULE_OF_CHAR = {};
RULES.forEach(r => r.chars.forEach(c => { RULE_OF_CHAR[c] = r; }));

/* ---------- Level 3：三組字表 ---------- */
const SETS = [
  { key: 'name', title: '我的名字', icon: '🏅', chars: null },   // null = 從設定讀
  {
    key: 'few', title: '筆劃少的字', icon: '✏️',
    chars: ['一','二','三','十','人','入','八','大','小','上','下','口','山','川','工',
            '女','子','土','天','太','不','中','手','日','月','木','水','火','王',
            '五','六','七','九','了','力','刀','又'],
  },
  {
    key: 'life', title: '生活常用字', icon: '🌈',
    chars: ['目','田','白','石','立','早','花','我','你','他','好','是','有','在',
            '來','去','多','少','生','用','出','可','文','心','耳',
            '車','門','書','筆','紙','飯','麵','果','菜'],
  },
  {
    key: 'nature', title: '動物和大自然', icon: '🐾',
    chars: ['牛','羊','馬','魚','鳥','虫','犬','貓','兔','草','樹','林','森',
            '雲','雨','風','雪','星','光','電'],
  },
];

let built = false;
let el = null;
let writer = null;

let records = {};
let strokeDone = {};
let childName = '';

let lesson = null;   // { type, key, title, items:[] }
let itemIndex = 0;
let idleTimer = null;

const IDLE_MS = 15000;   // 發呆這麼久就出聲提醒

/* ================= 資料 ================= */

function loadState() {
  records    = store.get(KEY_RECORDS, {}) || {};
  strokeDone = store.get(KEY_STROKES, {}) || {};
  childName  = store.get(KEY_NAME, '') || '';
}

function countOf(item) {
  return item.progKey.startsWith('stroke:')
    ? (strokeDone[item.progKey.slice(7)] || 0)
    : (records[item.char]?.count || 0);
}

function bump(item) {
  if (item.progKey.startsWith('stroke:')) {
    const k = item.progKey.slice(7);
    strokeDone[k] = (strokeDone[k] || 0) + 1;
    store.set(KEY_STROKES, strokeDone);
  } else {
    const rec = records[item.char] || { count: 0, last: 0 };
    rec.count += 1;
    rec.last = Date.now();
    records[item.char] = rec;
    store.set(KEY_RECORDS, records);
  }
  stars.add('stroke', 1);        // 寫完一個字 = 1 顆星
}

const starsOf = n => (n ? '⭐'.repeat(Math.min(3, n)) : '');

function nameChars() {
  return Array.from(childName).filter(c => /[一-鿿]/.test(c));
}

/** 一個關卡完成幾項 */
function progressOf(items) {
  return items.filter(it => countOf(it) > 0).length;
}

/* ================= 關卡定義 ================= */

function strokeItems() {
  return STROKES.map(s => ({
    char: s.char, start: s.start, label: s.name, hint: s.hint, progKey: 'stroke:' + s.key,
  }));
}

function ruleItems(rule) {
  return rule.chars.map(c => ({
    char: c, start: 0, label: c, hint: rule.tip, progKey: 'char:' + c,
  }));
}

function setItems(set) {
  const list = set.key === 'name' ? nameChars() : set.chars;
  return list.map(c => ({
    char: c, start: 0, label: c,
    hint: RULE_OF_CHAR[c] ? RULE_OF_CHAR[c].tip : '', progKey: 'char:' + c,
  }));
}

/** 隨機練習：所有筆劃、規則字、字表字混在一起抽 */
function randomItems(n = 8) {
  const pool = [
    ...strokeItems(),
    ...RULES.flatMap(ruleItems),
    ...SETS.flatMap(setItems),
  ];
  const seen = new Set();
  const uniq = [];
  pool.forEach(it => {
    if (!seen.has(it.progKey)) { seen.add(it.progKey); uniq.push(it); }
  });
  return uniq.sort(() => Math.random() - 0.5).slice(0, n);
}

/* ================= 關卡選單 ================= */

function renderMenu() {
  el.practice.hidden = true;
  el.menu.hidden = false;

  const sItems = strokeItems();

  const strokeCards = sItems.map((it, i) => `
    <button class="lesson-card" data-type="stroke" data-index="${i}" type="button">
      <span class="lc-big">${it.label}</span>
      <span class="lc-sub">${it.char}</span>
      <span class="lc-stars">${starsOf(countOf(it))}</span>
    </button>`).join('');

  const ruleCards = RULES.map(r => {
    const items = ruleItems(r);
    return `
      <button class="lesson-card wide" data-type="rule" data-key="${r.key}" type="button">
        <span class="lc-title">${r.name}</span>
        <span class="lc-sub">${r.chars.join('　')}</span>
        <span class="lc-prog">${progressOf(items)} / ${items.length}</span>
      </button>`;
  }).join('');

  const setCards = SETS.map(s => {
    const items = setItems(s);
    const empty = s.key === 'name' && !items.length;
    return `
      <button class="lesson-card wide" data-type="set" data-key="${s.key}" type="button">
        <span class="lc-big">${s.icon}</span>
        <span class="lc-title">${s.title}</span>
        <span class="lc-prog">${empty ? '還沒設定名字' : `${progressOf(items)} / ${items.length}`}</span>
      </button>`;
  }).join('');

  el.menu.innerHTML = `
    <div class="lv-block">
      <h3 class="lv-title">Level 1 · 基本筆劃</h3>
      <div class="card-row">${strokeCards}</div>
    </div>
    <div class="lv-block">
      <h3 class="lv-title">Level 2 · 筆順規則</h3>
      <div class="card-row">${ruleCards}</div>
    </div>
    <div class="lv-block">
      <h3 class="lv-title">Level 3 · 常用字</h3>
      <div class="card-row">${setCards}</div>
    </div>
    <div class="lv-block">
      <h3 class="lv-title">🎲 隨機練習</h3>
      <div class="card-row">
        <button class="lesson-card wide" data-type="random" type="button">
          <span class="lc-big">🎲</span>
          <span class="lc-title">抽 8 個來寫</span>
          <span class="lc-prog">每次都不一樣</span>
        </button>
      </div>
    </div>
  `;

  el.menu.querySelectorAll('.lesson-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.querySelector('.lc-title')?.textContent
                || btn.querySelector('.lc-big')?.textContent || '';
      if (name) speech.zh(name);      // 點到什麼就唸什麼
      const { type, key, index } = btn.dataset;
      if (type === 'random') {
        openLesson({ type, key: 'random', title: '隨機練習', items: randomItems() }, 0);
      } else if (type === 'stroke') {
        openLesson({ type, key: 'basic', title: '基本筆劃', items: sItems }, +index);
      } else if (type === 'rule') {
        const r = RULES.find(x => x.key === key);
        openLesson({ type, key, title: r.name, items: ruleItems(r) }, 0);
      } else {
        const s = SETS.find(x => x.key === key);
        openLesson({ type, key, title: s.title, items: setItems(s) }, 0);
      }
    });
  });
}

/* ================= 練習畫面 ================= */

function openLesson(next, index) {
  lesson = next;
  itemIndex = index;
  store.set(KEY_LAST, { type: lesson.type, key: lesson.key });

  el.menu.hidden = true;
  el.practice.hidden = false;
  renderPractice();

  if (lesson.items.length) mountWriter();
  else clearWriter();
}

function renderPractice() {
  const isName = lesson.type === 'set' && lesson.key === 'name';

  el.practice.innerHTML = `
    <div class="practice-head">
      <button class="kid-btn plain" id="btnBack" type="button">← 關卡</button>
      <span class="practice-title" id="pTitle"></span>
      <span class="practice-hint" id="pHint"></span>
    </div>

    <div class="stroke-layout">
      <div class="stroke-main">
        <div class="writer-box" id="writerBox"></div>
        <div class="buddy-wrap">
          <div class="bubble" id="strokeBubble" hidden></div>
          <div class="buddy" id="strokeBuddy">🐼</div>
        </div>
        <div class="stroke-tip" id="strokeTip"></div>
        <div class="stroke-actions">
          <button class="kid-btn sky"   id="btnDemo"  type="button">👀 看一次</button>
          <button class="kid-btn mint"  id="btnQuiz"  type="button">✍️ 我來寫</button>
          <button class="kid-btn plain" id="btnAgain" type="button">↻ 重來</button>
        </div>
      </div>

      <aside class="stroke-side">
        <h2 class="section-title">${lesson.title}</h2>
        ${isName ? `
          <div class="add-row">
            <input class="kid-input" id="nameInput" type="text" maxlength="6"
                   placeholder="小朋友的名字" value="${childName}" aria-label="小朋友的名字">
            <button class="kid-btn" id="btnSaveName" type="button">存起來</button>
          </div>
          <p class="side-note">大人幫忙輸入一次就好，之後都會記得。</p>` : ''}
        <div class="card-list" id="itemList"></div>
      </aside>
    </div>

    <div class="reward" id="reward" hidden>
      <div class="reward-inner">
        <div class="reward-emoji">🌟</div>
        <div class="reward-text" id="rewardText"></div>
        <div class="reward-actions">
          <button class="kid-btn mint"  id="rewardNext" type="button">下一個 →</button>
          <button class="kid-btn plain" id="rewardAgainBtn" type="button">再寫一次</button>
        </div>
      </div>
    </div>
  `;

  el.practice.querySelector('#btnBack').addEventListener('click', () => {
    cancelQuiz();
    renderMenu();
  });
  el.practice.querySelector('#btnDemo').addEventListener('click', playDemo);
  el.practice.querySelector('#btnQuiz').addEventListener('click', startQuiz);
  el.practice.querySelector('#btnAgain').addEventListener('click', startQuiz);
  el.practice.querySelector('#rewardNext').addEventListener('click', () => {
    hideReward();
    goNext();
  });
  el.practice.querySelector('#rewardAgainBtn').addEventListener('click', () => {
    hideReward();
    startQuiz();
  });

  if (isName) {
    el.practice.querySelector('#btnSaveName').addEventListener('click', saveName);
    el.practice.querySelector('#nameInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') saveName();
    });
  }

  renderItemList();
}

function saveName() {
  const input = el.practice.querySelector('#nameInput');
  childName = input.value.trim();
  store.set(KEY_NAME, childName);
  lesson.items = setItems(SETS.find(s => s.key === 'name'));
  itemIndex = 0;
  renderItemList();
  if (lesson.items.length) mountWriter();
  else clearWriter();
}

function renderItemList() {
  const list = el.practice.querySelector('#itemList');
  list.innerHTML = '';

  if (!lesson.items.length) {
    list.innerHTML = '<p class="side-note">先在上面輸入名字，就可以開始練囉。</p>';
    return;
  }

  lesson.items.forEach((it, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'char-card' + (i === itemIndex ? ' active' : '');
    card.innerHTML =
      `<div class="glyph">${it.label}</div>` +
      `<div class="stars">${starsOf(countOf(it))}</div>`;
    card.addEventListener('click', () => {
      itemIndex = i;
      renderItemList();
      mountWriter();
    });
    list.appendChild(card);
  });
}

const currentItem = () => lesson.items[itemIndex];

function setTip(text, kind = 'good') {
  const tip = el.practice.querySelector('#strokeTip');
  if (!tip) return;
  tip.textContent = text;
  tip.classList.toggle('hint', kind === 'hint');
  tip.classList.remove('pop');
  if (text) { void tip.offsetWidth; tip.classList.add('pop'); }
}

/** 讓熊貓有反應：cheer 跳一下、tilt 歪頭 */
function react(kind) {
  const b = el.practice.querySelector('#strokeBuddy');
  if (!b) return;
  b.classList.remove('cheer', 'tilt');
  void b.offsetWidth;
  b.classList.add(kind);
}

/** 熊貓說話：泡泡 + 唸出來，給還不太會讀字的年紀 */
function buddySay(text, kind = 'hint') {
  const bubble = el.practice.querySelector('#strokeBubble');
  if (bubble) {
    bubble.textContent = text;
    bubble.hidden = false;
    bubble.classList.toggle('good', kind === 'good');
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
  }
  if (kind === 'hint') speech.zh(text);
}

function hideBubble() {
  const b = el.practice.querySelector('#strokeBubble');
  if (b) b.hidden = true;
}

/* ---------- 寫字區 ---------- */

function cancelQuiz() {
  if (writer) { try { writer.cancelQuiz(); } catch {} }
}

function clearWriter() {
  cancelQuiz();
  writer = null;
  const box = el.practice.querySelector('#writerBox');
  if (box) box.innerHTML = '<div class="writer-placeholder">選一個開始練吧！</div>';
  setTip('');
}

function boxSize() {
  const box = el.practice.querySelector('#writerBox');
  const w = box.clientWidth || 380;
  return Math.max(240, Math.min(420, w - 16));
}

function mountWriter() {
  const item = currentItem();
  if (!item) return clearWriter();

  const box = el.practice.querySelector('#writerBox');
  box.innerHTML = '<div class="writer-placeholder">正在準備…</div>';
  cancelQuiz();

  el.practice.querySelector('#pTitle').textContent = item.label;
  el.practice.querySelector('#pHint').textContent = item.hint || '';

  const size = boxSize();
  const target = document.createElement('div');
  box.innerHTML = '';
  box.appendChild(target);

  writer = HanziWriter.create(target, item.char, {
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
  hideBubble();
  speech.prepare().then(() => {
    speech.zh(item.hint ? `${item.label}，${item.hint}` : `寫寫看，${item.label}`);
  });
  armIdle();
}

/* ---------- 發呆太久就提醒他下一步要按哪裡 ---------- */
function armIdle() {
  stopIdle();
  idleTimer = setTimeout(() => {
    const btn = el.practice.querySelector('#btnQuiz');
    if (!btn) return;
    btn.classList.add('pulse');
    buddySay('按綠色的按鈕開始寫');
  }, IDLE_MS);
}

function stopIdle() {
  clearTimeout(idleTimer);
  el?.practice?.querySelector('.pulse')?.classList.remove('pulse');
}

function playDemo() {
  if (!writer) return;
  stopIdle();
  cancelQuiz();
  setTip('看清楚每一筆的順序～');
  writer.animateCharacter({ onComplete: () => setTip('換你了！按「我來寫」。') });
}

function startQuiz() {
  const item = currentItem();
  if (!writer || !item) return;
  stopIdle();
  hideReward();
  setTip(item.start ? '從亮起來的那一筆開始描！' : '用手指或滑鼠描描看！');

  writer.quiz({
    quizStartStrokeNum: item.start || 0,
    onCorrectStroke: info => {
      sound.good();
      react('cheer');
      const left = info.strokesRemaining;
      setTip(left > 0 ? `很好！還剩 ${left} 筆` : '最後一筆完成！');
    },
    onMistake: () => {
      sound.hint();
      react('tilt');
      setTip('這一筆再試一次，慢慢來～', 'hint');
      buddySay('再試一次，慢慢來');
    },
    onComplete: () => {
      bump(item);
      sound.win();
      react('cheer');
      buddySay('寫完了，好棒！', 'good');
      renderItemList();
      showReward(item);
    },
  });
}

function goNext() {
  if (itemIndex + 1 < lesson.items.length) {
    itemIndex++;
    renderItemList();
    mountWriter();
    return;
  }
  // 隨機練習寫完一批就再抽一批，想停再按「← 關卡」
  if (lesson.type === 'random') {
    const justDone = currentItem()?.progKey;
    let next = randomItems();
    for (let i = 0; i < 5 && next[0]?.progKey === justDone; i++) next = randomItems();
    lesson.items = next;
    itemIndex = 0;
    renderItemList();
    mountWriter();
    return;
  }
  renderMenu();
}

function showReward(item) {
  const n = countOf(item);
  const total = lesson.items.length;
  const done = progressOf(lesson.items);
  const last = itemIndex + 1 >= total;

  el.practice.querySelector('#rewardText').textContent = last && done === total
    ? `太棒了！「${lesson.title}」全部寫完了！`
    : `好棒！「${item.label}」寫完 ${n} 次了！`;
  el.practice.querySelector('#rewardNext').textContent =
    last ? (lesson.type === 'random' ? '再抽一批 →' : '回關卡 →') : '下一個 →';
  el.practice.querySelector('#reward').hidden = false;
  speech.zh(el.practice.querySelector('#rewardText').textContent);
}

function hideReward() {
  const r = el.practice.querySelector('#reward');
  if (r) r.hidden = true;
}

/* ================= 模組介面 ================= */

export default {
  id: 'stroke',
  title: '筆劃練習',
  icon: '✍️',

  mount(container) {
    if (built) return;          // 切回來時畫面和進度都還在
    loadState();
    container.innerHTML = `
      <div id="strokeMenu"></div>
      <div id="strokePractice" hidden></div>
    `;
    el = {
      menu:     container.querySelector('#strokeMenu'),
      practice: container.querySelector('#strokePractice'),
    };
    renderMenu();
    built = true;

    speech.prepare().then(() =>
      speech.zh('這裡是寫字練習，選一個想寫的來練習吧'));
  },

  unmount() {
    cancelQuiz();
    stopIdle();
    speech.stop();
  },
};
