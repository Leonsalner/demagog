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
    title: "Začať môžete otázkou aj hotovým tvrdením.",
    body: [
      "Vo Vyhľadávaní môžete začať témou, menom, citátom alebo otázkou. Keď už máte konkrétne tvrdenie, otvorte Detekciu duplicít.",
      "V Detekcii ho odošlete len raz. Ak sa nič podobné nenájde, hneď uvidíte stav Nový výrok.",
      "Ak sa podobné staršie výroky nájdu, aplikácia zostane chvíľu pracovať a sama otvorí súhrnný prieskum.",
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
    title: "Rýchle overenie výroku v archíve.",
    body: [
      "Po odoslaní systém rýchlo prehľadá archív.",
      "Úplne nové tvrdenia spoznáte hneď. Pri tých podobných vám aplikácia na pozadí nachystá podklady a plynule vás presunie do prieskumu.",
    ],
    media: {
      kind: "image",
      lightSrc: "/onboarding/step-03-detect-light.png",
      darkSrc: "/onboarding/step-03-detect-dark.png",
      alt: "Detekcia duplicít po odoslaní výroku zostáva v stave prípravy súhrnného prieskumu.",
      caption: "Po rýchlej kontrole aplikácia pri nájdených zhodách hneď pripravuje súhrnný prieskum.",
      aspectRatio: "16 / 9",
    },
  },
  {
    id: "research",
    eyebrow: "4. Preskúmať",
    title: "Všetko dôležité na jednej obrazovke.",
    body: [
      "Prieskum vám na jedno miesto stiahne súvisiace výroky a články.",
      "Vľavo si prepínate medzi materiálmi a v hlavnej časti ich rovno čítate.",
    ],
    media: {
      kind: "image",
      lightSrc: "/onboarding/step-04-research-light.png",
      darkSrc: "/onboarding/step-04-research-dark.png",
      alt: "Súhrnný prieskum s podobnými výrokmi, článkami a zdrojmi otvorený priamo po detekcii.",
      caption: "Keď sú podklady pripravené, pracovný priestor sa otvorí automaticky bez ďalšieho klikania.",
      aspectRatio: "16 / 9",
    },
  },
  {
    id: "add",
    eyebrow: "5. Pridať nový výrok",
    title: "Plynulé pridávanie nových výrokov.",
    body: [
      "Pridávanie je priamo prepojené s prieskumom.",
      "Otvoríte si formulár a popri dopĺňaní údajov môžete naďalej pracovať so všetkými zisteniami bez odchádzania zo stránky.",
    ],
    media: {
      kind: "image",
      lightSrc: "/onboarding/step-05-add-light.png",
      darkSrc: "/onboarding/step-05-add-dark.png",
      alt: "Formulár na pridanie nového výroku otvorený priamo nad súhrnným prieskumom.",
      caption: "Ak pripravené podklady nestačia, nový záznam otvoríte priamo z prieskumu.",
      aspectRatio: "16 / 9",
    },
  },
  {
    id: "ready",
    eyebrow: "6. Hotovo",
    title: "Všetko pre plynulú prácu.",
    body: [
      "Celý proces od vloženia tvrdenia až po nový záznam na seba prirodzene nadväzuje. Namiesto preklikávania sa medzi stránkami máte všetko potrebné vždy poruke.",
      "K tomuto návodu sa kedykoľvek vrátite cez tlačidlo vpravo dole. Pripomienky a nápady nám môžete kedykoľvek napísať cez hlavičku.",
    ],
    media: {
      kind: "text",
      variant: "ready",
    },
  },
];
