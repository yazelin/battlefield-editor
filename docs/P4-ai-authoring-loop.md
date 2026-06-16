# P4 — AI authoring loop(設計)+ 用編輯器補完官渡

日期:2026-06-16　狀態:已拍板「邊做邊驗」順序,開始實作。

## 北極星

把 `docs/authoring/` 的 SOP 從「給 AI 讀的文件」升級成可執行的 **AI 編寫 → 機器自檢 → 人驗收** 迴圈;
第一個 dogfood = 把 `packages/guandu/`(現 3 幕、空音訊)補成赤壁規格(~8 幕 + 旁白 + 音樂 + 音效)。

## AI / 人 邊界(程式已落實)

界線 = **「機器驗得了的」vs「驗不了的」**。validator(`tools/validate-data.mjs --pkg`)已檢查 schema +
所有跨檔引用(scene 的 `campFire.camp`/`march.fac`/`combat`/`fx.ignite.unit`/`set` key 必須是真實的
faction/unit/structure id)。因此:

- **AI 編寫資料**(歷史可考 + 結構可驗的部分),自己過完所有機器 gate 才交人。
- **人只判機器判不了的三件事**:① 空間(結構不沉河、footprint 不重疊、路徑不穿地形)② 電影感時序
  (運鏡框到主體、fx 與旁白同拍、節奏)③ 感官(配色辨識度、音樂/旁白/音效的好壞)+ 微修。

## AI 端功能(讓 AI 能編)

| 功能 | 現況 |
|---|---|
| 可執行 SOP(`docs/authoring/` 當編寫規則) | 有 |
| **validator 當回饋迴圈**(跨檔引用 gate) | 有,已是運作中的客觀 gate |
| **headless 渲染 + console error + 逐幕截圖 自檢** | **缺(本 P4 補 `tools/render-check.mjs`)** |
| 旁白 TTS(edge-tts 雙聲 + 字幕 cues + 破音字表) | red-cliffs-3d 有,可移植(需 `pip install edge-tts` + 官渡 script + 官渡破音字) |
| 音樂/音效海選 + AI 代聽(Freesound→Gemini) | red-cliffs-3d 有,可移植(重設官渡 slot) |
| synth 音效 cue(drum/boom/burst) | 純資料、零素材 |
| 殘留掃描(把 chibi/赤壁 id 掃出官渡包外) | 易加 |

> 誠實註記:ROADMAP 先前說兩包「通過 headless 驗證」屬實,但當時用的是 `/tmp/shotkit` 臨時工具、
> **未進 repo**。P4 第一步就是把它落成 `tools/render-check.mjs`,讓 loop 與人都能重跑。

## 人端功能(驗收 + 微修面)

| # | 功能 | 動引擎? | 為何 |
|---|---|---|---|
| M1 | 點地圖取座標 `[x,z]` + 複製 | 是(~30 行,延伸既有 raycast) | 槓桿最大——官渡待辦幾乎全是座標微調 |
| M2 | `__seek(act,t)` 跳幀凍結 | 小 | 精準時序檢查;M3 的依賴 |
| M3 | 逐幕截圖 contact sheet | 一個 flag + 側工具(= render-check 產出) | 一眼掃 staging,不用整段重播 |
| M4 | 音訊 audition 頁(移植) | 否 | 音訊純靠耳,是剩餘工的大宗 |
| M5 | 每輪 `git diff packages/guandu/` | 否 | 文字面驗「AI 到底改了什麼」 |

## 迴圈(每批編輯)

依相依順序編 `factions→terrain→structures→units→scene→audio`(每層 id 是下層白名單)→
`validate-data.mjs --pkg` 跑 PASS → 殘留掃描為空 → `render-check` 0 console error、每幕都出畫面 →
自我修正 → 交人:附 PASS 行 + 殘留空報告 + 0-error log + 逐幕截圖 + 「只列空間/時序/感官/史實」的驗收清單。
**任一 gate 沒過,AI 自己 loop,不交人。**

## 官渡擴幕計劃(3 → ~8)

白馬(關羽斬顏良)→ 延津(文醜)→ 官渡對峙 → 霹靂車 → 許攸來奔 → 烏巢夜襲 → 張郃高覽降 → 河北遂定。
- 內容缺口:官渡目前**無淳于瓊/烏巢守軍單位**(只在 generals 出現名字),終幕焚糧沒有可潰散的軍——
  補一支 `yuanWuchao` 守軍,終幕才有著力點。
- 機制沿用現有 3 幕已驗證的詞彙(env 限 day/cold/dusk/night/inferno/dawn;fx 限
  volley/ignite/shake/campFire;`campFire` 只能燒 `campWuchao`;夜襲/降幕加 `scrubSet` 讓回跳即見火)。

## 執行順序(已選:邊做邊驗)

1. **P4.0** commit `render-check.mjs` 自檢 gate + 引擎 M1(座標 picker)/M2(seek)+ `preserveDrawingBuffer`。
2. **P4.1** AI 擴官渡資料(3→8 幕 + 烏巢守軍)→ 過 validator + render-check → 產 contact sheet → 交 yazelin 驗空間/時序。
3. **P4.2** 音訊:移植旁白 TTS + 寫官渡 script/cues + synth 音效 + 音樂海選 audition。

驗證紀律:能結構/等價驗的自動;空間/時序/感官交人;每步本機驗到 OK 才推。
