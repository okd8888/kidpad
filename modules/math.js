/* 算術練習（準備中）—— 這個檔案同時是「新增模組」的最小範例：
   預設匯出 { id, title, icon, mount, unmount }，然後到 index.js 加一行就好。 */

let built = false;

export default {
  id: 'math',
  title: '算術練習',
  icon: '➕',

  mount(container) {
    if (built) return;              // DOM 建過就留著，切回來狀態不會重來
    container.innerHTML = `
      <div class="coming-soon">
        <div class="big">➕</div>
        <h2>算術練習</h2>
        <p>還在準備中，之後會加上 10 以內的加減法練習。</p>
      </div>
    `;
    built = true;
  },

  unmount() {},
};
