# Ukážka AI vyhľadávania pre Demagog.sk

Toto je stručná produktová ukážka nástrojov pre Demagog.sk postavená na jednoduchej myšlienke: sprístupniť existujúci archív Demagogu lepšie čitateľom aj analytikom.

Spája dva praktické scenáre použitia:

- lepšie verejné vyhľadávanie existujúcich overení aj vtedy, keď používateľ nepozná presné znenie výroku
- interný detektor duplicít, ktorý analytikom pomáha rýchlo zistiť, či bol nový výrok už overený alebo či sa výrazne prekrýva s predchádzajúcou prácou

Cieľom nie je nahradiť redakčný úsudok. Cieľom je obmedziť opakované manuálne hľadanie, rýchlejšie sprístupniť relevantné predchádzajúce overenia a pomôcť Demagogu naplno využiť hodnotu vlastného archívu.

<p align="center">
  <img src="docs/images/demagog-home-fold.png" alt="Domovská obrazovka vyhľadávania a detekcie duplicít pre Demagog" width="900" />
</p>

## Prečo je to dôležité

Demagog už má to najcennejšie: rozsiahly archív overení. Tento prototyp nezlepšuje obsah samotný, ale prístup k nemu.

- Čitatelia môžu nájsť relevantné overenia aj vtedy, keď hľadajú inými slovami, než ako bol výrok pôvodne formulovaný.
- Analytici okamžite vidia, či je nový výrok pravdepodobne duplicitný, len voľne súvisiaci alebo skutočne nový.
- Celý workflow zostáva pevne ukotvený v existujúcej práci Demagogu namiesto toho, aby predstieral automatizáciu redakčného rozhodovania.

## Čo ukážka predvádza

### 1. Inteligentnejšie vyhľadávanie pre verejný web

Vyhľadávanie je navrhnuté tak, aby lepšie zodpovedalo tomu, ako ľudia v skutočnosti kladú otázky. Namiesto spoliehania sa iba na presné kľúčové slová vie pracovať aj s prirodzenou formuláciou a vrátiť relevantné overené výroky z archívu.

### 2. Rýchlejší interný štart pre analytikov

Keď príde nový politický výrok, detektor duplicít pomáha zodpovedať veľmi praktickú otázku: overovali sme už toto tvrdenie alebo niečo veľmi podobné? Znamená to menej manuálneho dohľadávania a rýchlejší začiatok skutočnej overovacej práce.

<p align="center">
  <img src="docs/images/demagog-demo-fold.png" alt="Ukážka výsledkov vyhľadávania so sémanticky priradenými výrokmi z Demagogu" width="900" />
</p>

### 3. Smerovanie k rozšíreniu pre prehliadač

Koncept rozšírenia ukazuje, ako by sa tento nástroj mohol v budúcnosti ešte viac priblížiť každodennej práci analytikov. Zvýraznenú vetu v článku by bolo možné porovnať s existujúcim obsahom Demagogu bez toho, aby používateľ musel opustiť stránku.

<p align="center">
  <img src="docs/images/demagog-extension.png" alt="Maketa rozšírenia pre Chrome na porovnanie zvýrazneného výroku s databázou Demagogu" width="700" />
</p>

## Ako tento produkt chápať

Najlepšie je vnímať ho ako podporný nástroj pre redakciu:

- pomáha rýchlejšie nájsť už existujúce overenia
- analytikom dáva jasnejší východiskový bod pri nových výrokoch
- zvyšuje využiteľnosť, viditeľnosť a opätovné použitie archívu Demagogu

Ak sa prototyp ukáže ako užitočný, prirodzeným ďalším krokom nie je efektný redizajn. Je ním kvalitnejšie spracovanie tej istej základnej hodnoty: lepšie vyhľadávanie, lepšie východiská pre výskum a menej duplicitnej práce.

## Lokálne spustenie

Ak si chcete prototyp otvoriť lokálne:

```bash
npm install
npm run dev
```

Snímky obrazovky vyššie boli vytvorené lokálne pomocou Playwrightu z aplikácie a z makety rozšírenia v súbore [`extension-mockup.html`](extension-mockup.html).
