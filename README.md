# Battlefield Editor — AI 戰場編輯器

> A data-driven, single-file 3D engine for cinematic historical battles.
> **每一場戰役都是一份資料 package,引擎只負責載入與演出。** AI 編寫資料、人負責驗收與微調。

換一份 package,就換一場戰役 —— 不必動引擎程式。本 repo 的引擎、資料契約(schema)、驗證工具與
AI 編輯 SOP 是一套;`packages/` 裡的赤壁、官渡只是它「消費」的兩份範例。

## 線上展示

- 赤壁之戰(預設):`index.html`
- 官渡之戰:`index.html?pkg=packages/guandu/battlefield.json`

(部署後填上 GitHub Pages 連結。)

## 它是什麼

一個零建置(zero-build)、單檔 Three.js(r160,CDN importmap)的戰場演出引擎:

- **參數化類比地形**:河道(Catmull 控制點)、丘陵、區塊、色帶 → 連續平滑高度場。
- **資料驅動的一切**:陣營、地形、結構(城/營/隘/標記)、單位(陸軍/水師)、場景(多幕時間軸 +
  運鏡 + 特效 + 事件)、音訊(配樂/旁白/字幕/音效 cue)全部寫在 package 的 JSON 裡。
- **宣告式特效/音效詞彙**:`volley`(箭雨)、`ignite`(燃燒)、`shake`(震動)、`campFire`(營火)…
  由引擎的 dispatcher 執行;package 只宣告「何時、對誰」。
- **多陣營**:面板、圖例、旗幟、單位標籤配色全由 `factions.json` 動態生成,不限陣營數。

設計準則:引擎只懂「怎麼演」,不懂「演哪場」。任何戰役知識都活在 package 資料裡。

## Repo 結構

```
index.html              引擎(單檔;GitHub Pages 由 root 提供)
schema/                 各層資料的 JSON Schema(契約)
tools/
  validate-data.mjs     零依賴驗證器(跨檔交叉引用檢查)
  terrain-fit.mjs       地形數值擬合工具
docs/authoring/         AI 編輯 SOP(每層一份:怎麼改、欄位意義、可貼範例、驗收)
packages/
  chibi/                赤壁之戰(完整範例:9 幕 + 旁白語音 + 音樂 + 音效 + assets/)
  guandu/               官渡之戰(最小範例:3 幕,音訊待補 —— 留作 AI 編輯的 dogfood)
```

每個 package 自足:`battlefield.json`(manifest)指向同目錄的六層資料,素材放在自己的 `assets/`
(路徑相對 manifest 目錄解析)。

## 快速開始

```bash
# 本機預覽(需在 repo 根目錄起一個靜態伺服器,因為用到 fetch + ES module)
python3 -m http.server 8080
# 開 http://localhost:8080/                                   → 赤壁
# 開 http://localhost:8080/?pkg=packages/guandu/battlefield.json → 官渡

# 驗證資料包(任意 package 用 --pkg)
node tools/validate-data.mjs                                    # 預設驗 chibi
node tools/validate-data.mjs --pkg packages/guandu/battlefield.json
```

## 編一場新戰役

1. 複製 `packages/guandu/` 當骨架,改 `battlefield.json` 的 `meta`(標題/年號/印章/終幕字)。
2. 依 `docs/authoring/` 逐層編 `factions / terrain / structures / units / scene / audio`。
   每份 SOP 都有欄位說明 + 可貼上的最小範例 + 驗收方式。
3. `node tools/validate-data.mjs --pkg packages/<你的>/battlefield.json` 跑綠
   (它會交叉檢查:scene 引用的 unit/structure/faction 是否存在、env 是否合法、每幕有沒有 shots…)。
4. 開 `index.html?pkg=packages/<你的>/battlefield.json` 在瀏覽器看 —— **視覺/聽覺/編排的「對不對」由人驗收**。

> schema 過了不代表畫面對:地形河道、城營位置、運鏡、編排的「好不好」是人的工作;
> 驗證器只保證「結構合法 + 引用完整 + 不會 throw」。

## 資料六層

| 層 | 檔 | 內容 |
|---|---|---|
| 陣營 | `factions.json` | 名稱/旗/色(col/dark/light)/面板名/圖例名;陣營 id 任意 |
| 地形 | `terrain.json` | world 尺寸、河道、丘陵、區塊、色帶 → 參數化高度場 |
| 結構 | `structures.json` | city/camp/pass/marker;camp 可帶 `fire` 火源;marker 可 `followRiver` |
| 單位 | `units.json` | army/fleet、陣營、兵力、初始 `start`、`gait`、`chainable`、`info` |
| 場景 | `scene.json` | 多幕:標題/年號/環境/運鏡 shots/set 佈署/march/fx/events/strat/combat/finale |
| 音訊 | `audio.json` | 配樂、旁白(voices/pathPattern/cues/voiceLabels)、音效 cue |

## 由來

從 [`red-cliffs-3d`](https://github.com/yazelin/red-cliffs-3d) 抽出。原本是一個寫死的赤壁之戰 3D demo,
經 P1→P2h 逐步把「戰役」從「引擎」剝離成資料 package(過程記在 red-cliffs-3d 的 `docs/superpowers/`)。
red-cliffs-3d 仍是線上的赤壁展示;本 repo 是通用引擎的正式家。進度與下一步見 [ROADMAP.md](ROADMAP.md)。

## 授權

MIT © 林亞澤 (Yaze Lin)。引擎、契約、工具、SOP 皆 MIT。範例 package 的歷史戰役內容同 MIT。
