/* 笹友キャラバン — クリアムービー
 *
 * 上映位置: 80町すべてクリアした瞬間（game.html の finalMessageShown が true になるところ）
 * 台本の正本: クリアムービー台本.md
 *
 * 【OPとの作り分け】
 *   OPは「横スクロールの世界をカメラで切り取る」構造だった。
 *   クリアは完全に別の画にしたいので、**カットごとに独立した舞台**を持つ構造にした。
 *   ①空 ②地図 ③④集合 ⑤花 ⑥見送り ⑦タイトル … それぞれ座標系を共有しない。
 *   共通なのは render(t) 方式だけ（t秒の絵を毎回計算する＝動画に撮れる・撮り直せる）。
 *
 * 【この映像の軸】
 *   80町目の名前が「はじまりのばしょ」（特産品＝はじまりの笹）。
 *   いちばん遠くまで歩いて、たどりついたのが始まりの場所。
 *   ＝このゲームの「循環」がそのまま結末になっている。ここを結びに使う。
 *
 * 【絵について】
 *   新規の絵は2枚だけ（④みんなで手をふる／⑤笹の花）。ふゆとさんがGeminiで作る分。
 *   届くまでは仮置きで通しておく（映像が止まらないように）。
 *   仮置きの目印は PLACEHOLDER 定数。差し替え手順は台本.md の§2。
 */
(function () {
  'use strict';

  var A = 'assets/';
  var IMG = {
    wagon: A + 'scene/wagon_lv4.png',
    bush: A + 'scene/bush.png'
  };
  // ③④に出るなかま。ゲームで手に入る面々から、見た目がばらけるように選んだ
  var CROWD = ['taicho', 'nikoniko', 'mochimochi', 'takenoko', 'sasanoha', 'pikapika',
               'hanamaru', 'kirari', 'runrun', 'tekuteku', 'kotsubu', 'nagareboshi',
               'otsukisama', 'hatsuhinode', 'onpu', 'mikazuki'].map(function (n) {
    return A + 'chars/' + n + '.png';
  });

  // ★新規絵が入るところ。ファイルを置いたら true にするだけで切り替わる
  var PLACEHOLDER = {
    wave: { src: A + 'scene/clear_wave.png', ready: false },   // ④みんなで手をふる
    flower: { src: A + 'scene/clear_flower.png', ready: false } // ⑤笹の花
  };

  var CHAPTERS = [3, 6, 9, 12, 16, 20, 25, 30, 36, 42, 50, 58, 66, 74, 80]; // 章の終わりの町番号
  var TOWN_COUNT = 80;
  var LAST_TOWN = 'はじまりのばしょ';

  // =========================================================== 台本
  var CUTS = [
    { t: 0.0,  dur: 5.5, stage: 'sky',    text: 'すこし長い旅でした。' },
    { t: 5.5,  dur: 7.5, stage: 'map',    text: '80の町に、\n元気が灯りました。' },
    { t: 13.0, dur: 6.0, stage: 'crowd',  text: 'いっしょに歩いた\nなかまたちです。' },
    { t: 19.0, dur: 6.5, stage: 'wave',   text: 'いちばん遠くまで来たのは、\n隊長さんです。' },
    { t: 25.5, dur: 6.5, stage: 'flower', text: '笹の花は、めったに咲きません。\nでも、きょうは咲きました。' },
    { t: 32.0, dur: 6.0, stage: 'sunrise',text: 'いちばん遠くまで歩いて、\nたどりついたのは\n「' + LAST_TOWN + '」でした。' },
    { t: 38.0, dur: 5.0, stage: 'title',  text: '' }
  ];
  var DURATION = 43.0;
  var T_TITLE = 38.8;
  var T_SUB = 41.0;

  // =========================================================== 小道具
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function easeOut(x) { return 1 - Math.pow(1 - clamp(x, 0, 1), 3); }
  function easeInOut(x) { x = clamp(x, 0, 1); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function easeOutBack(x) { x = clamp(x, 0, 1); var c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function since(t, at) { return t - at; }
  function rise(t, at, dur) { return easeOut(since(t, at) / (dur || 0.7)); }
  function wrap(v, m) { return ((v % m) + m) % m; }
  // 乱数は使わない（毎回同じ絵にならないと動画を撮り直せない）
  function hash(i) { var x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }

  var el = {}, mounted = false;

  function css() {
    return [
      '.scl{position:absolute;inset:0;overflow:hidden;background:#05070d;',
      '  font-family:"Yu Gothic UI","Hiragino Kaku Gothic ProN","Meiryo",sans-serif;',
      '  word-break:keep-all;overflow-wrap:anywhere;}',
      '.scl *{box-sizing:border-box;}',
      '.scl img{image-rendering:pixelated;display:block;position:absolute;}',
      '.scl-stage{position:absolute;inset:0;opacity:0;}',
      '.scl-sky{position:absolute;inset:0;}',
      '.scl-star{position:absolute;border-radius:50%;background:#fff;}',
      '.scl-dot{position:absolute;border-radius:50%;}',
      '.scl-line{position:absolute;transform-origin:0 50%;height:2px;}',
      '.scl-petal{position:absolute;background:#fff;border-radius:50% 50% 50% 0;}',
      '.scl-sun{position:absolute;border-radius:50%;}',
      '.scl-leaf{position:absolute;border-radius:50% 0 50% 0;background:#7ad68f;}',
      '.scl-glow{position:absolute;border-radius:50%;pointer-events:none;}',
      '.scl-vig{position:absolute;inset:0;pointer-events:none;z-index:30;}',
      '.scl-bar{position:absolute;left:0;right:0;background:#000;z-index:29;}',
      '.scl-cap{position:absolute;left:7%;right:7%;text-align:center;color:#fff;',
      '  font-weight:800;line-height:1.6;white-space:pre-line;z-index:31;',
      '  text-shadow:0 .1em .5em rgba(0,0,0,.92),0 0 .12em rgba(0,0,0,.75);}',
      '.scl-title{position:absolute;left:0;right:0;text-align:center;color:#fff;',
      '  font-weight:900;z-index:31;text-shadow:0 .09em .5em rgba(0,0,0,.9),0 0 .7em rgba(255,226,150,.6);}',
      '.scl-sub{position:absolute;left:0;right:0;text-align:center;color:#ffeec2;font-weight:700;z-index:31;',
      '  text-shadow:0 .1em .45em rgba(0,0,0,.9);}',
      '.scl-skip{position:absolute;right:3%;top:3%;z-index:40;padding:.6em 1.1em;border-radius:999px;',
      '  border:2px solid rgba(255,255,255,.5);background:rgba(0,0,0,.45);color:#fff;',
      '  font-weight:700;font-size:14px;cursor:pointer;pointer-events:auto;}'
    ].join('');
  }

  function div(cls, parent) {
    var d = document.createElement('div');
    if (cls) d.className = cls;
    (parent || el.root).appendChild(d);
    return d;
  }
  function img(src, parent) {
    var i = document.createElement('img');
    i.src = src;
    (parent || el.root).appendChild(i);
    return i;
  }

  function mount(container) {
    var st = document.createElement('style');
    st.textContent = css();
    container.appendChild(st);
    var root = document.createElement('div');
    root.className = 'scl';
    container.appendChild(root);
    el.root = root;

    // ---- 舞台ごとにまとめて作る。表示は render() が切り替える
    el.stages = {};
    ['sky', 'map', 'crowd', 'wave', 'flower', 'sunrise', 'title'].forEach(function (k) {
      el.stages[k] = div('scl-stage', root);
    });

    // ① 空：グラデーション＋星
    el.sky = div('scl-sky', el.stages.sky);
    el.stars = [];
    for (var i = 0; i < 70; i++) el.stars.push(div('scl-star', el.stages.sky));

    // ② 地図：80の点と、点をつなぐ線
    el.mapSky = div('scl-sky', el.stages.map);
    el.dots = [];
    el.lines = [];
    for (var d = 0; d < TOWN_COUNT; d++) {
      el.lines.push(div('scl-line', el.stages.map));
      el.dots.push(div('scl-dot', el.stages.map));
    }
    el.mapGlow = div('scl-glow', el.stages.map);

    // ③ なかま集合
    el.crowdSky = div('scl-sky', el.stages.crowd);
    el.crowd = CROWD.map(function (s) { return img(s, el.stages.crowd); });

    // ④ 手をふる（新規絵が来たらここに入る。来るまでは crowd を正面に並べて代用）
    el.waveSky = div('scl-sky', el.stages.wave);
    el.waveImg = img(PLACEHOLDER.wave.src, el.stages.wave);
    el.waveImg.style.display = 'none';
    el.waveImg.addEventListener('load', function () { PLACEHOLDER.wave.ready = true; });
    el.waveImg.addEventListener('error', function () { PLACEHOLDER.wave.ready = false; });
    el.waveCrowd = CROWD.slice(0, 5).map(function (s) { return img(s, el.stages.wave); });

    // ⑤ 笹の花（新規絵が来たらここに。来るまでは図形で咲かせる）
    el.flowerSky = div('scl-sky', el.stages.flower);
    el.flowerImg = img(PLACEHOLDER.flower.src, el.stages.flower);
    el.flowerImg.style.display = 'none';
    el.flowerImg.addEventListener('load', function () { PLACEHOLDER.flower.ready = true; });
    el.flowerImg.addEventListener('error', function () { PLACEHOLDER.flower.ready = false; });
    el.blooms = [];
    for (var b = 0; b < 5; b++) {
      var g = div('', el.stages.flower);
      g.style.position = 'absolute';
      var petals = [];
      for (var p = 0; p < 6; p++) petals.push(div('scl-petal', g));
      var core = div('scl-dot', g);
      core.style.background = '#ffe9a8';
      el.blooms.push({ g: g, petals: petals, core: core });
    }
    el.stems = [];
    for (var s2 = 0; s2 < 5; s2++) {   // 花と同じ本数（前は4本で、5輪目の花に茎が無かった）
      var stem = div('', el.stages.flower);
      stem.style.position = 'absolute';
      stem.style.background = '#4e8f5c';
      stem.style.transformOrigin = '50% 100%';
      el.stems.push(stem);
    }

    // ⑥ 朝日と見送り
    el.sunSky = div('scl-sky', el.stages.sunrise);
    el.sun = div('scl-sun', el.stages.sunrise);
    el.sunWagon = img(IMG.wagon, el.stages.sunrise);
    el.sunCrowd = CROWD.slice(0, 6).map(function (s) { return img(s, el.stages.sunrise); });
    el.ground = div('', el.stages.sunrise);
    el.ground.style.position = 'absolute';

    // ⑦ タイトル。文字だけだと寂しかったので、下にみんなのシルエットを並べて見送りの画にする
    el.titleSky = div('scl-sky', el.stages.title);
    el.titleGlow = div('scl-glow', el.stages.title);
    el.titleCrowd = CROWD.slice(0, 9).map(function (s) { return img(s, el.stages.title); });
    el.titleWagon = img(IMG.wagon, el.stages.title);

    // 全体にかかるもの
    el.leaves = [];
    for (var k2 = 0; k2 < 20; k2++) el.leaves.push(div('scl-leaf', root));
    el.barTop = div('scl-bar', root); el.barTop.style.top = '0';
    el.barBottom = div('scl-bar', root); el.barBottom.style.bottom = '0';
    el.vig = div('scl-vig', root);
    el.cap = div('scl-cap', root);
    el.title = div('scl-title', root);
    el.title.textContent = 'せかいを ひとまわり';
    el.sub = div('scl-sub', root);
    el.sub.textContent = 'ありがとう、隊長さん。　つづく。';

    mounted = true;
    return root;
  }

  // =========================================================== 描画
  function activeCut(t) {
    var i = 0;
    for (var k = 0; k < CUTS.length; k++) if (t >= CUTS[k].t) i = k;
    return i;
  }

  function render(t) {
    if (!mounted) return;
    var W = el.root.clientWidth || 1080;
    var H = el.root.clientHeight || 1920;
    var portrait = H >= W;
    var u = Math.min(W, H);
    var ci = activeCut(t);
    var C = CUTS[ci];
    var k = clamp(since(t, C.t) / C.dur, 0, 1);   // このカットの進み具合 0→1

    // 舞台の出し入れ（切り替わりの0.3秒だけクロスさせる）
    Object.keys(el.stages).forEach(function (name) {
      var on = (name === C.stage);
      var o = on ? clamp(since(t, C.t) / 0.3, 0, 1) : 0;
      el.stages[name].style.opacity = o;
      el.stages[name].style.pointerEvents = 'none';
    });

    // ---------------------------------------------------------------- ① 夜明け前の空
    (function () {
      var dawn = easeInOut(k);      // カット内で少しだけ白んでくる
      el.sky.style.background = 'linear-gradient(180deg,'
        + 'rgb(' + Math.round(6 + dawn * 14) + ',' + Math.round(9 + dawn * 18) + ',' + Math.round(26 + dawn * 24) + ') 0%,'
        + 'rgb(' + Math.round(14 + dawn * 46) + ',' + Math.round(18 + dawn * 44) + ',' + Math.round(38 + dawn * 40) + ') 62%,'
        + 'rgb(' + Math.round(38 + dawn * 120) + ',' + Math.round(34 + dawn * 96) + ',' + Math.round(46 + dawn * 62) + ') 100%)';
      el.stars.forEach(function (s, i) {
        var sz = (0.0022 + hash(i) * 0.0035) * u;
        s.style.width = s.style.height = sz + 'px';
        s.style.left = (hash(i * 3.1) * W) + 'px';
        s.style.top = (hash(i * 7.7) * H * 0.72) + 'px';
        // 空が白むほど、下の星から順に消えていく
        var deathAt = 0.25 + hash(i * 2.3) * 0.7;
        var alive = 1 - clamp((k - deathAt) / 0.22, 0, 1);
        var tw = 0.55 + Math.sin(t * 2.2 + i) * 0.35;
        s.style.opacity = (alive * tw).toFixed(3);
      });
    })();

    // ---------------------------------------------------------------- ② 地図に80の光が灯る
    (function () {
      var lit = k * TOWN_COUNT * 1.06;              // いま何番目まで灯ったか
      var bright = clamp(lit / TOWN_COUNT, 0, 1);
      el.mapSky.style.background = 'radial-gradient(ellipse at 50% 58%,'
        + 'rgba(' + Math.round(26 + bright * 60) + ',' + Math.round(34 + bright * 72) + ',' + Math.round(50 + bright * 40) + ',1) 0%,'
        + 'rgb(6,9,18) 78%)';
      // 旅路は蛇行させる。上から下へ、左右に振れながら進む＝絵巻マップの感じ
      var prev = null;
      for (var i = 0; i < TOWN_COUNT; i++) {
        var row = i / (TOWN_COUNT - 1);
        var x = (0.5 + Math.sin(row * Math.PI * 3.2) * 0.34 + (hash(i) - 0.5) * 0.05) * W;
        var y = (0.10 + row * 0.76) * H;
        var isChapter = CHAPTERS.indexOf(i + 1) >= 0;
        var on = clamp(lit - i, 0, 1);
        var d = el.dots[i];
        var sz = (isChapter ? 0.017 : 0.0092) * u * (0.6 + on * 0.4 + Math.sin(easeOut(on) * Math.PI) * 0.5);
        d.style.width = d.style.height = sz + 'px';
        d.style.left = (x - sz / 2) + 'px';
        d.style.top = (y - sz / 2) + 'px';
        d.style.background = isChapter ? '#ffe9a8' : '#9be8b0';
        d.style.opacity = (on * 0.95).toFixed(3);
        d.style.boxShadow = on > 0.05
          ? '0 0 ' + (sz * (isChapter ? 2.4 : 1.5)) + 'px rgba(' + (isChapter ? '255,226,150' : '155,232,176') + ',' + (on * 0.85).toFixed(2) + ')'
          : 'none';
        // 前の町とつなぐ線＝歩いた道
        var ln = el.lines[i];
        if (prev) {
          var dx = x - prev.x, dy = y - prev.y;
          var len = Math.sqrt(dx * dx + dy * dy);
          ln.style.width = (len * clamp(lit - i + 0.5, 0, 1)) + 'px';
          ln.style.height = Math.max(1, u * 0.0022) + 'px';
          ln.style.left = prev.x + 'px';
          ln.style.top = prev.y + 'px';
          ln.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad)';
          ln.style.background = 'linear-gradient(90deg,rgba(155,232,176,.75),rgba(255,226,150,.5))';
          ln.style.opacity = clamp(lit - i + 0.5, 0, 1).toFixed(3);
        } else {
          ln.style.width = '0px';
        }
        prev = { x: x, y: y };
      }
      // 最後の町（はじまりのばしょ）が灯ったら大きく光る
      var lastOn = clamp(lit - (TOWN_COUNT - 1), 0, 1);
      var gs = u * (0.2 + easeOut(lastOn) * 1.5);
      el.mapGlow.style.width = el.mapGlow.style.height = gs + 'px';
      el.mapGlow.style.left = (prev.x - gs / 2) + 'px';
      el.mapGlow.style.top = (prev.y - gs / 2) + 'px';
      el.mapGlow.style.background = 'radial-gradient(circle,rgba(255,236,180,' + (lastOn * 0.5).toFixed(3)
        + ') 0%,rgba(255,236,180,0) 70%)';
    })();

    // ---------------------------------------------------------------- ③ なかまが集まる
    (function () {
      el.crowdSky.style.background = 'linear-gradient(180deg,#2a2f3f 0%,#4a4536 58%,#7d6a45 100%)';
      // 1列に16体そろえたら中央で顔が重なって団子になった。奥6体・手前10体の2列に分ける。
      var BACK = 6;
      var hzBack = H * 0.665, hzFront = H * 0.815;
      el.crowd.forEach(function (im, i) {
        var back = i < BACK;
        var n = back ? BACK : el.crowd.length - BACK;
        var idx = back ? i : i - BACK;
        var appear = clamp(since(t, CUTS[2].t + 0.2 + i * 0.13) / 0.7, 0, 1);
        var e = easeOut(appear);
        var depth = back ? 0.62 : 1.0;                     // 1=手前
        var hgt = (portrait ? 0.145 : 0.26) * H * depth;
        // 列の中で均等に散らす。端まで使って「ずらっと並んだ」画にする
        var targetX = 0.10 + (idx + 0.5) / n * 0.80 + (hash(i) - 0.5) * 0.02;
        var fromX = targetX < 0.5 ? -0.18 : 1.18;          // 近い側の画面外から入ってくる
        var x = lerp(fromX, targetX, e) * W;
        var hop = Math.abs(Math.sin(t * 5.4 + i * 1.2)) * u * 0.008 * appear;
        im.style.height = hgt + 'px';
        im.style.left = (x - hgt * 0.36) + 'px';
        im.style.top = ((back ? hzBack : hzFront) - hgt - hop) + 'px';
        im.style.opacity = appear;
        im.style.zIndex = back ? 5 : 12;
        im.style.filter = 'brightness(' + (0.62 + depth * 0.42).toFixed(2) + ')';
        im.style.transform = 'rotate(' + (Math.sin(t * 4.6 + i) * 1.6).toFixed(2) + 'deg)';
      });
    })();

    // ---------------------------------------------------------------- ④ みんなで手をふる
    (function () {
      el.waveSky.style.background = 'linear-gradient(180deg,#3a3a48 0%,#6b5a3e 55%,#a9884f 100%)';
      var zoom = 1 + easeInOut(k) * 0.16;   // ゆっくり寄る
      if (PLACEHOLDER.wave.ready) {
        // ★新規絵が入っているとき
        el.waveImg.style.display = 'block';
        el.waveCrowd.forEach(function (im) { im.style.opacity = 0; });
        // 横長の絵を縦画面にそのまま収めると小さくなりすぎた。
        // 「全員が入る引き」→「顔が見える寄り」へゆっくりズームする。
        var iw = el.waveImg.naturalWidth || 4, ih = el.waveImg.naturalHeight || 3;
        var zk = easeInOut(k);
        var wd = W * lerp(1.02, 1.62, zk);
        var ht = wd * ih / iw;
        el.waveImg.style.width = wd + 'px';
        el.waveImg.style.height = 'auto';
        el.waveImg.style.left = ((W - wd) / 2) + 'px';
        el.waveImg.style.top = (H * lerp(0.50, 0.44, zk) - ht / 2) + 'px';
        el.waveImg.style.opacity = clamp(k / 0.12, 0, 1);
      } else {
        // 仮置き：既存の立ち絵を正面に並べて、体を左右に振らせる
        el.waveImg.style.display = 'none';
        // 画面の上が空きすぎたので、立ち位置を中央まで上げて大きく見せる
        var base = H * 0.72;
        el.waveCrowd.forEach(function (im, i) {
          var hgt = (portrait ? 0.215 : 0.34) * H * zoom * (i === 2 ? 1.1 : 1);
          var x = (0.5 + (i - 2) * 0.20) * W;
          var swing = Math.sin(t * 3.6 + i * 0.9) * 5.5;    // 手をふる代わりに体を振る
          var hop = Math.abs(Math.sin(t * 3.6 + i * 0.9)) * u * 0.012;
          im.style.height = hgt + 'px';
          im.style.left = (x - hgt * 0.36) + 'px';
          im.style.top = (base - hgt - hop) + 'px';
          im.style.opacity = clamp(since(t, CUTS[3].t + i * 0.08) / 0.5, 0, 1);
          im.style.transform = 'rotate(' + swing.toFixed(2) + 'deg)';
          im.style.filter = 'brightness(1.02)';
          im.style.zIndex = (i === 2 ? 12 : 10);
        });
        // 足もとが宙に浮いて見えたので、地面のあかりを敷く
        el.waveSky.style.background = 'linear-gradient(180deg,#3a3a48 0%,#6b5a3e 52%,#a9884f 72%,#8a6c3c 100%)';
      }
    })();

    // ---------------------------------------------------------------- ⑤ 笹の花が咲く
    (function () {
      el.flowerSky.style.background = 'radial-gradient(ellipse at 50% 55%,#2f4636 0%,#131a20 76%)';
      var bloom = easeOut(clamp((k - 0.12) / 0.5, 0, 1));
      if (PLACEHOLDER.flower.ready) {
        el.flowerImg.style.display = 'block';
        el.blooms.forEach(function (b) { b.g.style.opacity = 0; });
        el.stems.forEach(function (s) { s.style.opacity = 0; });
        // 0.34では画面の真ん中に小さく浮くだけだった。花をしっかり見せる大きさにする
        var iw = el.flowerImg.naturalWidth || 3, ih = el.flowerImg.naturalHeight || 4;
        var ht = H * (0.56 + bloom * 0.10), wd = ht * iw / ih;
        if (wd > W * 0.92) { wd = W * 0.92; ht = wd * ih / iw; }
        el.flowerImg.style.width = wd + 'px';
        el.flowerImg.style.height = 'auto';
        el.flowerImg.style.left = ((W - wd) / 2) + 'px';
        el.flowerImg.style.top = (H * 0.47 - ht / 2) + 'px';
        el.flowerImg.style.opacity = clamp(k / 0.14, 0, 1);
        // 花のうしろにほのかな光を置いて、暗い背景に沈まないようにする
        el.flowerSky.style.background = 'radial-gradient(ellipse at 50% 46%,'
          + 'rgba(86,116,88,' + (0.55 + bloom * 0.35).toFixed(2) + ') 0%,#16201c 74%)';
      } else {
        // 仮置き：花を図形で咲かせる（絵ではなく形なので、絵柄を壊さない）
        el.flowerImg.style.display = 'none';
        // 茎は「地面から上へ伸びる」。前は top を固定して下へ伸ばしていたので
        // 花が茎の先から外れて宙に浮いていた。下端を地面に固定して上へ伸ばす。
        var soil = H * 0.80;
        var stemH = [], stemX = [];
        for (var si = 0; si < 5; si++) {
          stemH.push(H * (0.17 + (si % 3) * 0.035 + (si === 2 ? 0.03 : 0)));
          stemX.push((0.24 + si * 0.13) * W);
        }
        el.stems.forEach(function (s, i) {
          s.style.width = Math.max(2, u * 0.0045) + 'px';
          s.style.height = stemH[i] + 'px';
          s.style.left = stemX[i] + 'px';
          s.style.top = (soil - stemH[i]) + 'px';
          s.style.opacity = 0.85;
          s.style.transform = 'rotate(' + (Math.sin(t * 0.8 + i) * 2.2 - 2 + i * 1.4) + 'deg)';
        });
        el.blooms.forEach(function (b, i) {
          var open = easeOutBack(clamp((k - 0.14 - i * 0.07) / 0.42, 0, 1));
          var cx = stemX[i] + Math.max(1, u * 0.0022);      // 茎の真上
          var cy = soil - stemH[i];                          // 茎の先端
          var r = u * 0.030 * open;
          b.g.style.opacity = clamp(open * 1.4, 0, 1);
          b.g.style.left = cx + 'px';
          b.g.style.top = cy + 'px';
          b.g.style.width = b.g.style.height = '0px';
          b.petals.forEach(function (p, j) {
            var ang = (j / b.petals.length) * Math.PI * 2 + t * 0.12;
            var pr = r * 0.95;
            var psz = r * 0.82;
            p.style.width = psz + 'px'; p.style.height = (psz * 1.25) + 'px';
            p.style.left = (Math.cos(ang) * pr - psz / 2) + 'px';
            p.style.top = (Math.sin(ang) * pr - psz * 0.62) + 'px';
            p.style.transform = 'rotate(' + (ang + Math.PI / 2) + 'rad)';
            p.style.opacity = 0.94;
            p.style.boxShadow = '0 0 ' + (psz * 0.9) + 'px rgba(255,255,255,.5)';
          });
          var cs = r * 0.5;
          b.core.style.width = b.core.style.height = cs + 'px';
          b.core.style.left = (-cs / 2) + 'px';
          b.core.style.top = (-cs / 2) + 'px';
          b.core.style.boxShadow = '0 0 ' + (cs * 2.2) + 'px rgba(255,233,168,.9)';
        });
      }
    })();

    // ---------------------------------------------------------------- ⑥ 朝日、そして見送り
    (function () {
      var up = easeInOut(k);
      // 空全体を明るくしたら太陽が溶けて見えなくなった。
      // 夜明けは「上が暗くて、地平線だけ明るい」。上を暗く残して、太陽を浮かせる。
      el.sunSky.style.background = 'linear-gradient(180deg,'
        + 'rgb(' + Math.round(22 + up * 34) + ',' + Math.round(30 + up * 44) + ',' + Math.round(58 + up * 52) + ') 0%,'
        + 'rgb(' + Math.round(72 + up * 66) + ',' + Math.round(62 + up * 60) + ',' + Math.round(84 + up * 40) + ') 42%,'
        + 'rgb(' + Math.round(178 + up * 56) + ',' + Math.round(132 + up * 74) + ',' + Math.round(92 + up * 48) + ') 74%,'
        + 'rgb(' + Math.round(214 + up * 34) + ',' + Math.round(168 + up * 62) + ',' + Math.round(108 + up * 56) + ') 100%)';
      var hz = H * 0.80;
      // 前は太陽が小さく薄くて「朝日」に見えなかった。大きくして、芯を強く出す
      var ss = u * (0.50 + up * 0.20);
      el.sun.style.width = el.sun.style.height = ss + 'px';
      el.sun.style.left = (W * 0.68 - ss / 2) + 'px';
      el.sun.style.top = (hz - ss * (0.56 + up * 0.26)) + 'px';   // 中心を地平線より上に（下だと地面に隠れる）
      el.sun.style.background = 'radial-gradient(circle,'
        + 'rgba(255,252,236,1) 0%,rgba(255,244,196,.98) 16%,rgba(255,214,132,.72) 34%,'
        + 'rgba(255,196,110,.30) 52%,rgba(255,186,104,0) 72%)';
      el.ground.style.left = '0'; el.ground.style.width = W + 'px';
      el.ground.style.top = hz + 'px'; el.ground.style.height = (H - hz) + 'px';
      el.ground.style.background = 'linear-gradient(180deg,#6f5a3a 0%,#3d3122 100%)';
      // 幌馬車は光の方（右）へ、ゆっくり離れていく＝後ろ姿の見送り
      var wh = (portrait ? 0.235 : 0.30) * H * (1 - up * 0.14);
      el.sunWagon.style.height = wh + 'px';
      el.sunWagon.style.left = ((0.26 + up * 0.22) * W) + 'px';
      el.sunWagon.style.top = (hz - wh + Math.sin(t * 4.2) * u * 0.004) + 'px';
      el.sunWagon.style.opacity = clamp(k / 0.14, 0, 1);
      el.sunWagon.style.filter = 'brightness(' + (0.72 + up * 0.2).toFixed(2) + ')';
      el.sunCrowd.forEach(function (im, i) {
        var hgt = (portrait ? 0.145 : 0.19) * H * (1 - up * 0.14);
        var x = (0.10 + up * 0.20 + i * 0.058) * W;
        var hop = Math.abs(Math.sin(t * 5.2 + i * 1.1)) * u * 0.007;
        im.style.height = hgt + 'px';
        im.style.left = (x - hgt * 0.36) + 'px';
        im.style.top = (hz - hgt - hop) + 'px';
        im.style.opacity = clamp(since(t, CUTS[5].t + 0.2 + i * 0.1) / 0.6, 0, 1);
        im.style.filter = 'brightness(' + (0.66 + up * 0.2).toFixed(2) + ')';
      });
    })();

    // ---------------------------------------------------------------- ⑦ タイトル
    (function () {
      el.titleSky.style.background = 'linear-gradient(180deg,#2a2f48 0%,#5a4a52 40%,#a9764a 76%,#c9903f 100%)';
      var g = u * 1.7;
      el.titleGlow.style.width = el.titleGlow.style.height = g + 'px';
      el.titleGlow.style.left = (W / 2 - g / 2) + 'px';
      el.titleGlow.style.top = (H * 0.42 - g / 2) + 'px';
      el.titleGlow.style.background = 'radial-gradient(circle,rgba(255,232,170,.24) 0%,rgba(255,232,170,0) 62%)';
      // 下にみんなの後ろ姿を並べる（暗く落として、文字の邪魔をしないシルエットにする）
      var thz = H * 0.925;
      var tk = clamp(since(t, CUTS[6].t) / 1.4, 0, 1);
      var twh = (portrait ? 0.17 : 0.22) * H;
      el.titleWagon.style.height = twh + 'px';
      el.titleWagon.style.left = (W * 0.60) + 'px';
      el.titleWagon.style.top = (thz - twh) + 'px';
      el.titleWagon.style.opacity = (tk * 0.85).toFixed(2);
      el.titleWagon.style.filter = 'brightness(.24) saturate(.4)';
      el.titleCrowd.forEach(function (im, i) {
        var hgt = (portrait ? 0.108 : 0.14) * H * (0.9 + hash(i) * 0.2);
        im.style.height = hgt + 'px';
        im.style.left = ((0.03 + i * 0.066) * W) + 'px';
        im.style.top = (thz - hgt - Math.abs(Math.sin(t * 2.2 + i)) * u * 0.004) + 'px';
        im.style.opacity = (clamp(since(t, CUTS[6].t + i * 0.05) / 0.9, 0, 1) * 0.9).toFixed(2);
        im.style.filter = 'brightness(.20) saturate(.35)';
      });
    })();

    // ---------------------------------------------------------------- 共通
    // 笹の葉はずっと舞っている（この世界の空気）
    el.leaves.forEach(function (lf, i) {
      var life = wrap(t * 0.1 + hash(i), 1);
      var sz = (0.006 + hash(i * 5) * 0.004) * u;
      lf.style.width = sz + 'px'; lf.style.height = (sz * 1.7) + 'px';
      lf.style.left = (hash(i * 9.1) * W + Math.sin(t * 0.7 + i) * u * 0.05) + 'px';
      lf.style.top = (life * H * 1.06 - H * 0.06) + 'px';
      lf.style.opacity = (C.stage === 'sky' || C.stage === 'map') ? 0.10 : 0.26;
      lf.style.transform = 'rotate(' + (t * 34 + i * 47) + 'deg)';
      lf.style.zIndex = 28;
    });

    var barH = (portrait ? 0.045 : 0.055) * H;
    el.barTop.style.height = barH + 'px';
    el.barBottom.style.height = barH + 'px';

    // セリフ
    el.cap.textContent = C.text || '';
    var capIn = rise(t, C.t + 0.35, 0.8);
    var capOut = 1 - clamp((since(t, C.t) - (C.dur - 0.5)) / 0.45, 0, 1);
    el.cap.style.fontSize = (portrait ? u * 0.052 : u * 0.044) + 'px';
    el.cap.style.bottom = (barH + u * (portrait ? 0.075 : 0.06)) + 'px';
    el.cap.style.opacity = C.text ? (capIn * capOut).toFixed(3) : 0;
    el.cap.style.transform = 'translateY(' + ((1 - capIn) * u * 0.024) + 'px)';

    // タイトルと副題
    var tIn = rise(t, T_TITLE, 1.3);
    var titleTop = portrait ? H * 0.40 : H * 0.34;
    el.title.style.fontSize = (portrait ? u * 0.104 : u * 0.086) + 'px';
    el.title.style.top = titleTop + 'px';
    el.title.style.opacity = tIn;
    el.title.style.letterSpacing = (0.30 - tIn * 0.22).toFixed(3) + 'em';
    el.title.style.transform = 'scale(' + (0.9 + tIn * 0.1) + ')';
    var sIn = rise(t, T_SUB, 1.0);
    el.sub.style.fontSize = (portrait ? u * 0.042 : u * 0.034) + 'px';
    el.sub.style.top = (titleTop + u * (portrait ? 0.16 : 0.13)) + 'px';
    el.sub.style.opacity = sIn;

    // 冒頭のフェードイン・カットの切れ目・最後の暗転
    var cutFlash = clamp(1 - since(t, C.t) / 0.2, 0, 1) * 0.3;
    var fadeIn = 1 - clamp(t / 0.6, 0, 1);
    var fadeOut = clamp((t - (DURATION - 1.4)) / 1.4, 0, 1);
    var dark = Math.max(cutFlash, fadeIn, fadeOut);
    el.vig.style.background = 'radial-gradient(ellipse at 50% 54%,rgba(0,0,0,' + (dark * 0.95).toFixed(3)
      + ') 44%,rgba(0,0,0,' + Math.min(0.98, 0.34 + dark * 0.62).toFixed(3) + ') 100%)';
  }

  // =========================================================== 再生
  var raf = null, startedAt = 0, onEndCb = null, skipEl = null;

  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (skipEl && skipEl.parentNode) skipEl.parentNode.removeChild(skipEl);
    skipEl = null;
  }
  function finish() { stop(); var cb = onEndCb; onEndCb = null; if (cb) cb(); }

  function play(container, opts) {
    opts = opts || {};
    if (!mounted) mount(container);
    onEndCb = opts.onEnd || null;
    if (opts.skippable !== false) {
      skipEl = document.createElement('button');
      skipEl.className = 'scl-skip';
      skipEl.textContent = 'スキップ ▶';
      skipEl.addEventListener('click', function (e) { e.stopPropagation(); finish(); });
      el.root.appendChild(skipEl);
    }
    startedAt = performance.now();
    var loop = function (now) {
      var tt = (now - startedAt) / 1000;
      if (tt >= DURATION) { render(DURATION); finish(); return; }
      render(tt);
      raf = requestAnimationFrame(loop);
    };
    render(0);
    raf = requestAnimationFrame(loop);
  }

  function currentTime() { return raf ? (performance.now() - startedAt) / 1000 : 0; }

  window.SasatomoClear = {
    DURATION: DURATION,
    CUTS: CUTS,
    PLACEHOLDER: PLACEHOLDER,
    mount: mount,
    render: render,
    play: play,
    stop: stop,
    currentTime: currentTime
  };
})();
