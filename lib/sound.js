/* 用 Web Audio 現場合成的小音效 —— 不需要任何音檔，離線也會響 */

let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep(freq, startAt, dur, volume) {
  const c = ac();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, c.currentTime + startAt);
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + startAt + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + startAt);
  osc.stop(c.currentTime + startAt + dur + 0.05);
}

export const sound = {
  /** 寫對一筆 */
  good() { beep(880, 0, 0.16, 0.18); },

  /** 整個字完成 */
  win() {
    beep(660, 0,    0.18, 0.2);
    beep(880, 0.16, 0.18, 0.2);
    beep(1175, 0.32, 0.42, 0.22);
  },

  /** 再試一次：兩個下行音，比單音清楚但不刺耳，不是警告音 */
  hint() {
    beep(494, 0,    0.16, 0.16);
    beep(392, 0.15, 0.28, 0.16);
  },

  /** 提示正確答案在哪裡（很輕的一聲，像在說「這邊喔」） */
  nudge() {
    beep(660, 0,    0.12, 0.10);
    beep(784, 0.11, 0.20, 0.10);
  },
};
