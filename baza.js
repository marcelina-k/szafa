// Ten plik zajmuje się TYLKO zapisywaniem i wczytywaniem danych.
// Używamy IndexedDB – bazy danych wbudowanej w każdą przeglądarkę.
// Dane zostają na tym urządzeniu, w tej przeglądarce, także po zamknięciu strony.

const NAZWA_BAZY = 'szafa';
// Numer wersji bazy. 1 = tylko ubrania, 2 = doszły zestawy.
// Gdy podniesiemy numer, przeglądarka uruchomi "onupgradeneeded" poniżej i doda brakujące szuflady.
const WERSJA_BAZY = 2;

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

// Krótsze nazwy dla reszty aplikacji
function wczytajUbrania() { return wczytajWszystko('ubrania'); }
function zapiszUbranie(ubranie) { return zapiszWBazie('ubrania', ubranie); }
function usunUbranieZBazy(id) { return usunZBazy('ubrania', id); }

function wczytajZestawy() { return wczytajWszystko('zestawy'); }
function zapiszZestaw(zestaw) { return zapiszWBazie('zestawy', zestaw); }
function usunZestawZBazy(id) { return usunZBazy('zestawy', id); }

// Prosimy przeglądarkę, żeby nie kasowała naszych danych, gdy zabraknie miejsca na dysku.
// Przeglądarka może się nie zgodzić – wtedy tym bardziej warto robić kopie (eksport).
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist();
}
