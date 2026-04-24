# Detect Model Audit

Started: 2026-04-24T13:53:34.420Z
Finished: 2026-04-24T13:57:34.817Z

## Scope

This audit compares the current detect route across four variants:

- fast mode with Flash Lite and 10 retrieved candidates
- thorough mode with Flash Lite and 60 retrieved candidates
- thorough mode with Flash and 60 retrieved candidates
- thorough mode with Pro and 60 retrieved candidates

The route under test is the real `POST /api/detect` handler invoked in-process with local environment variables loaded from `.env.local`. The audit records wall-clock duration, route-reported `query_time_ms`, status, overall classification, and top returned matches.

Gold quality labels are intentionally coarse:

- `MATCH`: expected duplicate or related archive result
- `NEW_CLAIM`: expected no archive match
- `EXPLORATORY`: politician-style statement included for inspection but not scored

## Summary

| Variant | Model | 200s | Errors | Scored accuracy | Avg wall ms | p50 wall ms | p90 wall ms | Status counts |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| fast-lite | gemini-3.1-flash-lite-preview | 6 | 4 | 4/4 (100%) | 3027 | 2722 | 4505 | {"RELATED_ONLY":4,"ERROR":4,"NEW_CLAIM":1,"DUPLICATE_FOUND":1} |
| thorough-lite | gemini-3.1-flash-lite-preview | 7 | 3 | 5/5 (100%) | 4064 | 3946 | 4419 | {"RELATED_ONLY":4,"ERROR":3,"NEW_CLAIM":2,"DUPLICATE_FOUND":1} |
| thorough-flash | gemini-3-flash-preview | 1 | 9 | 1/1 (100%) | 10067 | 10067 | 10067 | {"ERROR":9,"NEW_CLAIM":1} |
| thorough-pro | gemini-3.1-pro-preview | 0 | 10 | - | - | - | - | {"ERROR":10} |

## Raw Results

| Case | Variant | Expected | HTTP | Overall | Expected matched | Wall ms | Query ms | Top match |
|---|---|---:|---:|---|---:|---:|---:|---|
| known-pediatrics-exact | fast-lite | MATCH | 200 | RELATED_ONLY | yes | 3355 | 3353 | RELATED 0.330 #6710 Michal Truban: Nám už teraz chýbajú vysoké stovky, možno tisícky lekárov, hovorí aj sa, že nám chýba 14-t |
| known-pediatrics-exact | thorough-lite | MATCH | 200 | RELATED_ONLY | yes | 3906 | 3905 | RELATED 0.330 #6710 Michal Truban: Nám už teraz chýbajú vysoké stovky, možno tisícky lekárov, hovorí aj sa, že nám chýba 14-t |
| known-pediatrics-exact | thorough-flash | MATCH | 502 | ERROR | n/a | 11013 | - | - |
| known-pediatrics-exact | thorough-pro | MATCH | 502 | ERROR | n/a | 11176 | - | - |
| known-pediatrics-paraphrase | fast-lite | MATCH | 200 | RELATED_ONLY | yes | 4505 | 4505 | RELATED 0.382 #15107 Milan Majerský: ...lekári, ktorých skončí približne tisíc z lekárskych fakúlt na Slovensku (..) idú do zah |
| known-pediatrics-paraphrase | thorough-lite | MATCH | 200 | RELATED_ONLY | yes | 4418 | 4418 | RELATED 0.382 #15107 Milan Majerský: ...lekári, ktorých skončí približne tisíc z lekárskych fakúlt na Slovensku (..) idú do zah |
| known-pediatrics-paraphrase | thorough-flash | MATCH | 502 | ERROR | n/a | 11408 | - | - |
| known-pediatrics-paraphrase | thorough-pro | MATCH | 502 | ERROR | n/a | 11157 | - | - |
| known-consolidation-paraphrase | fast-lite | MATCH | 200 | RELATED_ONLY | yes | 2528 | 2527 | RELATED 0.262 #5458 Peter Kažimír: Váš(balík vlády Ivety Radičovej, pozn.) balík konsolidácie dopadol na hospodársky rast v o |
| known-consolidation-paraphrase | thorough-lite | MATCH | 200 | RELATED_ONLY | yes | 3902 | 3902 | RELATED 0.262 #5458 Peter Kažimír: Váš(balík vlády Ivety Radičovej, pozn.) balík konsolidácie dopadol na hospodársky rast v o |
| known-consolidation-paraphrase | thorough-flash | MATCH | 502 | ERROR | n/a | 10888 | - | - |
| known-consolidation-paraphrase | thorough-pro | MATCH | 502 | ERROR | n/a | 11029 | - | - |
| war-claim-user-repro | fast-lite | MATCH | 502 | ERROR | n/a | 268 | - | - |
| war-claim-user-repro | thorough-lite | MATCH | 502 | ERROR | n/a | 204 | - | - |
| war-claim-user-repro | thorough-flash | MATCH | 502 | ERROR | n/a | 189 | - | - |
| war-claim-user-repro | thorough-pro | MATCH | 502 | ERROR | n/a | 10804 | - | - |
| oncology-related | fast-lite | MATCH | 502 | ERROR | n/a | 824 | - | - |
| oncology-related | thorough-lite | MATCH | 502 | ERROR | n/a | 733 | - | - |
| oncology-related | thorough-flash | MATCH | 502 | ERROR | n/a | 669 | - | - |
| oncology-related | thorough-pro | MATCH | 502 | ERROR | n/a | 697 | - | - |
| eu-soldiers-ukraine | fast-lite | exploratory | 502 | ERROR | n/a | 1266 | - | - |
| eu-soldiers-ukraine | thorough-lite | exploratory | 502 | ERROR | n/a | 1136 | - | - |
| eu-soldiers-ukraine | thorough-flash | exploratory | 502 | ERROR | n/a | 10634 | - | - |
| eu-soldiers-ukraine | thorough-pro | exploratory | 502 | ERROR | n/a | 10716 | - | - |
| mars-new-claim | fast-lite | NEW_CLAIM | 200 | NEW_CLAIM | yes | 2722 | 2721 | UNRELATED 0.170 #9204 Robert Fico: To mi je naozaj ľúto, čo ste povedali ohľadne toho druhého nálezu, ktorý sa týka vyvlastňo |
| mars-new-claim | thorough-lite | NEW_CLAIM | 200 | NEW_CLAIM | yes | 3723 | 3722 | UNRELATED 0.170 #9204 Robert Fico: To mi je naozaj ľúto, čo ste povedali ohľadne toho druhého nálezu, ktorý sa týka vyvlastňo |
| mars-new-claim | thorough-flash | NEW_CLAIM | 200 | NEW_CLAIM | yes | 10067 | 10067 | UNRELATED 0.170 #9204 Robert Fico: To mi je naozaj ľúto, čo ste povedali ohľadne toho druhého nálezu, ktorý sa týka vyvlastňo |
| mars-new-claim | thorough-pro | NEW_CLAIM | 502 | ERROR | n/a | 11010 | - | - |
| synthetic-hydrogen-fire-stations | fast-lite | NEW_CLAIM | 502 | ERROR | n/a | 823 | - | - |
| synthetic-hydrogen-fire-stations | thorough-lite | NEW_CLAIM | 200 | NEW_CLAIM | yes | 4419 | 4419 | UNRELATED 0.240 #85 Robert Fico: Rozpočet, ktorý schválila predchádzajúca vláda v roku 2011 na rok 2012 sa líši od reality  |
| synthetic-hydrogen-fire-stations | thorough-flash | NEW_CLAIM | 502 | ERROR | n/a | 11215 | - | - |
| synthetic-hydrogen-fire-stations | thorough-pro | NEW_CLAIM | 502 | ERROR | n/a | 11285 | - | - |
| doctors-growth | fast-lite | exploratory | 200 | RELATED_ONLY | n/a | 2927 | 2926 | RELATED 0.548 #17474 Peter Pellegrini: Ak hovoríme o nedostatku lekárov, preto sa pýtam, prečo ste nepokračovali v systéme, ktorý |
| doctors-growth | thorough-lite | exploratory | 200 | RELATED_ONLY | n/a | 3946 | 3946 | RELATED 0.548 #17474 Peter Pellegrini: Ak hovoríme o nedostatku lekárov, preto sa pýtam, prečo ste nepokračovali v systéme, ktorý |
| doctors-growth | thorough-flash | exploratory | 502 | ERROR | n/a | 11041 | - | - |
| doctors-growth | thorough-pro | exploratory | 502 | ERROR | n/a | 11474 | - | - |
| ukraine-aid | fast-lite | exploratory | 200 | DUPLICATE_FOUND | n/a | 2123 | 2122 | DUPLICATE 0.609 #17672 Juraj Blanár: Pretože sme významným spôsobom Ukrajine pomohli tým, že sa tam dalo vyše 700 000 000 vojen |
| ukraine-aid | thorough-lite | exploratory | 200 | DUPLICATE_FOUND | n/a | 4131 | 4130 | DUPLICATE 0.609 #17672 Juraj Blanár: Pretože sme významným spôsobom Ukrajine pomohli tým, že sa tam dalo vyše 700 000 000 vojen |
| ukraine-aid | thorough-flash | exploratory | 502 | ERROR | n/a | 11060 | - | - |
| ukraine-aid | thorough-pro | exploratory | 502 | ERROR | n/a | 10989 | - | - |

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

- This is a single-run audit, so latency numbers are directional rather than statistically stable.
- `thorough-*` variants use the same thorough retrieval depth and differ only by model override.
- `fast-lite` is included as the current fast-mode baseline and uses fewer candidates, so it is not a pure model-only comparison.
- A follow-up classifier-only benchmark would classify an identical candidate set with each model to isolate model quality from retrieval depth.
