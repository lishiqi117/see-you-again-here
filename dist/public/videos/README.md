# Character Credits video assets

## Current page assets

The page now uses `mens-clean.webm`, `girl-clean.webm`, and `little girl-clean.webm` and their `-clean.webp` stills. These remove source matte residue at alpha values 0–16 with `format=rgba,lut=a='if(lte(val,16),0,val)'` before encoding. Dimensions and frame rate remain unchanged. Older outputs below remain available as the original conversion.

The original `men.mov` cropped both seated players. It has been replaced with the user's new `mens.mov` (1660 × 1244, 24 fps). `object-fit: contain` displays the entire landscape frame. Reconvert only this asset with `node tools/convert-credits.cjs mens`.

Only the three supplied prototype headings and descriptive paragraphs remain on the page. Added character labels, dialogues, header, and footer were removed.

Source: `D:/项目三/视频/`, Apple ProRes 4444 with alpha, 24 fps.

| Output | Dimensions | Frames / duration | Bytes | Reduction |
| --- | --- | --- | --- | --- |
| men.webm | 1244 × 1660 | 242 / 10.083 s | 13,891,126 | 97.1% |
| girl.webm | 1176 × 1764 | 242 / 10.083 s | 13,080,133 | 97.5% |
| little girl.webm | 1244 × 1660 | 242 / 10.083 s | 21,138,650 | 95.4% |

All outputs use VP9 (`libvpx-vp9`) and `yuva420p`. No resizing or frame-rate conversion is applied to the videos. Audio is omitted because these are silent character loops. WebP files are smaller transparent stills for loading, reduced motion, and unsupported alpha decoding.

Reproduce from the project root with `node tools/convert-credits.cjs`. Set `FFMPEG_PATH` if FFmpeg lives elsewhere. This overwrites generated outputs.

Equivalent encoding command:

```powershell
ffmpeg -i "input.mov" -map 0:v:0 -an -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 28 -deadline good -cpu-used 2 -row-mt 1 -threads 8 -auto-alt-ref 0 -fps_mode passthrough "output.webm"
```

Verification explicitly selects the alpha-aware libvpx decoder, decodes the full clip, and extracts the alpha plane:

```powershell
ffmpeg -c:v libvpx-vp9 -i "output.webm" -vf "alphaextract,signalstats,metadata=print" -an -f null -
```

The adjacent `.alpha.log` files record `yuva420p`, `alpha_mode: 1`, and alpha samples from 0 (transparent) to 255 (opaque). A default VP9 probe may report the color plane as `yuv420p`; decode the alpha plane to verify transparency, rather than relying only on that label. See the [FFmpeg alpha-decoding report](https://ffmpeg.org/pipermail/ffmpeg-trac/2024-September/070729.html).

Browser QA: `node tools/check-credits.cjs` with the local server running (`node tools/space-editor-server.cjs`). It checks actual decoded transparent pixels, dimensions, playback attributes, alternating layout, pause, reduced motion, and mobile overflow. Screenshots are in `qa/credits-*.png`.

The prototype descriptions preserve the supplied text.
