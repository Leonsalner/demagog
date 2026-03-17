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
      "Ak neviete, kde začať, začnite vo Vyhľadávaní. Rozumie témam, menám, citátom aj normálnym otázkam.",
      "Detekcia duplicít použite vtedy, keď už máte konkrétny nový výrok a chcete zistiť, či ho Demagog už riešil.",
      "Pri zhode pokračujte cez Preskúmať. Ak nič nesedí, prejdite na Pridať nový výrok.",
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
      "Vyhľadávanie prijíma tému, meno, citát aj celú otázku. Nepotrebujete presnú formuláciu z archívu.",
      "Systém z dopytu automaticky rozpozná relevantné filtre a zoradí výsledky podľa toho, čo je najbližšie vášmu zadaniu.",
      "Keď narazíte na relevantný výsledok, cez Preskúmať otvoríte pracovný pohľad a pokračujete bez ďalšieho hľadania.",
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
    title: "Najprv overte, či sa nový výrok už neopakuje.",
    body: [
      "Detekcia duplicít je určená pre konkrétny nový výrok, pri ktorom chcete rýchlo zistiť, či už má použiteľné staršie overenie.",
      "Rýchly režim ukáže najbližšie zhody okamžite. Prieskum pridá širší kontext a súvisiace prípady.",
      "Ak systém označí výrok ako nový, pokračujte na Pridať nový výrok a otvorte formulár s predvyplneným textom.",
    ],
    media: {
      kind: "image",
      src: "/onboarding/step-03-detect-light.png",
      alt: "Detekcia duplicít s vloženým výrokom, rýchlym režimom a výsledkom s akciou Pridať výrok.",
      caption: "Detekcia rýchlo ukáže, či už existuje zhoda, alebo máte pokračovať na pridanie nového výroku.",
      aspectRatio: "16 / 9",
    },
  },
  {
    id: "research",
    eyebrow: "4. Preskúmať",
    title: "Kliknite na Preskúmať a otvorte pracovný pohľad.",
    body: [
      "Tlačidlo Preskúmať nájdete vo Vyhľadávaní aj pri výsledkoch Detekcie duplicít.",
      "Otvorí pracovný pohľad s analýzou výroku, súvisiacimi článkami Demagogu a podkladmi, z ktorých analýza vychádza.",
      "Je to najrýchlejší spôsob, ako prejsť zo zoznamu výsledkov do samotnej práce s nájdeným výrokom.",
    ],
    media: {
      kind: "image",
      src: "/onboarding/step-04-research-light.png",
      alt: "Pracovný pohľad Preskúmať s analýzou výroku, článkami Demagogu a overovacími podkladmi.",
      caption: "Preskúmať sústreďuje analýzu, články Demagogu a overovacie podklady na jednom mieste.",
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
