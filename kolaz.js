// Ten plik tworzy KOLAŻ zestawu: jedną grafikę, na której ubrania są ułożone "od głowy do stóp",
// jak na modowych kolażach z Pinteresta. Najlepiej wyglądają ubrania wycięte z tła.

// ---------- USTAWIENIA ----------

// Rozmiar grafiki w pikselach (proporcje 3:4 – dobre na telefon i Instagram)
const SZEROKOSC_KOLAZU = 1080;
const WYSOKOSC_KOLAZU = 1440;
const TLO_KOLAZU = '#ececec';

// Miejsca na kolażu dla każdej "roli" ubrania.
// Liczby to ułamki szerokości/wysokości grafiki: x: 0.08 = 8% od lewej, w: 0.60 = 60% szerokości itd.
const MIEJSCA = {
  gora:       { x: 0.08, y: 0.03, w: 0.60, h: 0.36 }, // jedna góra – u góry, na środku
  // Gdy w zestawie są dwie góry (np. koszulka i sweter) – leżą na sobie, lekko przesunięte
  goraSpod:   { x: 0.04, y: 0.04, w: 0.52, h: 0.34 }, // koszulka – pod spodem, bardziej w lewo
  goraWierzch:{ x: 0.24, y: 0.07, w: 0.54, h: 0.36 }, // sweter/bluza – na niej, bardziej w prawo
  sukienka:   { x: 0.18, y: 0.04, w: 0.56, h: 0.80 }, // duża, przez środek
  dol:        { x: 0.30, y: 0.33, w: 0.48, h: 0.63 }, // pod górą, góra lekko na niego zachodzi
  okrycie:    { x: 0.46, y: 0.14, w: 0.52, h: 0.47 }, // na wierzchu, po prawej
  torba:      { x: 0.02, y: 0.47, w: 0.36, h: 0.25 }, // po lewej, na wysokości bioder
  buty:       { x: 0.02, y: 0.76, w: 0.38, h: 0.22 }, // lewy dolny róg
  czapka:     { x: 0.70, y: 0.01, w: 0.28, h: 0.13 }, // prawy górny róg
  bizuteria:  { x: 0.03, y: 0.38, w: 0.15, h: 0.08 }, // mała, po lewej
};

// Dodatkowe miejsca – dla dodatków (szalik, pasek...) i kolejnych ubrań z tej samej roli
const WOLNE_MIEJSCA = [
  { x: 0.70, y: 0.62, w: 0.28, h: 0.18 },
  { x: 0.70, y: 0.80, w: 0.28, h: 0.18 },
  { x: 0.40, y: 0.82, w: 0.24, h: 0.16 },
  { x: 0.02, y: 0.22, w: 0.20, h: 0.14 },
];

// Kolejność rysowania = kolejność ubierania się. To, co narysowane później, leży "na wierzchu":
// koszulka -> spodnie/spódnica (koszulka jakby włożona do środka) -> sukienka -> sweter/bluza -> okrycie -> dodatki
const KOLEJNOSC_RYSOWANIA = ['goraCiepla', 'dol', 'sukienka', 'goraZimna', 'okrycie', 'torba', 'buty', 'dodatek', 'czapka', 'bizuteria'];

// ---------- ROZMIESZCZENIE ----------

// Do jakiej roli na kolażu pasuje ubranie?
function rolaUbrania(ubranie) {
  const rodzaj = ubranie.podkategoria;
  switch (ubranie.kategoria) {
    case 'Góra ciepła': return 'goraCiepla';
    case 'Góra zimna': return 'goraZimna';
    case 'Dół spodnie':
    case 'Dół spódnica': return 'dol';
    case 'Sukienka / kombinezon': return 'sukienka';
    case 'Okrycie wierzchnie': return 'okrycie';
    case 'Buty': return 'buty';
  }
  // Dodatki rozpoznajemy po rodzaju
  if (rodzaj === 'Czapka' || rodzaj === 'Czapka z daszkiem') return 'czapka';
  if (rodzaj === 'Torba' || rodzaj === 'Torebka') return 'torba';
  if (rodzaj === 'Biżuteria') return 'bizuteria';
  return 'dodatek';
}

// Przydziela każdemu ubraniu miejsce na kolażu. Zwraca listę { ubranie, miejsce } w kolejności rysowania.
function rozmiescUbrania(listaUbran) {
  const role = listaUbran.map(rolaUbrania);
  const zajete = {};    // które role mają już swoje miejsce
  const wolne = WOLNE_MIEJSCA.slice();
  const wynik = [];

  // Sortujemy ubrania według kolejności rysowania
  const posortowane = listaUbran
    .map(function (ubranie, i) { return { ubranie: ubranie, rola: role[i] }; })
    .sort(function (a, b) { return KOLEJNOSC_RYSOWANIA.indexOf(a.rola) - KOLEJNOSC_RYSOWANIA.indexOf(b.rola); });

  // Ile jest gór? Od tego zależy, czy leżą warstwowo (dwie), czy jedna na środku
  const saObieGory = role.includes('goraCiepla') && role.includes('goraZimna');
  const jestGoraLubSukienka = role.some(function (r) { return r === 'goraCiepla' || r === 'goraZimna' || r === 'sukienka'; });

  // Która rola dostaje które miejsce z MIEJSCA
  function miejsceDlaRoli(rola) {
    if (rola === 'goraCiepla') return saObieGory ? 'goraSpod' : 'gora';
    if (rola === 'goraZimna') return saObieGory ? 'goraWierzch' : 'gora';
    // Płaszcz bez góry i sukienki zajmuje miejsce góry (żeby nie wisiał samotnie z boku)
    if (rola === 'okrycie' && !jestGoraLubSukienka) return 'gora';
    if (rola === 'dodatek') return null; // dodatki idą na wolne miejsca
    return rola;
  }

  posortowane.forEach(function (element) {
    const nazwaMiejsca = miejsceDlaRoli(element.rola);

    let miejsce = null;
    if (nazwaMiejsca && !zajete[nazwaMiejsca]) {
      miejsce = MIEJSCA[nazwaMiejsca];
      zajete[nazwaMiejsca] = true;
    } else if (wolne.length) {
      miejsce = wolne.shift(); // shift() = weź pierwszy element listy i usuń go z niej
    }
    if (miejsce) wynik.push({ ubranie: element.ubranie, miejsce: miejsce });
  });

  return wynik;
}

// ---------- RYSOWANIE ----------

// Rysuje ścieżkę prostokąta z zaokrąglonymi rogami (do przycinania zwykłych zdjęć)
function sciezkaZaokraglona(pedzel, x, y, w, h, r) {
  pedzel.beginPath();
  pedzel.moveTo(x + r, y);
  pedzel.arcTo(x + w, y, x + w, y + h, r);
  pedzel.arcTo(x + w, y + h, x, y + h, r);
  pedzel.arcTo(x, y + h, x, y, r);
  pedzel.arcTo(x, y, x + w, y, r);
  pedzel.closePath();
}

// Tworzy grafikę kolażu. Zwraca obiekt { plik, pominiete, zTlem }.
async function stworzKolaz(zestaw) {
  const plotno = document.createElement('canvas');
  plotno.width = SZEROKOSC_KOLAZU;
  plotno.height = WYSOKOSC_KOLAZU;
  const pedzel = plotno.getContext('2d');

  // Tło
  pedzel.fillStyle = TLO_KOLAZU;
  pedzel.fillRect(0, 0, SZEROKOSC_KOLAZU, WYSOKOSC_KOLAZU);

  // Ubrania zestawu (funkcja z zestawy.js) – tylko te ze zdjęciem
  const wszystkie = ubraniaZestawu(zestaw);
  const listaUbran = wszystkie.filter(maZdjecie);
  const rozmieszczone = rozmiescUbrania(listaUbran);
  let zTlem = 0;

  for (const { ubranie, miejsce } of rozmieszczone) {
    const obrazek = await createImageBitmap(ubranie.zdjecie);

    // Miejsce w pikselach
    const mx = miejsce.x * SZEROKOSC_KOLAZU;
    const my = miejsce.y * WYSOKOSC_KOLAZU;
    const mw = miejsce.w * SZEROKOSC_KOLAZU;
    const mh = miejsce.h * WYSOKOSC_KOLAZU;

    // Dopasowujemy obrazek do miejsca, zachowując proporcje, i ustawiamy go na środku miejsca
    const skala = Math.min(mw / obrazek.width, mh / obrazek.height);
    const w = obrazek.width * skala;
    const h = obrazek.height * skala;
    const x = mx + (mw - w) / 2;
    const y = my + (mh - h) / 2;

    pedzel.save(); // zapamiętujemy ustawienia pędzla, żeby cień nie "przeciekał" na kolejne ubrania
    pedzel.shadowColor = 'rgba(0, 0, 0, 0.15)';
    pedzel.shadowBlur = 20;
    pedzel.shadowOffsetY = 6;

    if (czyWyciete(ubranie)) {
      // Wycięte ubranie rysujemy po prostu – przezroczyste tło nie zasłoni innych
      pedzel.drawImage(obrazek, x, y, w, h);
    } else {
      // Zwykłe zdjęcie: biały prostokąt z cieniem, a w nim zdjęcie z zaokrąglonymi rogami
      zTlem++;
      sciezkaZaokraglona(pedzel, x, y, w, h, 24);
      pedzel.fillStyle = 'white';
      pedzel.fill();
      pedzel.shadowColor = 'transparent';
      pedzel.clip(); // od teraz rysujemy tylko wewnątrz zaokrąglonego prostokąta
      pedzel.drawImage(obrazek, x, y, w, h);
    }
    pedzel.restore();
  }

  // Zapisujemy jako JPEG – grafika z jednolitym tłem jest wtedy kilka razy mniejsza niż PNG
  const blob = await new Promise(function (gotowe) { plotno.toBlob(gotowe, 'image/jpeg', 0.92); });
  const plik = new File([blob], nazwaPliku(zestaw.nazwa), { type: 'image/jpeg' });

  return {
    plik: plik,
    pominiete: listaUbran.length - rozmieszczone.length,
    bezZdjecia: wszystkie.length - listaUbran.length,
    zTlem: zTlem,
  };
}

// "Biuro – piątek" -> "zestaw-biuro-piatek.jpg" (bez polskich znaków i spacji, żeby nazwa działała wszędzie)
function nazwaPliku(nazwa) {
  const prosta = nazwa.toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // usuwa ogonki: ą -> a, ę -> e...
    .replace(/[^a-z0-9]+/g, '-')                      // wszystko inne -> myślnik
    .replace(/^-|-$/g, '');                           // bez myślników na początku i końcu
  return 'zestaw-' + (prosta || 'kolaz') + '.jpg';
}

// ---------- PAMIĘĆ GOTOWYCH KOLAŻY ----------

// Ułożenie kolażu chwilę trwa, więc gotowe kolaże zapamiętujemy: id zestawu -> { klucz, adres, wynik }.
// "Klucz" opisuje, z czego kolaż powstał (zdjęcia i kategorie ubrań). Gdy zmienisz zestaw albo
// zdjęcie ubrania, klucz będzie inny – wtedy układamy kolaż od nowa.
const gotoweKolaze = new Map();

function kluczKolazu(zestaw) {
  return ubraniaZestawu(zestaw)
    .map(function (u) { return adresZdjecia(u) + u.kategoria + u.podkategoria; })
    .join('|');
}

// Zwraca kolaż zestawu – z pamięci albo nowo ułożony
async function kolazZestawu(zestaw) {
  const klucz = kluczKolazu(zestaw);
  const zapamietany = gotoweKolaze.get(zestaw.id);
  if (zapamietany && zapamietany.klucz === klucz) return zapamietany;

  const wynik = await stworzKolaz(zestaw);
  if (zapamietany) URL.revokeObjectURL(zapamietany.adres); // stary kolaż już niepotrzebny
  const kolaz = { klucz: klucz, adres: URL.createObjectURL(wynik.plik), wynik: wynik };
  gotoweKolaze.set(zestaw.id, kolaz);
  return kolaz;
}

// ---------- SZCZEGÓŁY ZESTAWU ----------

const oknoKolazu = document.getElementById('okno-kolazu');
const obrazKolazu = document.getElementById('kolaz-obraz');
const infoKolazu = document.getElementById('kolaz-info');
const listaWZestawie = document.getElementById('kolaz-ubrania');
let zestawWOknie = null;

// Otwiera okno ze szczegółami: duży kolaż, opis, lista ubrań i przyciski
async function pokazSzczegolyZestawu(zestaw) {
  zestawWOknie = zestaw;
  document.getElementById('kolaz-tytul').textContent = (zestaw.ulubiony ? '★ ' : '') + zestaw.nazwa;
  document.getElementById('kolaz-opis').textContent = opisZestawu(zestaw); // funkcja z zestawy.js
  document.getElementById('kolaz-kalendarz').textContent = '📅 ' + opisUzyciaZestawu(zestaw); // z kalendarz.js

  // Lista ubrań: miniaturka + nazwa. Stuknięcie przenosi do edycji tego ubrania.
  listaWZestawie.innerHTML = '';
  ubraniaZestawu(zestaw).forEach(function (ubranie) {
    const wiersz = document.createElement('button');
    wiersz.type = 'button';
    wiersz.className = 'wiersz-ubrania';

    const img = document.createElement('img');
    img.src = adresZdjecia(ubranie);
    img.alt = '';
    if (czyWyciete(ubranie)) img.className = 'wyciete';

    const tekst = document.createElement('span');
    tekst.textContent = (ubranie.podkategoria || ubranie.kategoria) + ' · ' + ubranie.kolor.toLowerCase();

    wiersz.append(img, tekst);
    wiersz.addEventListener('click', function () {
      oknoKolazu.close();
      pokazWidok('widok-ubrania');  // funkcje z app.js
      rozpocznijEdycje(ubranie);
    });
    listaWZestawie.append(wiersz);
  });

  infoKolazu.textContent = 'Układam kolaż…';
  obrazKolazu.removeAttribute('src');
  oknoKolazu.showModal(); // pokazuje okno nad stroną
  oknoKolazu.scrollTop = 0;

  const kolaz = await kolazZestawu(zestaw);
  if (zestawWOknie !== zestaw) return; // w międzyczasie otwarto inny zestaw
  obrazKolazu.src = kolaz.adres;

  // Podpowiedzi pod kolażem
  const wynik = kolaz.wynik;
  const uwagi = [];
  if (wynik.zTlem) {
    uwagi.push('Wskazówka: ' + ileUbran(wynik.zTlem) + ' z tłem. Wytnij je w aplikacji Zdjęcia, a kolaż będzie ładniejszy.');
  }
  if (wynik.bezZdjecia) {
    uwagi.push('Bez zdjęcia (pominięte): ' + ileUbran(wynik.bezZdjecia) + '.');
  }
  if (wynik.pominiete) {
    uwagi.push('Nie zmieściło się: ' + ileUbran(wynik.pominiete) + '.');
  }
  infoKolazu.textContent = uwagi.join(' ');
}

document.getElementById('kolaz-zamknij').addEventListener('click', function () {
  oknoKolazu.close();
});

document.getElementById('kolaz-edytuj').addEventListener('click', function () {
  oknoKolazu.close();
  otworzFormularzZestawu(zestawWOknie); // funkcja z zestawy.js
});

document.getElementById('kolaz-udostepnij').addEventListener('click', async function () {
  if (!zestawWOknie) return;
  const plikKolazu = (await kolazZestawu(zestawWOknie)).wynik.plik;

  // Na telefonie: systemowe menu "Udostępnij" (stamtąd można zapisać do Zdjęć albo wysłać)
  if (navigator.canShare && navigator.canShare({ files: [plikKolazu] })) {
    try {
      await navigator.share({ files: [plikKolazu] });
    } catch (blad) {
      // Zamknięcie menu bez wybierania czegokolwiek to nie błąd – nic nie robimy
    }
    return;
  }

  // Na komputerze: zwykłe pobranie pliku
  const link = document.createElement('a');
  link.href = URL.createObjectURL(plikKolazu);
  link.download = plikKolazu.name;
  link.click();
});
