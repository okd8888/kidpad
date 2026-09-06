/* KidPad 主容器
   職責只有三件事：畫左側選單、管右側 panel、切換模組。
   這裡不可以出現任何特定模組的名字 —— 全部從 modules/index.js 的註冊表來。 */

import { registry } from './modules/index.js';
import { store } from './lib/storage.js';
import { stars } from './lib/stars.js';
import { speech } from './lib/speech.js';

const navEl    = document.getElementById('moduleNav');
const tabbarEl = document.getElementById('tabbar');
const panelsEl = document.getElementById('panels');
const appEl    = document.querySelector('.app');

/** 已載入的模組實例：id -> { mod, panel, mounted } */
const opened = new Map();
let currentId = null;

/* ---------- 左側選單 ---------- */
function buildNav() {
  registry.forEach(entry => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'module-btn';
    btn.dataset.id = entry.id;
    btn.title = entry.title;
    btn.innerHTML =
      `<span class="module-icon">${entry.icon}</span>` +
      `<span class="module-title">${entry.title}` +
      (entry.soon ? '<span class="soon">準備中</span>' : '') +
      `</span>` +
      `<span class="star-badge" hidden></span>`;
    btn.addEventListener('click', () => {
      speech.zh(entry.title);        // 還不太會讀字，點到什麼就唸什麼
      activate(entry.id);
    });
    navEl.appendChild(btn);
  });

  // 星星數變動時更新按鈕上的徽章
  stars.onChange(() => {
    navEl.querySelectorAll('.module-btn').forEach(b => {
      const n = stars.get(b.dataset.id);
      const badge = b.querySelector('.star-badge');
      badge.hidden = n === 0;
      badge.textContent = `⭐${n}`;
    });
  });
}

/* ---------- 頁籤 ---------- */
function buildTabs() {
  tabbarEl.innerHTML = '';
  opened.forEach((rec, id) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tab' + (id === currentId ? ' active' : '');
    tab.setAttribute('role', 'tab');
    tab.innerHTML = `<span>${rec.mod.icon}</span><span>${rec.mod.title}</span>`;
    tab.addEventListener('click', () => activate(id));
    tabbarEl.appendChild(tab);
  });
}

function markActiveButton() {
  navEl.querySelectorAll('.module-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.id === currentId);
  });
}

/* ---------- 切換模組 ----------
   切走：呼叫 unmount()（模組自己收尾、存檔），panel 留在 DOM 只是隱藏，
   所以切回來的時候畫到一半的字、輸入到一半的內容都還在。 */
async function activate(id) {
  if (id === currentId) return;

  if (currentId && opened.has(currentId)) {
    const prev = opened.get(currentId);
    try { prev.mod.unmount?.(); } catch (e) { console.error(e); }
    prev.panel.hidden = true;
  }

  let rec = opened.get(id);
  if (!rec) {
    const entry = registry.find(m => m.id === id);
    if (!entry) return;

    const module = await entry.load();
    const mod = module.default;

    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.dataset.id = id;
    panelsEl.appendChild(panel);

    rec = { mod, panel };
    opened.set(id, rec);
  }

  rec.panel.hidden = false;
  currentId = id;
  try { rec.mod.mount(rec.panel); } catch (e) { console.error(e); }

  store.set('kidpad.lastModule', id);
  markActiveButton();
  buildTabs();
}

/* ---------- 收合側欄 ---------- */
document.getElementById('collapseBtn').addEventListener('click', () => {
  const collapsed = appEl.classList.toggle('collapsed');
  store.set('kidpad.collapsed', collapsed);
});
if (store.get('kidpad.collapsed', false)) appEl.classList.add('collapsed');

/* ---------- 啟動 ---------- */
speech.prepare();
buildNav();

const last = store.get('kidpad.lastModule', null);
const first = registry.find(m => m.id === last) || registry[0];
if (first) activate(first.id);

/* ---------- Service Worker（離線可用；file:// 直開時略過） ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
