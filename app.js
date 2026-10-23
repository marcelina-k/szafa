// To jest JavaScript, czyli zachowanie strony. Mówi przeglądarce, CO MA SIĘ DZIAĆ.

// ---------- USTAWIENIA ----------

// Najdłuższy bok zdjęcia po zmniejszeniu (w pikselach). Zdjęcie z telefonu ma zwykle ok. 4000 px.
const MAKS_ROZMIAR = 1000;
// Jakość zapisu JPEG: 1 = najlepsza (duży plik), 0.8 = prawie bez różnicy dla oka, a plik dużo mniejszy
const JAKOSC = 0.8;

// ---------- KATEGORIE ----------

// Wszystkie kategorie i ich rodzaje (podkategorie) – JEDYNE miejsce, gdzie są zapisane.
// Formularz i filtry biorą je stąd. Chcesz dodać rodzaj? Dopisz go w nawiasie [ ] po przecinku.
// Chcesz dodać kategorię? Dopisz nową linijkę: 'Nazwa': ['rodzaj 1', 'rodzaj 2'],
const KATEGORIE = {
  'Góra ciepła': ['T-shirt', 'Bluzka', 'Koszula', 'Tank top', 'Longsleeve'],
  'Góra zimna': ['Sweter', 'Bluza'],
  'Dół spodnie': ['Materiałowe', 'Jeansy', 'Szorty', 'Legginsy', 'Legginsy dzwony', 'Bikery'],
  'Dół spódnica': ['Krótka', 'Midi', 'Długa'],
  'Sukienka / kombinezon': ['Krótka', 'Midi', 'Długa', 'Kombinezon'],
  'Okrycie wierzchnie': ['Kurtka', 'Płaszcz', 'Marynarka', 'Kamizelka', 'Trencz'],
  'Buty': ['Sneakersy', 'Botki', 'Kozaki', 'Szpilki', 'Sandały', 'Baleriny', 'Mokasyny', 'Japonki', 'Klapki'],
  'Dodatki': ['Torba', 'Torebka', 'Szalik', 'Chusta', 'Czapka', 'Czapka z daszkiem', 'Pasek', 'Rękawiczki', 'Biżuteria'],
};

// Stare nazwy kategorii (sprzed tej zmiany) -> nowe. Dzięki temu ubrania dodane wcześniej
// (i stare kopie zapasowe) trafią do nowych kategorii. Rodzaj trzeba będzie im uzupełnić ręcznie.
const STARE_KATEGORIE = {
  'Góra': 'Góra ciepła',
  'Dół': 'Dół spodnie',
  'Sukienka': 'Sukienka / kombinezon',
};

// ---------- DANE ----------

// Tablica (lista) wszystkich ubrań – kopia robocza w pamięci strony.
// Na stałe ubrania leżą w bazie (patrz baza.js); przy starcie wczytujemy je stamtąd.
const ubrania = [];

// Tu trzymamy zmniejszone zdjęcie, zanim klikniesz "Dodaj do szafy"
let zmniejszoneZdjecie = null;

// Numer (id) ubrania, które teraz edytujesz. null = nic nie edytujesz, formularz dodaje nowe ubranie.
let edytowaneId = null;

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
const poleKategorii = document.getElementById('kategoria');
const polePodkategorii = document.getElementById('podkategoria');
const filtrKategoria = document.getElementById('filtr-kategoria');
const filtrPodkategoria = document.getElementById('filtr-podkategoria');
const filtrKolor = document.getElementById('filtr-kolor');
const licznik = document.getElementById('licznik');

// ---------- ZMNIEJSZANIE ZDJĘCIA ----------

// Funkcja = przepis, który można wielokrotnie wykonać.
// Dostaje plik ze zdjęciem, zwraca mniejszą wersję:
//  - zwykłe zdjęcie -> JPEG (mały plik),
//  - zdjęcie z przezroczystym tłem (ubranie wycięte w iPhonie) -> PNG, przycięte do samego ubrania.
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
  const pedzel = plotno.getContext('2d');
  pedzel.drawImage(obrazek, 0, 0, szerokosc, wysokosc);

  // 4. Sprawdzamy, czy zdjęcie ma przezroczyste tło
  const ramka = granicePrzezroczystego(pedzel, szerokosc, wysokosc);

  // 5a. Zwykłe zdjęcie – zapisujemy jako JPEG (Blob = "kawałek danych", np. obrazek)
  if (!ramka) {
    return new Promise(function (gotowe) {
      plotno.toBlob(gotowe, 'image/jpeg', JAKOSC);
    });
  }

  // 5b. Wycięte ubranie – przycinamy puste brzegi i zapisujemy jako PNG (ten format pamięta przezroczystość)
  const przyciete = document.createElement('canvas');
  przyciete.width = ramka.szerokosc;
  przyciete.height = ramka.wysokosc;
  przyciete.getContext('2d').drawImage(
    plotno,
    ramka.x, ramka.y, ramka.szerokosc, ramka.wysokosc, // jaki fragment wziąć
    0, 0, ramka.szerokosc, ramka.wysokosc               // gdzie go narysować
  );
  return new Promise(function (gotowe) {
    przyciete.toBlob(gotowe, 'image/png');
  });
}

// Sprawdza piksel po pikselu, czy obrazek ma przezroczyste tło.
// Jeśli nie ma – zwraca null. Jeśli ma – zwraca prostokąt, w którym mieści się samo ubranie.
function granicePrzezroczystego(pedzel, szerokosc, wysokosc) {
  // getImageData daje listę liczb: dla każdego piksela 4 liczby – czerwony, zielony, niebieski, przezroczystość (0–255)
  const piksele = pedzel.getImageData(0, 0, szerokosc, wysokosc).data;
  let maPrzezroczyste = false;
  let lewo = szerokosc, gora = wysokosc, prawo = -1, dol = -1;

  for (let y = 0; y < wysokosc; y++) {
    for (let x = 0; x < szerokosc; x++) {
      const alfa = piksele[(y * szerokosc + x) * 4 + 3]; // 4. liczba piksela = przezroczystość
      if (alfa < 250) maPrzezroczyste = true;
      if (alfa > 10) { // piksel "widoczny" – należy do ubrania
        if (x < lewo) lewo = x;
        if (x > prawo) prawo = x;
        if (y < gora) gora = y;
        if (y > dol) dol = y;
      }
    }
  }

  if (!maPrzezroczyste || prawo < 0) return null;
  return { x: lewo, y: gora, szerokosc: prawo - lewo + 1, wysokosc: dol - gora + 1 };
}

// Czy ubranie ma wycięte tło? (wycięte zapisujemy jako PNG, zwykłe jako JPEG)
function czyWyciete(ubranie) {
  return maZdjecie(ubranie) && ubranie.zdjecie.type === 'image/png';
}

// Czy ubranie ma działające zdjęcie? (false, gdy zdjęcie się zgubiło – patrz baza.js)
function maZdjecie(ubranie) {
  return Boolean(ubranie.zdjecie) && !ubranie.zdjecieUszkodzone;
}

// Zamienia liczbę bajtów na czytelny tekst, np. 3 450 000 -> "3.3 MB"
function rozmiarTekstem(bajty) {
  if (bajty > 1024 * 1024) return (bajty / 1024 / 1024).toFixed(1) + ' MB';
  return Math.round(bajty / 1024) + ' KB';
}

// Odmienia słowo po polsku według liczby, np. odmien(5, 'ubranie', 'ubrania', 'ubrań') -> "5 ubrań".
// Formy: jeden (1 ubranie), kilka (2–4, 22–24... ubrania), wiele (5–21, 25... ubrań)
function odmien(liczba, jeden, kilka, wiele) {
  if (liczba === 1) return '1 ' + jeden;
  const jednosci = liczba % 10;   // ostatnia cyfra (% to reszta z dzielenia)
  const dziesiatki = liczba % 100; // dwie ostatnie cyfry
  if (jednosci >= 2 && jednosci <= 4 && (dziesiatki < 12 || dziesiatki > 14)) return liczba + ' ' + kilka;
  return liczba + ' ' + wiele;
}

function ileUbran(liczba) { return odmien(liczba, 'ubranie', 'ubrania', 'ubrań'); }
function ileZestawow(liczba) { return odmien(liczba, 'zestaw', 'zestawy', 'zestawów'); }

// Zmniejsza zdjęcie (z pliku albo ze schowka) i pokazuje podgląd
async function przyjmijZdjecie(plik) {
  zmniejszoneZdjecie = await zmniejszZdjecie(plik);

  podglad.src = URL.createObjectURL(zmniejszoneZdjecie);
  podglad.classList.toggle('wyciete', zmniejszoneZdjecie.type === 'image/png');
  podglad.hidden = false;
  infoZdjecie.textContent =
    (zmniejszoneZdjecie.type === 'image/png' ? 'Ubranie bez tła ✓ ' : 'Zdjęcie zmniejszone: ') +
    rozmiarTekstem(plik.size) + ' → ' + rozmiarTekstem(zmniejszoneZdjecie.size);
}

// Gdy wybierzesz zdjęcie (zdarzenie "change") – od razu je zmniejszamy i pokazujemy podgląd
poleZdjecia.addEventListener('change', async function () {
  const plik = poleZdjecia.files[0];
  if (!plik) return; // nic nie wybrano
  await przyjmijZdjecie(plik);
});

// "Wklej skopiowane zdjęcie" – bierzemy obrazek ze schowka (np. ubranie skopiowane w aplikacji Zdjęcia)
document.getElementById('wklej-zdjecie').addEventListener('click', async function () {
  try {
    // clipboard.read() prosi telefon o zawartość schowka. iPhone pokaże dymek "Wklej" – trzeba go stuknąć.
    const zawartosc = await navigator.clipboard.read();
    for (const element of zawartosc) {
      const typObrazka = element.types.find(function (typ) { return typ.startsWith('image/'); });
      if (typObrazka) {
        await przyjmijZdjecie(await element.getType(typObrazka));
        poleZdjecia.required = false; // mamy zdjęcie ze schowka, więc pole pliku może zostać puste
        return;
      }
    }
    infoZdjecie.textContent = 'W schowku nie ma zdjęcia. Skopiuj ubranie w aplikacji Zdjęcia i spróbuj jeszcze raz.';
  } catch (blad) {
    infoZdjecie.textContent = 'Nie udało się wkleić. Skopiuj zdjęcie jeszcze raz albo wybierz je przyciskiem powyżej.';
  }
});

// ---------- LISTY ROZWIJANE ----------

// Wypełnia listę rozwijaną: pierwsza opcja "pusta" (np. "— wybierz —"), potem wszystkie z listy
function wypelnijListe(lista, opcje, pierwszaOpcja) {
  lista.innerHTML = '';
  lista.append(new Option(pierwszaOpcja, '')); // new Option(tekst, wartość)
  opcje.forEach(function (opcja) { lista.append(new Option(opcja, opcja)); });
}

// Ustawia listę rodzajów pasującą do wybranej kategorii.
// Gdy kategoria nie jest wybrana – lista jest pusta i wyłączona.
function wypelnijRodzaje(listaRodzajow, kategoria, pierwszaOpcja) {
  wypelnijListe(listaRodzajow, KATEGORIE[kategoria] || [], pierwszaOpcja);
  listaRodzajow.disabled = !kategoria;
}

// Na starcie wpisujemy kategorie do formularza
wypelnijListe(poleKategorii, Object.keys(KATEGORIE), '— wybierz —'); // Object.keys = same nazwy kategorii
wypelnijRodzaje(polePodkategorii, '', '— najpierw kategoria —');

// Gdy zmienisz kategorię w formularzu – podmieniamy listę rodzajów
poleKategorii.addEventListener('change', function () {
  wypelnijRodzaje(polePodkategorii, poleKategorii.value, '— wybierz —');
});

// ---------- DODAWANIE UBRANIA ----------

// Zbiera wartości zaznaczonych checkboxów z danej grupy, np. ["Jesień", "Zima"]
function zaznaczone(idGrupy) {
  const pola = document.querySelectorAll('#' + idGrupy + ' input:checked');
  return Array.from(pola).map(function (pole) { return pole.value; });
}

// Gdy klikniesz "Dodaj do szafy" albo "Zapisz zmiany" (zdarzenie "submit")
formularz.addEventListener('submit', async function (zdarzenie) {
  // Domyślnie formularz przeładowałby stronę – blokujemy to, bo sami obsłużymy dane
  zdarzenie.preventDefault();

  // Wybrano zdjęcie, ale jeszcze się zmniejsza – poczekaj
  if (poleZdjecia.files.length && !zmniejszoneZdjecie) return;

  // Przy edycji szukamy starej wersji ubrania (find = "znajdź pierwszy pasujący element")
  const stare = ubrania.find(function (u) { return u.id === edytowaneId; });

  // Nowe ubranie musi mieć zdjęcie
  if (!stare && !zmniejszoneZdjecie) return;

  // Tworzymy "obiekt" – paczkę informacji o jednym ubraniu
  const ubranie = {
    // Przy edycji zostawiamy stary numer – dzięki temu baza nadpisze stare ubranie, a nie doda nowego.
    // Nowe ubranie dostaje unikalny numer: liczbę milisekund od 1970 roku.
    id: stare ? stare.id : Date.now(),
    // Nowe zdjęcie, a jeśli przy edycji go nie wybrano – stare
    zdjecie: zmniejszoneZdjecie || stare.zdjecie,
    // Jeśli stare zdjęcie było uszkodzone i nie wybrano nowego – nadal jest uszkodzone
    zdjecieUszkodzone: !zmniejszoneZdjecie && Boolean(stare && stare.zdjecieUszkodzone),
    kategoria: poleKategorii.value,
    podkategoria: polePodkategorii.value,
    kolor: document.getElementById('kolor').value,
    sezony: zaznaczone('sezony'),
    okazje: zaznaczone('okazje'),
    notatka: document.getElementById('notatka').value.trim(), // trim() obcina spacje na początku i końcu
    ulubione: document.getElementById('ulubione').checked,     // true albo false
  };

  await zapiszUbranie(ubranie); // zapisujemy na stałe w bazie (funkcja z baza.js)

  if (stare) {
    // Podmieniamy stare ubranie na nowe w tym samym miejscu listy (indexOf = "na którym miejscu jest")
    ubrania[ubrania.indexOf(stare)] = ubranie;
    if (zmniejszoneZdjecie) zapomnijZdjecie(stare.id); // zdjęcie się zmieniło – stary adres do kosza
  } else {
    ubrania.push(ubranie); // nowe ubranie – na koniec listy
  }

  zakonczEdycje(); // czyści formularz i wraca do trybu "Dodaj ubranie"
  pokazUbrania();
  pokazZestawy(); // zmienione zdjęcie albo nazwa mają być widoczne też w zestawach (funkcja z zestawy.js)
});

// ---------- EDYCJA I USUWANIE ----------

const tytulFormularza = document.getElementById('tytul-formularza');
const przyciskZapisz = document.getElementById('przycisk-zapisz');
const przyciskiEdycji = document.getElementById('przyciski-edycji');

// Zaznacza w grupie pigułek te, które są na liście, a resztę odznacza
function zaznaczPigulki(idGrupy, wartosci) {
  document.querySelectorAll('#' + idGrupy + ' input').forEach(function (pole) {
    pole.checked = wartosci.includes(pole.value);
  });
}

// Przełącza formularz w tryb edycji i wpisuje do niego dane ubrania
function rozpocznijEdycje(ubranie) {
  zakonczEdycje(); // na wypadek, gdyby edytowano już inne ubranie
  edytowaneId = ubranie.id;

  tytulFormularza.textContent = 'Edytuj ubranie';
  przyciskZapisz.textContent = 'Zapisz zmiany';
  przyciskiEdycji.hidden = false;

  // Zdjęcie przy edycji nie jest wymagane – jeśli nie wybierzesz nowego, zostaje stare
  poleZdjecia.required = false;
  podglad.src = adresZdjecia(ubranie);
  podglad.classList.toggle('wyciete', czyWyciete(ubranie));
  podglad.hidden = false;
  infoZdjecie.textContent = maZdjecie(ubranie)
    ? 'Wybierz nowe zdjęcie tylko, jeśli chcesz je zmienić.'
    : 'To ubranie straciło zdjęcie – wybierz albo wklej je ponownie.';

  // Wpisujemy dane ubrania do pól formularza
  poleKategorii.value = ubranie.kategoria;
  wypelnijRodzaje(polePodkategorii, poleKategorii.value, '— wybierz —');
  polePodkategorii.value = ubranie.podkategoria;
  document.getElementById('kolor').value = ubranie.kolor;
  zaznaczPigulki('sezony', ubranie.sezony);
  zaznaczPigulki('okazje', ubranie.okazje);
  document.getElementById('notatka').value = ubranie.notatka;
  document.getElementById('ulubione').checked = ubranie.ulubione;

  pokazUbrania(); // żeby zaznaczyć edytowany kafelek zieloną ramką
  formularz.scrollIntoView({ behavior: 'smooth' }); // przewijamy do formularza
}

// Wraca do zwykłego trybu "Dodaj ubranie" i czyści formularz
function zakonczEdycje() {
  edytowaneId = null;
  formularz.reset();
  wypelnijRodzaje(polePodkategorii, '', '— najpierw kategoria —');
  tytulFormularza.textContent = 'Dodaj ubranie';
  przyciskZapisz.textContent = 'Dodaj do szafy';
  przyciskiEdycji.hidden = true;
  poleZdjecia.required = true;
  podglad.hidden = true;
  infoZdjecie.textContent = '';
  zmniejszoneZdjecie = null;
}

document.getElementById('anuluj-edycje').addEventListener('click', function () {
  zakonczEdycje();
  pokazUbrania(); // zdejmujemy zieloną ramkę z kafelka
});

document.getElementById('usun-ubranie').addEventListener('click', async function () {
  const id = edytowaneId;

  // Sprawdzamy, w ilu zestawach jest to ubranie (lista "zestawy" jest w zestawy.js)
  const wZestawach = zestawy.filter(function (z) { return z.ubrania.includes(id); });
  let pytanie = 'Na pewno usunąć to ubranie? Tego nie da się cofnąć.';
  if (wZestawach.length) {
    pytanie += '\n\nLiczba zestawów z tym ubraniem: ' + wZestawach.length +
      '. Ubranie zniknie z nich, a reszta zestawów zostanie.';
  }

  // confirm pokazuje okienko z pytaniem i przyciskami OK / Anuluj. Zwraca true, jeśli klikniesz OK.
  if (!confirm(pytanie)) return;

  await usunUbranieZBazy(id); // funkcja z baza.js

  // Wyjmujemy ubranie ze wszystkich zestawów i zapisujemy je ponownie
  for (const zestaw of wZestawach) {
    zestaw.ubrania = zestaw.ubrania.filter(function (u) { return u !== id; });
    await zapiszZestaw(zestaw);
  }

  // Zostawiamy na liście wszystkie ubrania OPRÓCZ usuniętego
  const pozostale = ubrania.filter(function (u) { return u.id !== id; });
  ubrania.length = 0;
  ubrania.push(...pozostale);
  zapomnijZdjecie(id);

  zakonczEdycje();
  pokazUbrania();
  pokazZestawy();
});

// ---------- WYŚWIETLANIE LISTY ----------

// Każde zdjęcie dostaje tymczasowy adres, żeby <img> mógł je pokazać.
// Zapamiętujemy adresy (Map = "słownik": id ubrania -> adres), żeby przy każdym
// kliknięciu w filtr nie tworzyć nowych – inaczej telefon zapychałby sobie pamięć.
const adresyZdjec = new Map();

// Obrazek zastępczy dla ubrań, które straciły zdjęcie – szary kwadrat z napisem.
// To grafika SVG zapisana jako tekst (data:...), więc nie potrzebuje osobnego pliku.
const BRAK_ZDJECIA = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
  '<rect width="200" height="200" fill="#f1f3f5"/>' +
  '<text x="100" y="92" font-size="40" text-anchor="middle">📷</text>' +
  '<text x="100" y="130" font-size="15" fill="#868e96" text-anchor="middle" font-family="sans-serif">brak zdjęcia</text>' +
  '<text x="100" y="150" font-size="15" fill="#868e96" text-anchor="middle" font-family="sans-serif">dodaj ponownie</text>' +
  '</svg>'
);

function adresZdjecia(ubranie) {
  if (!maZdjecie(ubranie)) return BRAK_ZDJECIA;
  if (!adresyZdjec.has(ubranie.id)) {
    adresyZdjec.set(ubranie.id, URL.createObjectURL(ubranie.zdjecie));
  }
  return adresyZdjec.get(ubranie.id);
}

// Zwalnia pamięć po adresie zdjęcia (gdy ubranie usunięto albo zmieniono mu zdjęcie)
function zapomnijZdjecie(id) {
  if (adresyZdjec.has(id)) {
    URL.revokeObjectURL(adresyZdjec.get(id));
    adresyZdjec.delete(id);
  }
}

// Czy ubranie pasuje do wybranych filtrów? Zwraca true (tak) albo false (nie).
function pasujeDoFiltrow(ubranie) {
  const kategoria = filtrKategoria.value; // "" = Wszystkie
  const podkategoria = filtrPodkategoria.value;
  const kolor = filtrKolor.value;
  const sezony = zaznaczone('filtr-sezony');
  const okazje = zaznaczone('filtr-okazje');
  const tylkoUlubione = document.getElementById('filtr-ulubione').checked;

  // Każdy warunek, który NIE jest spełniony, od razu odrzuca ubranie ("return false")
  if (tylkoUlubione && !ubranie.ulubione) return false;
  if (kategoria && ubranie.kategoria !== kategoria) return false;
  if (podkategoria && ubranie.podkategoria !== podkategoria) return false;
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
  licznik.textContent = (widoczne.length === ubrania.length
    ? 'Wszystkie: ' + ileUbran(ubrania.length)
    : 'Pokazuję ' + widoczne.length + ' z ' + ileUbran(ubrania.length)) +
    ' · stuknij ubranie, aby je edytować';

  // Ostrzeżenie o ubraniach bez zdjęcia
  const bezZdjecia = ubrania.filter(function (u) { return !maZdjecie(u); }).length;
  const ostrzezenie = document.getElementById('ostrzezenie-zdjecia');
  ostrzezenie.hidden = bezZdjecia === 0;
  ostrzezenie.textContent = 'Ubrania bez zdjęcia: ' + bezZdjecia +
    '. Stuknij każde z nich i wybierz albo wklej zdjęcie ponownie – opis zostanie.';

  // Komunikat, gdy nie ma czego pokazać – inny dla pustej szafy, inny dla "nic nie pasuje"
  pusto.hidden = widoczne.length > 0;
  pusto.textContent = ubrania.length === 0
    ? 'Twoja szafa jest jeszcze pusta.'
    : 'Żadne ubranie nie pasuje do wybranych filtrów.';

  // Dla każdego widocznego ubrania tworzymy kafelek
  widoczne.forEach(function (ubranie) {
    // Kafelek to przycisk – stuknięcie otwiera edycję tego ubrania
    const kafelek = document.createElement('button');
    kafelek.type = 'button';
    kafelek.className = 'kafelek';
    if (ubranie.id === edytowaneId) kafelek.classList.add('edytowany');
    kafelek.addEventListener('click', function () { rozpocznijEdycje(ubranie); });

    const img = document.createElement('img');
    img.src = adresZdjecia(ubranie);
    if (czyWyciete(ubranie)) img.className = 'wyciete';

    // Gwiazdka w rogu kafelka dla ulubionych
    if (ubranie.ulubione) {
      const gwiazdka = document.createElement('span');
      gwiazdka.className = 'gwiazdka';
      gwiazdka.textContent = '★';
      kafelek.append(gwiazdka);
    }

    // Nazwa ubrania: rodzaj (np. "Sweter"), a gdy go brak – kategoria
    const nazwa = ubranie.podkategoria || ubranie.kategoria;
    img.alt = nazwa + ', ' + ubranie.kolor;

    const opis = document.createElement('span'); // w przycisku można umieszczać tylko "drobne" elementy, np. span
    opis.className = 'opis';

    // Każdą linijkę opisu tworzymy osobno i wpisujemy przez textContent (a nie innerHTML).
    // To ważne przy notatce, którą piszesz sama: textContent zawsze traktuje ją jako zwykły tekst,
    // więc nawet wpisane znaki < > nie zostaną potraktowane jak kod HTML.
    function linijka(tekst, klasa) {
      const element = document.createElement(klasa === 'nazwa' ? 'strong' : 'span');
      if (klasa === 'notatka') element.className = 'notatka';
      element.textContent = tekst;
      opis.append(element);
    }

    linijka(nazwa, 'nazwa');
    if (ubranie.podkategoria) linijka(ubranie.kategoria);
    linijka(ubranie.kolor);
    // join(', ') łączy listę w tekst: ["Jesień", "Zima"] -> "Jesień, Zima"
    linijka(ubranie.sezony.join(', ') || 'każdy sezon');
    linijka(ubranie.okazje.join(', ') || 'każda okazja');
    if (ubranie.notatka) linijka(ubranie.notatka, 'notatka');

    kafelek.append(img, opis);
    lista.append(kafelek);
  });
}

// Dopasowuje ubranie zapisane starszą wersją aplikacji do obecnej:
// zmienia stare nazwy kategorii na nowe i dodaje brakujące pola.
// Zwraca true, jeśli coś zmieniło (wtedy trzeba ubranie zapisać ponownie).
function uaktualnijUbranie(ubranie) {
  let zmienione = false;
  if (STARE_KATEGORIE[ubranie.kategoria]) {
    ubranie.kategoria = STARE_KATEGORIE[ubranie.kategoria];
    zmienione = true;
  }
  if (ubranie.podkategoria === undefined) { ubranie.podkategoria = ''; zmienione = true; }
  if (ubranie.notatka === undefined) { ubranie.notatka = ''; zmienione = true; }
  if (ubranie.ulubione === undefined) { ubranie.ulubione = false; zmienione = true; }
  return zmienione;
}

// Wczytuje wszystkie ubrania i zestawy z bazy do list w pamięci i pokazuje je na stronie
async function wczytajIPokaz() {
  const zapisane = await wczytajUbrania();
  for (const ubranie of zapisane) {
    // Sprawdzamy, czy zdjęcie da się odczytać (funkcja z baza.js)
    const cale = await zdjecieCale(ubranie.zdjecie);
    ubranie.zdjecieUszkodzone = !cale;

    // Zdjęcie zapisane dawnym sposobem i nadal całe – przepisujemy je na nowy, bezpieczny sposób
    const przepisz = ubranie.staryZapis && cale;
    delete ubranie.staryZapis;

    if (uaktualnijUbranie(ubranie) || przepisz) await zapiszUbranie(ubranie);
  }
  ubrania.length = 0;          // czyścimy listę w pamięci...
  ubrania.push(...zapisane);   // ...i wkładamy do niej wszystko z bazy ("..." rozpakowuje listę na pojedyncze elementy)

  const zapisaneZestawy = await wczytajZestawy();
  zestawy.length = 0;
  zestawy.push(...zapisaneZestawy);

  await wczytajKalendarzZBazy(); // funkcja z kalendarz.js

  pokazUbrania();
  pokazZestawy();
  pokazKalendarz();
}

// ---------- ZAKŁADKI ----------

// Pokazuje jeden widok (np. "widok-zestawy"), a pozostałe chowa
function pokazWidok(idWidoku) {
  document.querySelectorAll('.zakladka').forEach(function (zakladka) {
    // classList.toggle(nazwa, warunek) – dodaje klasę, gdy warunek jest prawdziwy, a usuwa, gdy nie
    zakladka.classList.toggle('aktywna', zakladka.dataset.widok === idWidoku);
    // Każda zakładka wie, który widok pokazuje – chowamy wszystkie oprócz wybranego
    document.getElementById(zakladka.dataset.widok).hidden = zakladka.dataset.widok !== idWidoku;
  });
  window.scrollTo(0, 0); // na górę strony
  // Kalendarz rysujemy od nowa przy każdym wejściu – mógł się zmienić zestaw albo zdjęcie ubrania –
  // i przewijamy do dzisiejszego dnia (funkcje z kalendarz.js)
  if (idWidoku === 'widok-kalendarz') {
    pokazKalendarz();
    przewinDoDzis();
  }
}

document.querySelectorAll('.zakladka').forEach(function (zakladka) {
  // dataset.widok to wartość atrybutu data-widok z HTML
  zakladka.addEventListener('click', function () { pokazWidok(zakladka.dataset.widok); });
});

// ---------- FILTRY ----------

// Wypełniamy filtry tymi samymi opcjami co formularz – listy są w jednym miejscu
function przygotujFiltry() {
  wypelnijListe(filtrKategoria, Object.keys(KATEGORIE), 'Wszystkie');
  wypelnijRodzaje(filtrPodkategoria, '', 'Wszystkie');
  // Kolory kopiujemy z formularza w HTML
  filtrKolor.innerHTML = document.getElementById('kolor').innerHTML;
  // Pierwsza opcja w formularzu to "— wybierz —"; w filtrach znaczy "pokaż wszystko"
  filtrKolor.options[0].textContent = 'Wszystkie';

  document.getElementById('filtr-sezony').innerHTML = document.getElementById('sezony').innerHTML;
  document.getElementById('filtr-okazje').innerHTML = document.getElementById('okazje').innerHTML;
}

// Zmiana kategorii w filtrach podmienia listę rodzajów (dzieje się to przed odświeżeniem listy poniżej)
filtrKategoria.addEventListener('change', function () {
  wypelnijRodzaje(filtrPodkategoria, filtrKategoria.value, 'Wszystkie');
});

// Każda zmiana w panelu filtrów (wybór z listy, zaznaczenie pigułki) od razu odświeża listę
filtry.addEventListener('change', pokazUbrania);

// "Wyczyść filtry" – wracamy do "Wszystkie" i odznaczamy pigułki
document.getElementById('wyczysc-filtry').addEventListener('click', function () {
  filtrKategoria.value = '';
  wypelnijRodzaje(filtrPodkategoria, '', 'Wszystkie');
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

// Kopia przygotowana, ale jeszcze niezapisana (patrz niżej – "NotAllowedError")
let przygotowanaKopia = null;
const przyciskPrzygotowanej = document.getElementById('zapisz-przygotowana');

przyciskPrzygotowanej.addEventListener('click', async function () {
  try {
    await navigator.share({ files: [przygotowanaKopia] });
    infoKopia.textContent = 'Kopia zapisana.';
    przyciskPrzygotowanej.hidden = true;
  } catch (blad) {
    infoKopia.textContent = 'Kopia nie została zapisana.';
  }
});

// EKSPORT: zbieramy wszystkie ubrania, zestawy i kalendarz w jeden plik .json i zapisujemy go na urządzeniu
przyciskEksportu.addEventListener('click', async function () {
  przyciskPrzygotowanej.hidden = true;
  infoKopia.textContent = 'Przygotowuję kopię…';
  const kopia = {
    aplikacja: 'Moja szafa',
    wersja: 3, // numer formatu pliku: 1 = same ubrania, 2 = + zestawy, 3 = + kalendarz
    utworzono: new Date().toISOString(),
    ubrania: [],
    zestawy: zestawy, // zestawy to sam tekst i numery ubrań – można je zapisać bez zmian
    kalendarz: Array.from(kalendarz.values()), // Map -> zwykła lista
  };

  for (const ubranie of ubrania) {
    // { ...ubranie, zdjecie: X } = "skopiuj wszystkie pola ubrania, ale zdjęcie podmień na X"
    // Uszkodzone zdjęcie zapisujemy jako null (= "brak") – i tak nie da się go odczytać
    const zdjecie = maZdjecie(ubranie) ? await zdjecieNaTekst(ubranie.zdjecie) : null;
    const { zdjecieUszkodzone, ...bezZnacznika } = ubranie; // kopia ubrania bez pola zdjecieUszkodzone
    kopia.ubrania.push({ ...bezZnacznika, zdjecie: zdjecie });
  }

  // JSON.stringify zamienia obiekt na tekst, który można zapisać do pliku
  const dzisiaj = new Date().toISOString().slice(0, 10); // np. "2026-10-21"
  const plik = new File([JSON.stringify(kopia)], 'szafa-kopia-' + dzisiaj + '.json', { type: 'application/json' });

  // Na telefonie: menu "Udostępnij" – stamtąd "Zachowaj w Plikach" (np. iCloud Drive)
  if (navigator.canShare && navigator.canShare({ files: [plik] })) {
    try {
      await navigator.share({ files: [plik] });
    } catch (blad) {
      if (blad.name === 'NotAllowedError') {
        // iPhone pozwala otworzyć menu tylko zaraz po stuknięciu, a przygotowanie kopii trwało za długo.
        // Pokazujemy osobny przycisk – jego stuknięcie otworzy menu od razu.
        przygotowanaKopia = plik;
        przyciskPrzygotowanej.hidden = false;
        infoKopia.textContent = 'Kopia gotowa – stuknij „Zapisz przygotowaną kopię”.';
      } else {
        infoKopia.textContent = 'Kopia nie została zapisana.'; // zamknięto menu bez wyboru
      }
      return;
    }
  } else {
    // Na komputerze: niewidoczny link do pliku, który "klikamy" – przeglądarka pobiera plik
    const link = document.createElement('a');
    link.href = URL.createObjectURL(plik);
    link.download = plik.name;
    link.click();
  }

  infoKopia.textContent = 'Zapisano kopię: ' + ileUbran(ubrania.length) + ', ' +
    ileZestawow(zestawy.length) + ' (' + rozmiarTekstem(plik.size) + ').';
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
      ubranie.zdjecie = ubranie.zdjecie ? await tekstNaZdjecie(ubranie.zdjecie) : null;
      await zapiszUbranie(ubranie);
    }

    // Starsze kopie (wersja 1) nie mają zestawów – wtedy bierzemy pustą listę
    const zestawyZKopii = kopia.zestawy || [];
    for (const zestaw of zestawyZKopii) {
      await zapiszZestaw(zestaw);
    }

    // Kalendarz jest dopiero od wersji 3
    for (const wpis of kopia.kalendarz || []) {
      await zapiszDzien(wpis);
    }

    await wczytajIPokaz();
    infoKopia.textContent = 'Zaimportowano ' + ileUbran(kopia.ubrania.length) + ', ' +
      ileZestawow(zestawyZKopii.length) + '.';
  } catch (blad) {
    infoKopia.textContent = 'Nie udało się wczytać kopii – to chyba nie jest plik kopii szafy.';
  }

  poleImportu.value = ''; // pozwala wybrać ten sam plik jeszcze raz
});

// ---------- START ----------

// Po otwarciu strony przygotowujemy filtry i wczytujemy zapisane ubrania i zestawy.
// "DOMContentLoaded" = "gdy cała strona i wszystkie skrypty są już wczytane" – czekamy na to,
// bo wczytajIPokaz korzysta też z pliku zestawy.js, który ładuje się po tym pliku.
document.addEventListener('DOMContentLoaded', function () {
  przygotujFiltry();
  wczytajIPokaz();
});

// Uruchamiamy pomocnika (service worker z pliku sw.js), dzięki któremu aplikacja działa bez internetu.
// "if" sprawdza, czy przeglądarka w ogóle to obsługuje.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(function () {
    // Nie udało się (np. przeglądarka to blokuje) – trudno, aplikacja działa dalej, tylko bez trybu offline
  });
}
