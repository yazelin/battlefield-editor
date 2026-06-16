# 編寫 `packages/chibi/audio.json`

給 AI 與人類編輯者的指南。本檔每個欄位都對應引擎(`index.html`)實際消費的資料,或 `schema/audio.schema.json` 的契約。**不要發明欄位或音效型別**——本指南沒列到的欄位,引擎會默默忽略,validator 也可能直接退件。

## `audio.json` 是什麼

`audio.json` 是整場戰役的**音訊 manifest**:它不裝音檔本身,而是宣告「哪個檔配哪幕、旁白聲線與路徑規則、每幕有哪些事件音效 cue」。配樂 / 旁白 / 音效的 mp3 與**程序合成器**(Web Audio 即時合成的鼓、爆音等)是引擎與資產,不在本檔——本檔只決定它們**怎麼被引用與排程**。

它是戰場 package 的最後一層。外部化後 `battlefield.json` 用 `data.audio` 指向本檔,`pending` 清空(=`[]`),整張戰場成為純資料。引擎在音訊初始化時載入:

```js
const AUDIO = await (await fetch('packages/chibi/audio.json')).json();
```

頂層四個欄位,全部必填:

| 欄位 | 型別 | 意義 |
|---|---|---|
| `music` | object | 每幕配樂與主題曲的 mp3 對應 |
| `narration` | object | 旁白聲線、預設聲線、路徑規則、字幕 cues 來源 |
| `sfx` | object | 檔案型音效(真實錄音 mp3)的目錄與清單 |
| `cues` | object | 每幕的事件音效時間表(宣告式 cue) |

### 兩種音源:mp3 資產 vs 程序合成器

引擎播兩類聲音,分清楚很重要:

- **mp3 資產**:放在 `assets/` 下的實體檔(配樂、旁白、刀劍 / 吶喊 / 鐵索錄音)。本 manifest 列的就是這些檔的路徑。
- **程序合成器**:引擎用 Web Audio 即時合成、**沒有檔案**的樂器(如鼓 `drum`、爆音 `boom`、馬蹄、腳步、火場嗶剝、江水、風)。這些合成器**活在程式裡**(`index.html` 的 `BUILD` 表),manifest 不能新增 / 改它們,只能在 `cues` 裡用 `synth` 型別**引用**已存在的合成器(目前 cue 詞彙允許的合成樂器是 `drum` 與 `boom`)。

> 規則:要播 mp3 → 該檔必須真的存在於 `assets/` 且列在 manifest;要播合成樂器 → 該樂器必須已在引擎 `BUILD` 裡。manifest 不創造任何新音色。

### 幕的索引

`cues` 的鍵是**幕索引,0-based**(第一幕=`0`、終幕=`8`),與時間軸引擎內部一致。注意這跟 `music.scenes` 與旁白路徑的**檔名 scene 編號(1-based)**不同:`cues["0"]` 是第一幕,而第一幕的配樂是 `assets/music/scene1.mp3`、旁白是 `.../scene1.mp3`。

### 時間單位

cue 的 `at`(以及 `burst` 的 `interval`)都是**幕內秒數**,從進入該幕起算 0,對齊旁白句級時間軸與視覺 fx。

---

## `music`

每幕的循環配樂與主題曲,值都是 mp3 路徑:

| 欄位 | 型別 | 意義 |
|---|---|---|
| `scenes` | array of string | 九幕配樂路徑,**依幕序排列(索引 0=第一幕)**,長度須為 9 |
| `theme` | string | 主題曲路徑(片頭 / 片尾用) |

```json
"music": {
  "scenes": [
    "assets/music/scene1.mp3","assets/music/scene2.mp3","assets/music/scene3.mp3",
    "assets/music/scene4.mp3","assets/music/scene5.mp3","assets/music/scene6.mp3",
    "assets/music/scene7.mp3","assets/music/scene8.mp3","assets/music/scene9.mp3"
  ],
  "theme": "assets/music/scene9.mp3"
}
```

引擎進入第 `i` 幕時播 `scenes[i]`(循環),跨幕交叉淡入;主題曲讀 `theme`。`scenes` 的每個路徑與 `theme` 都必須指向**存在的** mp3。

---

## `narration`

旁白聲線設定與路徑規則。引擎不在 manifest 列每一個旁白檔,而是給**聲線清單 + 路徑模板**,由引擎以聲線與幕號代入算出實際路徑。

| 欄位 | 型別 | 意義 |
|---|---|---|
| `voices` | array of string | 可用聲線鍵清單(對應 `assets/narration/<voice>/` 子目錄) |
| `default` | string | 預設聲線,須是 `voices` 之一 |
| `voiceLabels` | object(選填) | 聲線鍵 → 切換鈕顯示名(如 `{"yunjhe":"男聲","hsiaochen":"女聲"}`);省略則鈕顯示鍵本身 |
| `pathPattern` | string | 路徑模板,含 `{voice}` 與 `{n}` 兩個佔位符 |
| `cues` | string | 字幕時間軸 JSON 的路徑(句級時間 + 文字) |

```json
"narration": {
  "voices": ["yunjhe","hsiaochen"],
  "default": "yunjhe",
  "voiceLabels": { "yunjhe": "男聲", "hsiaochen": "女聲" },
  "pathPattern": "assets/narration/{voice}/scene{n}.mp3",
  "cues": "assets/narration/cues.json"
}
```

- `{voice}` 代入聲線鍵,`{n}` 代入幕的 **1-based scene 編號**。例如 `default=yunjhe`、第一幕(n=1)→ `assets/narration/yunjhe/scene1.mp3`;切到 `hsiaochen` 第七幕(n=7)→ `assets/narration/hsiaochen/scene7.mp3`。介面的聲線切換鈕在 `voices` 之間輪替、標籤取自 `voiceLabels`;**少於兩個聲線時切換鈕自動隱藏**。`voices` 為空時整套旁白語音停用(無聲、無錯)。
- `cues` 指向的 `cues.json` 是**字幕資料**(每幕、每聲線的句子時間與文字),由旁白資產自帶。manifest 只負責**指到它**;字幕內容不在 `audio.json` 裡編。**有 `cues` 但沒語音音檔時,引擎會用「場景計時器」驅動字幕**(`subTick`),所以可以先放字幕、語音之後再補。

⚠️ **素材路徑的 base**:`music.scenes`、`pathPattern`、`sfx.dir`、`narration.cues` 這幾個指向**素材**的路徑,引擎是**相對網站根目錄(document root)**解析的,**不吃 manifest 的相對基準**(這點和指向 `packages/<名稱>/*.json` 的那層不同)。所以非赤壁的 package 要放音檔,路徑要從 repo 根寫起,例如 `"packages/<名稱>/assets/narration/{voice}/scene{n}.mp3"`、`"cues":"packages/<名稱>/cues.json"`;或直接共用根目錄既有的 `assets/`。(讓每個 package 乾淨自足的「資產基準」規範留待 P3 抽 repo 時定案。)

---

## `sfx`(檔案型音效)

真實錄音的一次性 / 跨幕音效 mp3。manifest 給目錄與檔名清單,引擎以 `dir/<name>.mp3` 取檔。

| 欄位 | 型別 | 意義 |
|---|---|---|
| `dir` | string | 音效目錄(不含結尾斜線) |
| `files` | array of string | 檔名清單(**不含 `.mp3` 副檔名**) |

```json
"sfx": {
  "dir": "assets/sfx",
  "files": ["battlecry","chains","sword1","sword2","sword3","sword4"]
}
```

- 目前清單:`battlecry`(吶喊)、`chains`(鐵索 / 鐵環連船)、`sword1`–`sword4`(刀劍,四個隨機變體)。
- `cues` 用 `sfx` 型別引用這些檔(用 `name`,不帶副檔名);`sword` 型別會從 `sword1`–`sword4` 隨機挑一個。
- 每個 `files[i]` 對 `dir/<name>.mp3` 都必須指向**存在的**檔。

---

## `cues`(每幕事件音效時間表)

`cues` 是物件,鍵是**幕索引(0-based 字串)**,值是該幕的事件音效陣列。引擎進幕時把該幕 cue 依 `at` 排進待辦佇列,到秒觸發 `dispatchAudioCue`。沒有事件音效的幕可以不列(省略該鍵)。

每個 cue 至少有 `at`(幕內秒)與 `type`。**只有以下四種 `type`**:

| `type` | 必填欄位 | 效果 |
|---|---|---|
| `synth` | `inst`, `v` | 播一聲程序合成樂器(`inst` ∈ `drum` / `boom`),音量 `v` |
| `sfx` | `name`, `v` | 播一個檔案型音效(`name` 須是 `sfx.files` 之一),音量 `v` |
| `sword` | `v` | 從 `sword1`–`sword4` 隨機挑一個刀劍音播,基準音量 `v`(引擎再加隨機微調) |
| `burst` | `inst`, `n`, `interval`, `v` | 連發 `n` 聲合成樂器 `inst`,每聲間隔 `interval` 秒,音量 `v` |

各 `type` 的欄位:

| 欄位 | 型別 | 用於 | 意義 |
|---|---|---|---|
| `at` | number | 全部 | 幕內第幾秒觸發 |
| `inst` | string | `synth` / `burst` | 合成樂器鍵,只能 `drum` 或 `boom`(須已存在於引擎 `BUILD`) |
| `name` | string | `sfx` | 音效檔名,須是 `sfx.files` 之一(不帶副檔名) |
| `v` | number | 全部 | 音量(約 0–1) |
| `n` | number | `burst` | 連發次數 |
| `interval` | number | `burst` | 連發間隔(秒) |

```json
"cues": {
  "0": [
    {"at":2,"type":"synth","inst":"drum","v":0.5},
    {"at":6,"type":"synth","inst":"drum","v":0.6},
    {"at":10.5,"type":"synth","inst":"drum","v":0.5},
    {"at":18.5,"type":"synth","inst":"drum","v":0.65},
    {"at":24,"type":"synth","inst":"drum","v":0.45}
  ],
  "2": [
    {"at":9.5,"type":"synth","inst":"drum","v":0.8},
    {"at":9.5,"type":"sfx","name":"battlecry","v":0.55},
    {"at":10.4,"type":"sword","v":0.45},
    {"at":11.8,"type":"sword","v":0.35},
    {"at":13.1,"type":"sword","v":0.4},
    {"at":14.9,"type":"sword","v":0.3}
  ],
  "3": [
    {"at":5,"type":"sfx","name":"chains","v":0.7}
  ],
  "6": [
    {"at":23.4,"type":"burst","inst":"drum","n":6,"interval":0.4,"v":0.75},
    {"at":23.4,"type":"sfx","name":"battlecry","v":0.5}
  ],
  "8": [
    {"at":13,"type":"synth","inst":"drum","v":0.7}
  ]
}
```

### 複合時刻拆成多個 cue

引擎是逐 cue 觸發,所以同一秒要播兩種聲音(例如「鼓 + 吶喊」)就寫**兩筆 cue、同一個 `at`**,別塞進一筆。上例第三幕(索引 `2`)的 `at:9.5` 寫成 `synth drum` 與 `sfx battlecry` 兩筆;第七幕(索引 `6`)的 `at:23.4`(旁白「雷鼓大進」)寫成 `burst`(6 連鼓)+ `sfx battlecry` 兩筆。

> `burst` 專門表達「一個觸發點連發 N 聲」(如雷鼓大進的 6×drum @0.4s);若是不同秒各一聲鼓,就寫多筆 `synth`,不要用 `burst`。

---

## RECIPES(操作食譜)

### 換某一幕的配樂

改 `music.scenes` 對應索引的路徑(記得 0-based:第一幕=索引 0)。先把新 mp3 放進 `assets/music/`,再指過去。例如把第五幕(索引 4)換成新檔:

```json
"music": {
  "scenes": [
    "assets/music/scene1.mp3","assets/music/scene2.mp3","assets/music/scene3.mp3",
    "assets/music/scene4.mp3","assets/music/scene5b.mp3","assets/music/scene6.mp3",
    "assets/music/scene7.mp3","assets/music/scene8.mp3","assets/music/scene9.mp3"
  ],
  "theme": "assets/music/scene9.mp3"
}
```

新路徑必須指到**真的存在**的檔(validator 會檢查存在性);`scenes` 長度維持 9。要換主題曲就改 `theme`。

### 加一個旁白聲線

先在 `assets/narration/` 下建該聲線的子目錄,放齊 `scene1.mp3`–`scene9.mp3`(檔名要對得上 `pathPattern`),再把聲線鍵加進 `voices`:

```json
"narration": {
  "voices": ["yunjhe","hsiaochen","laoyang"],
  "default": "yunjhe",
  "pathPattern": "assets/narration/{voice}/scene{n}.mp3",
  "cues": "assets/narration/cues.json"
}
```

加完 `laoyang` 後,引擎切到該聲線會以 `pathPattern` 代入算出 `assets/narration/laoyang/scene{n}.mp3`。注意:`pathPattern` 的佔位符固定是 `{voice}` 與 `{n}`,別改模板格式;`default` 必須是 `voices` 之一。若該聲線也要字幕,記得在 `cues` 指向的 `cues.json` 補上對應聲線的句子(那是旁白資產的工作,不在 `audio.json`)。

### 在某幕加一個音效 cue

在 `cues` 對應**幕索引(0-based)**的陣列加一筆(沒有該幕鍵就先建空陣列)。例如給第四幕(索引 `3`)在第 8 秒補一聲鼓:

```json
"cues": {
  "3": [
    {"at":5,"type":"sfx","name":"chains","v":0.7},
    {"at":8,"type":"synth","inst":"drum","v":0.6}
  ]
}
```

只能用 `synth / sfx / sword / burst` 四種 `type`;`synth` / `burst` 的 `inst` 只能 `drum` 或 `boom`(不能在 manifest 新增合成樂器),`sfx` 的 `name` 必須是 `sfx.files` 裡有的檔名。同一秒要播兩種聲音就寫兩筆同 `at` 的 cue。

---

## 複製即用範例(一個音效 cue)

以下是一筆可直接貼進某幕 `cues` 陣列的事件音效 cue ——第七幕(索引 `6`)火攻時,在第 16.8 秒補一記刀劍交擊:

```json
{"at":16.8,"type":"sword","v":0.45}
```

播檔案型音效(吶喊)版本:

```json
{"at":10,"type":"sfx","name":"battlecry","v":0.85}
```

貼完跑驗收指令:

```bash
node tools/validate-data.mjs
```

應印出 `PASS`。

---

## 驗收

1. 結構 / 契約驗:

   ```bash
   node tools/validate-data.mjs
   ```

   應印出 `PASS`。validator 會檢查 `audio.json` 能 parse、每個 cue 都有數字 `at`、每個 cue 的 `type` 屬於 `synth / sfx / sword / burst`,以及 `music.scenes` 是非空陣列且每個路徑都指向**存在的** assets 檔。頂層四個欄位齊全由 `schema/audio.schema.json` 把關(同時也限定 cue `type` 列舉)。

   > 注意:validator 與 schema **都不會**檢查 `synth` / `burst` 的 `inst` 真的是 `drum` / `boom`、`sfx` 的 `name` 真的在 `sfx.files` 裡,也不檢查 `theme` 與各 `sfx` 檔的路徑是否存在——這些對應關係由你(編輯者)負責對齊。寫錯 `inst` / `name` 仍會過 validator,但引擎執行期會找不到對應的合成器或檔案而無聲(`sfx` 缺檔時部分還有合成備援)。

2. 人類聽一遍:在瀏覽器開 `index.html`,逐幕走過去,**用耳朵**確認配樂在對的幕切換、旁白聲線與字幕對得上、事件音效(箭雨刀劍鼓、吶喊、鐵索、火攻音景)在對的秒響起、跨幕長音(吶喊 / 鐵索)有正常收掉。schema 過了不代表聲音對——這一步由人把關。

> 提醒:本檔是純資料,改完不需重編譯,重新整理頁面即可載入新的 `audio.json`。cue 只接受 `synth / sfx / sword / burst` 四種 `type`,合成樂器只有 `drum` / `boom`——要新增音色或檔案型音效,得分別動引擎 `BUILD` 或在 `assets/sfx/` 放新檔並列進 `sfx.files`,不能只在 manifest 發明。
