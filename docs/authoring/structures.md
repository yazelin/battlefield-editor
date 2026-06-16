# Authoring `packages/<名稱>/structures.json`

This guide explains how to add and edit the map structures — cities, camps, passes, and
text-only markers — that the scene builds from your package's `structures.json` (例如
`packages/chibi/structures.json`)。It is the single
source of truth for every walled city, tent camp, pass, and place label on the battlefield.

No rebuild step is needed: `index.html` fetches the package's `structures.json` at load and builds
each structure from its `type`. 路徑相對於該包 manifest 解析。Edit the JSON, reload the page.

---

## File shape

```json
{
  "structures": [
    { "id": "...", "type": "city", "x": 0, "z": 0, "label": "...", "labelPos": [0, 0], "labelClass": "big" }
  ]
}
```

The file is one object with a single required key, `structures`, whose value is an array of
structure entries. Order does not matter for rendering.

---

## Fields

Every field below is defined in `schema/structures.schema.json`. **Do not invent fields** —
anything not listed here is not read by the renderer and will not validate.

| Field        | Type            | Required            | Meaning |
|--------------|-----------------|---------------------|---------|
| `type`       | string enum     | **always**          | One of `city`, `camp`, `pass`, `marker`, `ferry`. Selects what gets built. |
| `x`          | number          | **always**          | World X position (east–west). |
| `z`          | number          | 見說明              | World Z position (north–south). 必填,**唯一例外**是 `marker` 且 `followRiver: true`——此時 `z` 由引擎算,可省略。 |
| `id`         | string          | 見說明              | Stable handle. Must be unique across the array. 凡是要被 scene 的 `set` / `fx` 或火源 emitter 依名稱引用的結構都要 `id`(例如 `campWulin`、掛 `fire` 的結構)。Markers 通常省略。 |
| `faction`    | string          | **camps only**      | 必須是該資料包 `factions.json` 的一個 key(白名單由那份檔的 keys 動態推導,**不是寫死的 cao/sun/liu**)。設定 camp 的旗幟顏色。`camp` 沒有合法 `faction` 時驗證 **失敗**。 |
| `fire`       | `{scale, yOff}` | optional(限有 id 的結構) | 替該結構掛一個 GPU 火源 emitter(火 + 煙)。`scale` 控制粒子大小、`yOff` 控制相對結構原點的高度偏移。引擎只對「同時有 `id` 且有 `fire`」的結構附加 emitter。掛上後預設不燒,要由 scene 的 `set` `{fire}`/`{smoke}` 或 `fx` `campFire` 點燃(見下)。用在會被點著的結構,如烏巢、烏林營。 |
| `followRiver`| `true`          | marker only         | 沿河曲線放置:引擎以 `RZ(x)` 自動算出 `z`,放到江河中線上,所以此 marker 的 `z` 可省略。給沿江漂浮的水名標籤用。**注意:目前 `RZ` 是赤壁長江的硬編碼曲線,只對赤壁包正確;其他包的水名請直接給 `z`(放在河上),別用 `followRiver`。** |
| `rot`        | number(弧度)    | ferry only,選填     | 渡口/碼頭朝向。預設棧橋伸向 `-z`(北);若該包的水在別的方位,用 `rot` 把它轉向水側(例 `1.57`=轉 90°)。 |
| `label`      | string          | optional            | Text drawn next to the structure. For `marker` this is the whole point of the entry. |
| `labelPos`   | `[number, number]` | optional         | Explicit `[x, z]` for the floating label. If omitted, the label sits at the structure's own `x, z`. Exactly two numbers. |
| `labelClass` | string          | optional            | CSS class for the label. Known values in use: `big` (large city/place names) and `water` (river/water labels, sits lower). Empty/omitted = default styling. |

### Notes per type

- **`city`** — builds a walled city (`makeCity`). Typically has `id`, `label`, `labelPos`,
  and `labelClass: "big"`. Has a real 3D footprint (~radius 13).
- **`camp`** — builds a tent camp with a faction banner (`makeCamp`). **Must** have a
  `faction` that is a key of the package's own `factions.json`. Camps are placed but start
  hidden; downstream code toggles visibility by `id`. Has a real 3D footprint (~radius 11).
- **`pass`** — builds a gate/pass tower pair (`makePass`). Has `id`, `label`, `x`, `z`.
- **`ferry`** — 渡口/碼頭:木棧橋 + 泊舟(`makeFerry`),棧橋由岸伸向水面。給黃河/長江的渡河點用
  (如白馬津、延津)。**放在岸邊水緣**(刻意一半在水上,這是碼頭該有的樣子,跟城/營必須避開水不同)。
  棧橋預設朝 `-z`(北);水在別側用 `rot` 轉向。可有 `id`/`label`/`labelClass`。
- **`marker`** — **label only.** No geometry is built; only the text in `label` is drawn at
  `x, z` (or `labelPos`). Use for terrain place-names like 長坂坡, 烏林, 赤壁, 漢水. `faction`
  and `id` are not needed. 若加上 `followRiver: true`,引擎用 `RZ(x)` 自動把標籤放到河中線,`z`
  可省(用於沿江水名)。

`faction` 不是固定的 `cao` / `sun` / `liu`——白名單由該資料包自己的 `factions.json` 的 keys
推導。例如 chibi(赤壁)包是 `cao` / `sun` / `liu`,而 guandu(官渡)包是 `yuan` / `cao`。
寫 camp 的 `faction` 前,先看同包 `factions.json` 有哪些 key。

---

## The river gotcha (read this before placing anything)

A structure's **footprint must sit clear of the river channel.** Cities and camps are solid
3D meshes anchored to the terrain height at their `x, z`. The two rivers in
`packages/chibi/terrain.json` (長江 `changjiang`, halfWidth 34; 漢水 `hanshui`, halfWidth 13) carve the
ground **below sea level** inside their channel. If any part of a structure's footprint
overlaps that channel, the walls/tents render half-submerged — the city looks like it is
sinking into the water.

Keep solid structures on **dry land**, away from the river centerlines:

- **Cities** occupy roughly radius **13** around their `x, z`.
- **Camps** occupy roughly radius **11** around their `x, z`.

So a city must be far enough from a river that even its outer wall (≈13 units out) is still
on ground above the waterline. Markers are label-only and have no footprint, so they may be
placed over water freely (that is how 漢水 / 長江 water labels work — they use
`labelClass: "water"`, and 長江 標籤還用 `followRiver: true` 讓引擎把它放上河中線)。

Verify dry land before you commit (command below).

---

## Recipes

### Add a city

Pick a dry spot, give it a unique `id`, a `label`, and usually a `big` label class. Offset
`labelPos` slightly from `x, z` so the text clears the walls.

```json
{ "id": "wuchang", "type": "city", "x": 220, "z": -90, "label": "武昌", "labelPos": [220, -78], "labelClass": "big" }
```

### Add a camp

Camps **require** a `faction` that exists in the package's `factions.json`. They are
positioned here but shown/hidden by other code, so give them an `id` if anything needs to
toggle them.

```json
{ "id": "campLuxu", "type": "camp", "faction": "sun", "x": 100, "z": 60 }
```

### Make a structure flammable (`fire`)

加 `fire: { scale, yOff }` 就替該結構掛一個火源 emitter——但**該結構必須有 `id`**,引擎只對
「有 `id` 且有 `fire`」的結構附加。emitter 預設不燒;要在 scene 裡點燃:`set` 給該結構
`{ "fire": 1 }`(或 `{ "smoke": 0.9 }` 只冒煙),或用 `fx` 的 `campFire`(`camp` 指向這個
`id`)。常用在會被燒掉的營寨,如烏巢、烏林營。

```json
{ "id": "campWulin", "type": "camp", "faction": "cao", "x": -45, "z": -52, "fire": { "scale": 2.2, "yOff": 2 } }
```

### Place a water label along the river (`followRiver`)

只給 `marker`。設 `followRiver: true` 後,引擎用 `RZ(x)` 算出河中線的 `z`,所以**不用寫 `z`**。
給沿江漂的水名標籤用,通常搭 `labelClass: "water"`。

```json
{ "type": "marker", "label": "長江", "x": -160, "followRiver": true, "labelClass": "water" }
```

### Add a pass

```json
{ "id": "yiling", "type": "pass", "x": -300, "z": -10, "label": "夷陵關" }
```

### Place a marker (label only)

No `id`, no `faction`, no geometry — just text at a point. Add `labelClass` only if you want
`big` or `water` styling.

```json
{ "type": "marker", "label": "巴丘", "x": 280, "z": 70 }
```

### Set / change a faction

`faction` applies to **camps only** and must be a key of the package's own `factions.json`
(在 chibi 包是 `cao` / `sun` / `liu`,在 guandu 包是 `yuan` / `cao`)。改陣營就改 `faction` 值:

```json
{ "id": "campWulin", "type": "camp", "faction": "liu", "x": -45, "z": -52 }
```

填了不在 `factions.json` 的 key,或 camp 沒有 `faction`,都會驗證失敗。

---

## Copy-paste entry example

A complete, schema-valid city entry on dry land:

```json
{ "id": "wuchang", "type": "city", "x": 220, "z": -90, "label": "武昌", "labelPos": [220, -78], "labelClass": "big" }
```

Add it as a new element of the `structures` array.

---

## Verification

After editing, run the data validator from the repo root:

```bash
node tools/validate-data.mjs                                    # 驗預設 chibi 包(packages/chibi/battlefield.json)
node tools/validate-data.mjs --pkg packages/guandu/battlefield.json   # 驗任意資料包
```

`--pkg` 指向某資料包的 `battlefield.json` manifest;路徑解析比照引擎 `PKG_BASE`,各層相對於
manifest 所在目錄。沒帶 `--pkg` 就驗預設的 chibi 包。

它檢查:每個 `type` 合法、`x` 是數字、`z` 是數字(`marker` 且 `followRiver` 時免)、每個 `camp`
的 `faction` 在白名單內、`id` 不重複。**陣營白名單是從該資料包自己的 `factions.json` 的 keys
推導的**——不是寫死的 `cao/sun/liu`,所以 guandu 包用 `yuan`/`cao` 一樣會過。綠燈會印
`PASS [<name>] — ...`。

**Schema 過了不代表畫面對。** 驗證器只查 schema 與跨檔引用,不知道幾何外觀,所以一定要在瀏覽器
做一次目視檢查:用 `index.html?pkg=<manifest>` 載入你改的那個資料包(預設 chibi 包可直接開
`index.html`),確認新結構長對、火源/水名標籤位置正確。

**Also confirm the structure is not in water.** The validator does not know about footprints,
so check that the terrain height stays above 0 (above the waterline) across the structure's
footprint — sample the center and a ring at the footprint radius (≈13 for a city, ≈11 for a
camp). Visually: reload `index.html?pkg=<manifest>` and confirm the new structure sits on
land, with no walls or tents poking up out of the river.

A quick numeric check is to confirm every existing solid structure already reports a positive
minimum footprint height while a point inside a river channel reports a negative one — your
new structure should look like the former, not the latter.
