// TRENDY SEZONU – lista, z której korzysta asystent (asystent.js).
// Asystent sam nie wie, co jest modne – wie tylko to, co tu wpiszemy.
// Listę odświeżamy co sezon. Nazwy kolorów i rodzajów muszą być TAKIE SAME jak w formularzu ubrania.

const TRENDY = {
  sezon: 'jesień–zima 2026/27',
  zaktualizowano: '2026-10-23',

  // Modne kolory: liczba = ile punktów dostaje ubranie w tym kolorze (3 = kolor sezonu, 1 = też modny)
  kolory: {
    'Fioletowy': 3, // fiolet, śliwka, bakłażan – wskazywany jako kolor sezonu
    'Bordowy': 3,   // bordo / burgund
    'Brązowy': 2,   // czekoladowy brąz, espresso
    'Zielony': 1,   // butelkowa zieleń, mech
    'Żółty': 1,     // maślana żółć
    'Niebieski': 1, // kobalt
    'Czerwony': 1,
  },

  // Modne połączenia kolorów – zestaw z taką parą dostaje dodatkowy punkt
  pary: [
    ['Fioletowy', 'Bordowy'],
    ['Fioletowy', 'Niebieski'],
    ['Bordowy', 'Granatowy'],
    ['Bordowy', 'Brązowy'],
    ['Bordowy', 'Czarny'],
  ],

  // Modne rodzaje ubrań (nazwy jak na liście "Rodzaj" w formularzu)
  rodzaje: ['Marynarka', 'Płaszcz', 'Sweter', 'Kozaki', 'Botki', 'Materiałowe'],

  // Słowa, których asystent szuka w NOTATCE ubrania (wystarczy początek słowa, wielkość liter bez znaczenia)
  slowa: ['oversize', 'taliowan', 'szerokie', 'zamsz', 'aksamit', 'teddy', 'lakier', 'cekin',
          'frędzl', 'ćwiek', 'warkocz', 'splot', 'futer', 'plisowan', 'asymetr', 'w paski', 'kratk'],

  // Krótki opis trendów do pokazania w aplikacji
  opis: [
    'Kolor sezonu: fiolet (śliwka, bakłażan), obok niego bordo i czekoladowy brąz.',
    'Mocne akcenty: butelkowa zieleń, maślana żółć, kobalt, czerwień.',
    'Fasony: taliowane marynarki i „power dressing”, oversize’owe płaszcze, swetry o wyraźnym splocie.',
    'Buty: masywne botki, kozaki (także za kolano). Dobrze działa trio: czerń, bordo, czekoladowy brąz.',
    'Faktury: zamsz, aksamit, teddy, lakier, frędzle i ćwieki.',
  ],

  zrodla: [
    { nazwa: 'Vogue Polska – fiolet kolorem sezonu', adres: 'https://www.vogue.pl/a/fiolet-trend-kolor-jesien-zima-2026-2027-plaszcze-sukienki-jakie-modele-i-odcienie-wybrac-digitalsyndication' },
    { nazwa: 'Glamour – modne kolory jesień-zima 2026/27', adres: 'https://www.glamour.pl/moda/modne-kolory-jesien-zima-2026-2027-sezonowa-garderoba-zmienia-klasyczne-odcienie-nie-ma-mowy-o-nudzie/' },
    { nazwa: 'Modivo – kolory jesień-zima 2026/27', adres: 'https://runway.modivo.pl/modne-kolory-jesien-zima/' },
    { nazwa: 'Modivo – trendy jesień-zima 2026/27', adres: 'https://runway.modivo.pl/trendy-jesien-zima-moda-damska/' },
    { nazwa: 'Wojas – modne buty na jesień 2026', adres: 'https://wojas.pl/blog/najmodniejsze-buty-na-jesien-2026-trendy-ktore-warto-znac' },
    { nazwa: 'NET-A-PORTER – FW26 trends', adres: 'https://www.net-a-porter.com/en-us/porter/article-c99dca08ba956cfc/fashion/art-of-style/fw26-fashion-trends' },
  ],
};
