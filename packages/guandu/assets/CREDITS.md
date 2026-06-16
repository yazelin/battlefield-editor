# 官渡 package — 素材出處

## 旁白語音(narration/)
- 由 `packages/guandu/narration/generate.py` 以 **edge-tts**(Microsoft Azure 神經語音
  `zh-TW-YunJheNeural` / `zh-TW-HsiaoChenNeural`)在本機合成。
- 字幕時間軸 `assets/narration/cues.json` 由同一腳本的 SentenceBoundary 產生。
- 文本見 `narration/script.json`(史實改寫白話旁白)。
- 注意:edge-tts 走 Microsoft 線上服務,語音再散布的授權屬灰色地帶;若要正式商用,
  改用自有授權的 TTS 或配音重生即可(腳本、字幕格式不變)。

## 音效(sfx/)
- `battlecry` / `sword1`–`sword4` 由 `packages/chibi`(赤壁)複用,皆 **CC0**;
  原始出處與作者見 `packages/chibi/assets/CREDITS.md`。
- 其餘戰場聲(鼓 drum、爆 boom、馬蹄、江水、風、火場嗶剝)是引擎內 Web Audio
  即時合成(`BUILD` 表),無音檔。

## 音樂(music/)
暫時**複用 chibi(赤壁)的 CC0 配樂**,依官渡各幕情緒對應(原始出處/作者見
`packages/chibi/assets/CREDITS.md`,全部 Freesound CC0)。日後可用 Freesound 海選 +
代聽管線換成官渡專屬曲(scene/audio 格式不變)。

| 官渡幕 | 檔案 | 借自赤壁 | 情緒對應 |
|---|---|---|---|
| 白馬解圍 | scene1.mp3 | 赤壁 scene1(War Drums) | 戰鼓開場 |
| 延津斬文醜 | scene2.mp3 | 赤壁 scene3(Baroque) | 交戰 |
| 退守官渡 | scene3.mp3 | 赤壁 scene4(Drone) | 對峙張力 |
| 土山樓櫓 | scene4.mp3 | 赤壁 scene8(Dark Groove) | 圍城膠著 |
| 霹靂破櫓 | scene5.mp3 | 赤壁 scene6(Orchestral) | 戰械之戲 |
| 許攸來奔 | scene6.mp3 | 赤壁 scene5(Flute) | 夜謀詭譎 |
| 烏巢夜襲 | scene7.mp3 | 赤壁 scene7(Epic Heroic) | 火攻高潮 |
| 河北遂定 | scene8.mp3 | 赤壁 scene9(Orchestral) | 收束(亦作 theme) |
