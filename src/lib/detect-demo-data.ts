import type { DetectResponse } from "@/types";

export interface DetectDemoQuery {
  statement: string;
  response: DetectResponse;
  showAddFlow: boolean;
}

export const DETECT_DEMO_QUERIES: DetectDemoQuery[] = [
  {
    statement:
      "Ukrajina úmyselne a bez varovania zastavila tranzit ruskej ropy cez Družbu, aby ekonomicky poškodila Slovensko.",
    showAddFlow: false,
    response: {
      input_statement:
        "Ukrajina úmyselne a bez varovania zastavila tranzit ruskej ropy cez Družbu, aby ekonomicky poškodila Slovensko.",
      overall_status: "DUPLICATE_FOUND",
      query_time_ms: 1847,
      matches: [
        {
          statement: {
            id: 401,
            vyrok:
              "Ukrajina prijala tajné uznesenie, ktorým nám úmyselne a bez varovania zastavila všetky dodávky ropy cez južnú vetvu Družby, aby nás vydierala.",
            vyhodnotenie: "Nepravda",
            odovodnenie:
              "Neexistuje žiadne tajné uznesenie. Zníženie prietoku bolo spôsobené technickou poruchou na prečerpávacej stanici na ukrajinskej strane, čo potvrdil aj prevádzkovateľ siete Ukrtransnafta.",
            oblast: "Energetika",
            datum: "2025-04-12",
            meno: "Robert Fico",
            strana: "SMER-SD",
          },
          similarity: 0.93,
          classification: "DUPLICATE",
          explanation:
            "Výrok sémanticky totožný: obe tvrdenia pripisujú ukrajinskej strane zámerné prerušenie tranzitu ropy z hospodárskych motívov, čo bolo overené ako nepravda.",
        },
        {
          statement: {
            id: 402,
            vyrok:
              "Kyjev sa rozhodol blokovať tranzit ruskej ropy na Slovensko, pričom my sme jediní, kto im pomáha s reverzným tokom plynu.",
            vyhodnotenie: "Zavádzajúce",
            odovodnenie:
              "Tranzit ropy od spoločnosti Lukoil bol síce pozastavený kvôli ukrajinskym sankciám, ale iné ruské spoločnosti ropu naďalej dodávajú. Tvrdenie o úplnom blokovaní je zavádzajúce.",
            oblast: "Energetika",
            datum: "2025-05-20",
            meno: "Robert Kaliňák",
            strana: "SMER-SD",
          },
          similarity: 0.81,
          classification: "RELATED",
          explanation:
            "Podobná naratívna línia o blokovaní tranzitu od koaličného kolegu, s odlišným kontextom sankčného mechanizmu voči Lukoilu.",
        },
      ],
    },
  },
  {
    statement:
      "Slovensko je jediná krajina EÚ, ktorá nemá vlastnú jadrovú energetickú stratégiu na obdobie po roku 2040.",
    showAddFlow: true,
    response: {
      input_statement:
        "Slovensko je jediná krajina EÚ, ktorá nemá vlastnú jadrovú energetickú stratégiu na obdobie po roku 2040.",
      overall_status: "NEW_CLAIM",
      query_time_ms: 2134,
      matches: [],
    },
  },
];
