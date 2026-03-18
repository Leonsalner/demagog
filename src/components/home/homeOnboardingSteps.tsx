"use client";

export type OnboardingMedia =
  | {
      kind: "text";
    }
  | {
      kind: "image";
      lightSrc: string;
      darkSrc?: string;
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
      "Ak neviete, kde začať, zvoľte Vyhľadávanie. Rozumie témam, menám, citátom aj bežným otázkam.",
      "Detekciu duplicít použite, keď už máte konkrétny výrok a chcete zistiť, či ho Demagog v minulosti overoval.",
      "Ak nájdete zhodu, tlačidlom Preskúmať si zobrazíte podrobnosti. Ak nie, môžete plynulo prejsť na Pridať nový výrok.",
    ],
    media: {
      kind: "text",
    },
  },
  {
    id: "search",
    eyebrow: "2. Vyhľadávanie",
    title: "Pýtajte sa tak, ako by ste sa pýtali kolegu.",
    body: [
      "Pýtajte sa tak, ako vám napadne. Nemusíte hľadať presné slová z archívu, stačí zadať tému, meno alebo celú vetu.",
      "Systém z otázky sám pochopí kontext a automaticky nastaví správne filtre, napríklad pre konkrétnu stranu alebo hodnotenie.",
      "Výsledky sa zoradia od najlepšej zhody. Keď vás niektorý zaujme, tlačidlom Preskúmať si otvoríte jeho detail.",
    ],
    media: {
      kind: "image",
      lightSrc: "/onboarding/step-02-search-light.png",
      darkSrc: "/onboarding/step-02-search-dark.png",
      alt: "Vyhľadávacie rozhranie Demagogu s prirodzeným dopytom, automaticky doplnenými filtrami a výsledkami.",
      caption: "Prirodzený dopyt, automatické filtre a výsledky pripravené na ďalší krok.",
      aspectRatio: "16 / 9",
    },
  },
  {
    id: "detect",
    eyebrow: "3. Detekcia duplicít",
    title: "Najprv zistite, či už výrok nebol overený.",
    body: [
      "Vložte text výroku a nástroj vám obratom ukáže, či k nemu v archíve existuje použiteľné staršie overenie.",
      "Rýchly režim vám hneď ponúkne najbližšie zhody. Ak potrebujete vidieť širší kontext a podobné tvrdenia, prepnite sa do Prieskumu.",
      "Ak medzi výsledkami nenájdete nič použiteľné, môžete prejsť priamo na Pridať nový výrok, kde už na vás bude čakať predvyplnený formulár.",
    ],
    media: {
      kind: "image",
      lightSrc: "/onboarding/step-03-detect-light-v2.png",
      darkSrc: "/onboarding/step-03-detect-dark.png",
      alt: "Detekcia duplicít s vloženým výrokom, rýchlym režimom a výsledkom s akciou Pridať výrok.",
      caption: "Detekcia rýchlo ukáže, či už existuje zhoda, alebo máte pokračovať na pridanie nového výroku.",
      aspectRatio: "16 / 9",
    },
  },
  {
    id: "research",
    eyebrow: "4. Preskúmať",
    title: "Z výsledku priamo k analýze.",
    body: [
      "Tlačidlo Preskúmať nájdete pri výsledkoch vo Vyhľadávaní aj v Detekcii duplicít.",
      "Otvorí vám kompletný prehľad o výroku: text analýzy, súvisiace články z Demagogu a konkrétne podklady, o ktoré sa overenie opiera.",
      "Všetky podstatné informácie máte na jednom mieste a môžete s nimi ihneď pracovať.",
    ],
    media: {
      kind: "image",
      lightSrc: "/onboarding/step-04-research-light-v2.png",
      darkSrc: "/onboarding/step-04-research-dark.png",
      alt: "Preskúmať s analýzou výroku, článkami Demagogu a overovacími podkladmi na jednom mieste.",
      caption: "Preskúmať spája analýzu, Demagog články a podklady k overeniu na jednom mieste.",
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
      lightSrc: "/onboarding/step-05-add-light.png",
      darkSrc: "/onboarding/step-05-add-dark.png",
      alt: "Formulár na pridanie nového výroku s predvyplneným textom a pripravenými poliami.",
      caption: "Keď výsledok nesedí, prechod do databázy nadviaže bez straty vloženého textu.",
      aspectRatio: "16 / 9",
    },
  },
];
