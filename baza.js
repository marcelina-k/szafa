// Ten plik zajmuje się TYLKO zapisywaniem i wczytywaniem danych.
// Używamy IndexedDB – bazy danych wbudowanej w każdą przeglądarkę.
// Dane zostają na tym urządzeniu, w tej przeglądarce, także po zamknięciu strony.

const NAZWA_BAZY = 'szafa';
// Numer wersji bazy. Gdy w przyszłości dodamy np. zestawy, podniesiemy go do 2.
const WERSJA_BAZY = 1;

// Otwieramy bazę raz, na starcie. "Promise" (obietnica) to wartość, która będzie gotowa za chwilę –
// dalej w kodzie mówimy "gdy baza będzie gotowa, zrób to".
const bazaGotowa = new Promise(function (gotowe, blad) {
  const prosba = indexedDB.open(NAZWA_BAZY, WERSJA_BAZY);

  // Wykonuje się tylko przy pierwszym uruchomieniu (albo gdy podniesiemy WERSJA_BAZY).
  // Tworzymy "szufladę" (object store) na ubrania. Każde ubranie rozpoznajemy po polu "id".
  prosba.onupgradeneeded = function () {
    prosba.result.createObjectStore('ubrania', { keyPath: 'id' });
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

// Zwraca listę wszystkich zapisanych ubrań
function wczytajUbrania() {
  return bazaGotowa.then(function (baza) {
    return naObietnice(baza.transaction('ubrania', 'readonly').objectStore('ubrania').getAll());
  });
}

// Zapisuje jedno ubranie. Jeśli ubranie o tym samym id już jest – zostanie nadpisane.
function zapiszUbranie(ubranie) {
  return bazaGotowa.then(function (baza) {
    return naObietnice(baza.transaction('ubrania', 'readwrite').objectStore('ubrania').put(ubranie));
  });
}

// Usuwa ubranie o podanym id
function usunUbranieZBazy(id) {
  return bazaGotowa.then(function (baza) {
    return naObietnice(baza.transaction('ubrania', 'readwrite').objectStore('ubrania').delete(id));
  });
}

// Prosimy przeglądarkę, żeby nie kasowała naszych danych, gdy zabraknie miejsca na dysku.
// Przeglądarka może się nie zgodzić – wtedy tym bardziej warto robić kopie (eksport).
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist();
}
