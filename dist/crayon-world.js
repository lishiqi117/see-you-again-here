(() => {
  "use strict";

  const ART_WIDTH = 1672;
  const ART_HEIGHT = 941;
  const PATCH_PADDING = 5;
  const PATCH_MARGIN = 2;
  const PATCH_FEATHER = 0;

  const viewport = document.querySelector("#sceneViewport");
  const artboard = document.querySelector("#sceneArtboard");
  const cleanPlate = document.querySelector("#cleanPlate");
  const originalPoster = document.querySelector("#originalPoster");
  const objectLayers = document.querySelector("#objectLayers");

  if (!viewport || !artboard || !cleanPlate || !originalPoster || !objectLayers) return;

  const objects = [
    {
      id: "sun",
      z: 60,
      amplitude: 3.2,
      box: [0, 0, 218, 162],
      path: "M0 0 H128 C143 10 151 23 151 38 C151 72 120 99 63 101 C32 103 10 90 0 78 Z M132 8 L190 0 L151 45 Z M148 34 L207 62 L150 79 Z M145 71 L182 127 L120 98 Z M111 93 L131 159 L78 109 Z M44 98 L32 138 L9 97 Z"
    },
    {
      id: "cloud-left",
      z: 55,
      amplitude: 2.6,
      box: [260, 10, 454, 188],
      path: "M269 76 C279 52 302 44 329 47 C358 50 383 52 414 39 C448 25 479 13 511 19 C541 23 557 38 581 37 C622 35 669 31 694 48 C711 60 709 82 699 95 C686 112 655 107 630 100 C601 92 578 78 551 83 C519 89 496 107 469 123 C438 142 417 166 385 182 C350 200 310 188 286 172 C263 157 263 130 267 103 C268 93 266 85 269 76 Z"
    },
    {
      id: "cloud-center",
      z: 56,
      amplitude: 2.3,
      box: [648, 35, 584, 222],
      path: "M659 120 C666 95 687 80 715 80 C741 79 759 67 785 66 C815 65 835 78 861 80 C899 82 925 78 958 62 C990 45 1027 37 1058 45 C1089 53 1106 78 1131 80 C1158 82 1175 70 1199 80 C1224 91 1231 113 1222 136 C1211 160 1180 170 1148 172 C1110 175 1080 177 1044 182 C1007 187 978 200 944 220 C913 239 889 251 853 252 C817 252 778 244 745 231 C713 219 689 204 674 182 C659 160 652 140 659 120 Z"
    },
    {
      id: "cloud-right",
      z: 54,
      amplitude: 2.8,
      box: [1352, 180, 320, 166],
      path: "M1364 231 C1371 207 1393 192 1420 194 C1449 196 1472 210 1500 207 C1532 204 1552 186 1582 187 C1613 188 1634 202 1652 210 L1672 217 V324 C1649 330 1625 331 1600 324 C1574 316 1553 301 1528 298 C1499 294 1475 306 1448 310 C1416 315 1384 303 1368 280 C1356 263 1358 246 1364 231 Z"
    },
    {
      id: "bird",
      z: 58,
      amplitude: 4.2,
      box: [1297, 104, 142, 87],
      path: "M1307 126 C1313 112 1330 108 1345 113 C1359 117 1365 130 1362 143 C1374 138 1386 129 1395 119 C1400 113 1406 117 1403 125 L1396 139 C1408 136 1418 134 1425 140 C1416 147 1408 150 1398 151 C1409 155 1418 159 1422 165 C1409 168 1397 162 1386 157 C1374 169 1355 172 1338 165 C1325 160 1316 151 1311 143 C1302 143 1299 136 1307 126 Z M1337 163 L1346 164 L1343 185 L1337 185 Z M1351 164 L1359 164 L1366 182 L1359 186 Z"
    },
    {
      id: "distant-tree-left",
      z: 11,
      travel: 4,
      amplitude: 2,
      box: [238, 262, 74, 103],
      path: "M244 293 C244 277 256 267 269 268 C278 259 293 266 294 278 C305 280 310 292 304 301 C309 313 298 324 286 323 C277 332 262 326 260 316 C247 315 239 304 244 293 Z M263 314 C269 310 278 310 282 315 L281 362 H263 Z"
    },
    {
      id: "distant-bush-left",
      z: 10,
      travel: 4,
      amplitude: 2,
      box: [337, 311, 113, 64],
      path: "M342 355 C340 344 350 336 360 338 C359 326 372 320 381 327 C386 313 404 310 411 323 C422 316 437 325 435 337 C449 338 454 352 445 361 C433 370 358 371 344 363 Z"
    },
    {
      id: "distant-tree-mid-left",
      z: 11,
      travel: 4,
      amplitude: 2,
      box: [465, 273, 78, 112],
      path: "M477 306 C474 291 486 281 499 283 C506 271 522 275 526 287 C539 289 545 302 538 313 C542 326 530 337 518 335 C510 347 493 342 490 330 C477 331 468 319 477 306 Z M496 327 C502 323 513 324 518 329 L517 382 H496 Z"
    },
    {
      id: "distant-bush-center",
      z: 10,
      travel: 4,
      amplitude: 2,
      box: [568, 342, 119, 71],
      path: "M574 394 C568 382 578 371 590 373 C589 360 603 353 613 360 C620 345 637 344 645 357 C657 349 672 358 670 372 C684 374 690 388 681 399 C665 408 591 410 577 403 Z"
    },
    {
      id: "distant-tree-mid-right",
      z: 11,
      travel: 4,
      amplitude: 2,
      box: [1054, 320, 78, 96],
      path: "M1065 351 C1063 338 1074 329 1085 331 C1092 320 1107 323 1111 334 C1124 335 1130 348 1123 358 C1127 371 1116 381 1104 379 C1096 390 1081 385 1078 374 C1065 375 1057 363 1065 351 Z M1084 371 C1091 368 1102 368 1107 373 L1107 413 H1085 Z"
    },
    {
      id: "distant-tree-right",
      z: 11,
      travel: 4,
      amplitude: 2,
      box: [1164, 278, 76, 105],
      path: "M1175 311 C1173 296 1184 286 1197 287 C1205 275 1221 279 1224 291 C1237 293 1242 306 1235 316 C1240 329 1228 340 1216 338 C1208 349 1192 344 1189 333 C1176 334 1167 323 1175 311 Z M1194 330 C1201 326 1212 327 1217 332 L1216 380 H1195 Z"
    },
    {
      id: "distant-bush-right",
      z: 10,
      travel: 4,
      amplitude: 2,
      box: [1260, 326, 118, 62],
      path: "M1267 369 C1262 357 1272 348 1283 350 C1283 337 1296 331 1306 337 C1313 323 1330 323 1337 336 C1348 329 1363 338 1361 351 C1375 353 1380 366 1372 376 C1357 383 1281 384 1268 378 Z"
    },
    {
      id: "small-sprout-left-edge",
      z: 13,
      travel: 3,
      amplitude: 2,
      box: [0, 782, 31, 70],
      path: "M0 845 L4 806 L12 823 L17 787 L22 824 L30 802 L28 848 Z"
    },
    {
      id: "small-sprout-left",
      z: 13,
      travel: 3,
      amplitude: 2,
      box: [204, 738, 46, 62],
      path: "M211 793 L211 760 L220 773 L226 741 L232 772 L243 752 L240 794 Z"
    },
    {
      id: "small-sprout-right",
      z: 13,
      travel: 3,
      amplitude: 2,
      box: [1330, 742, 50, 76],
      path: "M1337 811 L1338 770 L1348 787 L1354 746 L1362 785 L1375 762 L1371 814 Z"
    },
    {
      id: "school",
      z: 20,
      amplitude: 0.9,
      box: [244, 299, 1161, 516],
      path: "M252 441 L744 437 L747 359 L836 353 L839 321 L873 318 L877 352 L991 377 L1396 516 L1370 809 L1194 788 L962 758 L940 754 L749 757 L498 774 L260 814 Z"
    },
    {
      id: "tree-apple",
      z: 28,
      amplitude: 1.4,
      box: [0, 278, 256, 663],
      path: "M0 294 C24 279 51 284 70 300 C92 284 119 286 137 306 C159 298 184 310 193 331 C215 332 234 350 238 373 C254 391 252 417 239 433 C249 455 243 482 226 498 C232 522 219 547 197 558 C198 586 178 607 152 610 C142 635 115 648 90 642 C69 665 34 672 10 654 L0 651 Z M36 561 C49 551 78 554 92 565 L108 941 H21 L31 707 Z"
    },
    {
      id: "tree-pink",
      z: 35,
      amplitude: 1.8,
      box: [38, 486, 250, 455],
      path: "M45 611 C49 574 71 544 101 526 C118 499 154 489 185 500 C218 499 249 520 262 551 C285 572 290 608 276 637 C282 672 259 704 227 716 C210 741 175 750 143 740 C109 746 76 731 59 705 C36 684 33 646 45 611 Z M125 703 C144 696 186 698 207 710 L213 941 H124 Z"
    },
    {
      id: "tree-lime",
      z: 32,
      amplitude: 1.6,
      box: [1413, 190, 259, 751],
      path: "M1461 261 C1470 226 1496 208 1525 214 C1542 193 1570 194 1588 213 C1613 202 1642 216 1651 241 C1662 242 1669 247 1672 252 V512 C1656 526 1635 528 1616 520 C1595 544 1559 544 1538 523 C1510 534 1478 519 1466 491 C1439 481 1424 452 1430 425 C1411 405 1413 373 1430 352 C1418 324 1433 291 1461 276 Z M1544 495 C1572 486 1628 487 1657 496 L1672 941 H1567 Z"
    },
    {
      id: "tree-round",
      z: 36,
      amplitude: 1.8,
      box: [1371, 585, 262, 356],
      path: "M1382 650 C1385 620 1409 601 1437 606 C1454 586 1485 587 1504 604 C1528 589 1558 598 1571 619 C1598 618 1619 640 1616 666 C1634 685 1624 716 1601 726 C1594 751 1566 763 1542 752 C1523 770 1492 768 1476 750 C1452 764 1424 753 1415 730 C1388 725 1374 700 1381 677 Z M1408 719 C1424 713 1449 714 1462 722 L1466 941 H1405 Z M1468 723 C1484 716 1510 718 1522 727 L1531 941 H1473 Z"
    },
    {
      id: "flower-red-left",
      z: 44,
      amplitude: 4,
      box: [246, 813, 96, 128],
      path: "M281 846 C274 832 282 817 296 818 C307 818 314 827 314 838 C326 834 339 842 339 854 C339 866 330 873 319 874 C324 886 317 898 305 901 C294 903 285 895 282 884 C274 894 258 893 252 882 C246 871 252 860 263 855 C254 847 261 835 273 837 Z M280 882 C286 879 296 880 301 886 L302 941 H279 Z"
    },
    {
      id: "flower-purple",
      z: 44,
      amplitude: 4,
      box: [551, 807, 99, 134],
      path: "M591 840 C584 825 591 811 605 811 C617 811 624 820 624 831 C637 827 649 835 650 847 C651 859 642 867 630 869 C635 881 627 894 614 896 C603 898 594 891 591 880 C582 891 566 890 559 879 C553 868 559 856 570 852 C560 843 568 831 580 832 Z M589 878 C596 874 606 876 611 882 L613 941 H588 Z"
    },
    {
      id: "flower-orange",
      z: 44,
      amplitude: 4,
      box: [1017, 856, 96, 85],
      path: "M1052 883 C1046 869 1054 856 1067 856 C1078 856 1085 865 1085 875 C1098 872 1110 880 1110 892 C1110 903 1102 911 1091 912 C1095 923 1088 934 1077 936 C1065 939 1057 932 1054 921 C1045 931 1031 930 1024 920 C1018 909 1023 899 1034 894 C1025 886 1032 875 1043 875 Z M1053 918 H1074 L1076 941 H1052 Z"
    },
    {
      id: "flower-red-right",
      z: 44,
      amplitude: 4,
      box: [1308, 812, 101, 129],
      path: "M1346 845 C1339 831 1347 817 1361 817 C1373 817 1380 826 1380 837 C1393 833 1405 841 1406 853 C1407 865 1398 873 1386 875 C1391 887 1383 899 1371 901 C1360 904 1351 896 1348 885 C1339 896 1323 895 1316 884 C1310 873 1316 861 1327 857 C1318 848 1325 836 1337 837 Z M1346 882 C1353 878 1364 880 1369 886 L1371 941 H1345 Z"
    },
    {
      id: "grass-left",
      z: 42,
      amplitude: 4.5,
      box: [53, 854, 78, 78],
      path: "M72 921 L62 886 L80 900 L82 866 L94 899 L107 854 L107 902 L126 879 L116 922 Z"
    },
    {
      id: "grass-front-left",
      z: 43,
      amplitude: 3.8,
      box: [322, 831, 105, 105],
      path: "M338 924 L327 869 L350 894 L349 845 L369 889 L379 833 L391 890 L414 853 L405 901 L424 886 L413 929 Z"
    },
    {
      id: "grass-center",
      z: 41,
      amplitude: 3.8,
      box: [680, 751, 96, 104],
      path: "M693 839 L684 789 L705 811 L706 763 L723 806 L731 752 L744 807 L765 773 L758 818 L774 805 L763 844 Z"
    },
    {
      id: "grass-right",
      z: 41,
      amplitude: 3.8,
      box: [1120, 768, 106, 101],
      path: "M1135 851 L1124 803 L1146 824 L1148 781 L1164 818 L1174 769 L1187 822 L1209 784 L1202 829 L1222 814 L1211 858 Z"
    },
    {
      id: "grass-bottom-right",
      z: 43,
      amplitude: 4.3,
      box: [1528, 875, 93, 66],
      path: "M1542 941 L1532 902 L1551 918 L1553 884 L1567 915 L1577 876 L1587 917 L1605 891 L1601 924 L1618 912 L1612 941 Z"
    }
  ];

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hitCanvas = document.createElement("canvas");
  const hitContext = hitCanvas.getContext("2d");
  const pathSupported = typeof window.Path2D === "function" && hitContext;
  let active = null;
  let pointerStart = null;
  let ready = false;

  const imageReady = (image) => {
    if (image.complete && image.naturalWidth) return Promise.resolve();
    if (typeof image.decode === "function") return image.decode();
    return new Promise((resolve, reject) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", reject, { once: true });
    });
  };

  const setLayerFrame = (element, x, y, width, height) => {
    element.style.left = `${(x / ART_WIDTH) * 100}%`;
    element.style.top = `${(y / ART_HEIGHT) * 100}%`;
    element.style.width = `${(width / ART_WIDTH) * 100}%`;
    element.style.height = `${(height / ART_HEIGHT) * 100}%`;
  };

  const makeCanvasLayer = (definition, kind) => {
    const [boxX, boxY, boxWidth, boxHeight] = definition.box;
    const padding = kind === "patch" ? PATCH_PADDING : 0;
    const x = Math.max(0, Math.floor(boxX - padding));
    const y = Math.max(0, Math.floor(boxY - padding));
    const right = Math.min(ART_WIDTH, Math.ceil(boxX + boxWidth + padding));
    const bottom = Math.min(ART_HEIGHT, Math.ceil(boxY + boxHeight + padding));
    const width = right - x;
    const height = bottom - y;
    const element = document.createElement("div");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    element.className = `object-layer object-layer--${kind}`;
    element.dataset.object = definition.id;
    canvas.width = width;
    canvas.height = height;
    canvas.setAttribute("aria-hidden", "true");
    element.append(canvas);
    setLayerFrame(element, x, y, width, height);

    if (!context) return element;

    if (kind === "patch") {
      const mask = document.createElement("canvas");
      const maskContext = mask.getContext("2d");
      mask.width = width;
      mask.height = height;
      context.drawImage(cleanPlate, x, y, width, height, 0, 0, width, height);
      if (maskContext) {
        maskContext.save();
        maskContext.translate(-x, -y);
        maskContext.filter = `blur(${PATCH_FEATHER}px)`;
        maskContext.fillStyle = "#000";
        maskContext.strokeStyle = "#000";
        maskContext.lineWidth = PATCH_MARGIN * 2;
        maskContext.lineJoin = "round";
        maskContext.lineCap = "round";
        maskContext.fill(definition.hitPath);
        maskContext.stroke(definition.hitPath);
        maskContext.restore();
        context.globalCompositeOperation = "destination-in";
        context.drawImage(mask, 0, 0);
      }
      context.globalCompositeOperation = "source-over";
    } else {
      context.save();
      context.translate(-x, -y);
      context.clip(definition.hitPath);
      context.drawImage(originalPoster, 0, 0, ART_WIDTH, ART_HEIGHT);
      context.restore();
    }

    return element;
  };

  const resetActive = () => {
    if (!active) return;
    if (window.gsap) window.gsap.killTweensOf(active.objectLayer);
    active.patchLayer.classList.remove("is-wiggling");
    active.objectLayer.classList.remove("is-wiggling");
    active.objectLayer.style.removeProperty("transform");
    active = null;
  };

  const wiggle = (definition) => {
    if (!definition || !definition.objectLayer || !window.gsap || reducedMotion.matches) return;

    resetActive();
    const current = definition;
    active = current;
    current.patchLayer.classList.add("is-wiggling");
    current.objectLayer.classList.add("is-wiggling");
    window.gsap.set(current.objectLayer, { xPercent: 0 });
    const travel = current.travel ?? (current.box[2] > 800 ? 7 : current.box[2] > 300 ? 8 : 6);

    const finish = () => {
      if (active !== current) return;
      current.patchLayer.classList.remove("is-wiggling");
      current.objectLayer.classList.remove("is-wiggling");
      current.objectLayer.style.removeProperty("transform");
      active = null;
    };

    window.gsap.to(current.objectLayer, {
      keyframes: [
        { x: -travel, duration: 0.08, ease: "sine.inOut" },
        { x: travel, duration: 0.12, ease: "sine.inOut" },
        { x: -travel, duration: 0.12, ease: "sine.inOut" },
        { x: travel, duration: 0.12, ease: "sine.inOut" },
        { x: 0, duration: 0.1, ease: "sine.out" }
      ],
      overwrite: true,
      onComplete: finish
    });
  };

  const artPoint = (clientX, clientY) => {
    const bounds = artboard.getBoundingClientRect();
    if (
      clientX < bounds.left ||
      clientX > bounds.right ||
      clientY < bounds.top ||
      clientY > bounds.bottom
    ) return null;
    return {
      x: ((clientX - bounds.left) / bounds.width) * ART_WIDTH,
      y: ((clientY - bounds.top) / bounds.height) * ART_HEIGHT
    };
  };

  const objectAt = (clientX, clientY) => {
    if (!ready || !pathSupported) return null;
    const point = artPoint(clientX, clientY);
    if (!point) return null;
    for (let index = objects.length - 1; index >= 0; index -= 1) {
      if (hitContext.isPointInPath(objects[index].hitPath, point.x, point.y)) return objects[index];
    }
    return null;
  };

  const prepare = async () => {
    if (!pathSupported) return;
    try {
      await Promise.all([imageReady(originalPoster), imageReady(cleanPlate)]);
      objects.sort((a, b) => a.z - b.z);
      objects.forEach((definition) => {
        definition.hitPath = new Path2D(definition.path);
        definition.patchLayer = makeCanvasLayer(definition, "patch");
        definition.objectLayer = makeCanvasLayer(definition, "object");
        objectLayers.append(definition.patchLayer, definition.objectLayer);
      });
      ready = true;
      document.body.classList.add("is-ready");
    } catch (_error) {
      ready = false;
    }
  };

  artboard.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });

  artboard.addEventListener("pointerup", (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    if (distance <= 12) wiggle(objectAt(event.clientX, event.clientY));
  });

  artboard.addEventListener("pointercancel", () => {
    pointerStart = null;
  });

  artboard.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    artboard.style.cursor = objectAt(event.clientX, event.clientY) ? "pointer" : "default";
  });

  artboard.addEventListener("pointerleave", () => {
    artboard.style.cursor = "default";
  });

  reducedMotion.addEventListener?.("change", () => {
    if (reducedMotion.matches) resetActive();
  });

  window.__crayonScene = {
    count: objects.length,
    ids: objects.map((item) => item.id),
    wiggle: (id) => wiggle(objects.find((item) => item.id === id)),
    isReady: () => ready
  };

  prepare();
})();
