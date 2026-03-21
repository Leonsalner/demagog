# Demagog: interný nástroj na rešerš a kontrolu výrokov

Tento nástroj pomáha redakcii rýchlo overiť, či Demagog už daný výrok v minulosti analyzoval. Vyhľadávanie a detekcia duplicít sú spojené do jedného rozhrania. Aplikácia vás automaticky posunie od prvého preverenia až k uloženiu nového záznamu, bez zbytočného preklikávania.

*(Pri prvom otvorení vás prevedie krátky vstavaný návod. Kedykoľvek sa k nemu môžete vrátiť cez tlačidlo **Návod** v pravom dolnom rohu).*

## Vyhľadávanie a kontrola výrokov

- **Vyhľadávanie:** Výborné na hľadanie širšieho kontextu. Pýtajte sa vlastnými slovami, hľadajte konkrétnu tému, osobu alebo otázku (napr. *"Čo povedal XY o zdravotníctve?"*).
- **Detekcia duplicít:** Ak už máte presné znenie výroku, vložte ho sem. Aplikácia ho bleskovo porovná s existujúcimi záznamami v archíve.

<p align="center">
  <img src="public/onboarding/step-02-search-light.png" alt="Prirodzené vyhľadávanie s automaticky doplnenými filtrami a výsledkami." width="1100" />
</p>

## Automatická príprava podkladov

Po odoslaní výroku do Detekcie prebehne rýchla kontrola.

- **Nový výrok:** Ak sa v archíve nič podobné nenájde, systém to hneď potvrdí.
- **Zlúčený prehľad:** Ak sa nájdu podobné výroky alebo články, aplikácia z nich automaticky pripraví prehľad. Odpadá akékoľvek ručné potvrdzovanie. Všetky potrebné zdroje (výroky, články) máte na jednej obrazovke a môžete z nich rovno čerpať pri písaní nového hodnotenia.

<p align="center">
  <img src="public/onboarding/step-03-detect-light.png" alt="Detekcia duplicít v stave prípravy súhrnného prieskumu." width="1100" />
</p>

## Pridanie nového záznamu

Formulár na pridanie nového výroku otvoríte priamo nad zhromaždenými podkladmi. Nemusíte odchádzať na inú stránku – kontext z prehľadu máte stále pred očami.

<p align="center">
  <img src="public/onboarding/step-04-research-light.png" alt="Súhrnný prieskum otvorený po detekcii so súvisiacimi článkami a výrokmi." width="1100" />
</p>

<p align="center">
  <img src="public/onboarding/step-05-add-light.png" alt="Formulár na pridanie nového výroku otvorený priamo nad prieskumom." width="1100" />
</p>

*(Samostatná stránka `/add` stále existuje, ale pri bežnej práci väčšinou stačí toto kontextové pridávanie).*

---

## Technický prehľad

Aplikácia je postavená ako moderné full-stack riešenie v jednom repozitári.

### Architektúra a technológie
- **Frontend & Backend:** Next.js 16 (App Router) a React 19, písané v TypeScripte pre Node.js runtime. Nasadenie je orientované na Vercel (`.vercel/project.json`).
- **Databáza:** Supabase (PostgreSQL) s rozšírením `pgvector` pre podobnostné vyhľadávanie.
- **AI modely:** Gemini API na porozumenie dopytu, klasifikáciu zhôd a preklady (používa modely rodiny `gemini-1.5`). Vektorové embeddingy bežia externe (Ollama-kompatibilné `/v1/embeddings`, napr. `qwen3-embedding:8b`).

### Zákulisie (API a Dáta)
- **`/api/search`:** Dopyt sa prevedie na embedding, vyhľadá cez Supabase RPC a (voliteľne) spresní cez Gemini.
- **`/api/detect`:** Nový výrok sa porovná s archívom (RPC zhoda + lexikálny fallback). Gemini následne určí, či ide o duplikát, súvisiaci alebo nesúvisiaci výrok.
- **`/api/research/*`:** Zostavuje pracovný priestor z interných článkov (`clanky`) a externých zdrojov (`statement_sources`). Pre rýchlejšie hľadanie článkov používa optimalizované dávkové hľadanie (`match_articles_batch`).
- **`POST /api/statements`:** Záznam sa zapisuje atomicky do tabuliek `vyroky` a `statement_sources` cez RPC `create_statement_with_sources`. Embedding sa generuje asynchrónne na pozadí až po úspešnom uložení.

### Databáza (Supabase a RPC)
Aplikácia stojí na 3 hlavných tabuľkách:
- `vyroky` (primárne výroky s hodnoteniami a embeddingmi)
- `clanky` (interné články)
- `statement_sources` (externé linky k výrokom)

**Kľúčové RPC funkcie:**
- `search_statements`, `match_statements`, `count_statements`, `statement_date_bounds`, `list_distinct_values`
- `match_articles` a dávkové hľadanie `match_articles_batch`
- `create_statement_with_sources` (zabezpečuje bezpečný spojený zápis výroku a zdrojov v jednej transakcii)
*(Poznámka: funkcia `exec_sql` a staging tabuľky slúžia len pre prevádzkové importy, nie pre používateľský runtime).*

### Konfigurácia a beh
Pre spustenie potrebujete platné `SUPABASE_URL` a kľúče, `GEMINI_API_KEY` a konfiguráciu pre `EMBEDDING_*`. Pre vývoj sú dostupné mock prepínače (`NEXT_PUBLIC_USE_SEARCH_MOCK`, atď.). Spätná väzba do Linearu sa nastavuje cez `LINEAR_*`.

**Skripty (v `/scripts`):** Užitočné na prevádzku, import a údržbu, napr.:
- `setup-supabase.sql` (inštalácia schémy a RPC)
- `verify-supabase-rpcs.ts` (kontrola prítomnosti a platnosti RPC)
- Ďalšie skripty na prácu s dátami (`import-data.ts`, `embed-statements.ts`, atď.)

*(Pre kontrolu aplikácie sú k dispozícii príkazy `npm run lint`, `npm run test` a `npm run typecheck:all`).*

### Migrácia na produkciu
Aplikácia vyžaduje vlastnú vyhľadávaciu infraštruktúru (vektorové stĺpce, špecifické RPC funkcie, importné pipeline). Najbezpečnejšou cestou je jednosmerná synchronizácia dát zo živej redakčnej databázy do tejto aplikačnej (search) databázy. Oddelí sa tak záťaž vektorového vyhľadávania a ochráni sa hlavná produkčná databáza.

---

## Spätná väzba

Ak pri skúšaní narazíte na chybu, nejasnosť alebo máte nápad na zlepšenie, napíšte nám priamo cez tlačidlo v hlavičke alebo cez ikonu otázniku vpravo dole v aplikácii.
