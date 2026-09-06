/* 英文發音：用瀏覽器內建的 SpeechSynthesis，不放音檔。
   Windows 與 iPad 的英文語音都是系統內建（localService），離線也會出聲。
   沒有英文語音的裝置：available() 回 false，呼叫端要把喇叭按鈕收起來，
   不要讓小朋友按了沒反應。 */

let voice = null;
let checked = null;

function loadVoices() {
  return new Promise(resolve => {
    const now = speechSynthesis.getVoices();
    if (now.length) return resolve(now);
    speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
    setTimeout(() => resolve(speechSynthesis.getVoices()), 1500);
  });
}

export const speech = {
  /** 第一次呼叫會等語音清單載好；回傳有沒有英文語音可用 */
  async prepare() {
    if (checked) return checked;
    checked = (async () => {
      if (!('speechSynthesis' in window)) return false;
      const list = await loadVoices();
      const en = list.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
      // 優先用系統內建的（離線也能唸）
      voice = en.find(v => v.localService) || en[0] || null;
      return !!voice;
    })();
    return checked;
  },

  available() { return !!voice; },

  say(text) {
    if (!voice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.8;      // 慢一點，小朋友聽得清楚
    speechSynthesis.speak(u);
  },
};
