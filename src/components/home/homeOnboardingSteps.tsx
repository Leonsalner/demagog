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
    title: "Po odoslaní aplikácia pripraví ďalší krok sama.",
    body: [
      "Detekcia vždy najprv spraví rýchlu kontrolu proti archívu.",
      "Pri novom tvrdení uvidíte výsledok hneď. Pri nájdených zhodách zostanete v jednom spoločnom stave prípravy.",
      "Keď sú podklady hotové, súhrnný prieskum sa otvorí automaticky. Ak príprava zlyhá, vrátia sa karty zhôd s možnosťou skúsiť to znova.",
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
    title: "Širší kontext sa otvorí na jednej obrazovke.",
    body: [
      "Súhrnný prieskum spojí podobné výroky, články Demagogu a ďalšie zdroje do jedného pracovného priestoru.",
      "Vľavo prepínate medzi článkami a výrokmi, v hlavnej časti čítate vybraný materiál.",
      "Nemusíte sa vracať späť do detekcie. Keď je prieskum pripravený, pokračujete rovno tu.",
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
    title: "Nový záznam pridáte priamo z prieskumu.",
    body: [
      "Ak medzi pripravenými podkladmi nenájdete použiteľnú zhodu, otvorte tlačidlo Pridať výrok priamo v pracovnom priestore.",
      "Text tvrdenia sa do formulára prenesie automaticky, takže dopĺňate už len údaje, hodnotenie a zdroje.",
      "Samostatná stránka Pridať nový výrok stále existuje, no pri bežnej práci väčšinou stačí tento krok priamo tu.",
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
    title: "Celý tok zvládnete bez zbytočného vracania.",
    body: [
      "Od prvého vloženia tvrdenia až po nový záznam vás aplikácia vedie v jednom súvislom pracovnom toku.",
      "Ak nájde použiteľné staršie podklady, zostanete v prieskume. Ak nie, z toho istého miesta otvoríte pridanie nového výroku.",
      "K návodu sa kedykoľvek vrátite cez tlačidlo Návod a spätnú väzbu pošlete cez Máte pripomienku?.",
    ],
    media: {
      kind: "text",
      variant: "ready",
    },
  },
];
