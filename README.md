# AI vyhľadávanie pre Demagog.sk

Táto ukážka predstavuje, ako sa dá archív Demagogu sprístupniť tak, aby bol užitočný nielen pri čítaní, ale aj pri každodennej analytickej práci. Namiesto klasického hľadania podľa presných slov ponúka prirodzenejší spôsob, ako sa dostať k relevantným overeniam, rýchlo odhaliť duplicity a plynulo pokračovať pri novom výroku.

## Čo táto ukážka robí

**Sémantické vyhľadávanie**

Rozumie bežnej otázke, téme aj voľnej formulácii a vie z archívu vytiahnuť výroky, ktoré k nej skutočne patria.

**Automatické spresnenie výsledkov**

Z dopytu si samo odvodí, koho sa používateľ pýta, o akej téme hovorí a aké časové alebo hodnotiace obmedzenia treba použiť.

**Detekcia duplicít**

Pri novom výroku okamžite ukáže, či ide o už overené tvrdenie, len príbuznú tému, alebo o skutočne nový prípad.

**Prieskum a doplnenie databázy**

Ak sa zhoda nájde, analytik dostane rýchly štart. Ak sa nenájde, môže rovno pokračovať do formulára na pridanie nového výroku.

## Veľká ukážka

### 1. Vyhľadávanie rozumie téme aj bez presnej citácie

Pri dopyte `fico vojna na ukrajine nepravda` systém neberie slová iba doslova. Sám rozpozná, že ide o Roberta Fica, tému vojny na Ukrajine a výroky označené ako nepravdivé. Výsledkom je prehľad, ktorý je okamžite užitočný bez ďalšieho manuálneho filtrovania.

<p align="center">
  <img src="docs/images/semantic-search-fico-ukrajina-nepravda.png" alt="Sémantické vyhľadávanie automaticky vybralo Roberta Fica a hodnotenie Nepravda pri téme vojny na Ukrajine." width="1100" />
</p>

To je dôležité práve preto, že čitateľ alebo analytik si často nepamätá presné znenie výroku. Potrebuje sa dostať k správnemu okruhu tvrdení čo najkratšou cestou.

### 2. Prirodzená otázka sa mení na použiteľný rešeršný vstup

Otázka `Čo povedali členovia SMER-u o vojne na Ukrajine od roku 2022?` ukazuje druhý typ hodnoty. Nástroj si sám odvodí stranu, časový rámec a vráti širší, ale stále relevantný výber výrokov naprieč viacerými politikmi.

<p align="center">
  <img src="docs/images/semantic-search-smer-ukrajina-2022.png" alt="Vyhľadávanie rozumie prirodzene položenej otázke o členoch SMER-u a vojne na Ukrajine od roku 2022." width="1100" />
</p>

Takýto scenár je vhodný pre novinársku prípravu, rešerš pred debatou aj rýchle zorientovanie sa v tom, ako strana o téme hovorí v čase.

### 3. Detektor duplicít vie rozpoznať, že výrok už v archíve je

Keď analytik vloží výrok, ktorý už bol overený, systém ho označí ako duplicitu a hneď ukáže najbližšiu zhodu. Namiesto opakovaného dohľadávania sa dá okamžite nadviazať na existujúcu prácu.

<p align="center">
  <img src="docs/images/detect-duplicate-exact-match.png" alt="Detektor duplicít našiel presnú zhodu s už overeným výrokom." width="1100" />
</p>

Prínos nie je iba v úspore času. Dôležité je aj to, že redakcia pracuje konzistentnejšie a lepšie využíva vlastný archív.

### 4. Režim prieskumu ukazuje širší kontext zhôd

Popri rýchlom režime je pripravený aj režim `Prieskum`, ktorý je vhodný v situáciách, keď analytik nechce len najbližší zásah, ale širší obraz o súvisiacich výrokoch a ďalšom kontexte.

<p align="center">
  <img src="docs/images/detect-thorough-mode.png" alt="Rozšírený režim prieskumu pri detekcii duplicít so súhrnným prieskumom zhôd." width="1100" />
</p>

Tento pohľad je cenný najmä vtedy, keď sa výrok neopakuje doslova, ale vracia sa v mierne zmenenej forme, v inom čase alebo u iného politika.

### 5. Ak sa zhoda nenájde, systém jasne povie, že ide o nový prípad

Nástroj nemá len hľadať podobnosti. Rovnako dôležité je vedieť povedať, že v databáze sa nič podobné nenašlo a treba začať s novým záznamom.

<p align="center">
  <img src="docs/images/detect-no-match-new-claim.png" alt="Detektor duplicít označil výrok ako nový a ponúkol pokračovanie na pridanie do databázy." width="1100" />
</p>

Takýto moment je praktický, pretože analytik nemusí rozmýšľať, čo ďalej. Produkt ho prirodzene posunie do ďalšieho kroku.

### 6. Pridanie nového výroku nadväzuje priamo na detekciu

Po kliknutí na pridanie nového výroku sa otvorí formulár s predvyplneným textom. Celý prechod pôsobí ako jeden súvislý workflow, nie ako presun do odpojenej internej časti.

<p align="center">
  <img src="docs/images/add-statement-prefilled.png" alt="Formulár na pridanie nového výroku s predvyplneným textom z predchádzajúcej detekcie." width="1100" />
</p>

To je presne moment, kde sa ukazuje rozdiel medzi efektnou ukážkou a reálne použiteľným nástrojom. Produkt neskončí pri odpovedi, ale pomôže aj s tým, čo má redakcia urobiť ďalej.

## Ako túto ukážku čítať

Najsilnejšia hodnota nie je v jednom samostatnom prvku. Je v tom, že celý archív Demagogu začne fungovať ako živý pracovný nástroj.

- Čitateľ sa vie dostať k relevantným overeniam aj bez presnej citácie.
- Analytik rýchlo zistí, či už má redakcia hotový základ.
- Nový výrok sa dá bez zbytočných prestupov posunúť do evidencie.

Ukážky vyššie boli vytvorené na reálnych dopytoch a výsledkoch z bežiacej aplikácie, aby bolo vidieť správanie produktu v praxi, nie iba ilustračné obrazovky.
