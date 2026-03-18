# AI vyhľadávanie a kontrola duplicít pre Demagog.sk

Táto ukážka približuje, ako sa dá archív Demagogu sprístupniť pre bežné vyhľadávanie aj každodennú redakčnú prácu. Namiesto presných kľúčových slov tu môžete hľadať overenia podľa ich významu a kontextu.

Nástroj pomáha rýchlo zistiť, či už bol výrok v minulosti overený. Od hľadania sa dá následne plynulo prejsť priamo k detailnej analýze alebo k pridaniu úplne nového záznamu.

### 1. Vyhľadávanie v prirodzenom jazyku

Databáza sa dá prehľadávať bežnými otázkami a frázami. Ak sa napríklad spýtate „Čo povedali členovia SMER-u o vojne na Ukrajine od roku 2022?“, systém automaticky rozpozná politickú stranu, tému aj časové obdobie. Tieto údaje rovno aplikuje ako filtre, takže výsledky presne sedia bez toho, aby ste ich museli ručne naklikávať.

<p align="center">
  <img src="docs/images/semantic-search-smer-ukrajina-2022.png" alt="Vyhľadávanie pomocou celej otázky o členoch strany SMER a vojne na Ukrajine" width="1100" />
</p>

### 2. Detailný pohľad a rešerš

Zoznamom výsledkov sa práca len začína. Tlačidlo „Preskúmať“ otvorí pracovný panel s kompletnou analýzou konkrétneho výroku, súvisiacimi článkami a zdrojmi. Všetky dôležité informácie máte na jednom mieste a môžete hneď pokračovať v rešerši.

<p align="center">
  <img src="docs/images/search-research-workspace.png" alt="Pracovný pohľad s detailnou analýzou výroku a zdrojmi" width="1100" />
</p>

### 3. Kontrola duplicít

Keď narazíte na nový výrok, systém najprv overí, či podobné tvrdenie v archíve už náhodou nie je. Detektor duplicít porovná zadaný text s databázou a hneď ukáže najbližšiu zhodu. Vďaka tomu sa redakcia vyhne opakovanému overovaniu tých istých výrokov a ušetrí množstvo času.

<p align="center">
  <img src="docs/images/detect-duplicate-exact-match.png" alt="Detektor duplicít našiel presnú zhodu v archíve" width="1100" />
</p>

### 4. Pridanie nového výroku

Ak sa v archíve nič podobné nenájde, systém výrok označí ako nový a ponúkne jeho pridanie do databázy. Prechod je plynulý – vo formulári už na vás čaká text výroku predvyplnený z predchádzajúceho kroku, takže nemusíte nič zbytočne kopírovať a vkladať nanovo.

<p align="center">
  <img src="docs/images/detect-no-match-new-claim.png" alt="Detektor označil výrok ako nový a ponúkol jeho pridanie do databázy" width="1100" />
</p>

## Pre koho je to užitočné

- **Pre bežného čitateľa a novinára:** Rýchlo nájde relevantné staršie overenia k aktuálnej téme, aj keď nepozná presné pôvodné znenie výroku.
- **Pre analytika:** Hneď zistí, či už redakcia podobný výrok v minulosti riešila, a získa priamy prístup k podkladom.
- **Pre redakčný tím:** Mení archív na živý pracovný nástroj a výrazne zjednodušuje proces zaraďovania nových výrokov.
