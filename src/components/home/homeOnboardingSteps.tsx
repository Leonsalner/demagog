"use client";

export type OnboardingMedia =
  | {
      kind: "text";
    }
  | {
      kind: "image";
      src: string;
      alt: string;
      caption?: string;
      aspectRatio?: "16 / 10" | "16 / 9";
    };

export interface HomeOnboardingStep {
  id: string;
  eyebrow: string;
  title: string;
  body: string[];
  optional?: boolean;
  media: OnboardingMedia;
}

export const HOME_ONBOARDING_STEPS: HomeOnboardingStep[] = [
  {
    id: "basics",
    eyebrow: "1. Základ",
    title: "Dva režimy. Jeden jednoduchý začiatok.",
    body: [
      "Vyhľadávanie je na tému, meno, citát alebo normálnu otázku.",
      "Detekcia duplicít je na nový konkrétny výrok.",
      "Nemusíte písať presné kľúčové slová. Search sa správa skoro ako chat a filtre sa často doplnia samy.",
    ],
    media: {
      kind: "text",
    },
  },
  {
    id: "search",
    eyebrow: "2. Vyhľadávanie",
    title: "Napíšte otázku tak, ako by ste ju povedali kolegovi.",
    body: [
      "Do vyhľadávania môžete napísať tému, meno, citát alebo celú otázku.",
      "Systém si z textu často sám doplní filtre.",
      "Keď nájdete dobrý výsledok, pokračujte cez Preskúmať.",
    ],
    media: {
      kind: "image",
      src: "/onboarding/step-02-search-light.png",
      alt: "Vyhľadávacie rozhranie Demagogu s prirodzeným dopytom, automaticky doplnenými filtrami a výsledkami.",
      caption: "Prirodzený dopyt, automatické filtre a výsledky pripravené na ďalší krok.",
      aspectRatio: "16 / 9",
    },
  },
  {
    id: "detect",
    eyebrow: "3. Detekcia duplicít",
    title: "Sem vložte celý nový výrok.",
    body: [
      "Použite to vtedy, keď už máte konkrétny nový výrok.",
      "Rýchly je na prvé posúdenie. Prieskum je na širší kontext.",
      "Výsledok môže byť duplicitný, súvisiaci alebo nový.",
    ],
    media: {
      kind: "image",
      src: "/onboarding/step-03-detect-light.png",
      alt: "Detekcia duplicít s vloženým výrokom, rýchlym režimom a zobrazenými zhodami.",
      caption: "Rýchly režim ukáže najbližšie zhody ešte pred otvorením širšieho prieskumu.",
      aspectRatio: "16 / 9",
    },
  },
  {
    id: "research",
    eyebrow: "4. Preskúmať",
    title: "Keď chcete ísť ďalej, otvorte detail.",
    body: [
      "Preskúmať otvorí pracovný pohľad s analýzou, článkami a zdrojmi.",
      "Tu už nepokračujete len v hľadaní. Tu reálne pracujete s nájdeným výsledkom.",
    ],
    media: {
      kind: "image",
      src: "/onboarding/step-04-research-light.png",
      alt: "Pracovný detail výroku s analýzou, článkami a zdrojmi v rozhraní Demagogu.",
      caption: "Detail je miesto, kde sa z výsledku stáva pracovný podklad pre analytika.",
      aspectRatio: "16 / 9",
    },
  },
  {
    id: "add",
    eyebrow: "5. Pridať nový výrok",
    title: "Keď nič nesedí, pokračujte rovno do databázy.",
    body: [
      "Ak systém nič vhodné nenašiel, môžete hneď pokračovať na Pridať nový výrok.",
      "Formulár otvorí predvyplnený text, takže nezačínate od nuly.",
    ],
    optional: true,
    media: {
      kind: "image",
      src: "/onboarding/step-05-add-light.png",
      alt: "Formulár na pridanie nového výroku s predvyplneným textom a pripravenými poliami.",
      caption: "Keď výsledok nesedí, prechod do databázy nadviaže bez straty vloženého textu.",
      aspectRatio: "16 / 9",
    },
  },
];
