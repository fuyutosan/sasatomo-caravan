/* ============================================================
 * 笹友キャラバン — はじめての人の案内（チュートリアル）
 * 設計の正本: チュートリアル設計.md
 *
 * なぜ作ったか（2026-07-31）：
 *   「放置ゲームをしたことがないので、何をしたらいいか分からなかった」という感想から。
 *   ゲームに慣れた人は「画面を見る→仮説を立てる→触って確かめる」を自分で回せるが、
 *   その力は誰にでも備わっているわけではない。このゲームのお客さんは
 *   パンダさんや山﨑愛生ちゃんが好きな人であって、ゲーマーではない。
 *   だから「読ませて理解させる」のではなく、手を取って一緒に操作してもらう。
 *
 * 作りの方針：
 *   - 画面を暗くして、いま見てほしい部品だけを明るくする（スポットライト）
 *   - 大事なところは実際にボタンを押してもらう。押すまで次に進まない
 *   - 暗幕は pointer-events:none にして、操作を邪魔しない（閉じこめない）
 *   - 終了条件は「押されたか」ではなく「結果がそうなったか」で見る
 *     （おまかせ編成はシートが開くなど途中の段が増えるため、結果で判定するほうが確実）
 *
 * op.js / clear.js と同じく、game.html から読み込まれる別ファイル。
 * ============================================================ */
(function () {
  'use strict';

  var STYLE_ID = 'tutorial-style';
  var CSS = [
    '#tutorialRoot{position:fixed;inset:0;z-index:9000;pointer-events:none;font-family:inherit;}',
    '#tutorialRoot.on{display:block;}',
    /* スポットライト：まわりを暗くする巨大なbox-shadowで「穴」を作る */
    '#tutorialHole{position:fixed;border-radius:14px;box-shadow:0 0 0 9999px rgba(20,28,20,.66);',
    '  transition:top .3s ease,left .3s ease,width .3s ease,height .3s ease;pointer-events:none;}',
    '#tutorialHole.no-target{border-radius:0;}',
    '#tutorialRing{position:fixed;border-radius:16px;border:3px solid #ffd54a;pointer-events:none;',
    '  box-shadow:0 0 12px rgba(255,213,74,.9);animation:tutorialPulse 1.2s ease-in-out infinite;',
    '  transition:top .3s ease,left .3s ease,width .3s ease,height .3s ease;}',
    '@keyframes tutorialPulse{0%,100%{opacity:1;}50%{opacity:.35;}}',
    /* ふきだし */
    '#tutorialBubble{position:fixed;left:50%;transform:translateX(-50%);width:min(92vw,420px);',
    '  background:#fffdf5;border:3px solid #4a6b4f;border-radius:16px;padding:12px 14px 14px;',
    '  box-shadow:0 6px 0 rgba(74,107,79,.35),0 10px 24px rgba(0,0,0,.3);pointer-events:auto;',
    '  word-break:keep-all;overflow-wrap:anywhere;text-wrap:pretty;}',
    '#tutorialBubble .t-head{display:flex;align-items:center;gap:8px;margin-bottom:6px;}',
    '#tutorialBubble .t-head img{width:36px;height:auto;image-rendering:pixelated;}',
    '#tutorialBubble .t-who{font-size:12px;font-weight:bold;color:#4a6b4f;flex:1;}',
    '#tutorialBubble .t-step{font-size:11px;color:#8a9a8c;}',
    '#tutorialBubble .t-text{font-size:14px;line-height:1.75;color:#33422f;}',
    '#tutorialBubble .t-text b{color:#2f7d3a;}',
    '#tutorialBubble .t-hint{margin-top:8px;font-size:13px;font-weight:bold;color:#b06bff;',
    '  animation:tutorialPulse 1.2s ease-in-out infinite;}',
    '#tutorialBubble .t-btns{display:flex;gap:8px;align-items:center;margin-top:10px;}',
    '#tutorialBubble .t-next{flex:1;background:#7fbf7f;border:none;border-bottom:4px solid #4a6b4f;',
    '  color:#fff;font-weight:bold;font-size:15px;padding:10px;border-radius:10px;cursor:pointer;font-family:inherit;}',
    '#tutorialBubble .t-next:active{border-bottom-width:1px;transform:translateY(3px);}',
    '#tutorialBubble .t-skip{background:none;border:none;color:#8a9a8c;font-size:12px;',
    '  text-decoration:underline;cursor:pointer;font-family:inherit;padding:6px;}',
    '#tutorialBubble .nb{white-space:nowrap;}',
    /* さいごの「なまえとあいことば」 */
    '#tutorialBubble .t-form{margin-top:10px;}',
    '#tutorialBubble .t-form input{width:100%;box-sizing:border-box;margin-bottom:6px;padding:9px;',
    '  border:2px solid #cfd8c8;border-radius:8px;font-size:15px;font-family:inherit;}',
    '#tutorialBubble .t-msg{font-size:12px;margin-top:4px;min-height:1.2em;color:#4a6b4f;}',
    '#tutorialBubble .t-msg.error{color:#c0392b;}',
    '#tutorialBubble .t-msg.ok{color:#2f7d3a;}',
    /* ゲーム側のモーダル（ガチャの結果・編成シートなど）が開いているあいだは、案内は引っこむ。
       案内の暗幕(z9000)はモーダル(z200)より前にあるので、隠さないと「見てほしいものが暗いまま」になる */
    '#tutorialRoot.modal-open #tutorialHole,',
    '#tutorialRoot.modal-open #tutorialRing,',
    '#tutorialRoot.modal-open #tutorialBubble{opacity:0;pointer-events:none;transition:opacity .2s;}',
  ].join('\n');

  /* 絶対に割りたくない語（BudouXは統計モデルなので、ここだけは自分で守る） */
  function nb(s) { return '<span class="nb">' + s + '</span>'; }

  /* ふきだしの本文。<budoux-ja> が文節の切れ目にだけ折り返しを入れてくれる
     （budoux-ja.min.js が読めなかった場合も、CSSのkeep-allで最低限は効く） */
  function bx(html) { return '<budoux-ja>' + html + '</budoux-ja>'; }

  var api = null;
  var root = null, hole = null, ring = null, bubble = null;
  var stepIndex = 0;
  var pollTimer = null;
  var modalTimer = null;
  var running = false;

  /* ゲーム側のモーダルが開いていないか、いつも見はっておく（開いていたら案内は引っこむ） */
  function anyGameModalOpen() {
    var list = document.querySelectorAll('.modal-overlay');
    for (var i = 0; i < list.length; i++) {
      var st = window.getComputedStyle(list[i]);
      if (st.display !== 'none' && st.visibility !== 'hidden') return true;
    }
    return false;
  }
  function watchModals() {
    if (modalTimer) clearInterval(modalTimer);
    modalTimer = setInterval(function () {
      if (!root) return;
      root.classList.toggle('modal-open', anyGameModalOpen());
    }, 250);
  }

  /* ------------------------------------------------------------------
   * ステップの定義
   *   text   … ふきだしの本文
   *   tab    … そのステップで開いておくタブ（旅/編成/ガチャ…のタブ制なので、
   *            目的のボタンが乗っているタブを先に開く。これを忘れると「見えないボタンを押して」になる）
   *   target … スポットライトを当てる要素（CSSセレクタ。nullなら画面全体を暗くするだけ）
   *   hint   … 操作してもらうステップの指示文（これがある＝「つぎへ」を出さない）
   *   altLabel … 操作しなくても先へ進める、もう1つのボタンの文言（詰まらせないための逃げ道）
   *   watch  … 操作の結果を表す値。ステップに入った時の値から「変わったら」次へ進む。
   *            絶対条件（例：装備が付いているか）にすると、すでに装備ずみの人が
   *            🎓で見返したときに一瞬で飛んでしまうため、変化で見る。
   *            念のため、対象ボタンが押されたことでも進む（結果が同じでも詰まらないように）
   *   before … そのステップに入る直前にやること（プレゼントを渡すなど）
   * ------------------------------------------------------------------ */
  var STEPS = [
    {
      text: nb('はじめまして') + '！ わたしは キャラバンの ' + nb('たいちょう') + 'だよ。<br>' +
            'この旅の ' + nb('あそびかた') + 'を、' + nb('いっしょに') + ' やってみよう。' +
            nb('すぐおわるよ') + '！',
      target: null,
    },
    {
      // 音は「最初から鳴らす」と びっくりさせるので、本人に つけてもらう（ブラウザの自動再生制限の面でも、
      // 本人のタップで鳴らすのがいちばん確実）。iPhoneはマナーモードだと そもそも音が出ないので先に伝える
      text: 'この旅には 音楽と 音が あるんだ🎵<br>' +
            '右上の 🎵 を おすと 鳴りはじめるよ。<br>' +
            '<b>iPhone</b> の人は、本体よこの ' + nb('マナーモード') + ' の<br>' +
            'スイッチが 入っていると 音が出ないから、<br>' +
            'そこも ' + nb('見てみて') + 'ね。',
      target: '#bgmToggleBtn',
      hint: '👆 右上の 🎵 を おしてみてね',
      watch: function () { return api.isBgmOn ? api.isBgmOn() : true; },
      altLabel: '🔇 音なしで つづける',
    },
    {
      text: 'この世界には ' + nb('もやもや雲') + ' がいるんだ。<br>' +
            'キャラバンが 近づくと、みんなの元気で 雲は <b>笑顔</b> になるよ。<br>' +
            '町を元気にしながら、<b>80の町</b> をめぐる旅だよ。',
      tab: 'tabi',
      target: '#townBar',
    },
    {
      text: 'ここが 持ちものだよ。<br>' +
            '🎋 <b>笹</b> は なかまを ' + nb('おむかえ') + 'するときに つかうよ。<br>' +
            '✨ ' + nb('パンダさんパワー') + ' は 旅でたまっていく 元気のしるし。',
      tab: 'tabi',
      target: '.status',
    },
    {
      text: 'この帯が ' + nb('いっぱいに') + 'なると、町がひとつ <b>元気</b> になって つぎの町へ すすむよ。<br>' +
            '雲を笑顔にするたびに、少しずつ ' + nb('たまって') + 'いくんだ。',
      tab: 'tabi',
      target: '#townBar',
    },
    {
      text: 'さっそく <b>なかま</b> を ' + nb('おむかえ') + 'しよう！<br>' +
            nb('いちどに') + ' 10人ぶん ' + nb('おむかえ') + 'できるよ。<br>' +
            nb('はじめて') + 'の人には、これは <b>むりょう</b> だよ🎁',
      tab: 'gacha',
      target: '#gacha10PullBtn',
      before: function () { api.grantFreeGacha10(); },
      hint: '👆 「10れんで おむかえ」を おしてみてね',
      watch: function () { return Object.keys(api.getState().owned).length; },
    },
    {
      text: 'たくさん 来てくれたね！<br>' +
            nb('おむかえ') + 'した子は、キャラバンに <b>' + nb('のせてあげる') + '</b> と<br>' +
            nb('いっしょに') + ' 旅ができるよ。<br>' +
            nb('おまかせ編成') + ' をおすと、つよい4人を ' + nb('えらんで') + 'くれるよ。',
      tab: 'hensei',
      target: '#autoFormationBtn',
      hint: '👆 「✨ おまかせ編成」→「⚖️ バランスよく」を おしてみてね',
      watch: function () { return (api.getState().party || []).join(','); },
    },
    {
      text: '旅道具を 3つ プレゼント！🎁<br>' +
            nb('かぶりもの') + '・マント・' + nb('おまもり') + 'を つけると、<br>' +
            'キャラバンは もっと ' + nb('つよくなる') + 'よ。<br>' +
            nb('おまかせ装備') + ' をおしてみて。',
      tab: 'hensei',
      target: '#autoEquipBtn',
      before: function () { api.grantStarterItems(); },
      hint: '👆 「✨ おまかせ装備」を おしてみてね',
      watch: function () {
        var eq = api.getState().equipment || {};
        return ['kaburimono', 'mantle', 'omamori'].map(function (k) {
          return eq[k] ? eq[k].uid : '-';
        }).join(',');
      },
    },
    {
      text: 'これが ' + nb('キャラバン総合力') + '。<br>' +
            'この数字が 大きいほど、雲ひとつで ' + nb('もらえる') + ' <b>げんき</b> が ふえて、<br>' +
            '町が どんどん ' + nb('すすむように') + 'なるよ。',
      tab: 'hensei',
      target: '.party .total',
    },
    {
      text: nb('ここからが') + ' だいじ！<br>' +
            'このゲームは、<b>見ていなくても ' + nb('だいじょうぶ') + '</b> なんだ。<br>' +
            'アプリを ' + nb('とじている') + ' あいだも、キャラバンは 旅をつづけて、<br>' +
            '雲を笑顔にして 笹を ' + nb('あつめて') + 'おいて くれるよ。',
      target: null,
    },
    {
      text: 'また あそびに来ると ' + nb('るすばんのごほうび') + ' が ' + nb('もらえる') + 'よ。<br>' +
            'たまった笹で <b>なかまを ' + nb('おむかえ') + '</b> → <b>' + nb('つよくする') + '</b> → <b>町がすすむ</b>。<br>' +
            'この' + nb('くりかえし') + 'で、80の町を 目ざそう！',
      target: null,
    },
    {
      text: 'さいごに、あなたの <b>なまえ</b> と ' + nb('あいことば') + ' を きめよう。<br>' +
            nb('おぼえて') + 'おくと、スマホでも パソコンでも<br>' +
            '<b>おなじ つづき</b> から ' + nb('あそべる') + 'よ。',
      target: null,
      form: true,
    },
    {
      text: 'これで 準備は ' + nb('ばっちり') + '！<br>' +
            'あとは ' + nb('のんびり') + ' 見ているだけで ' + nb('だいじょうぶ') + '。<br>' +
            nb('いってらっしゃい') + '🐼🎋',
      target: null,
      last: true,
    },
  ];

  /* ---------------------------------------------------------------- 画面づくり */
  function ensureDom() {
    if (!document.getElementById(STYLE_ID)) {
      var st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    root = document.createElement('div');
    root.id = 'tutorialRoot';
    root.innerHTML =
      '<div id="tutorialHole"></div>' +
      '<div id="tutorialRing"></div>' +
      '<div id="tutorialBubble">' +
      '  <div class="t-head"><img src="assets/chars/taicho.png" alt="たいちょう">' +
      '    <span class="t-who">たいちょう</span><span class="t-step"></span></div>' +
      '  <div class="t-text"></div>' +
      '  <div class="t-extra"></div>' +
      '  <div class="t-btns"></div>' +
      '</div>';
    document.body.appendChild(root);
    hole = root.querySelector('#tutorialHole');
    ring = root.querySelector('#tutorialRing');
    bubble = root.querySelector('#tutorialBubble');
  }

  /* スポットライトの穴とふきだしの位置を、対象要素に合わせて置きなおす */
  function placeSpotlight(sel) {
    var pad = 8;
    var elTarget = sel ? document.querySelector(sel) : null;
    if (!elTarget) {
      // 対象なし＝画面全体を暗くして、ふきだしは真ん中より下に置く
      hole.classList.add('no-target');
      hole.style.top = '-20px'; hole.style.left = '-20px';
      hole.style.width = '0px'; hole.style.height = '0px';
      ring.style.display = 'none';
      bubble.style.top = ''; bubble.style.bottom = '6vh';
      return;
    }
    hole.classList.remove('no-target');
    ring.style.display = '';
    var r = elTarget.getBoundingClientRect();
    hole.style.top = (r.top - pad) + 'px';
    hole.style.left = (r.left - pad) + 'px';
    hole.style.width = (r.width + pad * 2) + 'px';
    hole.style.height = (r.height + pad * 2) + 'px';
    ring.style.top = (r.top - pad) + 'px';
    ring.style.left = (r.left - pad) + 'px';
    ring.style.width = (r.width + pad * 2) + 'px';
    ring.style.height = (r.height + pad * 2) + 'px';

    // ふきだしは対象を隠さない側に置く（対象が上半分なら下、下半分なら上）
    var centerY = r.top + r.height / 2;
    if (centerY < window.innerHeight * 0.5) {
      bubble.style.top = ''; bubble.style.bottom = '5vh';
    } else {
      bubble.style.bottom = ''; bubble.style.top = '4vh';
    }
  }

  function scrollTargetIntoView(sel) {
    if (!sel) return;
    var t = document.querySelector(sel);
    if (!t) return;
    var r = t.getBoundingClientRect();
    // 画面の中にちゃんと入っていない時だけ動かす（むやみにスクロールさせない）
    if (r.top < 60 || r.bottom > window.innerHeight - 60) {
      t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /* ---------------------------------------------------------------- ステップ表示 */
  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function renderStep() {
    var s = STEPS[stepIndex];
    if (!s) { finish(); return; }
    stopPolling();
    // 目的のボタンが乗っているタブを先に開く（開かないと見えないボタンを指すことになる）
    if (s.tab && api.showTab) { try { api.showTab(s.tab); } catch (e) {} }
    if (s.before) { try { s.before(); } catch (e) {} }

    bubble.querySelector('.t-step').textContent = (stepIndex + 1) + ' / ' + STEPS.length;
    bubble.querySelector('.t-text').innerHTML = bx(s.text);
    var extra = bubble.querySelector('.t-extra');
    var btns = bubble.querySelector('.t-btns');
    extra.innerHTML = '';
    btns.innerHTML = '';

    scrollTargetIntoView(s.target);
    // なめらかスクロールの途中で測ると穴がずれるので、落ち着くまで何回か置きなおす
    placeSpotlight(s.target);
    [120, 400, 700].forEach(function (ms) {
      setTimeout(function () { if (running && STEPS[stepIndex] === s) placeSpotlight(s.target); }, ms);
    });

    if (s.form) {
      renderCloudForm(extra, btns);
      return;
    }

    if (s.hint) {
      // 操作してもらうステップ：「つぎへ」は出さず、実際にできたかを見はる
      extra.innerHTML = '<div class="t-hint">' + s.hint + '</div>';
      // 押さずに先へ進める逃げ道（音を出せない人・出したくない人が詰まらないように）
      if (s.altLabel) {
        var alt = document.createElement('button');
        alt.className = 't-next';
        alt.textContent = s.altLabel;
        alt.addEventListener('click', next);
        btns.appendChild(alt);
      }
      addSkipButton(btns);
      var baseline = null;
      try { baseline = s.watch(); } catch (e) {}
      var clicked = false;
      var targetEl = s.target ? document.querySelector(s.target) : null;
      if (targetEl) {
        targetEl.addEventListener('click', function onceClick() {
          clicked = true;
          targetEl.removeEventListener('click', onceClick);
        });
      }
      pollTimer = setInterval(function () {
        var now = baseline;
        try { now = s.watch(); } catch (e) {}
        if (now !== baseline || clicked) {
          stopPolling();
          // ガチャの演出などが出ている間は、閉じるまで待ってから次へ進む
          var waitForModal = setInterval(function () {
            if (!anyGameModalOpen()) { clearInterval(waitForModal); setTimeout(next, 700); }
          }, 250);
        }
      }, 300);
      return;
    }

    var b = document.createElement('button');
    b.className = 't-next';
    b.textContent = s.last ? '🎋 はじめる' : 'つぎへ';
    b.addEventListener('click', next);
    btns.appendChild(b);
    if (!s.last) addSkipButton(btns);
  }

  function addSkipButton(btns) {
    var sk = document.createElement('button');
    sk.className = 't-skip';
    sk.textContent = 'スキップ';
    sk.addEventListener('click', function () {
      if (window.confirm('あんないを とじるよ。あとで「🎓 あそびかたを もういちど」から 見られるよ。')) {
        finish();
      }
    });
    btns.appendChild(sk);
  }

  /* さいごの「なまえとあいことば」 */
  function renderCloudForm(extra, btns) {
    extra.innerHTML =
      '<div class="t-form">' +
      '  <input type="text" id="tutorialName" placeholder="なまえ（1〜12文字）" maxlength="12">' +
      '  <input type="text" id="tutorialSecret" placeholder="あいことば（4文字いじょう）">' +
      '  <p class="t-msg" id="tutorialCloudMsg"></p>' +
      '</div>';
    var msg = extra.querySelector('#tutorialCloudMsg');

    var go = document.createElement('button');
    go.className = 't-next';
    go.textContent = '☁️ とうろくする';
    go.addEventListener('click', function () {
      var name = (extra.querySelector('#tutorialName').value || '').trim();
      var secret = (extra.querySelector('#tutorialSecret').value || '').trim();
      msg.className = 't-msg';
      if (name.length < 1 || name.length > 12) {
        msg.className = 't-msg error'; msg.textContent = 'なまえは 1〜12文字で 入れてね。'; return;
      }
      if (secret.length < 4) {
        msg.className = 't-msg error'; msg.textContent = 'あいことばは 4文字いじょうに してね。'; return;
      }
      go.disabled = true;
      msg.textContent = '雲と おはなし中…';
      api.cloudConnect(name, secret).then(function (res) {
        go.disabled = false;
        if (res && res.ok) {
          msg.className = 't-msg ok';
          msg.textContent = 'とうろく できたよ！';
          setTimeout(next, 800);
        } else {
          msg.className = 't-msg error';
          msg.textContent = (res && res.msg) || 'つながらなかったよ…あとでも とうろくできるよ。';
        }
      });
    });
    btns.appendChild(go);

    var later = document.createElement('button');
    later.className = 't-skip';
    later.textContent = 'あとでにする';
    later.addEventListener('click', next);
    btns.appendChild(later);
  }

  function next() {
    stepIndex++;
    var st = api.getState();
    st.tutorialStep = stepIndex;   // 途中で閉じても、つづきから案内できるように覚えておく
    api.saveState();
    if (stepIndex >= STEPS.length) { finish(); return; }
    renderStep();
  }

  // 画面と見はりを片づけるだけ（「終わった」という記録はつけない）
  function teardown() {
    stopPolling();
    if (modalTimer) { clearInterval(modalTimer); modalTimer = null; }
    running = false;
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = hole = ring = bubble = null;
  }

  function finish() {
    stopPolling();
    if (modalTimer) { clearInterval(modalTimer); modalTimer = null; }
    running = false;
    var st = api.getState();
    st.tutorialDone = true;
    st.tutorialStep = STEPS.length;
    st.tutorialFree10 = 0;         // 使いのこしは持ち越さない
    api.saveState();
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = hole = ring = bubble = null;
    try { api.renderAll(); } catch (e) {}
  }

  // 画面の向きや大きさが変わったら、穴の位置を合わせなおす
  window.addEventListener('resize', function () {
    if (running && STEPS[stepIndex]) placeSpotlight(STEPS[stepIndex].target);
  });
  window.addEventListener('scroll', function () {
    if (running && STEPS[stepIndex]) placeSpotlight(STEPS[stepIndex].target);
  }, { passive: true });

  window.SasatomoTutorial = {
    /** 案内をはじめる。api は game.html 側から渡してもらう（下の関数を使う） */
    start: function (gameApi, opts) {
      api = gameApi;
      opts = opts || {};
      // すでに案内中でも、🎓を押したら最初からやり直せるように、いったん片づけてから始める
      if (running || root) teardown();
      running = true;
      stepIndex = opts.fromStart ? 0 : Math.min(api.getState().tutorialStep || 0, STEPS.length - 1);
      ensureDom();
      watchModals();
      renderStep();
    },
    isRunning: function () { return running; },
    stepCount: STEPS.length,
  };
})();
