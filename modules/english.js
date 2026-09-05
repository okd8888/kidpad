/* 英文練習（準備中） */

let built = false;

export default {
  id: 'english',
  title: '英文練習',
  icon: '🔤',

  mount(container) {
    if (built) return;
    container.innerHTML = `
      <div class="coming-soon">
        <div class="big">🔤</div>
        <h2>英文練習</h2>
        <p>還在準備中，之後會加上 ABC 字母描寫與發音。</p>
      </div>
    `;
    built = true;
  },

  unmount() {},
};
