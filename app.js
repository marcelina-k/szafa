// To jest JavaScript, czyli zachowanie strony. Mówi przeglądarce, CO MA SIĘ DZIAĆ.

// ---------- USTAWIENIA ----------

// Najdłuższy bok zdjęcia po zmniejszeniu (w pikselach). Zdjęcie z telefonu ma zwykle ok. 4000 px.
const MAKS_ROZMIAR = 1000;
// Jakość zapisu JPEG: 1 = najlepsza (duży plik), 0.8 = prawie bez różnicy dla oka, a plik dużo mniejszy
const JAKOSC = 0.8;

// ---------- DANE ----------

// Tablica (lista) wszystkich ubrań. Na razie żyje tylko w pamięci strony –
// po odświeżeniu znika. Trwały zapis dodamy w kroku 3.
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
formularz.addEventListener('submit', function (zdarzenie) {
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

  ubrania.push(ubranie); // dodajemy na koniec listy
  pokazUbrania();

  // Czyścimy formularz, żeby można było dodać kolejne ubranie
  formularz.reset();
  podglad.hidden = true;
  infoZdjecie.textContent = '';
  zmniejszoneZdjecie = null;
});

// ---------- WYŚWIETLANIE LISTY ----------

// Rysuje od nowa wszystkie kafelki z ubraniami
function pokazUbrania() {
  lista.innerHTML = ''; // czyścimy stare kafelki
  pusto.hidden = ubrania.length > 0; // napis "pusta szafa" tylko, gdy nie ma ubrań

  // Dla każdego ubrania tworzymy kafelek
  ubrania.forEach(function (ubranie) {
    const kafelek = document.createElement('div');
    kafelek.className = 'kafelek';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(ubranie.zdjecie);
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
