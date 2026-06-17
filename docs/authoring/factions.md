# `packages/chibi/factions.json` 編輯指南

陣營(faction)資料表。定義戰場上各方勢力的**顯示名稱、軍旗字、配色與 CSS 類別**。其他資料檔(`structures.json` 的 `camp.faction`、`units.json` 的 `faction`)都以這裡的 **faction id** 為 key 來查顏色與名稱,所以這份檔案是陣營的單一事實來源。

引擎已全面 data-driven:單位標籤的 `.uLab.<css>` 配色、左側戰力面板(`#powers`)、右側圖例(`#legend`)全部由本檔在執行期動態產生,不再寫死任何陣營。**加一個全新陣營,只要這份檔案填齊就會自動出現。**

對照 schema:`schema/factions.schema.json`。

---

## 結構

頂層是一個物件,**key 就是 faction id**(本範例的 `cao` / `sun` / `liu`),value 是該陣營的設定物件。沒有外層陣列、沒有包裝欄位。

```json
{
  "cao": { "name": "曹軍", "flag": "曹", "css": "cao", "col": "#3d7de0", "dark": "#1d3f78", "light": "#8db4f0", "panel": "曹操軍", "legend": "曹操（北軍）" },
  "sun": { "name": "吳軍", "flag": "孫", "css": "sun", "col": "#d84040", "dark": "#7e2020", "light": "#f09a93", "panel": "孫權軍", "legend": "孫權（江東）" },
  "liu": { "name": "劉軍", "flag": "劉", "css": "liu", "col": "#3fae6a", "dark": "#1e5e38", "light": "#8fd6ae", "panel": "劉備軍", "legend": "劉備（客軍）" }
}
```

### faction id(物件的 key)

短字串識別碼,例如 `cao`。**id 是任意的**——不限於 `cao` / `sun` / `liu`,你可以叫 `wei` / `red` / `army1` 都行。合法陣營白名單**由這份檔案的 key 推導**,別處用到的 faction 必須是這裡定義過的 key:

- `packages/chibi/structures.json` 中 `type: "camp"` 的 `faction` 欄位,validator 會檢查它在不在本檔的 key 集合裡(`structures[i] camp faction 非法` 就是這裡沒定義)。
- `packages/chibi/units.json` 中每個單位的 `faction`,validator 同樣檢查它存在於本檔。
- `play.html` 引擎內以 `FAC[id]` 查顏色/名稱,id 找不到時退中性灰(`0xcccccc`),不 throw。

> 因此**新增 id 的影響只在「引用它的地方要對得上」**:純加一個新陣營到 `packages/chibi/factions.json`,它的顏色、戰力面板列、圖例列會自動生成;但要在戰場上看到它的部隊/營寨,得在 `packages/chibi/units.json` / `packages/chibi/structures.json` 用這個 id。本檔負責「這個陣營長怎樣」,不負責「誰屬於這個陣營」。

### 每個陣營的欄位

schema 規定 5 個**必填**欄位(`name` / `flag` / `css` / `col` / `dark`),另有 3 個**選填**欄位(`panel` / `legend` / `light`),不填時引擎自動帶預設值:

| 欄位 | 型別 | 必填 | 意義 |
|------|------|:----:|------|
| `name` | string | 必填 | 顯示名稱,如「曹軍」。出現在單位資訊面板(`ucFac`)等 UI;也是 `panel`、`legend` 不填時的預設值。 |
| `flag` | string | 必填 | 畫在軍旗貼圖上的字,通常一個漢字(如「曹」)。引擎用 canvas 把它寫在旗面中央。 |
| `css` | string | 必填 | CSS 類別後綴(任意 token)。單位標籤帶 `uLab <css>`,引擎在執行期**據此產生** `.uLab.<css> .box` / `.uLab.<css> .t1` 的配色規則(見下)。 |
| `col` | string | 必填 | 主色,`#RRGGBB` 六位十六進位。**載入時轉成 three.js 顏色**用於旗面、船帆、單位描邊等;原字串保留為 `hex` 供 CSS/canvas 用。 |
| `dark` | string | 必填 | 暗色,`#RRGGBB`。同樣轉 three.js 顏色,用作軍旗漸層的暗端、船體暗部等;原字串保留為 `darkHex`,當戰力條漸層的暗端。一般取 `col` 的較深版本。 |
| `panel` | string | 選填 | 左側戰力面板(`#powers`)那一列的顯示名,如「曹操軍」。**不填則預設等於 `name`。** |
| `legend` | string | 選填 | 右側圖例(`#legend`)那一列的顯示名,如「曹操（北軍）」。**不填則預設等於 `name`。** |
| `light` | string | 選填 | 單位標籤主標題(`.uLab .t1`)的文字色,`#RRGGBB`。通常取 `col` 的淺色版,確保深底上看得清。**不填則預設等於 `col`。** |

#### `col` / `dark` / `light` 是怎麼被用的

三者都是 `#RRGGBB` 字串,在 `play.html` 載入時轉換:

```js
out[k] = { name: v.name, flag: v.flag, css: v.css, hex: v.col, darkHex: v.dark,
           light: v.light || v.col, panel: v.panel || v.name, legend: v.legend || v.name,
           col: parseInt(v.col.slice(1), 16), dark: parseInt(v.dark.slice(1), 16) };
```

- `col` 字串 `"#3d7de0"` → 去掉 `#`、以 16 進位 parse → `0x3d7de0`,直接餵給 `THREE.Color` / material 的 `color`;原字串另存為 `hex`,canvas 畫旗時當填色字串、UI 文字顏色用。
- `dark` 同理轉數值色,原字串存為 `darkHex`(戰力條漸層暗端)。
- `light` / `panel` / `legend` 只取字串,並在缺值時各自 fallback 到 `col` / `name` / `name`。

**格式硬性要求(validator):** `col`、`dark` 必填且必須符合 `^#[0-9a-fA-F]{6}$`;`light` 若有填也走同一規則(`panel` / `legend` 是純顯示字串,不限格式)。三位簡寫(`#abc`)、八位含 alpha(`#aabbccdd`)、`rgb()`、顏色名(`red`)都會驗證失敗。

#### `css` 與顏色的關係(已自動同步)

`css` 只負責**接上 CSS 類別後綴**。引擎啟動時 `buildFactionCSS` 走訪每個陣營,**從 `col` / `light` 即時產生**對應規則:

```js
const a7 = h => h + 'b3';   // #RRGGBB → 0.7 alpha
`.uLab.${f.css} .box{border-color:${a7(f.hex)}} .uLab.${f.css} .t1{color:${f.light}}`
```

也就是說標籤邊框色來自 `col`(加 0.7 alpha)、主標題文字色來自 `light`。**改 `col` / `light` 會直接反映到單位標籤,不需要手動到 `play.html` 改寫死的色票**(舊版那批寫死的 `.uLab.cao` 等規則已移除)。同樣地,戰力面板列(`#powers`,用 `panel`、`col`、`darkHex`)與圖例列(`#legend`,用 `legend`、`col`)由 `buildPanels` 依本檔的 key 逐一生成,新陣營會自動多一列。

---

## RECIPE:改一個陣營的顏色

只改顏色最單純。例:把劉軍從綠改成偏青的綠,順手把標籤文字色 `light` 一起調。

1. 編輯 `packages/chibi/factions.json`,改該陣營的 `col`(必要時連 `dark` / `light` 一起,維持「dark 較深、light 較淺」的關係):

```json
{
  "liu": { "name": "劉軍", "flag": "劉", "css": "liu", "col": "#2fae8a", "dark": "#175e48", "light": "#8fe0c6", "panel": "劉備軍", "legend": "劉備（客軍）" }
}
```

2. 驗證格式:

```bash
node tools/validate-data.mjs
```

通過會印出類似:`PASS [赤壁之戰] — factions 3、structures 14、terrain 2河、scene ...幕、audio ...cue、units ...`。

3. 重新整理瀏覽器即可看到單位標籤邊框/文字色、旗面、戰力條一起變色——**不再需要手動同步 `play.html`**。

---

## RECIPE:新增一個陣營

例:加「黃巾」陣營(假想)。因為引擎全面 data-driven,加進來就會自動出現在配色/面板/圖例。

1. 在 `packages/chibi/factions.json` 加一個新 key,**5 個必填欄位至少要齊**,建議連 `panel` / `legend` / `light` 一起填以求精緻:

```json
{
  "cao": { "name": "曹軍", "flag": "曹", "css": "cao", "col": "#3d7de0", "dark": "#1d3f78", "light": "#8db4f0", "panel": "曹操軍", "legend": "曹操（北軍）" },
  "sun": { "name": "吳軍", "flag": "孫", "css": "sun", "col": "#d84040", "dark": "#7e2020", "light": "#f09a93", "panel": "孫權軍", "legend": "孫權（江東）" },
  "liu": { "name": "劉軍", "flag": "劉", "css": "liu", "col": "#3fae6a", "dark": "#1e5e38", "light": "#8fd6ae", "panel": "劉備軍", "legend": "劉備（客軍）" },
  "huang": { "name": "黃巾軍", "flag": "黃", "css": "huang", "col": "#d6a72e", "dark": "#7e6017", "light": "#ecd089", "panel": "黃巾軍", "legend": "黃巾（流民）" }
}
```

2. 驗證:

```bash
node tools/validate-data.mjs
```

3. **加進來就生效**:`.uLab.huang` 配色、`#powers` 的黃巾列、`#legend` 的黃巾列都會自動生成(不必再手寫 `play.html` 的 `:root` 變數或色票)。要讓它真的有部隊/營寨在戰場上:

   - 在 `packages/chibi/units.json` 把單位的 `faction` 設成 `"huang"`——因為白名單由本檔 key 推導,validator 不會再擋。
   - 在 `packages/chibi/structures.json` 用 `type: "camp"` + `faction: "huang"` 放它的營寨,同樣會通過。

---

## 驗收

1. **跑驗證器**(預設驗赤壁資料包):

   ```bash
   node tools/validate-data.mjs
   ```

   驗別的資料包要加 `--pkg <manifest>`,路徑解析比照引擎 `PKG_BASE`(各層相對 manifest 所在目錄):

   ```bash
   node tools/validate-data.mjs --pkg packages/guandu/battlefield.json
   ```

2. **陣營白名單由資料包自己的 `factions.json` 推導**,不再寫死 `cao/sun/liu`。validator 讀完本檔的 key 後,才拿去檢查 `structures.json` 的 camp、`units.json` 的單位 `faction` 是否引用到不存在的陣營——所以每個資料包驗的是它自己的陣營集合。

3. **schema 過了不等於畫得對**:validator 只查結構與跨檔引用,顏色觀感、`panel` / `legend` 是否好讀、`light` 在深底上對比夠不夠,都得在瀏覽器以 `?pkg=<manifest>` 載入該資料包**目視確認**(看單位標籤、左側戰力面板、右側圖例三處)。

---

## 快速檢查清單

- [ ] 頂層每個 value 都有必填的 `name` / `flag` / `css` / `col` / `dark`。
- [ ] `col`、`dark`(及有填的 `light`)都是 `#RRGGBB`(`#` + 6 位 hex,無簡寫、無 alpha)。
- [ ] (建議)`panel` / `legend` / `light` 有填以求精緻;不填則分別 fallback 到 `name` / `name` / `col`。
- [ ] 別處引用的 faction id(`structures.json` 的 camp、`units.json` 的單位)都對得上本檔的 key。
- [ ] `node tools/validate-data.mjs`(或 `--pkg <manifest>`)印出 `PASS`。
- [ ] 以 `?pkg=<manifest>` 在瀏覽器目視確認單位標籤配色、戰力面板、圖例三處顯示正確。
