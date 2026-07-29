/* 笹友キャラバン — OP専用BGM
 *
 * 【コンセプト】
 *   曲全体で **Am（元気が消えた町）→ C major（元気が返ってくる）** へ転調する。
 *   これが「もやもや雲を笑顔にすると町に色が灯る」という話の芯そのもの。
 *   だから音は映像を飾るのではなく、映像と同じことを言っている。
 *
 * 【映像との合わせ方】
 *   ふつうは一定のBPMで小節を刻むが、それだとカットの切れ目と小節頭が最大0.5秒ずれた。
 *   OPは劇伴なので**映像を優先**する。セクションをカットの時刻そのままで区切り、
 *   セクションごとにBPMを持たせた。場面が変わると速さも変わるので、温度の変化も出る。
 *
 * 【音色】ゲーム本体のBGM(bgm.html)の流儀を踏襲。square=メロディ／triangle=ベース／
 *   sine=キック／ノイズ+highpass=ハット。木のあたたかさを出したいので sine/triangle を主体にする。
 *
 * 使い方:
 *   OpBgm.play(audioCtxOrNull, {parts, tempoScale, volume, from})  … 再生（from秒から）
 *   OpBgm.stop()
 *   OpBgm.renderToWav({parts, tempoScale, volume})  … Promise<Blob>（動画に乗せる用）
 */
(function () {
  'use strict';

  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(name) {
    if (!name) return 0;
    var semi = NOTE[name[0]];
    var i = 1;
    if (name[1] === '#') { semi += 1; i = 2; } else if (name[1] === 'b') { semi -= 1; i = 2; }
    var oct = parseInt(name.slice(i), 10);
    return 440 * Math.pow(2, (semi - 9) / 12 + (oct - 4));
  }

  var DURATION = 31.6;   // op.js の DURATION と合わせる
  var GAIN_BOOST = 2.4;  // 全体の底上げ（詳しくは play() のコメント）

  // ---------------------------------------------------------------- 曲
  // 各セクションは「8分音符の並び」を持つ。長さが足りなければ繰り返す。
  // t は op.js のカット時刻とそろえてある。
  var SECTIONS = [
    {
      name: 'さみしい町', t: 0.0, bpm: 74, key: 'Am',
      why: 'ぽつん、ぽつんと鳴るだけ。打楽器を入れない＝町から元気が抜けている静けさ',
      lead: ['A3', null, null, null, 'C4', null, null, null, 'B3', null, null, null, 'A3', null, null, null,
             'E3', null, null, null, 'A3', null, null, null, 'C4', null, 'B3', null, 'A3', null, null, null],
      leadType: 'triangle', leadVol: 0.085,
      bass: ['A1', 'A1', 'F1', 'F1'], bassVol: 0.16,
      kick: null, hat: false, sparkle: false, harmony: null
    },
    {
      name: '隊商の登場', t: 7.6, bpm: 92, key: 'Am→F',
      why: 'キックが歩幅になる。ここで初めて打楽器が入る＝誰かが近づいてくる',
      lead: ['A3', 'C4', 'E4', 'D4', 'C4', 'A3', 'C4', null, 'D4', 'E4', 'G4', 'E4', 'D4', 'C4', 'D4', null,
             'F4', 'E4', 'D4', 'C4', 'A3', 'C4', 'D4', null, 'E4', 'D4', 'C4', 'A3', 'G3', 'A3', null, null],
      leadType: 'square', leadVol: 0.075,
      bass: ['A2', 'F2', 'G2', 'A2', 'F2', 'C3', 'G2', 'A2'], bassVol: 0.20,
      kick: [1, 0, 0, 0, 1, 0, 0, 0], hat: true, sparkle: false, harmony: null
    },
    {
      name: '浄化（Cへ転調）', t: 15.2, bpm: 92, key: 'C',
      why: 'ここでマイナーからメジャーへ。もやもや雲が笑顔になる瞬間に音が明るく開く。きらきらも入る',
      lead: ['C4', 'E4', 'G4', 'C5', 'B4', 'G4', 'E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4', 'D4', 'E4', null],
      leadType: 'square', leadVol: 0.085,
      bass: ['C2', 'G2', 'F2', 'G2'], bassVol: 0.20,
      kick: [1, 0, 0, 0, 1, 0, 1, 0], hat: true, sparkle: true, harmony: 4   // 3度上をそえる
    },
    {
      name: '町が色づく', t: 19.6, bpm: 92, key: 'C',
      why: 'いちばん音が多い場所。配った元気が返ってくる＝ハーモニーが増えて豊かになる',
      lead: ['E4', 'G4', 'C5', 'B4', 'A4', 'G4', 'A4', 'C5', 'G4', 'E4', 'D4', 'E4', 'G4', 'A4', 'G4', null,
             'C5', 'B4', 'A4', 'G4', 'E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4', 'D4', 'E4', null, null, null],
      leadType: 'square', leadVol: 0.088,
      bass: ['C2', 'F2', 'G2', 'C2'], bassVol: 0.21,
      kick: [1, 0, 0, 1, 1, 0, 0, 0], hat: true, sparkle: true, harmony: 7   // 5度上
    },
    {
      name: 'おみやげとなかま', t: 23.0, bpm: 98, key: 'F→C',
      why: '少し速くして跳ねさせる。宝箱が開いて、なかまがぽんぽん増える楽しさ',
      lead: ['F4', 'A4', 'C5', 'A4', 'G4', 'E4', 'G4', null, 'A4', 'C5', 'D5', 'C5', 'A4', 'G4', 'A4', null],
      leadType: 'square', leadVol: 0.085,
      bass: ['F2', 'C3', 'G2', 'C2'], bassVol: 0.20,
      kick: [1, 0, 1, 0, 1, 0, 1, 0], hat: true, sparkle: true, harmony: 4
    },
    {
      name: 'タイトル', t: 26.6, bpm: 82, key: 'C',
      why: 'ゆっくりにして伸ばす。最後はドで解決させて「いってらっしゃい」の余韻にする',
      lead: ['G4', null, 'A4', null, 'C5', null, null, null, 'B4', null, 'A4', null, 'G4', null, null, null,
             'E4', null, 'G4', null, 'C5', null, null, null, null, null, null, null, null, null, null, null],
      leadType: 'triangle', leadVol: 0.095,
      bass: ['C2', 'C2', 'F2', 'G2', 'C2', 'C2'], bassVol: 0.19,
      kick: [1, 0, 0, 0, 0, 0, 0, 0], hat: false, sparkle: true, harmony: 4
    }
  ];

  function sectionEnd(i) {
    return i + 1 < SECTIONS.length ? SECTIONS[i + 1].t : DURATION;
  }

  // ---------------------------------------------------------------- 音を作る
  function makeVoices(ctx, master) {
    var noiseBuf = null;

    function tone(type, f, t, dur, vol, glide) {
      if (!f) return;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
      // 立ち上がりを少しなまらせると、木の音に近づいてやわらかくなる
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.02);
    }

    function kick(t, vol) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.13);
    }

    function hat(t, vol) {
      if (!noiseBuf) {
        noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        // 乱数を使うと書き出すたび違う音になるので、決まった式で作る
        for (var i = 0; i < d.length; i++) d[i] = Math.sin(i * 12.9898) * 43758.5453 % 2 - 1;
      }
      var s = ctx.createBufferSource(); s.buffer = noiseBuf;
      var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t);
    }

    return { tone: tone, kick: kick, hat: hat };
  }

  /** 全部の音を ctx に予約する。t0 = 予約の基準時刻、from = 曲の何秒目から鳴らすか */
  function schedule(ctx, master, opt) {
    var parts = opt.parts || {};
    var on = function (k) { return parts[k] !== false; };
    var scale = opt.tempoScale || 1;      // 1で譜面どおり。大きいほど速い
    var from = opt.from || 0;
    var t0 = opt.t0;
    var v = makeVoices(ctx, master);
    var sparkleNotes = ['C6', 'E6', 'G6', 'C7', 'G6', 'E6'];
    var si = 0;

    SECTIONS.forEach(function (S, idx) {
      var segStart = S.t, segEnd = sectionEnd(idx);
      var eighth = 60 / (S.bpm * scale) / 2;
      var steps = Math.ceil((segEnd - segStart) / eighth);

      for (var i = 0; i < steps; i++) {
        var songT = segStart + i * eighth;
        if (songT >= segEnd - 0.001) break;
        if (songT < from) continue;
        var t = t0 + (songT - from);

        // メロディ
        var n = S.lead[i % S.lead.length];
        if (n && on('lead')) {
          v.tone(S.leadType, freq(n), t, eighth * 0.9, S.leadVol);
          if (S.harmony && on('harmony')) {
            // 3度／5度上をそえる。控えめにして主旋律を邪魔しない
            v.tone('triangle', freq(n) * Math.pow(2, S.harmony / 12), t, eighth * 0.85, S.leadVol * 0.42);
          }
        }

        // 打楽器
        if (S.kick && on('kick') && S.kick[i % S.kick.length]) v.kick(t, 0.30);
        if (S.hat && on('hat') && i % 2 === 1) v.hat(t, 0.055);

        // きらきら（4拍ごとに1粒）
        if (S.sparkle && on('sparkle') && i % 4 === 2) {
          v.tone('sine', freq(sparkleNotes[si++ % sparkleNotes.length]), t, eighth * 1.6, 0.05);
        }

        // ベース（2拍ごと＝4分音符2つぶん）
        if (on('bass') && i % 4 === 0) {
          var bi = Math.floor(i / 4) % S.bass.length;
          v.tone('triangle', freq(S.bass[bi]), t, eighth * 3.7, S.bassVol);
        }
      }
    });

    return DURATION - from;
  }

  // ---------------------------------------------------------------- 再生
  var ctx = null, master = null, playing = false, startedAt = 0, curFrom = 0;

  function ensure(external) {
    if (!ctx) {
      ctx = external || new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    return ctx;
  }

  function play(external, opt) {
    opt = opt || {};
    stop();
    ensure(external);
    if (ctx.state === 'suspended') ctx.resume();
    master = ctx.createGain();
    // チップチューンは音が短くて間が多く、素のままだとRMS -35dBFS＝かなり小さかった。
    // ピークに10.5dBの余裕があったので、つまみ50%で gain 1.2 になるよう底上げする。
    master.gain.value = (opt.volume === undefined ? 0.5 : opt.volume) * GAIN_BOOST;
    master.connect(ctx.destination);
    curFrom = opt.from || 0;
    startedAt = ctx.currentTime + 0.06;
    schedule(ctx, master, { parts: opt.parts, tempoScale: opt.tempoScale, from: curFrom, t0: startedAt });
    playing = true;
    return startedAt;
  }

  function stop() {
    if (master) {
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
        var old = master;
        setTimeout(function () { try { old.disconnect(); } catch (e) {} }, 200);
      } catch (e) {}
      master = null;
    }
    playing = false;
  }

  /** いま曲の何秒目か（映像とそろえるため） */
  function currentTime() {
    if (!playing || !ctx) return 0;
    return curFrom + (ctx.currentTime - startedAt);
  }

  /** 動画に乗せる用にWAVへ書き出す（OfflineAudioContextなので実時間を待たない） */
  function renderToWav(opt) {
    opt = opt || {};
    var rate = 44100;
    var len = Math.ceil((DURATION + 1.2) * rate);
    var oc = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, len, rate);
    var m = oc.createGain();
    m.gain.value = (opt.volume === undefined ? 0.5 : opt.volume) * GAIN_BOOST;
    m.connect(oc.destination);
    schedule(oc, m, { parts: opt.parts, tempoScale: opt.tempoScale, from: 0, t0: 0 });
    return oc.startRendering().then(function (buf) { return toWavBlob(buf); });
  }

  function toWavBlob(buf) {
    var ch = buf.numberOfChannels, len = buf.length;
    var data = new DataView(new ArrayBuffer(44 + len * ch * 2));
    var w = function (o, s) { for (var i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); data.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVEfmt ');
    data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
    data.setUint32(24, buf.sampleRate, true); data.setUint32(28, buf.sampleRate * ch * 2, true);
    data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true);
    w(36, 'data'); data.setUint32(40, len * ch * 2, true);
    var chans = [];
    for (var c = 0; c < ch; c++) chans.push(buf.getChannelData(c));
    var o = 44;
    for (var i = 0; i < len; i++) {
      for (var c2 = 0; c2 < ch; c2++) {
        var s = Math.max(-1, Math.min(1, chans[c2][i]));
        data.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        o += 2;
      }
    }
    return new Blob([data], { type: 'audio/wav' });
  }

  /** いまどのセクションか（試聴室のインジケータ用） */
  function sectionAt(t) {
    var idx = 0;
    for (var i = 0; i < SECTIONS.length; i++) if (t >= SECTIONS[i].t) idx = i;
    return { index: idx, section: SECTIONS[idx], end: sectionEnd(idx) };
  }

  window.OpBgm = {
    DURATION: DURATION,
    SECTIONS: SECTIONS,
    PARTS: ['lead', 'harmony', 'bass', 'kick', 'hat', 'sparkle'],
    play: play,
    stop: stop,
    currentTime: currentTime,
    sectionAt: sectionAt,
    renderToWav: renderToWav,
    isPlaying: function () { return playing; }
  };
})();
