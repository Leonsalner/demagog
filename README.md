# Demagog: vyhľadávanie, kontrola duplicít a rešerš výroku

Tento prototyp zjednodušuje prácu s archívom Demagogu. Pomáha rýchlo zistiť, či už bol výrok v minulosti overovaný, nájsť k nemu súvisiace záznamy a pokračovať k detailnejšej rešerši alebo k pridaniu nového výroku.

Rozhranie je navrhnuté tak, aby sa v ňom dalo začať bez dlhého zaúčania. Pri prvom otvorení vás prevedie krátky vstavaný návod a neskôr sa k nemu dá vrátiť cez tlačidlo **`Návod`**.

## Čo tento nástroj zjednodušuje

- Vyhľadávanie a kontrola duplicít na seba priamo nadväzujú, nie sú to dva oddelené nástroje.
- Redakcia sa vie rýchlejšie rozhodnúť, či už k výroku existuje použiteľné staršie overenie, alebo treba ísť do širšej rešerše.
- Ak výrok v databáze chýba, dá sa plynulo pokračovať k pridaniu nového záznamu.

## Rýchla kontrola, či sa už výrok neoveroval

Vo Vyhľadávaní stačí napísať otázku, tému, meno alebo citáciu vlastnými slovami. Vyhľadávanie samo rozozná, čo asi hľadáte, takže sa k relevantným výsledkom dostanete aj bez ručného nastavovania filtrov.

Ak už máte konkrétny výrok, stačí sa prepnúť do kontroly duplicít. Rýchly režim ukáže najbližšie zhody hneď. Režim `Prieskum` ide hlbšie a otvorí širší kontext podobných výrokov.

<p align="center">
  <img src="public/onboarding/step-02-search-light.png" alt="Ukážka prirodzeného vyhľadávania a automatického filtrovania výrokov." width="1100" />
</p>

## Priestor na ďalšiu rešerš

Ak chcete s nájdeným výrokom ďalej pracovať, tlačidlo `Preskúmať` otvorí detail výroku so všetkým potrebným na jednom mieste. Nájdete v ňom analýzu, súvisiace články Demagogu aj ďalší kontext k overeniu.

Pri režime `Prieskum` sa tento pohľad otvorí automaticky a zobrazí spoločný súhrn pre viac podobných výrokov naraz. Netreba preto všetko otvárať po jednom.

<p align="center">
  <img src="public/onboarding/step-04-research-light.png" alt="Pracovný priestor s analýzou, článkami a zdrojmi pre ďalšiu rešerš." width="1100" />
</p>

## Keď ide o nový výrok

Ak sa ukáže, že výrok ešte v databáze nie je, dá sa plynulo pokračovať na `Pridať nový výrok`. Formulár nadviaže na predchádzajúci krok a text výroku už zostane predvyplnený, aby ste ho nemuseli znova kopírovať.

## Spätná väzba

Toto README je len stručný prehľad pre interné použitie. Samotná aplikácia vás základnými krokmi prevedie sama.

Ak pri skúšaní narazíte na chybu, nejasnosť alebo máte nápad na zlepšenie, napíšte nám priamo cez tlačidlo `Máte pripomienku?` v aplikácii.
