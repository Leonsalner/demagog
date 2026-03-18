"use client";

export type OnboardingMedia =
  | {
      kind: "text";
      variant: "basics" | "ready";
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
      variant: "basics",
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
      lightSrc: "/onboarding/step-03-detect-light.png",
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
      lightSrc: "/onboarding/step-04-research-light.png",
      darkSrc: "/onboarding/step-04-research-dark.png",
      alt: "Preskúmať s analýzou výroku, článkami Demagogu a overovacími podkladmi na jednom mieste.",
      caption: "Preskúmať spája analýzu, Demagog články a podklady k overeniu na jednom mieste.",
      aspectRatio: "16 / 9",
    },
  },
  {
    id: "add",
    eyebrow: "5. Pridať nový výrok",
    title: "Ak nič nesedí, pokračujte rovno do databázy.",
    body: [
      "Na Pridať nový výrok sa dostanete z horného tlačidla v navigácii alebo priamo z Detekcie duplicít, keď vo výsledkoch nenájdete použiteľnú zhodu.",
      "Otvorí sa formulár, v ktorom už bude text výroku predvyplnený. Doplniť potom stačí meno, stranu, hodnotenie, dátum a stručné odôvodnenie.",
      "Tento krok použite vtedy, keď ste si cez Vyhľadávanie alebo Detekciu duplicít overili, že výrok v databáze ešte nemá vlastný záznam.",
    ],
    media: {
      kind: "image",
      lightSrc: "/onboarding/step-05-add-light.png",
      darkSrc: "/onboarding/step-05-add-dark.png",
      alt: "Formulár na pridanie nového výroku s predvyplneným textom a pripravenými poliami.",
      caption: "Keď výsledok nesedí, prechod do databázy nadviaže bez straty vloženého textu.",
      aspectRatio: "16 / 9",
    },
  },
  {
    id: "ready",
    eyebrow: "6. Hotovo",
    title: "K návodu sa môžete kedykoľvek vrátiť.",
    body: [
      "Ak si budete chcieť neskôr pripomenúť jednotlivé kroky, návod si znovu otvoríte cez tlačidlo Návod v pravom dolnom rohu.",
      "Tlačidlo Máte pripomienku? zostáva dole vľavo. Môžete nám cezň poslať chybu, nepresnosť alebo návrh, ktorý by vám uľahčil prácu.",
      "Demagog vám má pri práci skrátiť cestu od prvého dopytu k hotovému overeniu.",
    ],
    media: {
      kind: "text",
      variant: "ready",
    },
  },
];
