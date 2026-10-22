// To jest JavaScript, czyli zachowanie strony. Mówi przeglądarce, CO MA SIĘ DZIAĆ.

// ---------- USTAWIENIA ----------

// Najdłuższy bok zdjęcia po zmniejszeniu (w pikselach). Zdjęcie z telefonu ma zwykle ok. 4000 px.
const MAKS_ROZMIAR = 1000;
// Jakość zapisu JPEG: 1 = najlepsza (duży plik), 0.8 = prawie bez różnicy dla oka, a plik dużo mniejszy
const JAKOSC = 0.8;

// ---------- DANE ----------

// Tablica (lista) wszystkich ubrań – kopia robocza w pamięci strony.
// Na stałe ubrania leżą w bazie (patrz baza.js); przy starcie wczytujemy je stamtąd.
const ubrania = [];

// Tu trzymamy zmniejszone zdjęcie, zanim klikniesz "Dodaj do szafy"
let zmniejszoneZdjecie = null;

// ---------- ELEMENTY STRONY ----------

// Znajdujemy w HTML elementy po ich id, żeby móc z nimi pracować
const formularz = document.getElementById('formularz');
const poleZdjecia = document.getElementById('zdjecie');
const podglad = document.getElementById('podglad');
const infoZdjecie = document.getElementById('info-zdjecie');
const lista = document.getElementById('lista');
const pusto = document.getElementById('pusto');
const przyciskEksportu = document.getElementById('eksport');
const poleImportu = document.getElementById('import');
const infoKopia = document.getElementById('info-kopia');
const filtry = document.getElementById('filtry');
const filtrKategoria = document.getElementById('filtr-kategoria');
const filtrKolor = document.getElementById('filtr-kolor');
const licznik = document.getElementById('licznik');

// ---------- ZMNIEJSZANIE ZDJĘCIA ----------

// Funkcja = przepis, który można wielokrotnie wykonać.
// Dostaje plik ze zdjęciem, zwraca mniejszą wersję (JPEG).
// "async" oznacza, że funkcja robi coś, co chwilę trwa (np. wczytanie obrazka), i trzeba na nią poczekać.
async function zmniejszZdjecie(plik) {
  // 1. Wczytujemy zdjęcie jako obrazek
  const obrazek = await createImageBitmap(plik);

  // 2. Liczymy nowy rozmiar, zachowując proporcje.
  //    Jeśli zdjęcie jest już małe, skala = 1 (nie powiększamy).
  const skala = Math.min(1, MAKS_ROZMIAR / Math.max(obrazek.width, obrazek.height));
  const szerokosc = Math.round(obrazek.width * skala);
  const wysokosc = Math.round(obrazek.height * skala);

  // 3. Canvas to "płótno" do rysowania. Rysujemy na nim zdjęcie w nowym, mniejszym rozmiarze.
  const plotno = document.createElement('canvas');
  plotno.width = szerokosc;
  plotno.height = wysokosc;
  plotno.getContext('2d').drawImage(obrazek, 0, 0, szerokosc, wysokosc);

  // 4. Zapisujemy płótno jako plik JPEG (Blob = "kawałek danych", np. obrazek)
  return new Promise(function (gotowe) {
    plotno.toBlob(gotowe, 'image/jpeg', JAKOSC);
  });
}

// Zamienia liczbę bajtów na czytelny tekst, np. 3 450 000 -> "3.3 MB"
function rozmiarTekstem(bajty) {
  if (bajty > 1024 * 1024) return (bajty / 1024 / 1024).toFixed(1) + ' MB';
  return Math.round(bajty / 1024) + ' KB';
}

// Odmienia słowo "ubranie" po polsku: 1 ubranie, 2 ubrania, 5 ubrań, 22 ubrania, 12 ubrań
function ileUbran(liczba) {
  if (liczba === 1) return '1 ubranie';
  const jednosci = liczba % 10;   // ostatnia cyfra (% to reszta z dzielenia)
  const dziesiatki = liczba % 100; // dwie ostatnie cyfry
  if (jednosci >= 2 && jednosci <= 4 && (dziesiatki < 12 || dziesiatki > 14)) return liczba + ' ubrania';
  return liczba + ' ubrań';
}

// Gdy wybierzesz zdjęcie (zdarzenie "change") – od razu je zmniejszamy i pokazujemy podgląd
poleZdjecia.addEventListener('change', async function () {
  const plik = poleZdjecia.files[0];
  if (!plik) return; // nic nie wybrano

  zmniejszoneZdjecie = await zmniejszZdjecie(plik);

  podglad.src = URL.createObjectURL(zmniejszoneZdjecie);
  podglad.hidden = false;
  infoZdjecie.textContent =
    'Zdjęcie zmniejszone: ' + rozmiarTekstem(plik.size) + ' → ' + rozmiarTekstem(zmniejszoneZdjecie.size);
});

// ---------- DODAWANIE UBRANIA ----------

// Zbiera wartości zaznaczonych checkboxów z danej grupy, np. ["Jesień", "Zima"]
function zaznaczone(idGrupy) {
  const pola = document.querySelectorAll('#' + idGrupy + ' input:checked');
  return Array.from(pola).map(function (pole) { return pole.value; });
}

// Gdy klikniesz "Dodaj do szafy" (zdarzenie "submit")
formularz.addEventListener('submit', async function (zdarzenie) {
  // Domyślnie formularz przeładowałby stronę – blokujemy to, bo sami obsłużymy dane
  zdarzenie.preventDefault();

  if (!zmniejszoneZdjecie) return; // zdjęcie jeszcze się zmniejsza

  // Tworzymy "obiekt" – paczkę informacji o jednym ubraniu
  const ubranie = {
    id: Date.now(), // unikalny numer: liczba milisekund od 1970 roku
    zdjecie: zmniejszoneZdjecie,
    kategoria: document.getElementById('kategoria').value,
    kolor: document.getElementById('kolor').value,
    sezony: zaznaczone('sezony'),
    okazje: zaznaczone('okazje'),
  };

  await zapiszUbranie(ubranie); // zapisujemy na stałe w bazie (funkcja z baza.js)
  ubrania.push(ubranie);        // i dodajemy na koniec listy w pamięci
  pokazUbrania();

  // Czyścimy formularz, żeby można było dodać kolejne ubranie
  formularz.reset();
  podglad.hidden = true;
  infoZdjecie.textContent = '';
  zmniejszoneZdjecie = null;
});

// ---------- WYŚWIETLANIE LISTY ----------

// Każde zdjęcie dostaje tymczasowy adres, żeby <img> mógł je pokazać.
// Zapamiętujemy adresy (Map = "słownik": id ubrania -> adres), żeby przy każdym
// kliknięciu w filtr nie tworzyć nowych – inaczej telefon zapychałby sobie pamięć.
const adresyZdjec = new Map();

function adresZdjecia(ubranie) {
  if (!adresyZdjec.has(ubranie.id)) {
    adresyZdjec.set(ubranie.id, URL.createObjectURL(ubranie.zdjecie));
  }
  return adresyZdjec.get(ubranie.id);
}

// Czy ubranie pasuje do wybranych filtrów? Zwraca true (tak) albo false (nie).
function pasujeDoFiltrow(ubranie) {
  const kategoria = filtrKategoria.value; // "" = Wszystkie
  const kolor = filtrKolor.value;
  const sezony = zaznaczone('filtr-sezony');
  const okazje = zaznaczone('filtr-okazje');

  // Każdy warunek, który NIE jest spełniony, od razu odrzuca ubranie ("return false")
  if (kategoria && ubranie.kategoria !== kategoria) return false;
  if (kolor && ubranie.kolor !== kolor) return false;

  // Sezon: wystarczy, że ubranie ma CHOĆ JEDEN z zaznaczonych sezonów (some = "którykolwiek").
  // Ubranie bez sezonów to "każdy sezon" – pasuje zawsze.
  if (sezony.length && ubranie.sezony.length &&
      !sezony.some(function (s) { return ubranie.sezony.includes(s); })) return false;

  // Okazja: tak samo jak sezon
  if (okazje.length && ubranie.okazje.length &&
      !okazje.some(function (o) { return ubranie.okazje.includes(o); })) return false;

  return true; // przeszło przez wszystkie warunki
}

// Rysuje od nowa kafelki z ubraniami – tylko te, które pasują do filtrów
function pokazUbrania() {
  lista.innerHTML = ''; // czyścimy stare kafelki

  // filter zostawia z listy tylko elementy, dla których pasujeDoFiltrow zwraca true
  const widoczne = ubrania.filter(pasujeDoFiltrow);

  // Filtry i licznik pokazujemy dopiero, gdy w szafie coś jest
  filtry.hidden = ubrania.length === 0;
  licznik.hidden = ubrania.length === 0;
  licznik.textContent = widoczne.length === ubrania.length
    ? 'Wszystkie: ' + ileUbran(ubrania.length)
    : 'Pokazuję ' + widoczne.length + ' z ' + ileUbran(ubrania.length);

  // Komunikat, gdy nie ma czego pokazać – inny dla pustej szafy, inny dla "nic nie pasuje"
  pusto.hidden = widoczne.length > 0;
  pusto.textContent = ubrania.length === 0
    ? 'Twoja szafa jest jeszcze pusta.'
    : 'Żadne ubranie nie pasuje do wybranych filtrów.';

  // Dla każdego widocznego ubrania tworzymy kafelek
  widoczne.forEach(function (ubranie) {
    const kafelek = document.createElement('div');
    kafelek.className = 'kafelek';

    const img = document.createElement('img');
    img.src = adresZdjecia(ubranie);
    img.alt = ubranie.kategoria + ', ' + ubranie.kolor;

    const opis = document.createElement('div');
    opis.className = 'opis';
    // join(', ') łączy listę w tekst: ["Jesień", "Zima"] -> "Jesień, Zima"
    opis.innerHTML =
      '<strong>' + ubranie.kategoria + '</strong>' +
      ubranie.kolor + '<br>' +
      (ubranie.sezony.join(', ') || 'każdy sezon') + '<br>' +
      (ubranie.okazje.join(', ') || 'każda okazja');

    kafelek.append(img, opis);
    lista.append(kafelek);
  });
}

// Wczytuje wszystkie ubrania z bazy do listy w pamięci i pokazuje je na stronie
async function wczytajIPokaz() {
  const zapisane = await wczytajUbrania();
  ubrania.length = 0;          // czyścimy listę w pamięci...
  ubrania.push(...zapisane);   // ...i wkładamy do niej wszystko z bazy ("..." rozpakowuje listę na pojedyncze elementy)
  pokazUbrania();
}

// ---------- FILTRY ----------

// Kopiujemy opcje z formularza do filtrów – dzięki temu listy kategorii, kolorów itd. są w jednym miejscu
function przygotujFiltry() {
  filtrKategoria.innerHTML = document.getElementById('kategoria').innerHTML;
  filtrKolor.innerHTML = document.getElementById('kolor').innerHTML;
  // Pierwsza opcja w formularzu to "— wybierz —"; w filtrach znaczy "pokaż wszystko"
  filtrKategoria.options[0].textContent = 'Wszystkie';
  filtrKolor.options[0].textContent = 'Wszystkie';

  document.getElementById('filtr-sezony').innerHTML = document.getElementById('sezony').innerHTML;
  document.getElementById('filtr-okazje').innerHTML = document.getElementById('okazje').innerHTML;
}

// Każda zmiana w panelu filtrów (wybór z listy, zaznaczenie pigułki) od razu odświeża listę
filtry.addEventListener('change', pokazUbrania);

// "Wyczyść filtry" – wracamy do "Wszystkie" i odznaczamy pigułki
document.getElementById('wyczysc-filtry').addEventListener('click', function () {
  filtrKategoria.value = '';
  filtrKolor.value = '';
  filtry.querySelectorAll('input:checked').forEach(function (pole) { pole.checked = false; });
  pokazUbrania();
});

// ---------- KOPIA ZAPASOWA ----------

// Zdjęcie (Blob) zamieniamy na długi tekst, bo plik kopii (JSON) może zawierać tylko tekst.
// Wynik wygląda tak: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
function zdjecieNaTekst(zdjecie) {
  return new Promise(function (gotowe) {
    const czytnik = new FileReader();
    czytnik.onload = function () { gotowe(czytnik.result); };
    czytnik.readAsDataURL(zdjecie);
  });
}

// I odwrotnie: tekst z pliku kopii zamieniamy z powrotem na zdjęcie
async function tekstNaZdjecie(tekst) {
  const odpowiedz = await fetch(tekst);
  return odpowiedz.blob();
}

// EKSPORT: zbieramy wszystkie ubrania w jeden plik .json i pobieramy go na urządzenie
przyciskEksportu.addEventListener('click', async function () {
  const kopia = {
    aplikacja: 'Moja szafa',
    wersja: 1, // numer formatu pliku – przyda się, gdy w przyszłości dodamy zestawy i kalendarz
    utworzono: new Date().toISOString(),
    ubrania: [],
  };

  for (const ubranie of ubrania) {
    // { ...ubranie, zdjecie: X } = "skopiuj wszystkie pola ubrania, ale zdjęcie podmień na X"
    kopia.ubrania.push({ ...ubranie, zdjecie: await zdjecieNaTekst(ubranie.zdjecie) });
  }

  // JSON.stringify zamienia obiekt na tekst, który można zapisać do pliku
  const plik = new Blob([JSON.stringify(kopia)], { type: 'application/json' });
  const dzisiaj = new Date().toISOString().slice(0, 10); // np. "2026-10-21"

  // Sztuczka: tworzymy niewidoczny link do pliku i "klikamy" go – przeglądarka pobiera plik
  const link = document.createElement('a');
  link.href = URL.createObjectURL(plik);
  link.download = 'szafa-kopia-' + dzisiaj + '.json';
  link.click();

  infoKopia.textContent = 'Zapisano kopię: ' + ileUbran(ubrania.length) + ' (' + rozmiarTekstem(plik.size) + ').';
});

// IMPORT: wczytujemy plik kopii i dodajemy ubrania do bazy.
// Ubrania, które już są w szafie (to samo id), zostaną nadpisane – nic się nie zdubluje.
poleImportu.addEventListener('change', async function () {
  const plik = poleImportu.files[0];
  if (!plik) return;

  // try/catch = "spróbuj; jeśli coś pójdzie nie tak, nie psuj strony, tylko pokaż komunikat"
  try {
    const kopia = JSON.parse(await plik.text()); // tekst z pliku -> obiekt
    if (!Array.isArray(kopia.ubrania)) throw new Error('brak listy ubrań');

    for (const ubranie of kopia.ubrania) {
      ubranie.zdjecie = await tekstNaZdjecie(ubranie.zdjecie);
      await zapiszUbranie(ubranie);
    }

    await wczytajIPokaz();
    infoKopia.textContent = 'Zaimportowano ' + ileUbran(kopia.ubrania.length) + '.';
  } catch (blad) {
    infoKopia.textContent = 'Nie udało się wczytać kopii – to chyba nie jest plik kopii szafy.';
  }

  poleImportu.value = ''; // pozwala wybrać ten sam plik jeszcze raz
});

// ---------- START ----------

// Po otwarciu strony przygotowujemy filtry i wczytujemy zapisane ubrania
przygotujFiltry();
wczytajIPokaz();

// Uruchamiamy pomocnika (service worker z pliku sw.js), dzięki któremu aplikacja działa bez internetu.
// "if" sprawdza, czy przeglądarka w ogóle to obsługuje.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(function () {
    // Nie udało się (np. przeglądarka to blokuje) – trudno, aplikacja działa dalej, tylko bez trybu offline
  });
}
