# 戰場編輯器 — 本機編輯模式(設計稿)

> 把目前的「唯讀觀看器」升級成**所見即所得的本機編輯器**。公開 GitHub Pages 維持唯讀觀看版;
> 編輯只在本機透過 dev server 進行。資料檔仍是唯一源頭,所有編輯寫回 package JSON,仍過四道機器關。

## 為什麼要本機 dev server(不是純前端)

GitHub Pages 是靜態的:線上頁面**不能寫 package 檔、也不能跑 edge-tts 重生旁白**。所以
「改 → 存檔 / 更新語音」必須有後端。架構(已拍板):

- **`tools/editor-server.mjs`(本機 node,少依賴)**:服務 repo 靜態檔 + 提供 API:
  - `POST /api/save`：把某層編輯結果寫回 `packages/<slug>/<layer>.json`。
  - `POST /api/regen-narration`：跑該包 `narration/generate.py`(edge-tts)→ 接著跑
    `tools/fit-durations.mjs` 自動把幕長對齊新的雙聲長度 → 回傳新 cues + 調整摘要。
  - `GET /api/music-library`、`GET /api/sfx-library`、`POST /api/assign-music|assign-sfx`。
  - 存檔後可選擇順手跑 validate/audio-check 回報是否仍綠。
- **`play.html` 編輯模式**:偵測自己是被 editor-server 開的(探測 `/api/ping`)才顯示編輯 UI;
  **純展示 / Pages 模式下完全不出現編輯 UI**(觀看版乾淨)。

## 所見即所得(WYSIWYG)

編輯態盡量等同實際顯示頁:在真實 3D 畫面上**就地**編輯(地圖上拖曳物件、就地改文字),
不是另開一套表單。編輯完即時看到效果,存檔後資料落地。

## 資料完整性

所有編輯一律寫回 package 的六層 JSON(源頭),不在前端記憶體飄。存檔後仍由四道機器關
(validate / residue / render / audio-check)把關 —— 編輯不會偷偷產出壞包。

## 階段(順序:3 → 1 → 2,地形未來)

| 階段 | 內容 | 對應使用者編號 |
|---|---|---|
| **P1** | **旁白編輯 + 「更新語音」**:就地改每幕旁白文字 → 按鈕跑 regen(edge-tts)生新語音+字幕;**重生後自動調整幕長**(雙聲變長/變短都對齊,連帶調 orbit 鏡頭/finale 時點);UI 維護該包的 **SUBS 破音字替換表**,重生時套用;接音樂庫做**每幕配樂下拉**(試聽切換)。 | 3 |
| **P2** | **座標編輯**:地圖上拖曳城/營/單位改 `[x,z]`、拉行軍/移動路徑點 → 寫回 structures/units/scene。延伸現有 Shift 座標 picker。 | 1 |
| **P3** | **資訊文字編輯**:面板/事件卡/單位 info 等文字欄位就地改 → 寫回 JSON。 | 2 |
| **未來** | 地形微調編輯(河道控制點 / 丘陵 / 區塊參數)。 | — |

## 非目標

- 不在公開 Pages 上編輯(線上是唯讀觀看版)。
- 不做多人協作、不在 UI 內做 git。

## 已落地的地基

- **`tools/fit-durations.mjs`**:讀該包 cues.json 各幕雙聲長度,把 `scene.json` 幕長對齊到
  「最長那條人聲 + buffer」(變長變短都調),連帶調末段 orbit 鏡頭與 finale 時點。
  可獨立 CLI 跑,也供 `regen-narration` 在重生後自動呼叫 —— 即「更新語音自動調幕長」的核心。
