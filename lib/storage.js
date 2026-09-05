/* localStorage 薄封裝：讀不到或壞掉就回預設值，不讓小朋友看到白畫面 */

export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* 隱私模式或空間滿了：忽略，畫面照常運作 */
    }
  },

  remove(key) {
    try { localStorage.removeItem(key); } catch { /* 同上 */ }
  },
};
