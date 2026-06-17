---
name: author-battlefield
description: Use when authoring or editing a battlefield-editor data package — turning a historical battle into a data package (factions/terrain/structures/units/scene/audio) that the engine renders. Encodes the AI authoring loop: draft in dependency order, clear the machine gates (validate / residue / render), then hand the human only what a machine can't judge.
---

# 編寫戰場 package(AI authoring loop)

**核心契約**:每一場戰役 = 一份資料 package,引擎只負責演出。**AI 編寫資料並通過所有機器能驗的關卡;
人只判機器判不了的三件事 —— 空間正確、電影感時序、感官品質 —— 並做微修。** 設計理由見
`docs/P4-ai-authoring-loop.md`;各層欄位字典見 `docs/authoring/<layer>.md`。

## 何時用
- 從零做一個新戰場、或擴充/修改既有 package(如把最小包養成完整戰役)。
- 不適用:改引擎能力(那是改 `index.html`,不是編資料)。

## 黃金準則
1. **嚴格依相依順序編**(下游的 id 是上游定義的):`factions → terrain → structures → units → scene → audio`。下游引用的 id 沒在上游先定義 = validator 失敗。
2. **永遠從綠燈起步**:用 `new-package` scaffold,它產出的最小骨架本身就過 validator + render-check。
3. **每改一批就過機器三關**(validate → residue → render),綠了再往下;**任一關紅,AI 自己 loop 修,不交人**。
4. **本機驗到綠才算完**;交人時附截圖 + 只列「人該判的」清單。

## 步驟

> **前置(每次動手前)**
> - 所有 `node`/`python` 指令都**在 repo 根目錄執行**;`--pkg` 相對當前目錄解析,換目錄會驗錯檔/被 403。
> - 動手前先讀 `docs/authoring/<layer>.md`(欄位字典)與 `docs/P4-ai-authoring-loop.md`(邊界)。
> - **以 `packages/gaixia/` 為黃金範例**(六層 + 旁白 + 音樂 + 音效齊全),照它的結構長相做,別自創。
> - 旁白走 edge-tts,需環境前置:`python3 -m venv /tmp/ttsenv && /tmp/ttsenv/bin/pip install edge-tts`、
>   PATH 有 `ffprobe`、本機連線需停用 sandbox。換機器先補齊,或先做純字幕(語音後補)。

### 0. Scaffold(新包才需要)
```
node tools/new-package.mjs <slug> "顯示名"
```
產出 `packages/<slug>/` 的六層 + manifest + 空音訊殼 + `assets/` + `narration/script.json` +
`narration/generate.py`(旁白範本,已備好,改 `SUBS` 即可)。
**注意**:骨架的 `red/blue`、`redBase`、name 尾 `000`、`年號○○○` 全是 placeholder;結構 gate 不會擋
未改的 placeholder,但 `residue-scan` 會印 WARN 提醒——交付前要全部換掉。

### 1. 依序編六層(對照 `docs/authoring/<layer>.md`)
- **factions**:陣營 id 任意(白名單由本檔 keys 推導)。每陣營 `col/dark/light`(標籤配色)、`panel/legend`(面板/圖例名)。
- **terrain**:`world` 尺寸要容得下所有點(留邊);河 `centerline` ≥2 控制點(引擎以 Catmull 加密);丘陵/區塊/色帶。**結構不可沉在河裡**(城/營要離河中線 > 半寬 + footprint)。
- **structures**:`city`/`camp`/`pass`/`marker`/`ferry`。camp 需 `faction`(本包陣營);`fire` 掛火源(需 id);**ferry 渡口刻意放岸邊水緣**(`rot` 轉向水側)。水名標籤直接給 `z`(別用 `followRiver`,`RZ` 目前是赤壁硬編碼)。
- **units**:`army`/`fleet`;`faction` 為本包陣營;`start{x,z,visible,formation?}`;`gait`(cav/foot);`info[short,long]`。
- **scene**:多幕。每幕 `key/title/dur/env`(env ∈ day/cold/dusk/night/inferno/dawn)+ **非空 `shots`**(line/orbit/follow)+ `power`(key 為陣營)+ `set`/`march`/`fx`/`events`/`strat`/`combat`/`finale`。**`dur` 要 ≥ 該幕旁白音長 + 緩衝**(否則旁白被切)。set/fx 引用的 unit/structure/camp 必須存在。
- **audio**:`music.scenes` 長度 = 幕數,`music.scenes[i]` 與 `pathPattern {n}` 是 **1-based**(scene1=第一幕);音效 `cues` 鍵是 **0-based 幕索引**(`"0"`=第一幕)——兩者別錯位。synth 音效(drum/boom/burst)零素材即可;mp3 素材路徑相對 manifest 目錄(放 `assets/`)。**每幕 `dur` 要 ≥ 該幕旁白較長那條人聲 + 緩衝**,否則旁白被切(`audio-check` 會擋)。

### 2. 機器四關(每批編輯後跑;都在 repo 根)
```
node tools/validate-data.mjs --pkg packages/<slug>/battlefield.json   # schema + 跨檔引用(含 follow 鏡頭 unit)
node tools/residue-scan.mjs  --pkg packages/<slug>/battlefield.json   # 無赤壁殘留 + placeholder WARN
node tools/render-check.mjs   --pkg packages/<slug>/battlefield.json   # 載入 + 逐幕截圖 + 0 console error
node tools/audio-check.mjs    --pkg packages/<slug>/battlefield.json   # 旁白音長≤幕長 + 音訊素材解析(空音訊自動放行)
```
**全綠才往下**。紅了讀錯誤訊息修(會指出檔+索引+原因)。`render-check` 的 PASS 只代表
「有幕 + 有 canvas + 截圖時機無 error」,不保證每個鏡頭每幀都求值過——鏡頭指向的 id 由 validate-data 把關。

### 3. 旁白語音(要的話)
- 文本寫進 `packages/<slug>/narration/script.json`(每幕一段:`{scene,title,text}`,scene 為 1-based)。
- 跑 scaffold 已備好的 `packages/<slug>/narration/generate.py`(edge-tts 雙聲;`ROOT` 自動指向本包,**唯一要改 `SUBS`**):
  ```
  /tmp/ttsenv/bin/python3 packages/<slug>/narration/generate.py        # 連線需停用 sandbox
  ```
- **edge-tts 要點**:**讀音用台灣音**;罕用字(如 彧/郃/剷/騅)會回空音訊、破音字(降=投降xiáng、還=huán、拚=拼pīn、王=封王wàng)會唸錯 → 優先在 script 改白話避開,非用不可才在 `SUBS` 加同音替身(字幕由 `to_display` 還原原字)。
- 生完**先逐幕對帳音長**:每幕 `dur` 短於旁白就把 `dur`(連同 orbit 鏡頭/finale 時點)拉長,留 ~3.5s 緩衝;`audio-check` 會把關。
- 填 `audio.json` 的 `narration`(voices/default/voiceLabels/pathPattern/cues)、`music.scenes`、`sfx`、`cues`。
- 音樂/音效素材:Freesound CC0 海選 + 代聽,或暫借既有 CC0 並在 `assets/CREDITS.md` 註明(可日後換)。

### 4. 交人(所有機器關綠之後)
附上:① validator PASS 行 ② residue PASS ③ render-check 的 0-error log + `tools/render-out/<slug>/` 逐幕截圖,
並**只列人該判的**:
- **空間**:地點/單位/鏡頭位置合不合理?有沒有沉河、重疊、路徑穿地形?(俯視可用 `?pkg=…` 開瀏覽器 + `__topdown()`;Shift+點地圖取座標回報)
- **時序/運鏡**:鏡頭有沒有框到主角?fx 與旁白同拍?節奏順?
- **感官**:env 氣氛、配色辨識度、旁白發音(台灣音)、音樂貼合度。
- **史實**:旁白文字、史/演義 tag、策略卡。

## 機器關卡 vs 人的關卡(別越界)
| 機器(AI 自己過,有對應 gate) | 人(AI 不要自我認證) |
|---|---|
| schema 合法、跨檔引用完整、follow 鏡頭 unit 存在(validate-data) | 位置在不在合理的地方(空間) |
| 無赤壁複製殘留;placeholder 已換(residue-scan,後者為 WARN) | 鏡頭框沒框到、fx 對不對拍(時序) |
| 載入無誤、有畫面、0 console error(render-check) | 好不好看、好不好聽(感官) |
| 旁白音長 ≤ 幕長、音訊素材全解析、music.scenes 長度=幕數(audio-check) | 發音對不對、史實/tag 對不對 |

機器四關**不是品味**,是客觀門檻;品味與正確性留給人。
> 注意:`render-check` 綠 ≠ 每幀都求值過;只在特定幀觸發的壞引用(如 follow 指向幽靈 unit)由
> validate-data 把關。`music.scenes` 留空、placeholder 未改不會讓 gate FAIL(前者 audio-check 放行
> 早期狀態、後者 residue 只 WARN)——交付前自己再掃一遍。
