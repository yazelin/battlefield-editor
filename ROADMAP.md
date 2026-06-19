# Roadmap / 進度

本檔是此 repo 的進度與待辦單一來源。引擎抽出的完整設計脈絡在 red-cliffs-3d 的
`docs/superpowers/specs/`(P3 design、P2g findings、P2h plan)。

## 現況(2026-06-19)

引擎已**完全資料驅動**,從 [`red-cliffs-3d`](https://github.com/yazelin/red-cliffs-3d) 抽出成本 repo。
- 六份範例 package 皆通過 headless 瀏覽器驗證(swiftshader WebGL,0 console error):
  - `chibi`(赤壁):9 幕 + 旁白語音 + 音樂 + 音效。
  - `guandu`(官渡):8 幕 + 旁白語音(雙聲 + 字幕)+ 音效 + 配樂。
  - `gaixia`(垓下):8 幕 + 旁白語音(雙聲 + 字幕)+ 音效 + 配樂;含烏江 ferry、淮河/長江雙河。
  - `feishui`(淝水):8 幕 + 旁白語音(雙聲 + 字幕)+ 配樂 + 音效;**由零 context agent 照 SKILL 自動編成**(dogfood 驗證樣本),配樂/音效用音樂庫/音效庫指派。
  - `fanchengflood`(水淹七軍 219):7 幕 + 旁白語音(雙聲)+ 配樂;**新 `flood` 水攻特效**(水面動畫上升/退去、船隨水浮、Gaussian 盆地)。完整襄樊弧線:圍城→龐德射額決戰→秋雨→水淹七軍→于禁降龐德死→威震華夏(巔峰)→徐晃解圍+呂蒙襲荊州(盛極而衰)。**待補:戰鬥音效、旁白發音人耳校**。
  - `xiapi`(水淹下邳 198):6 幕 + 旁白語音(雙聲)+ 配樂;曹操引沂泗灌城、劉備前驅、呂布白門樓殞命。**地形對照三國志11大地圖**(泗水西來主河 + 沂水北支於城西南匯流,城在東岸非孤島);此戰場驅動了 P5.5 的河道走向/本幕洪水/事件卡錯開等編輯功能。
- `tools/validate-data.mjs --pkg <manifest>` 對各包皆 PASS(含跨檔引用檢查)。
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
| P5.1(=使用者「3」) | play.html 編輯模式(僅 localhost 探測 editor-server 才出現):就地改旁白 → 「更新此幕語音」(edge-tts + 自動調幕長)、SUBS 破音字表、每幕配樂下拉、跑驗收;瀏覽器實測編輯態顯示+純展示隱藏+按鈕串通後端 | ✅ ship |
| P5.2(=使用者「1」) | 座標編輯:選物件(單位 + 有 id 結構)→ Shift+點地圖 或 填 x/z → 即時移動(U.place / STRUCT.position)→ 存回 units/structures。延伸 Shift picker(加 `__editCoordSink` hook) | ✅ ship |
| P5.3(=使用者「2」) | 資訊文字就地編輯:本幕 title/era/narr → 即時反映觀看畫面 + 存回 scene | ✅ ship |
| P5.4 | **水攻調校閉環 + 全面編輯**:💧水位預覽滑桿、⛰️地形高斯 bump 即時挖塑(buildTerrain 重建)、🚩路徑 v2(出生點=綠色第0點可拖、軍隊箭頭同步)、**地圖直接拖曳**(路徑點/城營/單位)、⚔️部隊屬性(名稱/將領/數量/兵種/說明)、🚩陣營(旗/顏色)、面板收成分頁(地圖/單位/內容/驗收)、切幕放該幕旁白;fetch 加 res.ok 防 404 parse | ✅ ship |
| P5.5(水淹下邳驅動) | **🌊河道走向編輯**(centerline 節點地圖上拖改流向、加/刪末點、河寬河深滑桿,放開重挖地形;`_dense` 同步重算)、**💧本幕洪水授權**(每幕設 `flood` to/at/dur,拖「漲到」即時用水位預覽看)、**事件卡同幕自動錯開**(投影重疊時逐幀往下推開,連卡帶指標線一起移,不破壞 CSS2D 定位)、`render-check` chrome 孤兒進程 backstop(三重清理:close→SIGKILL 進程樹→專屬 user-data-dir pkill) | ✅ ship |
| P5.6(區域洪水) | **`flood` 可限定區域**:水面 shader 改為頂點位移(細分網格 + 橢圓 `region` 遮罩,`smoothstep` 平滑收邊),洪水只在 `region` 內隆到 `to`、外面維持原位 —— 解掉「全域整面上漲、不相干的水也跟著漲」。`uReg` 預設超大半徑=全域(舊 flood 向後相容);船浮/量測走 JS 鏡像 `waterYAt`;編輯器「本幕洪水」加範圍(中心點圖設、半徑、即時預覽)。實測:城/匯流口淹到 4.0,泗水出海口・沂水北源維持 0.05 不漲 | ✅ ship |
| P5.7(水鋒推進) | **`flood` 動態 region（潰堤流入感）**:加可選 `from`(決堤口),洪水橢圓**從決堤口的小水窪一邊長大、一邊往城推進**,`smoothstep` 邊緣即推進的水鋒;**招1**水鋒比水位快(`region` 進度 `p*1.6`,先漫到城、水位在後面追)、**招2**決堤口可挪離河道往乾地(初灘落乾地、衝入感更強);scrub 跳末態=全區。編輯器「本幕洪水」加決堤口(點圖設)。實測:p=15% 決堤口已濕但城心仍乾(0.05)、p=45% 城心剛到、p=90% 全淹 → 水鋒由缺口推進 | ✅ ship |
| P5.8(可替換模型) | **glTF 模型替換**:單位 / 結構指 `model:"assets/models/x.glb"`(+ `modelScale`/`modelY`)就用 GLTFLoader 載入蓋掉內建造型——**結構**=藏內建、掛 glb 進已定位 group;**陸軍**=glb 各 mesh 幾何合成一個餵 InstancedMesh(保留隊形矩陣 + 陣營色 Lambert);**水師**=每艘船 mesh 換成 glb clone(保留傾覆/沉沒;glb 無帆 → 燃燒不變帆色)。沒指就用內建(向後相容)。`tools/make-test-glb.mjs` 手刻最小合法 glb(JSON chunk 空白補齊)當測試素材;`validate-data` 檢查 model 路徑存在;**編輯器**「座標/模型」可選物件填 glb 路徑 + 縮放、即時換。實測:下邳城→方尖碑、劉備軍兵卒→小方尖碑(留綠)、呂布軍無 model 仍圓柱、caoNavy(24 船)setModel 零 error | ✅ ship |
| 未來 | 真・導向式洪水(水有**速度**、繞地勢流動而非橢圓擴張)、事件卡手動擺位、每場獨立 OG/SEO 殼 | 待做 |

## Backlog / 已知待辦

- [ ] **`RZ` 河中線函式是赤壁長江硬編碼**(`play.html` `const RZ=x=>18*sin(...)`):`marker followRiver`
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
