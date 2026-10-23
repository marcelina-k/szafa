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
  gora:      { x: 0.08, y: 0.03, w: 0.60, h: 0.36 }, // u góry, na środku
  sukienka:  { x: 0.18, y: 0.04, w: 0.56, h: 0.80 }, // duża, przez środek
  dol:       { x: 0.30, y: 0.33, w: 0.48, h: 0.63 }, // pod górą, lekko na nią zachodzi
  okrycie:   { x: 0.52, y: 0.10, w: 0.45, h: 0.45 }, // obok góry, po prawej
  torba:     { x: 0.02, y: 0.45, w: 0.36, h: 0.26 }, // po lewej, na wysokości bioder
  buty:      { x: 0.02, y: 0.76, w: 0.38, h: 0.22 }, // lewy dolny róg
  czapka:    { x: 0.68, y: 0.02, w: 0.30, h: 0.17 }, // prawy górny róg
  bizuteria: { x: 0.76, y: 0.22, w: 0.16, h: 0.10 }, // mała, po prawej
};

// Dodatkowe miejsca – dla dodatków (szalik, pasek...) i drugiego ubrania z tej samej roli
const WOLNE_MIEJSCA = [
  { x: 0.70, y: 0.56, w: 0.28, h: 0.20 },
  { x: 0.02, y: 0.24, w: 0.26, h: 0.20 },
  { x: 0.70, y: 0.78, w: 0.28, h: 0.20 },
  { x: 0.40, y: 0.82, w: 0.24, h: 0.16 },
];

// Kolejność rysowania: to, co narysowane później, leży "na wierzchu".
// Dół rysujemy przed górą, żeby sweter zachodził na spodnie – jak na prawdziwym kolażu.
const KOLEJNOSC_RYSOWANIA = ['okrycie', 'dol', 'sukienka', 'gora', 'torba', 'buty', 'dodatek', 'czapka', 'bizuteria'];

// ---------- ROZMIESZCZENIE ----------

// Do jakiej roli na kolażu pasuje ubranie?
function rolaUbrania(ubranie) {
  const rodzaj = ubranie.podkategoria;
  switch (ubranie.kategoria) {
    case 'Góra ciepła':
    case 'Góra zimna': return 'gora';
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

  posortowane.forEach(function (element) {
    let rola = element.rola;
    // Płaszcz bez góry i sukienki zajmuje miejsce góry (żeby nie wisiał samotnie z boku)
    if (rola === 'okrycie' && !role.includes('gora') && !role.includes('sukienka')) rola = 'gora';

    let miejsce = null;
    if (rola !== 'dodatek' && !zajete[rola]) {
      miejsce = MIEJSCA[rola];
      zajete[rola] = true;
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

  const listaUbran = ubraniaZestawu(zestaw); // funkcja z zestawy.js
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

  return { plik: plik, pominiete: listaUbran.length - rozmieszczone.length, zTlem: zTlem };
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

// ---------- OKNO KOLAŻU ----------

const oknoKolazu = document.getElementById('okno-kolazu');
const obrazKolazu = document.getElementById('kolaz-obraz');
const infoKolazu = document.getElementById('kolaz-info');
let plikKolazu = null;

async function pokazKolaz(zestaw) {
  document.getElementById('kolaz-tytul').textContent = zestaw.nazwa;
  infoKolazu.textContent = 'Układam kolaż…';
  obrazKolazu.removeAttribute('src');
  oknoKolazu.showModal(); // pokazuje okno nad stroną

  const wynik = await stworzKolaz(zestaw);
  plikKolazu = wynik.plik;
  obrazKolazu.src = URL.createObjectURL(plikKolazu);

  // Podpowiedzi pod kolażem
  const uwagi = [];
  if (wynik.zTlem) {
    uwagi.push('Wskazówka: ' + ileUbran(wynik.zTlem) + ' z tłem. Wytnij je w aplikacji Zdjęcia, a kolaż będzie ładniejszy.');
  }
  if (wynik.pominiete) {
    uwagi.push('Nie zmieściło się: ' + ileUbran(wynik.pominiete) + '.');
  }
  infoKolazu.textContent = uwagi.join(' ');
}

document.getElementById('kolaz-zamknij').addEventListener('click', function () {
  oknoKolazu.close();
  if (obrazKolazu.src) URL.revokeObjectURL(obrazKolazu.src);
});

document.getElementById('kolaz-udostepnij').addEventListener('click', async function () {
  if (!plikKolazu) return;

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
