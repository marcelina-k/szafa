// Ten plik zajmuje się TYLKO zapisywaniem i wczytywaniem danych.
// Używamy IndexedDB – bazy danych wbudowanej w każdą przeglądarkę.
// Dane zostają na tym urządzeniu, w tej przeglądarce, także po zamknięciu strony.

const NAZWA_BAZY = 'szafa';
// Numer wersji bazy. 1 = tylko ubrania, 2 = doszły zestawy, 3 = doszedł kalendarz.
// Gdy podniesiemy numer, przeglądarka uruchomi "onupgradeneeded" poniżej i doda brakujące szuflady.
const WERSJA_BAZY = 3;

// Otwieramy bazę raz, na starcie. "Promise" (obietnica) to wartość, która będzie gotowa za chwilę –
// dalej w kodzie mówimy "gdy baza będzie gotowa, zrób to".
const bazaGotowa = new Promise(function (gotowe, blad) {
  const prosba = indexedDB.open(NAZWA_BAZY, WERSJA_BAZY);

  // Wykonuje się tylko przy pierwszym uruchomieniu (albo gdy podniesiemy WERSJA_BAZY).
  // Tworzymy "szuflady" (object store) – każdą tylko wtedy, gdy jeszcze jej nie ma,
  // żeby nie ruszać ubrań zapisanych wcześniej. Każdą rzecz rozpoznajemy po polu "id".
  prosba.onupgradeneeded = function () {
    const baza = prosba.result;
    if (!baza.objectStoreNames.contains('ubrania')) baza.createObjectStore('ubrania', { keyPath: 'id' });
    if (!baza.objectStoreNames.contains('zestawy')) baza.createObjectStore('zestawy', { keyPath: 'id' });
    // Dni w kalendarzu rozpoznajemy po dacie, np. "2026-10-24"
    if (!baza.objectStoreNames.contains('kalendarz')) baza.createObjectStore('kalendarz', { keyPath: 'data' });
  };

  prosba.onsuccess = function () { gotowe(prosba.result); };
  prosba.onerror = function () { blad(prosba.error); };
});

// IndexedDB jest stara i nie używa obietnic, tylko "onsuccess"/"onerror".
// Ta funkcja zamienia jedną prośbę do bazy na obietnicę, żeby dało się pisać "await".
function naObietnice(prosba) {
  return new Promise(function (gotowe, blad) {
    prosba.onsuccess = function () { gotowe(prosba.result); };
    prosba.onerror = function () { blad(prosba.error); };
  });
}

// Trzy uniwersalne funkcje – działają dla każdej szuflady ("ubrania" albo "zestawy")

// Zwraca listę wszystkiego z danej szuflady
function wczytajWszystko(szuflada) {
  return bazaGotowa.then(function (baza) {
    return naObietnice(baza.transaction(szuflada, 'readonly').objectStore(szuflada).getAll());
  });
}

// Zapisuje jedną rzecz. Jeśli rzecz o tym samym id już jest – zostanie nadpisana.
function zapiszWBazie(szuflada, rzecz) {
  return bazaGotowa.then(function (baza) {
    return naObietnice(baza.transaction(szuflada, 'readwrite').objectStore(szuflada).put(rzecz));
  });
}

// Usuwa rzecz o podanym id
function usunZBazy(szuflada, id) {
  return bazaGotowa.then(function (baza) {
    return naObietnice(baza.transaction(szuflada, 'readwrite').objectStore(szuflada).delete(id));
  });
}

// ---------- ZDJĘCIA ----------
// Safari na iPhonie potrafi "zgubić" zdjęcia zapisane w bazie jako Blob (zostaje pusty plik).
// Dlatego zdjęcie zapisujemy jako surowe dane (ArrayBuffer = lista bajtów) plus jego typ (np. image/png),
// a przy wczytaniu składamy z nich z powrotem Blob, którego używa reszta aplikacji.

async function ubranieDoZapisu(ubranie) {
  if (!(ubranie.zdjecie instanceof Blob)) return ubranie; // brak zdjęcia albo już w bezpiecznej formie
  try {
    const dane = await ubranie.zdjecie.arrayBuffer();
    // Kopia ubrania: zamiast Bloba – dane i typ
    return { ...ubranie, zdjecie: null, zdjecieDane: dane, zdjecieTyp: ubranie.zdjecie.type };
  } catch (blad) {
    return ubranie; // zdjęcia nie da się odczytać (uszkodzone) – zapisujemy resztę bez zmian
  }
}

function ubraniePoWczytaniu(rekord) {
  if (rekord.zdjecieDane) {
    rekord.zdjecie = new Blob([rekord.zdjecieDane], { type: rekord.zdjecieTyp });
    delete rekord.zdjecieDane; // delete usuwa pole z obiektu
    delete rekord.zdjecieTyp;
  } else if (rekord.zdjecie instanceof Blob) {
    rekord.staryZapis = true; // zdjęcie zapisane dawnym sposobem – app.js przepisze je na nowy
  }
  return rekord;
}

// Krótsze nazwy dla reszty aplikacji
async function wczytajUbrania() {
  const rekordy = await wczytajWszystko('ubrania');
  return rekordy.map(ubraniePoWczytaniu);
}
async function zapiszUbranie(ubranie) {
  // Najpierw przygotowujemy dane (to chwilę trwa), dopiero potem otwieramy zapis w bazie
  return zapiszWBazie('ubrania', await ubranieDoZapisu(ubranie));
}

// Czy zdjęcie da się odczytać? (uszkodzone zdjęcie rzuca błąd przy próbie odczytu)
async function zdjecieCale(zdjecie) {
  if (!(zdjecie instanceof Blob)) return false;
  try {
    await zdjecie.slice(0, 16).arrayBuffer(); // czytamy tylko pierwsze 16 bajtów – szybko
    return zdjecie.size > 0;
  } catch (blad) {
    return false;
  }
}
function usunUbranieZBazy(id) { return usunZBazy('ubrania', id); }

function wczytajZestawy() { return wczytajWszystko('zestawy'); }
function zapiszZestaw(zestaw) { return zapiszWBazie('zestawy', zestaw); }
function usunZestawZBazy(id) { return usunZBazy('zestawy', id); }

function wczytajKalendarz() { return wczytajWszystko('kalendarz'); }
function zapiszDzien(wpis) { return zapiszWBazie('kalendarz', wpis); }
function usunDzienZBazy(data) { return usunZBazy('kalendarz', data); }

// Prosimy przeglądarkę, żeby nie kasowała naszych danych, gdy zabraknie miejsca na dysku.
// Przeglądarka może się nie zgodzić – wtedy tym bardziej warto robić kopie (eksport).
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist();
}
