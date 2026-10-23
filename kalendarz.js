// Ten plik zajmuje się KALENDARZEM: planowaniem zestawów na dni tygodnia.
// Każdy dzień ma dwa miejsca – "dzień" i "wieczór" – oraz notatkę.

// ---------- DANE ----------

// Wpisy kalendarza: data -> wpis. Map to "słownik", w którym szybko znajdziemy dzień po dacie.
// Wpis wygląda tak: { data: '2026-10-24', dzien: id zestawu albo null, wieczor: id zestawu albo null, notatka: '' }
const kalendarz = new Map();

// Poniedziałek tygodnia, który teraz oglądasz
let poczatekTygodnia = poniedzialek(new Date());

// Który dzień i porę teraz wybierasz w oknie wyboru: { data, pora } (pora = 'dzien' albo 'wieczor')
let wybieranyTermin = null;

const PORY = { dzien: 'Dzień', wieczor: 'Wieczór' };

// Nazwy dni i miesięcy. getDay() liczy od niedzieli: 0 = niedziela, 1 = poniedziałek...
const DNI = ['niedz', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'];
const MIESIACE = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

// ---------- DATY ----------

// Data -> tekst "2026-10-24" (tak zapisujemy dni w bazie; taki zapis dobrze się sortuje)
function dataKlucz(data) {
  const miesiac = String(data.getMonth() + 1).padStart(2, '0'); // padStart dopisuje zero: 9 -> "09"
  const dzien = String(data.getDate()).padStart(2, '0');
  return data.getFullYear() + '-' + miesiac + '-' + dzien;
}

// Tekst "2026-10-24" -> data
function kluczNaDate(klucz) {
  const [rok, miesiac, dzien] = klucz.split('-').map(Number);
  return new Date(rok, miesiac - 1, dzien); // miesiące w JavaScript liczą się od 0!
}

// Poniedziałek tygodnia, w którym jest podana data
function poniedzialek(data) {
  const wynik = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const ileDniOdPoniedzialku = (wynik.getDay() + 6) % 7; // pon -> 0, wt -> 1, ..., niedz -> 6
  wynik.setDate(wynik.getDate() - ileDniOdPoniedzialku);
  return wynik;
}

function dodajDni(data, ile) {
  const wynik = new Date(data);
  wynik.setDate(wynik.getDate() + ile);
  return wynik;
}

// Data -> "pt 24.10"
function krotkaData(data) {
  return DNI[data.getDay()] + ' ' + data.getDate() + '.' + String(data.getMonth() + 1).padStart(2, '0');
}

// Zakres tygodnia, np. "20–26 paź 2026" albo "27 paź – 2 lis 2026"
function opisTygodnia(poczatek) {
  const koniec = dodajDni(poczatek, 6);
  if (poczatek.getMonth() === koniec.getMonth()) {
    return poczatek.getDate() + '–' + koniec.getDate() + ' ' + MIESIACE[koniec.getMonth()] + ' ' + koniec.getFullYear();
  }
  return poczatek.getDate() + ' ' + MIESIACE[poczatek.getMonth()] + ' – ' +
    koniec.getDate() + ' ' + MIESIACE[koniec.getMonth()] + ' ' + koniec.getFullYear();
}

// ---------- ZAPIS ----------

// Wpis danego dnia (albo pusty, jeśli nic nie zaplanowano)
function wpisDnia(klucz) {
  return kalendarz.get(klucz) || { data: klucz, dzien: null, wieczor: null, notatka: '' };
}

// Zapisuje wpis. Pusty dzień (bez zestawów i notatki) usuwamy, żeby nie zaśmiecać bazy.
async function zapiszWpis(wpis) {
  if (!wpis.dzien && !wpis.wieczor && !wpis.notatka) {
    kalendarz.delete(wpis.data);
    await usunDzienZBazy(wpis.data);
  } else {
    kalendarz.set(wpis.data, wpis);
    await zapiszDzien(wpis);
  }
}

// Po usunięciu zestawu – zdejmujemy go ze wszystkich dni (wywołuje to zestawy.js)
async function usunZestawZKalendarza(idZestawu) {
  for (const wpis of Array.from(kalendarz.values())) {
    if (wpis.dzien !== idZestawu && wpis.wieczor !== idZestawu) continue; // continue = "pomiń ten wpis"
    const nowy = { ...wpis };
    if (nowy.dzien === idZestawu) nowy.dzien = null;
    if (nowy.wieczor === idZestawu) nowy.wieczor = null;
    await zapiszWpis(nowy);
  }
}

// ---------- KIEDY ZESTAW BYŁ NOSZONY ----------

// Tekst do szczegółów zestawu, np. "Ostatnio: pt 17.10 · Zaplanowany: pon 27.10"
function opisUzyciaZestawu(zestaw) {
  const dzis = dataKlucz(new Date());
  const daty = Array.from(kalendarz.values())
    .filter(function (w) { return w.dzien === zestaw.id || w.wieczor === zestaw.id; })
    .map(function (w) { return w.data; })
    .sort(); // daty zapisane jako "RRRR-MM-DD" sortują się same we właściwej kolejności

  const minione = daty.filter(function (d) { return d < dzis; });
  const przyszle = daty.filter(function (d) { return d >= dzis; });

  const czesci = [];
  if (minione.length) czesci.push('Ostatnio: ' + krotkaData(kluczNaDate(minione[minione.length - 1])));
  if (przyszle.length) czesci.push((przyszle[0] === dzis ? 'Dziś' : 'Zaplanowany: ' + krotkaData(kluczNaDate(przyszle[0]))));
  return czesci.join(' · ') || 'Jeszcze nie ma go w kalendarzu.';
}

// ---------- WIDOK TYGODNIA ----------

const dniTygodnia = document.getElementById('dni-tygodnia');

function pokazKalendarz() {
  document.getElementById('zakres-tygodnia').textContent = opisTygodnia(poczatekTygodnia);
  dniTygodnia.innerHTML = '';
  const dzis = dataKlucz(new Date());

  for (let i = 0; i < 7; i++) {
    const data = dodajDni(poczatekTygodnia, i);
    const klucz = dataKlucz(data);
    const wpis = wpisDnia(klucz);

    const karta = document.createElement('div');
    karta.className = 'dzien-kalendarza';
    if (klucz === dzis) karta.classList.add('dzis');
    if (klucz < dzis) karta.classList.add('miniony');

    const naglowek = document.createElement('div');
    naglowek.className = 'dzien-naglowek';
    naglowek.textContent = krotkaData(data) + (klucz === dzis ? ' · dziś' : '');

    // Miejsca na zestawy. "Wieczór" pokazujemy jako mały przycisk, dopóki jest pusty – mniej bałaganu.
    const sloty = document.createElement('div');
    sloty.className = 'sloty';
    sloty.append(slotZestawu(wpis, 'dzien'));
    sloty.append(slotZestawu(wpis, 'wieczor'));

    // Notatka do dnia – zapisuje się sama po wpisaniu (zdarzenie "change" = gdy opuścisz pole)
    const notatka = document.createElement('input');
    notatka.type = 'text';
    notatka.className = 'notatka-dnia';
    notatka.maxLength = 80;
    notatka.placeholder = 'Notatka, np. spotkanie, wesele…';
    notatka.value = wpis.notatka;
    notatka.addEventListener('change', function () {
      zapiszWpis({ ...wpisDnia(klucz), notatka: notatka.value.trim() });
    });

    karta.append(naglowek, sloty, notatka);
    dniTygodnia.append(karta);
  }
}

// Jedno miejsce na zestaw: kolaż + nazwa albo przycisk "+ Dzień" / "+ Wieczór"
function slotZestawu(wpis, pora) {
  const przycisk = document.createElement('button');
  przycisk.type = 'button';
  przycisk.addEventListener('click', function () { otworzWyborZestawu(wpis.data, pora); });

  const zestaw = zestawy.find(function (z) { return z.id === wpis[pora]; }); // wpis[pora] = wpis.dzien albo wpis.wieczor

  if (!zestaw) {
    przycisk.className = 'slot slot-pusty' + (pora === 'wieczor' ? ' slot-maly' : '');
    przycisk.textContent = '+ ' + PORY[pora];
    return przycisk;
  }

  przycisk.className = 'slot';
  const obraz = document.createElement('img');
  obraz.alt = '';
  kolazZestawu(zestaw).then(function (kolaz) { obraz.src = kolaz.adres; }); // funkcja z kolaz.js

  const tekst = document.createElement('span');
  const etykieta = document.createElement('span');
  etykieta.className = 'maly-tekst';
  etykieta.textContent = PORY[pora];
  const nazwa = document.createElement('strong');
  nazwa.textContent = zestaw.nazwa;
  tekst.append(etykieta, nazwa);

  przycisk.append(obraz, tekst);
  return przycisk;
}

// Przełączanie tygodni
document.getElementById('poprzedni-tydzien').addEventListener('click', function () {
  poczatekTygodnia = dodajDni(poczatekTygodnia, -7);
  pokazKalendarz();
});
document.getElementById('nastepny-tydzien').addEventListener('click', function () {
  poczatekTygodnia = dodajDni(poczatekTygodnia, 7);
  pokazKalendarz();
});
document.getElementById('dzisiejszy-tydzien').addEventListener('click', function () {
  poczatekTygodnia = poniedzialek(new Date());
  pokazKalendarz();
  przewinDoDzis();
});

// Przewija stronę do dzisiejszego dnia (jeśli jest w oglądanym tygodniu)
function przewinDoDzis() {
  const dzis = dniTygodnia.querySelector('.dzis');
  if (dzis) dzis.scrollIntoView({ block: 'start' });
}

// ---------- WYBÓR ZESTAWU ----------

const oknoWyboru = document.getElementById('okno-wyboru');
const wyborZestawow = document.getElementById('wybor-zestawow');
const wyborTylkoUlubione = document.getElementById('wybor-tylko-ulubione');

function otworzWyborZestawu(klucz, pora) {
  wybieranyTermin = { data: klucz, pora: pora };
  document.getElementById('wybor-tytul').textContent =
    krotkaData(kluczNaDate(klucz)) + ' · ' + PORY[pora].toLowerCase();
  // "Usuń z tego dnia" ma sens tylko, gdy coś już jest zaplanowane
  document.getElementById('wybor-usun').hidden = !wpisDnia(klucz)[pora];
  pokazZestawyDoWyboru();
  oknoWyboru.showModal();
}

function pokazZestawyDoWyboru() {
  wyborZestawow.innerHTML = '';
  const aktualny = wpisDnia(wybieranyTermin.data)[wybieranyTermin.pora];
  const lista = zestawy
    .filter(function (z) { return !wyborTylkoUlubione.checked || z.ulubiony; })
    .slice().reverse(); // najnowsze na górze

  const pusto = document.getElementById('wybor-pusto');
  pusto.hidden = lista.length > 0;
  pusto.textContent = zestawy.length === 0
    ? 'Nie masz jeszcze zestawów. Stwórz je w zakładce „Zestawy”.'
    : 'Nie masz jeszcze ulubionych zestawów.';

  lista.forEach(function (zestaw) {
    const przycisk = document.createElement('button');
    przycisk.type = 'button';
    przycisk.className = 'wybor';
    if (zestaw.id === aktualny) przycisk.classList.add('wybrany');

    const obraz = document.createElement('img');
    obraz.alt = '';
    obraz.className = 'kolaz-wybor';
    kolazZestawu(zestaw).then(function (kolaz) { obraz.src = kolaz.adres; });

    const podpis = document.createElement('span');
    podpis.textContent = (zestaw.ulubiony ? '★ ' : '') + zestaw.nazwa;

    przycisk.append(obraz, podpis);
    przycisk.addEventListener('click', async function () {
      const wpis = { ...wpisDnia(wybieranyTermin.data) };
      wpis[wybieranyTermin.pora] = zestaw.id;
      await zapiszWpis(wpis);
      oknoWyboru.close();
      pokazKalendarz();
    });
    wyborZestawow.append(przycisk);
  });
}

wyborTylkoUlubione.addEventListener('change', pokazZestawyDoWyboru);

document.getElementById('wybor-anuluj').addEventListener('click', function () { oknoWyboru.close(); });

document.getElementById('wybor-usun').addEventListener('click', async function () {
  const wpis = { ...wpisDnia(wybieranyTermin.data) };
  wpis[wybieranyTermin.pora] = null;
  await zapiszWpis(wpis);
  oknoWyboru.close();
  pokazKalendarz();
});

// ---------- WCZYTYWANIE ----------

// Wczytuje kalendarz z bazy (wywołuje to wczytajIPokaz w app.js)
async function wczytajKalendarzZBazy() {
  const wpisy = await wczytajKalendarz();
  kalendarz.clear();
  wpisy.forEach(function (wpis) { kalendarz.set(wpis.data, wpis); });
}
