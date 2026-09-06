/* 說話：用瀏覽器內建的 SpeechSynthesis，不放音檔。
   英文用來唸字母與單字，中文用來把畫面上的提示唸出來給還不太會讀字的小朋友聽。
   Windows 與 iPad 的語音都是系統內建（localService），離線也會出聲。
   沒有語音的裝置：available() 回 false，呼叫端要把喇叭按鈕收起來。 */

const voices = { en: null, zh: null };
let checked = null;

function loadVoices() {
  return new Promise(resolve => {
    const now = speechSynthesis.getVoices();
    if (now.length) return resolve(now);
    speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
    setTimeout(() => resolve(speechSynthesis.getVoices()), 1500);
  });
}

function pickVoice(list, prefix) {
  const hit = list.filter(v => v.lang && v.lang.toLowerCase().startsWith(prefix));
  return hit.find(v => v.localService) || hit[0] || null;   // 優先系統內建，離線也能唸
}

export const speech = {
  /** 第一次呼叫會等語音清單載好；回傳 { en, zh } 各有沒有語音 */
  async prepare() {
    if (checked) return checked;
    checked = (async () => {
      if (!('speechSynthesis' in window)) return { en: false, zh: false };
      const list = await loadVoices();
      voices.en = pickVoice(list, 'en');
      voices.zh = pickVoice(list, 'zh');
      return { en: !!voices.en, zh: !!voices.zh };
    })();
    return checked;
  },

  available(lang = 'en') { return !!voices[lang]; },

  say(text, lang = 'en') {
    const v = voices[lang];
    if (!v) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v;
    u.lang = v.lang;
    u.rate = lang === 'zh' ? 0.9 : 0.8;   // 慢一點，小朋友聽得清楚
    speechSynthesis.speak(u);
  },

  /** 唸中文提示；沒有中文語音就安靜略過 */
  zh(text) { this.say(text, 'zh'); },

  stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); },
};
