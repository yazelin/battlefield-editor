#!/bin/bash
# 宣傳片 compose 階段:把 capture 的 webm + 旁白 + 配樂 + 品牌素材,合成三種比例成片。
# 需求:ffmpeg、Noto Sans TC 字型、brand.py 產出的 brand-out/、capture.mjs 產出的 raw/。
# 旁白(edge-tts)與配樂(CC0)請先備好(見 README);Gemini 驗聲調另跑。
#
# 用法:bash tools/trailer/compose.sh   → 產出 out/trailer-{16x9,9x16,4x5}.mp4
#
# 版位:16:9=YouTube 主片(無字幕);9:16=LINE/Shorts/Reels(燒字幕);4:5=FB 動態(燒字幕)。
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
RAW="$HERE/raw"; BRAND="$HERE/brand-out"; OUT="$HERE/out"; mkdir -p "$OUT"
FB="$HOME/.local/share/fonts/1NotoSansTC-Black.ttf"     # 字標(黑體)
FR="$HOME/.local/share/fonts/NotoSansTC-Bold.ttf"       # 內文(粗體)

# ── 每專案要換的旋鈕 ─────────────────────────────
TITLE_BIG="戰場編輯器"
TITLE_SUB="AI 戰場編輯器　·　3D 歷史戰場引擎"
MSG_BIG="一套引擎　·　六場戰役"
MSG_SUB="換一份資料，就換一場戰役"
MUSIC="$HERE/assets/music.mp3"                          # 配樂(CC0);建議 ≥36s 史詩曲
NARR="$HERE/narration"                                  # 旁白 n0..n6.mp3(edge-tts zh-TW-YunJheNeural)
# 四場高潮 clip:webm 基名(portrait 版加 _v)、提亮、社群字幕、16:9 短標
CLIPS=( "chibi|0.05|赤壁　火燒連環，一夜燒盡曹軍艦隊|赤壁之戰　·　火燒連環船"
        "flood|0.05|水淹七軍　決堤灌城，水深數丈|水淹七軍　·　決堤灌城"
        "guandu|0.12|官渡　烏巢夜襲，火燒袁軍糧草|官渡之戰　·　烏巢夜襲"
        "gaixia|0.06|垓下　四面楚歌，霸王末路|垓下之戰　·　東城快戰" )
# flood 的實際 webm 基名(hold 較長那支)
declare -A SRCNAME=( [chibi]=chibi [flood]=fanchengflood [guandu]=guandu [gaixia]=gaixia )
# ────────────────────────────────────────────────

# 旁白+配樂混音(比例無關,做一次)。時間軸:title4 s1..s4×5 msg7 end5 = 36s
build_audio(){
  ffmpeg -y -loglevel error \
    -i "$NARR/n0.mp3" -i "$NARR/n1.mp3" -i "$NARR/n2.mp3" -i "$NARR/n3.mp3" \
    -i "$NARR/n4.mp3" -i "$NARR/n5.mp3" -i "$NARR/n6.mp3" -i "$MUSIC" \
    -filter_complex "\
[0:a]adelay=300|300[a0];[1:a]adelay=4300|4300[a1];[2:a]adelay=9300|9300[a2];\
[3:a]adelay=14300|14300[a3];[4:a]adelay=19300|19300[a4];[5:a]adelay=24300|24300[a5];\
[6:a]adelay=31300|31300[a6];\
[7:a]atrim=0:36,afade=t=in:st=0:d=1,afade=t=out:st=33:d=3,volume=0.32[m];\
[a0][a1][a2][a3][a4][a5][a6][m]amix=inputs=8:normalize=0:dropout_transition=0[mix]" \
    -map "[mix]" -t 36 -c:a aac -b:a 192k "$OUT/audio.m4a"
}

# render <key> <W> <H> <GEOM> <suffix> <banner> <end> <CAP> <TBIG> <TSUB> <BTM> <BY>
render(){
  key=$1; W=$2; H=$3; GEOM=$4; SUF=$5; BAN=$6; END=$7; CAP=$8; TBIG=$9; TSUB=${10}; BTM=${11}; BY=${12}
  O="$OUT/mk_$key"; mkdir -p "$O"
  dark="eq=brightness=-0.30:contrast=1.05:saturation=1.05"
  [ "$CAP" = 1 ] && btmstyle="box=1:boxcolor=black@0.5:boxborderw=14:fontcolor=white" \
                 || btmstyle="shadowcolor=black@0.85:shadowx=2:shadowy=2:fontcolor=white"
  src(){ echo "$RAW/${SRCNAME[$1]}${SUF}.webm"; }
  # 片頭:火攻畫面當底 + 標題(靜音自動播首幀就有畫面)
  ch="$(src chibi)"; cd=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$ch"); cs=$(python3 -c "print(max(0,$cd-4.6))")
  ffmpeg -y -loglevel error -ss $cs -t 4 -i "$ch" -vf "$dark,$GEOM,fps=30,\
drawtext=fontfile=$FB:text='$TITLE_BIG':fontcolor=white:fontsize=$TBIG:x=(w-tw)/2:y=(h-th)/2-40:alpha='min(1\,max(0\,(t-0.3)/0.7))',\
drawtext=fontfile=$FR:text='$TITLE_SUB':fontcolor=0xd9b25a:fontsize=$TSUB:x=(w-tw)/2:y=(h/2)+50:alpha='min(1\,max(0\,(t-0.6)/0.7))',\
fade=t=in:st=0:d=0.5,fade=t=out:st=3.6:d=0.4" -an -c:v libx264 -pix_fmt yuv420p -r 30 "$O/c_title.mp4"
  # 四場 clip
  i=1
  for row in "${CLIPS[@]}"; do IFS='|' read -r id br cap lbl <<< "$row"
    [ "$CAP" = 1 ] && txt="$cap" || txt="$lbl"
    s="$(src $id)"; du=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$s"); ss=$(python3 -c "print(max(0,$du-5.5))")
    ffmpeg -y -loglevel error -ss $ss -t 5 -i "$s" -vf "eq=brightness=$br:contrast=1.12:saturation=1.32,$GEOM,fps=30,\
drawtext=fontfile=$FR:text='$txt':fontsize=$BTM:x=(w-tw)/2:y=$BY:$btmstyle:alpha='min(1\,max(0\,(t-0.2)/0.5))',\
fade=t=in:st=0:d=0.4,fade=t=out:st=4.6:d=0.4" -an -c:v libx264 -pix_fmt yuv420p -r 30 "$O/s$i.mp4"; i=$((i+1))
  done
  # msg 字卡(7s)
  ffmpeg -y -loglevel error -f lavfi -i color=c=0x0a0a0a:s=${W}x${H}:d=7:r=30 -vf "\
drawtext=fontfile=$FB:text='$MSG_BIG':fontcolor=white:fontsize=$(python3 -c "print(int($TBIG*0.82))"):x=(w-tw)/2:y=(h-th)/2-30:alpha='min(1\,max(0\,(t-0.3)/0.7))',\
drawtext=fontfile=$FR:text='$MSG_SUB':fontcolor=0xd9b25a:fontsize=$TSUB:x=(w-tw)/2:y=(h/2)+55:alpha='min(1\,max(0\,(t-0.7)/0.7))',\
fade=t=in:st=0:d=0.5,fade=t=out:st=6.5:d=0.5" -an -c:v libx264 -pix_fmt yuv420p -r 30 "$O/c_msg.mp4"
  # 尾卡(png,5s)
  ffmpeg -y -loglevel error -loop 1 -t 5 -i "$END" -vf "fps=30,scale=${W}:${H},fade=t=in:st=0:d=0.5,fade=t=out:st=4.5:d=0.5,format=yuv420p" -c:v libx264 -pix_fmt yuv420p -r 30 "$O/c_end.mp4"
  # 串接 + 品牌條 overlay + 混音
  for f in c_title s1 s2 s3 s4 c_msg c_end; do echo "file '$O/$f.mp4'"; done > "$O/list.txt"
  ffmpeg -y -loglevel error -f concat -safe 0 -i "$O/list.txt" -c copy "$O/video.mp4"
  ffmpeg -y -loglevel error -i "$O/video.mp4" -i "$BAN" -i "$OUT/audio.m4a" \
    -filter_complex "[1:v]scale=${W}:${H}[bn];[0:v][bn]overlay=0:0,format=yuv420p[v]" \
    -map "[v]" -map 2:a -t 36 -c:v libx264 -crf 20 -preset medium -c:a copy -movflags +faststart "$OUT/trailer-$key.mp4"
  echo "→ out/trailer-$key.mp4"
}

build_audio
render 16x9 1280 720  "scale=1280:720"                    ""   "$BRAND/banner_h.png"  "$BRAND/end_h.png"  0 150 40 40 "h-90"
render 9x16 1080 1920 "scale=1080:1920"                   "_v" "$BRAND/banner_v.png"  "$BRAND/end_v.png"  1 96  30 42 "h-300"
render 4x5  1080 1350 "crop=720:900:0:190,scale=1080:1350" "_v" "$BRAND/banner_45.png" "$BRAND/end_45.png" 1 92  30 40 "h-210"
