/* 英文野餐：先認識單字，再用三種玩法反覆連結圖片、文字與開頭字母。 */

import { createQuizView } from '../lib/quiz-ui.js';
import { stars } from '../lib/stars.js';
import { store } from '../lib/storage.js';
import { speech } from '../lib/speech.js';

const KEY = 'kidpad.english.progress';
const ROUND = 6;
const WORDS = [
  { letter: 'A', word: 'apple',  zh: '蘋果', emoji: '🍎' },
  { letter: 'C', word: 'cake',   zh: '蛋糕', emoji: '🍰' },
  { letter: 'E', word: 'egg',    zh: '雞蛋', emoji: '🥚' },
  { letter: 'G', word: 'grapes', zh: '葡萄', emoji: '🍇' },
  { letter: 'J', word: 'juice',  zh: '果汁', emoji: '🧃' },
  { letter: 'M', word: 'milk',   zh: '牛奶', emoji: '🥛' },
  { letter: 'O', word: 'orange', zh: '柳橙', emoji: '🍊' },
  { letter: 'P', word: 'pizza',  zh: '披薩', emoji: '🍕' },
];

let built = false;
let root = null;
let quiz = null;
let hasVoice = false;
let state = null;

const pick = items => items[Math.floor(Math.random() * items.length)];
const shuffle = items => [...items].sort(() => Math.random() - 0.5);

function loadState() {
  const saved = store.get(KEY, null) || {};
  state = {
    rounds: saved.rounds || 0,
    sticker: saved.sticker || false,
    skills: saved.skills || {
      pictureToWord: { tried: 0, firstTry: 0 },
      wordToPicture: { tried: 0, firstTry: 0 },
      firstLetter: { tried: 0, firstTry: 0 },
    },
  };
}

function saveState() { store.set(KEY, state); }
function speak(word) { if (hasVoice) speech.say(word, 'en'); }

function choices(answer, label) {
  return shuffle([answer, ...shuffle(WORDS.filter(item => item.word !== answer.word)).slice(0, 2)])
    .map(item => ({ text: label(item), correct: item.word === answer.word }));
}

function makeQuestion(index) {
  const item = pick(WORDS);
  if (index % 3 === 0) {
    return {
      skill: 'pictureToWord',
      promptHtml: `<div class="pic-big">${item.emoji}</div><div class="q-expr">哪一個是「${item.zh}」？</div>`,
      options: choices(item, option => option.word),
      sayZh: `哪一個是${item.zh}`,
    };
  }
  if (index % 3 === 1) {
    return {
      skill: 'wordToPicture',
      promptHtml: `${hasVoice ? `<button class="word-say" data-say="${item.word}" type="button" aria-label="再聽一次 ${item.word}">🔊</button>` : ''}<div class="word-full">${item.word}</div><div class="q-expr">選出正確的圖片</div>`,
      options: choices(item, option => `${option.emoji} ${option.zh}`),
      say: hasVoice ? item.word : null,
      sayZh: '選出正確的圖片',
    };
  }
  const otherLetters = shuffle(WORDS.filter(option => option.letter !== item.letter)).slice(0, 2);
  return {
    skill: 'firstLetter',
    promptHtml: `<div class="pic-big">${item.emoji}</div>${hasVoice ? `<button class="word-say" data-say="${item.word}" type="button" aria-label="再聽一次 ${item.word}">🔊</button>` : ''}<div class="word-masked">_${item.word.slice(1)}</div><div class="q-expr">少了哪一個開頭字母？</div>`,
    options: shuffle([item, ...otherLetters]).map(option => ({ text: option.letter, correct: option.letter === item.letter })),
    say: hasVoice ? item.word : null,
    sayZh: '少了哪一個開頭字母',
  };
}

function renderHome() {
  quiz?.pause();
  root.innerHTML = `
    <section class="english-adventure">
      <div class="picnic-intro">
        <div><p class="adventure-kicker">企鵝的野餐任務</p><h2>先認識食物，再幫企鵝裝進野餐籃</h2><p>點每張字卡聽一遍。準備好後，完成 6 個小挑戰。</p></div>
        <div class="picnic-scene" aria-hidden="true">🐧🧺</div>
      </div>
      <div class="word-shelf" aria-label="野餐英文單字">
        ${WORDS.map(item => `<button class="word-card" data-word="${item.word}" type="button"><span class="word-card-pic">${item.emoji}</span><span class="word-card-en">${item.letter.toLowerCase()} · ${item.word}</span><span class="word-card-zh">${item.zh}${hasVoice ? '　🔊' : ''}</span></button>`).join('')}
      </div>
      <div class="picnic-actions">
        <button class="kid-btn mint start-picnic" type="button">開始野餐挑戰 →</button>
        <div class="picnic-sticker ${state.sticker ? 'unlocked' : ''}"><span>${state.sticker ? '🧺' : '？'}</span><div><strong>${state.sticker ? '野餐籃貼紙' : '神祕貼紙'}</strong><small>${state.sticker ? `已完成 ${state.rounds} 次挑戰` : '完成一次挑戰就能解鎖'}</small></div></div>
      </div>
    </section>`;
  root.querySelectorAll('.word-card').forEach(button => button.addEventListener('click', () => speak(button.dataset.word)));
  root.querySelector('.start-picnic').addEventListener('click', startChallenge);
  speech.zh('先點字卡聽一聽，準備好就開始野餐挑戰');
}

function startChallenge() {
  root.innerHTML = `<div class="eng-head"><span class="level-chip">🧺 野餐挑戰</span><span class="eng-note">圖片、單字和開頭字母都會出現</span><button class="kid-btn plain mode-btn" type="button">← 回到字卡</button></div><div class="english-quiz"></div>`;
  root.querySelector('.mode-btn').addEventListener('click', renderHome);
  quiz = createQuizView(root.querySelector('.english-quiz'), {
    roundSize: ROUND,
    makeQuestion,
    buddy: '🐧',
    onSpeak: speak,
    doneLabel: '看看我的貼紙',
    onResult({ question, firstTry }) {
      const skill = state.skills[question.skill];
      if (!skill) return;
      skill.tried++;
      if (firstTry) skill.firstTry++;
      saveState();
    },
    onFinish({ correct, total }) {
      state.rounds++;
      state.sticker = true;
      saveState();
      const gained = correct === total ? 2 : 1;
      stars.add('english', gained);
      return gained;
    },
    onDone: renderHome,
  });
  quiz.start();
}

export default {
  id: 'english', title: '英文練習', icon: '🔤',
  mount(container) {
    if (built) return;
    built = true;
    root = container;
    loadState();
    speech.prepare().then(available => { hasVoice = available.en; renderHome(); });
  },
  unmount() { quiz?.pause(); speech.stop(); },
};
