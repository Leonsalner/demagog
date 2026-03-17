"use client";

export type OnboardingPreview =
  | {
      kind: "basics";
      searchPrompt: string;
      detectPrompt: string;
      hints: string[];
    }
  | {
      kind: "search";
      query: string;
      filters: string[];
      resultTitle: string;
      resultMeta: string;
    }
  | {
      kind: "detect";
      statement: string;
      outcomes: Array<{
        label: string;
        tone: "duplicate" | "related" | "new";
      }>;
    }
  | {
      kind: "research";
      headings: string[];
      sources: string[];
    }
  | {
      kind: "add";
      statement: string;
      fields: string[];
    };

export interface HomeOnboardingStep {
  id: string;
  eyebrow: string;
  title: string;
  body: string[];
  optional?: boolean;
  preview: OnboardingPreview;
}

export const HOME_ONBOARDING_STEPS: HomeOnboardingStep[] = [
  {
    id: "basics",
    eyebrow: "1. Základ",
    title: "Dva režimy, jedno pole práce",
    body: [
      "Vyhľadávanie je na tému, meno, citát alebo otázku.",
      "Detekcia duplicít je na nový konkrétny výrok.",
      "Píšte prirodzene. Filtre sa často doplnia samy.",
    ],
    preview: {
      kind: "basics",
      searchPrompt: "Čo hovoril Robert Fico o konsolidácii v roku 2024?",
      detectPrompt: "V roku 2025 zvýšime platy učiteľov o 20 percent.",
      hints: ["otázka", "téma", "nový výrok"],
    },
  },
  {
    id: "search",
    eyebrow: "2. Vyhľadávanie",
    title: "Hľadajte tak, ako by ste sa pýtali kolegu",
    body: [
      "Môžete zadať tému, politika, celý výrok aj plnú otázku.",
      "Rozpoznané meno, obdobie alebo hodnotenie sa doplní do filtrov.",
      "Keď nájdete dobrý výsledok, pokračujte cez Preskúmať.",
    ],
    preview: {
      kind: "search",
      query: "Kto hovoril o tom, že štát šetrí hlavne na rodinách?",
      filters: ["Rodiny", "2024", "automatický filter"],
      resultTitle: "42 % konsolidácie musí zvládať bežný občan.",
      resultMeta: "Milan Majerský • KDH • Pravda",
    },
  },
  {
    id: "detect",
    eyebrow: "3. Detekcia duplicít",
    title: "Sem vkladajte celé nové tvrdenie",
    body: [
      "Rýchly nájde najbližšie zhody na prvé posúdenie.",
      "Prieskum otvorí širší kontext, články a zdroje.",
      "Výsledok môže byť duplicitný výrok, súvisiaci výrok alebo nový výrok.",
    ],
    preview: {
      kind: "detect",
      statement: "Na severe Slovenska chýbajú asi tri stovky pediatrov.",
      outcomes: [
        { label: "Duplicitný výrok", tone: "duplicate" },
        { label: "Len súvisiace", tone: "related" },
        { label: "Nový výrok", tone: "new" },
      ],
    },
  },
  {
    id: "research",
    eyebrow: "4. Preskúmať",
    title: "Detailná pracovná vrstva pre analytika",
    body: [
      "Tu pokračuje analýza konkrétneho výroku alebo viacerých zhôd.",
      "Uvidíte súvisiace články, externé zdroje a rozpracovaný kontext.",
      "Vo v1 je tento krok vysvetlený už v náhľadoch, preto je mimo predvoleného toku.",
    ],
    optional: true,
    preview: {
      kind: "research",
      headings: ["Súhrnný prieskum", "Články", "Externé zdroje"],
      sources: ["Demagog.sk", "TASR", "Ministerstvo financií"],
    },
  },
  {
    id: "add",
    eyebrow: "5. Pridať nový výrok",
    title: "Keď nič nesedí, pokračujte rovno do databázy",
    body: [
      "Nový výrok otvorí predvyplnený formulár s vloženým textom.",
      "Analytik len doplní meno, stranu, hodnotenie a odôvodnenie.",
      "Aj tento krok je pripravený v konfigurácii, ale v predvolenom návode je zatiaľ vypnutý.",
    ],
    optional: true,
    preview: {
      kind: "add",
      statement: "V roku 2025 zvýšime platy učiteľov o 20 percent.",
      fields: ["Výrok", "Meno", "Strana", "Vyhodnotenie"],
    },
  },
];
