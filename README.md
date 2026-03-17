# AI vyhľadávanie a kontrola duplicít pre Demagog.sk

Táto ukážka je o tom, ako spraviť archív Demagogu prístupnejší pre bežné hľadanie aj pre redakčnú prácu. Namiesto presného dohľadávania starších formulácií pomáha nájsť relevantné overenia podľa významu, rýchlo preveriť nový výrok a plynulo pokračovať tam, kde treba.

## Čo si z tejto ukážky odniesť

- Vyhľadávanie rozumie aj voľne napísanej otázke, nielen presnej citácii.
- Systém vie z dopytu sám odvodiť základné filtre a zúžiť výsledky.
- Pri novom výroku rýchlo ukáže, či už bol overený, či je len podobný, alebo či ide o nový prípad.
- Z nájdeného výsledku sa dá hneď prejsť do detailu a pokračovať v ďalšej práci.
- Ak sa zhoda nenájde, formulár na pridanie nového výroku nadväzuje bez zbytočného prerušovania.

## Ako to vyzerá v praxi

### 1. Stačí napísať, čo hľadáte

Pri dopyte „fico vojna na ukrajine nepravda“ systém pochopí, že ide o Roberta Fica, tému vojny na Ukrajine a výroky vyhodnotené ako nepravdivé. Používateľ tak nemusí ručne nastavovať každý filter zvlášť.

<p align="center">
  <img src="docs/images/semantic-search-fico-ukrajina-nepravda.png" alt="Vyhľadávanie automaticky vybralo Roberta Fica a hodnotenie Nepravda pri téme vojny na Ukrajine." width="1100" />
</p>

Takýto typ hľadania je užitočný vtedy, keď si človek pamätá tému a smer výroku, ale nie jeho presné znenie.

### 2. Fungujú aj celé otázky

Nástroj si poradí aj s prirodzenou otázkou typu „Čo povedali členovia SMER-u o vojne na Ukrajine od roku 2022?“. Sám rozpozná stranu aj časový rámec a vráti výsledky naprieč viacerými politikmi.

<p align="center">
  <img src="docs/images/semantic-search-smer-ukrajina-2022.png" alt="Vyhľadávanie rozumie celej otázke o členoch SMER-u a vojne na Ukrajine od roku 2022." width="1100" />
</p>

To je praktické najmä pri rešerši, keď človek ešte nehľadá jeden konkrétny výrok, ale chce sa zorientovať v širšej téme.

### 3. Z výsledku sa dá okamžite prejsť do detailu

Tlačidlo „Preskúmať“ otvorí pracovný pohľad s analýzou, článkami Demagogu a ďalšími zdrojmi. Používateľ tak nemusí preskakovať medzi viacerými miestami a môže pokračovať priamo z výsledku, ktorý ho zaujal.

<p align="center">
  <img src="docs/images/search-research-workspace.png" alt="Po kliknutí na Preskúmať sa otvorí detailný pracovný pohľad s analýzou a zdrojmi." width="1100" />
</p>

Práve tu sa ukazuje, že nejde len o vyhľadávač, ale o nástroj, ktorý pomáha aj s ďalším krokom.

### 4. Pri novom výroku systém najprv skontroluje, či už nebol overený

Ak analytik vloží výrok, ktorý už v archíve existuje, detektor duplicít ho označí a hneď ukáže najbližšiu zhodu. To šetrí čas a znižuje riziko, že sa rovnaká práca začne od nuly.

<p align="center">
  <img src="docs/images/detect-duplicate-exact-match.png" alt="Detektor duplicít našiel presnú zhodu s už overeným výrokom." width="1100" />
</p>

Takýto výsledok je dôležitý hlavne pre redakciu, ktorá potrebuje rýchlo zistiť, či už má k dispozícii použiteľný základ.

### 5. Keď treba širší pohľad, je tu režim Prieskum

Popri rýchlom vyhodnotení je pripravený aj režim „Prieskum“. Ten je vhodný vtedy, keď nestačí iba najbližšia zhoda a treba si pozrieť širší súbor súvisiacich výrokov.

<p align="center">
  <img src="docs/images/detect-thorough-mode.png" alt="Rozšírený režim Prieskum pri detekcii duplicít so súhrnným prieskumom zhôd." width="1100" />
</p>

Takýto pohľad je užitočný najmä pri výrokoch, ktoré sa v čase vracajú v mierne pozmenenej podobe.

### 6. Ak sa zhoda nenájde, workflow pokračuje prirodzene

Nástroj vie rovnako jasne povedať aj to, že sa nič podobné nenašlo. V takom prípade ponúkne pokračovanie na pridanie nového výroku do databázy.

<p align="center">
  <img src="docs/images/detect-no-match-new-claim.png" alt="Detektor duplicít označil výrok ako nový a ponúkol pokračovanie na pridanie do databázy." width="1100" />
</p>

Po kliknutí sa otvorí formulár s predvyplneným textom výroku, takže používateľ nemusí začínať odznova.

<p align="center">
  <img src="docs/images/add-statement-prefilled.png" alt="Formulár na pridanie nového výroku s predvyplneným textom z predchádzajúcej detekcie." width="1100" />
</p>

Celý prechod tak pôsobí ako jedna súvislá práca, nie ako presun do iného, odpojeného nástroja.

## Pre koho je to užitočné

- Pre čitateľa alebo novinára, ktorý si chce rýchlo nájsť relevantné overenia k téme.
- Pre analytika, ktorý potrebuje zistiť, či už redakcia podobný výrok riešila.
- Pre tím, ktorý chce z archívu spraviť aktívne používaný pracovný nástroj, nie iba miesto na ukladanie starších výstupov.

Ukážky vyššie vznikli na reálnych dopytoch a výsledkoch z bežiacej aplikácie, aby bolo vidieť, ako sa produkt správa v praxi.
