# 編寫 `packages/<名稱>/scene.json`

給 AI 與人類編輯者的指南。本檔每個欄位都對應引擎(`index.html`)實際消費的資料,或 `schema/scene.schema.json` 的契約。**不要發明欄位**——本指南沒列到的欄位,引擎會默默忽略,validator 也可能直接退件。

## `scene.json` 是什麼

`scene.json` 是整段時間軸(timeline)的劇本資料。它只有一個頂層欄位 `acts`,是一個**幕(act)陣列**(幕數依戰役而定:赤壁 package 九幕、官渡 package 三幕)。引擎在啟動時依 manifest 載入:

```js
const SCENE = await (await fetch(PKG_BASE + PKG.data.scene)).json();
const PHASES = SCENE.acts;
```

時間軸引擎逐幕播放:每進一幕(`gotoPhase`)就套用該幕的環境、單位佈署、行軍動線、相機運鏡,並把該幕的 `events / strat / fx / finale` 排成「到第幾秒觸發」的待辦佇列(`pending`),隨幕內時間 `phaseT` 推進依序執行。

這份檔案以前是寫死在 `index.html` 的 `PHASES` 常數;外部化後它成為戰場 package 的一層,可被 AI 編輯。`battlefield.json` 用 `data.scene` 指向本檔。

### 座標系統

世界座標為 `x`(東西)與 `z`(南北),單位同 `terrain.json` 的世界單位。幕內所有 `path`、`shots` 的相機點、`events` 的位置、`fx` 的 `from/to` 都用這套座標。佈署/動線的點寫成 `[x, z]`(兩元素);相機點寫成 `[x, y, z]`(三元素,含高度 `y`)。

### 時間單位

幕的 `dur` 與所有 `at`(events / strat / fx / finale 的觸發時間)都是**幕內秒數**,從進入該幕起算 0。`set` 內移動的 `dur` 也是秒。

---

## 一幕的欄位

每個 act 物件可有下列欄位。`key / title / dur / env / shots` 為每幕必填(`shots` 必須是非空陣列,否則相機 director 每幀讀 `shots[...].dur` 會在自動播映時 throw);其餘按該幕需要而定。`era` 雖非 validator 強制,但幕標與年代區會用到,實務上每幕都填。

| 欄位 | 型別 | 意義 |
|---|---|---|
| `key` | string | 幕名,如 `第一幕`、`終幕`(顯示於幕標) |
| `era` | string | 年代字串,如 `建安十三年 秋`(顯示於幕標與年代區) |
| `title` | string | 幕標題,如 `大軍南下` |
| `dur` | number | 該幕總長(秒) |
| `env` | string | 環境光照預設,見下方枚舉 |
| `narr` | string | 旁白文字(顯示於下方解說) |
| `power` | object | 勢力面板,鍵須為陣營 id,見下方 |
| `shots` | array | 相機運鏡序列(每幕必填、不可空),見「相機 `shots`」 |
| `combat` | array | 該幕做側舷齊射(broadside)的單位 id 清單,見下方 |
| `set` | object | 進幕時套用的場景狀態,見「`set` 與 `scrubSet`」 |
| `march` | array | 行軍動線箭頭,見下方 |
| `events` | array | 事件標記(地圖上彈出卡),見下方 |
| `strat` | object | 計策卡(畫面彈出大卡),見下方 |
| `fx` | array | 宣告式特效事件,見「fx 事件詞彙」 |
| `scrubSet` | object | 跳幕時瞬間套用的狀態,見「`set` 與 `scrubSet`」 |
| `finale` | number | 幕內第幾秒顯示結局畫面 |

### `env`(必填)

環境光照預設鍵,只能是以下其中之一(對應引擎 `ENV` 表):

`day` ・ `cold` ・ `dusk` ・ `night` ・ `inferno` ・ `dawn`

其中 `inferno`(火燒赤壁)會開啟火光(`glow`)。不要新增其他鍵。

### `power`

勢力資訊面板。鍵**必須是本 package `factions.json` 裡的陣營 id**(引擎以 `n_<fac> / b_<fac> / s_<fac>` 對應面板節點,非陣營 key 會靜默跳過;validator 則直接退件)。陣營 id 是**任意**的——赤壁 package 是 `cao / sun / liu`,官渡 package 是 `yuan / cao`;不要寫死成某組固定值。每個值是 **三元素陣列** `[兵力字串, 進度百分比, 狀態字串]`:

```json
"power":{
  "cao":["約 200,000+（號稱八十萬）",100,"新得荊州・銳氣正盛"],
  "sun":["30,000",15,"按兵柴桑・觀望形勢"],
  "liu":["約 20,000（含劉琦）",10,"長坂新敗・退保夏口"]
}
```

第二元素是 0–100 的數字,當作那一方力量條的寬度(`%`)。

### `combat`(側舷齊射的艦隊)

陣列,元素是該幕要做側舷齊射(broadside,船身轉成側對開火姿態)的**單位 id**。進幕時引擎先把所有單位的 `combat` 清掉,再對本欄列出的單位設 `combat=true`;這些單位在沒有 `path` 行進時會把船首轉向最近的 0 或 π(側身),營造對轟。取代了以前寫死在 `index.html` 的 `COMBAT_FLEETS` 常數,以及「靠幕索引猜哪幾支船參戰」的舊邏輯——現在哪幾支參戰完全由本欄資料決定。

每個 id 必須是 `units.json` 裡實際存在的單位(validator 會檢查;不存在的 id 會被忽略)。

```json
"combat":["caoNavy","sunFleet","liuFleet"]
```

### `march`(行軍動線)

陣列,每元素是一條行軍箭頭:

| 欄位 | 型別 | 意義 |
|---|---|---|
| `pts` | array of `[x,z]` | 動線折點(≥2 點) |
| `fac` | string | 陣營 id,須是本 package `factions.json` 的鍵(決定箭頭顏色);未知 `fac` 會讓 `addMarch` throw |

```json
"march":[{"pts":[[-250,-150],[-242,-100],[-240,-40]],"fac":"cao"}]
```

`march` 只畫示意箭頭,不會移動單位本體;要移動單位用 `set` 的 `path`。

### `events`(事件標記)

陣列,每元素是一張在地圖上某點彈出的小卡:

| 欄位 | 型別 | 意義 |
|---|---|---|
| `at` | number | 幕內第幾秒彈出 |
| `x` | number | 世界 x |
| `z` | number | 世界 z |
| `t` | string | 卡片文字 |
| `tag` | string | `史`(史實)或 `演義`(小說),決定卡片配色 |

```json
{"at":2.5,"x":-250,"z":-160,"t":"劉琮舉州投降","tag":"史"}
```

### `strat`(計策卡)

單一物件(每幕至多一張),於 `at` 秒在畫面彈出一張大卡:

| 欄位 | 型別 | 意義 |
|---|---|---|
| `at` | number | 幕內第幾秒彈出 |
| `name` | string | 計策名,如 `連環計` |
| `by` | string | 出處/人物,如 `龐統 獻計 曹操`(顯示時前綴 `史載・`/`演義・`) |
| `tag` | string | `史` 或 `演義`(決定印章是 `史` 還是 `計`,及前綴) |
| `desc` | string | 計策說明全文 |

```json
"strat":{"at":2,"name":"連環計","by":"龐統 獻計 曹操","tag":"演義",
  "desc":"正史載曹操自令船艦相連以減顛簸;演義中為龐統詐獻之計。"}
```

### `scrubSet`(跳幕瞬間狀態)

物件,結構與 `set` **完全相同**(同一套鍵與值,見下方「`set` 與 `scrubSet`」),只是語意是「**跳到/重建此幕時瞬間套用**(無動畫)」。重建時間軸(往回跳或拖曳 scrub)會把先前各幕的 `set` 與 `scrubSet` 都以瞬間模式重播,確保跳到任何一幕時世界狀態正確。例如火燒幕用 `scrubSet` 讓「跳進此幕」時曹軍船陣直接呈現燃燒、營寨直接著火:

```json
"scrubSet":{"caoNavy":{"state":"burn"},"campWulin":{"fire":1}}
```

### `finale`

數字。設了之後,該幕第 `finale` 秒會顯示結局畫面(目前只有終幕用,值 `14`)。

---

## 相機 `shots`(運鏡)

`shots` 是陣列,依序播放;每個 shot 用滿自己的 `dur` 後切到下一個。三種 `kind`:

### `line`(直線推移)

相機從 `a` 沿直線移動到 `b`,鏡頭一直看向 `look`。

| 欄位 | 型別 | 意義 |
|---|---|---|
| `kind` | `"line"` | |
| `a` | `[x,y,z]` | 起點相機位置 |
| `b` | `[x,y,z]` | 終點相機位置 |
| `look` | `[x,y,z]` | 注視點(全程固定) |
| `dur` | number | 此鏡頭時長(秒) |

```json
{"kind":"line","a":[-420,250,300],"b":[-250,160,170],"look":[-180,0,-70],"dur":16}
```

### `orbit`(環繞)

相機繞著中心 `c`,半徑 `r`、固定高度 `h`,角度從 `a0` 弧度掃到 `a1` 弧度。

| 欄位 | 型別 | 意義 |
|---|---|---|
| `kind` | `"orbit"` | |
| `c` | `[x,y,z]` | 環繞中心(亦為注視點) |
| `r` | number | 環繞半徑 |
| `h` | number | 相機高度 |
| `a0` | number | 起始角(弧度) |
| `a1` | number | 結束角(弧度) |
| `dur` | number | 此鏡頭時長(秒) |

```json
{"kind":"orbit","c":[-42,0,-11],"r":74,"h":34,"a0":2.7,"a1":4.3,"dur":25}
```

### `follow`(跟拍單位)

相機以固定偏移 `off` 跟著某個單位移動,鏡頭看向該單位。

| 欄位 | 型別 | 意義 |
|---|---|---|
| `kind` | `"follow"` | |
| `unit` | string | 要跟的單位 id(須是 `units.json` 裡的單位,見下方「單位 id」) |
| `off` | `[dx,dy,dz]` | 相對單位位置的相機偏移 |
| `dur` | number | 此鏡頭時長(秒) |

```json
{"kind":"follow","unit":"hgFleet","off":[10,22,-34],"dur":14.4}
```

---

## `set` 與 `scrubSet`(進幕 / 跳幕狀態)

`set` 是一個物件,鍵是「要設定的東西」。進幕時以**動畫模式**套用(`applySet(set,false)`),跳幕重建時各先前幕以**瞬間模式**重播(`applySet(set,true)` 與 `applySet(scrubSet,true)`)。`scrubSet` 是同一套結構,只是只在重建/scrub 時套用。

鍵只有三類:**保留字旗標**、**單位 id**、**結構 id**。`applySet` 逐鍵判斷:鍵是保留字 → 設旗標;鍵在結構表(`STRUCT`)→ 當結構控制;否則查單位表(`U`),查不到就**跳過**。所以鍵必須對得上本 package 的 `units.json` / `structures.json` id。

### 保留字旗標(值是 boolean)

| 鍵 | 型別 | 意義 |
|---|---|---|
| `chains` | boolean | 鐵索連環(`true` 顯示連鎖鐵環,套在宣告 `chainable` 的艦隊上) |
| `wind` | boolean | 東南風(`true` 開啟風場;進幕時 `set.wind` 為真還會同步加強旗幟飄動) |

### 單位 id(值是物件)

鍵是 `units.json` 裡的單位 id(赤壁 package 為 `caoMain / caoNavy / caoRen / liuArmy / liuFleet / sunFleet / hgFleet`;其他 package 自有一組 id)。物件可帶的欄位:

| 欄位 | 型別 | 意義 |
|---|---|---|
| `visible` | boolean | 顯示/隱藏該單位 |
| `formation` | string | 隊形,`tight`(緊密,如鐵索連環)或 `loose`(鬆散) |
| `path` | array of `[x,z]` | 移動路徑折點;動畫模式下沿路徑移動並自動現身,瞬間模式下直接放到終點 |
| `dur` | number | 沿 `path` 移動的秒數(預設 8) |
| `state` | string | 整支單位的狀態:`burn`(燃燒)或 `wreck`(殘骸沉沒);瞬間模式下直接套滿 |

```json
"set":{
  "caoNavy":{"path":[[-150,16],[-90,4],[-42,-11]],"dur":9},
  "sunFleet":{"path":[[60,10],[30,13]],"dur":8},
  "hgFleet":{"visible":true}
}
```

```json
"set":{"caoNavy":{"formation":"tight"},"chains":true}
```

### 結構 id(值是物件)

鍵是 `structures.json` 裡的結構 id(城 / 營 / 隘 / 標記;能著火的通常是 `camp`,如赤壁的 `campWulin`)。物件可帶的欄位:

| 欄位 | 型別 | 意義 |
|---|---|---|
| `visible` | boolean | 顯示/隱藏該結構 |
| `fire` | number(0..1) | 火源強度目標(`1` 為全著火);需該結構在 `structures.json` 有定義 `fire` 才有火源 emitter |
| `smoke` | number(0..1) | 轉為僅冒煙(餘燼);設了會把該火源切成 smokeOnly 並把目標拉到此值 |

```json
"set":{"campWulin":{"visible":true}}
```

```json
"set":{"caoNavy":{"state":"wreck"},"hgFleet":{"state":"wreck"},"chains":false,"wind":false,"campWulin":{"smoke":0.8}}
```

### 從舊 pseudo-key 遷移(重要)

P2h 之前 `set` / `scrubSet` 用過一批寫死的偽鍵,**現在已全部移除**;`applySet` 沒有對應分支,validator 也會當「未知 key」退件。請照下表改寫:

| 舊寫法(已失效) | 新寫法 |
|---|---|
| `"fleetCao":"burn"` | `"caoNavy":{"state":"burn"}` |
| `"fleetHg":"wreck"` | `"hgFleet":{"state":"wreck"}` |
| `"campFire":true` | `"<camp>":{"fire":1}`(如 `"campWulin":{"fire":1}`) |
| `"campSmoke":true` | `"<camp>":{"smoke":0.8}`(如 `"campWulin":{"smoke":0.8}`) |

也就是說:整支船隊的燃燒/殘骸狀態改走「單位 id + `state`」;營寨著火/冒煙改走「結構 id + `fire` / `smoke`」。不要再用 `fleetCao` / `fleetHg` / `campFire` / `campSmoke` 這些頂層鍵。

---

## fx 事件詞彙

`fx` 是宣告式特效事件陣列(取代以前寫死的 JS 閉包)。每個事件至少有 `at`(幕內秒)與 `type`,引擎在 `at` 秒呼叫對應特效。**只有以下四種 `type`**:

| `type` | 必填欄位 | 可選 | 效果 |
|---|---|---|---|
| `volley` | `from:[x,z]`, `to:[x,z]`, `n`, `fire` | — | 從 `from` 射 `n` 支箭/火箭到 `to`;`fire:true` 為火箭、`false` 為箭雨 |
| `ignite` | `unit` | `shake` | 把單位 `unit` 點燃(設為 `burn`);`unit` 須是 `units.json` 裡真實存在的單位 id;若給 `shake`,同時以該強度震動相機 |
| `shake` | `mag` | — | 相機震動,強度 `mag`(獨立使用) |
| `campFire` | `camp` | — | 點燃指定結構的火源(把該結構 emitter 目標設為 `1`);`camp` 須是 `structures.json` 裡真實存在、且有定義 `fire` 的結構 id(赤壁用 `campWulin`、官渡用 `campWuchao`) |

`volley` 各欄位:

| 欄位 | 型別 | 意義 |
|---|---|---|
| `at` | number | 觸發秒 |
| `from` | `[x,z]` | 起點 |
| `to` | `[x,z]` | 落點 |
| `n` | number | 投射物數量 |
| `fire` | boolean | 是否火焰(火攻用 `true`) |

`ignite` / `shake` / `campFire`:

| 欄位 | 型別 | 意義 |
|---|---|---|
| `at` | number | 觸發秒 |
| `unit` | string | (ignite)要點燃的單位 id,須是 `units.json` 裡的單位(如 `hgFleet`、`caoNavy`) |
| `shake` | number | (ignite 可選)點燃同時震動的強度 |
| `mag` | number | (shake)震動強度 |
| `camp` | string | (campFire)結構 id,須是 `structures.json` 裡有 `fire` 的結構(赤壁 `campWulin`、官渡 `campWuchao`) |

範例(第三幕的兩波箭雨對射、第七幕火攻的點燃+震動+燒營+火箭齊射):

```json
"fx":[
  {"at":8,"type":"volley","from":[18,10],"to":[-20,-4],"n":50,"fire":false},
  {"at":10,"type":"volley","from":[-26,-6],"to":[12,9],"n":50,"fire":false}
]
```

```json
"fx":[
  {"at":4.5,"type":"ignite","unit":"hgFleet"},
  {"at":10,"type":"ignite","unit":"caoNavy","shake":2.2},
  {"at":12,"type":"campFire","camp":"campWulin"},
  {"at":12,"type":"volley","from":[-6,6],"to":[-44,-12],"n":60,"fire":true},
  {"at":14.5,"type":"volley","from":[-12,2],"to":[-50,-16],"n":60,"fire":true},
  {"at":17,"type":"volley","from":[-30,-2],"to":[-58,-20],"n":50,"fire":true}
]
```

> 同一時刻可有多個事件(如第七幕 `at:12` 的 campFire 與 volley 同時)。`shake` 既能當 `ignite` 的可選欄位,也能當獨立 `type` 用。

---

## RECIPES(操作食譜)

### 加一幕

在 `acts` 陣列適當位置插入一個 act 物件。`key / era / title / dur / env` 必填,其餘按需。最簡可運作的一幕:

```json
{
  "key":"第N幕","era":"建安十三年 冬","title":"範例幕","dur":20,"env":"cold",
  "narr":"這裡是旁白。",
  "power":{
    "cao":["約 200,000",90,"對峙烏林"],
    "sun":["30,000",15,"火攻之策已定"],
    "liu":["約 20,000",10,"整軍備戰"]
  },
  "shots":[
    {"kind":"line","a":[90,40,-30],"b":[58,30,-6],"look":[46,2,16],"dur":20}
  ],
  "set":{"hgFleet":{"visible":true}},
  "events":[{"at":5,"x":30,"z":13,"t":"範例事件","tag":"史"}]
}
```

注意:幕的順序就是播放順序。新幕若要有相機運鏡,`shots` 一定要給非空陣列(否則自動播映會 throw)。哪幾支單位做側舷齊射改由該幕的 `combat` 欄位決定(不再靠幕索引猜),要對轟就在新幕補 `combat`。

### 改一個相機運鏡

找到該幕的 `shots`,改對應 shot 的欄位即可。例如把第六幕的單一直線鏡頭改成繞著聯軍中心轉:

```json
"shots":[{"kind":"orbit","c":[46,2,16],"r":60,"h":40,"a0":0.5,"a1":2.5,"dur":25}]
```

切換 `kind` 時記得換成該 kind 的欄位:`line` 用 `a/b/look`,`orbit` 用 `c/r/h/a0/a1`,`follow` 用 `unit/off`。所有 kind 都要 `dur`。多個 shot 的 `dur` 加起來最好接近幕的 `dur`。

### 加一個事件標記

在該幕的 `events` 陣列加一筆。`x/z` 是地圖座標,`at` 是幕內秒,`tag` 用 `史` 或 `演義`:

```json
{"at":9,"x":-128,"z":-76,"t":"關雲長義釋曹操","tag":"演義"}
```

### 加一張計策卡

在該幕加(或設定)`strat`(每幕一張):

```json
"strat":{"at":3,"name":"借東風","by":"諸葛亮 七星壇祭風","tag":"演義",
  "desc":"萬事俱備,只欠東風——史家多認為乃冬至前後江上東南風之天候。"}
```

### 加一個 fx 事件(箭雨 / 點燃)

在該幕加(或補進)`fx` 陣列。一波火箭齊射:

```json
{"at":14.5,"type":"volley","from":[-12,2],"to":[-50,-16],"n":60,"fire":true}
```

點燃某支船隊並震動:

```json
{"at":10,"type":"ignite","unit":"caoNavy","shake":2.2}
```

只能用 `volley / ignite / shake / campFire` 這四種 `type`;`ignite` 的 `unit` 必須是本 package `units.json` 裡真實存在的單位 id,`campFire` 的 `camp` 必須是 `structures.json` 裡有 `fire` 的結構 id。

---

## 複製即用範例(一個 fx 事件 + 一幕)

以下是一個含 fx 事件的最小完整幕,可直接貼進 `acts` 陣列:

```json
{
  "key":"範例幕","era":"建安十三年 冬十一月","title":"火攻演示","dur":18,"env":"inferno",
  "narr":"火烈風猛,船往如箭,盡燒北船。",
  "power":{
    "cao":["折損過半",45,"水陸大潰"],
    "sun":["30,000",15,"全線總攻"],
    "liu":["約 20,000",10,"水陸並進"]
  },
  "shots":[
    {"kind":"follow","unit":"hgFleet","off":[10,22,-34],"dur":9},
    {"kind":"orbit","c":[-42,4,-11],"r":88,"h":42,"a0":0.5,"a1":2.3,"dur":9}
  ],
  "set":{"hgFleet":{"path":[[14,8],[-16,-2],[-38,-9]],"dur":10},"wind":true},
  "fx":[
    {"at":4.5,"type":"ignite","unit":"hgFleet"},
    {"at":8,"type":"ignite","unit":"caoNavy","shake":2.2},
    {"at":8,"type":"campFire","camp":"campWulin"},
    {"at":10,"type":"volley","from":[-6,6],"to":[-44,-12],"n":60,"fire":true}
  ],
  "events":[{"at":11,"x":-38,"z":-9,"t":"火船衝陣・盡燒北船","tag":"史"}]
}
```

---

## 驗收

1. 結構/契約驗:

   ```bash
   # 驗預設赤壁 package(packages/chibi/battlefield.json)
   node tools/validate-data.mjs

   # 驗任意 package:用 --pkg 指向該 package 的 manifest
   node tools/validate-data.mjs --pkg packages/guandu/battlefield.json
   ```

   應印出 `PASS`。validator 比照引擎 `PKG_BASE`,把 `manifest.data` 的各層路徑相對於 manifest 所在目錄解析,所以**改哪個 package 就 `--pkg` 指哪個 manifest**(不加 `--pkg` 只會驗到預設 package)。它會檢查各 `data` 路徑存在、欄位齊全,並做跨檔交叉引用——對 `scene.json` 尤其會驗:每幕有非空 `shots`、`env` 在 `day/cold/dusk/night/inferno/dawn` 之內、`power` 的鍵 / `march` 的 `fac` / `combat` 的元素 / `fx` 的 `ignite.unit` 與 `campFire.camp` 都對得上實際資料。

   注意:**陣營白名單不再寫死**,而是由該 package 自己的 `factions.json` 鍵推導。所以同一份 `scene.json` 換到陣營 id 不同的 package,`power` / `march.fac` 必須跟著換成那個 package 的陣營 id 才會過。

2. 人類播放時間軸(schema 過了不代表畫面對):在瀏覽器用 `index.html?pkg=<manifest>` 開該 package(預設赤壁可直接開 `index.html`,其他 package 要帶 `?pkg=` 指到它的 `battlefield.json`),逐幕走一遍,確認你改/加的幕在對的時間出現對的運鏡、事件卡、計策卡、特效(箭雨/火攻/震動/燒營),以及往回跳幕(scrub)時世界狀態正確。

> 提醒:本檔是純資料。改完不需重編譯,重新整理頁面即可載入新的 `scene.json`。`fx` 只接受 `volley / ignite / shake / campFire` 四種 `type`——不要新增特效型別。
