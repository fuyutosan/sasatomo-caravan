/* 笹友キャラバン — OPアニメーション
 *
 * 【ひとつのロジックを3か所で使う】
 *   ① ゲーム本体（game.html）… 起動時にオーバーレイで自動再生
 *   ② op.html … 試写室で見る／動画に書き出す
 *   ③ メイメイ映画館（成長記録）… 書き出した動画を置く
 *
 * 【設計の要 1｜render(t)に集約】
 *   CSSアニメーションだと「いま何秒の絵か」を外から決められず、動画に撮ると絵がズレる。
 *   render(t) で「t秒の絵」を毎回ぜんぶ計算して描く。同じtなら必ず同じ絵＝何度でも撮り直せる。
 *
 * 【設計の要 2｜ワールドとカメラを分ける】
 *   最初の版は「固定カメラの横スクロール」だけで、カメラワークが無かった。
 *   ワールド座標(wx,wy)に物を置き、カメラ(x,y,zoom)で切り取る方式に作り直した。
 *   これでパン・ズーム・カット割りができる。奥の物はパララックス率pを小さくして視差を出す。
 *
 * 【設計の要 3｜ゲーム本編が伝わる8カット】
 *   ①どんより町 ②もやもや雲に寄る ③隊商の登場 ④隊長さんの顔 ⑤浄化 ⑥町が色づく
 *   ⑦おみやげとなかま ⑧タイトル
 *
 * 【素材】新しい絵は描かない。ゲームで使っている素材だけを、動きとカメラで生かす。
 */
(function () {
  'use strict';

  var A = 'assets/';
  var IMG = {
    sky: A + 'scene/sky_day.png',
    mountains: A + 'scene/mountains.png',
    trees: A + 'scene/trees.png',
    ground: A + 'scene/ground.png',
    bush: A + 'scene/bush.png',
    tree: A + 'scene/tree.png',
    house: A + 'scene/house.png',
    wagon: A + 'scene/wagon_lv3.png',
    moya: A + 'scene/moyamoya.png',
    moyaSmile: A + 'scene/moyamoya_smile.png',
    chestF: A + 'icons/chest_futsu.png',
    chestS: A + 'icons/chest_suteki.png',
    chestT: A + 'icons/chest_totteoki.png',
    chestD: A + 'icons/chest_densetsu.png'
  };
  // 隊列の4人（隊長さんが先頭）
  var PARTY = ['taicho', 'nikoniko', 'mochimochi', 'takenoko'].map(function (n) { return A + 'chars/' + n + '.png'; });
  // カット7で「なかまが増える」を見せる面々
  var NEWBIES = ['sasanoha', 'pikapika', 'hanamaru', 'kirari'].map(function (n) { return A + 'chars/' + n + '.png'; });

  // =========================================================== ワールドの寸法
  // 画面比率に関係なく同じ絵になるように、仮想的な単位で世界を作る。
  var WORLD = { h: 1000, horizon: 720 };   // horizon = 地平線のy（下が大きい）

  // =========================================================== 台本
  var CUTS = [
    { // ① 引きの絵。どんよりした町をゆっくり見わたす
      t: 0.0, dur: 4.4, cut: true,
      from: { x: 520, y: 470, z: 0.92 }, to: { x: 880, y: 460, z: 0.98 },
      text: 'すこしずつ、\n元気が消えていく町があった。'
    },
    { // ② もやもや雲に寄る（困り顔をちゃんと見せる）
      t: 4.4, dur: 3.2, cut: true,
      from: { x: 1180, y: 250, z: 1.75 }, to: { x: 1230, y: 262, z: 2.35 },
      text: '笹が枯れて、\n空はどんより曇って。'
    },
    { // ③ 引いて、右から来る隊商をとらえる
      t: 7.6, dur: 4.6, cut: true,
      from: { x: 1700, y: 520, z: 1.00 }, to: { x: 1890, y: 526, z: 1.10 },
      text: 'そこへ、笹をいっぱいのせて\n歩いてくる隊商がいる。'
    },
    { // ④ 隊長さんに思いきり寄る（顔が画面の上寄りに来るようカメラを下げ、下にセリフの場所を空ける）
      t: 12.2, dur: 3.0, cut: true,
      from: { x: 1900, y: 600, z: 2.30 }, to: { x: 1926, y: 612, z: 2.62 },
      text: 'パンダさんたちの、\n笹友キャラバン。'
    },
    { // ⑤ 浄化。パンダさんパワーが飛んで、もやもや雲が笑顔になる
      t: 15.2, dur: 4.4, cut: true,
      from: { x: 2020, y: 430, z: 1.30 }, to: { x: 2090, y: 415, z: 1.16 },
      text: 'もやもや雲を、\nひとつずつ笑顔にしながら。'
    },
    { // ⑥ ぐーっと引いて、町ぜんたいに色が灯るのを見せる
      t: 19.6, dur: 3.4, cut: false,
      from: { x: 2090, y: 415, z: 1.16 }, to: { x: 1980, y: 430, z: 0.62 },
      text: '配った元気が、\n町の色になって返ってくる。'
    },
    { // ⑦ おみやげ（宝箱）→ 右にカメラを振って、あたらしいなかまへ視線を移す
      t: 23.0, dur: 3.6, cut: true,
      from: { x: 2730, y: 566, z: 1.52 }, to: { x: 3040, y: 556, z: 1.28 },
      text: 'おみやげと、\nあたらしいなかまを連れて。'
    },
    { // ⑧ タイトル
      t: 26.6, dur: 5.0, cut: true,
      from: { x: 1996, y: 545, z: 1.02 }, to: { x: 2078, y: 538, z: 0.96 },
      text: ''
    }
  ];
  var DURATION = 31.6;

  var T_WAGON_IN = 7.9;    // 隊商が入ってくる
  var T_BEAM = 16.0;       // パンダさんパワーが飛ぶ
  var T_PURIFY = 16.9;     // もやもや雲が笑顔になる
  var T_DAWN = 19.9;       // 町に色が灯る
  var T_CHEST = 23.4;      // 宝箱が開く
  var T_NEWBIE = 24.2;     // なかまが現れる
  var T_TITLE = 27.2;      // タイトル
  var T_SUB = 29.4;        // 副題

  // パンダさんパワーの玉が飛ぶ相手と、その玉が届いて笑顔になる時刻。
  // ここを配列順(i*0.42)で組んだら「輪だけ広がって顔は困り顔のまま」になった。
  // 玉の到着(発射+0.95秒)と一致させるのが正しい。
  var BEAM_ORDER = [2, 1, 3];
  var PURIFY_AT = {};
  BEAM_ORDER.forEach(function (mi, i) { PURIFY_AT[mi] = T_BEAM + i * 0.42 + 0.95; });
  PURIFY_AT[0] = T_DAWN + 0.25;   // ②で寄った雲。町に色が灯るときに一緒に笑顔になる

  // =========================================================== 小道具
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function easeOut(x) { return 1 - Math.pow(1 - clamp(x, 0, 1), 3); }
  function easeInOut(x) { x = clamp(x, 0, 1); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function easeOutBack(x) { x = clamp(x, 0, 1); var c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function since(t, at) { return t - at; }
  function rise(t, at, dur) { return easeOut(since(t, at) / (dur || 0.6)); }
  function wrap(v, m) { return ((v % m) + m) % m; }

  var el = {};
  var mounted = false;
  var view = { W: 1080, H: 1920, scale: 1, camX: 0, camY: 0, camZ: 1 };

  function css() {
    return [
      '.sop{position:absolute;inset:0;overflow:hidden;background:#080b14;',
      '  font-family:"Yu Gothic UI","Hiragino Kaku Gothic ProN","Meiryo",sans-serif;',
      '  word-break:keep-all;overflow-wrap:anywhere;}',
      '.sop *{box-sizing:border-box;}',
      '.sop img{image-rendering:pixelated;display:block;position:absolute;}',
      '.sop-sky{position:absolute;inset:0;background-size:cover;background-position:center bottom;}',
      '.sop-tint{position:absolute;inset:0;}',
      '.sop-row{position:absolute;display:flex;align-items:flex-end;}',
      '.sop-row img{position:relative;height:100%;width:auto;}',
      '.sop-beam{position:absolute;border-radius:50%;',
      '  background:radial-gradient(circle,#eafff0 0%,#9be8b0 40%,rgba(122,214,143,0) 72%);}',
      '.sop-spark{position:absolute;border-radius:50%;background:#fff3c4;}',
      '.sop-leaf{position:absolute;border-radius:50% 0 50% 0;background:#7ad68f;}',
      '.sop-ring{position:absolute;border-radius:50%;border:solid #bff3cc;}',
      '.sop-vig{position:absolute;inset:0;pointer-events:none;z-index:30;}',
      '.sop-bar{position:absolute;left:0;right:0;background:#000;z-index:29;}',   // 上下の帯（映画っぽさ）
      '.sop-cap{position:absolute;left:7%;right:7%;text-align:center;color:#fff;',
      '  font-weight:800;line-height:1.55;white-space:pre-line;z-index:31;',
      '  text-shadow:0 .1em .5em rgba(0,0,0,.92),0 0 .12em rgba(0,0,0,.8);}',
      '.sop-title{position:absolute;left:0;right:0;text-align:center;color:#fff;',
      '  font-weight:900;z-index:31;',
      '  text-shadow:0 .09em .5em rgba(0,0,0,.92),0 0 .7em rgba(122,214,143,.65);}',
      '.sop-sub{position:absolute;left:0;right:0;text-align:center;color:#e8fff1;font-weight:700;z-index:31;',
      '  text-shadow:0 .1em .45em rgba(0,0,0,.92);}',
      '.sop-skip{position:absolute;right:3%;top:3%;z-index:40;padding:.6em 1.1em;border-radius:999px;',
      '  border:2px solid rgba(255,255,255,.5);background:rgba(0,0,0,.45);color:#fff;',
      '  font-weight:700;font-size:14px;cursor:pointer;pointer-events:auto;}',
      '.sop-skip:hover{background:rgba(0,0,0,.68);}'
    ].join('');
  }

  /** ワールド座標 → 画面座標。p はパララックス率（1=地面、0.1=遠景） */
  function toScreen(wx, wy, p) {
    if (p === undefined) p = 1;
    var z = view.camZ * view.scale;
    return {
      x: (wx - view.camX * p) * z + view.W / 2,
      y: (wy - view.camY) * z + view.H / 2,
      z: z
    };
  }

  /** ワールドのサイズ（高さ）を画面ピクセルに */
  function toPx(wh) { return wh * view.camZ * view.scale; }

  /** 画像を「ワールド座標に置く」。anchor: 'bottom'（足元基準）or 'center' */
  function place(im, wx, wy, wh, p, opt) {
    opt = opt || {};
    var s = toScreen(wx, wy, p);
    var h = toPx(wh);
    var natural = im.naturalWidth && im.naturalHeight ? (im.naturalWidth / im.naturalHeight) : 1;
    var w = h * natural;
    im.style.height = h + 'px';
    im.style.width = 'auto';
    im.style.left = (s.x - w / 2 + (opt.dx || 0)) + 'px';
    im.style.top = (opt.anchor === 'center' ? s.y - h / 2 : s.y - h) + (opt.dy || 0) + 'px';
    return s;
  }

  function mount(container) {
    var st = document.createElement('style');
    st.textContent = css();
    container.appendChild(st);

    var root = document.createElement('div');
    root.className = 'sop';
    container.appendChild(root);
    el.root = root;

    el.sky = document.createElement('div');
    el.sky.className = 'sop-sky';
    el.sky.style.backgroundImage = 'url(' + IMG.sky + ')';
    root.appendChild(el.sky);
    el.tint = document.createElement('div');
    el.tint.className = 'sop-tint';
    root.appendChild(el.tint);

    function row(src, n, z) {
      var d = document.createElement('div');
      d.className = 'sop-row'; d.style.zIndex = z;
      for (var i = 0; i < n; i++) { var im = document.createElement('img'); im.src = src; d.appendChild(im); }
      root.appendChild(d);
      return d;
    }
    el.mountains = row(IMG.mountains, 8, 2);
    el.trees = row(IMG.trees, 10, 3);
    el.ground = row(IMG.ground, 260, 8);

    function img(src, z) {
      var im = document.createElement('img'); im.src = src; im.style.zIndex = z;
      root.appendChild(im); return im;
    }

    // 町並み（ワールドに点在させる）。x はワールド座標
    el.houses = [];
    [[380, 1.00], [700, 0.86], [1020, 1.10], [1420, 0.92], [1900, 1.02],
     [2270, 0.88], [2480, 1.06], [3380, 0.95]].forEach(function (h) {
      var im = img(IMG.house, 4);
      im.dataset.wx = h[0]; im.dataset.s = h[1];
      el.houses.push(im);
    });
    el.trees2 = [];
    [[240, 1.0], [860, 0.85], [1240, 1.05], [1640, 0.9], [2140, 1.0], [2480, 0.88], [2860, 1.02]].forEach(function (o) {
      var im = img(IMG.tree, 5);
      im.dataset.wx = o[0]; im.dataset.s = o[1];
      el.trees2.push(im);
    });
    el.bushes = [];
    for (var b = 0; b < 16; b++) {
      var im = img(IMG.bush, 9);
      im.dataset.wx = 180 + b * 195; im.dataset.s = 0.8 + (b % 3) * 0.15;
      el.bushes.push(im);
    }

    // もやもや雲。②で寄るのは1つめ、⑤で笑顔になるのは3つ
    el.moyas = [];
    [[1230, 250, 150], [1640, 190, 120], [2160, 235, 132], [2520, 200, 112]].forEach(function (m) {
      var im = img(IMG.moya, 10);
      im.dataset.wx = m[0]; im.dataset.wy = m[1]; im.dataset.h = m[2];
      el.moyas.push(im);
    });

    // 隊商
    el.wagon = img(IMG.wagon, 11);
    el.chars = PARTY.map(function (src) { return img(src, 12); });

    // おみやげ（宝箱）と、あたらしいなかま
    el.chests = [IMG.chestF, IMG.chestS, IMG.chestT, IMG.chestD].map(function (src) { return img(src, 13); });
    el.newbies = NEWBIES.map(function (src) { return img(src, 12); });

    // 演出（光の玉・きらきら・輪・笹の葉）
    el.beams = [];
    for (var i = 0; i < 3; i++) {
      var d = document.createElement('div'); d.className = 'sop-beam'; d.style.zIndex = 14;
      root.appendChild(d); el.beams.push(d);
    }
    el.rings = [];
    for (var r = 0; r < 3; r++) {
      var d2 = document.createElement('div'); d2.className = 'sop-ring'; d2.style.zIndex = 14;
      root.appendChild(d2); el.rings.push(d2);
    }
    el.sparks = [];
    for (var s2 = 0; s2 < 40; s2++) {
      var d3 = document.createElement('div'); d3.className = 'sop-spark'; d3.style.zIndex = 15;
      root.appendChild(d3); el.sparks.push(d3);
    }
    el.leaves = [];
    for (var k = 0; k < 18; k++) {
      var d4 = document.createElement('div'); d4.className = 'sop-leaf'; d4.style.zIndex = 16;
      root.appendChild(d4); el.leaves.push(d4);
    }

    el.barTop = document.createElement('div'); el.barTop.className = 'sop-bar'; el.barTop.style.top = '0';
    el.barBottom = document.createElement('div'); el.barBottom.className = 'sop-bar'; el.barBottom.style.bottom = '0';
    root.appendChild(el.barTop); root.appendChild(el.barBottom);

    el.vig = document.createElement('div'); el.vig.className = 'sop-vig'; root.appendChild(el.vig);
    el.cap = document.createElement('div'); el.cap.className = 'sop-cap'; root.appendChild(el.cap);
    el.title = document.createElement('div'); el.title.className = 'sop-title';
    el.title.textContent = '笹友キャラバン'; root.appendChild(el.title);
    el.sub = document.createElement('div'); el.sub.className = 'sop-sub';
    el.sub.textContent = '隊長さん、いってらっしゃい'; root.appendChild(el.sub);

    mounted = true;
    return root;
  }

  // =========================================================== カメラ
  function activeCut(t) {
    var idx = 0;
    for (var i = 0; i < CUTS.length; i++) if (t >= CUTS[i].t) idx = i;
    return idx;
  }

  function camAt(t) {
    var i = activeCut(t);
    var c = CUTS[i];
    var k = clamp((t - c.t) / c.dur, 0, 1);
    // カット内はゆっくり動かす（等速すぎると機械的なので少しだけ緩める）
    var e = c.cut === false ? easeInOut(k) : (0.15 * k + 0.85 * easeOut(k));
    return {
      x: lerp(c.from.x, c.to.x, e),
      y: lerp(c.from.y, c.to.y, e),
      z: lerp(c.from.z, c.to.z, e),
      cutIndex: i,
      k: k
    };
  }

  // =========================================================== 描画
  function render(t) {
    if (!mounted) return;
    var W = el.root.clientWidth || 1080;
    var H = el.root.clientHeight || 1920;
    view.W = W; view.H = H;
    var portrait = H >= W;
    var u = Math.min(W, H);
    // ワールドの高さ1000を画面にどう収めるか。縦長では横が余るので、少し寄って見せる
    view.scale = (portrait ? H / WORLD.h * 0.86 : H / WORLD.h);

    var cam = camAt(t);
    view.camX = cam.x; view.camY = cam.y; view.camZ = cam.z;
    var cut = cam.cutIndex;
    var z = view.camZ * view.scale;

    // --- 空。曇り → 夕明かり
    var dawn = easeInOut(since(t, T_DAWN) / 3.4);
    // sky_day.pngは水色なので、そのまま明るくすると「海」に見えた。
    // 色をまわして黄緑寄りにし、セピアを少し混ぜて夕明かりにする。
    // -42deg＋sepia0.30まで振ったら抹茶色になったので戻した。空は「夕明かり」で止める。
    // contrastを少し下げているのは、sky_day.pngの雲の層が暗いカットで横縞に見えるため。
    el.sky.style.filter = 'saturate(' + (0.28 + dawn * 0.46).toFixed(3)
      + ') brightness(' + (0.48 + dawn * 0.50).toFixed(3)
      + ') contrast(' + (0.88 + dawn * 0.10).toFixed(3)
      + ') hue-rotate(' + (dawn * -24).toFixed(1) + 'deg)'
      + ' sepia(' + (dawn * 0.15).toFixed(3) + ')';
    // 空も少しだけカメラに追従させる（動いている感じが出る）
    el.sky.style.backgroundPosition = (50 - view.camX * 0.004) + '% bottom';
    el.sky.style.transform = 'scale(' + (1 + (view.camZ - 1) * 0.06).toFixed(3) + ')';
    // 上は夕日の色、下は草の色。曇りのときは灰青をかぶせて元気のない空にする
    el.tint.style.background = 'linear-gradient(180deg,'
      + 'rgba(' + Math.round(28 + dawn * 212) + ',' + Math.round(36 + dawn * 140) + ',' + Math.round(60 + dawn * 40) + ',' + (0.62 - dawn * 0.28).toFixed(3) + ') 0%,'
      + 'rgba(' + Math.round(20 + dawn * 96) + ',' + Math.round(28 + dawn * 140) + ',' + Math.round(42 + dawn * 72) + ',' + (0.42 - dawn * 0.20).toFixed(3) + ') 100%)';

    var HZ = WORLD.horizon;

    // --- 山（パララックス0.12）
    (function () {
      // 高くすると空の真ん中に横縞が浮いて見えたので、地平線ぎわに低く敷く
      var h = toPx(185);
      var s = toScreen(0, HZ + 26, 0.12);
      el.mountains.style.height = h + 'px';
      el.mountains.style.top = (s.y - h) + 'px';
      el.mountains.style.left = (wrap(s.x, h * 3.4) - h * 3.4) + 'px';
      el.mountains.style.opacity = (0.30 + dawn * 0.34).toFixed(2);
      el.mountains.style.filter = 'brightness(' + (0.42 + dawn * 0.48).toFixed(2) + ') saturate(' + (0.30 + dawn * 0.65).toFixed(2) + ')';
    })();

    // --- 木々の帯（パララックス0.35）
    (function () {
      var h = toPx(200);
      var s = toScreen(0, HZ + 16, 0.35);
      el.trees.style.height = h + 'px';
      el.trees.style.top = (s.y - h) + 'px';
      el.trees.style.left = (wrap(s.x, h * 3.4) - h * 3.4) + 'px';
      el.trees.style.filter = 'brightness(' + (0.38 + dawn * 0.58).toFixed(2) + ') saturate(' + (0.36 + dawn * 0.72).toFixed(2) + ')';
    })();

    // --- 町並み（ワールド固定）
    var bright = 'brightness(' + (0.48 + dawn * 0.58).toFixed(2) + ') saturate(' + (0.42 + dawn * 0.68).toFixed(2) + ')';
    el.houses.forEach(function (im) {
      place(im, +im.dataset.wx, HZ + 6, 210 * +im.dataset.s, 1);
      im.style.filter = bright;
    });
    el.trees2.forEach(function (im) {
      place(im, +im.dataset.wx, HZ + 2, 175 * +im.dataset.s, 1);
      im.style.filter = 'brightness(' + (0.40 + dawn * 0.6).toFixed(2) + ') saturate(' + (0.4 + dawn * 0.7).toFixed(2) + ')';
    });
    el.bushes.forEach(function (im) {
      place(im, +im.dataset.wx, HZ + 34, 52 * +im.dataset.s, 1);
      im.style.filter = 'brightness(' + (0.46 + dawn * 0.62).toFixed(2) + ')';
    });

    // --- 手前の地面
    (function () {
      var s = toScreen(0, HZ + 30, 1);
      // 引きの絵では地面が短くて下に空色の隙間ができた。画面下端まで必ず届かせる。
      var h = Math.max(toPx(WORLD.h - HZ + 40), H - s.y + 2);
      el.ground.style.height = h + 'px';
      el.ground.style.top = s.y + 'px';
      var tileW = toPx(WORLD.h - HZ + 40) * 0.5;   // ground.pngは16x32＝縦長。タイル幅はズームだけで決める
      el.ground.style.left = (wrap(s.x, tileW) - tileW) + 'px';
      el.ground.style.filter = 'brightness(' + (0.50 + dawn * 0.52).toFixed(2) + ') saturate(' + (0.48 + dawn * 0.62).toFixed(2) + ')';
    })();

    // --- もやもや雲。⑤で順に笑顔になる
    el.moyas.forEach(function (im, i) {
      var pt = PURIFY_AT[i] !== undefined ? PURIFY_AT[i] : T_PURIFY;
      var purified = t >= pt;
      im.src = purified ? IMG.moyaSmile : IMG.moya;
      var fy = Math.sin(t * 1.2 + i * 2.1) * 14;
      var fx = Math.sin(t * 0.55 + i * 1.3) * 10;
      place(im, +im.dataset.wx + fx, +im.dataset.wy + fy, +im.dataset.h, 1, { anchor: 'center' });
      var p = purified ? clamp(since(t, pt) / 0.5, 0, 1) : 0;
      im.style.transform = 'scale(' + (1 + Math.sin(easeOut(p) * Math.PI) * 0.26) + ')';
      im.style.opacity = purified ? '0.97' : (0.62 + Math.sin(t * 0.9 + i) * 0.09).toFixed(2);
      im.style.filter = purified ? 'brightness(1.14) saturate(1.08)' : 'brightness(.62) saturate(.34)';
    });

    // --- 隊商の位置（ワールド座標）。右外から入って歩き、⑤で少し止まる
    var wagonWX;
    if (t < T_WAGON_IN) {
      wagonWX = 2260;
    } else {
      var e = easeOut(clamp(since(t, T_WAGON_IN) / 3.2, 0, 1));
      var walked = Math.max(0, since(t, T_WAGON_IN + 3.2)) * 26;    // 歩く速さ
      var slow = t > T_BEAM ? Math.max(0, t - T_BEAM) * 14 : 0;     // 浄化のあいだは少し減速
      wagonWX = lerp(2260, 1980, e) + walked - slow;
    }
    var bob = Math.sin(t * 4.6) * 5;
    place(el.wagon, wagonWX, HZ + 10 - bob, 250, 1);
    el.wagon.style.opacity = clamp(since(t, T_WAGON_IN) / 0.7, 0, 1);
    el.wagon.style.transform = 'rotate(' + (Math.sin(t * 3.2) * 0.8).toFixed(2) + 'deg)';
    el.wagon.style.filter = 'brightness(' + (0.80 + dawn * 0.28).toFixed(2) + ')';

    // --- パンダさんたち。幌馬車の前を歩く。上下ホップ＋伸縮でアニメらしく
    var partyX = [];
    el.chars.forEach(function (im, i) {
      var appear = clamp(since(t, T_WAGON_IN + 0.35 + i * 0.22) / 0.8, 0, 1);
      var wx = wagonWX - 175 - i * 92;
      partyX.push(wx);
      var step = Math.sin(t * 5.8 + i * 1.25);
      var hop = Math.abs(step) * 11;
      var squash = 1 + Math.sin(t * 11.6 + i * 2.5) * 0.028;   // ぽよぽよ
      place(im, wx, HZ + 12 - hop, 168 * (i === 0 ? 1.09 : 1), 1);
      im.style.opacity = appear;
      im.style.transform = 'rotate(' + (step * 2.0).toFixed(2) + 'deg) scaleY(' + squash.toFixed(3) + ')';
      im.style.filter = 'brightness(' + (0.76 + dawn * 0.32).toFixed(2) + ')';
    });

    // --- パンダさんパワーの光の玉：隊長さんから、もやもや雲へ飛ぶ
    el.beams.forEach(function (d, i) {
      var st = T_BEAM + i * 0.42;
      var k = clamp(since(t, st) / 0.95, 0, 1);
      if (k <= 0 || k >= 1) { d.style.opacity = '0'; return; }
      var fromWX = partyX[0], fromWY = HZ - 90;
      var mi = BEAM_ORDER[i];
      var toWX = +el.moyas[mi].dataset.wx, toWY = +el.moyas[mi].dataset.wy;
      var e = easeInOut(k);
      var wx = lerp(fromWX, toWX, e);
      var wy = lerp(fromWY, toWY, e) - Math.sin(e * Math.PI) * 90;   // 山なりに飛ぶ
      var s = toScreen(wx, wy, 1);
      // sinで明滅させたら「当たる直前にいちばん薄い」不自然な玉になった。
      // すぐ明るくなって、当たる瞬間にスッと吸い込まれる形にする。
      var sz = toPx(42) * (0.75 + k * 0.55);
      var op = Math.min(1, k * 6);
      if (k > 0.9) op *= (1 - k) / 0.1;
      d.style.width = d.style.height = sz + 'px';
      d.style.left = (s.x - sz / 2) + 'px';
      d.style.top = (s.y - sz / 2) + 'px';
      d.style.opacity = op.toFixed(2);
    });

    // --- 笑顔になった瞬間に広がる輪
    el.rings.forEach(function (d, i) {
      var mi = BEAM_ORDER[i];
      var k = clamp(since(t, PURIFY_AT[mi]) / 1.1, 0, 1);
      if (k <= 0 || k >= 1) { d.style.opacity = '0'; return; }
      var s = toScreen(+el.moyas[mi].dataset.wx, +el.moyas[mi].dataset.wy, 1);
      var sz = toPx(60 + easeOut(k) * 320);
      d.style.width = d.style.height = sz + 'px';
      d.style.left = (s.x - sz / 2) + 'px';
      d.style.top = (s.y - sz / 2) + 'px';
      d.style.borderWidth = Math.max(1, toPx(7) * (1 - k)) + 'px';
      d.style.opacity = ((1 - k) * 0.75).toFixed(2);
    });

    // --- おみやげ（宝箱）。⑦で順にぽんと出て、ふたが開くように跳ねる
    el.chests.forEach(function (im, i) {
      var st = T_CHEST + i * 0.24;
      var k = clamp(since(t, st) / 0.7, 0, 1);
      if (k <= 0) { im.style.opacity = '0'; return; }
      var wx = 2610 + i * 100;
      var pop = easeOutBack(k);
      var jump = Math.abs(Math.sin((t - st) * 4.2)) * 18 * (1 - clamp(since(t, st) / 2.4, 0, 1));
      place(im, wx, HZ + 4 - jump, 132 * pop, 1);
      im.style.opacity = clamp(k * 1.4, 0, 1);
      im.style.transform = 'rotate(' + (Math.sin((t - st) * 6) * 5).toFixed(1) + 'deg)';
      im.style.filter = 'brightness(1.05) drop-shadow(0 0 ' + toPx(10) + 'px rgba(255,236,170,.85))';
    });

    // --- あたらしいなかま。⑦の後半でぽんぽん現れる
    el.newbies.forEach(function (im, i) {
      var st = T_NEWBIE + i * 0.2;
      var k = clamp(since(t, st) / 0.6, 0, 1);
      if (k <= 0) { im.style.opacity = '0'; return; }
      var wx = 2980 + i * 92;
      var pop = easeOutBack(k);
      var hop = Math.abs(Math.sin((t - st) * 5.2)) * 13;
      place(im, wx, HZ + 10 - hop, 150 * pop, 1);
      im.style.opacity = clamp(k * 1.5, 0, 1);
      im.style.transform = 'rotate(' + (Math.sin((t - st) * 4.4) * 3).toFixed(1) + 'deg)';
      im.style.filter = 'brightness(' + (0.86 + dawn * 0.26).toFixed(2) + ')';
    });

    // --- きらきら（浄化から舞い上がる／宝箱から弾ける）
    el.sparks.forEach(function (d, i) {
      var on = false, sx = 0, sy = 0, op = 0, sz = toPx(9 + (i % 4) * 4);
      if (t >= T_PURIFY && t < T_CHEST) {
        var life = wrap((t - T_PURIFY) * 0.5 + i * 0.06, 1);
        var mi = [2, 1, 3][i % 3];
        var s = toScreen(+el.moyas[mi].dataset.wx + ((i * 61 % 100) - 50) * 2.4,
                         +el.moyas[mi].dataset.wy + 60 - life * 320, 1);
        sx = s.x; sy = s.y; op = Math.sin(life * Math.PI) * 0.85; on = true;
      } else if (t >= T_CHEST) {
        var life2 = wrap((t - T_CHEST) * 0.55 + i * 0.05, 1);
        var s2 = toScreen(2560 + (i * 47 % 340), HZ - 40 - life2 * 260, 1);
        sx = s2.x; sy = s2.y; op = Math.sin(life2 * Math.PI) * 0.8; on = true;
      }
      d.style.width = d.style.height = sz + 'px';
      d.style.left = (sx - sz / 2) + 'px';
      d.style.top = (sy - sz / 2) + 'px';
      d.style.opacity = on ? op.toFixed(2) : '0';
    });

    // --- 笹の葉。ずっとゆっくり舞っている（世界の空気）
    el.leaves.forEach(function (lf, i) {
      var life = wrap(t * 0.14 + i * 0.0555, 1);
      var sz = (0.0065 + (i % 3) * 0.0026) * u;
      lf.style.width = sz + 'px'; lf.style.height = (sz * 1.7) + 'px';
      lf.style.left = ((i * 211 % 100) / 100 * W + Math.sin(t * 0.85 + i * 1.7) * u * 0.05) + 'px';
      lf.style.top = (life * H * 1.06 - H * 0.06) + 'px';
      lf.style.opacity = (0.12 + dawn * 0.30).toFixed(2);
      lf.style.transform = 'rotate(' + (t * 38 + i * 60) + 'deg)';
    });

    // --- 上下の帯（シネスコっぽく）。縦画面では細く、よこ長では太く
    var barH = (portrait ? 0.045 : 0.055) * H;
    el.barTop.style.height = barH + 'px';
    el.barBottom.style.height = barH + 'px';

    // --- セリフ
    var c = CUTS[cut];
    el.cap.textContent = c.text || '';
    var capIn = rise(t, c.t + 0.25, 0.75);
    var capOut = 1 - clamp((since(t, c.t) - (c.dur - 0.45)) / 0.4, 0, 1);
    el.cap.style.fontSize = (portrait ? u * 0.055 : u * 0.046) + 'px';
    el.cap.style.bottom = (barH + u * (portrait ? 0.075 : 0.06)) + 'px';
    el.cap.style.top = 'auto';
    el.cap.style.opacity = c.text ? (capIn * capOut).toFixed(3) : 0;
    el.cap.style.transform = 'translateY(' + ((1 - capIn) * u * 0.026) + 'px)';

    // --- タイトルと副題
    var tIn = rise(t, T_TITLE, 1.2);
    // 0.30だと空のもやもや雲に重なった。雲より下、地面より上に置く
    var titleTop = portrait ? H * 0.315 : H * 0.24;
    el.title.style.fontSize = (portrait ? u * 0.122 : u * 0.098) + 'px';
    el.title.style.top = titleTop + 'px';
    el.title.style.opacity = tIn;
    el.title.style.transform = 'scale(' + (0.88 + tIn * 0.12) + ')';
    el.title.style.letterSpacing = (0.26 - tIn * 0.20).toFixed(3) + 'em';

    var sIn = rise(t, T_SUB, 0.95);
    el.sub.style.fontSize = (portrait ? u * 0.053 : u * 0.040) + 'px';
    el.sub.style.top = (titleTop + u * (portrait ? 0.175 : 0.135)) + 'px';
    el.sub.style.opacity = sIn;
    el.sub.style.transform = 'translateY(' + ((1 - sIn) * u * 0.02) + 'px)';

    // --- 周辺光量。カットが切り替わった直後だけ、わずかに暗くして「切れ目」を感じさせる
    var cutFlash = clamp(1 - since(t, c.t) / 0.18, 0, 1) * 0.35;
    var fadeIn = 1 - clamp(t / 0.45, 0, 1);                      // 冒頭のフェードイン（0.8秒は長すぎて壊れて見えた）
    var fadeOut = clamp((t - (DURATION - 1.1)) / 1.1, 0, 1);     // 最後の暗転
    var dark = Math.max(cutFlash, fadeIn, fadeOut);
    el.vig.style.background = 'radial-gradient(ellipse at 50% 56%,rgba(0,0,0,' + (dark * 0.95).toFixed(3)
      + ') 44%,rgba(0,0,0,' + Math.min(0.98, 0.40 + dark * 0.58).toFixed(3) + ') 100%)';
  }

  // =========================================================== 再生
  var raf = null, startedAt = 0, onEndCb = null, skipEl = null;

  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (skipEl && skipEl.parentNode) skipEl.parentNode.removeChild(skipEl);
    skipEl = null;
  }
  function finish() {
    stop();
    var cb = onEndCb; onEndCb = null;
    if (cb) cb();
  }
  function play(container, opts) {
    opts = opts || {};
    if (!mounted) mount(container);
    onEndCb = opts.onEnd || null;
    if (opts.skippable !== false) {
      skipEl = document.createElement('button');
      skipEl.className = 'sop-skip';
      skipEl.textContent = 'スキップ ▶';
      skipEl.addEventListener('click', function (e) { e.stopPropagation(); finish(); });
      el.root.appendChild(skipEl);
    }
    startedAt = performance.now();
    var loop = function (now) {
      var t = (now - startedAt) / 1000;
      if (t >= DURATION) { render(DURATION); finish(); return; }
      render(t);
      raf = requestAnimationFrame(loop);
    };
    render(0);
    raf = requestAnimationFrame(loop);
  }

  window.SasatomoOP = {
    DURATION: DURATION,
    CUTS: CUTS,
    SCENES: CUTS,          // 試写室の互換用
    mount: mount,
    render: render,
    play: play,
    stop: stop
  };
})();
