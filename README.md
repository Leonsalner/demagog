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

### 3. Výsledky, ktoré sa dajú hneď použiť pri ďalšom výskume

Nové funkcie neposúvajú iba samotné vyhľadanie výroku, ale aj to, čo nasleduje potom. Výsledky sa rozširujú o prepojené články, odkazy na analýzu a zdroje priamo na kartách výrokov a jednoduchší prechod k doplneniu nového záznamu do internej evidencie.

## Kľúčové scenáre ukážky

Táto ukážka je najsilnejšia v troch konkrétnych situáciách:

- používateľ zadá dopyt inými slovami, než ako je výrok uložený v archíve, a napriek tomu dostane správne výsledky
- analytik vloží výrok, ktorý už bol v minulosti overený, a systém ho rýchlo identifikuje ako duplicitu
- analytik vloží súvisiaci, ale nie totožný výrok, a systém ukáže užitočný kontext bez toho, aby vytváral falošnú zhodu

## Nové hodnotné prvky

Popri samotnom vyhľadávaní pribúdajú aj funkcie, ktoré robia nástroj praktickejším pri reálnej práci:

- súvisiace články sa pripájajú priamo k výsledkom vyhľadávania aj k detekcii duplicít, takže analytik dostane ďalší kontext bez ďalšieho hľadania
- karty výrokov zobrazujú odôvodnenie aj konkrétne zdroje analýzy, čo výrazne uľahčuje spätné dohľadanie, z čoho overenie vychádzalo
- výsledky sa dajú preklikať späť na Demagog.sk aj na profil rečníka, takže orientácia v archíve je rýchlejšia
- pri novom alebo iba súvisiacom výroku je jednoduchšie prejsť rovno na pridanie nového záznamu do internej evidencie

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

Snímky obrazovky vyššie boli vytvorené lokálne pomocou Playwrightu z aplikácie.
