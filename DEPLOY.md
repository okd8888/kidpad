# 部署 KidPad 到 GitHub Pages

> 這個專案是**純靜態網站**（只有 HTML / CSS / JS，沒有後端、不用建置），
> GitHub Pages 可以直接免費託管，附 HTTPS，任何人拿到連結就能開。
> 做法和 `trip-japan` 完全一樣：**main 分支根目錄直接發布**。

---

## 第 1 步：在 GitHub 建一個空的 repo

到 <https://github.com/new>：

| 欄位 | 填什麼 |
|---|---|
| Repository name | `kidpad`（或你喜歡的名字，會出現在網址裡） |
| Public / Private | **Public**（免費帳號要 Public 才能開 Pages） |
| Add a README | **不要勾**（本機已經有了） |

按 **Create repository**。

---

## 第 2 步：本機第一次上傳

在專案資料夾（`D:\ClaudeAI\projects\stroke-study`）按右鍵 → **Open Git Bash here**，執行：

```bash
git init
git branch -M main
git add -A
git commit -m "KidPad 兒童學習練習台"
git remote add origin https://github.com/<你的帳號>/kidpad.git
git push -u origin main
```

第一次推送會跳出登入視窗，選 **Sign in with your browser**。

---

## 第 3 步：打開 GitHub Pages

到 repo 頁面 → **Settings** → 左邊 **Pages**：

| 欄位 | 選什麼 |
|---|---|
| Source | **Deploy from a branch** |
| Branch | **main** ／ 資料夾選 **/ (root)** |

按 **Save**。等 1～2 分鐘，網址就會是：

```
https://<你的帳號>.github.io/kidpad/
```

---

## 之後每次更新：雙擊 deploy.bat

改完程式後，**雙擊 `deploy.bat`**，它會自動：

1. 檢查是不是在 `main` 分支（不是的話問你要不要合併過去）
2. 有改動就問你這次改了什麼，然後 commit
3. push 到 GitHub
4. 開啟部署進度頁面，並印出網站網址

也可以直接把訊息帶進去，不用等它問：

```bash
deploy.bat "新增算術練習"
```

---

## 幾個要注意的地方

### `.nojekyll` 不要刪

GitHub Pages 預設會跑 Jekyll，會把底線開頭的檔案吃掉。專案根目錄那個空的 `.nojekyll`
就是關掉它用的，別刪。

### 中文檔名的筆順資料

`vendor/hanzi-data/` 裡是 `大.json`、`明.json` 這種中文檔名，GitHub Pages 支援，
程式端已經用 `encodeURIComponent` 編碼過網址，不用改設定。

### 更新後看起來沒變

Service Worker 會快取舊版。在網站上按 **Ctrl + Shift + R** 強制重整即可。
改版幅度大的時候，把 `sw.js` 第一行的 `kidpad-v1` 改成 `kidpad-v2`，舊快取會自動清掉。

### 換 repo 名稱會換網址

所有路徑都是相對路徑（`./`），改 repo 名稱不用改任何程式碼。

---

## 常見錯誤

| 訊息 | 怎麼處理 |
|---|---|
| `Authentication failed` | Windows 存了失效的舊憑證。按 Win 搜尋「認證管理員」→「Windows 認證」→ 移除 `git:https://github.com`，再跑一次 |
| `rejected / non-fast-forward` | GitHub 上有本機沒有的 commit，先 `git pull --rebase origin main` |
| 網站顯示 404 | Pages 設定沒存到，或還在部署中；到 repo 的 **Actions** 分頁看進度 |
| 畫面空白、Console 出現 CORS | 你是用 `file://` 直接開 index.html。要用 `start.bat` 或線上版 |
