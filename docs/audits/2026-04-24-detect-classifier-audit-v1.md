# Detect Classifier Audit

Started: 2026-04-24T14:26:48.528Z
Finished: 2026-04-24T14:36:15.841Z
Candidate count: 30
Classifier timeout: 45000ms
Groq delay: 12000ms
Groq max retries: 3

## Scope

This script benchmarks classifier choice only. It retrieves one shared candidate set per statement, then classifies that same candidate set with Gemini Flash Lite and selected Groq models.

## Summary

| Variant | Provider | Model | Successes | Errors | Scored accuracy | Avg total ms | p50 total ms | p90 total ms | Avg classify ms | p90 classify ms | Status counts |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| gemini-flash-lite | gemini | gemini-3.1-flash-lite-preview | 10 | 0 | 7/7 (100%) | 3005 | 2962 | 3706 | 1603 | 1918 | {"RELATED_ONLY":7,"NEW_CLAIM":2,"DUPLICATE_FOUND":1} |
| groq-llama-4-scout | groq | meta-llama/llama-4-scout-17b-16e-instruct | 10 | 0 | 5/7 (71%) | 2621 | 2457 | 3421 | 1219 | 2117 | {"RELATED_ONLY":7,"DUPLICATE_FOUND":1,"NEW_CLAIM":2} |
| groq-llama-3.3-70b | groq | llama-3.3-70b-versatile | 10 | 0 | 5/7 (71%) | 2262 | 2079 | 2546 | 860 | 1120 | {"RELATED_ONLY":6,"NEW_CLAIM":4} |
| groq-llama-3.1-8b | groq | llama-3.1-8b-instant | 10 | 0 | 7/7 (100%) | 2500 | 2286 | 3187 | 1098 | 2036 | {"DUPLICATE_FOUND":8,"NEW_CLAIM":2} |
| groq-gpt-oss-120b | groq | openai/gpt-oss-120b | 10 | 0 | 7/7 (100%) | 3945 | 3476 | 4648 | 2543 | 3560 | {"RELATED_ONLY":7,"NEW_CLAIM":2,"DUPLICATE_FOUND":1} |

## Retrieval

| Case | Retrieval | Candidates | Retrieval ms | Top candidate | Error |
|---|---|---:|---:|---|---|
| known-pediatrics-exact | lexical | 10 | 1435 | #6710 0.330 Michal Truban: Nám už teraz chýbajú vysoké stovky, možno tisícky lekárov, hovorí aj sa, že nám chýba 14-t | - |
| known-pediatrics-paraphrase | lexical | 30 | 1304 | #18173 0.386 Jozef Kollár: Je tu obrovský priestor spomínaných daňových únikov, Slovensko je druhé najväčšie úniky v  | - |
| known-consolidation-paraphrase | lexical | 9 | 1111 | #5458 0.262 Peter Kažimír: Váš(balík vlády Ivety Radičovej, pozn.) balík konsolidácie dopadol na hospodársky rast v o | - |
| war-claim-user-repro | lexical | 30 | 929 | #7333 0.257 Robert Fico: ...a rozvešajú po Slovensku stovky billboardov a pošlú občanom do pošty letáky s touto inf | - |
| oncology-related | lexical | 25 | 1426 | #4369 0.235 Roman Mikulec: Na tých ľudí sa môže potom pozerať nejakým spôsobom, že už teda majú nejaký delikt za sebo | - |
| eu-soldiers-ukraine | lexical | 30 | 1788 | #1096 0.405 Robert Kaliňák: Aj nám Európska únia predpovedá, že budeme ekonomickými lídrami na dva roky. | - |
| mars-new-claim | lexical | 4 | 2111 | #9204 0.170 Robert Fico: To mi je naozaj ľúto, čo ste povedali ohľadne toho druhého nálezu, ktorý sa týka vyvlastňo | - |
| synthetic-hydrogen-fire-stations | lexical | 13 | 1451 | #85 0.240 Robert Fico: Rozpočet, ktorý schválila predchádzajúca vláda v roku 2011 na rok 2012 sa líši od reality  | - |
| doctors-growth | lexical | 30 | 1213 | #17474 0.548 Peter Pellegrini: Ak hovoríme o nedostatku lekárov, preto sa pýtam, prečo ste nepokračovali v systéme, ktorý | - |
| ukraine-aid | lexical | 30 | 1252 | #14690 0.687 Veronika Cifrová Ostrihoňová: Blokuje sa nám vyplatenie 300 000 000 za MIGy, ktoré sme poskytli Ukrajine a za ktoré sme  | - |

## Raw Results

| Case | Variant | Expected | Overall | Expected matched | Retrieval ms | Classify ms | Total ms | Top match | Error |
|---|---|---:|---|---:|---:|---:|---:|---|---|
| known-pediatrics-exact | gemini-flash-lite | MATCH | RELATED_ONLY | yes | 1435 | 1168 | 2603 | RELATED 0.330 #6710 Michal Truban: Nám už teraz chýbajú vysoké stovky, možno tisícky lekárov, hovorí aj sa, že nám chýba 14-t | - |
| known-pediatrics-exact | groq-llama-4-scout | MATCH | RELATED_ONLY | yes | 1435 | 736 | 2171 | RELATED 0.330 #6710 Michal Truban: Nám už teraz chýbajú vysoké stovky, možno tisícky lekárov, hovorí aj sa, že nám chýba 14-t | - |
| known-pediatrics-exact | groq-llama-3.3-70b | MATCH | RELATED_ONLY | yes | 1435 | 644 | 2079 | RELATED 0.330 #6710 Michal Truban: Nám už teraz chýbajú vysoké stovky, možno tisícky lekárov, hovorí aj sa, že nám chýba 14-t | - |
| known-pediatrics-exact | groq-llama-3.1-8b | MATCH | DUPLICATE_FOUND | yes | 1435 | 500 | 1935 | DUPLICATE 0.330 #6710 Michal Truban: Nám už teraz chýbajú vysoké stovky, možno tisícky lekárov, hovorí aj sa, že nám chýba 14-t | - |
| known-pediatrics-exact | groq-gpt-oss-120b | MATCH | RELATED_ONLY | yes | 1435 | 1893 | 3328 | RELATED 0.330 #6710 Michal Truban: Nám už teraz chýbajú vysoké stovky, možno tisícky lekárov, hovorí aj sa, že nám chýba 14-t | - |
| known-pediatrics-paraphrase | gemini-flash-lite | MATCH | RELATED_ONLY | yes | 1304 | 1838 | 3142 | RELATED 0.382 #15107 Milan Majerský: ...lekári, ktorých skončí približne tisíc z lekárskych fakúlt na Slovensku (..) idú do zah | - |
| known-pediatrics-paraphrase | groq-llama-4-scout | MATCH | DUPLICATE_FOUND | yes | 1304 | 2117 | 3421 | DUPLICATE 0.254 #5636 Robert Fico: Bol som niekoľko rokov, pán redaktor, predsedom väzenskej komisie a poznám všetky väznice  | - |
| known-pediatrics-paraphrase | groq-llama-3.3-70b | MATCH | RELATED_ONLY | yes | 1304 | 976 | 2280 | RELATED 0.382 #15107 Milan Majerský: ...lekári, ktorých skončí približne tisíc z lekárskych fakúlt na Slovensku (..) idú do zah | - |
| known-pediatrics-paraphrase | groq-llama-3.1-8b | MATCH | DUPLICATE_FOUND | yes | 1304 | 963 | 2267 | DUPLICATE 0.382 #15107 Milan Majerský: ...lekári, ktorých skončí približne tisíc z lekárskych fakúlt na Slovensku (..) idú do zah | - |
| known-pediatrics-paraphrase | groq-gpt-oss-120b | MATCH | RELATED_ONLY | yes | 1304 | 2172 | 3476 | RELATED 0.382 #15107 Milan Majerský: ...lekári, ktorých skončí približne tisíc z lekárskych fakúlt na Slovensku (..) idú do zah | - |
| known-consolidation-paraphrase | gemini-flash-lite | MATCH | RELATED_ONLY | yes | 1111 | 1038 | 2149 | RELATED 0.262 #5458 Peter Kažimír: Váš(balík vlády Ivety Radičovej, pozn.) balík konsolidácie dopadol na hospodársky rast v o | - |
| known-consolidation-paraphrase | groq-llama-4-scout | MATCH | RELATED_ONLY | yes | 1111 | 1028 | 2139 | RELATED 0.262 #5458 Peter Kažimír: Váš(balík vlády Ivety Radičovej, pozn.) balík konsolidácie dopadol na hospodársky rast v o | - |
| known-consolidation-paraphrase | groq-llama-3.3-70b | MATCH | RELATED_ONLY | yes | 1111 | 864 | 1975 | RELATED 0.253 #15126 Ivan Štefanec: Minulý rok to boli 2 tretiny z konsolidácie. | - |
| known-consolidation-paraphrase | groq-llama-3.1-8b | MATCH | DUPLICATE_FOUND | yes | 1111 | 607 | 1718 | DUPLICATE 0.253 #15126 Ivan Štefanec: Minulý rok to boli 2 tretiny z konsolidácie. | - |
| known-consolidation-paraphrase | groq-gpt-oss-120b | MATCH | RELATED_ONLY | yes | 1111 | 1958 | 3069 | RELATED 0.255 #12565 Juraj Miškov: My sme konsolidovali predovšetkým na strane výdavkov. Dve tretiny šetrenia alebo teda kons | - |
| war-claim-user-repro | gemini-flash-lite | MATCH | RELATED_ONLY | yes | 929 | 1926 | 2855 | RELATED 0.252 #7593 Michal Šimečka: Od vypuknutia vojny sme ako Európska únia 23 - 24 miliárd poslal Rusku, z ktorých on finan | - |
| war-claim-user-repro | groq-llama-4-scout | MATCH | NEW_CLAIM | no | 929 | 371 | 1300 | UNRELATED 0.257 #7333 Robert Fico: ...a rozvešajú po Slovensku stovky billboardov a pošlú občanom do pošty letáky s touto inf | - |
| war-claim-user-repro | groq-llama-3.3-70b | MATCH | RELATED_ONLY | yes | 929 | 799 | 1728 | RELATED 0.252 #8474 Ondrej Dostál: Vy (Eduard Chmelár, pozn.) ste tvrdil, že Putin nie je taký blázon, aby zaútočil na Rusko, | - |
| war-claim-user-repro | groq-llama-3.1-8b | MATCH | DUPLICATE_FOUND | yes | 929 | 2258 | 3187 | DUPLICATE 0.252 #7593 Michal Šimečka: Od vypuknutia vojny sme ako Európska únia 23 - 24 miliárd poslal Rusku, z ktorých on finan | - |
| war-claim-user-repro | groq-gpt-oss-120b | MATCH | RELATED_ONLY | yes | 929 | 3560 | 4489 | RELATED 0.252 #7593 Michal Šimečka: Od vypuknutia vojny sme ako Európska únia 23 - 24 miliárd poslal Rusku, z ktorých on finan | - |
| oncology-related | gemini-flash-lite | MATCH | RELATED_ONLY | yes | 1426 | 1717 | 3143 | RELATED 0.167 #14613 Andrej Kiska: V Rumunsku preplácajú 60 % (moderných onkologických liekov - pozn.) | - |
| oncology-related | groq-llama-4-scout | MATCH | RELATED_ONLY | yes | 1426 | 585 | 2011 | RELATED 0.167 #14613 Andrej Kiska: V Rumunsku preplácajú 60 % (moderných onkologických liekov - pozn.) | - |
| oncology-related | groq-llama-3.3-70b | MATCH | NEW_CLAIM | no | 1426 | 1120 | 2546 | UNRELATED 0.235 #4369 Roman Mikulec: Na tých ľudí sa môže potom pozerať nejakým spôsobom, že už teda majú nejaký delikt za sebo | - |
| oncology-related | groq-llama-3.1-8b | MATCH | DUPLICATE_FOUND | yes | 1426 | 1108 | 2534 | DUPLICATE 0.167 #14613 Andrej Kiska: V Rumunsku preplácajú 60 % (moderných onkologických liekov - pozn.) | - |
| oncology-related | groq-gpt-oss-120b | MATCH | RELATED_ONLY | yes | 1426 | 3031 | 4457 | RELATED 0.167 #14613 Andrej Kiska: V Rumunsku preplácajú 60 % (moderných onkologických liekov - pozn.) | - |
| eu-soldiers-ukraine | gemini-flash-lite | exploratory | RELATED_ONLY | n/a | 1788 | 1918 | 3706 | RELATED 0.388 #542 Vladimíra Marcinková: Maďarsko, konkrétne Viktor Orbán je človek, ktorý bojuje, ktorý blokuje mierový balík pomo | - |
| eu-soldiers-ukraine | groq-llama-4-scout | exploratory | RELATED_ONLY | n/a | 1788 | 1252 | 3040 | RELATED 0.388 #14327 Michal Šimečka: No Európska únia, Európska prokuratúra a Európska komisia hovorí, že preboha, nerobte to.  | - |
| eu-soldiers-ukraine | groq-llama-3.3-70b | exploratory | NEW_CLAIM | n/a | 1788 | 549 | 2337 | UNRELATED 0.405 #1096 Robert Kaliňák: Aj nám Európska únia predpovedá, že budeme ekonomickými lídrami na dva roky. | - |
| eu-soldiers-ukraine | groq-llama-3.1-8b | exploratory | DUPLICATE_FOUND | n/a | 1788 | 1116 | 2904 | DUPLICATE 0.385 #1827 Robert Fico: Teraz nechcem tu na nikoho nadávať, ale ja sa stotožňujem so slovami maďarského ministra z | - |
| eu-soldiers-ukraine | groq-gpt-oss-120b | exploratory | RELATED_ONLY | n/a | 1788 | 4152 | 5940 | RELATED 0.385 #1827 Robert Fico: Teraz nechcem tu na nikoho nadávať, ale ja sa stotožňujem so slovami maďarského ministra z | - |
| mars-new-claim | gemini-flash-lite | NEW_CLAIM | NEW_CLAIM | yes | 2111 | 1694 | 3805 | UNRELATED 0.170 #9204 Robert Fico: To mi je naozaj ľúto, čo ste povedali ohľadne toho druhého nálezu, ktorý sa týka vyvlastňo | - |
| mars-new-claim | groq-llama-4-scout | NEW_CLAIM | NEW_CLAIM | yes | 2111 | 761 | 2872 | UNRELATED 0.170 #9204 Robert Fico: To mi je naozaj ľúto, čo ste povedali ohľadne toho druhého nálezu, ktorý sa týka vyvlastňo | - |
| mars-new-claim | groq-llama-3.3-70b | NEW_CLAIM | NEW_CLAIM | yes | 2111 | 1663 | 3774 | UNRELATED 0.170 #9204 Robert Fico: To mi je naozaj ľúto, čo ste povedali ohľadne toho druhého nálezu, ktorý sa týka vyvlastňo | - |
| mars-new-claim | groq-llama-3.1-8b | NEW_CLAIM | NEW_CLAIM | yes | 2111 | 329 | 2440 | UNRELATED 0.170 #9204 Robert Fico: To mi je naozaj ľúto, čo ste povedali ohľadne toho druhého nálezu, ktorý sa týka vyvlastňo | - |
| mars-new-claim | groq-gpt-oss-120b | NEW_CLAIM | NEW_CLAIM | yes | 2111 | 745 | 2856 | UNRELATED 0.170 #9204 Robert Fico: To mi je naozaj ľúto, čo ste povedali ohľadne toho druhého nálezu, ktorý sa týka vyvlastňo | - |
| synthetic-hydrogen-fire-stations | gemini-flash-lite | NEW_CLAIM | NEW_CLAIM | yes | 1451 | 1258 | 2709 | UNRELATED 0.240 #85 Robert Fico: Rozpočet, ktorý schválila predchádzajúca vláda v roku 2011 na rok 2012 sa líši od reality  | - |
| synthetic-hydrogen-fire-stations | groq-llama-4-scout | NEW_CLAIM | RELATED_ONLY | no | 1451 | 1006 | 2457 | RELATED 0.203 #14319 Ivan Mikloš: Iný príklad, vláda bývalá schválila aj v parlamente, zvýšila rodičovské príspevky pred voľ | - |
| synthetic-hydrogen-fire-stations | groq-llama-3.3-70b | NEW_CLAIM | RELATED_ONLY | no | 1451 | 724 | 2175 | RELATED 0.183 #3396 Ivan Švejna: vláda schválila úľavy, daňové úľavy, čo sú de facto dotácie 10 podnikov vo výške 120 milió | - |
| synthetic-hydrogen-fire-stations | groq-llama-3.1-8b | NEW_CLAIM | NEW_CLAIM | yes | 1451 | 2036 | 3487 | UNRELATED 0.240 #85 Robert Fico: Rozpočet, ktorý schválila predchádzajúca vláda v roku 2011 na rok 2012 sa líši od reality  | - |
| synthetic-hydrogen-fire-stations | groq-gpt-oss-120b | NEW_CLAIM | NEW_CLAIM | yes | 1451 | 1336 | 2787 | UNRELATED 0.240 #85 Robert Fico: Rozpočet, ktorý schválila predchádzajúca vláda v roku 2011 na rok 2012 sa líši od reality  | - |
| doctors-growth | gemini-flash-lite | exploratory | RELATED_ONLY | n/a | 1213 | 1749 | 2962 | RELATED 0.548 #17474 Peter Pellegrini: Ak hovoríme o nedostatku lekárov, preto sa pýtam, prečo ste nepokračovali v systéme, ktorý | - |
| doctors-growth | groq-llama-4-scout | exploratory | RELATED_ONLY | n/a | 1213 | 2453 | 3666 | RELATED 0.544 #8588 Erik Tomáš: Napríklad v prípade lekárov je to až jedna tretina lekárov, ktorí vyštudujú tu, idú do zah | - |
| doctors-growth | groq-llama-3.3-70b | exploratory | RELATED_ONLY | n/a | 1213 | 676 | 1889 | RELATED 0.328 #6710 Michal Truban: Nám už teraz chýbajú vysoké stovky, možno tisícky lekárov, hovorí aj sa, že nám chýba 14-t | - |
| doctors-growth | groq-llama-3.1-8b | exploratory | DUPLICATE_FOUND | n/a | 1213 | 1027 | 2240 | DUPLICATE 0.544 #8588 Erik Tomáš: Napríklad v prípade lekárov je to až jedna tretina lekárov, ktorí vyštudujú tu, idú do zah | - |
| doctors-growth | groq-gpt-oss-120b | exploratory | RELATED_ONLY | n/a | 1213 | 3184 | 4397 | RELATED 0.548 #17474 Peter Pellegrini: Ak hovoríme o nedostatku lekárov, preto sa pýtam, prečo ste nepokračovali v systéme, ktorý | - |
| ukraine-aid | gemini-flash-lite | exploratory | DUPLICATE_FOUND | n/a | 1252 | 1725 | 2977 | DUPLICATE 0.609 #17672 Juraj Blanár: Pretože sme významným spôsobom Ukrajine pomohli tým, že sa tam dalo vyše 700 000 000 vojen | - |
| ukraine-aid | groq-llama-4-scout | exploratory | RELATED_ONLY | n/a | 1252 | 1879 | 3131 | RELATED 0.687 #14690 Veronika Cifrová Ostrihoňová: Blokuje sa nám vyplatenie 300 000 000 za MIGy, ktoré sme poskytli Ukrajine a za ktoré sme  | - |
| ukraine-aid | groq-llama-3.3-70b | exploratory | NEW_CLAIM | n/a | 1252 | 583 | 1835 | UNRELATED 0.687 #14690 Veronika Cifrová Ostrihoňová: Blokuje sa nám vyplatenie 300 000 000 za MIGy, ktoré sme poskytli Ukrajine a za ktoré sme  | - |
| ukraine-aid | groq-llama-3.1-8b | exploratory | DUPLICATE_FOUND | n/a | 1252 | 1034 | 2286 | DUPLICATE 0.609 #17672 Juraj Blanár: Pretože sme významným spôsobom Ukrajine pomohli tým, že sa tam dalo vyše 700 000 000 vojen | - |
| ukraine-aid | groq-gpt-oss-120b | exploratory | DUPLICATE_FOUND | n/a | 1252 | 3396 | 4648 | DUPLICATE 0.609 #17672 Juraj Blanár: Pretože sme významným spôsobom Ukrajine pomohli tým, že sa tam dalo vyše 700 000 000 vojen | - |

## Cases

- `known-pediatrics-exact`: Na severe Slovenska chýbajú asi tri stovky pediatrov. (MATCH) — Seeded from existing live API test; should find duplicate or related archive result.
- `known-pediatrics-paraphrase`: Na severe Slovenska chýba približne 300 pediatrov. (MATCH) — Paraphrase of the known pediatrics statement.
- `known-consolidation-paraphrase`: Bežný občan musí znášať 42 percent konsolidácie. (MATCH) — Seeded from scripts/test-queries.ts as a rephrased known archive statement.
- `war-claim-user-repro`: Pošlú nás na vojnu. (MATCH) — User-reported repro that previously found a result.
- `oncology-related`: Kabinet pripravuje plán na výrazné skrátenie čakacích lehôt pri onkologických vyšetreniach. (MATCH) — Seeded from existing live API test; should find same-topic related archive result.
- `eu-soldiers-ukraine`: Európska komisia nám prikáže posielať slovenských vojakov na Ukrajinu. (EXPLORATORY) — Politician-style security claim; useful to inspect retrieval/classification, not gold-labeled.
- `mars-new-claim`: Na planéte Mars sa objavila tekutá voda pod povrchom krátera Jezero. (NEW_CLAIM) — Seeded from existing live API test as novel/non-Slovak-politics claim.
- `synthetic-hydrogen-fire-stations`: Vláda schválila, že každý okres dostane do konca roka 2026 jednu novú vodíkovú hasičskú stanicu. (NEW_CLAIM) — Made-up politician-style claim expected to have no direct archive match.
- `doctors-growth`: Od roku 2020 sa počet lekárov na Slovensku zvýšil o desaťtisíc. (EXPLORATORY) — Politician-style health claim; useful for model comparison but not gold-labeled.
- `ukraine-aid`: Slovensko poslalo Ukrajine vojenskú pomoc za viac ako 700 miliónov eur. (EXPLORATORY) — Politician-style foreign/security claim; likely archive-adjacent but not gold-labeled.

## Notes

- Groq calls use the OpenAI-compatible Chat Completions endpoint with `response_format: { "type": "json_object" }`.
- The audit requires `GROQ_API_KEY` and `GEMINI_API_KEY` in `.env.local`.
- This is still a small labeled set. Treat results as directional until expanded with exact expected archive IDs.
