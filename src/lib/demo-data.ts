import type { Statement, Verdict } from "@/types";

export interface DemoArticle {
  id: number;
  title: string;
  url: string;
  source: "Denník N" | "SME";
  date: string;
  summary: string;
  keywords: string[];
}

export interface DemoQuery {
  query: string;
  results: Statement[];
  filters: {
    meno: string | null;
    vyhodnotenie: Verdict | null;
    strana: string | null;
  };
  articleIds: number[];
}

export const DEMO_ARTICLES: DemoArticle[] = [
  {
    id: 1,
    title:
      "Vláda vyhlasuje stav ropnej núdze. Fico obviňuje Ukrajinu, hoci ropovod poškodilo Rusko",
    url: "https://e.dennikn.sk/5149499/vlada-vyhlasuje-stav-ropnej-nudze-fico-obvinuje-ukrajinu-hoci-ropovod-poskodilo-rusko/",
    source: "Denník N",
    date: "2026-02-18",
    summary:
      "Slovenská vláda vyhlásila stav ropnej núdze v dôsledku prerušenia dodávok cez ropovod Družba. Premiér Robert Fico zo situácie obviňuje Ukrajinu, hoci infraštruktúru pri meste Brody v skutočnosti poškodil ruský dron.",
    keywords: ["ropná núdza", "Družba", "Robert Fico", "Ukrajina", "ruský dron"],
  },
  {
    id: 2,
    title:
      "Fico dáva Ukrajine ultimátum: Pustite do pondelka ruskú ropu, inak zastavíme núdzovú elektrinu",
    url: "https://e.dennikn.sk/5156842/fico-dava-ukrajine-ultimatum-pustite-do-pondelka-rusku-ropu-inak-zastavime-nudzovu-elektrinu",
    source: "Denník N",
    date: "2026-02-21",
    summary:
      "Premiér Fico pohrozil Ukrajine zastavením núdzových dodávok elektriny, ak do pondelka neobnoví tranzit ruskej ropy. Jeho ultimátum však rýchlo stratilo na sile, keďže Poľsko a Rumunsko okamžite ponúkli Kyjevu náhradné dodávky elektrickej energie.",
    keywords: [
      "ultimátum",
      "elektrina",
      "Robert Fico",
      "Ukrajina",
      "náhradné dodávky",
    ],
  },
  {
    id: 3,
    title:
      "Ukrajina nechce k Družbe nikoho pustiť a Fico má satelitné snímky, ktoré odmieta ukázať",
    url: "https://e.dennikn.sk/5179385/ukrajina-nechce-k-druzbe-nikoho-pustit-a-fico-ma-satelitne-snimky-ktore-odmieta-ukazat/",
    source: "Denník N",
    date: "2026-03-04",
    summary:
      "Robert Fico tvrdí, že disponuje satelitnými snímkami dokazujúcimi opravu ropovodu Družba, no odmieta ich zverejniť. Ukrajinská strana medzitým naďalej odmieta vpustiť k poškodenému úseku nezávislý verifikačný tím.",
    keywords: [
      "satelitné snímky",
      "Družba",
      "verifikačný tím",
      "Ukrajina",
      "Robert Fico",
    ],
  },
  {
    id: 4,
    title:
      "Je Družba už naozaj opravená? Fico a Orbán tvrdia opak toho, čo hlási Brusel",
    url: "https://eubrief.sme.sk/zahranicie-a-bezpecnost/c/je-druzba-uz-naozaj-opravena-fico-a-orban-tvrdia-opak-toho-co-hlasi-brusel",
    source: "SME",
    date: "2026-02-28",
    summary:
      "Predstavitelia Európskej únie a medzinárodní pozorovatelia sa zhodujú, že ropovod Družba je naďalej poškodený. Lídri Slovenska a Maďarska, Robert Fico a Viktor Orbán, však bez predloženia dôkazov tvrdia pravý opak.",
    keywords: [
      "Európska únia",
      "Družba",
      "Viktor Orbán",
      "Robert Fico",
      "poškodenie",
    ],
  },
  {
    id: 5,
    title: "Ficovo zavádzanie o rope sa stupňuje",
    url: "https://e.dennikn.sk/5158712/firemny-newsfilter-krachuje-dalsi-obuvnik-ficovo-zavadzanie-o-rope-sa-stupnuje-a-slovenske-dane-kazia-celoeuropsky-biznis-kofoly/",
    source: "Denník N",
    date: "2026-02-22",
    summary:
      "Analytický komentár poukazuje na rastúcu mieru dezinformácií zo strany premiéra Roberta Fica v súvislosti s krízou okolo ropovodu Družba. Jeho vyjadrenia o stave dodávok ropy sa čoraz viac vzďaľujú od overiteľných faktov.",
    keywords: ["dezinformácie", "Robert Fico", "Družba", "ropa", "komentár"],
  },
  {
    id: 6,
    title:
      "Hirman: Nedostatok ropy Slovnaftu nehrozí, ropovod Adria vie zásobiť Slovensko aj Maďarsko",
    url: "https://e.dennikn.sk/5147653/hirman-nedostatok-ropy-slovnaftu-nehrozi-ropovod-adria-vie-zasobit-slovensko-aj-madarsko",
    source: "Denník N",
    date: "2026-02-17",
    summary:
      "Bývalý minister hospodárstva Karel Hirman ubezpečuje, že rafinérii Slovnaft nedostatok suroviny nehrozí. Výpadok Družby dokážu podľa neho plne vykryť alternatívne dodávky prúdiace cez ropovod Adria z Chorvátska.",
    keywords: [
      "Karel Hirman",
      "Slovnaft",
      "ropovod Adria",
      "alternatívne dodávky",
    ],
  },
  {
    id: 7,
    title:
      "Ani Družba, ani Adria? Existuje aj tretia ropná cesta na Slovensko",
    url: "https://www.sme.sk/index/c/ani-druzba-ani-adria-existuje-aj-tretia-ropna-cesta-hrozbou-su-ruske-drony",
    source: "SME",
    date: "2026-02-25",
    summary:
      "Okrem tradičných trás cez ropovody Družba a Adria má Slovensko k dispozícii aj tretiu alternatívu pre dovoz ropy. Táto trasa vedie cez poľský prístav Gdaňsk, no jej bezpečnosť aktuálne ohrozujú útoky ruských dronov.",
    keywords: [
      "Gdaňsk",
      "alternatívne trasy",
      "ropa",
      "ruské drony",
      "Poľsko",
    ],
  },
  {
    id: 8,
    title:
      "Ropovod Družba by mohol byť podľa Zelenského v prevádzke o mesiac a pol",
    url: "https://www.sme.sk/svet/c/ukrajina-rusko-zelenskyj-trump-putin-online-minuta-po-minute-5-3-2026",
    source: "SME",
    date: "2026-03-05",
    summary:
      "Ukrajinský prezident Volodymyr Zelenskyj oficiálne oznámil, že oprava poškodeného ropovodu Družba si vyžiada ešte približne šesť týždňov. Po uplynutí tohto času by mohla byť strategická infraštruktúra opäť plne v prevádzke.",
    keywords: [
      "Volodymyr Zelenskyj",
      "oprava ropovodu",
      "Družba",
      "Ukrajina",
    ],
  },
];

export const DEMO_QUERIES: DemoQuery[] = [
  {
    query: "Fico tvrdí že Ukrajina úmyselne blokuje dodávky ropy",
    filters: { meno: "Robert Fico", vyhodnotenie: null, strana: "SMER-SD" },
    articleIds: [1, 2, 3, 5],
    results: [
      {
        id: 101,
        vyrok:
          "Ukrajina včera prijala tajné uznesenie, ktorým nám úmyselne a bez varovania zastavila všetky dodávky ropy cez južnú vetvu Družby, aby nás vydierala.",
        vyhodnotenie: "Nepravda",
        odovodnenie:
          "Neexistuje žiadne tajné uznesenie. Zníženie prietoku bolo spôsobené technickou poruchou na prečerpávacej stanici na ukrajinskom území, čo potvrdil aj prevádzkovateľ siete.",
        datum: "2025-04-12",
        meno: "Robert Fico",
        strana: "SMER-SD",
        similarity: 0.91,
      },
      {
        id: 102,
        vyrok:
          "Kyjev sa rozhodol blokovať tranzit ruskej ropy na Slovensko, pričom my sme jediní, kto im pomáha s reverzným tokom plynu.",
        vyhodnotenie: "Zavádzajúce",
        odovodnenie:
          "Tranzit ropy od spoločnosti Lukoil bol síce pozastavený kvôli ukrajinským sankciám, ale iné ruské spoločnosti ropu naďalej dodávajú. Tvrdenie o úplnom blokovaní je preto zavádzajúce.",
        datum: "2025-05-20",
        meno: "Robert Kaliňák",
        strana: "SMER-SD",
        similarity: 0.85,
      },
      {
        id: 103,
        vyrok:
          "Máme spravodajské informácie, že ukrajinské vedenie priamo inštruovalo colníkov, aby zdržiavali naše ropné tankery na hraniciach.",
        vyhodnotenie: "Neoveriteľné",
        odovodnenie:
          "Tieto spravodajské informácie nie sú verejne dostupné a ukrajinská strana ich odmietla komentovať, výrok preto nie je možné nezávisle overiť z otvorených zdrojov.",
        datum: "2025-06-05",
        meno: "Juraj Blanár",
        strana: "SMER-SD",
        similarity: 0.78,
      },
      {
        id: 104,
        vyrok:
          "Zelenskyj mi osobne do telefónu povedal, že ak nepošleme stíhačky, ropu už nikdy neuvidíme.",
        vyhodnotenie: "Nepravda",
        odovodnenie:
          "Kancelária ukrajinského prezidenta aj slovenský diplomatický zbor popreli, že by takýto rozhovor prebehol. Žiadne podmieňovanie dodávok ropy zbraňami nebolo zaznamenané.",
        datum: "2026-01-15",
        meno: "Robert Fico",
        strana: "SMER-SD",
        similarity: 0.88,
      },
    ],
  },
  {
    query: "Hrozí Slovensku nedostatok ropy?",
    filters: { meno: null, vyhodnotenie: null, strana: null },
    articleIds: [6, 7, 8],
    results: [
      {
        id: 201,
        vyrok:
          "Slovensko má v súčasnosti štátne hmotné rezervy ropy a ropných produktov na viac ako 90 dní, čo je naša zákonná povinnosť.",
        vyhodnotenie: "Pravda",
        odovodnenie:
          "Podľa údajov Správy štátnych hmotných rezerv SR z januára 2025 Slovensko skutočne spĺňa európsku normu a má zásoby na 94 dní.",
        datum: "2025-02-10",
        meno: "Denisa Saková",
        strana: "HLAS-SD",
        similarity: 0.89,
      },
      {
        id: 202,
        vyrok:
          "Vláda neurobila nič pre diverzifikáciu, sme stále na 100 % závislí od ruskej ropy a ak ju odpoja, do týždňa nemáme benzín.",
        vyhodnotenie: "Zavádzajúce",
        odovodnenie:
          "Hoci je závislosť stále vysoká, rafinéria Slovnaft už spracováva približne 30 % alternatívnej ropy z iných zdrojov cez ropovod Adria. Zásoby by navyše vydržali mesiace, nie týždeň.",
        datum: "2025-03-22",
        meno: "Richard Sulík",
        strana: "SaS",
        similarity: 0.82,
      },
      {
        id: 203,
        vyrok:
          "Ak sa okamžite nedohodneme s Moskvou na nových zmluvách, už budúci mesiac budeme mať na čerpacích staniciach prázdne stojany.",
        vyhodnotenie: "Nepravda",
        odovodnenie:
          "Dodávky sú zmluvne zabezpečené aj bez nových politických dohôd s Moskvou a štátne rezervy spolu so zásobami Slovnaftu garantujú plynulé zásobovanie na niekoľko mesiacov.",
        datum: "2025-08-14",
        meno: "Andrej Danko",
        strana: "SNS",
        similarity: 0.76,
      },
      {
        id: 204,
        vyrok:
          "Ropovod Adria bol kapacitne rozšírený a v prípade krízy dokáže plne pokryť potreby našej rafinérie.",
        vyhodnotenie: "Pravda",
        odovodnenie:
          "Rekonštrukcia ropovodu Adria zvýšila jeho kapacitu na 6 miliónov ton ročne, čo plne postačuje pre potreby bratislavskej rafinérie Slovnaft.",
        datum: "2026-02-03",
        meno: "Michal Šimečka",
        strana: "PS",
        similarity: 0.87,
      },
    ],
  },
  {
    query: "Kto poškodil ropovod Družba?",
    filters: { meno: null, vyhodnotenie: null, strana: null },
    articleIds: [1, 3, 4],
    results: [
      {
        id: 301,
        vyrok:
          "Ropovod Družba vyhodili do vzduchu ukrajinskí diverzanti, presne tak isto, ako to urobili s Nord Streamom.",
        vyhodnotenie: "Nepravda",
        odovodnenie:
          "Vyšetrovanie medzinárodnej komisie v roku 2025 preukázalo, že poškodenie ropovodu bolo spôsobené zlyhaním materiálu a koróziou, nie cieleným útokom.",
        datum: "2025-09-11",
        meno: "Robert Fico",
        strana: "SMER-SD",
        similarity: 0.92,
      },
      {
        id: 302,
        vyrok:
          "Priamo pri mieste úniku ropy sa našli úlomky dronov, čo jasne ukazuje na vojenský útok z východu.",
        vyhodnotenie: "Zavádzajúce",
        odovodnenie:
          "Úlomky dronov sa v oblasti skutočne našli, pochádzali však z ruského útoku na neďalekú elektrickú rozvodňu spred dvoch mesiacov. Samotný ropovod dronom zasiahnutý nebol.",
        datum: "2025-09-15",
        meno: "Tomáš Taraba",
        strana: "SNS",
        similarity: 0.84,
      },
      {
        id: 303,
        vyrok:
          "Prerušenie dodávok cez Družbu v marci tohto roka bolo spôsobené ruským raketovým útokom na transformátor, ktorý poháňal prečerpávaciu stanicu.",
        vyhodnotenie: "Pravda",
        odovodnenie:
          "Ukrajinský prevádzkovateľ Ukrtransnafta aj nezávislí pozorovatelia potvrdili, že výpadok prúdu po ruskom ostreľovaní energetickej infraštruktúry zastavil čerpadlá ropovodu.",
        datum: "2025-10-02",
        meno: "Ivan Štefunko",
        strana: "PS",
        similarity: 0.88,
      },
      {
        id: 304,
        vyrok:
          "Družba nebola priamo fyzicky zničená, išlo len o dočasný výpadok elektrickej energie na ukrajinskej strane.",
        vyhodnotenie: "Pravda",
        odovodnenie:
          "Potvrdzujú to správy z dispečingu prevádzkovateľa. Po obnove dodávok elektriny sa tranzit ropy v priebehu 48 hodín plne obnovil.",
        datum: "2025-10-05",
        meno: "Milan Majerský",
        strana: "KDH",
        similarity: 0.81,
      },
    ],
  },
];
