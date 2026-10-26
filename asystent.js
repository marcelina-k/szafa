// ASYSTENT – sam składa zestawy z Twoich ubrań.
// Jak działa:
//  1. Losuje wiele (np. 400) zestawów zbudowanych według zasad (góra + dół albo sukienka, buty, okrycie...).
//  2. Każdemu przyznaje punkty: za dobre połączenie kolorów, trendy (trendy.js), ulubione;
//     odejmuje za ubrania noszone w ostatnich dniach (z kalendarza) i za "gryzące się" kolory.
//  3. Pokazuje zestaw z największą liczbą punktów – razem z wyjaśnieniem, za co je dostał.

// ---------- USTAWIENIA ----------

const ILE_LOSOWAN = 400;
const NEUTRALNE = ['Biały', 'Czarny', 'Szary', 'Beżowy', 'Brązowy', 'Granatowy'];
const ZIEMISTE = ['Beżowy', 'Brązowy', 'Bordowy']; // ciepłe, ziemiste odcienie – dobrze wyglądają razem

// Szansa (0–1), że do zestawu trafi okrycie, zależnie od sezonu
const SZANSA_OKRYCIA = { 'Wiosna': 0.4, 'Lato': 0, 'Jesień': 0.75, 'Zima': 1 };

// Szansa (0–1), że będą dwie warstwy okrycia: marynarka/kamizelka + płaszcz/kurtka
// (które okrycia mogą być pod spodem – patrz OKRYCIA_POD_SPOD w kolaz.js)
const SZANSA_DWOCH_OKRYC = { 'Wiosna': 0, 'Lato': 0, 'Jesień': 0.25, 'Zima': 0.5 };

// ---------- POMOCNICZE ----------

// Bieżący sezon według miesiąca (getMonth: 0 = styczeń)
function biezacySezon() {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'Wiosna';
  if (m >= 5 && m <= 7) return 'Lato';
  if (m >= 8 && m <= 10) return 'Jesień';
  return 'Zima';
}

// Losowy element listy (albo null, gdy lista pusta)
function losowy(lista) {
  return lista.length ? lista[Math.floor(Math.random() * lista.length)] : null;
}

// Krótka nazwa ubrania do wyjaśnień, np. "sweter (bordowy)".
// Kolor w nawiasie, bo "bordowy torebka" brzmiałoby źle – przymiotnik musiałby się odmieniać.
function nazwaUbrania(u) {
  return (u.podkategoria || u.kategoria).toLowerCase() + ' (' + u.kolor.toLowerCase() + ')';
}

// "na wiosnę", "na lato", "na jesień", "na zimę"
const NA_SEZON = { 'Wiosna': 'na wiosnę', 'Lato': 'na lato', 'Jesień': 'na jesień', 'Zima': 'na zimę' };

// Główne ubrania zestawu (bez okrycia i dodatków) – po nich rozpoznajemy, czy propozycja jest "nowa"
function kluczGlowny(lista) {
  return lista
    .filter(function (u) { return u.kategoria !== 'Dodatki' && u.kategoria !== 'Okrycie wierzchnie'; })
    .map(function (u) { return u.id; })
    .sort()
    .join(',');
}

// Ubrania noszone w ostatnich 7 dniach (według kalendarza) – zbiór ich numerów
function ostatnioNoszone() {
  const dzis = dataKlucz(new Date());           // funkcje z kalendarz.js
  const tydzienTemu = dataKlucz(dodajDni(new Date(), -7));
  const noszone = new Set();                     // Set = lista bez powtórzeń
  kalendarz.forEach(function (wpis) {
    if (wpis.data < tydzienTemu || wpis.data >= dzis) return;
    [wpis.dzien, wpis.wieczor].forEach(function (idZestawu) {
      const zestaw = zestawy.find(function (z) { return z.id === idZestawu; });
      if (zestaw) zestaw.ubrania.forEach(function (id) { noszone.add(id); });
    });
  });
  return noszone;
}

// ---------- BUDOWANIE ZESTAWU ----------

// Dzieli pasujące ubrania na grupy (góry, doły, sukienki...)
function przygotujGrupy(sezon, okazja) {
  const pasujace = ubrania.filter(function (u) {
    if (!maZdjecie(u)) return false; // bez zdjęcia nie ułożymy kolażu
    const sezonOk = u.sezony.length === 0 || u.sezony.includes(sezon);
    const okazjaOk = !okazja || u.okazje.length === 0 || u.okazje.includes(okazja);
    return sezonOk && okazjaOk;
  });
  function zKategorii() {
    const kategorie = Array.from(arguments); // arguments = wszystko, co podano funkcji
    return pasujace.filter(function (u) { return kategorie.includes(u.kategoria); });
  }
  return {
    goryCieple: zKategorii('Góra ciepła'),
    goryZimne: zKategorii('Góra zimna'),
    doly: zKategorii('Dół spodnie', 'Dół spódnica'),
    sukienki: zKategorii('Sukienka / kombinezon'),
    okrycia: zKategorii('Okrycie wierzchnie'),
    buty: zKategorii('Buty'),
    torby: pasujace.filter(function (u) { return u.podkategoria === 'Torba' || u.podkategoria === 'Torebka'; }),
    dodatki: pasujace.filter(function (u) {
      return u.kategoria === 'Dodatki' && u.podkategoria !== 'Torba' && u.podkategoria !== 'Torebka';
    }),
  };
}

// Losuje jeden zestaw zgodny z zasadami budowy. Zwraca listę ubrań albo null.
function wylosujZestaw(grupy, sezon) {
  const gory = grupy.goryCieple.concat(grupy.goryZimne); // concat = połącz dwie listy
  const mozeGoraDol = gory.length > 0 && grupy.doly.length > 0;
  const mozeSukienka = grupy.sukienki.length > 0;
  if (!mozeGoraDol && !mozeSukienka) return null;

  const wynik = [];
  // Sukienka czy góra + dół? Jeśli możliwe jedno i drugie – losujemy (sukienka rzadziej)
  if (mozeSukienka && (!mozeGoraDol || Math.random() < 0.35)) {
    wynik.push(losowy(grupy.sukienki));
  } else {
    // Zimą i jesienią czasem dwie góry warstwowo (np. koszula pod swetrem)
    const warstwy = (sezon === 'Zima' || sezon === 'Jesień') &&
      grupy.goryCieple.length && grupy.goryZimne.length && Math.random() < 0.4;
    if (warstwy) {
      wynik.push(losowy(grupy.goryCieple), losowy(grupy.goryZimne));
    } else {
      wynik.push(losowy(gory));
    }
    wynik.push(losowy(grupy.doly));
  }

  if (grupy.buty.length) wynik.push(losowy(grupy.buty));

  // Okrycie. Dzielimy je na "pod spód" (marynarka, kamizelka) i "na wierzch" (płaszcz, kurtka, trencz).
  if (grupy.okrycia.length && Math.random() < SZANSA_OKRYCIA[sezon]) {
    const podSpod = grupy.okrycia.filter(okryciePodSpod);
    const naWierzch = grupy.okrycia.filter(function (u) { return !okryciePodSpod(u); });

    if (podSpod.length && naWierzch.length && Math.random() < SZANSA_DWOCH_OKRYC[sezon]) {
      // Dwie warstwy: np. marynarka pod płaszczem
      wynik.push(losowy(podSpod), losowy(naWierzch));
    } else if (sezon === 'Zima' && naWierzch.length) {
      // Zimą sama marynarka to za mało – jeśli jest płaszcz albo kurtka, bierzemy je
      wynik.push(losowy(naWierzch));
    } else {
      wynik.push(losowy(grupy.okrycia));
    }
  }
  if (grupy.torby.length && Math.random() < 0.6) wynik.push(losowy(grupy.torby));
  if (grupy.dodatki.length && Math.random() < 0.4) wynik.push(losowy(grupy.dodatki));
  return wynik;
}

// ---------- PUNKTY ----------

// Ocenia zestaw. Zwraca { punkty, powody } – powody to zdania do wyjaśnienia.
function ocenZestaw(lista, noszone) {
  let punkty = 0;
  const powody = [];
  const kolory = lista.map(function (u) { return u.kolor; });

  // 1. KOLORY
  const mocne = Array.from(new Set(kolory.filter(function (k) {
    return !NEUTRALNE.includes(k) && k !== 'Wielokolorowy';
  })));
  const wzorzyste = kolory.filter(function (k) { return k === 'Wielokolorowy'; }).length;

  if (mocne.length === 0 && wzorzyste === 0) {
    punkty += 1;
    powody.push('Spokojna, neutralna baza kolorów.');
  } else if (mocne.length === 1 && wzorzyste === 0) {
    punkty += 2;
    powody.push('Neutralna baza z jednym mocnym akcentem: ' + mocne[0].toLowerCase() + '.');
  } else if (mocne.length === 2) {
    const modnaPara = TRENDY.pary.some(function (p) { return mocne.includes(p[0]) && mocne.includes(p[1]); });
    if (modnaPara) {
      punkty += 2;
      powody.push('Modne połączenie kolorów: ' + mocne.join(' + ').toLowerCase() + '.');
    } else {
      punkty -= 1; // dwa mocne kolory bez sprawdzonego połączenia – ryzykowne
    }
  } else if (mocne.length >= 3) {
    punkty -= 4; // za dużo mocnych kolorów naraz
  }
  if (wzorzyste > 1) punkty -= 3;                     // dwa wzory naraz
  if (wzorzyste === 1 && mocne.length > 0) punkty -= 2; // wzór + mocny kolor
  if (wzorzyste === 1 && mocne.length === 0) powody.push('Wzór połączony ze spokojnymi kolorami.');

  // Zestaw tonalny – większość ubrań w jednym kolorze albo w samych ciepłych, ziemistych odcieniach
  const najczestszy = Math.max.apply(null, kolory.map(function (k) {
    return kolory.filter(function (x) { return x === k; }).length;
  }));
  if (lista.length >= 3 && najczestszy >= 3) {
    punkty += 2;
    powody.push('Zestaw tonalny – kilka rzeczy w jednym kolorze.');
  } else if (lista.length >= 3 && kolory.every(function (k) { return ZIEMISTE.includes(k); })) {
    punkty += 2;
    powody.push('Ciepłe, ziemiste odcienie – beż, brąz i bordo.');
  }

  // Dwie warstwy okrycia – mały plus i wyjaśnienie, np. "marynarka pod płaszczem"
  const okrycia = lista.filter(function (u) { return u.kategoria === 'Okrycie wierzchnie'; });
  const spod = okrycia.find(okryciePodSpod);
  const wierzch = okrycia.find(function (u) { return !okryciePodSpod(u); });
  if (spod && wierzch) {
    punkty += 1;
    powody.push('Warstwowo: ' + spod.podkategoria.toLowerCase() + ' pod ' +
      (wierzch.podkategoria === 'Płaszcz' ? 'płaszczem' : wierzch.podkategoria === 'Kurtka' ? 'kurtką' :
       wierzch.podkategoria === 'Trencz' ? 'trenczem' : 'okryciem') + '.');
  }

  // 2. TRENDY (z trendy.js) – najwyżej 6 punktów, żeby trendy nie zagłuszyły reszty zasad
  let trendPunkty = 0;
  const modneRzeczy = [];
  lista.forEach(function (u) {
    let p = TRENDY.kolory[u.kolor] || 0;
    if (TRENDY.rodzaje.includes(u.podkategoria)) p += 1;
    const notatka = (u.notatka || '').toLowerCase();
    if (TRENDY.slowa.some(function (s) { return notatka.includes(s); })) p += 1;
    if (p > 0) modneRzeczy.push(nazwaUbrania(u));
    trendPunkty += p;
  });
  punkty += Math.min(trendPunkty, 6);
  if (modneRzeczy.length) {
    powody.push('Modne w sezonie ' + TRENDY.sezon + ': ' + modneRzeczy.join(', ') + '.');
  }

  // 3. ULUBIONE – plus, ale najwyżej 3 punkty
  const ulubione = lista.filter(function (u) { return u.ulubione; });
  punkty += Math.min(ulubione.length, 3);
  if (ulubione.length) powody.push('Twoje ulubione: ' + ulubione.map(nazwaUbrania).join(', ') + '.');

  // 4. OSTATNIO NOSZONE – minus, żeby nie powtarzać tych samych rzeczy
  const powtorki = lista.filter(function (u) { return noszone.has(u.id); });
  punkty -= powtorki.length * 2;
  if (powtorki.length === 0 && noszone.size > 0) powody.push('Bez rzeczy noszonych w ostatnim tygodniu.');

  // 5. Odrobina losowości, żeby propozycje się różniły
  punkty += Math.random() * 1.5;

  return { punkty: punkty, powody: powody };
}

// ---------- PROPOZYCJA ----------

// Zestawy już pokazane w tej sesji – "Inna propozycja" ich nie powtórzy
const pokazanePropozycje = new Set();

// Główna funkcja: zwraca { ubrania, powody } albo { brak: 'wyjaśnienie' }
function zaproponujZestaw(sezon, okazja) {
  const grupy = przygotujGrupy(sezon, okazja);
  const gory = grupy.goryCieple.length + grupy.goryZimne.length;
  if (!(gory && grupy.doly.length) && !grupy.sukienki.length) {
    return {
      brak: 'Brakuje ubrań ' + NA_SEZON[sezon] + (okazja ? ' (okazja: ' + okazja.toLowerCase() + ')' : '') +
        ': potrzebna jest góra i dół albo sukienka. Dodaj ubrania albo zmień sezon/okazję. ' +
        'Pamiętaj: ubranie bez zaznaczonego sezonu i okazji pasuje zawsze.',
    };
  }

  const noszone = ostatnioNoszone();
  let najlepszy = null;
  for (let i = 0; i < ILE_LOSOWAN; i++) {
    const lista = wylosujZestaw(grupy, sezon);
    if (!lista) continue;
    // Klucz = posortowane numery głównych ubrań. Pomijamy zestawy, których główne ubrania już były –
    // dzięki temu "Inna propozycja" zmienia górę/dół/buty, a nie tylko torebkę.
    const klucz = kluczGlowny(lista);
    if (pokazanePropozycje.has(klucz)) continue;
    const ocena = ocenZestaw(lista, noszone);
    if (!najlepszy || ocena.punkty > najlepszy.punkty) {
      najlepszy = { ubrania: lista, powody: ocena.powody, punkty: ocena.punkty, klucz: klucz };
    }
  }

  if (!najlepszy) {
    // Wszystkie możliwe zestawy już były – zaczynamy pokazywać od nowa
    pokazanePropozycje.clear();
    return zaproponujZestaw(sezon, okazja);
  }
  pokazanePropozycje.add(najlepszy.klucz);
  return najlepszy;
}

// ---------- OKNO ASYSTENTA ----------

const oknoAsystenta = document.getElementById('okno-asystenta');
const asystentSezon = document.getElementById('asystent-sezon');
const asystentOkazja = document.getElementById('asystent-okazja');
const asystentObraz = document.getElementById('asystent-obraz');
const asystentPowody = document.getElementById('asystent-powody');
const asystentInfo = document.getElementById('asystent-info');
let aktualnaPropozycja = null;

async function nowaPropozycja() {
  const sezon = asystentSezon.value;
  const okazja = asystentOkazja.value;
  const wynik = zaproponujZestaw(sezon, okazja);

  asystentPowody.innerHTML = '';
  document.getElementById('asystent-zapis').hidden = Boolean(wynik.brak);
  document.getElementById('asystent-inna').hidden = Boolean(wynik.brak);
  asystentObraz.hidden = Boolean(wynik.brak);

  if (wynik.brak) {
    aktualnaPropozycja = null;
    asystentInfo.textContent = wynik.brak;
    return;
  }

  aktualnaPropozycja = wynik;
  asystentInfo.textContent = 'Układam kolaż…';
  asystentObraz.removeAttribute('src');

  // Lista powodów
  wynik.powody.forEach(function (powod) {
    const li = document.createElement('li');
    li.textContent = powod;
    asystentPowody.append(li);
  });

  // Kolaż z tymczasowego zestawu (funkcja z kolaz.js)
  const tymczasowy = { id: 'propozycja', nazwa: 'Propozycja', ubrania: wynik.ubrania.map(function (u) { return u.id; }) };
  const kolaz = await stworzKolaz(tymczasowy);
  if (aktualnaPropozycja !== wynik) return; // w międzyczasie wylosowano inną propozycję
  if (asystentObraz.src) URL.revokeObjectURL(asystentObraz.src);
  asystentObraz.src = URL.createObjectURL(kolaz.plik);
  asystentInfo.textContent = wynik.ubrania.map(nazwaUbrania).join(' · ');

  // Podpowiadamy nazwę zestawu, np. "Jesień – praca"
  document.getElementById('asystent-nazwa').value = sezon + (okazja ? ' – ' + okazja.toLowerCase() : '');
}

function otworzAsystenta() {
  asystentSezon.value = biezacySezon();
  document.getElementById('asystent-data').value = '';
  oknoAsystenta.showModal();
  oknoAsystenta.scrollTop = 0;
  nowaPropozycja();
}

document.getElementById('otworz-asystenta').addEventListener('click', otworzAsystenta);
document.getElementById('asystent-inna').addEventListener('click', nowaPropozycja);
asystentSezon.addEventListener('change', nowaPropozycja);
asystentOkazja.addEventListener('change', nowaPropozycja);
document.getElementById('asystent-zamknij').addEventListener('click', function () { oknoAsystenta.close(); });

// Zapis propozycji jako zestawu (i opcjonalnie od razu w kalendarzu)
document.getElementById('asystent-zapis').addEventListener('submit', async function (zdarzenie) {
  zdarzenie.preventDefault();
  if (!aktualnaPropozycja) return;

  const zestaw = {
    id: Date.now(),
    nazwa: document.getElementById('asystent-nazwa').value.trim() || 'Propozycja asystenta',
    ubrania: aktualnaPropozycja.ubrania.map(function (u) { return u.id; }),
    sezony: [asystentSezon.value],
    okazje: asystentOkazja.value ? [asystentOkazja.value] : [],
    ulubiony: false,
  };
  await zapiszZestaw(zestaw);
  zestawy.push(zestaw);

  // Jeśli wybrano datę – planujemy zestaw w kalendarzu (funkcje z kalendarz.js)
  const data = document.getElementById('asystent-data').value; // np. "2026-10-24" albo pusto
  const pora = document.getElementById('asystent-pora').value;
  if (data) {
    const wpis = { ...wpisDnia(data) };
    wpis[pora] = zestaw.id;
    await zapiszWpis(wpis);
  }

  oknoAsystenta.close();
  pokazZestawy();
  pokazKalendarz();
});

// ---------- START ----------

// Okazje do wyboru – kopiujemy z formularza ubrania (jedno źródło prawdy)
wypelnijListe(
  asystentOkazja,
  Array.from(document.querySelectorAll('#okazje input')).map(function (pole) { return pole.value; }),
  'Dowolna okazja'
);

// Opis trendów i źródła w zwijanej sekcji okna
document.getElementById('trendy-sezon').textContent = 'Trendy: ' + TRENDY.sezon;
TRENDY.opis.forEach(function (zdanie) {
  const li = document.createElement('li');
  li.textContent = zdanie;
  document.getElementById('trendy-opis').append(li);
});
TRENDY.zrodla.forEach(function (zrodlo) {
  const li = document.createElement('li');
  const link = document.createElement('a');
  link.href = zrodlo.adres;
  link.textContent = zrodlo.nazwa;
  link.target = '_blank'; // otwórz w nowym oknie
  link.rel = 'noopener';
  li.append(link);
  document.getElementById('trendy-zrodla').append(li);
});
document.getElementById('trendy-data').textContent = 'Lista z dnia ' + TRENDY.zaktualizowano + '.';
