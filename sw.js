// SERVICE WORKER – mały "pomocnik", który działa w tle, obok strony.
// Stoi między aplikacją a internetem: gdy aplikacja prosi o plik (np. style.css),
// pomocnik decyduje, skąd go wziąć – z internetu czy z zapasu w pamięci telefonu.
// Dzięki temu szafa otworzy się nawet bez internetu (np. w metrze).

// Nazwa "schowka" na pliki. Gdy kiedyś zmienimy listę plików, podniesiemy numer (v2, v3...).
const SCHOWEK = 'szafa-v3';

// Pliki potrzebne, żeby aplikacja działała
const PLIKI = [
  './',
  'index.html',
  'style.css',
  'baza.js',
  'app.js',
  'zestawy.js',
  'kolaz.js',
  'manifest.webmanifest',
  'ikony/ikona-192.png',
  'ikony/ikona-512.png',
  'ikony/ikona-180.png',
];

// "install" – pierwsze uruchomienie pomocnika: odkładamy pliki do schowka
self.addEventListener('install', function (zdarzenie) {
  zdarzenie.waitUntil(
    caches.open(SCHOWEK).then(function (schowek) { return schowek.addAll(PLIKI); })
  );
  self.skipWaiting(); // nowa wersja pomocnika zaczyna działać od razu
});

// "activate" – sprzątamy stare schowki po poprzednich wersjach
self.addEventListener('activate', function (zdarzenie) {
  zdarzenie.waitUntil(
    caches.keys().then(function (nazwy) {
      return Promise.all(
        nazwy.filter(function (nazwa) { return nazwa !== SCHOWEK; })
             .map(function (nazwa) { return caches.delete(nazwa); })
      );
    })
  );
  self.clients.claim();
});

// "fetch" – za każdym razem, gdy aplikacja prosi o jakiś plik.
// Zasada "najpierw internet": próbujemy pobrać najnowszą wersję (żeby Twoje zmiany od razu było widać),
// odkładamy jej kopię do schowka, a gdy internetu nie ma – podajemy kopię ze schowka.
self.addEventListener('fetch', function (zdarzenie) {
  if (zdarzenie.request.method !== 'GET') return;
  // Zajmujemy się tylko plikami naszej aplikacji (nie cudzymi stronami)
  if (new URL(zdarzenie.request.url).origin !== self.location.origin) return;

  zdarzenie.respondWith(
    // cache: 'no-cache' = "zawsze zapytaj serwer, czy jest nowsza wersja".
    // Bez tego telefon przez ok. 10 minut używałby starej kopii i Twoje zmiany docierałyby z opóźnieniem.
    fetch(zdarzenie.request.url, { cache: 'no-cache' })
      .then(function (odpowiedz) {
        const kopia = odpowiedz.clone();
        caches.open(SCHOWEK).then(function (schowek) { schowek.put(zdarzenie.request, kopia); });
        return odpowiedz;
      })
      .catch(function () {
        return caches.match(zdarzenie.request, { ignoreSearch: true });
      })
  );
});
