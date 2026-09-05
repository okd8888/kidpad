# KidPad 兒童學習練習台

給幼稚園～小一小朋友用的練習台。左邊是主功能區（各種練習項目），右邊是內容區，
點左邊哪個功能，右邊就換成對應的畫面。目前完成的是**中文筆劃練習**。

純前端、沒有後端、不用建置（no npm、no build），丟到 GitHub Pages 就能給所有人開連結使用。

---

## 怎麼打開

### 方法一：直接開線上版（最簡單）

部署完成後就是這個網址（把帳號換成你的）：

```
https://<你的GitHub帳號>.github.io/<repo名稱>/
```

手機／平板開這個網址，選「加入主畫面」，就會像 App 一樣有圖示，也能離線用。

### 方法二：在自己電腦跑

雙擊 **`start.bat`**（需要有 Python），或在專案資料夾執行：

```bash
python -m http.server 8765
```

然後開 <http://127.0.0.1:8765/>

> ⚠️ 不能直接雙擊 `index.html`。這個專案用 ES Module，瀏覽器在 `file://` 底下會擋住模組載入，
> 一定要透過 http 開。`start.bat` 就是幫你做這件事。

---

## 目前的功能

### 筆劃練習

| 功能 | 說明 |
|---|---|
| 自訂練習字 | 右邊輸入框可以直接打名字（例如「小明」），會自動拆成單字加進清單 |
| 看一次 | 慢速播放筆順動畫，一筆一劃示範 |
| 我來寫 | 淡灰色描紅底稿，用手指或滑鼠描；寫對一筆有音效＋提示，寫錯只會溫和提醒重來 |
| 完成獎勵 | 整個字寫完跳出星星鼓勵畫面 |
| 練習紀錄 | 每個字下面用星星顯示練過幾次（最多 5 顆），關掉瀏覽器也記得 |

### 算術練習、英文練習

目前是「準備中」的佔位模組，之後照下面的方式補上內容就好。

---

## 怎麼新增一個練習模組

**只要兩件事**，不用去改 `app.js`：

**第 1 步**：在 `modules/` 建一個檔案，例如 `modules/music.js`，預設匯出這個介面：

```js
let built = false;

export default {
  id: 'music',        // 唯一代號
  title: '音樂練習',   // 左側選單和頁籤上的名字
  icon: '🎵',         // 一個 emoji

  mount(container) {
    // container 是這個模組專屬的 <section>，第一次進來時建畫面
    if (built) return;          // 切回來時 DOM 還在，不要重建
    container.innerHTML = `<h2>音樂練習</h2>`;
    built = true;
  },

  unmount() {
    // 切走時被呼叫：停動畫、存檔。DOM 會被保留，狀態不會遺失
  },
};
```

**第 2 步**：在 `modules/index.js` 的陣列加一行：

```js
{ id: 'music', title: '音樂練習', icon: '🎵', load: () => import('./music.js') },
```

存檔重整，左側選單就多一個項目了。（加 `soon: true` 會在按鈕上標「準備中」。）

---

## 檔案結構

```
index.html              版面骨架（左功能區 + 右內容區）
styles.css              全部樣式
app.js                  主容器：畫選單、管 panel、切模組（不含任何模組細節）
modules/
  index.js              ★ 模組註冊表，新增模組改這裡
  stroke.js             筆劃練習
  math.js  english.js   佔位模組，同時是新增模組的最小範例
lib/
  storage.js            localStorage 封裝
  sound.js              Web Audio 合成音效（不需要音檔）
  hanzi-data.js         筆順資料載入：瀏覽器快取 → 本地 vendor → CDN
vendor/
  hanzi-writer.min.js   筆順函式庫（本機副本，不吃 CDN）
  hanzi-data/*.json     174 個常用字的筆順資料（數字、基礎字、常見姓名用字）
manifest.webmanifest    PWA 設定，可以「加入主畫面」
sw.js                   Service Worker，用過的內容會離線保留
deploy.bat / deploy.ps1 一鍵部署到 GitHub Pages
start.bat               在本機起伺服器並開瀏覽器
```

## 資料存在哪

全部在瀏覽器的 localStorage，不會上傳到任何地方：

| key | 內容 |
|---|---|
| `kidpad.stroke.chars` | 練習清單 |
| `kidpad.stroke.records` | 每個字練過幾次、最後練習時間 |
| `kidpad.stroke.current` | 目前選的字 |
| `kidpad.lastModule` | 上次開的模組 |
| `kidpad.char.<字>` | 該字的筆順資料快取（讓下次離線也能練） |

## 離線

`vendor/hanzi-data/` 裡附的 174 個字完全離線可用。
不在裡面的字，第一次練需要連網（會自動去 CDN 抓），抓過一次之後就存在瀏覽器裡，之後離線照練。
