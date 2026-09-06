/* 星星總帳：每個模組累積幾顆星。只增不減。
   左側選單的徽章和之後的獎章都看這裡。 */

import { store } from './storage.js';

const KEY = 'kidpad.stars';

let data = store.get(KEY, {}) || {};
const listeners = new Set();

export const stars = {
  get(moduleId) { return data[moduleId] || 0; },

  total() { return Object.values(data).reduce((a, b) => a + b, 0); },

  add(moduleId, n = 1) {
    data[moduleId] = (data[moduleId] || 0) + n;
    store.set(KEY, data);
    listeners.forEach(fn => fn(data));
  },

  /** 註冊變動通知，註冊當下先跑一次 */
  onChange(fn) {
    listeners.add(fn);
    fn(data);
    return () => listeners.delete(fn);
  },
};
