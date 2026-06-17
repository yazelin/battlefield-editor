# 編輯 `packages/<名稱>/units.json`(兵力名冊)

這份指南說明怎麼加 / 改戰場上的「單位」——軍隊與艦隊,以及它們的陣營、兵力、名稱、將領、
初始位置、行軍腳步與詳情卡。給 **AI 與人共讀**:AI 依此編輯 `packages/<名稱>/units.json`,人依此驗收與微修。

外部化的是「**有哪些單位**」(名冊),不是「單位怎麼動」(行為)。`Unit / Army / Fleet` class——
建模、陣型、移動、交戰——全留在 `play.html`,不在這份資料的管轄範圍。要改單位定義 = 改這個
JSON;要改單位行為 = 改引擎,不在此。

不需要重新編譯:`play.html` 在載入時 `fetch(PKG_BASE + PKG.data.units)`,依每筆的 `kind` 建出對應
class。改完 JSON,重整頁面即可。資料包以 `?pkg=<manifest>` 載入,層路徑相對 manifest 所在目錄解析。

---

## 檔案結構

```json
{
  "units": [
    { "id": "caoMain", "kind": "army", "faction": "cao", "n": 60, "name": "曹操本軍", "generals": "曹操・張遼・徐晃・于禁" }
  ]
}
```

整個檔是一個物件,唯一必填鍵 `units`,值為單位陣列。陣列順序不影響結果(各單位以 `id` 被引用)。

---

## 欄位

下列每個欄位都對應 `schema/units.schema.json`。**不要自創欄位**——沒列在這裡的欄位引擎不會讀,
也過不了驗收。

| 欄位 | 型別 | 必填 | 意義 |
|---|---|---|---|
| `id` | string | **必填** | 單位的穩定代號,**必須在陣列內唯一**。引擎以 `U[id]` 建立並查找,scene.json / fx 都用這個 id 指向單位。命名見下方「跨檔引用」。 |
| `kind` | string enum | **必填** | `army` 或 `fleet`。決定建出 `Army`(陸軍方陣)或 `Fleet`(艦隊)。 |
| `faction` | string | **必填** | **必須是本資料包 `factions.json` 裡的一個鍵**(白名單由該檔動態推導,不再寫死)。決定旗幟與顏色(取自同包的 `factions.json`)。在赤壁包是 `cao` / `sun` / `liu`,在官渡包是 `yuan` / `cao`——各包自己定義。 |
| `n` | number | **必填** | 兵力規模——`army` 是士兵數(方陣個體數),`fleet` 是船艦數。控制畫面上排出多少個體。 |
| `name` | string | 選填 | 標籤主名(`setLabel` 的第一行,如「曹操本軍」)。建議都填,否則標籤無主名。 |
| `generals` | string | 選填 | 標籤次行(`setLabel` 的第二行,將領 / 註記,如「曹操・張遼・徐晃・于禁」)。 |
| `start` | object | 選填 | 初始位置 / 可見性 / 陣形,`initPlace()` 用。形如 `{ "x": -250, "z": -150, "visible": true }`,可再加 `"formation": "loose"`。`x` / `z` 缺則視為 `0`,`visible` 缺則視為 `false`(開場隱藏)。`formation` 只對 `fleet` 有意義(套用 `setFormation`),`army` 給了會被忽略。缺整個 `start` → 該單位開場放在原點且隱藏。 |
| `gait` | string enum | 選填 | **只對 `army` 有意義**。`cav` 或 `foot`,**預設 `foot`**。決定行軍腳步聲:`cav` 配馬蹄(`hoof`、節奏較快),`foot` 配步伐(`step`)。`fleet` 移動交給江水 / 風,不配腳步,給了也無效。 |
| `chainable` | boolean | 選填 | **只對 `fleet` 有意義**。`true` 時引擎對它呼叫 `buildChains`,建出鐵索連環(船與船相連)。`army` 給了無效果。 |
| `fireShip` | boolean | 選填 | **只對 `fleet` 有意義**。`true` 時建為火船隊(船隻帶火攻屬性、燃燒延遲較短)。預設視為無。 |
| `info` | array | 選填 | 點選單位時詳情卡的內容,兩元素 `[short, long]`:`short` 接在卡片陣營名後(如「曹軍・北軍主力」),`long` 顯示在「將領」下方一段註述。缺 `info` 時不會出錯——詳情卡只顯示陣營 + 將領(無短綴、無詳述)。 |

`faction` 不再是固定三值的全域白名單——**白名單由各資料包自己的 `factions.json` 鍵集合推導**,
不同戰場可有完全不同的陣營 id。

---

## 引擎怎麼用這份資料建單位

頂層連同其他 `await` 一起載入名冊,再以一個迴圈建出單位表 `U`:

```js
const UNITS = await (await fetch(PKG_BASE + PKG.data.units)).json();
// ...
const U = {};
for (const u of UNITS.units) {
  U[u.id] = u.kind === 'army'
    ? new Army(u.id, u.faction, u.n)
    : new Fleet(u.id, u.faction, u.n, u.fireShip ? { fireShip: true } : {});
  U[u.id].setLabel(u.name, u.generals);
}
// 連環:對宣告 chainable 的艦隊建鎖鏈(無則跳過)
for (const u of UNITS.units) { if (u.chainable && U[u.id]) buildChains(U[u.id]); }
// 詳情:有 info 才登記
const UNIT_INFO = {};
for (const u of UNITS.units) if (u.info) UNIT_INFO[u.id] = u.info;
```

對照:

- `kind: "army"` → `new Army(id, faction, n)`——`Army` 用 `n` 排出士兵方陣(`InstancedMesh`),
  插旗。
- `kind: "fleet"` → `new Fleet(id, faction, n, opts)`——`Fleet` 用 `n` 排出船隊;`fireShip: true`
  時 `opts` 帶 `{ fireShip: true }`,船隻建為火船。
- `setLabel(name, generals)` 畫出單位頭上的兩行標籤(主名 + 將領)。
- `chainable: true` → 建完後 `buildChains(U[id])` 把該艦隊各船以鐵索相連。
- `info` → 寫進 `UNIT_INFO[id]`,點選單位時詳情卡讀它。

開場擺位由 `initPlace()` 依各筆 `start` 套用:

```js
function initPlace(){
  for(const u of UNITS.units){
    const st = u.start || {};
    U[u.id].place(st.x || 0, st.z || 0);
    U[u.id].setVisible(!!st.visible);
    if (st.formation && U[u.id].setFormation) U[u.id].setFormation(st.formation);
  }
  // ...
}
```

行軍腳步由音訊引擎依 `gait` 分流(只對陸軍):

```js
const LAND_UNITS = {};
for (const u of UNITS.units) if (u.kind === 'army') LAND_UNITS[u.id] = u.gait || 'foot';
// 移動時:cav → 'hoof'(快節奏),foot → 'step'
```

`U` 建好後,scene 的移動 / 事件都用 `U.<id>` 引用,這些**不變**。`Army / Fleet / Unit / setLabel /
buildChains / setFormation` 的行為**完全不動**。

---

## 跨檔引用:`id` 是契約,改名要連動

單位的 `id` 不只是這份檔的內部代號——其他資料層用它指向單位。**改一個單位的 `id`,必須同步更新
所有引用它的地方**,否則該單位會被引用為 `undefined`:

- **`packages/<名稱>/scene.json` — 移動**:每幕 `set` / `scrubSet` 內以 `id` 為鍵的單位移動,例如
  `"caoMain": { "path": [[-242, -100], [-240, -36]], "dur": 9 }`;以及運鏡 `follow` 鏡頭的
  `"unit": "hgFleet"`。引擎以 `U[id]` 解析。
- **`packages/<名稱>/scene.json` — fx ignite**:火攻事件 `{ "at": 4.5, "type": "ignite", "unit": "hgFleet" }`
  以 `e.unit` 取 `U[e.unit]` 觸發燃燒。**只有 `fleet` 適合被 ignite。**
- **`packages/<名稱>/structures.json` — camps**:營寨(`campWulin` / `campChibi`)是 structures 的
  `id`,由引擎特判控制顯隱;它們與單位 `id` 共處同一個命名空間,**勿與單位 `id` 撞名**。
  (註:campFire fx 用的是 `camp` 欄位指向 structure id,不是單位 id。)

赤壁包現行名冊七個 id:`caoMain` / `caoNavy` / `caoRen` / `liuArmy` / `liuFleet` / `sunFleet` /
`hgFleet`。其中 `caoNavy` 帶 `chainable: true`(鐵索連環),`hgFleet` 帶 `fireShip: true`。

> 改 `id` 前,先全庫搜尋舊 id(scene.json / structures.json 與引擎特判),逐處改完再驗收。
> 若不確定,寧可不改 `id`、只改其它欄位。

---

## 食譜

### 加一個單位

在 `units` 陣列加一筆。`id` / `kind` / `faction` / `n` 必填,`name` / `generals` / `start` 建議都填。

陸軍(配騎兵腳步、開場可見):

```json
{ "id": "zhangArmy", "kind": "army", "faction": "sun", "n": 18, "name": "張昭後軍", "generals": "張昭・虞翻", "gait": "cav", "start": { "x": 230, "z": -40, "visible": true }, "info": ["江東後軍", "張昭領後軍策應,屯於建業上游。"] }
```

艦隊(開場隱藏、鬆散陣形):

```json
{ "id": "ganNavy", "kind": "fleet", "faction": "sun", "n": 8, "name": "甘寧鬥艦", "generals": "甘寧・凌統", "start": { "x": 200, "z": -10, "visible": false, "formation": "loose" }, "info": ["錦帆健兒", "甘寧所部鬥艦,夜襲曹營。"] }
```

加完只是「存在」於名冊與畫面。若要它在某一幕**動 / 出場 / 觸發事件**,還得在 `packages/<名稱>/scene.json`
用同一個 `id` 加移動或 fx(見 [scene.md](scene.md))。

### 改一個單位的兵力 / 陣營 / 標籤

直接改該筆對應欄位即可,`id` 不動就不必碰其它檔:

- **改兵力**:改 `n`(陸軍改士兵數、艦隊改船數)。
  ```json
  { "id": "caoMain", "kind": "army", "faction": "cao", "n": 80, "name": "曹操本軍", "generals": "曹操・張遼・徐晃・于禁" }
  ```
- **改陣營**:改 `faction`(必須是本包 `factions.json` 裡的鍵),旗幟與顏色隨之變。
- **改標籤**:改 `name`(主名)/ `generals`(將領次行)。
- **改開場擺位 / 顯隱**:改 `start.x` / `start.z` / `start.visible`(艦隊另可 `start.formation`)。
- **改行軍腳步**:陸軍改 `gait`(`cav` 馬蹄 / `foot` 步伐)。
- **改詳情卡**:改 `info` 的 `[short, long]`。

### 標記一個火船隊

`fireShip` **只對 `fleet` 有意義**。在某個 `fleet` 加 `"fireShip": true`,引擎會把它建成火船隊
(船帶火攻屬性、燃燒延遲縮短)。給 `army` 加沒有效果。

```json
{ "id": "hgFleet", "kind": "fleet", "faction": "sun", "n": 6, "fireShip": true, "name": "黃蓋先鋒", "generals": "黃蓋・蒙衝鬥艦十艘" }
```

要它在劇情中真的「點火」,在 `packages/<名稱>/scene.json` 對它下 ignite fx(以同一 `id`):

```json
{ "at": 4.5, "type": "ignite", "unit": "hgFleet" }
```

### 標記一個鐵索連環艦隊

`chainable` **只對 `fleet` 有意義**。在某個 `fleet` 加 `"chainable": true`,引擎建完該艦隊後會呼叫
`buildChains` 把各船以鐵索相連。給 `army` 加沒有效果。

```json
{ "id": "caoNavy", "kind": "fleet", "faction": "cao", "n": 24, "name": "曹軍水師", "generals": "蔡瑁・張允 編練", "chainable": true, "start": { "x": -225, "z": -2, "visible": false, "formation": "loose" } }
```

---

## 可貼上的完整範例

一筆 schema-valid、含新欄位的火船隊單位:

```json
{ "id": "hgFleet", "kind": "fleet", "faction": "sun", "n": 6, "fireShip": true, "name": "黃蓋先鋒", "generals": "黃蓋・蒙衝鬥艦十艘", "start": { "x": 52, "z": 22, "visible": false }, "info": ["火攻先鋒", "黃蓋取蒙衝鬥艦十艘,實以薪草膏油,外以帷幕偽降。"] }
```

把它當作 `units` 陣列的一個元素加入。

---

## 驗收

改完從 repo 根目錄跑資料驗證器。預設驗赤壁包(`packages/chibi/battlefield.json`);驗別的資料包加 `--pkg`
指向該包的 manifest:

```bash
node tools/validate-data.mjs                                          # 驗預設赤壁
node tools/validate-data.mjs --pkg packages/guandu/battlefield.json   # 驗任意資料包
```

`--pkg` 的路徑解析比照引擎 `PKG_BASE`:層路徑相對 manifest 所在目錄。

它對 units 檢查:`units` 存在且為非空陣列;每筆 `id` 唯一;`kind` 屬於 `army` / `fleet`;
`faction` 屬於**該資料包 `factions.json` 鍵集合**(白名單由 factions 動態推導,不再寫死
`cao` / `sun` / `liu`);`n` 為數字。一切過關會印出
`PASS [<戰場名>] — ...`(含 `units 7` 之類的計數)。

> schema 過了不代表畫面對。最後請在瀏覽器以 `play.html?pkg=<manifest>` 載入該資料包,確認單位的
> 兵力、陣營色、標籤(主名 + 將領)、開場擺位 / 顯隱、火船與鐵索、行軍腳步、以及點選單位的詳情卡
> 與意圖一致——這一步由人把關。
