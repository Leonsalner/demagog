# Demagog: interný nástroj na rešerš a kontrolu výrokov

Tento prototyp pomáha redakcii rýchlo zistiť, či Demagog podobný výrok už overoval. Vyhľadávanie a detekcia duplicít sú spojené v jednom rozhraní, takže sa dá plynulo prejsť od prvého preverenia k širšiemu prieskumu alebo k pridaniu nového záznamu.

Pri prvom otvorení vás prevedie krátky vstavaný návod. Neskôr sa k nemu vrátite cez tlačidlo **`Návod`**.

## Ako sa v nástroji začína

Vo Vyhľadávaní môžete začať témou, menom, citátom alebo otázkou vlastnými slovami. Keď už máte konkrétne tvrdenie, prepnite sa do Detekcie duplicít.

<p align="center">
  <img src="public/onboarding/step-02-search-light.png" alt="Prirodzené vyhľadávanie s automaticky doplnenými filtrami a výsledkami." width="1100" />
</p>

## Čo sa stane po odoslaní tvrdenia

Detekcia po odoslaní vždy najprv spraví rýchlu kontrolu proti archívu. Ak sa nič podobné nenájde, hneď sa zobrazí stav nového výroku. Ak sa podobné staršie výroky nájdu, aplikácia zostane v jednom spoločnom stave prípravy a začne chystať súhrnný prieskum.

Keď sú podklady hotové, pracovný priestor sa otvorí automaticky. Nie je tu žiadne ďalšie potvrdzovanie ani ručné tlačidlo na prípravu prieskumu. Ak príprava zlyhá, používateľ sa vráti ku kartám zhôd s možnosťou skúsiť to znova.

<p align="center">
  <img src="public/onboarding/step-03-detect-light.png" alt="Detekcia duplicít v stave prípravy súhrnného prieskumu." width="1100" />
</p>

## Súhrnný prieskum a pokračovanie v práci

Súhrnný prieskum spojí podobné výroky, články Demagogu a ďalšie zdroje do jedného pracovného priestoru. Vľavo sa prepínajú kategórie, v hlavnej časti sa číta vybraný materiál. Keď sa ukáže, že pripravené podklady nestačia, formulár na nový záznam sa otvorí priamo odtiaľ.

<p align="center">
  <img src="public/onboarding/step-04-research-light.png" alt="Súhrnný prieskum otvorený po detekcii so súvisiacimi článkami a výrokmi." width="1100" />
</p>

<p align="center">
  <img src="public/onboarding/step-05-add-light.png" alt="Formulár na pridanie nového výroku otvorený priamo nad prieskumom." width="1100" />
</p>

Samostatná stránka **`/add`** stále existuje, ale pri bežnej práci väčšinou stačí kontextové otvorenie formulára priamo z prieskumu.

## Technicke

### Architektura a runtime

Táto appka nie je len frontend nad cudzou databázou. Je to jedna full-stack webová aplikácia, v ktorej frontend aj backend žijú v tom istom Next.js repozitári. Klientská časť je postavená na **Next.js 16 / React 19**, serverová logika beží ako **Next.js App Router API routes** v [`src/app/api`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/api) a celý projekt je písaný v **TypeScripte** pre **Node.js runtime**. Aktuálne nasadenie je orientované na **Vercel**, čo potvrdzuje [`.vercel/project.json`](/Users/leon/conductor/workspaces/demagog/kinshasa/.vercel/project.json).

### Ako appka technicky funguje

Vo vyhľadávaní (`/api/search`) sa používateľský dopyt najprv prevedie na embedding, potom sa cez Supabase/Postgres vyhľadajú kandidátske výroky cez `search_statements`, voliteľne sa spresní interpretácia alebo rerank cez Gemini a napokon sa doplnia súvisiace články a pripojené zdroje. V detekcii duplicít (`/api/detect`) sa nový výrok embeduje, porovná cez `match_statements` alebo lexikálny fallback a Gemini ho zatriedi voči kandidátom ako `DUPLICATE`, `RELATED` alebo `UNRELATED`; pri relevantných zhôdach sa môže automaticky otvoriť spoločný prieskum.

Prieskum beží cez [`/api/research/statement`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/api/research/statement/route.ts) a [`/api/research/detect`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/api/research/detect/route.ts) a skladá pracovný priestor z interných článkov `clanky` a externých `statement_sources`. Pridanie nového výroku (`POST /api/statements`) zapisuje ručne vložený záznam do `vyroky`, pripojené zdroje do `statement_sources`, dopočíta technické metadata a embedding uloží asynchrónne až po úspešnom inserte.

### S akymi datami a DB objektmi pracuje

Bežiaca aplikácia priamo číta z troch hlavných tabuliek. `vyroky` je primárny korpus fact-checkovaných výrokov a používa polia `id`, `vyrok`, `vyhodnotenie`, `odovodnenie`, `oblast`, `datum`, `meno`, `strana`, `embedding`, `source_id`, `numeric_id`, `url`, `speaker_url`, `analysis_paragraphs`, `analysis_date` a `scraped_at`. `clanky` drží interné články a používa `id`, `datum`, `autor`, `text_content`, `embedding` a `title`. `statement_sources` drží externé zdroje naviazané na výrok a používa `id`, `statement_id`, `position`, `label`, `url` a `title`.

Z pohľadu runtime sú read cesty najmä `vyroky` + RPC vyhľadávanie, `clanky` cez `match_articles` a `statement_sources` pre pripojené zdroje. Write cesta je hlavne `POST /api/statements`, ktorý zapisuje do `vyroky` a `statement_sources`; obohacovanie dát (`/api/sources/enrich`) spätne dopĺňa a kešuje `statement_sources.title`. Databázová logika, od ktorej aplikácia závisí, je postavená na RPC funkciách `search_statements`, `count_statements`, `match_statements`, `match_articles`, `list_distinct_values` a `statement_date_bounds`. Funkcia `exec_sql` existuje len ako prevádzkový/importný helper, nie ako požiadavka bežného používateľského runtime. Samostatne od runtime existujú aj staging/import objekty `vyroky_import_staging` a `statement_sources_import_staging`, ktoré slúžia pre importné pipeline, nie pre normálne používanie appky.

### Externe zavislosti a konfiguracia

Na beh aplikácie treba **Supabase/Postgres s `pgvector`**, embedding endpoint a **Gemini API**; feedback widget vie voliteľne zapisovať spätnú väzbu aj do Linearu. Supabase konfigurácia podporuje aliasy presne podľa runtime: `SUPABASE_URL` alebo `NEXT_PUBLIC_SUPABASE_URL`, verejný kľúč ako `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY` alebo `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, a admin kľúč ako `SUPABASE_SERVICE_KEY` alebo `SUPABASE_SERVICE_ROLE_KEY`.

Embeddingy sa konfigurujú cez `EMBEDDING_API_URL`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS` a `EMBEDDING_TIMEOUT_MS`; predvolene sa ráta s lokálnym Ollama-kompatibilným `/v1/embeddings`, modelom `qwen3-embedding:8b` a dimenziou `2048`. Gemini používa `GEMINI_API_KEY`, `GEMINI_FLASH_MODEL`, `GEMINI_PRO_MODEL` a `GEMINI_FLASH_LITE_MODEL` na porozumenie dopytu, klasifikáciu duplicít, prípadný rerank a batch backfill titulkov článkov. Na demo/debug sú k dispozícii `NEXT_PUBLIC_USE_SEARCH_MOCK`, `NEXT_PUBLIC_USE_DETECT_MOCK`, `ENABLE_SEARCH_RERANK` a `DEBUG_SEARCH_TIMINGS`. Voliteľný feedback do Linearu používa [`/api/feedback`](/Users/leon/conductor/workspaces/demagog/kinshasa/src/app/api/feedback/route.ts) a príslušné `LINEAR_*` premenné.

### Deploy, CI/CD a prevadzka

Repozitár dnes obsahuje praktické npm skripty pre `lint`, `test`, `typecheck:all` a `build`, a nasadenie je evidentne pripravené na Vercel. Zároveň tu dnes nie je žiadna checked-in GitHub Actions pipeline ani iný explicitný CI workflow. CI/CD teda nie je podmienka na samotné spustenie appky, ale pre bezpečnejšiu migráciu a prevádzku je rozumné ho doplniť.

Minimum, ktoré stačí na beh, je pripojený deployment target, správne nastavené env premenné a manuálna validácia cez `npm run lint`, `npm test`, `npm run typecheck:all` a `npm run build`. Rozumný ďalší krok je pridať CI, ktoré tieto kroky vynúti pred merge alebo deployom. Pre operatívu sú dôležité aj skripty v [`scripts`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts): najmä [`setup-supabase.sql`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/setup-supabase.sql), [`import-data.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/import-data.ts), [`import-hf-vyroky.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/import-hf-vyroky.ts), [`embed-statements.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/embed-statements.ts), [`embed-articles.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/embed-articles.ts) a [`title-clanky.ts`](/Users/leon/conductor/workspaces/demagog/kinshasa/scripts/title-clanky.ts).

### Migracia na live web a live DB

Presun z Vercelu na iný hosting, ktorý vie spoľahlivo prevádzkovať Next.js/Node.js aplikáciu, je tá jednoduchšia časť. Ťažšia časť je dátová integrácia. Táto appka nepotrebuje len prístup k existujúcej redakčnej databáze, ale očakáva vlastnú search infraštruktúru: vektorové stĺpce, RPC funkcie, importné a obohacovacie pipeline a pravidelné generovanie embeddingov.

Odporúčaný variant je synchronizovať živé dáta z hlavného systému do samostatnej aplikačnej search DB. Je to bezpečnejšie pre produkčnú redakčnú DB, umožňuje držať app-specifickú schému, RPC a embedding stĺpce bez kompromisov, izoluje záťaž z vektorového vyhľadávania a zjednodušuje rollout aj rollback. Alternatíva je integrácia priamo do live DB, ale tá vyžaduje schémové zmeny, `pgvector`, nasadenie vlastných SQL/RPC objektov a jasnú dohodu o prístupoch, ownershipe a prevádzkovej zodpovednosti.

## Spätná väzba

Toto README je len stručný prehľad pre interné použitie. Ak pri skúšaní narazíte na chybu, nejasnosť alebo máte nápad na zlepšenie, napíšte nám priamo cez tlačidlo **`Máte pripomienku?`** v aplikácii.
