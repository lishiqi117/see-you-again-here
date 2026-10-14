# SEE AGAIN ending assets

The final backdrop `sunlit-steps.png` is the user's unmarked supplied photograph, copied without edits. The annotated second image is only a placement reference. Letter feet align to 65.3% of the source image height through the same cover/crop transform as the backdrop. CSS depth layers, warm directional highlights, contact shadows and projected silhouettes simulate upper-left sunlight; this is layered browser rendering, not ray-traced geometry. The sunlit layout has its own storage key, preserving older scattered placements while replacing the old black-background assembled layout with the requested ledge arrangement.

The original photographs were copied unchanged from `C:/Users/25044/Desktop/字母/`.

Order: S gate; E school friends; E classroom; A school gate; G street; A hand shadows; I corridor; N cat.

`letter-1-S.png` through `letter-8-N.png` are individual transparent photo letters. `mask-0.png` through `mask-7.png` are their clean silhouette masks. `masks.js` embeds those masks for browsers that restrict local-file CSS masks.

The built-in image generation tool cleaned/reconstructed the silhouettes from the supplied white 3D typography; the photos were not AI regenerated. Final prompt: create eight clean, solid black, chunky irregular silhouettes matching the reference, in a 4-column/2-row grid S E E A / G A I N, transparent background, no speckles, shadows or textures, a narrow I, a filled A center with only the lower leg notch. The first white-mask attempt was rejected because of edge debris. The selected black-mask atlas was separated into individual components and composited with the original photos using the browser canvas.

Re-export masks and photo letters: `node tools/prepare-ending-letters.cjs`.
Interaction verification: `node tools/check-ending.cjs`.
