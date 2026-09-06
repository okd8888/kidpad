/* 模組註冊表
   ------------------------------------------------------------
   要新增一個練習模組，只要做兩件事：
   1. 在 modules/ 底下建一個 js 檔，預設匯出 { id, title, icon, mount, unmount }
   2. 在下面的陣列加一行

   左側選單、右側頁籤、panel 容器都會自動生效，不用去改 app.js。
   ------------------------------------------------------------ */

export const registry = [
  { id: 'stroke',  title: '筆劃練習', icon: '✍️', load: () => import('./stroke.js') },
  { id: 'math',    title: '算術練習', icon: '➕', load: () => import('./math.js') },
  { id: 'english', title: '英文練習', icon: '🔤', load: () => import('./english.js') },
  { id: 'bopomo',  title: '注音符號', icon: 'ㄅ',  load: () => import('./bopomo.js') },
  { id: 'clock',   title: '時鐘',     icon: '🕐', load: () => import('./clock.js') },
  { id: 'money',   title: '認識錢幣', icon: '💰', load: () => import('./money.js') },
];
