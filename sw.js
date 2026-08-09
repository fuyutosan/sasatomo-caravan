// 笹友キャラバン — オフライン対応サービスワーカー（充電器v2方式）
// index.html はネットワーク優先（更新が即届く）、失敗時だけキャッシュ
const CACHE = 'sasatomo-caravan-v13'; // v13: チュートリアル(tutorial.js)とBudouX(budoux-ja.min.js)を追加 // v12: 馬車グレードアップ画像(wagon_lv2/3/4.png)を追加 // v11: もやもや雲の笑顔画像(moyamoya_smile.png)を追加 // v9: R/N個別画像を追加 // v8: SR6体＋たいちょうの個別画像を追加 // v5: 絵巻マップ（house.pngを追加。v4は欠番）
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './tutorial.js',
  './budoux-ja.min.js',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
  './assets/meimei_dot.png',
  './assets/scene/bg.png',
  './assets/scene/sky_day.png',
  './assets/scene/far.png',
  './assets/scene/mountains.png',
  './assets/scene/trees.png',
  './assets/scene/ground.png',
  './assets/scene/tree.png',
  './assets/scene/bush.png',
  './assets/scene/wagon.png',
  './assets/scene/wagon_lv2.png',
  './assets/scene/wagon_lv3.png',
  './assets/scene/wagon_lv4.png',
  './assets/scene/moyamoya.png',
  './assets/scene/moyamoya_smile.png',
  './assets/scene/house.png',
  './assets/chars/gorogoro.png',
  './assets/chars/ohayou.png',
  './assets/chars/mogumogu.png',
  './assets/chars/yurayura.png',
  './assets/chars/kurikuri.png',
  './assets/chars/korokoro.png',
  './assets/chars/mochimochi.png',
  './assets/chars/hokuhoku.png',
  './assets/chars/moonwalk.png',
  './assets/chars/nikoniko.png',
  './assets/chars/tokotoko.png',
  './assets/chars/takenoko.png',
  './assets/chars/kotsubu.png',
  './assets/chars/mameta.png',
  './assets/chars/sasanoha.png',
  './assets/chars/chacha.png',
  './assets/chars/tekuteku.png',
  './assets/chars/kirari.png',
  './assets/chars/suyasuya.png',
  './assets/chars/nonbiri.png',
  './assets/chars/shakishaki.png',
  './assets/chars/taicho.png',
  './assets/chars/nagareboshi.png',
  './assets/chars/otsukisama.png',
  './assets/chars/hatsuhinode.png',
  './assets/chars/pikapika.png',
  './assets/chars/onpu.png',
  './assets/chars/hanamaru.png',
  './assets/chars/mikazuki.png',
  './assets/icons/chest_futsu.png',
  './assets/icons/chest_suteki.png',
  './assets/icons/chest_totteoki.png',
  './assets/icons/chest_densetsu.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Supabase（クラウドセーブ）やGoogle Fontsなど外部はそのままネットワークへ
  if (url.origin !== self.location.origin) return;

  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('/index.html');
  if (isPage) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((m) => m || caches.match('./index.html')))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
  }
});
