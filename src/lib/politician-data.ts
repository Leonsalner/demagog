export interface PoliticianMeta {
  meno: string;
  strana: string;
  photoUrl: string;
}

export interface PartyGroup {
  strana: string;
  politicians: PoliticianMeta[];
}

export interface PartyFilterOption {
  label: string;
  aliases: string[];
}

export const PARTY_GROUPS: PartyGroup[] = [
  {
    strana: "Smer",
    politicians: [
      {
        meno: "Robert Fico",
        strana: "Smer",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Robert_Fico_portrait%2C_2025_%28cropped%29.jpg/330px-Robert_Fico_portrait%2C_2025_%28cropped%29.jpg",
      },
      {
        meno: "Robert Kaliňák",
        strana: "Smer",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Robert_Kalinak%2C_2023_%28cropped%29.jpg/330px-Robert_Kalinak%2C_2023_%28cropped%29.jpg",
      },
      {
        meno: "Ľuboš Blaha",
        strana: "Smer",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/1721116438621_20240716_BLAHA_Lubos_SK_005.jpg/330px-1721116438621_20240716_BLAHA_Lubos_SK_005.jpg",
      },
    ],
  },
  {
    strana: "Hlas",
    politicians: [
      {
        meno: "Peter Pellegrini",
        strana: "Hlas",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Peter_Pellegrini%2C_2024_%28cropped%29.jpg/330px-Peter_Pellegrini%2C_2024_%28cropped%29.jpg",
      },
      {
        meno: "Matúš Šutaj Eštok",
        strana: "Hlas",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Matus-Sutaj-Estok-portrait.jpg/330px-Matus-Sutaj-Estok-portrait.jpg",
      },
      {
        meno: "Denisa Saková",
        strana: "Hlas",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Denisa_Sakov%C3%A1_at_the_European_Commission_-_P062694-503037.jpg/330px-Denisa_Sakov%C3%A1_at_the_European_Commission_-_P062694-503037.jpg",
      },
    ],
  },
  {
    strana: "PS",
    politicians: [
      {
        meno: "Michal Šimečka",
        strana: "PS",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Michal_%C5%A0ime%C4%8Dka_pri_predstavovan%C3%AD_volebn%C3%A9ho_programu.jpg/330px-Michal_%C5%A0ime%C4%8Dka_pri_predstavovan%C3%AD_volebn%C3%A9ho_programu.jpg",
      },
      {
        meno: "Martin Dubéci",
        strana: "PS",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Martin_Dub%C3%A9ci.jpg/330px-Martin_Dub%C3%A9ci.jpg",
      },
      {
        meno: "Tomáš Valášek",
        strana: "PS",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Tom%C3%A1%C5%A1_Val%C3%A1%C5%A1ek_%282017%29.jpg/330px-Tom%C3%A1%C5%A1_Val%C3%A1%C5%A1ek_%282017%29.jpg",
      },
    ],
  },
  {
    strana: "SaS",
    politicians: [
      {
        meno: "Richard Sulík",
        strana: "SaS",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Richard_Sul%C3%ADk%2C_29_October_2022.jpg/330px-Richard_Sul%C3%ADk%2C_29_October_2022.jpg",
      },
      {
        meno: "Branislav Gröhling",
        strana: "SaS",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Branislav-Grohling-minister-skolstva_%28cropped%29.jpg/330px-Branislav-Grohling-minister-skolstva_%28cropped%29.jpg",
      },
      {
        meno: "Mária Kolíková",
        strana: "SaS",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/M%C3%A1ria_Kol%C3%ADkov%C3%A1_%282025-10-16%29.jpg/330px-M%C3%A1ria_Kol%C3%ADkov%C3%A1_%282025-10-16%29.jpg",
      },
    ],
  },
  {
    strana: "KDH",
    politicians: [
      {
        meno: "Milan Majerský",
        strana: "KDH",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Milan_Majersk%C3%BD.jpg/330px-Milan_Majersk%C3%BD.jpg",
      },
      {
        meno: "František Majerský",
        strana: "KDH",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Franti%C5%A1ek_Majersk%C3%BD_%282025-12-04%29.png/330px-Franti%C5%A1ek_Majersk%C3%BD_%282025-12-04%29.png",
      },
      {
        meno: "Viliam Karas",
        strana: "KDH",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Viliam_Karas%2C_June_2025.png/330px-Viliam_Karas%2C_June_2025.png",
      },
    ],
  },
  {
    strana: "OĽaNO",
    politicians: [
      {
        meno: "Igor Matovič",
        strana: "OĽaNO",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Igor_Matovi%C4%8D_October_2020_%28cropped%29.jpg/330px-Igor_Matovi%C4%8D_October_2020_%28cropped%29.jpg",
      },
      {
        meno: "Veronika Remišová",
        strana: "OĽaNO",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Visit_of_Veronika_R%C3%A9mi%C5%A1ov%C3%A1%2C_Slovak_Deputy_Prime_Minister_and_Minister_for_Investments%2C_Regional_development_and_Informatization%2C_to_the_European_Commission_02_%2818-11-2021%29_%28cropped%29.jpg/330px-thumbnail.jpg",
      },
      {
        meno: "Jozef Pročko",
        strana: "OĽaNO",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Jozef_Pro%C4%8Dko_2015.jpg/330px-Jozef_Pro%C4%8Dko_2015.jpg",
      },
    ],
  },
];

export const PARTY_PILL_ORDER = PARTY_GROUPS.map((group) => group.strana);

export const PARTY_FILTER_OPTIONS: PartyFilterOption[] = [
  {
    label: "Smer",
    aliases: ["Smer", "SMER - sociálna demokracia", "SMER-SD"],
  },
  {
    label: "Hlas",
    aliases: ["Hlas", "HLAS-SD"],
  },
  {
    label: "PS",
    aliases: ["PS", "Progresívne Slovensko"],
  },
  {
    label: "SaS",
    aliases: ["SaS", "Sloboda a Solidarita", "nominant SaS"],
  },
  {
    label: "KDH",
    aliases: ["KDH", "Kresťanskodemokratické hnutie"],
  },
  {
    label: "OĽaNO",
    aliases: [
      "OĽaNO",
      "Obyčajní ľudia a nezávislé osobnosti",
      "Kresťanská únia (klub OĽaNO)",
      "nominant OĽaNO",
      "Slovensko",
    ],
  },
];
