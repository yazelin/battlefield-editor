# tools/trailer — 零成本宣傳片管線

這支宣傳片(赤壁/水淹七軍/官渡/垓下 showcase,16:9 / 9:16 / 4:5 三版)就是用這裡的腳本做的。
**核心 insight:引擎本身就是電影運鏡演出器 → 螢幕錄它,不用「生成」影片。** 全程免費、無付費 API。

## 四階段

| 階段 | 腳本 | 做什麼 |
|---|---|---|
| 1 Capture | `capture.mjs` | Playwright + xvfb 錄自動播映的高潮幕 → `raw/*.webm` |
| 2 Narration | edge-tts(見下) | 生成中文旁白 → `narration/n0..n6.mp3` |
| 3 Verify | Gemini pro 代聽 | 逐字驗聲調(破音字);whisper STT 驗不了聲調 |
| 4 Compose | `brand.py` + `compose.sh` | 字卡 + clip + 字幕 + 品牌條 + 尾卡 + 混音 → `out/trailer-*.mp4` |

## 跑法

```bash
# 依賴:playwright(npm i -D playwright)、ffmpeg、pillow、Noto Sans TC / Serif CJK 字型
npm i -D playwright

# 1. 錄製(WebGL 要真 GL,務必 xvfb-run headed;portrait 版另錄一次)
xvfb-run -a --server-args="-screen 0 1280x720x24" node tools/trailer/capture.mjs
xvfb-run -a --server-args="-screen 0 720x1280x24"  node tools/trailer/capture.mjs --portrait

# 2. 旁白(edge-tts;台詞在 compose.sh 對應的 narration 檔)
EDGE=zh-TW-YunJheNeural
edge-tts --voice $EDGE --rate=-5% --text "戰場編輯器 —— 三維歷史戰場引擎。"          --write-media narration/n0.mp3
edge-tts --voice $EDGE --rate=-5% --text "赤壁，火燒連環，一夜燒盡曹軍艦隊。"        --write-media narration/n1.mp3
edge-tts --voice $EDGE --rate=-5% --text "水淹七軍，決堤灌城，水深數丈。"            --write-media narration/n2.mp3
edge-tts --voice $EDGE --rate=-5% --text "官渡，烏巢夜襲，火燒袁軍糧草。"            --write-media narration/n3.mp3
edge-tts --voice $EDGE --rate=-5% --text "垓下，四面楚歌，霸王末路。"                --write-media narration/n4.mp3
edge-tts --voice $EDGE --rate=-5% --text "一套引擎，六場戰役。換一份資料，就換一場戰役。" --write-media narration/n5.mp3
edge-tts --voice $EDGE --rate=-5% --text "免安裝，打開瀏覽器就能看。"                --write-media narration/n6.mp3
#   破音字先繞:例「七軍皆沒」的「沒 mò」→ edge-tts 會念 méi,改「水深數丈」避開。

# 3. 驗聲調:把 nX.mp3 base64 丟 gemini-2.5-pro,問「音高走向」逐字聽寫(非「念 A 還 B」)。

# 4. 配樂放 assets/music.mp3(這支用 packages/chibi/assets/music/scene7.mp3,CC0),然後
python3 tools/trailer/brand.py     # 產品牌條 + 六印章尾卡 → brand-out/
bash    tools/trailer/compose.sh   # → out/trailer-{16x9,9x16,4x5}.mp4
```

## 版位對應

- `trailer-16x9.mp4` — YouTube 主片(無燒字幕,有聲觀眾)
- `trailer-9x16.mp4` — LINE 分享 / YT Shorts / FB Reels(燒字幕,靜音也看得懂)
- `trailer-4x5.mp4` — FB 動態貼文(佔版面最大)。貼社團:影片進貼文、連結放第一則留言。

## 換到別的 app / 別場戰役

改各腳本頂部的「每專案要換的旋鈕」區塊即可:`capture.mjs` 的 `BATTLES`(pkg / 跳哪幕 / hold)
與 `HIDE`;`brand.py` 的 `SEALS` / `WORDMARK` / `URL`;`compose.sh` 的台詞、`CLIPS`、配樂。

**capture 階段依 app 類型不同**:會動的 3D/canvas app → 螢幕錄(本管線);純出圖專案 → 改用
ffmpeg `zoompan` 做 Ken Burns 幻燈 montage。其餘(旁白/驗音/合成/品牌)三段共用。
