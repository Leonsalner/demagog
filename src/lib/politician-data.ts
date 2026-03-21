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
      {
        meno: "Juraj Blanár",
        strana: "Smer",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Minister_zahrani%C4%8Dn%C3%BDch_vec%C3%AD_Juraj_Blan%C3%A1r.jpg/330px-Minister_zahrani%C4%8Dn%C3%BDch_vec%C3%AD_Juraj_Blan%C3%A1r.jpg",
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
      {
        meno: "Erik Tomáš",
        strana: "Hlas",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Erik_Tom%C3%A1%C5%A1_%282025-11-26%29_2.jpg/330px-Erik_Tom%C3%A1%C5%A1_%282025-11-26%29_2.jpg",
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
          "https://upload.wikimedia.org/wikipedia/commons/1/1a/Martin_Dub%C3%A9ci.jpg",
      },
      {
        meno: "Tomáš Valášek",
        strana: "PS",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Tom%C3%A1%C5%A1_Val%C3%A1%C5%A1ek_%282017%29.jpg/330px-Tom%C3%A1%C5%A1_Val%C3%A1%C5%A1ek_%282017%29.jpg",
      },
      {
        meno: "Ivan Štefunko",
        strana: "PS",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/9/93/2P0A2086.jpg",
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
      {
        meno: "Jana Bittó Cigániková",
        strana: "SaS",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/0/06/Jana_Bitt%C3%B3_Cig%C3%A1nikov%C3%A1_%28Nov%C3%AD_poslanci_a_%C5%BEupan_zlo%C5%BEili_svoj_s%C4%BEub%2C_38119506474%29.jpg",
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
        meno: "Viliam Karas",
        strana: "KDH",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/4/4a/Viliam_Karas%2C_June_2025.png",
      },
      {
        meno: "František Majerský",
        strana: "KDH",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/9/9a/Franti%C5%A1ek_Majersk%C3%BD_%282025-12-04%29.png",
      },
      {
        meno: "Marián Čaučík",
        strana: "KDH",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/6/63/Mari%C3%A1n_%C4%8Cau%C4%8D%C3%ADk_%282025-12-04%29.png",
      },
    ],
  },
  {
    strana: "Slovensko",
    politicians: [
      {
        meno: "Igor Matovič",
        strana: "Slovensko",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Igor_Matovi%C4%8D_October_2020_%28cropped%29.jpg/330px-Igor_Matovi%C4%8D_October_2020_%28cropped%29.jpg",
      },
      {
        meno: "Roman Mikulec",
        strana: "Slovensko",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/0/08/RomanMikulec2020.jpg",
      },
      {
        meno: "Marek Krajčí",
        strana: "Slovensko",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/6/6e/Minister_Marek_Kraj%C4%8D%C3%AD.jpg",
      },
      {
        meno: "Jozef Pročko",
        strana: "Slovensko",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/2/23/Jozef_Pro%C4%8Dko_2015.jpg",
      },
    ],
  },
  {
    strana: "SNS",
    politicians: [
      {
        meno: "Andrej Danko",
        strana: "SNS",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/6/6c/Andrej_Danko%2C_2018.jpg",
      },
      {
        meno: "Tomáš Taraba",
        strana: "SNS",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/e/e0/Tom%C3%A1%C5%A1_Taraba%2C_February_2025.png",
      },
      {
        meno: "Martina Šimkovičová",
        strana: "SNS",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/6/60/Martina_%C5%A0imkovi%C4%8Dov%C3%A1_%282025-09-30%29.png",
      },
      {
        meno: "Roman Michelko",
        strana: "SNS",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/1/14/Roman_Michelko_portrait-library.JPG",
      },
    ],
  },
  {
    strana: "Republika",
    politicians: [
      {
        meno: "Milan Uhrík",
        strana: "Republika",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/8/80/MEP_Milan_Uhr%C3%ADk.jpg",
      },
      {
        meno: "Milan Mazurek",
        strana: "Republika",
        photoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/f/f0/1720604779368_20240709_MAZUREK_Milan_SK_007.jpg",
      },
      {
        meno: "Miroslav Suja",
        strana: "Republika",
        photoUrl: "",
      },
      {
        meno: "Martin Beluský",
        strana: "Republika",
        photoUrl: "",
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
    label: "Slovensko",
    aliases: [
      "Slovensko",
      "Hnutie Slovensko",
      "OĽaNO",
      "Obyčajní ľudia a nezávislé osobnosti",
      "Kresťanská únia (klub OĽaNO)",
      "nominant OĽaNO",
      "Slovensko, Za ľudí, KÚ",
    ],
  },
  {
    label: "SNS",
    aliases: ["SNS", "Slovenská národná strana"],
  },
  {
    label: "Republika",
    aliases: ["Republika", "REPUBLIKA"],
  },
  {
    label: "Nestranník",
    aliases: ["Nestranník", "nestranník", "Nestraníci"],
  },
];
