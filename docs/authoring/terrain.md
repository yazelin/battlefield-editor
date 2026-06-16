# Authoring `packages/chibi/terrain.json`

A guide for AI and human editors. Every field below exists in
`schema/terrain.schema.json` and matches `packages/chibi/terrain.json`. Do not invent
fields — if it is not in the schema, the validator will reject it (or the
generator will silently ignore it).

## What `terrain.json` is

`terrain.json` is **not** a heightmap. It is a small **feature library** that a
continuous generator (`terrainHeight(x,z)` and `terrainColor(x,z)` in
`index.html`, mirrored exactly in `tools/terrain-fit.mjs`) reads to produce the
3D heightfield + per-vertex colors on the fly.

The generator walks a `world.segX × world.segZ` grid of vertices. For each
vertex at world `(x, z)` it:

1. starts from the nearest **river** (carves a channel inside `halfWidth`,
   raises banks outside it),
2. adds **band** uplift past a distance threshold,
3. adds each **bump** (a Gaussian hill/mountain),
4. picks a base color from `colorRamp` by final height, then
5. overlays **bump tints** and **region tints** (color-only).

Because it is a continuous function, a few control points expand into smooth
terrain. **There are no per-vertex values to edit** — you edit features.

### Coordinate system

World coordinates are `x` (east–west) and `z` (north–south). All centers,
centerlines, radii, `halfWidth`, `beyond`, etc. are in **world units**, the
same units as `world.W` / `world.H`. The map spans roughly
`x ∈ [-W/2, +W/2]`, `z ∈ [-H/2, +H/2]` (currently `W=680`, `H=460`, so
`x ∈ [-340, 340]`, `z ∈ [-230, 230]`). Height is the up axis the generator
outputs; **negative height = below water level** (rivers).

## Fields

### `world` (required)

| field  | meaning |
|--------|---------|
| `W`    | map width in world units (x extent) |
| `H`    | map depth in world units (z extent) |
| `segX` | grid subdivisions along x (vertex resolution) |
| `segZ` | grid subdivisions along z |

Higher `segX`/`segZ` = finer mesh, more vertices. Leave alone unless you
intend a global resolution change.

### `colorRamp` (required, array, ≥1)

Base ground color chosen by **final height** `h`. The generator scans the array
in order and uses the **first** band whose `maxH` is `null` or `h < maxH`, so
order the bands from low to high and end with a `maxH: null` catch-all.

| field    | meaning |
|----------|---------|
| `maxH`   | upper height bound for this band (`null` = unbounded, the catch-all) |
| `color`  | `#RRGGBB` base color for the band (required) |
| `lerpTo` | optional `#RRGGBB`; blend the base color toward this |
| `by`     | how to blend: `"fbm"` (noise-driven) or `"ramp"` (height-driven) |
| `from`   | (with `by:"ramp"`) height where the blend starts |
| `span`   | (with `by:"ramp"`) height range over which the blend goes 0→1 |

`by:"fbm"` blends by a noise value (mottled look); `by:"ramp"` blends linearly
from `from` to `from+span` (gradient by elevation). All colors are `#RRGGBB`.

### `rivers` (required, array, ≥1)

A river carves a channel and raises banks around a smoothed centerline.

| field          | meaning |
|----------------|---------|
| `id`           | optional label |
| `centerline`   | array of `[x, z]` control points (**≥2**). These are a **few** waypoints, auto-smoothed by a Catmull-Rom spline — *not* a dense sample list. |
| `halfWidth`    | half the channel width in world units; inside this distance the bed is carved |
| `depth`        | bed height at the centerline; **negative = carved water** (e.g. `-7`) |
| `bankSlope`    | how steeply banks rise just outside `halfWidth` |
| `bankCap`      | max bank rise from the slope term |
| `bankFbm`      | object adding noisy roughness to banks: `{ scale, xOff, ampRate, ampCap }` |

How it works numerically: inside `halfWidth`, height = `depth * (1 - d/halfWidth)`
(deepest on the centerline, 0 at the edge). Outside, banks rise as
`min(t*bankSlope, bankCap) + noise * min(t*ampRate, ampCap)` where `t` is the
distance past `halfWidth`. `bankFbm.xOff` shifts the noise; `scale` sets its
frequency.

### `bumps` (optional, array)

A Gaussian hill / mountain / cliff added to height. Each bump needs `center`,
`height`, and a size (`radius` **or** `k`).

| field    | meaning |
|----------|---------|
| `id`     | optional label |
| `center` | `[x, z]` peak location |
| `radius` | `[rx, rz]` — **semantic half-extent** in world units (preferred form). Internally the generator uses `k = [rx², rz²]`, so `radius` is *not* a variance. |
| `k`      | `[kx, kz]` — raw Gaussian denominators (advanced; use `radius` instead). If both are given, `radius` wins. |
| `height` | peak height added at the center |
| `tint`   | optional color overlay on the bump (see Tint object) |

Height contribution: `height * exp(-((x-cx)²/kx + (z-cz)²/kz))` where
`kx = rx²`, `kz = rz²`. Larger `radius` = broader, gentler slope; larger
`height` = taller peak.

### `bands` (optional, array)

Edge uplift: terrain rises the farther a point is past a threshold along one
axis (use this for mountain rims at the map edges).

| field    | meaning |
|----------|---------|
| `axis`   | `"x"` or `"z"` — which coordinate's distance drives the uplift |
| `beyond` | uplift starts where `|axis| > beyond` |
| `slope`  | uplift rate per unit past `beyond` |
| `fbm`    | noise object `{ scale, base, offset }` modulating the uplift |

Contribution: `max(0, |axis| - beyond) * slope * (fbm.base + noise)`.

### `regions` (optional, array)

**Color-only** overlay — regions tint the ground but do **not** change height.
Use them for marshes, scorched ground, etc.

| field    | meaning |
|----------|---------|
| `id`     | optional label |
| `center` | `[x, z]` center of the tinted area |
| `radius` | `[rx, rz]` half-extent in world units (or `k = [kx, kz]`, same rule as bumps) |
| `tint`   | required color overlay (see Tint object) |

### Tint object (used by `bumps[].tint` and `regions[].tint`)

A tint blends the base ramp color toward `tint.color` based on how close the
vertex is to the feature center (a falloff `cf`/`mf` in `0..1`).

| field       | default | meaning |
|-------------|---------|---------|
| `color`     | —       | `#RRGGBB` overlay color |
| `threshold` | `0.2`   | only tint where falloff exceeds this |
| `gain`      | `2`     | how fast the tint strengthens past the threshold |
| `max`       | `0.8`   | maximum blend amount (0..1) |
| `minH`      | `0`     | only tint where final height `> minH` |
| `maxH`      | `∞`     | (regions only) only tint where final height `< maxH` |

Tints never move structures — they are pure color.

## Recipes (for an AI editor)

### Add a river

Append to `rivers`. Give a **few** `[x, z]` control points (3–8 is plenty — they
are Catmull-smoothed), a `halfWidth`, and a negative `depth`. Copy
`bankSlope` / `bankCap` / `bankFbm` from an existing river for a consistent look.

```json
{
  "id": "newriver",
  "centerline": [[-200, 120], [-120, 80], [-40, 30], [40, -10]],
  "halfWidth": 18,
  "depth": -6,
  "bankSlope": 0.18,
  "bankCap": 4,
  "bankFbm": { "scale": 0.013, "xOff": 5, "ampRate": 0.14, "ampCap": 16 }
}
```

### Add a hill / mountain

Append a `bump`: `center` + `radius` (half-extent) + `height`. Bigger `radius`
= wider; bigger `height` = taller.

```json
{
  "id": "newhill",
  "center": [120, -40],
  "radius": [30, 22],
  "height": 18
}
```

### Make the cliff (a bump) bigger

Edit that bump's `height` (taller) and/or `radius` (wider footprint). To make
the existing `chibi` cliff steeper, raise `height`; to widen it, raise both
`radius` values.

### Add a marsh (color only, no height change)

Append a `region` with a `center`, `radius`, and a `tint` color. This recolors
the ground without altering terrain height, so nothing on it moves.

```json
{
  "id": "marsh",
  "center": [-60, 100],
  "radius": [40, 28],
  "tint": { "color": "#39473e", "threshold": 0.25, "gain": 1.6, "max": 0.7, "minH": 0.5, "maxH": 8 }
}
```

## Verification

Run from the repo root after every edit:

```bash
node tools/validate-data.mjs    # schema/shape check; must print PASS
node tools/terrain-fit.mjs      # mean|Δ| vs the original analytic terrain
```

- `validate-data.mjs` checks structure: rivers present, each river has a
  `centerline` (≥2) and numeric `halfWidth`/`depth`; each bump has `center`,
  `height`, and `radius` or `k`; each region has `center` and `radius`/`k`;
  every `colorRamp` color is `#RRGGBB`. It prints `PASS` or `FAIL` with reasons.
- `terrain-fit.mjs` re-implements the original hand-written analytic terrain and
  reports `mean|Δ|` and `max|Δ|` between it and what `terrain.json` generates
  across the whole grid. **For faithful reproductions of the original terrain,
  keep `mean|Δ|` small** (current baseline ≈ `0.358`). If you are deliberately
  adding new features the original did not have, `mean|Δ|` will rise where the
  new feature is — that is expected; just confirm the change is local to your
  feature and not a global regression.

### Structures must not shift or sink

Cities, camps, passes, and units read terrain height (`ground(x,z) =
terrainHeight(x,z)`) to sit on the ground. If you change height under an
existing structure (a new bump/band/river over it, or moving one), the
structure will visibly rise, sink, or clip. After a height-affecting edit,
check that you did not run a river channel or a bump through a structure's
`(x, z)` in `packages/<名稱>/structures.json`. Color-only edits (`regions`, any `tint`,
`colorRamp`) never move structures.
