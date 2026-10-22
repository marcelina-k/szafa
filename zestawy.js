// Ten plik zajmuje się ZESTAWAMI: tworzeniem, edycją, usuwaniem i wyświetlaniem.
// Korzysta z rzeczy z app.js (np. lista "ubrania", adresZdjecia, zaznaczone) i baza.js (zapis).

// ---------- DANE ----------

// Lista wszystkich zestawów. Zestaw wygląda tak:
// { id: 1730000000000, nazwa: 'Biuro – piątek', ubrania: [id1, id2, id3], sezony: ['Jesień'], okazje: ['Praca'] }
// Zestaw nie przechowuje zdjęć – tylko NUMERY (id) ubrań. Zdjęcia bierzemy z listy ubrań.
const zestawy = [];

// Numer zestawu, który teraz edytujesz (null = tworzysz nowy)
let edytowanyZestawId = null;

// Numery ubrań zaznaczonych w formularzu zestawu
let wybraneUbrania = [];

// ---------- ELEMENTY STRONY ----------

const przyciskNowyZestaw = document.getElementById('nowy-zestaw');
const formularzZestawu = document.getElementById('formularz-zestawu');
const tytulZestawu = document.getElementById('tytul-zestawu');
const poleNazwyZestawu = document.getElementById('nazwa-zestawu');
const wyborKategoria = document.getElementById('wybor-kategoria');
const wyborUbran = document.getElementById('wybor-ubran');
const ileWybranych = document.getElementById('ile-wybranych');
const bladZestawu = document.getElementById('blad-zestawu');
const przyciskUsunZestaw = document.getElementById('usun-zestaw');
const listaZestawow = document.getElementById('lista-zestawow');
const pustoZestawy = document.getElementById('pusto-zestawy');

// ---------- POMOCNICZE ----------

// Szuka ubrania po numerze
function ubraniePoId(id) {
  return ubrania.find(function (u) { return u.id === id; });
}

// Zamienia numery ubrań na ubrania i układa je "od góry do dołu" – w kolejności kategorii z KATEGORIE
// (najpierw góry, potem doły, ..., buty, dodatki). Pomija ubrania, których już nie ma.
function ubraniaZestawu(zestaw) {
  const kolejnosc = Object.keys(KATEGORIE);
  return zestaw.ubrania
    .map(ubraniePoId)
    .filter(Boolean) // usuwa puste miejsca (ubrania, których nie znaleziono)
    .sort(function (a, b) { return kolejnosc.indexOf(a.kategoria) - kolejnosc.indexOf(b.kategoria); });
}

// ---------- WYBÓR UBRAŃ W FORMULARZU ----------

// Rysuje małą siatkę ubrań do zaznaczania (z uwzględnieniem wybranej kategorii)
function pokazWyborUbran() {
  wyborUbran.innerHTML = '';
  const kategoria = wyborKategoria.value;

  ubrania
    .filter(function (u) { return !kategoria || u.kategoria === kategoria; })
    .forEach(function (ubranie) {
      const przycisk = document.createElement('button');
      przycisk.type = 'button';
      przycisk.className = 'wybor';
      if (wybraneUbrania.includes(ubranie.id)) przycisk.classList.add('wybrany');

      const img = document.createElement('img');
      img.src = adresZdjecia(ubranie);
      img.alt = '';

      const podpis = document.createElement('span');
      podpis.textContent = (ubranie.podkategoria || ubranie.kategoria) + ', ' + ubranie.kolor.toLowerCase();

      przycisk.append(img, podpis);

      // Stuknięcie: jeśli ubranie było zaznaczone – odznaczamy, jeśli nie – zaznaczamy
      przycisk.addEventListener('click', function () {
        if (wybraneUbrania.includes(ubranie.id)) {
          wybraneUbrania = wybraneUbrania.filter(function (id) { return id !== ubranie.id; });
        } else {
          wybraneUbrania.push(ubranie.id);
        }
        bladZestawu.hidden = true;
        pokazWyborUbran();
      });

      wyborUbran.append(przycisk);
    });

  ileWybranych.textContent = wybraneUbrania.length ? '(wybrane: ' + wybraneUbrania.length + ')' : '';
}

wyborKategoria.addEventListener('change', pokazWyborUbran);

// ---------- OTWIERANIE I ZAMYKANIE FORMULARZA ----------

// Otwiera formularz. Bez zestawu = nowy zestaw; z zestawem = edycja tego zestawu.
function otworzFormularzZestawu(zestaw) {
  formularzZestawu.reset();
  bladZestawu.hidden = true;
  wyborKategoria.value = '';

  if (zestaw) {
    edytowanyZestawId = zestaw.id;
    tytulZestawu.textContent = 'Edytuj zestaw';
    poleNazwyZestawu.value = zestaw.nazwa;
    zaznaczPigulki('zestaw-sezony', zestaw.sezony);   // funkcja z app.js
    zaznaczPigulki('zestaw-okazje', zestaw.okazje);
    wybraneUbrania = zestaw.ubrania.slice(); // slice() robi kopię listy – zmiany nie ruszą zestawu, dopóki nie zapiszesz
    przyciskUsunZestaw.hidden = false;
  } else {
    edytowanyZestawId = null;
    tytulZestawu.textContent = 'Nowy zestaw';
    wybraneUbrania = [];
    przyciskUsunZestaw.hidden = true;
  }

  formularzZestawu.hidden = false;
  przyciskNowyZestaw.hidden = true;
  pokazWyborUbran();
  pokazZestawy(); // zielona ramka na edytowanym zestawie
  formularzZestawu.scrollIntoView({ behavior: 'smooth' });
}

function zamknijFormularzZestawu() {
  edytowanyZestawId = null;
  wybraneUbrania = [];
  formularzZestawu.hidden = true;
  przyciskNowyZestaw.hidden = false;
  pokazZestawy();
}

przyciskNowyZestaw.addEventListener('click', function () { otworzFormularzZestawu(null); });
document.getElementById('anuluj-zestaw').addEventListener('click', zamknijFormularzZestawu);

// ---------- ZAPISYWANIE I USUWANIE ----------

formularzZestawu.addEventListener('submit', async function (zdarzenie) {
  zdarzenie.preventDefault();

  // Zestaw bez ubrań nie ma sensu
  if (wybraneUbrania.length === 0) {
    bladZestawu.hidden = false;
    return;
  }

  const zestaw = {
    id: edytowanyZestawId || Date.now(),
    nazwa: poleNazwyZestawu.value.trim(),
    ubrania: wybraneUbrania.slice(),
    sezony: zaznaczone('zestaw-sezony'),
    okazje: zaznaczone('zestaw-okazje'),
  };

  await zapiszZestaw(zestaw); // funkcja z baza.js

  // Podmieniamy stary zestaw albo dodajemy nowy
  const miejsce = zestawy.findIndex(function (z) { return z.id === zestaw.id; });
  if (miejsce >= 0) zestawy[miejsce] = zestaw;
  else zestawy.push(zestaw);

  zamknijFormularzZestawu();
});

przyciskUsunZestaw.addEventListener('click', async function () {
  // Usuwamy tylko zestaw – ubrania zostają w szafie
  if (!confirm('Usunąć ten zestaw? Ubrania zostaną w szafie.')) return;

  const id = edytowanyZestawId;
  await usunZestawZBazy(id);
  const pozostale = zestawy.filter(function (z) { return z.id !== id; });
  zestawy.length = 0;
  zestawy.push(...pozostale);

  zamknijFormularzZestawu();
});

// ---------- LISTA ZESTAWÓW ----------

function pokazZestawy() {
  listaZestawow.innerHTML = '';

  // Komunikat, gdy nie ma zestawów (inny, gdy nie ma jeszcze nawet ubrań)
  pustoZestawy.hidden = zestawy.length > 0;
  pustoZestawy.textContent = ubrania.length === 0
    ? 'Najpierw dodaj ubrania w zakładce „Ubrania”.'
    : 'Nie masz jeszcze zestawów. Stuknij „+ Nowy zestaw”.';
  przyciskNowyZestaw.disabled = ubrania.length === 0;

  // Najnowsze zestawy na górze: kopiujemy listę i odwracamy kolejność
  zestawy.slice().reverse().forEach(function (zestaw) {
    const karta = document.createElement('button');
    karta.type = 'button';
    karta.className = 'karta-zestawu';
    if (zestaw.id === edytowanyZestawId) karta.classList.add('edytowany');
    karta.addEventListener('click', function () { otworzFormularzZestawu(zestaw); });

    const nazwa = document.createElement('strong');
    nazwa.textContent = zestaw.nazwa;

    // Druga linijka: sezony i okazje, np. "Jesień, Zima · Praca"
    const opis = document.createElement('span');
    opis.className = 'maly-tekst';
    opis.textContent = [zestaw.sezony.join(', '), zestaw.okazje.join(', ')]
      .filter(Boolean)
      .join(' · ') || 'każdy sezon i okazja';

    // Miniaturki ubrań
    const miniatury = document.createElement('span');
    miniatury.className = 'miniatury';
    ubraniaZestawu(zestaw).forEach(function (ubranie) {
      const img = document.createElement('img');
      img.src = adresZdjecia(ubranie);
      img.alt = ubranie.podkategoria || ubranie.kategoria;
      miniatury.append(img);
    });

    karta.append(nazwa, opis, miniatury);
    listaZestawow.append(karta);
  });
}

// ---------- START ----------

// Pigułki sezonu i okazji kopiujemy z formularza ubrań, a listę kategorii bierzemy z KATEGORIE
document.getElementById('zestaw-sezony').innerHTML = document.getElementById('sezony').innerHTML;
document.getElementById('zestaw-okazje').innerHTML = document.getElementById('okazje').innerHTML;
wypelnijListe(wyborKategoria, Object.keys(KATEGORIE), 'Wszystkie kategorie');
