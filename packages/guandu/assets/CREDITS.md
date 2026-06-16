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
- 尚未加入(P4.2 待補:Freesound CC0 海選 + 代聽,見 ROADMAP)。
