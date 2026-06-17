# 戰場 package 編輯 SOP(總覽)

這裡是 battlefield-editor 的「戰場 package」編輯指南。給 **AI 與人共讀**:AI 依此知道要改哪些檔、怎麼改、怎麼自證;人依此驗收與微修。

> 範圍:引擎已**完全資料驅動**(P2h 後不再寫死赤壁)。改 package 下的資料檔不會改變引擎行為,只改變引擎讀到的資料。一份引擎(`play.html`,單檔)可載入**任意**戰場 package。

## 1. 什麼是「戰場 package」

一份戰場 package = 重現一場戰役所需的全部資料,**裝在一個資料夾裡**:6 個分層檔 + 一份 `battlefield.json`(manifest)。manifest 是這個資料夾的「目錄 + 元資料」,`data` 物件指向同資料夾內的 6 層檔。

一個 package = 一個資料夾,擺放方式有兩種:

| package | 資料夾 | manifest |
|---|---|---|
| 赤壁之戰 208(預設) | `packages/chibi/` | `packages/chibi/battlefield.json` |
| 其他戰役(如官渡) | `packages/<名稱>/` | `packages/<名稱>/battlefield.json` |

> 多 package 模型:預設赤壁住在 `packages/chibi/`,其餘戰役各自一個 `packages/<名稱>/` 資料夾(例:官渡在 `packages/guandu/`)。每個資料夾自帶完整的 6 層 + manifest,彼此獨立。

manifest 範例(赤壁,`packages/chibi/battlefield.json`):

```json
{
  "name": "赤壁之戰 208",
  "era": "東漢建安十三年(208)",
  "description": "長江赤壁的火攻決戰——孫劉聯軍以火攻破曹操水師",
  "engine": "battlefield-editor",
  "data": {
    "factions": "factions.json",
    "terrain": "terrain.json",
    "structures": "structures.json",
    "scene": "scene.json",
    "audio": "audio.json",
    "units": "units.json"
  },
  "pending": [],
  "meta": { "...": "見下方 meta 段" }
}
```

**`data` 內的路徑相對於 manifest 所在資料夾**(不是 repo 根)。引擎用 `PKG_BASE`(= manifest 的所在目錄)接上 `data.<層>` 來載入每一層,驗證器也比照同一套解析。所以官渡的 `data.terrain` 寫 `"terrain.json"`,實際讀的是 `packages/guandu/terrain.json`。

| 層 | manifest key | 檔案(相對 manifest) | 指南 |
|---|---|---|---|
| 陣營 | `factions` | `factions.json` | [factions.md](factions.md) |
| 地形 | `terrain` | `terrain.json` | [terrain.md](terrain.md) |
| 結構 | `structures` | `structures.json` | [structures.md](structures.md) |
| 場景/時間軸 | `scene` | `scene.json` | scene(逐幕 acts) |
| 音訊 manifest | `audio` | `audio.json` | audio(music.scenes + cues) |
| 單位 | `units` | `units.json` | units(army / fleet) |

> 6 層全部已外部化,`pending` 為空陣列(`[]`)。`pending` 仍保留作為「誠實標註尚未外部化層」的欄位,目前不需填。

### 載入與切換 package

引擎用網址參數 `?pkg=` 選 package,指向某個 manifest:

```
play.html                                        # 預設載入 packages/chibi/battlefield.json(赤壁)
play.html?pkg=packages/chibi/battlefield.json    # 顯式指定赤壁
play.html?pkg=packages/guandu/battlefield.json   # 載入官渡
```

`?pkg` 的值就是 manifest 的路徑(相對引擎),引擎由此推出 `PKG_BASE` 再去讀同資料夾的 6 層。要新增一場戰役 = 建一個 `packages/<名稱>/` 資料夾、放好 6 層 + manifest,然後用 `?pkg=packages/<名稱>/battlefield.json` 載入,**不必動引擎**。

## 2. AI ↔ 人協作模型

- **AI 產 / 改資料**:依各格式指南編輯 package 資料夾下的 JSON——加一條河、移一座城、調陣營色等。AI 負責讓改動「對得上 schema、過得了驗收」。
- **人驗收 + 微修**:人看視覺(截圖)是否符合意圖,做最後的小幅調整與拍板。
- **引擎 / 生成器只讀資料**:渲染器與地形生成器不含戰役知識,只忠實讀 package 內的資料畫出來。要改畫面 = 改資料,不改引擎。

換句話說:**資料是契約,指南讓 AI 知道怎麼改,人保留視覺與意圖的最終判斷。**

## 3. 共同驗收流程

任何對 package 資料的改動,都跑這條流程自證:

1. **schema / 契約**
   ```bash
   node tools/validate-data.mjs                                      # 驗預設赤壁(packages/chibi/battlefield.json)
   node tools/validate-data.mjs --pkg packages/guandu/battlefield.json   # 驗任意 package
   ```
   驗證器吃 `--pkg <manifest 路徑>` 即可驗**任何** package;不帶旗標時驗預設的 `packages/chibi/battlefield.json`。它比照引擎 `PKG_BASE`,把 manifest `data` 內的路徑當作相對於 manifest 所在資料夾來解析,檢查 factions / structures / terrain / units / scene / audio / battlefield 的必填欄位、型別、列舉值、id 唯一、manifest `data` 指到的檔存在,並做跨檔交叉引用(scene 引用的 unit / structure / faction / 陣營必須存在)。要 PASS。
   > **陣營白名單由 package 自己的 `factions.json` 推導**(`Object.keys(factions)`),不再寫死 `cao` / `sun` / `liu`。陣營 id 是任意字串——你可以為新戰役定義任何陣營鍵(如官渡的 `cao` / `yuan`),units / structures(camp)/ scene 只要引用到的陣營有在該 package 的 `factions.json` 出現即可。
2. **地形重現**(僅 chibi 專用,**不是新 package 的關卡**)
   ```bash
   node tools/terrain-fit.mjs   # 只比對 chibi 原始解析式地形的數值重現,不吃 --pkg
   ```
   這支是當初把 chibi 手寫解析地形參數化時的數值回歸工具(印 `mean|Δ|`/`max|Δ|`),**只對 chibi 有意義**。編新 package 不需要跑它;新戰場的地形對不對(城/營/單位有沒有沉河、河道走向)由第 3 步的瀏覽器目視把關(細節見 [terrain.md](terrain.md))。
3. **視覺檢查(由人)**:在瀏覽器用 `?pkg=` 開對應 package(例:`play.html?pkg=packages/guandu/battlefield.json`),截圖檢查地形、河道、城/營/地名位置、陣營色、運鏡、單位是否符合意圖。**schema 過了不代表畫面對**——驗證器只看資料合法性,實際渲染仍要在瀏覽器以 `?pkg=` 目視確認,這一步由人把關。

## 4. 各格式指南

- [terrain.md](terrain.md) — `terrain.json`:rivers / bumps / bands / regions / colorRamp,怎麼加河、加山、改紅崖、加沼澤。
- [structures.md](structures.md) — `structures.json`:city / camp / pass / marker,怎麼加城 / 營 / 關口 / 地名,footprint 要離河道。
- [factions.md](factions.md) — `factions.json`:陣營欄位(name / flag / css / col / dark),怎麼加 / 改陣營。

每份指南都含「給 AI 的最小可複製範例」(一段可貼的 JSON 片段 + 驗收指令)。

### meta(戰役文案)

`battlefield.json` 的 `meta` 物件外部化了整個戰場 UI 的固定文案。引擎在啟動時呼叫 `applyMeta()`(讀 `PKG.meta`),把這些字串寫進對應 DOM——標題列、片頭(intro)、終幕(finale)、時間軸標籤都由 `meta` 驅動。靜態 HTML 仍保留同樣文字當作 SEO / 無 JS 的後備,`applyMeta()` 只是在執行期覆寫。

| 欄位 | 對應畫面 |
|---|---|
| `title` | `<h1>` 標題 + intro 主標 |
| `subtitle` | intro 主標的 `<small>` 副標 |
| `docTitle` | 瀏覽器分頁 `document.title` |
| `seal` | 標題列左上印章字 |
| `broadcastTag` | 標題列「直播」chip 文字 |
| `era` / `eraYear` | 標題列右側年號 + 年份地點 |
| `intro.tag` | intro chip 文字 |
| `intro.bodyHtml` | intro 敘事段落(含 `<br>`,innerHTML) |
| `intro.footHtml` | intro 頁尾(含 `<a>` 連結,innerHTML) |
| `finale.title` / `finale.subtitle` | 終幕「天下三分」主 / 副標 |
| `timeline.start` / `mid` / `end` | 時間軸左 / 中 / 右標籤 |

> 改文案 = 改 `meta` 字串,不動引擎。`bodyHtml` / `footHtml` 是 innerHTML(可含 `<br>`、`<a>`);其餘是純文字。

## 5. 全層已外部化

P2h 後,6 層全部已從 `play.html` 抽出成 package 內的資料檔,引擎完全資料驅動,`pending` 為空:

- **scene(場景 / 時間軸)**:逐幕 `acts`(key / title / dur / env / shots / power / march / combat / set / scrubSet / fx)——運鏡、單位移動、計策、火攻事件都在這層。引用到的 unit / structure / 陣營都會被驗證器交叉檢查。
- **audio manifest(音訊對應)**:`music.scenes`(各幕配樂路徑)+ `cues`(以場景分組的 synth / sfx / sword / burst 音效)。
- **units(單位)**:`units` 陣列,每筆是 army 或 fleet,帶 `id` / `kind` / `faction` / `n`(faction 須在該 package 的 `factions.json` 內)。

要新增一場戰役,六層連同 `battlefield.json` 一起放進新的 `packages/<名稱>/` 資料夾即可,引擎透過 `?pkg=` 載入、驗證器透過 `--pkg` 驗證,兩端都不需改動。
