/* 笹友キャラバン — クリアムービー専用BGM
 *
 * 【OPの曲との作り分け】
 *   OPは Am → C（元気が消えた町から、元気が返ってくる）へ転調する「行き」の曲。
 *   こちらは **C一貫の讃歌**。もう暗いところは通らない。ずっと明るいまま、
 *   最後に F → G → C で解決させて「おつかれさま」で終わる。
 *   テンポもOPより遅い（66〜80）。旅が終わった朝の速さにする。
 *
 * 【映像との合わせ方】op-bgm.js と同じ。
 *   小節を一定のBPMで刻むとカットの切れ目とずれるので、セクションを
 *   clear.js のカット時刻でそのまま区切り、セクションごとにBPMを持たせる。
 *
 * 【いちばん考えたところ】
 *   ⑤「笹の花」で音をいちばん減らす。打楽器を止めて単音だけにする。
 *   音が減ると画が際立つ。めったに咲かない花を見せる場所なので、ここは静けさで作る。
 */
(function () {
  'use strict';

  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(name) {
    if (!name) return 0;
    var semi = NOTE[name[0]], i = 1;
    if (name[1] === '#') { semi += 1; i = 2; } else if (name[1] === 'b') { semi -= 1; i = 2; }
    return 440 * Math.pow(2, (semi - 9) / 12 + (parseInt(name.slice(i), 10) - 4));
  }

  var DURATION = 43.0;    // clear.js の DURATION と合わせる
  var GAIN_BOOST = 2.4;   // チップチューンは素のままだと小さい（op-bgm.jsと同じ理由）

  // =========================================================== 曲
  var SECTIONS = [
    {
      name: '夜明け前', t: 0.0, bpm: 68, key: 'C',
      why: '打楽器なし。単音がぽつん、ぽつんと鳴るだけ。まだ夜で、静かな時間',
      lead: ['C4', null, null, null, 'E4', null, null, null, 'G4', null, null, null, 'E4', null, null, null,
             'F4', null, null, null, 'E4', null, null, null, 'D4', null, null, null, 'C4', null, null, null],
      leadType: 'triangle', leadVol: 0.080,
      bass: ['C2', 'C2', 'F2', 'F2'], bassVol: 0.15,
      kick: null, hat: false, sparkle: false, harmony: null
    },
    {
      name: '80の光が灯る', t: 5.5, bpm: 76, key: 'C',
      why: '音を1粒ずつ積み上げるアルペジオ。町の灯りが1つずつ増えるのと同じ動き',
      lead: ['C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4', 'E4',
             'D4', 'F4', 'A4', 'D5', 'A4', 'F4', 'D4', 'F4',
             'E4', 'G4', 'B4', 'E5', 'B4', 'G4', 'E4', 'G4',
             'F4', 'A4', 'C5', 'F5', 'C5', 'A4', 'F4', 'A4'],
      leadType: 'square', leadVol: 0.072,
      bass: ['C2', 'D2', 'E2', 'F2'], bassVol: 0.18,
      kick: null, hat: false, sparkle: true, harmony: null
    },
    {
      name: 'なかまが集まる', t: 13.0, bpm: 80, key: 'C',
      why: 'ここで初めてキックが入る。誰かが歩いてくる足音。ハーモニーも足して厚くする',
      lead: ['G4', 'A4', 'C5', 'A4', 'G4', 'E4', 'G4', null,
             'A4', 'C5', 'D5', 'C5', 'A4', 'G4', 'A4', null],
      leadType: 'square', leadVol: 0.082,
      bass: ['C2', 'G2', 'A2', 'F2', 'C2', 'G2', 'F2', 'G2'], bassVol: 0.20,
      kick: [1, 0, 0, 0, 1, 0, 0, 0], hat: true, sparkle: false, harmony: 4
    },
    {
      name: '隊長さんへ', t: 19.0, bpm: 80, key: 'C',
      why: '曲のなかでいちばん歌う場所。5度のハーモニーを重ねて、まっすぐな旋律にする',
      lead: ['C5', 'B4', 'A4', 'G4', 'A4', 'C5', 'D5', null,
             'C5', 'A4', 'G4', 'E4', 'G4', 'A4', 'G4', null],
      leadType: 'square', leadVol: 0.088,
      bass: ['F2', 'C2', 'G2', 'C2'], bassVol: 0.21,
      kick: [1, 0, 0, 1, 1, 0, 0, 0], hat: true, sparkle: false, harmony: 7
    },
    {
      name: '笹の花（いちばん静か）', t: 25.5, bpm: 72, key: 'C',
      why: '打楽器を止めて単音に戻す。音を減らすと画が際立つ。めったに咲かない花を見せる場所',
      lead: ['E5', null, null, null, 'D5', null, null, null, 'C5', null, null, null, null, null, null, null,
             'G4', null, null, null, 'A4', null, null, null, 'C5', null, null, null, null, null, null, null],
      leadType: 'triangle', leadVol: 0.092,
      bass: ['C2', 'C2', 'F2', 'F2'], bassVol: 0.14,
      kick: null, hat: false, sparkle: true, harmony: null
    },
    {
      name: '朝日', t: 32.0, bpm: 80, key: 'C',
      why: 'いちばん開ける場所。旋律を1オクターブ上げて、打楽器も全部入れる',
      lead: ['C5', 'D5', 'E5', 'G5', 'E5', 'D5', 'C5', 'D5',
             'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', null],
      leadType: 'square', leadVol: 0.086,
      bass: ['C2', 'F2', 'G2', 'C2', 'F2', 'G2', 'A2', 'G2'], bassVol: 0.21,
      kick: [1, 0, 1, 0, 1, 0, 1, 0], hat: true, sparkle: true, harmony: 4
    },
    {
      name: 'つづく（F→G→Cで解決）', t: 38.0, bpm: 66, key: 'C',
      why: 'ゆっくりにして伸ばす。ベースをF→G→Cと動かして、最後のドで着地する＝おつかれさま',
      lead: ['F4', null, 'G4', null, 'A4', null, null, null,
             'G4', null, 'F4', null, 'E4', null, null, null,
             'F4', null, 'E4', null, 'D4', null, null, null,
             'C4', null, null, null, null, null, null, null],
      leadType: 'triangle', leadVol: 0.098,
      bass: ['F2', 'F2', 'G2', 'G2', 'C2', 'C2'], bassVol: 0.19,
      kick: [1, 0, 0, 0, 0, 0, 0, 0], hat: false, sparkle: true, harmony: 4
    }
  ];

  function sectionEnd(i) { return i + 1 < SECTIONS.length ? SECTIONS[i + 1].t : DURATION; }

  // =========================================================== 音づくり
  function makeVoices(ctx, master) {
    var noiseBuf = null;
    function tone(type, f, t, dur, vol) {
      if (!f) return;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.025, dur * 0.22));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.02);
    }
    function kick(t, vol) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(118, t);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.1);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.14);
    }
    function hat(t, vol) {
      if (!noiseBuf) {
        noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        // 乱数だと書き出すたび音が変わるので、決まった式で作る
        for (var i = 0; i < d.length; i++) d[i] = Math.sin(i * 12.9898) * 43758.5453 % 2 - 1;
      }
      var s = ctx.createBufferSource(); s.buffer = noiseBuf;
      var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6800;
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t);
    }
    return { tone: tone, kick: kick, hat: hat };
  }

  function schedule(ctx, master, opt) {
    var parts = opt.parts || {};
    var on = function (k) { return parts[k] !== false; };
    var scale = opt.tempoScale || 1;
    var from = opt.from || 0, t0 = opt.t0;
    var v = makeVoices(ctx, master);
    var sparkleNotes = ['C6', 'E6', 'G6', 'C7', 'A6', 'G6', 'E6'];
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

        var n = S.lead[i % S.lead.length];
        if (n && on('lead')) {
          // 静かなセクションは音を長く伸ばして余韻を作る
          var len = (S.kick ? 0.9 : 1.7) * eighth;
          v.tone(S.leadType, freq(n), t, len, S.leadVol);
          if (S.harmony && on('harmony')) {
            v.tone('triangle', freq(n) * Math.pow(2, S.harmony / 12), t, len * 0.9, S.leadVol * 0.40);
          }
        }
        if (S.kick && on('kick') && S.kick[i % S.kick.length]) v.kick(t, 0.30);
        if (S.hat && on('hat') && i % 2 === 1) v.hat(t, 0.05);
        if (S.sparkle && on('sparkle') && i % 4 === 2) {
          v.tone('sine', freq(sparkleNotes[si++ % sparkleNotes.length]), t, eighth * 1.8, 0.048);
        }
        if (on('bass') && i % 4 === 0) {
          var bi = Math.floor(i / 4) % S.bass.length;
          v.tone('triangle', freq(S.bass[bi]), t, eighth * 3.8, S.bassVol);
        }
      }
    });
    return DURATION - from;
  }

  // =========================================================== 再生
  var ctx = null, master = null, playing = false, startedAt = 0, curFrom = 0;

  function play(external, opt) {
    opt = opt || {};
    stop();
    if (!ctx) ctx = external || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    master = ctx.createGain();
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

  function currentTime() {
    if (!playing || !ctx) return 0;
    return curFrom + (ctx.currentTime - startedAt);
  }

  function renderToWav(opt) {
    opt = opt || {};
    var rate = 44100;
    var oc = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      2, Math.ceil((DURATION + 1.6) * rate), rate);
    var m = oc.createGain();
    m.gain.value = (opt.volume === undefined ? 0.5 : opt.volume) * GAIN_BOOST;
    m.connect(oc.destination);
    schedule(oc, m, { parts: opt.parts, tempoScale: opt.tempoScale, from: 0, t0: 0 });
    return oc.startRendering().then(toWavBlob);
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

  function sectionAt(t) {
    var idx = 0;
    for (var i = 0; i < SECTIONS.length; i++) if (t >= SECTIONS[i].t) idx = i;
    return { index: idx, section: SECTIONS[idx], end: sectionEnd(idx) };
  }

  window.ClearBgm = {
    DURATION: DURATION,
    SECTIONS: SECTIONS,
    PARTS: ['lead', 'harmony', 'bass', 'kick', 'hat', 'sparkle'],
    play: play, stop: stop, currentTime: currentTime,
    sectionAt: sectionAt, renderToWav: renderToWav,
    isPlaying: function () { return playing; }
  };
})();
