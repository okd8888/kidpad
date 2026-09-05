/* 筆順資料載入器
   找資料的順序：瀏覽器快取 → 專案內附的 vendor/hanzi-data → 網路 CDN
   只要某個字被練過一次，之後就算沒網路也還能用。 */

import { store } from './storage.js';

const PREFIX = 'kidpad.char.';
const LOCAL  = 'vendor/hanzi-data/';
const CDN    = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';

const memory = new Map();

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

export async function loadCharData(char) {
  if (memory.has(char)) return memory.get(char);

  const cached = store.get(PREFIX + char, null);
  if (cached) {
    memory.set(char, cached);
    return cached;
  }

  let data = null;
  try {
    data = await fetchJson(`${LOCAL}${encodeURIComponent(char)}.json`);
  } catch {
    data = await fetchJson(`${CDN}${encodeURIComponent(char)}.json`);
  }

  memory.set(char, data);
  store.set(PREFIX + char, data);
  return data;
}
