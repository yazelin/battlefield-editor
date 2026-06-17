# Roadmap / 進度

本檔是此 repo 的進度與待辦單一來源。引擎抽出的完整設計脈絡在 red-cliffs-3d 的
`docs/superpowers/specs/`(P3 design、P2g findings、P2h plan)。

## 現況(2026-06-17)

引擎已**完全資料驅動**,從 [`red-cliffs-3d`](https://github.com/yazelin/red-cliffs-3d) 抽出成本 repo。
- 三份範例 package 皆通過 headless 瀏覽器驗證(swiftshader WebGL,0 console error):
  - `chibi`(赤壁):9 幕 + 旁白語音 + 音樂 + 音效。
  - `guandu`(官渡):8 幕 + 旁白語音(雙聲 + 字幕)+ 音效 + 配樂。
  - `gaixia`(垓下):8 幕 + 旁白語音(雙聲 + 字幕)+ 音效 + 配樂;含烏江 ferry、淮河/長江雙河。
  - `feishui`(淝水):8 幕 + 旁白語音(雙聲 + 字幕)+ 配樂 + 音效;**由零 context agent 照 SKILL 自動編成**(dogfood 驗證樣本),配樂/音效用音樂庫/音效庫指派。
- `tools/validate-data.mjs --pkg <manifest>` 對兩包皆 PASS(含跨檔引用檢查)。
- 素材路徑改為「相對 manifest 目錄」解析(`assetUrl`),每份 package 自足擁有 `assets/`。

### 抽出時的演進(對照 red-cliffs-3d)

| 階段 | 內容 |
|---|---|
| P1 | 戰場 package 契約(manifest)+ AI 編輯 SOP |
| P2a/b/d | 場景 / 音訊 / 單位外部化 + 宣告式 dispatcher |
| P2e/f | manifest 驅動載入 + 戰役文案進 `meta` |
| P2g | `?pkg=` 切換 + 第二戰場(官渡)乾跑 + 殘留審計 |
| P2h | 引擎去赤壁化(旗/單位/火源/面板/combat/validator 全資料化)+ 對抗審查強健化 |
| **P3** | **抽成本獨立 repo(engine + schema + tools + SOP + packages),素材基準改 manifest 相對** |

## P4 — AI authoring loop(進行中,設計見 docs/P4-ai-authoring-loop.md)

把 SOP 升級成「AI 編寫 → 機器自檢 → 人驗收」迴圈,第一個 dogfood = 用編輯器把官渡補完。
邊界:AI 編資料(歷史可考 + 結構可驗);人只判機器判不了的空間 / 時序 / 感官,並微修。

| 子階段 | 內容 | 狀態 |
|---|---|---|
| P4.0 | 自檢 gate `tools/render-check.mjs`(headless 逐幕截圖 + console error)+ 座標 picker(Shift+點地圖)+ 設計 doc | ✅ ship |
| P4.1 | AI 把官渡 3→8 幕 + 烏巢守軍/前鋒;再照形勢圖/維基**全重排地理**(黃河 NE→SW、白馬東北、延津西南、烏巢居中、許都正南、補鄴城/河內郡/濮水) | ✅ ship,**待 yazelin 驗空間/時序** |
| P4.2 | 官渡音訊:旁白語音(edge-tts 雙聲 16 檔 + 字幕 cues)+ 戰場音效(synth + 複用 CC0 sword/battlecry)+ 背景音樂(複用 chibi CC0、依幕情緒對應) | ✅ ship,**待 yazelin 聽感驗收** |
| P4.3 | **把 SOP 變可執行的 authoring skill**:`tools/new-package.mjs`(scaffold 綠燈骨架)+ `tools/residue-scan.mjs`(抓 chibi 複製殘留 gate)+ `skills/author-battlefield/SKILL.md`(AI 照走的迴圈:依序編→機器三關→交人)+ render-check 洩漏修正 | ✅ ship |
| P4.4 | **第三戰場 dogfood — 垓下之戰**:全程用 authoring skill 從 scaffold 編成(8 幕:垓下合圍→韓信誘敵→四面楚歌→霸王別姬→潰圍南走→陰陵迷道→東城快戰→烏江自刎;含烏江 ferry 渡口、淮河/長江雙河)。過機器三關;dogfood 還抓到 residue-scan 把「長江」誤判的 bug 並修掉。音訊已補(旁白雙聲 16 檔 + 字幕、synth + CC0 音效、依幕情緒對應 CC0 配樂;逐幕量旁白長度延長幕長避免被切,終幕烏江延到 48s)。**待 yazelin 驗空間/時序/聽感** | ✅ ship |
| P4.5 | **authoring loop 強化(讓零 context 的 agent 也能自助)**:對抗審查抓出「SKILL 宣稱機器會擋、實際沒擋」的破口並補實 —— 新增第 4 道 gate `audio-check`(旁白音長≤幕長 + 音訊素材解析,空音訊放行)、validate-data 補 `follow` 鏡頭 unit 跨檔檢查、scaffold 一併產 `narration/generate.py` 範本、residue-scan 加 placeholder WARN + 掃 `narration/`;SKILL 機器/人邊界表據實重畫、補 cwd/環境/gaixia 黃金範例。每道新檢查皆「好包綠 + 壞輸入紅」雙向驗證 | ✅ ship |
| P4.6 | **音樂/音效庫(catalog-only + 可擴充)**:把赤壁海選全候選池(74 音樂 + 22 音效,各帶 Gemini fit 評分 + CC0 出處 + freesound preview)做成 `tools/music-library.json` / `sfx-library.json` 單一目錄;`assign-music.mjs` / `assign-sfx.mjs` 依「幕→曲」指派,來源解析 local→海選 stash→preview 下載(整池 + 日後 append 的新曲都能被 AI 直接指派);audio-check 改列庫 + 驗配樂出自庫(軟性)。repo 只留最終選用音檔(9+6),其餘只在目錄、用時取得;preview URL 讓本機 158MB 海選池即使遺失也可重抓。 | ✅ ship |

> 官渡現況:8 幕、旁白+字幕、音效、背景音樂齊備;render-check 0 error、31 音訊素材全解析。
> 旁白用 edge-tts(授權灰色,CREDITS 已註,可換配音);音樂暫借 chibi CC0(可用海選換官渡專屬曲)。
> 待人驗:① 空間/運鏡/節奏 ② 旁白發音(荀彧/張郃/許攸/淳于瓊 等已用破音替身,仍請耳檢)③ 音樂情緒貼合度。

> P4.1 已過 validator + render-check(8 幕、0 console error);截圖在 `tools/render-out/guandu/`
> (跑 `npm run render-check -- --pkg packages/guandu/battlefield.json` 重生)。
> 視覺/運鏡/節奏的「對不對」是人的工作 —— 這是「邊做邊驗」的驗收點。

## P5 — 本機編輯器(WYSIWYG,dev server;設計見 docs/editor-mode-design.md)

把唯讀觀看器升級成所見即所得的本機編輯器。公開 Pages 維持唯讀(不探測、不出現編輯 UI)。

| 子階段 | 內容 | 狀態 |
|---|---|---|
| P5.0 | `tools/editor-server.mjs`(零依賴:save-script/save-subs/save-layer/set-act-music/regen-narration/gates API)+ `tools/fit-durations.mjs`(更新語音自動對齊幕長)+ generate.py 吃 narration/subs.json | ✅ ship |
| P5.1(=使用者「3」) | index.html 編輯模式(僅 localhost 探測 editor-server 才出現):就地改旁白 → 「更新此幕語音」(edge-tts + 自動調幕長)、SUBS 破音字表、每幕配樂下拉、跑驗收;瀏覽器實測編輯態顯示+純展示隱藏+按鈕串通後端 | ✅ ship |
| P5.2(=使用者「1」) | 座標編輯:選物件(單位 + 有 id 結構)→ Shift+點地圖 或 填 x/z → 即時移動(U.place / STRUCT.position)→ 存回 units/structures。延伸 Shift picker(加 `__editCoordSink` hook) | ✅ ship |
| P5.3(=使用者「2」) | 資訊文字就地編輯:本幕 title/era/narr → 即時反映觀看畫面 + 存回 scene | ✅ ship |
| 未來 | 路徑點(march/set path)拖曳、地形微調編輯 | 待做 |

## Backlog / 已知待辦

- [ ] **`RZ` 河中線函式是赤壁長江硬編碼**(`index.html` `const RZ=x=>18*sin(...)`):`marker followRiver`
      只對赤壁正確,他包會把水標放錯位。應改成讀該包 `terrain.json` 河中線插值(需驗證赤壁標籤不位移)。
      暫解:非赤壁包水名直接給 `z`(官渡已改)。
- [ ] **WDIR 風向常數**仍寫死在引擎(東南風);不阻擋任何 package,之後資料化到 `scene`/`meta`。
- [ ] **戰力長條深色端**:赤壁 cao/sun 由 `factions.dark` 提供(與旗幟共用),與抽出前的舊 CSS
      字面(#1d4488/#7e1f1f)有肉眼難辨的微差;若要 pixel-exact 再加 `barDark` 欄位。
- [ ] **每場景音樂只能 mp3**(無逐幕 synth 音樂;`Sfx.musicCue` 是未實作的 TODO)。
- [ ] package 選單 / 熱切換 UI(目前靠 `?pkg=`);版本化 / 相依解析尚未需要。
- [ ] red-cliffs-3d 對外 URL / SEO / sibling 頁:本 repo 不影響;若日後要讓 red-cliffs-3d 退成
      薄殼指向本 repo,屬另案。

## 已解決(P2h / P3)

- 字幕在無語音時由場景計時器驅動(`Narration.subTick`)——支援「先字幕、語音後補」。
- 語音切換鈕標籤資料化(`narration.voiceLabels`);少於兩聲線自動隱藏。
- 素材路徑基準(P3 於本 repo 改成 manifest 相對,package 自足)。

## 驗證紀律

- 能結構 / 等價驗的一律自動:`validate-data.mjs`、資產解析檢查、headless 截圖 + console error 掃描。
- 視覺 / 聽覺 / 編排的「對不對」交人(肉眼 / 肉耳跑一遍)。
- 每次改動先本機驗到 OK 才推。
