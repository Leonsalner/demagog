import type {
  DetectResponse,
  FiltersResponse,
  SearchResponse,
  Statement,
} from "@/types";

export const fullStatement: Statement = {
  id: 101,
  vyrok: "42 % konsolidácie musí zvládať bežný občan.",
  vyhodnotenie: "Pravda",
  odovodnenie:
    "Podľa rozpočtových odhadov niesli domácnosti výraznú časť konsolidačných opatrení cez vyššie dane a poplatky.",
  datum: "2026-01-11",
  meno: "Milan Majerský",
  strana: "KDH",
  url: "https://demagog.sk/vyrok/101",
  similarity: 0.94,
};

export const minimalStatement: Statement = {
  id: 102,
  vyrok: "Štát nemá pripravený funkčný plán výstavby nájomných bytov.",
  vyhodnotenie: "Nepravda",
  odovodnenie:
    "Ministerstvo už v tom čase zverejnilo schválený investičný harmonogram aj financovanie prvých projektov.",
  datum: "2025-10-02",
  meno: "Mária Kolíková",
  strana: "SaS",
  url: "https://demagog.sk/vyrok/102",
};

export const noDatumStatement: Statement = {
  id: 103,
  vyrok: "V severných regiónoch dlhodobo chýbajú pediatri.",
  vyhodnotenie: "Pravda",
  odovodnenie:
    "Dáta poisťovní aj profesijných komôr potvrdzovali dlhodobý deficit pediatrov v niekoľkých okresoch.",
  datum: null,
  meno: "Veronika Remišová",
  strana: "OĽaNO",
  url: "https://demagog.sk/vyrok/103",
};

export const noReasoningStatement: Statement = {
  id: 104,
  vyrok: "Vláda znížila reálne investície do železníc.",
  vyhodnotenie: "Zavádzajúce",
  odovodnenie: null,
  datum: "2025-06-09",
  meno: "Michal Šimečka",
  strana: "PS",
  url: "https://demagog.sk/vyrok/104",
};

export const pravdaStatement: Statement = {
  ...fullStatement,
  id: 105,
  vyhodnotenie: "Pravda",
};

export const nepravdaStatement: Statement = {
  ...minimalStatement,
  id: 106,
  vyhodnotenie: "Nepravda",
};

export const zavadzajuceStatement: Statement = {
  ...noReasoningStatement,
  id: 107,
  vyhodnotenie: "Zavádzajúce",
};

export const neoveritelneStatement: Statement = {
  id: 108,
  vyrok: "Európska komisia pripravuje osobitný fond pre hranicu s Ukrajinou.",
  vyhodnotenie: "Neoveriteľné",
  odovodnenie:
    "Diskusia existovala, ale bez zverejneného návrhu, rozpočtu alebo potvrdeného legislatívneho postupu.",
  datum: "2025-03-02",
  meno: "Michal Šimečka",
  strana: "PS",
  url: "https://demagog.sk/vyrok/108",
};

export const originalStatement: Statement = {
  id: 109,
  vyrok: "Na severe Slovenska dnes chýba približne 300 pediatrov.",
  vyhodnotenie: "Pravda",
  odovodnenie:
    "Odhady stavov ambulancií dlhodobo ukazujú deficit približne troch stoviek pediatrov v severných regiónoch.",
  datum: null,
  meno: "Milan Majerský",
  strana: "KDH",
  url: "https://demagog.sk/vyrok/109",
};

export const duplicateStatement: Statement = {
  id: 110,
  vyrok: "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
  vyhodnotenie: "Pravda",
  odovodnenie:
    "Ide o parafrázu rovnakého tvrdenia o nedostatku pediatrov v severných regiónoch.",
  datum: "2025-12-18",
  meno: "Veronika Remišová",
  strana: "OĽaNO",
  url: "https://demagog.sk/vyrok/110",
};

export const relatedStatement1: Statement = {
  id: 111,
  vyrok: "Vláda má pripravený plán na skrátenie čakacích lehôt pri onkologických vyšetreniach o polovicu.",
  vyhodnotenie: "Neoveriteľné",
  odovodnenie:
    "Verejne známe dokumenty neobsahovali konkrétne míľniky, podľa ktorých by bolo možné splnenie plánu overiť.",
  datum: "2025-07-01",
  meno: "Denisa Saková",
  strana: "Hlas",
  url: "https://demagog.sk/vyrok/111",
};

export const relatedStatement2: Statement = {
  id: 112,
  vyrok: "Kabinet má pripravený plán, ktorý má skrátiť čakanie na onkologické vyšetrenia na polovicu.",
  vyhodnotenie: "Neoveriteľné",
  odovodnenie: null,
  datum: null,
  meno: "Tomáš Drucker",
  strana: "Hlas",
  url: "https://demagog.sk/vyrok/112",
};

export const unrelatedStatement: Statement = {
  id: 113,
  vyrok: "Slovensko má najsilnejšiu hokejovú reprezentáciu vo svojej histórii.",
  vyhodnotenie: "Neoveriteľné",
  odovodnenie:
    "Ide o hodnotiaci výrok bez objektívneho metra, preto ho nemožno spoľahlivo overiť ako faktické tvrdenie.",
  datum: "2025-05-19",
  meno: "Andrej Danko",
  strana: "SNS",
  url: "https://demagog.sk/vyrok/113",
};

export const longStatement: Statement = {
  id: 114,
  vyrok:
    "Konsolidačný balíček podľa vlády nezvýši tlak na domácnosti, ale v skutočnosti spája vyššiu DPH, rast regulovaných cien, zmeny v transakčnej dani a nové poplatky, ktoré sa v konečnom dôsledku pretavia do cien základných služieb, energií a potravín, takže bežný občan zaplatí výrazne viac, než kabinet verejne priznáva.",
  vyhodnotenie: "Zavádzajúce",
  odovodnenie:
    "Výrok mieša priame a nepriame dopady opatrení. Časť bremena môžu zniesť firmy, časť sa však pravdepodobne prenesie na domácnosti.",
  datum: "2025-11-07",
  meno: "Richard Sulík",
  strana: "SaS",
  url: "https://demagog.sk/vyrok/114",
};

export const specialCharsStatement: Statement = {
  id: 115,
  vyrok:
    'Predseda vlády povedal: "Ľudia si zaslúžia lepšiu budúcnosť" – a potom zvýšil DPH.',
  vyhodnotenie: "Zavádzajúce",
  odovodnenie:
    "Citovaný výrok je presný, ale záver z neho vyvodzuje širší politický význam, ktorý z citácie priamo nevyplýva.",
  datum: "2025-09-30",
  meno: "Branislav Gröhling",
  strana: "SaS",
  url: "https://demagog.sk/vyrok/115",
};

export const fixtureStatements: Statement[] = [
  fullStatement,
  minimalStatement,
  noDatumStatement,
  noReasoningStatement,
  pravdaStatement,
  nepravdaStatement,
  zavadzajuceStatement,
  neoveritelneStatement,
  originalStatement,
  duplicateStatement,
  relatedStatement1,
  relatedStatement2,
  unrelatedStatement,
  longStatement,
  specialCharsStatement,
];

export const mockSearchResponse: SearchResponse = {
  results: [fullStatement, originalStatement, relatedStatement1],
  total_count: 23,
  page: 1,
  page_size: 10,
  query_time_ms: 234,
};

export const emptySearchResponse: SearchResponse = {
  results: [],
  total_count: 0,
  page: 1,
  page_size: 10,
  query_time_ms: 45,
};

export const paginatedSearchResponse: SearchResponse = {
  results: [minimalStatement, nepravdaStatement],
  total_count: 23,
  page: 2,
  page_size: 10,
  query_time_ms: 260,
};

export const mockDetectDuplicate: DetectResponse = {
  input_statement: "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
  matches: [
    {
      statement: originalStatement,
      similarity: 0.94,
      classification: "DUPLICATE",
      explanation:
        "Výrok opisuje rovnaký nárok o nedostatku pediatrov, mení sa iba formulácia a zaokrúhlenie.",
    },
    {
      statement: relatedStatement1,
      similarity: 0.66,
      classification: "RELATED",
      explanation:
        "Oba výroky sa týkajú kapacít zdravotníctva, ale nejde o totožné tvrdenie.",
    },
  ],
  overall_status: "DUPLICATE_FOUND",
  query_time_ms: 1823,
};

export const mockDetectRelated: DetectResponse = {
  input_statement: "Vláda pripravuje plán na skrátenie čakacích lehôt v onkológii.",
  matches: [
    {
      statement: relatedStatement1,
      similarity: 0.72,
      classification: "RELATED",
      explanation:
        "Výrok pokrýva rovnakú politickú tému a podobný sľub, ale bez identickej formulácie.",
    },
    {
      statement: relatedStatement2,
      similarity: 0.69,
      classification: "RELATED",
      explanation:
        "Ide o parafrázu širšieho tvrdenia o čakaní na onkologické vyšetrenia.",
    },
  ],
  overall_status: "RELATED_ONLY",
  query_time_ms: 1410,
};

export const mockDetectNew: DetectResponse = {
  input_statement: "Na Marse objavili tekutú vodu pod povrchom krátera Jezero.",
  matches: [],
  overall_status: "NEW_CLAIM",
  query_time_ms: 890,
};

export const mockFilters: FiltersResponse = {
  strany: ["Hlas", "KDH", "OĽaNO", "PS", "SNS", "SaS"],
  mena: [
    "Andrej Danko",
    "Branislav Gröhling",
    "Denisa Saková",
    "Mária Kolíková",
    "Michal Šimečka",
    "Milan Majerský",
    "Richard Sulík",
    "Tomáš Drucker",
    "Veronika Remišová",
  ],
  verdicts: ["Pravda", "Nepravda", "Zavádzajúce", "Neoveriteľné"],
  date_range: {
    min: "2025-03-02",
    max: "2026-01-11",
  },
};
